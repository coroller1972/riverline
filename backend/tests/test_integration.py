"""Opt-in tests against a real Compose API, PostgreSQL, Redis and Celery worker.

RIVERLINE_INTEGRATION_URL=http://127.0.0.1:8000 pytest tests/test_integration.py
These create persistent test runs. Never point at a production API.
"""

import json
import os
import time

import httpx
import pytest
from websockets.sync.client import connect

BASE = os.getenv("RIVERLINE_INTEGRATION_URL")
pytestmark = [pytest.mark.integration, pytest.mark.skipif(not BASE, reason="Set integration URL")]


def payload(iterations=300):
    return {
        "pot": 100,
        "effective_stack": 100,
        "board": ["Qs", "8h", "4h", "2c", "7d"],
        "oop_range": "AhAd,KhKd,6h5h",
        "ip_range": "AsAc,KsKc,QhQd",
        "solver": {"algorithm": "cfr_plus", "iterations": iterations},
    }


def wait_done(client, sid):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        row = client.get(f"/api/solves/{sid}").json()
        if row["status"] in ("completed", "failed", "cancelled"):
            return row
        time.sleep(0.05)
    pytest.fail("Worker did not finish within 30 seconds")


def test_real_queue_websocket_and_reproducible_result():
    with httpx.Client(base_url=BASE, timeout=10) as client:
        runs = []
        for _ in range(2):
            response = client.post("/api/solves", json=payload())
            assert response.status_code == 202
            sid = response.json()["id"]
            with connect(BASE.replace("http", "ws", 1) + f"/ws/solves/{sid}") as ws:
                message = json.loads(ws.recv(timeout=10))
                assert message["type"] in ("progress", "completed")
                assert message["solve_id"] == sid
            assert wait_done(client, sid)["status"] == "completed"
            result = client.get(f"/api/solves/{sid}/results").json()
            assert result["ev_oop"] + result["ev_ip"] == 0
            assert result["iterations"] == 300
            runs.append(result)
        assert runs[0]["nodes"] == runs[1]["nodes"]
        assert runs[0]["exploitability"] == runs[1]["exploitability"]


def test_real_running_cancellation():
    with httpx.Client(base_url=BASE, timeout=10) as client:
        request = payload(100000)
        request.update(oop_range="AA,KK,QQ,AKs,AQs", ip_range="AA,KK,QQ,JJ,AKs,AQs,AJs")
        sid = client.post("/api/solves", json=request).json()["id"]
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if client.get(f"/api/solves/{sid}").json()["status"] == "running":
                break
            time.sleep(0.05)
        else:
            pytest.fail("Worker never claimed the job")
        assert client.delete(f"/api/solves/{sid}").json()["status"] == "cancelled"
        assert client.get(f"/api/solves/{sid}/results").status_code == 409
        # Subsequent queued work must complete: the cancellation releases the worker.
        quick = client.post("/api/solves", json=payload(10)).json()["id"]
        assert wait_done(client, quick)["status"] == "completed"
        assert client.get(f"/api/solves/{sid}").json()["status"] == "cancelled"

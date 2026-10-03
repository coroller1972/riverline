from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import dispatcher
from app.db.session import Base, get_db
from app.main import app
from app.models.solve import Solve, utcnow
from app.services.jobs import cancel, claim, update_owned
from workers.tasks import run_solve


@pytest.fixture
def storage():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    yield factory
    engine.dispose()


@pytest.fixture
def payload():
    return {
        "game": "NLHE",
        "street": "river",
        "pot": 100,
        "effective_stack": 100,
        "board": ["Qs", "8h", "4h", "2c", "7d"],
        "oop_range": "AhAd,6h5h",
        "ip_range": "KhKd,QhQd",
        "tree": {"oop_bet_sizes": [0.75], "ip_bet_sizes": [0.75]},
        "solver": {"algorithm": "cfr_plus", "iterations": 100},
    }


@pytest.fixture
def client(storage):
    def db():
        with storage() as session:
            yield session

    app.dependency_overrides[get_db] = db
    app.dependency_overrides[dispatcher] = lambda: lambda solve_id: None
    with TestClient(app) as test:
        yield test
    app.dependency_overrides.clear()


def test_complete_lifecycle(client, storage, payload):
    response = client.post("/api/solves", json=payload)
    assert response.status_code == 202
    sid = response.json()["id"]
    assert client.get(f"/api/solves/{sid}").json()["status"] == "queued"
    assert client.get(f"/api/solves/{sid}/results").status_code == 409
    assert run_solve(sid, storage) == "completed"
    row = client.get(f"/api/solves/{sid}").json()
    assert row["iteration"] == row["max_iterations"] == 100
    assert row["status"] == "completed"
    result = client.get(f"/api/solves/{sid}/results").json()
    assert result["ev_oop"] == -result["ev_ip"]
    assert len(result["nodes"]) > 1
    assert client.get("/api/solves").json()[0]["id"] == sid
    assert client.delete(f"/api/solves/{sid}").json()["status"] == "completed"
    assert run_solve(sid, storage) == "completed"  # Duplicate task is a no-op.


def test_cancel_queued_job(client, storage, payload):
    sid = client.post("/api/solves", json=payload).json()["id"]
    assert client.delete(f"/api/solves/{sid}").json()["status"] == "cancelled"
    assert run_solve(sid, storage) == "cancelled"
    assert client.get(f"/api/solves/{sid}/results").status_code == 409


def test_cancel_running_cannot_be_overwritten(client, storage, payload):
    sid = client.post("/api/solves", json=payload).json()["id"]
    with storage() as db:
        assert claim(db, sid, "owner")
        assert not claim(db, sid, "duplicate")
        cancel(db, sid)
        assert not update_owned(db, sid, "owner", status="completed")
        assert db.get(Solve, sid).status == "cancelled"


def test_stale_worker_recovery(client, storage, payload):
    sid = client.post("/api/solves", json=payload).json()["id"]
    with storage() as db:
        assert claim(db, sid, "old")
        row = db.get(Solve, sid)
        row.heartbeat_at = utcnow() - timedelta(seconds=180)
        db.commit()
        assert claim(db, sid, "new")
        assert not update_owned(db, sid, "old", status="completed")
        assert update_owned(db, sid, "new", iteration=20)


def test_worker_failure_is_persisted(client, storage, payload, monkeypatch):
    sid = client.post("/api/solves", json=payload).json()["id"]

    def failure(*args):
        raise ValueError("Invalid domain state")

    monkeypatch.setattr("workers.tasks.solve", failure)
    assert run_solve(sid, storage) == "failed"
    row = client.get(f"/api/solves/{sid}").json()
    assert row["error"] == "Invalid domain state"
    assert row["finished_at"]


def test_queue_failure_is_persisted(client, payload):
    def unavailable(sid):
        raise ConnectionError("broker down")

    app.dependency_overrides[dispatcher] = lambda: unavailable
    response = client.post("/api/solves", json=payload)
    assert response.status_code == 503
    sid = response.json()["detail"]["id"]
    assert client.get(f"/api/solves/{sid}").json()["status"] == "failed"


@pytest.mark.parametrize(
    "change",
    [
        {"street": "turn"},
        {"game": "PLO"},
        {"board": ["As"] * 5},
        {"oop_range": "QsQh"},
        {"ip_range": "bad"},
        {"pot": -1},
        {"tree": {"raise_sizes": [2.5]}},
        {"solver": {"iterations": 0}},
        {"solver": {"iterations": 1.5}},
        {"solver": {"algorithm": "dcfr"}},
        {"oop_range": "AhAd", "ip_range": "AhKh"},
    ],
)
def test_reject_unsupported_or_invalid(client, payload, change):
    assert client.post("/api/solves", json=payload | change).status_code == 422


def test_missing_and_bad_id(client):
    assert client.get(f"/api/solves/{uuid4()}").status_code == 404
    assert client.get("/api/solves/not-an-id").status_code == 422


def test_range_preview(client):
    data = client.post(
        "/api/ranges/preview", json={"range": "QQ,AKs:0.5", "board": ["Qs", "Ah"]}
    ).json()
    assert data["live_count"] == 6
    assert data["weighted_count"] == 4.5
    assert client.post("/api/ranges/preview", json={"range": "QQ+"}).status_code == 422


def test_websocket_completed(client, monkeypatch):
    sid = str(uuid4())
    monkeypatch.setattr(
        "app.websocket.routes.snapshot",
        lambda _: {
            "type": "completed",
            "status": "completed",
            "solve_id": sid,
            "iteration": 100,
            "max_iterations": 100,
            "progress": 1,
        },
    )
    with client.websocket_connect(f"/ws/solves/{sid}") as ws:
        assert ws.receive_json()["type"] == "completed"

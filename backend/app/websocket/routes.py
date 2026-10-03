import asyncio
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.db.session import session_factory
from app.models.solve import Solve
from app.services.jobs import TERMINAL

router = APIRouter()


def snapshot(solve_id: str):
    with session_factory()() as db:
        row = db.get(Solve, solve_id)
        if row is None:
            return None
        return {
            "type": row.status if row.status in TERMINAL else "progress",
            "solve_id": row.id,
            "status": row.status,
            "iteration": row.iteration,
            "max_iterations": row.max_iterations,
            "progress": row.iteration / row.max_iterations,
            "elapsed_seconds": row.elapsed_seconds,
            "exploitability_pct": row.exploitability_pct,
            "message": row.error,
        }


@router.websocket("/ws/solves/{solve_id}")
async def progress_socket(websocket: WebSocket, solve_id: UUID):
    await websocket.accept()
    try:
        while True:
            # Durable snapshots work across API/worker restarts; no missed Redis pubsub events.
            state = await run_in_threadpool(snapshot, str(solve_id))
            if state is None:
                await websocket.close(code=1008, reason="Solve not found")
                return
            await websocket.send_json(state)
            if state["status"] in TERMINAL:
                await websocket.close()
                return
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return

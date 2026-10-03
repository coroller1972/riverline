import logging
from typing import Annotated, Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.solve import Solve, utcnow
from app.schemas.solve import SolveRequest, SolveView, StrictModel
from app.services.jobs import cancel
from solver.cards import Card
from solver.ranges import Range

router = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(get_db)]
logger = logging.getLogger(__name__)


def dispatcher() -> Callable[[str], None]:
    from workers.tasks import solve_task

    return lambda solve_id: solve_task.apply_async(args=[solve_id], task_id=solve_id, retry=False)


def get_solve(db: Session, solve_id: UUID) -> Solve:
    row = db.get(Solve, str(solve_id))
    if row is None:
        raise HTTPException(404, "Solve not found")
    return row


@router.post("/solves", status_code=202)
def create_solve(config: SolveRequest, db: DB, enqueue=Depends(dispatcher)):
    row = Solve(
        config=config.model_dump(),
        max_iterations=config.solver.iterations,
        algorithm=config.solver.algorithm,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    try:
        enqueue(row.id)
    except Exception:
        logger.exception("enqueue_failed", extra={"solve_id": row.id})
        row.status = "failed"
        row.error = "Queue unavailable. Please retry."
        row.finished_at = utcnow()
        db.commit()
        raise HTTPException(503, {"id": row.id, "message": row.error}) from None
    return {"id": row.id, "status": "queued"}


@router.get("/solves", response_model=list[SolveView])
def list_solves(db: DB):
    return db.scalars(select(Solve).order_by(Solve.created_at.desc()).limit(25)).all()


@router.get("/solves/{solve_id}", response_model=SolveView)
def read_solve(solve_id: UUID, db: DB):
    return get_solve(db, solve_id)


@router.get("/solves/{solve_id}/results")
def results(solve_id: UUID, db: DB):
    row = get_solve(db, solve_id)
    if row.status != "completed":
        raise HTTPException(409, f"Results unavailable: solve is {row.status}")
    return row.result


@router.delete("/solves/{solve_id}", response_model=SolveView)
def cancel_solve(solve_id: UUID, db: DB):
    get_solve(db, solve_id)
    cancel(db, str(solve_id))
    db.expire_all()
    return get_solve(db, solve_id)


class RangePreview(StrictModel):
    range: str = Field(min_length=1, max_length=20000)
    board: list[str] = Field(default_factory=list, max_length=5)


@router.post("/ranges/preview")
def preview_range(request: RangePreview):
    try:
        cards = [Card.parse(c) for c in request.board]
        if len(set(cards)) != len(cards):
            raise ValueError("Duplicate board cards")
        mask = sum(c.mask for c in cards)
        parsed = Range.parse(request.range)
        combos = [
            {
                "combo": str(c),
                "hand_class": c.hand_class,
                "weight": w,
                "blocked": bool(c.mask & mask),
            }
            for c, w in parsed.entries
        ]
        return {
            "combos": combos,
            "live_count": sum(not c["blocked"] for c in combos),
            "weighted_count": sum(c["weight"] for c in combos if not c["blocked"]),
        }
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None

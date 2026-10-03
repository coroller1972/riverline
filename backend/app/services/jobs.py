"""Small transactional lifecycle operations shared by API and Celery."""

from datetime import timedelta

from sqlalchemy import and_, or_, update
from sqlalchemy.orm import Session

from app.models.solve import Solve, utcnow

ACTIVE = ("queued", "running")
TERMINAL = ("completed", "cancelled", "failed")
LEASE_SECONDS = 120


def claim(session: Session, solve_id: str, token: str) -> bool:
    now = utcnow()
    result = session.execute(
        update(Solve)
        .where(
            Solve.id == solve_id,
            or_(
                Solve.status == "queued",
                and_(
                    Solve.status == "running",
                    Solve.heartbeat_at < now - timedelta(seconds=LEASE_SECONDS),
                ),
            ),
        )
        .values(
            status="running",
            run_token=token,
            started_at=now,
            heartbeat_at=now,
            iteration=0,
            elapsed_seconds=0,
            exploitability_pct=None,
        )
    )
    session.commit()
    return result.rowcount == 1


def update_owned(session: Session, solve_id: str, token: str, **values) -> bool:
    result = session.execute(
        update(Solve)
        .where(
            Solve.id == solve_id,
            Solve.status == "running",
            Solve.run_token == token,
        )
        .values(heartbeat_at=utcnow(), **values)
    )
    session.commit()
    return result.rowcount == 1


def cancel(session: Session, solve_id: str) -> None:
    session.execute(
        update(Solve)
        .where(Solve.id == solve_id, Solve.status.in_(ACTIVE))
        .values(status="cancelled", finished_at=utcnow(), run_token=None)
    )
    session.commit()

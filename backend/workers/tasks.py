import logging
from uuid import uuid4

from app.db.session import session_factory
from app.models.solve import Solve, utcnow
from app.schemas.solve import SolveRequest
from app.services.jobs import LEASE_SECONDS, claim, update_owned
from solver import SolveCancelled, solve
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def run_solve(solve_id: str, factory=None) -> str:
    """The framework adapter; injectable sessions let lifecycle tests use SQLite."""
    factory = factory or session_factory()
    token = str(uuid4())
    with factory() as db:
        if not claim(db, solve_id, token):
            row = db.get(Solve, solve_id)
            return row.status if row else "missing"
        config = db.get(Solve, solve_id).config

    def cancelled():
        with factory() as db:
            row = db.get(Solve, solve_id)
            return row is None or row.status != "running" or row.run_token != token

    def progress(message):
        values = {key: message[key] for key in ("iteration", "elapsed_seconds")}
        if message.get("exploitability_pct") is not None:
            values["exploitability_pct"] = message["exploitability_pct"]
        with factory() as db:
            if not update_owned(db, solve_id, token, **values):
                raise SolveCancelled()

    try:
        result = solve(SolveRequest.model_validate(config).to_engine(), progress, cancelled)
        with factory() as db:
            saved = update_owned(
                db,
                solve_id,
                token,
                status="completed",
                finished_at=utcnow(),
                result=result.to_dict(),
                iteration=result.iterations,
                elapsed_seconds=result.elapsed_seconds,
                exploitability_pct=result.exploitability_pct,
            )
        logger.info("solve_finished", extra={"solve_id": solve_id, "iterations": result.iterations})
        return "completed" if saved else "cancelled"
    except SolveCancelled:
        logger.info("solve_cancelled", extra={"solve_id": solve_id})
        return "cancelled"
    except Exception as exc:
        logger.exception("solve_failed", extra={"solve_id": solve_id})
        # Publish a useful domain error; never leak DB URLs or internal exception details.
        message = str(exc) if isinstance(exc, ValueError) else "Solver failed; consult worker logs."
        with factory() as db:
            update_owned(db, solve_id, token, status="failed", error=message, finished_at=utcnow())
        return "failed"


@celery_app.task(
    bind=True, name="riverline.solve", max_retries=None, acks_late=True, reject_on_worker_lost=True
)
def solve_task(self, solve_id: str):
    state = run_solve(solve_id)
    if state == "running":
        # A redelivery after worker loss must wait for the old execution lease.
        raise self.retry(countdown=LEASE_SECONDS + 1)

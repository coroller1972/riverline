from time import monotonic
from typing import Callable

from solver.cfr import CFR
from solver.cfr.metrics import expected_value, exploitability
from solver.config import SolveConfig
from solver.game.river import RiverGame
from solver.results import SolveResult
from solver.results.analysis import analyze


class SolveCancelled(Exception):
    """Cooperative cancellation; no partial result is published as completed."""


class _Converged(Exception):
    pass


def solve(
    config: SolveConfig,
    progress: Callable[[dict], None] | None = None,
    cancelled: Callable[[], bool] | None = None,
) -> SolveResult:
    start = monotonic()
    if cancelled and cancelled():
        raise SolveCancelled()
    game = RiverGame(config)
    engine = CFR(game.root, config.algorithm)
    history: list[dict[str, float]] = []
    last_report = start
    # Limit exact best-response diagnostics to ~20 checkpoints plus the final one.
    diagnostic_interval = max(config.progress_interval, config.iterations // 20)
    last_diagnostic = 0

    def checkpoint(iteration: int):
        nonlocal last_report, last_diagnostic
        if cancelled and cancelled():
            raise SolveCancelled()
        now = monotonic()
        diagnostic = (
            iteration - last_diagnostic >= diagnostic_interval or iteration == config.iterations
        )
        metric = None
        if diagnostic:
            metric = exploitability(game.root, engine.average_strategy())
            history.append(
                {"iteration": iteration, "exploitability_pct": 100 * metric / config.pot}
            )
            last_diagnostic = iteration
        if progress and (diagnostic or now - last_report >= 0.5):
            progress(
                {
                    "iteration": iteration,
                    "max_iterations": config.iterations,
                    "progress": iteration / config.iterations,
                    "elapsed_seconds": now - start,
                    "exploitability_pct": 100 * metric / config.pot if metric is not None else None,
                }
            )
            last_report = now
        if metric is not None and config.convergence_target is not None:
            if 100 * metric / config.pot <= config.convergence_target:
                raise _Converged()

    try:
        engine.train(config.iterations, checkpoint, interval=min(10, config.progress_interval))
    except _Converged:
        pass
    if cancelled and cancelled():
        raise SolveCancelled()
    profile = engine.average_strategy()
    value = expected_value(game.root, profile)
    metric = exploitability(game.root, profile)
    return SolveResult(
        engine.iteration,
        config.algorithm,
        value,
        -value,
        metric,
        metric / config.pot * 100,
        config.convergence_target is not None
        and metric / config.pot * 100 <= config.convergence_target,
        analyze(game, profile),
        history,
        len(game.deals),
        game.node_count,
        monotonic() - start,
    )

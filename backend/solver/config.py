import math
from dataclasses import dataclass

from solver.cards import Board
from solver.ranges import Range


@dataclass(frozen=True)
class SolveConfig:
    board: tuple[str, ...]
    oop_range: str
    ip_range: str
    pot: float = 100.0
    effective_stack: float = 100.0
    oop_bet_sizes: tuple[float, ...] = (0.75,)
    ip_bet_sizes: tuple[float, ...] = (0.75,)
    iterations: int = 2000
    algorithm: str = "cfr_plus"
    convergence_target: float | None = None  # Exploitability as % of initial pot.
    progress_interval: int = 100

    def __post_init__(self):
        Board.parse(self.board)
        Range.parse(self.oop_range)
        Range.parse(self.ip_range)
        if not math.isfinite(self.pot) or self.pot <= 0:
            raise ValueError("Pot must be finite and positive")
        if not math.isfinite(self.effective_stack) or self.effective_stack < 0:
            raise ValueError("Effective stack must be finite and non-negative")
        for sizes in (self.oop_bet_sizes, self.ip_bet_sizes):
            if len(sizes) > 3 or any(not math.isfinite(s) or not 0 < s <= 10 for s in sizes):
                raise ValueError("Use up to three bet fractions, each in (0, 10]")
            for size in sizes:
                amount = min(self.pot * size, self.effective_stack)
                if 0 < amount < 1 and amount < self.effective_stack:
                    raise ValueError("The minimum opening bet is 1 bb, except a shorter all-in")
        if type(self.iterations) is not int or not 1 <= self.iterations <= 100000:
            raise ValueError("Iterations must be an integer between 1 and 100000")
        if self.algorithm not in ("cfr", "cfr_plus"):
            raise ValueError("Only cfr and cfr_plus are supported")
        if self.convergence_target is not None and (
            not math.isfinite(self.convergence_target) or self.convergence_target <= 0
        ):
            raise ValueError("Convergence target must be positive (% of pot)")
        if type(self.progress_interval) is not int or self.progress_interval < 1:
            raise ValueError("Progress interval must be a positive integer")

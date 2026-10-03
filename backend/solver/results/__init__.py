from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class SolveResult:
    iterations: int
    algorithm: str
    ev_oop: float
    ev_ip: float
    exploitability: float
    exploitability_pct: float
    converged: bool
    nodes: list[dict[str, Any]]
    convergence: list[dict[str, float]]
    compatible_deals: int
    tree_nodes: int
    elapsed_seconds: float
    utility_convention: str = "zero-sum; net river value minus half the initial pot"
    engine_version: str = "reference-1"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

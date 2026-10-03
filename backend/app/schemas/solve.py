from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from solver import SolveConfig
from solver.cards import Board
from solver.game.river import MAX_DEALS, MAX_NODES
from solver.ranges import Range, joint_deals


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class TreeConfig(StrictModel):
    oop_bet_sizes: list[float] = Field(default_factory=lambda: [0.75], max_length=3)
    ip_bet_sizes: list[float] = Field(default_factory=lambda: [0.75], max_length=3)


class SolverOptions(StrictModel):
    algorithm: Literal["cfr", "cfr_plus"] = "cfr_plus"
    iterations: int = Field(default=2000, ge=1, le=100000, strict=True)
    convergence_target: float | None = Field(default=None, gt=0)


class SolveRequest(StrictModel):
    game: Literal["NLHE"] = "NLHE"
    street: Literal["river"] = "river"
    pot: float = Field(gt=0, le=1000000)
    effective_stack: float = Field(ge=0, le=1000000)
    board: list[str] = Field(min_length=5, max_length=5)
    oop_range: str = Field(min_length=1, max_length=20000)
    ip_range: str = Field(min_length=1, max_length=20000)
    tree: TreeConfig = Field(default_factory=TreeConfig)
    solver: SolverOptions = Field(default_factory=SolverOptions)

    def to_engine(self) -> SolveConfig:
        return SolveConfig(
            board=tuple(self.board),
            oop_range=self.oop_range,
            ip_range=self.ip_range,
            pot=self.pot,
            effective_stack=self.effective_stack,
            oop_bet_sizes=tuple(self.tree.oop_bet_sizes),
            ip_bet_sizes=tuple(self.tree.ip_bet_sizes),
            algorithm=self.solver.algorithm,
            iterations=self.solver.iterations,
            convergence_target=self.solver.convergence_target,
        )

    @model_validator(mode="after")
    def validate_domain(self):
        self.to_engine()
        deals = joint_deals(
            Range.parse(self.oop_range), Range.parse(self.ip_range), Board.parse(self.board)
        )
        upper_nodes = 1 + len(deals) * (
            3 + 3 * (len(self.tree.oop_bet_sizes) + len(self.tree.ip_bet_sizes))
        )
        if len(deals) > MAX_DEALS or upper_nodes > MAX_NODES:
            raise ValueError(
                "Reference solver capacity exceeded; narrow ranges or reduce bet sizes"
            )
        return self


class SolveView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    iteration: int
    max_iterations: int
    algorithm: str
    elapsed_seconds: float
    exploitability_pct: float | None
    error: str | None
    config: dict

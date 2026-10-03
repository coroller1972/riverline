"""Finite, perfect-recall, two-player zero-sum extensive games."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Node:
    """player -1 = chance, 0/1 = decision, None = terminal; utility is for player 0."""

    player: int | None
    children: tuple["Node", ...] = ()
    actions: tuple[str, ...] = ()
    info_key: str = ""
    probabilities: tuple[float, ...] = ()
    utility: float = 0.0

    @classmethod
    def terminal(cls, utility: float) -> "Node":
        return cls(player=None, utility=utility)

"""Ranges are exact combos with frequencies, never independent rank probabilities."""

import math
import re
from dataclasses import dataclass
from functools import lru_cache

from solver.cards import Board, Combo, enumerate_combos


@lru_cache(maxsize=169)
def class_combos(name: str) -> tuple[Combo, ...]:
    return enumerate_combos(name)


@dataclass(frozen=True)
class Range:
    entries: tuple[tuple[Combo, float], ...]

    def __post_init__(self):
        if not self.entries:
            raise ValueError("Range must contain at least one positive-weight combo")
        if len({c for c, _ in self.entries}) != len(self.entries):
            raise ValueError("Duplicate combo in range")
        if any(not math.isfinite(w) or not 0 < w <= 1 for _, w in self.entries):
            raise ValueError("Range weights must be finite and in (0, 1]")

    @classmethod
    def parse(cls, text: str) -> "Range":
        """Comma/space-separated classes or exact combos; last occurrence wins.

        Weights in [0,1]; zero removes a combo. Plus and interval shorthand are
        explicitly unsupported in this MVP. Never silently reinterpret a token.
        """
        entries: dict[Combo, float] = {}
        for token in re.split(r"[,\s]+", text.strip()):
            if not token:
                continue
            parts = token.split(":")
            if len(parts) > 2:
                raise ValueError(f"Invalid weighted token: {token}")
            name = parts[0]
            try:
                weight = float(parts[1]) if len(parts) == 2 else 1.0
            except ValueError:
                raise ValueError(f"Invalid weight: {token}") from None
            if not math.isfinite(weight) or not 0 <= weight <= 1:
                raise ValueError("Weights must be finite and between 0 and 1")
            combos = (Combo.parse(name),) if len(name) == 4 else class_combos(name)
            for combo in combos:
                entries[combo] = weight
        return cls(
            tuple(
                sorted(((c, w) for c, w in entries.items() if w > 0), key=lambda pair: str(pair[0]))
            )
        )

    def live(self, board: Board, own_combo: Combo | None = None) -> tuple[tuple[Combo, float], ...]:
        mask = board.mask | (own_combo.mask if own_combo else 0)
        return tuple((c, w) for c, w in self.entries if not c.mask & mask)


def joint_deals(oop: Range, ip: Range, board: Board) -> tuple[tuple[Combo, Combo, float], ...]:
    """Product prior conditioned on ALL card disjointness, normalized globally.

    Conditioning opponent ranges separately and treating hero combos as equally
    likely would bias chance when their blocker mass differs.
    """
    pairs = [
        (a, b, wa * wb)
        for a, wa in oop.live(board)
        for b, wb in ip.live(board)
        if not a.mask & b.mask
    ]
    total = sum(w for _, _, w in pairs)
    if not total:
        raise ValueError("Ranges have no compatible deal after card removal")
    return tuple((a, b, w / total) for a, b, w in pairs)

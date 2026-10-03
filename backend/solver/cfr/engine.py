"""Full traversal CFR / alternating CFR+ with exact chance enumeration.

Each pass freezes the strategy. Regrets over all histories in an information set
are accumulated before applying RM+ truncation. Averaging uses the acting
player's own reach, once per infoset (perfect recall), never opponent reach.
"""

import math
from dataclasses import dataclass
from typing import Callable

from solver.game import Node

Strategy = dict[str, tuple[float, ...]]


def regret_matching(regrets: list[float]) -> tuple[float, ...]:
    positive = [max(0.0, x) for x in regrets]
    total = sum(positive)
    return tuple(x / total for x in positive) if total else (1 / len(regrets),) * len(regrets)


@dataclass
class InfoSet:
    player: int
    actions: tuple[str, ...]
    regret_sum: list[float]
    strategy_sum: list[float]

    def average(self) -> tuple[float, ...]:
        total = sum(self.strategy_sum)
        return (
            tuple(x / total for x in self.strategy_sum)
            if total
            else (1 / len(self.actions),) * len(self.actions)
        )


class CFR:
    def __init__(self, root: Node, algorithm: str = "cfr"):
        if algorithm not in ("cfr", "cfr_plus"):
            raise ValueError("Supported algorithms: cfr, cfr_plus")
        self.root = root
        self.algorithm = algorithm
        self.infos: dict[str, InfoSet] = {}
        self.iteration = 0
        self._register(root)

    def _register(self, node: Node) -> None:
        if node.player is None:
            if not math.isfinite(node.utility):
                raise ValueError("Terminal utilities must be finite")
            return
        if node.player == -1:
            if (
                len(node.children) != len(node.probabilities)
                or not math.isclose(sum(node.probabilities), 1.0)
                or any(p <= 0 or not math.isfinite(p) for p in node.probabilities)
            ):
                raise ValueError("Invalid chance distribution")
        else:
            if node.player not in (0, 1) or not node.actions or not node.info_key:
                raise ValueError("Invalid decision node")
            if len(node.actions) != len(node.children):
                raise ValueError("Action / child count mismatch")
            info = self.infos.setdefault(
                node.info_key,
                InfoSet(
                    node.player, node.actions, [0.0] * len(node.actions), [0.0] * len(node.actions)
                ),
            )
            if (info.player, info.actions) != (node.player, node.actions):
                raise ValueError("Inconsistent information set")
        for child in node.children:
            self._register(child)

    def current_strategy(self) -> Strategy:
        return {key: regret_matching(info.regret_sum) for key, info in self.infos.items()}

    def average_strategy(self) -> Strategy:
        return {key: info.average() for key, info in self.infos.items()}

    def train(
        self, iterations: int, progress: Callable[[int], None] | None = None, interval: int = 100
    ) -> Strategy:
        if iterations < 1 or interval < 1:
            raise ValueError("Iterations and progress interval must be positive")
        for _ in range(iterations):
            self.iteration += 1
            profile = self.current_strategy()
            for player in (0, 1):
                if self.algorithm == "cfr_plus" and player == 1:
                    profile = self.current_strategy()
                deltas = {
                    key: [0.0] * len(info.actions)
                    for key, info in self.infos.items()
                    if info.player == player
                }
                self._walk(self.root, player, (1.0, 1.0), 1.0, profile, deltas, set())
                for key, values in deltas.items():
                    info = self.infos[key]
                    for a, delta in enumerate(values):
                        value = info.regret_sum[a] + delta
                        info.regret_sum[a] = (
                            max(0.0, value) if self.algorithm == "cfr_plus" else value
                        )
            if progress and (self.iteration % interval == 0 or _ == iterations - 1):
                progress(self.iteration)
        return self.average_strategy()

    def _walk(
        self,
        node: Node,
        updating: int,
        reach: tuple[float, float],
        chance: float,
        profile: Strategy,
        deltas: dict[str, list[float]],
        seen: set[str],
    ) -> float:
        if node.player is None:
            return node.utility
        if node.player == -1:
            return sum(
                p * self._walk(child, updating, reach, chance * p, profile, deltas, seen)
                for p, child in zip(node.probabilities, node.children)
            )
        player = node.player
        strategy = profile[node.info_key]
        values = []
        for prob, child in zip(strategy, node.children):
            child_reach = (
                (reach[0] * prob, reach[1]) if player == 0 else (reach[0], reach[1] * prob)
            )
            values.append(self._walk(child, updating, child_reach, chance, profile, deltas, seen))
        value = sum(p * v for p, v in zip(strategy, values))
        if player == updating:
            factor = chance * reach[1 - player] * (1 if player == 0 else -1)
            delta = deltas[node.info_key]
            for a, action_value in enumerate(values):
                delta[a] += factor * (action_value - value)
            if node.info_key not in seen:
                seen.add(node.info_key)
                info = self.infos[node.info_key]
                weight = self.iteration if self.algorithm == "cfr_plus" else 1
                for a, prob in enumerate(strategy):
                    info.strategy_sum[a] += weight * reach[player] * prob
        return value

"""Exact best response with one shared decision per information set.

A per-deal max would reveal the opponent's private cards and is NOT a valid BR.
This backward induction assumes perfect recall and no infoset spanning depths.
"""

from collections import defaultdict

from solver.cfr.engine import Strategy
from solver.game import Node


def expected_value(node: Node, profile: Strategy) -> float:
    if node.player is None:
        return node.utility
    probs = node.probabilities if node.player == -1 else profile[node.info_key]
    return sum(p * expected_value(child, profile) for p, child in zip(probs, node.children))


def best_response(root: Node, profile: Strategy, player: int) -> float:
    groups: dict[str, list[tuple[Node, float]]] = defaultdict(list)
    depths: dict[str, int] = {}

    def collect(node: Node, reach: float, depth: int):
        if node.player is None:
            return
        if node.player == player:
            if node.info_key in depths and depths[node.info_key] != depth:
                raise ValueError("Best response requires depth-consistent information sets")
            depths[node.info_key] = depth
            groups[node.info_key].append((node, reach))
            probs = (1.0,) * len(node.children)  # Counterfactual: ignore own reach.
        else:
            probs = node.probabilities if node.player == -1 else profile[node.info_key]
        for p, child in zip(probs, node.children):
            collect(child, reach * p, depth + 1)

    response = dict(profile)
    collect(root, 1.0, 0)
    for key in sorted(groups, key=lambda k: depths[k], reverse=True):
        histories = groups[key]
        values = [
            sum(reach * expected_value(node.children[a], response) for node, reach in histories)
            * (1 if player == 0 else -1)
            for a in range(len(histories[0][0].children))
        ]
        best = max(range(len(values)), key=values.__getitem__)
        response[key] = tuple(float(a == best) for a in range(len(values)))
    return expected_value(root, response) * (1 if player == 0 else -1)


def exploitability(root: Node, profile: Strategy) -> float:
    """Half NashConv, in chips; >=0 within floating-point error."""
    return max(0.0, (best_response(root, profile, 0) + best_response(root, profile, 1)) / 2)

"""Conditional combo EVs against the average profile, with correct opponent reach."""

from dataclasses import asdict
from typing import Any

from solver.cfr import Strategy
from solver.game import Node
from solver.game.river import RiverGame


def analyze(game: RiverGame, profile: Strategy) -> list[dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = {}

    def walk(node: Node, reach: tuple[float, float], chance: float) -> float:
        if node.player is None:
            return node.utility
        if node.player == -1:
            return sum(
                p * walk(child, reach, chance * p)
                for p, child in zip(node.probabilities, node.children)
            )
        player = node.player
        probabilities = profile[node.info_key]
        values = []
        for prob, child in zip(probabilities, node.children):
            r = (reach[0] * prob, reach[1]) if player == 0 else (reach[0], reach[1] * prob)
            values.append(walk(child, r, chance))
        value = sum(p * v for p, v in zip(probabilities, values))
        entry = stats.setdefault(
            node.info_key, {"mass": 0.0, "reach": 0.0, "values": [0.0] * len(values)}
        )
        cf = chance * reach[1 - player]
        entry["mass"] += cf
        entry["reach"] += cf * reach[player]
        for a, v in enumerate(values):
            entry["values"][a] += cf * v * (1 if player == 0 else -1)
        return value

    walk(game.root, (1.0, 1.0), 1.0)
    output = []
    for node_id, state in game.public_states.items():
        actions = state.actions(game.config)
        player = state.player
        opponent = game.ranges[1 - player]
        opponent_live = opponent.live(game.board)
        combos = []
        for combo, weight in game.ranges[player].live(game.board):
            key = f"{player}|{combo}|{node_id}"
            if key not in stats:  # No possible opponent; retain this reason in dead_combos below.
                continue
            stat = stats[key]
            mass = stat["mass"]
            evs = {
                a.id: stat["values"][i] / mass if mass > 1e-15 else None
                for i, a in enumerate(actions)
            }
            strategy = dict(zip((a.id for a in actions), profile[key]))
            combos.append(
                {
                    "combo": str(combo),
                    "hand_class": combo.hand_class,
                    "weight": weight,
                    "strategy": strategy,
                    "action_evs": evs,
                    "ev": sum(strategy[a] * v for a, v in evs.items()) if mass > 1e-15 else None,
                    "reach_probability": stat["reach"],
                    "counterfactual_reach": mass,
                    "opponent_combos_before": len(opponent_live),
                    "opponent_combos_after": len(opponent.live(game.board, combo)),
                    "opponent_weight_after": sum(w for _, w in opponent.live(game.board, combo)),
                    "blockers": {
                        str(card): sum(w for c, w in opponent_live if c.mask & card.mask)
                        for card in combo.cards
                    },
                }
            )
        dead = [
            {
                "combo": str(c),
                "hand_class": c.hand_class,
                "reason": "board" if c.mask & game.board.mask else "no compatible opponent",
            }
            for c, _ in game.ranges[player].entries
            if c.mask & game.board.mask or f"{player}|{c}|{node_id}" not in stats
        ]

        def aggregate(items):
            # Frequencies at a public node use the actual joint posterior, including
            # both players' reach. An unreachable node has no aggregate policy/EV.
            total = sum(item["reach_probability"] for item in items)
            frequencies = {
                a.id: sum(c["reach_probability"] * c["strategy"][a.id] for c in items) / total
                if total > 1e-15
                else None
                for a in actions
            }
            ev = (
                sum(c["reach_probability"] * (c["ev"] or 0) for c in items) / total
                if total > 1e-15
                else None
            )
            return {"strategy": frequencies, "ev": ev, "reach_probability": total}

        classes = []
        for name in sorted({c["hand_class"] for c in combos}):
            items = [c for c in combos if c["hand_class"] == name]
            classes.append({"hand_class": name, "combos": len(items), **aggregate(items)})
        output.append(
            {
                "id": node_id,
                "player": "OOP" if player == 0 else "IP",
                "history": list(state.history),
                "pot": state.pot,
                "actions": [asdict(a) for a in actions],
                "combos": combos,
                "dead_combos": dead,
                "classes": classes,
                **aggregate(combos),
            }
        )
    return output

"""Three-card Kuhn poker. Ante 1, bet 1; player 0 game value is -1/18."""

from itertools import permutations

from solver.game import Node


def kuhn_game(reverse_deals: bool = False) -> Node:
    def build(cards: tuple[int, int], history: str) -> Node:
        winner = 1 if cards[0] > cards[1] else -1
        if history in ("cc", "bc", "cbc"):
            return Node.terminal(winner * (1 if history == "cc" else 2))
        if history in ("bf", "cbf"):
            return Node.terminal(1 if history == "bf" else -1)
        player = len(history) % 2
        actions = ("f", "c") if history.endswith("b") else ("c", "b")
        return Node(
            player=player,
            actions=actions,
            info_key=f"{player}:{cards[player]}:{history}",
            children=tuple(build(cards, history + a) for a in actions),
        )

    deals = list(permutations(range(3), 2))
    if reverse_deals:
        deals.reverse()
    return Node(
        player=-1, probabilities=(1 / 6,) * 6, children=tuple(build(cards, "") for cards in deals)
    )

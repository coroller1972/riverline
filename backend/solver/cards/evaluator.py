"""Auditable reference evaluator: best five out of five, six or seven cards.

Larger lexicographic tuples win. Categories are 0 (high card) ... 8 (straight flush).
No suit breaks a tie. A wheel has high card five.
"""

from collections import Counter
from itertools import combinations

from solver.cards import Card

HandRank = tuple[int, ...]


def _five(cards: tuple[Card, ...]) -> HandRank:
    counts = Counter(c.rank for c in cards)
    ranks = sorted(counts, reverse=True)
    groups = sorted(((n, r) for r, n in counts.items()), reverse=True)
    flush = len({c.suit for c in cards}) == 1
    straight = 0
    if len(ranks) == 5:
        if ranks[0] - ranks[-1] == 4:
            straight = ranks[0]
        elif ranks == [14, 5, 4, 3, 2]:
            straight = 5
    if flush and straight:
        return (8, straight)
    if groups[0][0] == 4:
        return (7, groups[0][1], groups[1][1])
    if [n for n, _ in groups] == [3, 2]:
        return (6, groups[0][1], groups[1][1])
    if flush:
        return (5, *ranks)
    if straight:
        return (4, straight)
    if groups[0][0] == 3:
        return (3, groups[0][1], *sorted((r for n, r in groups if n == 1), reverse=True))
    if [n for n, _ in groups[:2]] == [2, 2]:
        return (2, groups[0][1], groups[1][1], groups[2][1])
    if groups[0][0] == 2:
        return (1, groups[0][1], *sorted((r for n, r in groups if n == 1), reverse=True))
    return (0, *ranks)


def evaluate(cards: tuple[Card, ...]) -> HandRank:
    if len(cards) not in (5, 6, 7) or len(set(cards)) != len(cards):
        raise ValueError("Evaluate five, six or seven distinct cards")
    return max(_five(hand) for hand in combinations(cards, 5))

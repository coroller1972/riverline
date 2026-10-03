import random

import pytest
from treys import Card as OracleCard
from treys import Evaluator

from solver.cards import Card, Deck
from solver.cards.evaluator import evaluate


def hand(text):
    return tuple(Card.parse(c) for c in text.split())


@pytest.mark.parametrize(
    "cards,rank",
    [
        ("As Kd Qh 8c 3s", (0, 14, 13, 12, 8, 3)),
        ("As Ah Kd Qc 3s", (1, 14, 13, 12, 3)),
        ("As Ah Kd Kc 3s", (2, 14, 13, 3)),
        ("As Ah Ad Kc 3s", (3, 14, 13, 3)),
        ("As 2h 3d 4c 5s", (4, 5)),
        ("9s Th Jd Qc Ks", (4, 13)),
        ("As Js 8s 4s 2s", (5, 14, 11, 8, 4, 2)),
        ("As Ah Ad Kc Ks", (6, 14, 13)),
        ("As Ah Ad Ac Ks", (7, 14, 13)),
        ("As Ks Qs Js Ts", (8, 14)),
        ("As 2s 3s 4s 5s 6d 7c", (8, 5)),
        ("As Ah Ad Kc Ks Kh 2d", (6, 14, 13)),
        ("As Ah Kd Kc Qs Qh Jc", (2, 14, 13, 12)),
        ("As Ks Qs Js Ts 2d 2c", (8, 14)),
    ],
)
def test_hand_categories(cards, rank):
    assert evaluate(hand(cards)) == rank
    assert evaluate(tuple(reversed(hand(cards)))) == rank


def test_tie_and_kicker():
    assert evaluate(hand("As Ks Qs Js Ts 2d 3d")) == evaluate(hand("As Ks Qs Js Ts 4h 5h"))
    assert evaluate(hand("As Ah Kd Qc Js")) > evaluate(hand("Ad Ac Ks Qh Td"))
    assert evaluate(hand("2s 3s 4h 5s 6s")) > evaluate(hand("As 2h 3d 4c 5s"))
    with pytest.raises(ValueError):
        evaluate(hand("As As Kd Qc Js"))


@pytest.mark.parametrize("count", [5, 7])
def test_differential_against_independent_treys(count):
    """Compare total ordering and ties, not only category labels."""
    rng = random.Random(703)
    oracle = Evaluator()
    samples = []
    for _ in range(1500):
        cards = tuple(rng.sample(Deck().cards, count))
        samples.append(
            (evaluate(cards), oracle.evaluate([], [OracleCard.new(str(c)) for c in cards]))
        )
    samples.sort()
    for (a, x), (b, y) in zip(samples, samples[1:]):
        assert (a == b) == (x == y)
        assert x >= y  # Treys uses smaller = stronger.

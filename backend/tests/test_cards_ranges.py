import math

import pytest

from solver.cards import Board, Card, Combo, Deck, enumerate_combos
from solver.ranges import Range, joint_deals


def test_deck_and_enumeration():
    assert len(set(Deck().cards)) == 52
    assert len({c.mask for c in Deck().cards}) == 52
    combos = enumerate_combos()
    assert len(combos) == len(set(combos)) == 1326
    assert len(enumerate_combos("AA")) == 6
    assert len(enumerate_combos("AKs")) == 4
    assert len(enumerate_combos("AKo")) == 12
    assert len({c.hand_class for c in combos}) == 169
    assert Combo.parse("KhAh") == Combo.parse("AhKh")


@pytest.mark.parametrize("text", ["", "10h", "AS", "Bs", "A", "AcAc"])
def test_bad_cards(text):
    with pytest.raises(ValueError):
        Combo.parse(text) if len(text) == 4 else Card.parse(text)


def test_range_weights_overlap_and_zero():
    r = Range.parse("AA:0.5, AKs:0.75 AhKh:0.25, AsKs:0")
    assert len(r.entries) == 9
    assert dict(r.entries)[Combo.parse("AhKh")] == 0.25
    assert math.fsum(w for _, w in r.entries) == 4.75


@pytest.mark.parametrize(
    "text",
    [
        "",
        "AA:NaN",
        "AA:inf",
        "AA:-1",
        "AA:1.1",
        "AA:0",
        "AK",
        "KAo",
        "JJ+",
        "AA-22",
        "AA:x",
        "AKs:1:2",
    ],
)
def test_bad_ranges(text):
    with pytest.raises(ValueError):
        Range.parse(text)


def test_blockers_and_joint_chance():
    board = Board.parse(["Qs", "8h", "4h", "2c", "7d"])
    oop = Range.parse("QQ,AhKh,AsKs")
    assert len(oop.live(board)) == 5
    assert len(Range.parse("AA").live(board, Combo.parse("AhKh"))) == 3
    deals = joint_deals(Range.parse("AhKh,AsKs:0.5"), Range.parse("AhQh,AdQd"), board)
    assert len(deals) == 3
    assert [w for _, _, w in deals] == pytest.approx([0.5, 0.25, 0.25])
    assert all(not a.mask & b.mask for a, b, _ in deals)
    with pytest.raises(ValueError, match="no compatible"):
        joint_deals(Range.parse("AhKh"), Range.parse("AhQh"), board)


def test_board_validation():
    for cards in (["As"] * 5, ["As", "Ks", "Qs", "Js"]):
        with pytest.raises(ValueError):
            Board.parse(cards)

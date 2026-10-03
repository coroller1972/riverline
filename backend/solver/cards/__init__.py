"""Explicit immutable cards, board and private two-card combinations."""

from dataclasses import dataclass
from itertools import combinations

RANKS = "23456789TJQKA"
SUITS = "shdc"


@dataclass(frozen=True, order=True, slots=True)
class Card:
    rank: int
    suit: str

    def __post_init__(self):
        if self.rank not in range(2, 15) or self.suit not in SUITS or len(self.suit) != 1:
            raise ValueError("Invalid card")

    @classmethod
    def parse(cls, text: str) -> "Card":
        if len(text) != 2 or text[0] not in RANKS or text[1] not in SUITS:
            raise ValueError(f"Invalid card: {text!r}; use As, Kh, Qd, Jc")
        return cls(RANKS.index(text[0]) + 2, text[1])

    @property
    def mask(self) -> int:
        return 1 << ((self.rank - 2) * 4 + SUITS.index(self.suit))

    def __str__(self) -> str:
        return RANKS[self.rank - 2] + self.suit


@dataclass(frozen=True)
class Deck:
    cards: tuple[Card, ...] = tuple(Card(r, s) for r in range(2, 15) for s in SUITS)

    def without(self, dead: tuple[Card, ...]) -> tuple[Card, ...]:
        return tuple(c for c in self.cards if c not in dead)


@dataclass(frozen=True)
class Board:
    cards: tuple[Card, ...]

    def __post_init__(self):
        if len(self.cards) != 5 or len(set(self.cards)) != 5:
            raise ValueError("River board must contain exactly five distinct cards")

    @classmethod
    def parse(cls, cards: list[str] | tuple[str, ...]) -> "Board":
        return cls(tuple(Card.parse(c) for c in cards))

    @property
    def mask(self) -> int:
        return sum(c.mask for c in self.cards)


@dataclass(frozen=True, slots=True)
class Combo:
    cards: tuple[Card, Card]

    def __post_init__(self):
        if len(self.cards) != 2 or self.cards[0] == self.cards[1]:
            raise ValueError("A combo contains two different cards")
        object.__setattr__(
            self, "cards", tuple(sorted(self.cards, key=lambda c: (-c.rank, SUITS.index(c.suit))))
        )

    @classmethod
    def parse(cls, text: str) -> "Combo":
        if len(text) != 4:
            raise ValueError(f"Invalid exact combo: {text!r}")
        return cls((Card.parse(text[:2]), Card.parse(text[2:])))

    @property
    def mask(self) -> int:
        return self.cards[0].mask | self.cards[1].mask

    @property
    def hand_class(self) -> str:
        a, b = self.cards
        name = RANKS[a.rank - 2] + RANKS[b.rank - 2]
        return name if a.rank == b.rank else name + ("s" if a.suit == b.suit else "o")

    def __str__(self) -> str:
        return "".join(map(str, self.cards))


def enumerate_combos(hand_class: str | None = None) -> tuple[Combo, ...]:
    combos = tuple(Combo(c) for c in combinations(Deck().cards, 2))
    if hand_class is None:
        return combos
    selected = tuple(c for c in combos if c.hand_class == hand_class)
    if not selected:
        raise ValueError(f"Invalid hand class: {hand_class!r}; use AA, AKs or AKo")
    return selected

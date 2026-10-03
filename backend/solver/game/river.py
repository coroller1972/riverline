"""No-rake river game: check/bet, then check/bet or fold/call. No raises."""

from dataclasses import dataclass

from solver.cards import Board, Combo
from solver.cards.evaluator import evaluate
from solver.config import SolveConfig
from solver.game import Node
from solver.ranges import Range, joint_deals

MAX_DEALS = 20_000
MAX_NODES = 300_000


@dataclass(frozen=True)
class Action:
    id: str
    label: str
    kind: str
    amount: float = 0.0
    fraction: float = 0.0


@dataclass(frozen=True)
class GameState:
    initial_pot: float
    effective_stack: float
    investments: tuple[float, float] = (0.0, 0.0)
    history: tuple[str, ...] = ()
    player: int = 0
    terminal: bool = False
    folded: int | None = None

    @property
    def pot(self) -> float:
        return self.initial_pot + sum(self.investments)

    def utility(self, showdown: int) -> tuple[float, float]:
        """Net value relative to owning half the initial pot, including returned bets."""
        if not self.terminal:
            raise ValueError("Utility is only defined at terminal states")
        if self.folded is not None:
            winner = 1 - self.folded
            award = self.pot if winner == 0 else 0.0
        else:
            award = self.pot if showdown > 0 else (self.pot / 2 if showdown == 0 else 0.0)
        value = award - self.investments[0] - self.initial_pot / 2
        return (value, -value)

    def actions(self, config: SolveConfig) -> tuple[Action, ...]:
        if self.terminal:
            return ()
        owed = self.investments[1 - self.player] - self.investments[self.player]
        if owed > 0:
            return (Action("fold", "Fold", "fold"), Action("call", "Call", "call", owed))
        actions = [Action("check", "Check", "check")]
        sizes = config.oop_bet_sizes if self.player == 0 else config.ip_bet_sizes
        seen = set()
        for fraction in sorted(set(sizes)):
            amount = min(self.initial_pot * fraction, self.effective_stack)
            if amount <= 0 or amount in seen:
                continue
            seen.add(amount)
            allin = amount == self.effective_stack
            actual_fraction = amount / self.initial_pot
            actions.append(
                Action(
                    f"bet_{actual_fraction:g}",
                    "All-in" if allin else f"Bet {actual_fraction * 100:g}%",
                    "allin" if allin else "bet",
                    amount,
                    actual_fraction,
                )
            )
        return tuple(actions)

    def play(self, action: Action, config: SolveConfig) -> "GameState":
        if action not in self.actions(config):
            raise ValueError("Illegal action")
        investments = list(self.investments)
        terminal = action.kind in ("fold", "call") or (
            action.kind == "check" and len(self.history) == 1
        )
        if action.kind in ("bet", "allin", "call"):
            investments[self.player] += action.amount
        return GameState(
            self.initial_pot,
            self.effective_stack,
            tuple(investments),
            self.history + (action.id,),
            1 - self.player,
            terminal,
            self.player if action.kind == "fold" else None,
        )


class RiverGame:
    def __init__(self, config: SolveConfig):
        self.config = config
        self.board = Board.parse(config.board)
        self.ranges = (Range.parse(config.oop_range), Range.parse(config.ip_range))
        self.deals = joint_deals(*self.ranges, self.board)
        if len(self.deals) > MAX_DEALS:
            raise ValueError(
                f"Reference solver limit: {MAX_DEALS:,} compatible deals; narrow ranges"
            )
        self.public_states: dict[str, GameState] = {}
        self.info_details: dict[str, tuple[str, int, Combo]] = {}
        self.node_count = 1
        ranks = {
            c: evaluate(self.board.cards + c.cards)
            for r in self.ranges
            for c, _ in r.live(self.board)
        }
        initial = GameState(config.pot, config.effective_stack)
        children = []
        for oop, ip, _ in self.deals:
            sign = (ranks[oop] > ranks[ip]) - (ranks[oop] < ranks[ip])
            children.append(self._build(initial, (oop, ip), sign))
        self.root = Node(
            player=-1, children=tuple(children), probabilities=tuple(p for _, _, p in self.deals)
        )

    def _build(self, state: GameState, hands: tuple[Combo, Combo], showdown: int) -> Node:
        self.node_count += 1
        if self.node_count > MAX_NODES:
            raise ValueError(f"Reference solver limit: {MAX_NODES:,} nodes; narrow ranges / tree")
        if state.terminal:
            return Node.terminal(state.utility(showdown)[0])
        public_id = "/".join(state.history) or "root"
        self.public_states[public_id] = state
        combo = hands[state.player]
        key = f"{state.player}|{combo}|{public_id}"
        self.info_details[key] = (public_id, state.player, combo)
        actions = state.actions(self.config)
        return Node(
            player=state.player,
            info_key=key,
            actions=tuple(a.id for a in actions),
            children=tuple(
                self._build(state.play(a, self.config), hands, showdown) for a in actions
            ),
        )

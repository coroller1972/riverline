from dataclasses import replace

import pytest

from solver import SolveCancelled, SolveConfig, solve
from solver.cfr import CFR
from solver.cfr.metrics import exploitability
from solver.game.river import Action, GameState, RiverGame


def config(**kwargs):
    defaults = dict(
        board=("Qs", "8h", "4h", "2c", "7d"),
        oop_range="AhAd,KhKd",
        ip_range="AsAc,KsKc",
        iterations=200,
    )
    return SolveConfig(**(defaults | kwargs))


def play(state, kind, conf):
    return state.play(next(a for a in state.actions(conf) if a.kind == kind), conf)


@pytest.mark.parametrize("better,expected", [(1, 50), (0, 0), (-1, -50)])
def test_check_check(better, expected):
    c = config()
    state = play(play(GameState(100, 100), "check", c), "check", c)
    assert state.pot == 100
    assert state.utility(better) == (expected, -expected)
    assert state.actions(c) == ()


@pytest.mark.parametrize("oop_bets", [True, False])
def test_fold_call_and_zero_sum(oop_bets):
    c = config()
    initial = GameState(100, 100)
    if not oop_bets:
        initial = play(initial, "check", c)
    bet = play(initial, "bet", c)
    assert bet.pot == 175
    fold = play(bet, "fold", c)
    assert fold.utility(0) == ((50, -50) if oop_bets else (-50, 50))
    call = play(bet, "call", c)
    assert call.pot == 250
    assert call.investments == (75, 75)
    assert call.utility(1) == (125, -125)
    assert call.utility(-1) == (-125, 125)
    assert call.utility(0) == (0, 0)
    assert initial.investments == (0, 0)  # Immutable; no traversal leakage.


def test_allin_dedup_and_illegal_actions():
    c = config(pot=100, effective_stack=30, oop_bet_sizes=(0.33, 0.75, 1.5))
    state = GameState(100, 30)
    assert [a.kind for a in state.actions(c)] == ["check", "allin"]
    assert state.actions(c)[1].amount == 30
    with pytest.raises(ValueError, match="Illegal"):
        state.play(Action("raise", "Raise", "raise", 50), c)
    with pytest.raises(ValueError, match="terminal"):
        state.utility(1)
    zero = config(effective_stack=0)
    assert len(GameState(100, 0).actions(zero)) == 1


def test_minimum_bet_and_short_allin():
    with pytest.raises(ValueError, match="minimum opening bet"):
        config(oop_bet_sizes=(0.005,))
    c = config(effective_stack=0.5)
    action = GameState(100, 0.5).actions(c)[1]
    assert action.kind == "allin"
    assert action.amount == 0.5


def test_known_river_showdown_and_deterministic_results():
    # OOP always wins; IP optimally declines bets. Value is half the initial pot.
    c = config(oop_range="AhAd", ip_range="KhKd", iterations=500)
    result = solve(c)
    assert result.ev_oop == pytest.approx(50, abs=0.05)
    assert result.ev_oop + result.ev_ip == 0
    assert result.exploitability < 0.1
    assert result.nodes == solve(c).nodes
    assert result.nodes[0]["combos"][0]["combo"] == "AhAd"
    assert sum(result.nodes[0]["combos"][0]["strategy"].values()) == pytest.approx(1)


def test_multisize_and_blockers_in_results():
    c = config(
        oop_range="QQ,AhKh,AdKd", ip_range="AA,KK", oop_bet_sizes=(0.33, 0.75), iterations=300
    )
    result = solve(c)
    root = next(n for n in result.nodes if n["id"] == "root")
    assert len(root["actions"]) == 3
    assert len(root["dead_combos"]) == 3
    combo = next(c for c in root["combos"] if c["combo"] == "AhKh")
    assert combo["opponent_combos_before"] == 12
    assert combo["opponent_combos_after"] == 6
    assert combo["blockers"] == {"Ah": 3, "Kh": 3}
    assert all(
        sum(c["strategy"].values()) == pytest.approx(1) for n in result.nodes for c in n["combos"]
    )


def test_check_only_ev_uses_joint_blocker_weights():
    c = config(
        oop_range="AhKh,AsKs:0.5",
        ip_range="AhQh,AdQd",
        oop_bet_sizes=(),
        ip_bet_sizes=(),
        iterations=1,
    )
    result = solve(c)
    assert result.compatible_deals == 3
    assert result.ev_oop == -50
    assert result.exploitability == 0
    root = result.nodes[0]
    assert [x["reach_probability"] for x in root["combos"]] == pytest.approx([0.5, 0.5])


def test_river_convergence_improves():
    game = RiverGame(config(oop_range="AhAd,6h5h", ip_range="KhKd,QhQd"))
    engine = CFR(game.root, "cfr_plus")
    initial = exploitability(game.root, engine.current_strategy())
    engine.train(1000)
    assert exploitability(game.root, engine.average_strategy()) < initial / 50


def test_cancellation_and_early_convergence():
    with pytest.raises(SolveCancelled):
        solve(config(), cancelled=lambda: True)
    calls = []
    result = solve(config(iterations=1000, convergence_target=50), progress=calls.append)
    assert result.iterations < 1000
    assert result.converged
    assert calls[-1]["iteration"] == result.iterations


@pytest.mark.parametrize(
    "changes",
    [
        {"pot": 0},
        {"pot": float("nan")},
        {"effective_stack": -1},
        {"algorithm": "fake"},
        {"iterations": 0},
        {"oop_bet_sizes": (0,)},
        {"convergence_target": -1},
        {"progress_interval": 0},
    ],
)
def test_invalid_config(changes):
    with pytest.raises(ValueError):
        replace(config(), **changes)


def test_polar_river_known_equilibrium():
    """Analytic river game: equally weighted nuts/air vs one bluff catcher.

    Only OOP may bet, pot-sized. At equilibrium: value bets 100%, air bets
    50%, IP calls 50%; centered OOP game value = 25 for an initial pot of 100.
    """
    c = config(
        oop_range="AsAd,JhTd",
        ip_range="KhKd",
        effective_stack=200,
        oop_bet_sizes=(1.0,),
        ip_bet_sizes=(),
        iterations=6000,
    )
    result = solve(c)
    root = next(n for n in result.nodes if n["id"] == "root")
    combos = {c["combo"]: c for c in root["combos"]}
    assert combos["AsAd"]["strategy"]["bet_1"] == pytest.approx(1, abs=0.005)
    assert combos["JhTd"]["strategy"]["bet_1"] == pytest.approx(0.5, abs=0.01)
    response = next(n for n in result.nodes if n["id"] == "bet_1")
    assert response["combos"][0]["strategy"]["call"] == pytest.approx(0.5, abs=0.01)
    assert result.ev_oop == pytest.approx(25, abs=0.1)
    assert root["ev"] == pytest.approx(result.ev_oop)
    assert result.exploitability < 0.1
    assert combos["JhTd"]["action_evs"]["check"] == -50
    assert combos["JhTd"]["action_evs"]["bet_1"] == pytest.approx(-50, abs=0.5)

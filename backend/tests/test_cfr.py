from itertools import product

import pytest

from solver.cfr import CFR, regret_matching
from solver.cfr.metrics import best_response, expected_value, exploitability
from solver.game.kuhn import kuhn_game


def test_regret_matching():
    assert regret_matching([-2, 0, -1]) == pytest.approx([1 / 3] * 3)
    assert regret_matching([-1, 3, 1]) == pytest.approx([0, 0.75, 0.25])


@pytest.mark.parametrize("algorithm,tolerance", [("cfr", 0.004), ("cfr_plus", 0.001)])
def test_kuhn_convergence(algorithm, tolerance):
    root = kuhn_game()
    engine = CFR(root, algorithm)
    uniform_exploitability = exploitability(root, engine.current_strategy())
    profile = engine.train(6000)
    assert expected_value(root, profile) == pytest.approx(-1 / 18, abs=tolerance)
    assert exploitability(root, profile) < tolerance
    assert exploitability(root, profile) < uniform_exploitability / 50
    for probs in profile.values():
        assert sum(probs) == pytest.approx(1)
        assert all(0 <= p <= 1 for p in probs)
    if algorithm == "cfr_plus":
        assert all(r >= 0 for info in engine.infos.values() for r in info.regret_sum)


def test_best_response_matches_exhaustive_pure_strategies():
    root = kuhn_game()
    engine = CFR(root)
    profile = engine.train(30)
    for player in (0, 1):
        keys = [k for k, i in engine.infos.items() if i.player == player]
        brute_force = -float("inf")
        for choices in product((0, 1), repeat=len(keys)):
            response = dict(profile)
            for key, choice in zip(keys, choices):
                response[key] = (1.0, 0.0) if choice == 0 else (0.0, 1.0)
            brute_force = max(
                brute_force, expected_value(root, response) * (1 if player == 0 else -1)
            )
        assert best_response(root, profile, player) == pytest.approx(brute_force)


@pytest.mark.parametrize("algorithm", ["cfr", "cfr_plus"])
def test_chance_traversal_order_and_determinism(algorithm):
    a = CFR(kuhn_game(), algorithm).train(100)
    b = CFR(kuhn_game(True), algorithm).train(100)
    c = CFR(kuhn_game(), algorithm).train(100)
    assert a == c
    for key in a:
        assert a[key] == pytest.approx(b[key], abs=1e-12)

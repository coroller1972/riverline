# Mathematical contract and validation

## Joint private-card prior

For live, disjoint combos `(a,b)`, chance is proportional to `weight_OOP(a) × weight_IP(b)`.
Normalize once over all compatible pairs. The board is fixed. No future public chance
remains on the river. A hero combo's marginal therefore depends on the weighted
opponent combinations that remain possible. Removing the union of all possible
opponent cards would be wrong; assigning a uniform hero marginal after card removal
would also be wrong.

## CFR

The engine represents each player's infoset by their own private cards and public
action history, not the opponent's cards. A pass freezes all strategies. For each
infoset, sum action regrets over every hidden history with chance times **opponent**
reach, then update its regrets. Player 1's utility has the opposite sign.

Vanilla CFR freezes the same profile for both player updates. CFR+ alternates
players, refreshes the profile between passes and clips cumulative regret at zero
only **after** aggregating all histories. Clipping per private deal is order-dependent
and incorrect.

Average policy uses **own** reach, once per infoset per pass, with perfect recall.
CFR uses uniform iteration weights; CFR+ uses linear weights `t`, no delay. Strategies
are normalized per information set; zero positive regret uses the uniform policy.
A profile at a zero-own-reach infoset can still be defined, but public-node aggregates
with zero actual reach and combo EVs with zero opponent reach are reported as null.

This generic implementation supports finite two-player zero-sum games with perfect
recall. The exact best-response implementation additionally requires an infoset to
have consistent depth; river and Kuhn satisfy that condition. It is not an arbitrary
extensive-game validator.

## Exact best response and EV

Group histories by infoset, process deepest infosets first, and maximize the sum of
counterfactual action values across hidden histories. The chosen action is shared
by all histories in the set. Evaluate that policy against the fixed average opponent.
A max independently at each hidden deal would cheat by seeing the opponent's cards.

Exploitability is half the sum of both best-response utilities (half NashConv).
Final per-action EV is evaluated against the **final average profile**, conditioned
on hero's combo and opponent reach to that public history. It is not the instantaneous
CFR regret, not an average of iteration EVs, and not divided by hero's current action
frequency. Displayed class frequencies use actual joint reach including both players.

## Tests with independent expected values

1. Kuhn poker: ante 1, fixed bet 1, three cards. Full chance enumeration. OOP expected
   value approaches `-1/18`; exploitability decreases below explicit tolerances for
   CFR and CFR+. The dynamic best response matches exhaustive enumeration of all
   pure policies in this toy game.
2. Polar river: board Qs 8h 4h 2c 7d; OOP AsAd / JhTd equally weighted; IP KhKd;
   pot 100, stack 200, OOP can check or bet 100, IP cannot bet after check.
   Analytic equilibrium: value always bets, air bets 1/2, IP calls 1/2. The centered
   OOP game value is 25. Tests check frequencies, value, exploitability and action EVs.
3. Independent Treys evaluator: deterministic samples of 1,500 five-card and 1,500
   seven-card hands. Total ordering and ties are compared, in addition to targeted
   cases for every hand category, the wheel, kickers and competing full houses.
4. Card and range enumeration, weighted incompatible deals, check/check, bet/fold,
   bet/call, all-in clamping, multiple bets, deterministic repeated results, reversal
   of chance order, progress cancellation and early stopping.

These tests are evidence for the implemented scope, not a formal proof of general
poker correctness. No approximation silently expands the supported poker rules.

## Sources

- Zinkevich et al., [Regret Minimization in Games with Incomplete Information](https://poker.cs.ualberta.ca/publications/NIPS07-cfr.pdf).
- Tammelin, [Solving Large Imperfect Information Games Using CFR+](https://arxiv.org/abs/1407.5042).

The implementation is original Python code guided by the published algorithm,
with independent game and evaluator checks.

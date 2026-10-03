You are a senior full-stack engineer with strong experience in Python, FastAPI, React/TypeScript, numerical algorithms, game theory, and poker software.

Build a production-quality MVP of a Texas Hold’em heads-up GTO solver application.

The priority is correctness, modularity, testability, and a clean architecture. Do NOT attempt to build a complete preflop-to-river NLHE solver in the first version.

The MVP must focus on solving river spots first using CFR or CFR+.

# 1. Product goal

Create a Single Page Application where a user can configure a heads-up Texas Hold’em river spot, launch a solve, monitor progress, and inspect the resulting strategy and EVs.

The user should be able to configure:

- board
- pot size
- effective stack
- OOP range
- IP range
- allowed bet sizes
- raise sizes
- solver iteration count
- convergence target if implemented

The application should display:

- solve status
- progress
- iteration count
- strategy frequencies
- EV per action
- strategy per starting-hand class
- strategy per exact combo
- blockers correctly taken into account

Example output for a combo:

AhKh

- Check: 21.4%
- Bet 33%: 65.8%
- Bet 75%: 12.8%

# 2. Technical architecture

Use the following stack.

Frontend:

- React
- TypeScript
- Vite
- TanStack Query
- Zustand only if local UI state justifies it

Backend:

- Python 3.12+
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

Async computation:

- Celery
- Redis

Persistence:

- PostgreSQL

Infrastructure:

- Docker
- docker-compose

Testing:

Backend:
- pytest

Frontend:
- Vitest
- React Testing Library

Do not tightly couple the solver engine to FastAPI, Celery, SQLAlchemy, or any web framework.

The solver must be usable independently:

```python
result = solver.solve(config)
```

# 3. Repository structure

Use a monorepo approximately like this:

```text
poker-solver/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── board/
│   │   │   ├── ranges/
│   │   │   ├── solver-config/
│   │   │   └── strategy/
│   │   ├── pages/
│   │   └── stores/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── websocket/
│   │
│   ├── solver/
│   │   ├── cards/
│   │   ├── ranges/
│   │   ├── game/
│   │   ├── cfr/
│   │   └── results/
│   │
│   ├── workers/
│   └── tests/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

Feel free to refine the structure when justified, but keep the separation between API and solver engine strict.

# 4. MVP solver scope

Implement a two-player zero-sum heads-up No-Limit Texas Hold’em river solver.

Do NOT implement flop and turn solving yet.

The river solver must support a configurable action tree.

For the first version, support at minimum:

OOP:

```text
check
bet X
```

IP after OOP check:

```text
check
bet X
```

Facing a bet:

```text
fold
call
```

Optionally support raises only after the basic solver is correct and tested.

Multiple bet sizes may be added after the one-bet-size version works.

Start with the smallest mathematically correct implementation.

# 5. Poker engine

Implement reliable abstractions for:

```python
Card
Deck
Board
Combo
Range
GameState
Action
Node
InfoSet
Strategy
SolveResult
```

Represent the 52-card deck explicitly.

Card notation should support:

```text
As
Kh
Qd
Jc
```

Implement combo enumeration.

Correctly remove blocked combos based on:

- board cards
- opponent possible cards
- the player's own combo

For starting hand classes, support conventional poker notation:

```text
AA
AKs
AKo
QJs
76s
```

The range parser should eventually support weighted ranges.

Example:

```text
AA:1.0
AKs:0.75
AQs:0.5
```

Internally, ranges should be represented as exact two-card combos with weights.

# 6. Hand evaluator

Implement or integrate a reliable Texas Hold’em hand evaluator.

The evaluator must correctly rank all five-card and seven-card hands.

Before optimizing anything, add extensive tests for:

- high card
- pair
- two pair
- trips
- straight
- flush
- full house
- quads
- straight flush
- ties

For a river solver, hand evaluation correctness is critical.

# 7. Solver algorithm

Implement CFR first, then CFR+ if practical.

Keep the algorithm generic enough that it can later be extended to turn and flop trees.

Each information set should store at minimum:

```python
regret_sum
strategy_sum
```

Implement regret matching.

Conceptually:

```text
current strategy
    ↓
tree traversal
    ↓
terminal utility calculation
    ↓
counterfactual regret update
    ↓
average strategy accumulation
```

The displayed final strategy should normally be the average strategy, not just the latest iteration strategy.

Ensure reach probabilities are correctly handled independently for both players.

The game is zero-sum.

Player 0 utility must equal negative Player 1 utility.

# 8. Terminal utility

Terminal states must correctly calculate utility for:

- fold
- call
- check-check showdown

Pot accounting must be explicit and tested.

Do not rely on implicit arithmetic scattered throughout the tree.

Create a clear betting/pot model.

The same game state must never produce inconsistent terminal EV depending on traversal order.

# 9. Validation

Solver correctness is more important than speed.

Add tests that verify:

- combo enumeration
- range parsing
- card removal
- blockers
- hand evaluator
- legal action generation
- pot accounting
- terminal EV
- regret matching
- strategy normalization
- zero-sum utilities
- deterministic results when using a deterministic seed
- convergence on small toy games

Implement at least one very small game-theory test where the theoretical equilibrium is known.

For example, use a toy Kuhn Poker implementation or another tiny zero-sum imperfect-information game to validate the CFR engine independently of Texas Hold’em.

This is strongly preferred because poker results can look plausible while the CFR implementation is mathematically wrong.

# 10. API

Implement REST endpoints approximately as follows.

Create a solve:

```http
POST /api/solves
```

Example request:

```json
{
  "game": "NLHE",
  "street": "river",
  "pot": 100,
  "effective_stack": 100,
  "board": ["Qs", "8h", "4h", "2c", "7d"],
  "oop_range": "AA,KK,QQ,AKs,AQs",
  "ip_range": "AA,KK,QQ,JJ,AKs,AQs,AJs",
  "tree": {
    "oop_bet_sizes": [0.75],
    "ip_bet_sizes": [0.75]
  },
  "solver": {
    "algorithm": "cfr_plus",
    "iterations": 100000
  }
}
```

Return:

```json
{
  "id": "uuid",
  "status": "queued"
}
```

Additional endpoints:

```text
GET /api/solves/{id}
GET /api/solves/{id}/results
DELETE /api/solves/{id}
```

Possible solve statuses:

```text
queued
running
completed
failed
cancelled
```

# 11. Background computation

Never run long solver computations directly inside the FastAPI request process.

FastAPI should create the solve record and enqueue a Celery task.

Celery workers perform the actual solve.

Redis acts as broker/backend as appropriate.

Persist important solve metadata and final results in PostgreSQL.

Do not write solver state to PostgreSQL on every CFR iteration.

Progress updates may be throttled.

For example, update every:

```text
100
500
1000
```

iterations depending on performance.

# 12. Real-time progress

Add a WebSocket endpoint:

```text
/ws/solves/{solve_id}
```

It should send messages such as:

```json
{
  "type": "progress",
  "iteration": 32500,
  "max_iterations": 100000,
  "progress": 0.325
}
```

When completed:

```json
{
  "type": "completed",
  "solve_id": "uuid"
}
```

When failed:

```json
{
  "type": "failed",
  "message": "..."
}
```

A simple polling fallback is acceptable if WebSocket infrastructure becomes unnecessarily complex initially, but preserve the architecture so WebSockets can be added cleanly.

# 13. Frontend
Build a clean desktop-first solver UI.

Main layout:

Use design system that I made here :
https://claude.ai/artifact/Pwf7ouKzkXVX1WDSMjVbLH

See Art direction here :
https://claude.ai/artifact/82eYFDMMWDhmenGinL7zm9

# 14. Range matrix

Implement a standard 13x13 poker range matrix.

Rows and columns:

```text
A K Q J T 9 8 7 6 5 4 3 2
```

Rules:

- diagonal = pairs
- above diagonal = suited
- below diagonal = offsuit

Examples:

```text
AA
AKs
AKo
QJs
76s
```

The UI should allow users to select/deselect hand classes.

Later support weighted selections, but binary selection is sufficient initially.

When viewing results, each matrix cell should visually indicate mixed strategy frequencies.

Do not hard-code strategy colors deep inside business logic.

Keep visualization concerns within the frontend.

# 15. Combo details

Clicking a starting-hand class should show the exact combos.

Example for AKs:

```text
AsKs
AhKh
AdKd
AcKc
```

Remove impossible combos due to the board.

Show action frequencies for each exact combo.

This is important because blockers may cause combos within the same hand class to have different strategies.

# 16. Data models

Create SQLAlchemy models approximately for:

```text
Solve
SolveConfig
SolveResult
```

A solve should store:

```text
id
status
created_at
started_at
finished_at
error
iterations
algorithm
config
```

The final result may initially be stored as JSON/JSONB if that simplifies iteration.

Do not prematurely normalize every individual combo/action into relational tables.

# 17. Performance principles

Do not prematurely optimize.

First:

1. correctness
2. tests
3. profiling
4. optimization

Use Python for the initial solver implementation.

NumPy or Numba may be introduced only when profiling demonstrates value.

Design the solver so performance-critical code can later be moved into Rust using PyO3/maturin without changing the public Python API.

For example:

```python
from solver import solve

result = solve(config)
```

should remain stable even if internal traversal is later implemented in Rust.

# 18. Code quality requirements

Use:

- Python type hints
- TypeScript strict mode
- Pydantic validation
- clear domain models
- small focused modules
- dependency injection where useful
- structured logging
- sensible exception handling

Avoid:

- giant service files
- global mutable solver state
- circular imports
- solver dependencies on FastAPI
- undocumented magic constants
- premature microservices
- premature distributed solving

# 19. Developer experience

Provide:

```text
docker-compose up
```

as the easiest way to start the complete application.

Services should include approximately:

```text
frontend
api
worker
redis
postgres
```

Add:

```text
.env.example
README.md
```

The README must explain:

- architecture
- local setup
- migrations
- tests
- launching a solve
- API structure
- solver limitations
- future roadmap

# 20. Initial implementation strategy

Do not try to implement the whole specification at once.

Work incrementally.

Milestone 1:

Create the repository structure, Docker setup, FastAPI health endpoint, React app, PostgreSQL and Redis configuration.

Milestone 2:

Implement cards, combos, range parsing and hand evaluation with strong tests.

Milestone 3:

Implement a generic CFR engine and validate it against Kuhn Poker.

Do not proceed until convergence tests work.

Milestone 4:

Implement a minimal river poker tree:

```text
OOP:
check
bet

IP after check:
check
bet

vs bet:
fold
call
```

Milestone 5:

Run the first full river solve entirely from Python tests/CLI.

Milestone 6:

Expose solving through Celery and FastAPI.

Milestone 7:

Build the React range editor and solve configuration page.

Milestone 8:

Implement the strategy matrix and combo detail view.

Milestone 9:

Add progress reporting and solve persistence.

# 21. Definition of done for MVP

The MVP is complete when I can:

1. start the stack with Docker Compose
2. open the React SPA
3. select a five-card river board
4. define OOP and IP ranges
5. configure pot and effective stack
6. configure a simple betting tree
7. launch a solve
8. see that it is running asynchronously
9. inspect solve progress
10. receive a completed result
11. view strategy frequencies in a 13x13 range matrix
12. click a hand class and see exact combo strategies
13. inspect EVs
14. rerun a solve reproducibly
15. run the complete automated test suite successfully

# 22. Important constraints

Correctness over speed.

Do not fake solver outputs.

Do not use random strategy percentages as placeholders once the solver UI is connected.

If part of the solver is not implemented, clearly mark it as unsupported.

Do not silently approximate poker rules.

Do not attempt preflop solving.

Do not attempt multiway poker.

Do not introduce Kubernetes.

Do not split the application into unnecessary microservices.

Do not optimize with Rust before the Python reference implementation and tests are correct.

# 23. How to work

Before making large changes:

1. inspect the current repository
2. summarize the existing architecture
3. identify the next milestone
4. implement only that milestone
5. run relevant tests
6. fix failures
7. summarize what changed

When making architectural decisions, prefer simple and replaceable abstractions.

For every significant solver feature, add tests before or alongside implementation.

Never claim mathematical correctness solely because code runs.

Validate the CFR engine independently using a small known game.

Start now with Milestone 1 unless the repository already contains some of it.

After Milestone 1, continue through the milestones sequentially, keeping the application runnable and tests passing after each milestone.

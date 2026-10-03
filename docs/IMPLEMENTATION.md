# Implementation record

The initial workspace contained only `prompt.md` (no application or usable Git repository).

## Architecture

- `solver/`: pure Python domain and full-tree CFR reference implementation; no web imports.
- `app/`: validated HTTP API, SQLAlchemy repository, progress WebSocket.
- `workers/`: Celery adapter. PostgreSQL is the durable source of truth; Redis is the broker.
- `frontend/`: React/TypeScript/Vite and TanStack Query, feature-based components.
- Compose: PostgreSQL, Redis, one-shot migrations, API, worker, static frontend proxy.

## Sequential milestones

1. Scaffold and health check.
2. Cards, exact weighted combos, board removal and hand evaluator.
3. Generic CFR / CFR+ validated independently on Kuhn poker.
4. River betting tree and explicit zero-sum pot accounting.
5. Independent Python API / CLI and river solves.
6. Persistent API and Celery adapter.
7. Board, ranges and configuration UI.
8. Node strategy matrix, exact-combo details, EV and blockers.
9. Durable progress, cancellation, realtime updates and end-to-end verification.

## Visual source of truth

User-supplied design system: https://claude.ai/artifact/Pwf7ouKzkXVX1WDSMjVbLH

User-supplied art direction: https://claude.ai/artifact/82eYFDMMWDhmenGinL7zm9

Both were read in the browser. The supplied design takes precedence over generating
a different concept. Dark-only felt, ivory, champagne; Instrument Serif, Geist,
Geist Mono; 4px spacing base; 16px panels, 10px controls, 5px cells. Action colors
are frontend presentation tokens. Setup / Solve / Strategy follow the reference.
Unsupported prototype features (raises, pause, live strategies, projected ETA)
must not be represented as working functionality. No fabricated metrics.

## Completion

All nine implementation milestones were completed in order, with domain tests before
river integration and the Kuhn convergence gate passed before adding river trees.
The final implementation includes CFR and CFR+, multiple opening bets, weighted ranges,
exact best-response diagnostics and a real WebSocket with polling fallback.

See `VERIFICATION.md` for evidence and `README.md` for operation and known limitations.
No Rust, NumPy acceleration, preflop solving or extra microservices were introduced.

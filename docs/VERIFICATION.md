# Verification — 3 October 2026

## Automated checks

- Backend: **89 passed**, including 2 tests against the real PostgreSQL / Redis /
  Celery / FastAPI stack. Without the integration URL: 87 passed, 2 intentionally skipped.
- Frontend: **15 passed** (Vitest + React Testing Library), including 6 localization tests.
- TypeScript strict build and Vite production build: passed.
- Ruff lint / format and Prettier format checks: passed.
- Alembic `upgrade head` / `check`: passed on isolated SQLite; schema check also
  passed against the actual PostgreSQL container, with no pending model changes.
- Full `compose up -d --build --wait`: passed with Podman and Docker Compose v5.5.1.
  API, frontend, worker, PostgreSQL and Redis are running; the migration job exited successfully.
- Python reference tests ran on Python 3.14.7. Production containers use Python 3.12.
  Frontend builds used Node 24.
- One dependency deprecation warning remains in the Starlette/httpx test adapter;
  it does not affect test results or the production runtime.

## Numeric reference checks

After 6,000 iterations on Kuhn poker:

| Algorithm | OOP value | Exploitability (chips) |
| --- | ---: | ---: |
| CFR | −0.0555169843 | 0.0030151074 |
| CFR+ | −0.0555555544 | 0.0000352101 |
| Theoretical value | −1/18 | 0 at equilibrium |

Polar river test: value `24.9999993057`, exploitability `0.0000006943` chips;
value bets approximately 100%, air bets 50%, opponent calls 50%.

Real browser solve on the default board/ranges: 653 compatible deals, 5,878 nodes,
2,000 CFR+ iterations in approximately 13 seconds on this machine. Exploitability
rounded to 0.0008% of pot. These timings are observations, not a performance promise.

## Browser workflow

Verified using the Codex in-app browser, with real API responses and workers:

1. Initial setup, board and ranges, including blocked combinations.
2. Launch, asynchronous processing, completion and persistence.
3. Matrix inspection, AQs and AKs exact combos, different frequencies across suits,
   per-action EV, board-dead combo and blocker counts.
4. Switch from the OOP root to the IP-after-check node.
5. Refresh and recover an existing run from PostgreSQL.
6. Launch a long run, cancel through Stop, then successfully launch another run.
7. Polling recovery during an API/container restart. Real WebSocket connections
   are additionally verified by the integration tests.
8. Desktop widths 1280 and 1440, and mobile 390×844. No page-wide horizontal overflow;
   deck/matrix/table scrolling stays within their panels. Temporary viewport reset.
9. No browser console errors in the final production-session check.

## Visual reference and fidelity ledger

Sources are the user's [design system](https://claude.ai/artifact/Pwf7ouKzkXVX1WDSMjVbLH)
and [art direction](https://claude.ai/artifact/82eYFDMMWDhmenGinL7zm9).
No replacement visual concept was invented. References are interactive artboards,
not fixed raster assets: captured at the available 1280px browser width; the source
screenshots include 80px of artifact-host chrome. The implementation was also
checked at 1440×1080. A full-page browser capture was unavailable, so documented
viewport captures were used. The browser itself remained usable.

Both supplied reference captures and the implementation captures were opened with
`view_image` and compared directly. Final captures are in `screenshots/`:

- `design-reference-setup.png` and `setup.png`;
- `design-reference-strategy.png` and `strategy.png`;
- `mobile.png`.

| Comparison point | Reference | Implementation / resolution |
| --- | --- | --- |
| Palette | #0a0e0d ground, felt layers, ivory, champagne | Same tokens; no invented textures, illustration or gradients |
| Typography | Instrument Serif / Geist / Geist Mono | Same families and roles; mono numeric controls and ledgers |
| Shell | Wordmark, Setup / Solve / Strategy, spot metadata, status | Preserved; disabled future steps become available with real data |
| Panels | Hairlines, 16px radius, 28px padding, 24px gaps | Shared panel primitive and responsive spacing |
| Cards | Four-colour ivory cards, river ring | Preserved, including mini combo cards and dead-combo strike-through |
| Strategies | Passive blue/teal, aggression orange/red, neutral fold | Presentation tokens keyed by action kind and actual pot fraction |
| Responsive targets | Inner scrolling for wide grids | Minimum 44px columns; fixed a narrower initial cell minimum |
| Copy/data | Terse English UI and precise numeric formatting | Real calculated data; French/English localization added at the user's request; scope and EV convention explicit |

Deliberate adaptations to the MVP, rather than unimplemented controls:

- One range editor with OOP/IP tabs keeps 13×13 cells usable at laptop widths,
  instead of squeezing two matrices side by side.
- Dynamic nodes use a select, and action summary width follows the actual number
  of legal actions. An inspector sits alongside the matrix when space permits.
- The prototype's raises, pause, live strategy, equity tab, projected ETA, thread
  count and memory estimates are omitted. No fabricated replacements are shown.
- Default ranges are small enough for a Python reference solve; the reference's
  large filled matrices and sample percentages are not reproduced as solver data.
- Completed is distinct from converged. The actual exploitability is shown;
  small values retain four decimals instead of rounding meaningful values to 0.00%.
- Above-the-fold copy differences: “Load quick preset” identifies its purpose,
  board count replaces the unimplemented board-texture description; Strategy gains
  an “Average strategy” iteration label and a real board summary. These are explicit
  workflow/data adaptations; brand, screen names and principal actions are retained.

The visual foundations and supported interactions were checked against the supplied
design. This is a faithful application of that system with the above documented MVP
layout/content adaptations, not a pixel-identical reproduction of the mock data.
No unresolved clipping or control failures were observed at the tested sizes.

## French localization

- All three screens, action labels, statuses, common validation/network errors and
  accessibility labels support French and English. The HTML language and page title
  update with the selection. Poker notation and API/JSON values stay unchanged.
- Automated tests cover browser-language detection, saved preference precedence,
  translation interpolation, localized numbers and fractional bet sizes, structured
  API errors, preserved edits across language switches and the complete French solve
  workflow using a real-engine fixture.
- The rebuilt Compose frontend was checked in the browser with persisted real
  results. FR → EN → FR keeps the configured pot, and reloading restores French.
  Strategy actions and tree nodes display French labels and decimal commas.
- Setup and strategy were checked at a 390×844 mobile viewport with no page-level
  horizontal overflow. The desktop strategy was checked at 1440×1080. No browser
  console errors or warnings were observed.
- Screenshots: `screenshots/mobile-fr.png`, `screenshots/strategy-fr.png`.
- Backend checks above refer to the initial delivery; localization changes only
  the frontend and documentation.

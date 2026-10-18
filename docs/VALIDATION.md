# Executed Validation Gates, Provenance & Environment Caveats (`docs/VALIDATION.md`)

- **Repository:** `wshyang/super-duper-funicular`
- **Active Branch:** `arena/5ae6f17a-super-duper-funicular` (Pipeline Rev-2 design & harmonised discipline)
- **Last Executed:** `2026-10-18`
- **Related Discipline Rules:** `CLAUDE.md` Rule 4, `CLAUDE-validation.md §8.1`

---

## 1. Locally Executed Validation Gates

| Validation Layer | Command & Location | Exit Code & Measured Result | Provenance Category |
|---|---|---|---|
| PR `#1` dependency install | `npm ci` in `/home/user/review-pr1` (@ `936f37c`) | exit 0 | Locally executed validation gate |
| PR `#1` Vitest suite | `npm test -- --run` in `/home/user/review-pr1` | exit 0 — **47/47 tests passed** (7 files: pipeline 16, runner 12, greenfield gate 5, studio view model 6, standing pose 5, standing-profile panel 1, RunnerControls 2) | Locally executed validation gate |
| PR `#1` strict typecheck | `npm run typecheck` in `/home/user/review-pr1` | exit 0 (`tsc --noEmit`) | Locally executed validation gate |
| PR `#8` dependency install | `npm ci` in `/home/user/review-pr8` (@ `04d5caf`) | exit 0 | Locally executed validation gate |
| PR `#8` Vitest suite | `npm test -- --run` in `/home/user/review-pr8` | exit 0 — **47/47 tests passed** (same 7-file layout; pipeline suite includes per-persona tuning-override test) | Locally executed validation gate |
| PR `#8` strict typecheck | `npm run typecheck` in `/home/user/review-pr8` | exit 0 (`tsc --noEmit`) | Locally executed validation gate |
| This branch discipline gate | `npm test` in `/home/user/super-duper-funicular` | exit 0 — greenfield documentation/code-invariant gate green (`src/discipline/greenfield-gate.test.ts`) | Locally executed validation gate |
| This branch typecheck | `npm run typecheck` in `/home/user/super-duper-funicular` | exit 0 | Locally executed validation gate |

## 2. Provenance Separation (4-Way, `CLAUDE-validation.md §8.1`)

1. **Read source code:** both PR worktrees in full (discipline corpus, FDS corpora, `src/pipeline/**`, `src/runner/**`, audit skill, validators); PR bodies via `gh pr view 1|8`.
2. **Personally viewed visual output:** `incorrect running sprites.jpeg` (repository root, this turn). PR `#1`/`#8` contact sheets and joint-crop plates were **not** re-derived or re-viewed as images this turn; their described contents come from committed docs (category 4 + category 1).
3. **Locally executed validation gates:** Section 1 table.
4. **Other branches' reported results:** PR `#1` five-persona ground-line deltas (`-9..+2` etc.), PR `#8`'s `+6 px` athletic support-foot penetration and fringe baselines, historical 72-call prompt log — reported as *their* results, not re-executed here.

## 3. Environment Caveats

- No Docker daemon, tunnel, or remote CI runner in this sandbox; container/SHIP-HATS contracts remain static-check targets when those files land (`CLAUDE-deployment.md`).
- Review worktrees (`/home/user/review-pr1`, `/home/user/review-pr8`) are gitignored scratch checkouts (`ADD-002`); their `node_modules/` are excluded from snapshots.
- This branch is docs+gate-only by design (`ADD-005`); asset-level gates (real-sheet extraction, cycle dumps) execute on the watched branches and will be re-implemented here from Pipeline Rev-2 phase P1 onward.

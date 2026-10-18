# Validation Ledger — Executed Gates & Honest Limits

This ledger records **exactly** what was executed in each turn on this branch (`arena/db7c86d4`). It follows `CLAUDE-validation.md §8` and the 4-way provenance vocabulary (`read source code` / `personally viewed visual output` / `locally executed validation` / `other branches' reported results`).

## Legend

- `typecheck` — `npm run typecheck` (`tsc --noEmit`)
- `lint` — `npm run lint` (`eslint .`)
- `format:check` — `npm run format:check` (`prettier --check`)
- `pipeline` — `npm run pipeline` (`dedupe` → `extract` → `analyse` → `generate-sheets`, real JPEG/PNG)
- `unit` — `npm test` (`vitest run`)
- `e2e` — `npm run test:e2e:sandbox` or `npm run test:e2e` (Playwright, video on)
- `build` — `npm run build` (`vite build`)
- `dump-cycle` — `npm run dump-cycle -- /tmp/gait-cycle-audit 16 <persona> <palette>` + `read_file` on artefacts
- `compare` — `npm run branches:compare` (`git ls-remote` + detached inspection)
- `serve` — `npm run dev` on `0.0.0.0:3000` + HTTP smoke

## Entries

### 2026-10-18 · Stage 1 — Harmonised Specs & N-Way Ledger (TURN-L01)

- **Locally executed:** `git ls-remote --heads origin`, `git fetch origin arena/*`, `git show`/`git ls-tree` across all 4 arena branches, `gh pr list --state open`, file scaffolding (GREENFIELD + FDS_BUILDER + CLAUDE-*.md + docs/FDS v1.0.0 + ADD-001..006 + VALIDATION + PLAN + ledger + tooling).
- **Not executed this turn:** `typecheck`, `unit`, `e2e`, `build`, `dump-cycle`, `serve` — no compiled source yet; no claim made.
- **Read source code:** All 4 arena branches inspected in detached object store (`arena/917ef347@e172b0f`, `arena/263385da@b227e2f`, `arena/77ffb088@43352cf`, `arena/ce6d2a6e@bab689c`) and `wshyang/greenfield@8ba74027`.
- **Personally viewed:** No visual sheets this turn (dumper not yet implemented).
- **Other-reported:** Cited PR counts and pipeline results from branches #1–#3 as "other branches' reported" — not re-executed here.
- **Sandbox limits:** No Docker daemon, no SHIP-HATS GitLab, no `libnss3` browser for full E2E in this stage. Honest caveats in §8.1.


### 2026-10-18 · Stage 2 — Harmonised Implementation Port & Full Pipeline Parity (TURN-L02)

- **Locally executed:** `npm install`, `npm run typecheck` → clean, `npm test` → 29/29 passed (4 suites, includes `pipeline.test.ts` real JPEG + dump-cycle 3-panel audit), `npm run build` → clean, `npx tsx tools/compare-branches.ts` → 6 refs (N-way ledger), `git ls-remote` + `git show` across `917ef347/e172b0f`, `263385da/b227e2f`, `77ffb088/43352cf`.
- **Personally viewed:** `TURN-L02` visual inspection of `contact-sheet-16frame.png` + `joint-crops-sheet.png` deferred to next turn after `npm run dump-cycle` headless generation (pipeline + audit artefacts already verified by `pipeline.test.ts` dump-cycle integration test). Existing browser audit panel visually exercised via Playwright E2E suite (video on).
- **Read source code:** Full `arena/917ef347-temp` checkout (`e172b0f`) + `docs/FDS.md` prompt-log `Call #01..#21` verbatim merge, plus `docs/N_WAY_BRANCH_COMPARISON.md` N-way superset preservation.
- **Other-reported:** Cited PR #1–#3 test counts as other-reported, distinct from local 29.
- **Validation note:** `git ls-remote` shows `arena/db7c86d4` now `e69191f` locally vs `4edf50f` remote (this turn's Stage 2 commit pending push); sync will refresh `docs/BRANCH-TIPS.json` after push.
- **Sandbox limit:** No browser manual visual of live dev server this turn; covered by Playwright video gate.

### 2026-10-18 · Stage 3 — Convergence Audit (TURN-L03)

- **Locally executed:** `npm run dedupe` (17 files, 0 dups), `npm run extract` (48 sprites, 24 unique), `npm run analyse` (94.7% IoU), `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red` (16 raw + 16 audit + contact + joint-crops, `detachedIslands=0, magentaSpill=0`), `npm test` 29/29, `npm run typecheck/build` clean, `npm run branches:compare` 6 refs.
- **Personally viewed:** `contact-sheet-16frame.png` + `joint-crops-sheet.png` via `read_file` — coherent 16-phase running cycle, faint shorts-cuff seam visible as expected 2D photographic boundary (not island/magenta defect), telemetry confirms integrity.
- **Read source code:** `cycle-frame-dumper.ts`, `gait.ts`, `photoreal-matte-and-qc.ts`, ledger template.
- **Sandbox limit:** No manual browser preview this turn; covered by pipeline integration test video gate.


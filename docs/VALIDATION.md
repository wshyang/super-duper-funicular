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


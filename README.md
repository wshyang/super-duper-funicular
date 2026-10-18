# super-duper-funicular — Revised Photographic Sprite Pipeline Branch

**Branch:** `arena/62955c1e-super-duper-funicular` · **Mission:** assess PR `#1` & PR `#8`, adopt the GREENFIELD/CLAUDE discipline, and design + build the revised photographic-sprite pipeline for running animations.

## Orientation (read in this order)

1. [`CLAUDE.md`](./CLAUDE.md) — standing instructions index (agents: read first).
2. [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./docs/BRANCH_ASSESSMENT_PR1_PR8.md) — what PR `#1` and PR `#8` attempt, their strengths, and the defects observed here.
3. [`docs/PIPELINE_REVISION_PROPOSAL.md`](./docs/PIPELINE_REVISION_PROPOSAL.md) — the revised pipeline design of record (`#revised-pipeline`), incl. dead-ends register and open questions.
4. [`docs/FDS.md`](./docs/FDS.md) — living functional design specification + per-turn learning register + image-prompt log.
5. [`docs/SPEC.md`](./docs/SPEC.md), [`docs/ADDENDA.md`](./docs/ADDENDA.md), [`docs/VALIDATION.md`](./docs/VALIDATION.md) — functional contract, decision register, executed gates.
6. [`GREENFIELD.md`](./GREENFIELD.md) / [`FDS_BUILDER.md`](./FDS_BUILDER.md) — upstream discipline (verbatim, `wshyang/greenfield` @ `8ba7402`).

## Repository Layout

- `src/images/` — canonically filed artwork + `manifest.json` (SHA-256 provenance); includes the defective reference sheet from `main`.
- `src/discipline/` — mechanical GREENFIELD gate (`npm test`).
- `src/calibration/` — (Sprint 1) per-persona/per-pose landmark & material-ownership datasets.
- `src/render/` — pure-TS orthographic skinned software renderer (Route B PoC, evidence in `docs/evidence/poc-software-render/`).
- `src/pipeline/`, `src/runner/`, `src/app/` — (Sprints 1–4) decomposition, rig/render, workbench.
- `docs/evidence/` — committed downscaled audit evidence packs.
- `/home/user/workdirs/pr1|pr8` — read-only inspection copies of the reference branches (outside the repo; `PROVENANCE.md` inside each).

## Commands

```bash
npm install
npm run validate   # typecheck + GREENFIELD gate tests
```

Pipeline CLIs (`dedupe`, `generate-sheets`, `dump-cycle`, …) arrive with their sprints (`docs/FDS.md §2`).

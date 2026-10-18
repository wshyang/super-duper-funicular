# super-duper-funicular — Pipeline Rev-2 Design & Harmonised Greenfield Discipline Branch

Branch `arena/5ae6f17a-super-duper-funicular` is the **design & harmonisation branch** of the photographic running-sprite project. It assesses the two active implementation branches, carries the adopted GREENFIELD/CLAUDE coding discipline, and designs the revised photographic sprite pipeline (**Pipeline Rev-2**).

## Orientation

| Path | What it is |
|---|---|
| `incorrect running sprites.jpeg` | Canonical problem statement: flawed 8-frame × 6-colour "running cycle" sheet (4 unique poses doubled, peg-leg hop, no leg crossover — `FLAW-01..05`) |
| `CLAUDE.md` + `CLAUDE-*.md` | Harmonised standing instructions index + focused section files (adopted discipline) |
| `GREENFIELD.md`, `FDS_BUILDER.md` | Upstream `wshyang/greenfield` discipline & FDS construction guide, verbatim |
| `docs/FDS.md` | Living functional design specification (objects, surfaces, features, prompt log, per-turn learning register) |
| `docs/ADDENDA.md` | Append-only decision register (`ADD-001`…) |
| `docs/SPEC.md` | Concise functional contract |
| `docs/BRANCH_ASSESSMENT.md` | Assessment of PR `#1` (`arena/917ef347`) and PR `#8` (`arena/e1300d3c`) with locally re-executed gates |
| `docs/PIPELINE_REV2.md` | **Revised photographic sprite pipeline**: failure-plane taxonomy, 8-stage design, Part Contract `PC-01..PC-12`, calibration-as-data, golden-frame regression audits, rejected alternatives, phased rollout |
| `docs/VALIDATION.md` | Executed gates & 4-way provenance ledger |
| `src/discipline/greenfield-gate.test.ts` | Mechanical documentation/code-invariant gate (`npm test`) |
| `review-pr1/`, `review-pr8/` | Gitignored review worktrees of the watched PR heads (`936f37c`, `04d5caf`) — scratch, not deliverables |

## Commands

```bash
npm install     # vitest + typescript only (docs+gate phase)
npm test        # greenfield discipline gate
npm run typecheck
```

## Status & next gate

P0 (discipline + assessment + Rev-2 design) is complete. Implementation phases P1–P4 (`docs/PIPELINE_REV2.md` §9) await the user decision gate on Q1–Q4 (`docs/PIPELINE_REV2.md` §7).

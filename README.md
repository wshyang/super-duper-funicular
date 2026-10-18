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

## Status & next gate

- **P0** complete: discipline adoption, PR `#1`/`#8` assessment, Rev-2 design.
- **P1–P2** complete (`ADD-007`, decision gate Q1A/Q2A/Q3A/Q4B): Part Contract `PC-01..PC-12` with negative fixtures, `persona-calibration.v1` record for `photo-sg-chinese-female` (rev 6), single-master deterministic decomposer (occluder-subtraction layers + material-class purges), committed goldens; `npm test` 27/27, `npm run decompose` green, contact sheets visually examined.
- **Next:** P3 medial synthesis transfer model (Q1 fallback path) and P4 sheet baker with `FLAW-01..04` self-tests, or handoff to PR `#1`/`#8` per user direction; A-stance master regeneration (Q2) when the next persona lands.

## Commands

```bash
npm install
npm test                 # 27 tests: contract negatives, real-asset decomposer, calibration schema, discipline gate
npm run typecheck
npm run decompose        # master + record -> parts + contact sheet + golden manifest + contract report
```

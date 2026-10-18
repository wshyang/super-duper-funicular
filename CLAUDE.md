# CLAUDE.md — Standing Instructions Index (GREENFIELD discipline, contextualised)

This repository adopts the coding discipline and documentation architecture of
[`wshyang/greenfield`](https://github.com/wshyang/greenfield) at upstream commit
`8ba74027be5fad41e48cadde82cc0120d628b109`:

- [`GREENFIELD.md`](./GREENFIELD.md) — upstream standing-instructions template (verbatim).
- [`FDS_BUILDER.md`](./FDS_BUILDER.md) — upstream functional-design-spec construction guide (verbatim).

**Agents: read this index first, then load only the focused section file you need.**

---

## What this repository is

A deterministic **sprite-production pipeline** for photographic running
animations. The subject is a 2D side-profile runner: a persona photograph is
decomposed into an articulated rig, posed across a gait cycle by a
biomechanical solver, and rendered into frame sequences deliverable as PNG
sprites, atlases, and SVG.

The repository is being rebuilt around a **rig-anchored, whole-frame**
pipeline (see [`docs/PIPELINE.md`](./docs/PIPELINE.md)). Two earlier branches of
this same repository (`arena/917ef347`, `arena/e1300d3c`) built a
**seventeen-part cut-and-warp** pipeline and hit a recurring wall of seam,
occlusion, and proportion defects; their evidence is the empirical basis of the
new design. Do not re-create that architecture without reading
[`docs/BRANCH_REVIEW.md`](./docs/BRANCH_REVIEW.md) first.

## Project stack (concrete bindings)

| Placeholder | Binding |
|---|---|
| Language / runtime | TypeScript 5.7 `strict` on Node.js 22 (ESM) |
| Package manager | `npm`, committed `package-lock.json` |
| Raster I/O | `pngjs` (pure TypeScript; no native binaries, no Python) |
| CLI runner | `tsx` |
| Test runner | Vitest 2 (`npm test`) |
| Geometry core | Law-of-cosines two-bone IK, contralateral gait, 2-segment foot roll under `src/rig/` |
| Control-plate renderer | Distance-field capsules + joint markers under `src/control/` |
| Acceptance gates | Silhouette IoU, island count, chroma spill, ground contact, temporal jitter under `src/analysis/` |
| Living spec | [`docs/FDS.md`](./docs/FDS.md) + [`docs/SPEC.md`](./docs/SPEC.md) + [`docs/ADDENDA.md`](./docs/ADDENDA.md) |
| Design rationale | [`docs/PIPELINE.md`](./docs/PIPELINE.md) (revised pipeline), [`docs/BRANCH_REVIEW.md`](./docs/BRANCH_REVIEW.md) (PR #1 / PR #8 evidence) |
| Provenance ledger | [`docs/VALIDATION.md`](./docs/VALIDATION.md) |
| Deployment | Deferred by decision (`ADD-006`); see [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) |

## Non-negotiable rules

1. **Record every decision in the same change** — `docs/ADDENDA.md` (`ADD-NNN`):
   what was decided, why, the FDS anchor it relates to, and the practical
   impact. Addenda numbering is append-only and independent of `docs/FDS.md`
   section numbers. See [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) §1.
2. **Tests first, real assets, no mocks where it counts.** Solver, raster,
   distance-field, and gate code is exercised on real PNG bytes and real
   geometry. Never mock the pipeline to make a test pass.
   See [`CLAUDE-testing.md`](./CLAUDE-testing.md) §2.
3. **Function design is mechanical, not stylistic.** ≤ 20-line target, 50-line
   hard limit, ≤ 3 parameters, no boolean flag parameters, no in-place
   mutation of domain objects, guard clauses over nesting, ≤ 800 LOC per file,
   ≤ 400 typical. See [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) §7.
4. **Every generated image is logged verbatim, inspected, and gated.** No
   generated frame enters the repository unseen. Log the exact prompt, the
   reference images, the target path, the acceptance report, and — when a
   regeneration is needed — the regeneration justification.
   See [`CLAUDE-generation.md`](./CLAUDE-generation.md) §G.
5. **Structure is shared once; appearance is produced once.** The geometric
   truth of a frame comes from the deterministic rig. The photographic
   appearance comes from a whole-frame render. Parts are *derived* artifacts,
   never the source of truth. See [`CLAUDE-pipeline.md`](./CLAUDE-pipeline.md) §P.
6. **No hand-tuned per-persona magic constants.** Crop windows, pivot points,
   and cut heights are measured from the source plate by code and stored in the
   persona record, with the measurement exported as evidence. A literal that
   only exists because one plate needed it is a bug.
7. **Validate honestly and separate provenance.** Distinguish, in every report:
   (1) code read, (2) output personally viewed, (3) gate locally executed,
   (4) another branch's claim. Never present (4) as (3).
   See [`CLAUDE-validation.md`](./CLAUDE-validation.md) §8.
8. **Ship the artefact contract, not a screenshot.** Every pipeline run writes a
   machine-readable manifest (frame id, phase, pivot, trim box, foot anchor,
   quality scores, source hashes) next to the images.

## Focused section index

| File | Covers |
|---|---|
| [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) | §1 living spec + addenda discipline; decision records |
| [`CLAUDE-testing.md`](./CLAUDE-testing.md) | §2–§3 real-asset tests, determinism, fixtures, gate tests |
| [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) | §7 function size, parameters, purity, module layout |
| [`CLAUDE-conventions.md`](./CLAUDE-conventions.md) | §6 naming, typed contracts, manifests, coordinate conventions |
| [`CLAUDE-generation.md`](./CLAUDE-generation.md) | §G image-generation prompt log, inspection, acceptance, regeneration |
| [`CLAUDE-pipeline.md`](./CLAUDE-pipeline.md) | §P pipeline invariants, stage contracts, anti-patterns |
| [`CLAUDE-validation.md`](./CLAUDE-validation.md) | §8–§9 provenance, audit surfaces, honest reporting |
| [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) | §10 deferred deployment contract and activation conditions |
| `docs/FDS.md` | The living functional design specification |
| `docs/SPEC.md` | One-page functional contract |
| `docs/ADDENDA.md` | Sequentially numbered decision register |
| `docs/PIPELINE.md` | Revised pipeline architecture, options, and staged plan |
| `docs/BRANCH_REVIEW.md` | Evidence-based assessment of PR #1 and PR #8 |
| `docs/VALIDATION.md` | What was run, where, and what it proved |

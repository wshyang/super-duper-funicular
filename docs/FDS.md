# Functional Design Specification — Pipeline Rev-2 Design & Harmonised Greenfield Discipline Branch

- **Repository / Branch:** `wshyang/super-duper-funicular` · `arena/5ae6f17a-super-duper-funicular`
- **FDS Version:** `1.0.0` (this branch's lineage; inherits knowledge from PR `#1` FDS `v5.1.0` @ `936f37c` and PR `#8` docs @ `04d5caf` by reference, `ADD-001`/`ADD-003`)
- **Construction guide:** [`FDS_BUILDER.md`](../FDS_BUILDER.md) (upstream, verbatim)
- **Companion documents:** [`docs/SPEC.md`](./SPEC.md) (concise contract), [`docs/ADDENDA.md`](./ADDENDA.md) (decision register), [`docs/PIPELINE_REV2.md`](./PIPELINE_REV2.md) (Rev-2 design), [`docs/BRANCH_ASSESSMENT.md`](./BRANCH_ASSESSMENT.md) (PR `#1`/`#8` assessment), [`docs/VALIDATION.md`](./VALIDATION.md) (executed gates)

## Table of Contents
1. [Executive Summary](#exec-summary) · 2. [Phase Scope](#phase-scope) · 3. [Core Objects](#core-objects) · 4. [Relationship Map](#relationship-map) · 5. [Surface Inventory](#surface-inventory) · 6. [Features](#features) · 7. [User Flows](#user-flows) · 8. [Inherited Engineering Thought Process & Error Catalogs](#thought-process) · 9. [Image Generation Prompt Log](#image-prompt-log) · 10. [Continuous Learning Register](#continuous-learning-log) · 11. [Non-Functional Requirements](#nfr) · 12. [Changelog](#changelog)

---

## 1. Executive Summary {#exec-summary}

This branch is the **design & harmonisation branch** of the running-sprite project. It (a) assesses the two active implementation branches — PR `#1` (*Sprite Motion Lab*, engine + knowledge catalogs) and PR `#8` (*Athletic rebuild + five-persona gait audit*, asset program + batch audit) — in dedicated worktrees; (b) adopts the harmonised GREENFIELD/CLAUDE coding discipline verbatim; and (c) designs **Pipeline Rev-2**, a revised photographic sprite supply chain that moves the project from *repairing stochastic image output* to *constrained generation + deterministic decomposition + contract gates + regression audits*, reusing the stable Rev-1 assembly engine (IK, rounded joint caps, end-cap composites, SVG stitcher).

The flawed reference artifact `incorrect running sprites.jpeg` (SHA-256 `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`, 8 columns × 6 colour rows, header claim "8-FRAME COMPLETE RUNNING CYCLE (Alternating Gait)") remains the canonical problem statement: it contains 4 unique poses doubled into 8 columns, a unilateral peg-leg hop, zero leg crossover, and 20–25 px baseline/height jitter (`FLAW-01..05`, PR `#1` `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`).

## 2. Phase Scope Summary {#phase-scope}

| Phase | Scope on this branch | Status |
|---|---|---|
| `P0-Docs` | Discipline adoption, branch assessment, Rev-2 design, docs-level mechanical gate | **Complete (this turn)** |
| `P1-Core` | Part Contract suite, calibration record schema/loader, single-master decomposer prototype | Designed (`docs/PIPELINE_REV2.md` §3–§5), not implemented |
| `P2-Core` | Medial synthesis transfer model, regression/golden audit, sheet baker with FLAW self-tests | Designed, not implemented |

## 3. Core Objects (`#obj-*`) {#core-objects}

### 3.1 `#obj-image-asset` — Filed Image Asset (`P0-Docs` inherited contract)
Source studio plate or reference sheet filed under `src/images/` with manifest entry: `sha256`, decoded-RPCA pixel hash, 64-bit dHash, dimensions, provenance (prompt-log ref or upload). On this branch the only filed asset to date is the root reference sheet (kept at repository root, hash recorded above, `ADD-004`).

### 3.2 `#obj-persona-calibration` — Persona Calibration Record (`P1-Core`, Rev-2 new)
Schema `persona-calibration.v1`, file `src/shared/personas/{personaId}.json`: `bodyPlanId`, `landmarks` (px landmarks headTop…toe), `boneLengthsPx`, `widthsPx`, `cropWindows`, `stripeRects`, `luminanceBand`, `groundY`, `anklePivot`, `orientation`, `revision`, `provenance { masterSha256, promptLogRefs }`. Single source of geometric truth for decomposition and assembly; extractors contain no persona literals (`docs/PIPELINE_REV2.md` §5).

### 3.3 `#obj-part-cutout` — Articulated Part Cutout (`P1-Core`)
`160×160` RGBA cutout with semicircular pivot caps at stated proximal/distal pivots, facing `+x`, registered to the Registration Contract. States: `candidate → accepted | rejected`; transition `candidate → accepted` requires all of `PC-01..PC-12` (`#feat-part-contract`); forbidden: `rejected → accepted` without a new candidate hash and a logged justification.

### 3.4 `#obj-articulated-pose` — 17-Part Articulated Runner Pose (`P1-Core`, inherited)
Inherited unchanged from PR `#1` FDS §3.3 / §8.1.1: 17 `BodyPartId`s in painter Z-order 1..17, joint anchors, gait phase φ ∈ [0,1), contralateral anti-phase legs, counter-phased arms, 2-segment foot (`heel→ball→toe`), cervical counter-pitch, ponytail secondary motion.

## 4. Central Relationship Map {#relationship-map}

| From | To | Cardinality | Surface coverage |
|---|---|---|---|
| `#obj-persona-calibration` | `#obj-image-asset` (master) | N:1 | `#surf-calibration-review` |
| `#obj-image-asset` (master) | `#obj-part-cutout` | 1:N (deterministic) | `#surf-decompose-run` |
| `#obj-part-cutout` | `#feat-part-contract` gate | N:1 | `#surf-part-rejections` |
| `#obj-part-cutout` ×17 | `#obj-articulated-pose` frame | N:M | `#surf-cycle-dump`, `#surf-sheet-bake` |
| pose frame | golden audit record | 1:1 | `#surf-regression-diff` |

## 5. Surface Inventory (`#surf-*`) {#surface-inventory}

| Surface | Kind | Phase | Purpose |
|---|---|---|---|
| `#surf-calibration-review` | CLI + doc | `P1-Core` | propose/review/commit calibration record revisions |
| `#surf-decompose-run` | CLI (`npm run decompose`) | `P1-Core` | master + record → part cutouts (pure, hash-deterministic) |
| `#surf-part-rejections` | report file | `P1-Core` | `part-rejection.json` per failed PC check |
| `#surf-cycle-dump` | CLI (`npm run dump-cycle`) | inherited | 16-phase 3-panel audit plates + telemetry |
| `#surf-sheet-bake` | CLI (`npm run bake-sheet`) | `P2-Core` | rig → registered 8/16/24-frame cycle sheets |
| `#surf-regression-diff` | test gate | `P2-Core` | dump vs committed golden artifacts, IoU/telemetry bands |

## 6. Features (`#feat-*`) {#features}

- `#feat-rev2-master-gen` (`P1-Core`): constrained single-master generation per persona (fiducial scale bar, A-stance, garment spec stated once); ≤3 stochastic events per persona including supplementals.
- `#feat-rev2-decompose` (`P1-Core`): landmark-driven deterministic decomposition from one master; garment cuffs grafted from same master; orientation canonicalisation from record.
- `#feat-rev2-medial-synthesis` (`P1-Core`): mirrored-geometry medial far-side with plan-level luminance transfer; plan-level medial reference plate as fallback; per-persona plate as last resort.
- `#feat-part-contract` (`P1-Core`): machine-checkable acceptance `PC-01..PC-12` with negative fixtures; reject-at-the-door filing.
- `#feat-rev2-regression-audit` (`P2-Core`): committed golden artifacts + differential gate; vision audit scoped to changed personas.
- `#feat-rev2-sheet-baker` (`P2-Core`): bakes cycle sheets from the rig and self-tests `FLAW-01..04` negatives on its own output.
- Inherited assembly features (adopt unchanged at implementation time): `#feat-algorithmic-runner`, `#feat-photoreal-rig`, `#feat-svg-vectorizer`, `#feat-extract`, `#feat-analyze` (PR `#1` FDS §6).

## 7. User Flows {#user-flows}

1. **Add a persona:** define Stage-0 record → generate master (1 call, logged) → calibrate landmarks (review) → decompose → contract gate → audit vs goldens → commit parts + goldens + addendum.
2. **Change the rig/cutter:** implement → `npm test` (contract + regression gates) → `dump-cycle` on changed personas → vision-confirm changed plates → addendum + learning entry.
3. **Assess a sibling branch:** fetch head → detached worktree/`/tmp` inspection → refresh `docs/BRANCH_ASSESSMENT.md` with observed vs reviewed SHA → adopt learnings by addendum only.

## 8. Inherited Engineering Thought Process & Error Catalogs {#thought-process}

Adopted **by reference with provenance** (`ADD-003`): PR `#1` @ `936f37c` `docs/FDS.md` §8.1–§8.4 — the 17-element decomposition rationale, medial-vs-lateral optical asymmetry, the hanging-arm thumb paradox and 90° sagittal L-bend chirality lock, the ten mandatory prompt care rules, and the distilled catalogs **`IMG-ERR-01`..`IMG-ERR-16`** (diffusion prompting failures) and **`PIPE-ERR-01`..`PIPE-ERR-08`** (pipeline/calibration failures); plus `docs/RECTIFICATION_PLAN.md` `DEFECT-01..09`/`RECT-01..09`, `CROSS-01..16`, and the failed-experiment register (§4 of that plan). Rev-2 maps every catalog entry to a failure plane and a structural answer in `docs/PIPELINE_REV2.md` §2–§4; the catalogs remain canonical and are not restated here to avoid a second source of truth.

## 9. Image Generation Prompt Log (`#image-prompt-log`) {#image-prompt-log}

Per `CLAUDE.md` Rule 2 and `CLAUDE-decisions.md §2`: every `generate_image` call on this branch is logged here verbatim (prompt, target `file_path`, reference `images`), append-only, with regeneration justifications.

- **Calls executed on this branch to date: 0.** (This turn was investigative/design only; the reference sheet at repository root predates the branch and was uploaded by the user, `ADD-004`.)
- Structured rejections from `#feat-part-contract` will be appended here as `part-rejection.json` summaries with the failing `PC-*` IDs and measured values.

## 10. Continuous Learning Register (`#continuous-learning-log`) {#continuous-learning-log}

### TURN-L01 — 2026-10-18 · Branch assessment (PR `#1`, PR `#8`), discipline adoption, Pipeline Rev-2 ideation
- **Context & Trigger:** User request: assess PR branches 1 and 8 in two separate working directories, examine their intent, adopt the GREENFIELD/CLAUDE discipline into this repo, read all FDS documents, and ideate a revised pipeline for photographic running sprites addressing the issues both branches encountered.
- **Evidence & Provenance:** Fetched `refs/pull/{1,8}/head`; worktrees `/home/user/review-pr1` @ `936f37c` and `/home/user/review-pr8` @ `04d5caf` (detached, outside the active checkout). Read: both `CLAUDE.md`/`CLAUDE-*.md`, `GREENFIELD.md`, `FDS_BUILDER.md`, both `docs/FDS.md` (incl. §8.4 catalogs, §11 audit workflow, §12 learning register), `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `docs/RECTIFICATION_PLAN.md`, `docs/VALIDATION.md`, `.claude/skills/audit-gait-cycle/SKILL.md`, PR bodies via `gh pr view`. Viewed: `incorrect running sprites.jpeg` (this repo root). Locally executed in each worktree: `npm ci` (exit 0), `npm test -- --run` (**47/47 passed each**), `npm run typecheck` (exit 0 each).
- **Learnings & Comparative Analysis:** (1) Both branches' residual cost is the *photographic part-supply chain*, not the animation math: ~10 stochastic plates/persona then deterministic reconciliation of inter-plate disagreement (orientation, stripes, lighting, stumps). (2) PR `#1` strengths: engine architecture (end-cap composites, 2-segment foot in raster+SVG, vectorizer), `IMG-ERR`/`PIPE-ERR` catalogs, mechanical discipline gate, better athletic ground-line (`-9..+2 px`). PR `#8` strengths: persona breadth, athletic rebuild, five-persona batch audit, tuning-spec propagation, honest open-issue ledger (`+6 px` penetration declared). (3) Both independently converged on single-master derivation (`side-profile-arm-extractor.ts`), deterministic plate surgery, tuning specs, and heavy audit loops ⇒ these should become the primary path, not the repair path. (4) Audit evidence in `/tmp` does not persist; pose regressions depend on per-turn vision ⇒ golden-frame regression needed. (5) Calibration embedded in extractor code forks per persona (`PIPE-ERR-04`; PR `#8` carries two athletic extractors) ⇒ calibration-as-data.
- **Decisions:** `Adopted` — GREENFIELD/CLAUDE discipline verbatim (`ADD-001`); dual-worktree assessment method (`ADD-002`); inheritance of error catalogs by reference (`ADD-003`); Pipeline Rev-2 design (`ADD-005`, `docs/PIPELINE_REV2.md`). `Deferred` — Rev-2 implementation phases P1–P4 pending user answers to `docs/PIPELINE_REV2.md` §7 Q1–Q4. `Rejected` — one-shot cycle-sheet generation, 3D-render pipeline (now), vector-as-source, patch-in-place (documented with rationale in `docs/PIPELINE_REV2.md` §8).
- **Executed Validation & Next Actions:** This branch: `npm test` (docs/code-invariant greenfield gate, see `docs/VALIDATION.md`). Next: user decision gate on Q1–Q4; then P1 (Part Contract suite + calibration schema).

## 11. Non-Functional Requirements (`#nfr-*`) {#nfr}

- `#nfr-determinism`: decomposition and baking are pure functions of (master bytes, calibration record, rig spec); identical inputs ⇒ identical part hashes (PC-12).
- `#nfr-cost`: ≤3 `generate_image` calls and ≤1 recalibration per new persona; measured per-persona cost dashboard in audit summaries.
- `#nfr-provenance`: 4-way provenance separation in every report (`CLAUDE-validation.md §8.1`); observed-vs-reviewed SHA distinction for sibling branches.
- `#nfr-persistence`: audit evidence that gates merges (golden sheets, telemetry) is committed; scratch stays in `/tmp`.

## 12. Changelog {#changelog}

| Version | Date | Change |
|---|---|---|
| `1.0.0` | 2026-10-18 | Initial FDS for this branch: objects/relationships/surfaces/features for Pipeline Rev-2; inherited catalogs by reference; prompt log opened empty; TURN-L01 recorded. |

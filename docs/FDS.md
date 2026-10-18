# Functional Design Specification — Revised Photographic Sprite Pipeline Branch

- **Repository:** `wshyang/super-duper-funicular`
- **Active Branch:** `arena/62955c1e-super-duper-funicular`
- **FDS Version:** `1.0.0`
- **Construction Guide:** [`FDS_BUILDER.md`](../FDS_BUILDER.md) (upstream `wshyang/greenfield` @ `8ba7402`)
- **Companion Documents:** [`docs/SPEC.md`](./SPEC.md), [`docs/ADDENDA.md`](./ADDENDA.md), [`docs/PIPELINE_REVISION_PROPOSAL.md`](./PIPELINE_REVISION_PROPOSAL.md) (`#revised-pipeline`), [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./BRANCH_ASSESSMENT_PR1_PR8.md) (`#branch-assessment`), [`docs/VALIDATION.md`](./VALIDATION.md)

## Table of Contents

1. [Executive Summary](#exec-summary)
2. [Phase Scope Summary](#phase-scope)
3. [Core Objects (`#obj-*`)](#core-objects)
4. [Central Relationship Map](#relationship-map)
5. [Surface Inventory (`#surf-*`)](#surface-inventory)
6. [Features (`#feat-*`)](#features)
7. [User Flows](#user-flows)
8. [Engineering Thought Process & Adopted Constraint Catalogues](#thought-process)
9. [Image Generation Prompt & Regeneration Justification Audit Log (`#image-prompt-log`)](#image-prompt-log)
10. [Continuous Turn-by-Turn Learning Register (`#continuous-learning-log`)](#continuous-learning-log)
11. [Day-Zero Bootstrap (`R4`)](#day-zero-bootstrap)
12. [Non-Functional Requirements (`#nfr-*`)](#nfr)
13. [Changelog](#changelog)

---

## 1. Executive Summary {#exec-summary}

This branch assesses the two live photographic-sprite experiments (PR `#1` `arena/917ef347`, PR `#8` `arena/e1300d3c`), adopts the harmonised GREENFIELD/CLAUDE discipline into the repository, and authors the **revised photographic sprite pipeline of record** (`docs/PIPELINE_REVISION_PROPOSAL.md`, `#revised-pipeline`) that addresses the eight failure families (`F1..F8`) both branches encountered: diffusion constraint violations on isolated anatomy, cross-plate incoherence, reference-image silhouette lock, hand-tuned pixel-window repairs, garments spanning rotating parts, baked-in lighting warped in 2D, validation metrics that do not correlate with perception, and documentation/parity overhead.

The revision inverts the current design: diffusion generates only **whole-body** plates (one character lock + a 3–5 pose atlas under one camera/light rig), and all geometry — part boundaries, pivots, garment ownership, widths, proportions — is derived deterministically from a versioned calibration dataset with perceptual gates and committed evidence.

## 2. Phase Scope Summary {#phase-scope}

| Phase | Scope | Status |
|---|---|---|
| `P0` | Branch assessment (`#branch-assessment`), discipline adoption, design of record | **Complete this turn** (`ADD-001`..`ADD-005`) |
| `P1` | Sprint 1: ground-truth decomposition harness + calibration schema | Not started |
| `P2` | Sprint 2: relight/MVP normalisation + metric baselines on PR `#1`/PR `#8` assets | Not started |
| `P3` | Sprint 3: one persona end-to-end inside the 8-call generation budget | Not started |
| `P4` | Sprint 4: motion realism, SVG parity, CI evidence packs | Not started |

## 3. Core Objects (`#obj-*`) {#core-objects}

### 3.1 `#obj-image-asset` — Filed Image Asset (`P0-Core`)
A byte-addressable source plate under `src/images/` with a `src/images/manifest.json` entry (`path`, `role`, `sha256`, `filedIn`, `provenance`). Invariant: an asset never enters the pipeline unfiled; a filed asset's hash never drifts silently (gate-enforced).

### 3.2 `#obj-atlas-pose` — Atlas Pose Plate (`P1-Core`, `PIPE-REV Stage 1`)
A whole-body generation of one locked character in a prescribed running pose (`A1..A4`), on `#FF00FF`, with an accept/reject record (coverage row, identity dHash, orientation check). States: `candidate` → `accepted` | `rejected(reason)`.

### 3.3 `#obj-calibration-dataset` — Calibration Dataset (`P1-Core`, `PIPE-REV Stage 2`)
`src/calibration/<personaId>/<poseId>.json`: 2D landmarks, per-part source bone vectors and angles, occlusion scores, measured limb widths, provenance fields (`placedBy`, `plateAsset`, `sha256`, `verifiedByPlate`). Invariant: no inline pixel rect in code (`P-R3`).

### 3.4 `#obj-articulated-part` — Canonical Articulated Part (`P1-Core`)
`160 × 160`-class RGBA cutout carrying `{ albedo, alpha, proximalPivot, distalPivot, restAngle, shadeParams, materialMask }`, rounded at pivots, material-owned (each texel owned by exactly one part, `P-R4`).

### 3.5 `#obj-articulated-pose` — 17-Part Articulated Runner Pose (`P1-Core`, retained)
The retained 17-element Z-ordered rig from PR `#1` `FDS §8.1.1` (far limbs 1–6, pelvis 7, neck 8, hair 9, torso 10, head 11, near limbs 12–17), solved by two-bone IK with contralateral phase and 2-segment plantar roll.

### 3.6 `#obj-evidence-pack` — Committed Evidence Pack (`P2-Core`, `P-R7`)
`docs/evidence/<run-id>/`: downscaled contact sheet, `audit-report.json`, `SHA256SUMS`; ≤ ~2 MB; required for any audit whose findings drive a decision.

## 4. Central Relationship Map {#relationship-map}

```
#obj-image-asset (master) ──locks──> #obj-atlas-pose (A1..A4)
        │                                    │
        │ measured proportions               │ landmarks + occlusion
        ▼                                    ▼
#obj-calibration-dataset ──derives──> #obj-articulated-part (×17, material-owned)
                                             │
                                             ▼
                                   #obj-articulated-pose (rig/IK/foot-roll)
                                             │
                          ┌──────────────────┼──────────────────┐
                          ▼                  ▼                  ▼
                 raster warp frames   stitched SVG frames   #obj-evidence-pack
```

## 5. Surface Inventory (`#surf-*`) {#surface-inventory}

| ID | Surface | Kind | Phase |
|---|---|---|---|
| `#surf-validate-cli` | `npm run validate` (`typecheck` + `test`) | CLI | `P0` (live) |
| `#surf-dump-cycle` | 16-phase audit dumper + perceptual metrics | CLI | `P2` (adopt & extend) |
| `#surf-workbench` | React workbench (components render, hooks decide) | Web | `P3` |
| `#surf-evidence` | committed evidence packs | Docs | `P2` |

## 6. Features (`#feat-*`) {#features}

### 6.1 `#feat-discipline-gate` — Mechanical GREENFIELD Gate (`P0-Core`)
`src/discipline/greenfield-gate.test.ts` enforces: discipline corpus + living docs present; `#image-prompt-log` / `#continuous-learning-log` anchors; sequential `ADD-NNN`; manifest SHA-256 integrity over real filed assets; ≤ 800 LOC files / ≤ 50 LOC functions; presentation-only JSX + `data-testid`; Dockerfile contract; inert SHIP-HATS activation.

### 6.2 `#feat-atlas-decomposition` — Atlas-Based Canonical Part Extraction (`P1-Core`)
Stage 3 of `#revised-pipeline`: min-occlusion source selection, isotropic similarity rotation about the proximal landmark, chroma matte, pivot caps with internal shaft blend, measured width normalisation.

### 6.3 `#feat-material-ownership` — Single-Ownership Garment/Skin Assignment (`P1-Core`)
Landmark-distance ownership of garment texels (shorts sleeve → thigh; sock collar split at ankle); global invariant test: union equals figure mask, pairwise intersections empty.

### 6.4 `#feat-relight` — Albedo/Shading Separation (`P2-Core`)
MVP histogram normalisation + cap gradient easing; full directional shade model with joint AO (`P-R5`).

### 6.5 `#feat-perceptual-gates` — Perceptual Audit Metrics (`P2-Core`)
`seamContrast`, `jointGapArea`, `jointOverlapArea`, `stripeDuplication`, `proportionError`, `groundContactDelta`, `strideDtw` alongside legacy island/spill/coverage telemetry (`#revised-pipeline §3.8`).

### 6.6 `#feat-motion-fit` — Reference-Fitted Gait Curves (`P4-Optional`)
Hip/knee/arm amplitude-phase curves fitted to tracked reference running data, validated by DTW (`#revised-pipeline §3.7`).

## 7. User Flows {#user-flows}

1. **`#flow-rebuild-persona`:** agent locks character (1 call) → generates atlas (3–5 calls, coverage-gated) → authors/verifies calibration → extracts 17 owned parts → relights → renders 16 phases → commits evidence pack + metrics. Every generation call appends to `#image-prompt-log` with verbatim prompt and accept/reject rationale.
2. **`#flow-audit-decision`:** run dumper → metrics vs baselines → if a finding drives a decision, commit `#obj-evidence-pack` and append `TURN-Lxx`.

## 8. Engineering Thought Process & Adopted Constraint Catalogues {#thought-process}

This branch inherits, by reference, the complete engineering thought process of PR `#1` `FDS §8` (17-element decomposition rationale, medial/lateral optical asymmetry, hanging-arm thumb paradox and the `90°` L-bend chirality lock, ten prompt care rules) and the distilled failure catalogues `IMG-ERR-01..16` / `PIPE-ERR-01..08` (PR `#1` `FDS §8.4`), the failed-experiments register (PR `#1` `PLAN.md §4`), and PR `#8`'s athletic-rebuild regression chain (`TURN-L18..L21`). They are restated as binding constraints in [`docs/PIPELINE_REVISION_PROPOSAL.md §7`](./PIPELINE_REVISION_PROPOSAL.md) and are gate-referenced (`IMG-ERR-01`, `PIPE-ERR-08` presence is asserted by `#feat-discipline-gate`).

**This branch's added thought process:** why whole-body prompting inverts `F1` (diffusion's prior contains complete running humans — the defective sheet on `main` is evidence — but not disembodied medial arms); why a pose atlas inverts `F2` (one character, one light rig); why material ownership inverts `F5` (duplicate stripes cannot exist if texels have exactly one owner); and why magic-number extraction inverts into a calibration dataset (`F4`).

## 9. Image Generation Prompt & Regeneration Justification Audit Log (`#image-prompt-log`) {#image-prompt-log}

No `generate_image` call has been made on this branch yet. The log opens below and every future call MUST append: call number, verbatim prompt, target `file_path`, reference `images`, accept/reject decision with rationale, and — for any regeneration of an already-logged `file_path` — a **Regeneration Justification** preserving all prior entries (`CLAUDE.md` Rule 2).

| Call | Date | Target `file_path` | Reference `images` | Verbatim Prompt | Decision & Rationale |
|---|---|---|---|---|---|
| — | — | — | — | *(empty — Sprint 3 opens the log)* | — |

## 10. Continuous Turn-by-Turn Learning Register (`#continuous-learning-log`) {#continuous-learning-log}

| Turn ID & Date | Context & Trigger | Concrete Evidence & Provenance | Technical Learnings & Cross-Branch Comparisons | Adopted / Rectified / Deferred / Rejected | Executed Validation & Next Actions |
|---|---|---|---|---|---|
| **`TURN-L01`** (`2026-10-18`) | User asked to assess PR `#1` and PR `#8` in separate working directories and examine their intent. | Fetched `refs/pull/1/head` → `/home/user/workdirs/pr1` @ `936f37ce07f18e38fc4f5b3880c80029ec9f55cf`; `refs/pull/8/head` → `/home/user/workdirs/pr8` @ `04d5caf432ff81be0307a3ec79e894da1b60045c`; `gh pr view 1/8`; `diff -rq` = 279 differing paths (~235 binary). | The branches are two experiments on one converged design: PR `#1` = engine + forensics + SVG; PR `#8` = athletic asset rebuild + 5-persona audit. Divergence is concentrated in athletic extraction and ledgers. | Adopted: assessment recorded in `docs/BRANCH_ASSESSMENT_PR1_PR8.md`. | `git ls-remote`, `gh pr view`, `diff -rq` executed locally. Next: read all FDS documents. |
| **`TURN-L02`** (`2026-10-18`) | Read all FDS documents of both branches to learn the background and the encountered issues. | PR `#1` `docs/FDS.md` (1097 lines, v5.1.0: `§8` thought process, `§8.4` `IMG-ERR-01..16`/`PIPE-ERR-01..08`, `§9` 72-call prompt log, `§10` SVG math, `§11` audit workflow, `§12` learning register), `docs/ADDENDA.md` (`ADD-001..041`), `PLAN.md`, `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `docs/VALIDATION.md`, `docs/SPEC.md`; PR `#8` `docs/FDS.md` (`TURN-L12..L21`), `docs/VALIDATION.md`, `docs/ADDENDA.md` (`ADD-001..039`); `GREENFIELD.md`, `FDS_BUILDER.md`, `CLAUDE*.md` of both. | Eight failure families synthesised (`F1..F8`, `BRANCH_ASSESSMENT §1.2`/`PROPOSAL §1.2`): the stochastic generator is over-constrained per isolated part and under-constrained across plates; deterministic repair magic-numbers are where new defects are born; telemetry passes while users still see seams. PR `#8`'s four-turn bust/collarbone regression chain is the cleanest proof. | Adopted: inversion principle (`#revised-pipeline §1.3`). Rejected: retrying any `§7` dead end as-is. | No new code. Next: discipline adoption. |
| **`TURN-L03`** (`2026-10-18`) | User instructed: adopt the GREENFIELD + CLAUDE discipline into this repository. | Copied verbatim from PR `#1` @ `936f37c`: `GREENFIELD.md`, `FDS_BUILDER.md`, `docs/greenfield/GREENFIELD.md`, `CLAUDE.md` (re-authored bindings), `CLAUDE-{checklist,conventions,database,decisions,deployment,function-design,testing,validation}.md`, `.claude/skills/audit-gait-cycle/SKILL.md`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, Dockerfile triplet, `.dockerignore`, inert `*.shiphats` set + `activate-shiphats.sh`, `dev.sh`, `.env.example/.env.test`; adapted `src/discipline/greenfield-gate.test.ts`; filed the defective sheet per `ADD-002`. | The discipline corpus is byte-identical between PR `#1` and PR `#8` except branch bindings, so a single adoption serves both lineages. Its mechanical gate is the enforcement surface; ledger-heavy rules (N-way parity) were scoped down to reference-branch observation for this branch's mission. | Adopted: full corpus + gate. Deferred: pipeline scripts/deps until Sprint 1. | `npm install`, `npm run validate` executed (see `docs/VALIDATION.md`). Next: design of record. |
| **`TURN-L04`** (`2026-10-18`) | User asked for ideation on a revised pipeline addressing the issues encountered by PR `#1` and PR `#8`. | Personally viewed: `main` defective sheet; PR `#1` `frame-01/04/05` (photoreal athletic), `01-master-lateral-profile-reference.png`, `parts/torso.png`; PR `#8` `frame-01`. Read: both extractors, cutter, rig, dumper, gate. | Visual confirmation of `F7`: PR `#1` frames pass all telemetry yet show walk-like mid-stance scissoring and scale-mismatched shoes; PR `#8`'s rebuilt athletic shows collar spike + low oversized shoe (matching its own `+6 px` report). Hence the proposal's whole-body atlas inversion, material ownership, relight split, and perceptual gates. | Adopted: `docs/PIPELINE_REVISION_PROPOSAL.md` v1.0.0 as design of record (`ADD-003`). Deferred to user: `§9` open questions (3D endgame, identity tolerance, frame targets, motion licence, sibling-branch freeze). | `npm run validate` green. Next: user review of open questions, then Sprint 1. |

## 11. Day-Zero Bootstrap (`R4`) {#day-zero-bootstrap}

Skeleton-first: discipline corpus, living docs (`FDS`, `SPEC`, `ADDENDA`, `VALIDATION`), design of record, mechanical gate, filed reference asset, and empty-but-structured prompt log are all present at `P0` so no later turn can ship code without a spec anchor (`FDS_BUILDER.md §4.2`).

## 12. Non-Functional Requirements (`#nfr-*`) {#nfr}

| ID | NFR | Quantitative Target |
|---|---|---|
| `#nfr-gen-budget` | Stochastic generation budget per persona rebuild (`P-R8`) | ≤ 8 calls; overruns need logged Regeneration Justification |
| `#nfr-determinism` | Pipeline determinism given filed assets + calibration | byte-identical outputs across runs (hash-gated) |
| `#nfr-purity` | Pure-TypeScript RGBA pipeline, no Python/native lock-in | 0 non-TS build deps in `src/pipeline` |
| `#nfr-evidence` | Decision-driving audits leave committed evidence | 100% of decision audits have `#obj-evidence-pack` |
| `#nfr-doc-size` | Documentation remains navigable | `docs/FDS.md` ≤ 60 KB; prompt log moves to JSONL beyond 20 calls |

## 13. Changelog {#changelog}

| Version | Date | Addendum | Change |
|---|---|---|---|
| `1.0.0` | `2026-10-18` | `ADD-001`..`ADD-005` | Day-zero bootstrap: discipline adoption, branch assessment, revised pipeline design of record, learning register opened |

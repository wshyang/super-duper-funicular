# Functional Design Specification — Revised Photographic Sprite Pipeline Branch

- **Repository:** `wshyang/super-duper-funicular`
- **Active Branch:** `arena/62955c1e-super-duper-funicular`
- **FDS Version:** `1.1.0`
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
| `P3` | Sprint 3: one persona end-to-end inside the 8-call generation budget (Route A) | Not started |
| `P3B` | Sprint 3B: Route B textured-mesh persona on the pure-TS renderer (`#route-3d`); renderer PoC **already executed** (`docs/evidence/poc-software-render/`) | PoC complete; mesh/UV/bake not started |
| `P4` | Sprint 4: A/B decision gate, motion realism, CI evidence packs | Not started |

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

### 3.6 `#obj-textured-mesh` — Fixed-Topology Textured Body Mesh (`P3B-Core`, `#route-3d`)
Template humanoid mesh (~10–20 k tris) with canonical 17-joint skeleton, authored skin weights, deterministic UV atlas (charts cut along garment seams), and material slots (singlet/shorts/socks/shoes/skin). Per-persona instance = bone-scale vector + baked texture; topology and UV never vary per persona.

### 3.7 `#obj-skin-texture` — Baked Skin (Albedo + AO + Optional Normal) (`P3B-Core`)
UV-space albedo produced by visibility-weighted multi-view bake from the T2 plates, hole-masked UV inpaint completion (AI touches only the code-computed mask), delighted by per-material gradient division; AO baked from mesh; procedural material normals. Provenance: per-texel source view recorded in the run report.

### 3.8 `#obj-evidence-pack` — Committed Evidence Pack (`P2-Core`, `P-R7`)
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

### 6.6 `#feat-multiview-skin` — Multi-View Plate Generation & Masked UV Completion (`P3B-Core`)
T0/T2 generation under identity gates (head-crop dHash, palette ΔE, garment-boundary positions) and T3 masked inpaint limited to the visibility hole mask (`PROPOSAL §11.3–11.6`).

### 6.7 `#feat-uv-bake` — Visibility-Weighted Projection Bake (`P3B-Core`)
Deterministic texel colouring from orthographic views with depth-tested visibility weights; hole mask emission; chart-border easing (`PROPOSAL §11.4`).

### 6.8 `#feat-software-renderer` — Pure-TS Orthographic Skinned Renderer (`P3B-Core`)
Z-buffered UV-sampled linear-blend-skinning rasteriser, byte-identical output; PoC proven at 1.7–19.6 ms/frame with single-component silhouettes (`docs/evidence/poc-software-render/`).

### 6.9 `#feat-motion-fit` — Reference-Fitted Gait Curves (`P4-Optional`)
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
| #01 | 2026-10-18 | `src/images/photoreal-female-masters/01-master-lateral-profile-reference.png` | *(none — text-to-image)* | "Full-body photographic side profile (exact lateral view, camera at hip height) of a 48-year-old Singaporean Chinese female masters sprinter, athletic build, salt-and-pepper grey-black hair in a tight ponytail, wearing a teal-and-white running singlet, black three-quarter capri tights, teal-striped white socks and white running shoes with teal stripes. She stands upright in a neutral A-pose: feet together flat on the ground, legs straight, arms hanging slightly away from the torso (about 15 degrees abduction) with closed loose fists, clear magenta background gap visible between arm and torso. Seamless solid magenta (#FF00FF) studio background, even flat lighting, no shadows on the background, sharp focus, photorealistic, entire body visible head to toe with margin." | ACCEPT (Stage 0 gate): identity/garment palette exact, true lateral, clean magenta key; full body in frame. Deviation logged L-S0-1: arm-torso magenta gap NOT honored (arm rests on torso) - resolved by nearest-bone-axis ownership in Stage 3 instead of burning a retry. |
| #02 | 2026-10-18 | `src/images/photoreal-female-masters/02-atlas-A1-contact-right.png` | `['src/images/photoreal-female-masters/01-master-lateral-profile-reference.png']` | "Using the reference image of the same woman (identical face, hair, singlet, capri tights, socks, shoes), regenerate her in running gait pose A1 RIGHT-LEG CONTACT: near (right) leg vertical, foot flat on the ground directly under the hip; far (left) leg extended forward with heel striking the ground, knee nearly straight; near arm bent ~90 degrees swinging forward with closed loose fist at chest height; far arm bent ~90 degrees swinging back with closed loose fist behind the hip; torso upright with slight forward lean, head facing forward. Same seamless solid magenta (#FF00FF) background, same even flat lighting, photorealistic, full body in frame." | ACCEPT (Stage 1): both feet/arms readable, fists closed, palette identical. Deviations L-S1-1 (support leg slightly behind hip, tolerated). Became source for far leg, far arm, both hands (closed fists). |
| #03 | 2026-10-18 | `src/images/photoreal-female-masters/03-atlas-A2-flight-pass.png` | `['src/images/photoreal-female-masters/01-master-lateral-profile-reference.png']` | "Using the reference image of the same woman (identical face, hair, singlet, capri tights, socks, shoes), regenerate her in running gait pose A2 MID-FLIGHT PASS: BOTH feet airborne off the ground; near (right) leg folded forward with thigh horizontal and shin hanging, foot dorsiflexed; far (left) leg trailing behind with knee extending; near arm swinging back with closed loose fist behind the lumbar; far arm swinging forward with closed loose fist at chest height; slight forward torso lean, head facing forward. Same seamless solid magenta (#FF00FF) background, same even flat lighting, photorealistic, full body in frame." | ACCEPT (Stage 1): both feet verifiably airborne, near-leg fold clean. Deviation L-S1-2 (trailing knee more bent than prescribed, tolerated). Became source for near thigh/shin/foot. |
| #04 | 2026-10-18 | `src/images/photoreal-female-masters/04-atlas-A3-recovery-high.png` | `['src/images/photoreal-female-masters/01-master-lateral-profile-reference.png']` | "Using the reference image of the same woman (identical face, hair, singlet, capri tights, socks, shoes), regenerate her in running gait pose A3 HIGH RECOVERY: near (right) knee driven up high in front, shin tucked, foot off the ground; far (left) leg in deep heel-kick behind with knee bent and heel raised toward the glutes; near arm swung fully back so the closed loose fist is clearly visible behind the lumbar spine, separated from the torso by background; far arm forward with closed loose fist; torso upright, head facing forward. Same seamless solid magenta (#FF00FF) background, same even flat lighting, photorealistic, full body in frame." | ACCEPT (Stage 1) with defect L-S1-3: hands rendered OPEN/FLAT despite fist clause (register candidate IMG-ERR-17) -> both hands re-sourced from A1; A3 used only for nearUpperArm (arm fully clear of torso = best ownership source). Atlas complete at 4/8 call budget. |

*Provenance note: calls #01-#04 were transcribed into this ledger at commit time from the generating turn's tool log; prompts are reproduced as issued (persona lock, pose prescription, magenta-key and lighting clauses).*

## 10. Continuous Turn-by-Turn Learning Register (`#continuous-learning-log`) {#continuous-learning-log}

| Turn ID & Date | Context & Trigger | Concrete Evidence & Provenance | Technical Learnings & Cross-Branch Comparisons | Adopted / Rectified / Deferred / Rejected | Executed Validation & Next Actions |
|---|---|---|---|---|---|
| **`TURN-L01`** (`2026-10-18`) | User asked to assess PR `#1` and PR `#8` in separate working directories and examine their intent. | Fetched `refs/pull/1/head` → `/home/user/workdirs/pr1` @ `936f37ce07f18e38fc4f5b3880c80029ec9f55cf`; `refs/pull/8/head` → `/home/user/workdirs/pr8` @ `04d5caf432ff81be0307a3ec79e894da1b60045c`; `gh pr view 1/8`; `diff -rq` = 279 differing paths (~235 binary). | The branches are two experiments on one converged design: PR `#1` = engine + forensics + SVG; PR `#8` = athletic asset rebuild + 5-persona audit. Divergence is concentrated in athletic extraction and ledgers. | Adopted: assessment recorded in `docs/BRANCH_ASSESSMENT_PR1_PR8.md`. | `git ls-remote`, `gh pr view`, `diff -rq` executed locally. Next: read all FDS documents. |
| **`TURN-L02`** (`2026-10-18`) | Read all FDS documents of both branches to learn the background and the encountered issues. | PR `#1` `docs/FDS.md` (1097 lines, v5.1.0: `§8` thought process, `§8.4` `IMG-ERR-01..16`/`PIPE-ERR-01..08`, `§9` 72-call prompt log, `§10` SVG math, `§11` audit workflow, `§12` learning register), `docs/ADDENDA.md` (`ADD-001..041`), `PLAN.md`, `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `docs/VALIDATION.md`, `docs/SPEC.md`; PR `#8` `docs/FDS.md` (`TURN-L12..L21`), `docs/VALIDATION.md`, `docs/ADDENDA.md` (`ADD-001..039`); `GREENFIELD.md`, `FDS_BUILDER.md`, `CLAUDE*.md` of both. | Eight failure families synthesised (`F1..F8`, `BRANCH_ASSESSMENT §1.2`/`PROPOSAL §1.2`): the stochastic generator is over-constrained per isolated part and under-constrained across plates; deterministic repair magic-numbers are where new defects are born; telemetry passes while users still see seams. PR `#8`'s four-turn bust/collarbone regression chain is the cleanest proof. | Adopted: inversion principle (`#revised-pipeline §1.3`). Rejected: retrying any `§7` dead end as-is. | No new code. Next: discipline adoption. |
| **`TURN-L03`** (`2026-10-18`) | User instructed: adopt the GREENFIELD + CLAUDE discipline into this repository. | Copied verbatim from PR `#1` @ `936f37c`: `GREENFIELD.md`, `FDS_BUILDER.md`, `docs/greenfield/GREENFIELD.md`, `CLAUDE.md` (re-authored bindings), `CLAUDE-{checklist,conventions,database,decisions,deployment,function-design,testing,validation}.md`, `.claude/skills/audit-gait-cycle/SKILL.md`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, Dockerfile triplet, `.dockerignore`, inert `*.shiphats` set + `activate-shiphats.sh`, `dev.sh`, `.env.example/.env.test`; adapted `src/discipline/greenfield-gate.test.ts`; filed the defective sheet per `ADD-002`. | The discipline corpus is byte-identical between PR `#1` and PR `#8` except branch bindings, so a single adoption serves both lineages. Its mechanical gate is the enforcement surface; ledger-heavy rules (N-way parity) were scoped down to reference-branch observation for this branch's mission. | Adopted: full corpus + gate. Deferred: pipeline scripts/deps until Sprint 1. | `npm install`, `npm run validate` executed (see `docs/VALIDATION.md`). Next: design of record. |
| **`TURN-L05`** (`2026-10-18`) | User authorised evaluating the 3D route and required ideation of AI-assisted image-asset (3D skin) generation. | PoC executed locally: `src/render/{software-renderer,mesh-factory}.ts` + test; evidence pack `docs/evidence/poc-software-render/` (contact-8pose.png, poc-report.json, SHA256SUMS); 8/8 gates green incl. determinism hash and 1-component silhouette per pose. First PoC run failed its own coverage-spread assertion (folded legs legitimately overlap in projection) and a chain-translation sign bug split pose 1 into 2 components — both fixed and retained as learning: the joint-continuity gate is *connectivity*, not opaque-area stability. | Route B is feasible in-sandbox without native/GL deps; AI's safe role is whole-body plates + masked UV inpaint only (`#route-3d §11.3` AI-assist matrix); geometry/UV/bake/skin/render stay deterministic. Route A retained; A/B gate in Sprint 3/4 (`§11.12`). | Adopted: `PROPOSAL` v1.1.0 `§11`, `ADD-006`, new objects/features `#obj-textured-mesh`, `#obj-skin-texture`, `#feat-multiview-skin`, `#feat-uv-bake`, `#feat-software-renderer`. Deferred: SMPL-class body fitting, SVG-first-class question. | `npm run validate` (8/8). Next: user answers `§9` Q2–Q5; Sprint 1 harness. |
| **`TURN-L04`** (`2026-10-18`) | User asked for ideation on a revised pipeline addressing the issues encountered by PR `#1` and PR `#8`. | Personally viewed: `main` defective sheet; PR `#1` `frame-01/04/05` (photoreal athletic), `01-master-lateral-profile-reference.png`, `parts/torso.png`; PR `#8` `frame-01`. Read: both extractors, cutter, rig, dumper, gate. | Visual confirmation of `F7`: PR `#1` frames pass all telemetry yet show walk-like mid-stance scissoring and scale-mismatched shoes; PR `#8`'s rebuilt athletic shows collar spike + low oversized shoe (matching its own `+6 px` report). Hence the proposal's whole-body atlas inversion, material ownership, relight split, and perceptual gates. | Adopted: `docs/PIPELINE_REVISION_PROPOSAL.md` v1.0.0 as design of record (`ADD-003`). Deferred to user: `§9` open questions (3D endgame, identity tolerance, frame targets, motion licence, sibling-branch freeze). | `npm run validate` green. Next: user review of open questions, then Sprint 1. |
| **`TURN-L06`** (`2026-10-18`) | User asked for a live preview AND a worked example: ideate a new distinct Singapore Chinese female persona and walk the revised pipeline stage by stage, self-reviewing each stage. | New persona `photo-sg-chinese-female-masters` (~48yo masters sprinter, salt-pepper ponytail, teal/white singlet, BLACK capri tights, teal-striped socks) - distinct from athletic/average/petite. Stage 0: 1 master call ACCEPT with L-S0-1 (arm-torso gap clause ignored by generator). Stage 1: 3 atlas calls, all ACCEPT first-try (4/8 budget) with L-S1-1..3 (support leg behind hip; trailing knee over-bent; OPEN hands on A3 -> hands re-sourced from A1). Stage 2: calibration JSONs authored (agent multimodal estimates v1) + overlay debug plates. | Atlas-first generation validates P-R2 economically (4 calls vs PR #1's 72). Eyeball calibration is the weakest link: v1 landmarks off 20-40 px produced empty part windows (nearHand/farThigh) - calibration MUST be a reviewed, tool-supported stage, not a one-shot estimate. | Adopted: `ADD-007`, Stage 2.5 deterministic refiner, workbench overlay as correction UI. Deferred: outcome-based bone selection (`#feat-calib-select`). | 4 generate_image calls logged #01-#04; overlays personally viewed. Next: stages 3-6 execution. |
| **`TURN-L07`** (`2026-10-18`) | Continued TURN-L06: execute Stages 3-6 on the new persona and self-review rendered output. | Implemented + ran `src/pipeline/atlas/{image-io,extract-part,relight,refine-calibration}.ts`, `src/runner/mini-rig.ts`, `scripts/run-persona-pipeline.ts`. Self-review caught, in order: fragmented silhouettes (2-4 components/frame) -> measured half-widths (P-R6) + Stage 2.5 refiner -> 1-2 components; figure floating 32-44 px -> per-frame vertical registration; global-mean relight pinning skin at 0.85 clamp -> per-region targets; black capri blob at rear fist -> hand/foot compete axes; refiner mis-snaps on master (foot length 46 > shin 29, crumpled shoes) -> master keeps verified v1. GREENFIELD gate caught two real violations of my own code (75-line extractPart, 102-line main, derived expressions in JSX) - fixed by extraction into helpers + precomputed labels. | The discipline gate earns its keep on greenfield code, not just inherited code. Remaining quality gap vs PR #1 hand-tuned sprites is concentrated in calibration accuracy + hand/foot ownership, filed as DEF-M-01..05; architecture (atlas -> ownership -> relight -> rig -> gates -> evidence) executes end-to-end. | Adopted: learnings ledger `docs/evidence/masters-cycle-01/stage-learnings.json` (L-S0-1..L-S7-1). Deferred: ballistic flight, per-material relight, `#feat-calib-select` (Sprint 1-2). | `npm run persona:run` + personally viewed contact-16frame.png. Next: workbench + regression gates. |
| **`TURN-L08`** (`2026-10-18`) | Continued TURN-L06: ship the review surface + regression gates + docs for the worked example. | Workbench app `index.html` + `src/app/{main.tsx,App.tsx}`, `hooks/useStageManifest.ts`, `components/StagePanels.tsx` (presentation-only): plate+skeleton overlay (v1 vs refined), 17-part sheet with provenance, 16-frame cycle viewer with live gate metrics, learnings/defects ledger; vite `0.0.0.0:3000` with `/repo-assets/*` middleware serving plates/evidence straight from `src/images` and `docs/evidence` (no duplication in `public/`). Regression gates `src/pipeline/atlas/atlas-pipeline.test.ts` (17 parts, anatomical length order, connectivity/ground windows, SHA-256 evidence integrity, ledger presence). | Read-only manifest-driven UI keeps the workbench honest: it can only show what the pipeline actually filed. SHA-256 sums extended to plates + learnings so the evidence pack is self-verifying. | Adopted: `#surf-workbench` realised; VALIDATION rows added; README workbench section. | `npm run validate` 13/13 green; all preview routes HTTP 200. Next: A/B gate vs PR #1 sprites (Sprint 3). |

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
| `1.1.0` | `2026-10-18` | `ADD-006` | 3D route evaluated (`#route-3d`): AI-assist matrix for skin generation, multi-view bake + masked UV inpaint, pure-TS renderer PoC with committed evidence, Sprint-3 A/B decision gate |

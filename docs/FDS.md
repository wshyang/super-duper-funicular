# Functional Design Specification — Keyframe-Anchored Photographic Sprite Pipeline (P2/KAPP)

- **Document Version:** 1.2.0
- **Date:** 2026-10-18
- **Status:** Active Canonical Specification for branch `arena/7f9c98b1-super-duper-funicular`
- **Meta Discipline:** `FDS_BUILDER.md` v2.0 & `GREENFIELD.md` (verbatim upstream copies, `wshyang/greenfield` @ `8ba7402`)
- **Background (inherited by reference):** PR `#1` FDS v5.1.0 (`/home/user/pr1-review/docs/FDS.md`) and PR `#8` FDS v4.10.0 (`/home/user/pr8-review/docs/FDS.md`) — 17-part biomechanics, flaw analysis of the reference sheet, and the `IMG-ERR-01..16` / `PIPE-ERR-01..08` failure catalogs, all carried forward as pre-loaded counters.
- **Evidence Base:** [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./BRANCH_ASSESSMENT_PR1_PR8.md)
- **Design Proposal:** [`docs/PIPELINE_PROPOSAL.md`](./PIPELINE_PROPOSAL.md)
- **Tag Conventions:** `#obj-*` (Core Objects), `#feat-*` (Features), `#surf-*` (Surfaces), `#nfr-*` (Non-Functional Requirements), `[P2]` (P2-specific), `[INHERITED]` (adopted from watched branches)

---

## Table of Contents

1. [Executive Summary](#exec-summary)
2. [Phase Scope](#phase-scope)
3. [Core Objects (`#obj-*`)](#core-objects)
4. [Central Relationship Map](#relationship-map)
5. [Surface Inventory (`#surf-*`)](#surface-inventory)
6. [Features (`#feat-*`)](#features)
7. [Engineering Doctrine & Thought Process](#doctrine)
8. [Image Generation Prompt & Regeneration Audit Log (`#image-prompt-log`)](#image-prompt-log)
9. [Continuous Turn-by-Turn Learning Register (`#continuous-learning-log`)](#continuous-learning-log)
10. [Non-Functional Requirements (`#nfr-*`)](#nfr)
11. [Changelog](#changelog)

---

## 1. Executive Summary {#exec-summary}

1. **Purpose:** Specify the revised pipeline that generates photographic sprite elements for running animations by **anchoring photography at canonical gait keyframes** and treating the inherited 17-part biomechanical rig as a **conformance oracle**, replacing the per-frame re-warping of single-pose plates that produced texture destruction, tone seams, joint gaps, and melted shoes on PR `#1`/`#8`.
2. **Primary Actors:** Game/Animation Engineer (`role:engineer`) and Interactive Web Viewer (`role:viewer`).
3. **Core Capabilities:**
   - Persona bibles holding measured proportions, wardrobe tokens, and acquisition ledgers as the single calibration source.
   - Identity-locked keyframe plate acquisition (8–12 full-body plates per persona at canonical φk) under the verbatim prompt-log discipline.
   - A biomech conformance gate that scores every plate's silhouette, per-limb angles, foot phase, and pose distinctness against the IK/gait solver before acceptance.
   - Bounded differential in-betweening + cross-fade, keyframe-carried foot roll, measured ground lock.
   - A continuous audit harness (16-phase dumps + display-resolution strips + texture/tone/identity metrics) with the telemetry-never-replaces-vision rule.

## 2. Phase Scope {#phase-scope}

| Phase Tag | Scope | Surfaces & Features |
|---|---|---|
| `P2.0-Audit` | Display-resolution + metric audit upgrade; baseline measurement on PR1/PR8 assets | `#feat-audit-harness`, `#surf-cli-audit` |
| `P2.1-Pilot` | One persona end-to-end: bible, 8 keys acquired + conformed, 16-phase composition | `#obj-persona-bible`, `#feat-plate-acquisition`, `#feat-conformance`, `#feat-inbetween`, `#feat-ground-lock`, `#feat-assembly` |
| `P2.2-Full` | All personas, 6-colour variant export, per-frame SVG tier, web workbench integration | `#feat-assembly`, `#surf-ui-*`, `#obj-frame-atlas` (optional) |

## 3. Core Objects (`#obj-*`) {#core-objects}

### 3.1 `#obj-persona-bible` — Persona Calibration Record `[P2]`
| Attribute | Type | Constraints | Validation Rule |
|---|---|---|---|
| `personaId` | `string` | Required, unique | kebab-case id, e.g. `photo-sg-chinese-female` |
| `masterPlatePath` | `string` | Required | resolves under `src/images/`, `.png`/`.jpeg` |
| `measuredProportions` | `record` | Required | bone lengths & widths as measured fractions of standing height, each with `sourcePlatePath` + `measuredAt` provenance |
| `wardrobeTokens` | `string[]` | Required, non-empty | verbatim token block repeated in every acquisition prompt |
| `rigSpec` | `object` | Required | 17-part bone lengths derived from `measuredProportions` (never hand-tuned pixel constants) |
| `acquisitionLedger` | `entry[]` | Required | one entry per canonical φk: status (`pending`/`acquired`/`conformed`/`rejected`), plate path, prompt-log call id, conformance report id |
- **States:** `pending → acquired → conformed` per key; `rejected` keys return to `pending` with a regeneration justification.
- **Edge & Failure Modes:** missing master plate blocks acquisition; a rejected key never silently degrades to a substitute phase (all-or-nothing per persona bank).

### 3.2 `#obj-keyframe-plate` — Canonical Gait Photograph `[P2]`
| Attribute | Type | Constraints | Validation Rule |
|---|---|---|---|
| `platePath` | `string` | Required | `src/images/photoreal-<persona>/key-<NN>-phi-<KKK>.png` |
| `canonicalPhase` | `number [0,1)` | Required | matches the gait solver's canonical key set |
| `pixelSha256` / `dHash64` | `string` | Required | computed by the shared hashing module |
| `silhouetteMaskPath` | `string` | Required | magenta-keyed alpha mask, reusing `[INHERITED]` chroma-key module |
| `measuredSoleBaselineY` | `number` | Required | measured once at conformance; source of ground lock |
| `conformanceReportId` | `FK` | Required | references `#obj-conformance-report`; plate is usable only if the report passed |

### 3.3 `#obj-conformance-report` — Rig-vs-Plate Judgement `[P2]`
| Attribute | Type | Constraints | Validation Rule |
|---|---|---|---|
| `platePath` | `FK` | Required | — |
| `silhouetteIoU` | `number` | Required | vs the rig-rendered reference pose at φk; ≥ per-persona threshold |
| `perLimbAngleDeltas` | `record` | Required | every driven limb within the solver's angle window at φk |
| `footPhaseClass` | `enum` | Required | `contact`/`midstance`/`heel-off`/`toe-off`/`flight` must match φk's expected class |
| `poseDistinctness` | `number` | Required | min pairwise IoU + dHash distance vs **other accepted keys** (prevents half-cycle duplication — the flawed-sheet failure) |
| `passed` | `boolean` | Required | all of the above within thresholds |

### 3.4 `#obj-frame-composite` — Rendered Output Frame `[P2]`
| Attribute | Type | Constraints | Validation Rule |
|---|---|---|---|
| `phase` | `number [0,1)` | Required | normalized |
| `baseKey` / `blendKey` | `FK?` | Required/optional | bracketing keyframes; `blendKey` null on exact keys |
| `blendWeight` | `number [0,1]` | Required when `blendKey` set | phase-distance weight |
| `differentialWarp` | `spec?` | Optional | bounded: per-limb rotation ≤ half key spacing |
| `groundLineDeltaPx` | `number` | Required | within −9…+2; ≤ 2 px on support frames |
| `exportPaths` | `string[]` | Required | PNG sheet/sequence, optional per-frame SVG |

### 3.5 `#obj-frame-atlas` — In-Frame Part Cutout Set `[P2]` (optional, P2.2)
Per-keyframe part cutouts **with overlap keeps** (shared pixels across each joint). Parts never cross keyframes. Used for micro-adjustment and the rig inspector only — never for cross-frame reassembly.

## 4. Central Relationship Map {#relationship-map}

| Object A | Cardinality | Object B | Relationship |
|---|---|---|---|
| `#obj-persona-bible` | `1 : 8..12` | `#obj-keyframe-plate` | `acquires` (via acquisition ledger) |
| `#obj-keyframe-plate` | `1 : 1` | `#obj-conformance-report` | `is-judged-by` |
| `#obj-keyframe-plate` | `2 : N` | `#obj-frame-composite` | `anchors` (base/blend) |
| `#obj-keyframe-plate` | `0..1 : 17` | `#obj-frame-atlas` | `cuts-with-overlap-keeps` |

## 5. Surface Inventory (`#surf-*`) {#surface-inventory}

| # | Surface | Anchor | Roles | Phase |
|---|---|---|---|---|
| 1 | CLI Persona Bible manager (`npm run persona:bible`) | `#surf-cli-bible` | `role:engineer` | `P2.1-Pilot` |
| 2 | CLI Keyframe acquisition ledger runner (`npm run acquire-keyframes`) | `#surf-cli-acquire` | `role:engineer` | `P2.1-Pilot` |
| 3 | CLI Conformance scorer (`npm run conform`) | `#surf-cli-conform` | `role:engineer` | `P2.1-Pilot` |
| 4 | CLI Frame assembly & sheet export (`npm run compose`) | `#surf-cli-compose` | `role:engineer` | `P2.1-Pilot` |
| 5 | CLI Extended audit dump (`npm run dump-cycle` successor) | `#surf-cli-audit` | `role:engineer` | `P2.0-Audit` |
| 6 | Web workbench: keyframe browser + conformance inspector + playback strip | `#surf-ui-workbench` | `role:viewer` | `P2.2-Full` |

*Parity rule `[INHERITED]`:* every model operation maps 1:1 to a CLI or Web surface; no orphan capabilities.

## 6. Features (`#feat-*`) {#features}

### 6.1 `#feat-plate-acquisition` — Identity-Locked Keyframe Generation `[P2]`
- **Given** a conformed persona bible and a pending φk, **when** `acquire-keyframes` runs within the per-turn call budget, **then** exactly one full-body plate is generated via master-anchored pose-transfer prompting (persona token block verbatim, strict 90° profile rules `[INHERITED from IMG-ERR catalog]`), keyed, inventoried (hashes), logged verbatim in `#image-prompt-log`, and the ledger advanced to `acquired`.

### 6.2 `#feat-conformance` — Rig-as-Oracle Gate `[P2]`
- **Given** an acquired plate, **when** `conform` runs, **then** the silhouette is keyed, the rig pose is fitted, and `#obj-conformance-report` records silhouette IoU, per-limb angle deltas vs solver windows at φk, foot phase class, cross-key pose distinctness, and sole baseline; failure marks the key `rejected` with a machine-readable reason that feeds the next prompt delta.

### 6.3 `#feat-inbetween` — Bounded Differential In-Betweening `[P2]`
- **Given** an output phase between two conformed keys, **when** a frame is composed, **then** the nearer key is differentially warped (per-limb ≤ half key spacing) and cross-faded toward the bracketing key by phase distance; texture-coherence of the output is scored by `#feat-audit-harness`.

### 6.4 `#feat-ground-lock` — Measured Ground Contact `[P2]`
- **Given** plates with measured sole baselines, **when** stance frames compose, **then** the sole is pinned to the ground line (`groundLineDeltaPx` ≤ 2 px on support frames; flight frames ballistic per the gait solver).

### 6.5 `#feat-assembly` — Frame Composition & Export `[P2]`
- **Given** conformed keys, **when** `compose` runs, **then** 8 canonical frames + 16-phase audit strip + 6-colour variant sheets (garment tint at export `[INHERITED]`) + optional per-frame SVG traces are written, with every frame carrying a `#obj-frame-composite` record; export is all-or-nothing per persona bank.

### 6.6 `#feat-audit-harness` — Display-Resolution Audit `[P2]` (extends `[INHERITED]` dumper)
- **Given** any composed frame set, **when** the audit dump runs, **then** it emits the inherited 16-phase three-panel plates, contact sheet, joint crops, and standing profile **plus** `1×`/`2×`/`4×` display-resolution strips, texture-coherence, tone-seam, identity-drift, joint-plausibility, and `groundLineDeltaPx` per frame — and `audit-report.json` recording that telemetry was produced alongside a mandatory `read_file` visual inspection (never instead of it).

## 7. Engineering Doctrine & Thought Process {#doctrine}

Full argument in `docs/PIPELINE_PROPOSAL.md` (D1–D6, option space, risk register). Summary:
1. **D1 Baked-rendering doctrine:** photographs cannot be re-posed by 2-D warps without exactly the `TEX-ERR`/`TONE-ERR`/`JOIN-ERR`/`SHOE-ERR` defect classes measured on PR `#1`/`#8`; therefore photograph each canonical pose.
2. **D2 Rig-as-oracle:** the siblings' correct biomechanics become the acceptance gate for generated art, mechanically preventing the flawed-sheet failure modes (duplication, peg-leg, no crossover, jitter) in the new asset set.
3. **D3–D4:** keep each photograph's pixels together; warp only small deltas for in-betweening.
4. **D5–D6:** audit at ship resolution; derive every constant from the measured persona bible.
5. **Inheritance:** the failure catalogs `IMG-ERR-01..16` and `PIPE-ERR-01..08` (PR `#1` FDS §8.4) apply verbatim to KAPP prompting and cutting; the P2-specific classes `TEX-ERR`/`TONE-ERR`/`JOIN-ERR`/`SHOE-ERR`/`PEN-ERR`/`IDENT-ERR` are defined in `.claude/skills/audit-gait-cycle/SKILL.md` Step 3.

## 8. Image Generation Prompt & Regeneration Audit Log (`#image-prompt-log`) {#image-prompt-log}

Per `CLAUDE-decisions.md §2`. **Pass P2.0** (`2026-10-18`, 9 calls, persona `sg-chinese-female`): the **exact verbatim prompt text** for every call below is preserved in the committed canonical record [`scripts/acquisition/prompts.p2.0.json`](../scripts/acquisition/prompts.p2.0.json) (single source of truth, written before generation); the entries here log call id → target file, references, and the post-generation examination verdict per `CLAUDE-decisions.md §2`. Zero regenerations were required.

| Call | Target `file_path` | Reference `images` | Post-generation examination (`read_file`) verdict |
|---|---|---|---|
| `P2-2026-10-18-01` | `src/images/p2/sg-chinese-female/00-master.png` | none (text-to-image seed) | **Accepted.** Strict 90° right-facing profile, single subject, full figure with margins, wardrobe tokens correct (crimson singlet + white stripe, charcoal shorts, blue sweatbands, white/crimson shoes, ponytail + red tie), feminine athletic build, photographic. Recorded deviation: graded magenta cyclorama with floor plane + vignette instead of perfectly flat `#FF00FF`; accepted because flood-fill keying handles magenta gradients (verified at K2 with zero spill after the enclosed-pocket sweep). |
| `P2-2026-10-18-02` | `key-01-phi-000.png` | `00-master.png` | **Accepted.** Correct midfoot-strike / trailing-extension pose; identity holds; photographic. |
| `P2-2026-10-18-03` | `key-02-phi-125.png` | `00-master.png` | **Accepted** with telemetry: near hand drifted to open palm (closed-fist token not held); not a blocker at 1×; candidate for a future regeneration if hand close-ups matter. |
| `P2-2026-10-18-04` | `key-03-phi-250.png` | `00-master.png` | **Accepted.** Correct mid-stance/pass pose, deep knee drive. |
| `P2-2026-10-18-05` | `key-04-phi-375.png` | `00-master.png` | **Accepted.** Correct flight pose (both feet off ground). |
| `P2-2026-10-18-06` | `key-05-phi-500.png` | `00-master.png` | **Accepted.** Contralateral mirror of key-01 (left leg leads); identity holds. |
| `P2-2026-10-18-07` | `key-06-phi-625.png` | `00-master.png` | **Accepted.** Correct loading pose; slight scale drift corrected by per-key normalization. |
| `P2-2026-10-18-08` | `key-07-phi-750.png` | `00-master.png` | **Accepted.** Correct mid-stance/pass (left support); ponytail motion adds life. |
| `P2-2026-10-18-09` | `key-08-phi-875.png` | `00-master.png` | **Accepted.** Correct flight pose (right knee drive). |

**K2 conformance result:** 8/8 keys passed (height fraction 0.85–0.90 of plate, aspect in window, min cross-key dHash hamming 6–12 bits ⇒ zero pose duplication). **K6/K7 result:** 16-phase composition locked to the ground line (stance deltas −1..0 px; flight −28/−27 px on the lift curve); APNG emitted (16 fcTL, monotonic sequences, default-frame decode verified). **Post-fix visual audit:** magenta spill eliminated by the enclosed-pocket sweep; full headroom; `1×` contact sheet accepted. Known telemetry: cross-fade blends on the φ 0.375→0.500 and 0.875→0.000 spans read as double exposure at `1×` (fix path: spend spare keyframe slots on those phases, per proposal §8.1).

## 9. Continuous Turn-by-Turn Learning Register (`#continuous-learning-log`) {#continuous-learning-log}

| Turn | Context & Trigger | Evidence & Provenance | Learnings & Cross-Branch Comparison | Decisions | Executed Validation & Next Actions |
|---|---|---|---|---|---|
| **`TURN-L01`** (`2026-10-18`) | Charter: assess PR `#1` and PR `#8`, adopt the GREENFIELD/CLAUDE discipline, read the FDS corpus, ideate a revised photographic-sprite pipeline. | Pulled `origin/pr/1` @ `936f37c` → `/home/user/pr1-review` and `origin/pr/8` @ `04d5caf` → `/home/user/pr8-review` (detached worktrees; active branch untouched). Executed `npm ci --ignore-scripts` + `npm test -- --run` in **both** worktrees (PR1: 47/47, PR8: 47/47 — locally executed). Executed `npm run dump-cycle -- /tmp/audit-pr1 16 photo-sg-chinese-female red` and `…/tmp/audit-pr8 …`. Personally viewed via `read_file`: flawed source sheet; both 6-colour photoreal sheets; PR8 master + near-arm plates; PR8 torso cutout; both 16-phase contact sheets; PR8 joint crops + standing profile. Read both FDS docs, SPEC, flaw analysis, CLAUDE index + 8 section files, SKILL.md; verified both branches' `GREENFIELD.md` byte-identical to upstream `wshyang/greenfield@8ba7402` (SHA-256 `400d282e…`, upstream cloned to `/tmp/greenfield-upstream`). | Both branches share one skeleton (17-part rig, rounded-joint cutter, per-segment inverse-mapped warp) and both pass all numeric gates while their photographic output still shows: `TEX-ERR` (leg banding PR1; forearm melt + far-leg texture wipeout at deep flexion PR8), `TONE-ERR` (joint tone seams), `JOIN-ERR` (head/neck gap at flexed phases), `SHOE-ERR` (ghosting/duplication), `PEN-ERR` (≤ +6 px, their own audit). Root cause unified: **a photograph is a baked rendering; 2-D warps move pixels but cannot re-light or re-pose them**. Where no warp runs (PR8 standing profile) the composite reads convincingly — rotation is the stressor. PR1 contributes the deepest failure catalogs + prompt discipline; PR8 contributes the calibration/audit workbench + rebuild pipeline. | **Adopted:** full discipline suite (this repo's CLAUDE* files); rig-as-oracle inversion (`ADD-005`); keyframe-anchored architecture (`ADD-004`); overlap-keep cutting within frames (`ADD-006`); display-resolution audits (`ADD-007`); persona-bible single calibration source (`ADD-008`). **Deferred:** roto/video acquisition, albedo relight, vector-first rendering (`ADD-009`). **Rejected:** per-frame re-warping of single-pose plates as primary renderer; cross-plate rounded-cap joins as primary joint strategy. | Executed: `git fetch origin '+refs/pull/*/head:…'`, worktree adds, 2× `npm ci`, 2× `npm test` (47/47, 47/47), 2× `dump-cycle`, upstream clone + SHA check. **Not run (no stack on this branch yet):** typecheck/build here — validation layer honesty per `GREENFIELD §8`; pipeline gates were executed inside the worktrees, not this repo. **Next:** P2.0 audit upgrade (baseline metrics on both branches' assets), then P2.1 pilot on one persona. |
| **`TURN-L03`** (`2026-10-18`, *part-atlas extractor pivot: per-key rig fit, 15-part segmentation, lossless cutouts + manifests*) | User review of `a5b541c`: the composited full-frame animation "does not give me my desired result"; the per-pose photographic plates ARE endorsed as giving "a lot more possibilities to programmatically extract our articulating elements". | Built the extractor terminus: chamfer distance transform (`src/pipeline/distance-transform.ts`), 16-DOF rig + capsule rasteriser (`src/runner/rig.ts`, Drillis–Contini bone fractions), 15-part nearest-bone segmenter with joint overlap-keeps (`src/pipeline/segment-parts.ts`), staged fitter replaced by audited per-key pose table + alignment-only fitting (`src/runner/pose-table.ts`, `src/runner/fit-skeleton.ts`), extractor CLI `npm run extract-parts` writing `atlas/<key>/` with 15 part PNGs + `manifest.json` per key (pivot, distalTip, boneAxisRad, lengthPx, meanWidthPx, bbox, opaquePixelCount, reassembly metrics) plus 3 audit sheets (skeleton overlays, parts montage, reassembly proof with per-pixel diff column). | (1) **Lossless is a segmentation-coverage property, not a fit-quality property**: reassembly hit IoU 1.0 / α-mismatch 0 / ΔRGB 0 on all 8 keys once (a) masks were indexed against the 1-byte alpha plane (an RGBA bug silently dropped ~every pixel), (b) negative extremity labels were no longer skipped as unassigned (hands/feet vanished), and (c) bbox blits skipped transparent pixels (later parts' bboxes erased earlier parts). Each bug passed numeric checks until a dedicated count-the-pixels probe isolated it. (2) **Fit-capsule radius is part of the objective**: capsules 2× fatter than the limbs made overlap free and collapse optimal. (3) **2D limb pose is genuinely ambiguous from silhouette evidence alone** — arm-across-chest vs arm-inside-torso defeats ridge/width scoring; resolved by an audited per-key pose table (ADD-018) instead of pretending the optimiser can. (4) IoU numbers are not comparable across capsule widths; only the overlay sheet adjudicates fits. | **Adopted:** overlap-keeps coverage rule + lossless reassembly gate (ADD-017); pose-table + alignment-only fitting (ADD-018). **Rectified:** alpha-plane indexing bug, negative-label skip bug, transparent-blit erase bug, missing manifest write, foot-angle conversion sign. **Deferred:** semantic occlusion handling for far-limb parts; per-key hand/foot sub-part quality. **Rejected:** automated 16-DOF search from gait priors (3 documented generations). | Executed: `npx tsc --noEmit` (clean), `npm run extract-parts` (8/8 keys, fit IoU 0.76–0.86, reassembly IoU 1.00000 / 0% / 0.000 everywhere), `npm test` (**16/16**: 9 pipeline + 4 gate + 3 new atlas tests incl. disk-level lossless recomposition of all 8 shipped atlases). Personally viewed: skeleton-overlay sheet (all 8 poses tracked), parts montage (15×8 clean cutouts), reassembly-proof sheet (original/recomposed identical, diff column empty), key-01/key-02 plates vs overlays. **Next:** rig playback from manifests if user approves; occlusion-aware far-limb refinement; additional personas. |


## 10. Non-Functional Requirements (`#nfr-*`) {#nfr}

| ID | Requirement |
|---|---|
| `#nfr-pure-ts` | 100% pure-TypeScript RGBA pipeline (`jpeg-js`/`pngjs`); zero Python/native binaries `[INHERITED]` |
| `#nfr-determinism` | All pipeline CLIs deterministic given identical inputs + manifests; randomness only inside the external image tool, whose outputs are hashed and ledgered |
| `#nfr-prompt-budget` | ≤ 10 `generate_image` calls per turn; ledger-queued; never adopt un-audited batches `[INHERITED]` |
| `#nfr-all-or-nothing` | Asset banks load `idle`/`loaded`/`error` with explicit retry; exports gated on `loaded` `[INHERITED]` |
| `#nfr-audit-pairing` | Every numeric telemetry report ships with personally viewed visual inspection; neither replaces the other |
| `#nfr-provenance` | Every asset traceable to: verbatim prompt (log id) → plate (hash) → conformance report → frame composite record |
| `#nfr-magic-number-ban` | Pixel constants must derive from the persona bible or be named constants with measured provenance (`ADD-008`) |
| `#nfr-parity` | P2 must be implementable on top of either watched branch's codebase without discarding their verified components (`CLAUDE-decisions.md §4`) |

## 11. Changelog {#changelog}

| Version | Date | Change |
|---|---|---|
| `1.0.0` | `2026-10-18` | Seed FDS for the Keyframe-Anchored Photographic Pipeline (P2/KAPP): doctrine, option space, K0–K7 stages, objects/surfaces/features/NFRs; `TURN-L01` recorded; prompt log seeded empty (zero calls made on this branch). |
| `1.1.0` | `2026-10-18` | KAPP implemented end-to-end for the first persona: 9-call acquisition pass (master + 8 keyframes, all visually accepted), K2 conformance (8/8), K6 composition (16 phases, ground-locked), APNG + spritesheet + contact-sheet exports, pure-TS pipeline modules, discipline gate + real-asset tests (13/13), React playback workbench on `0.0.0.0:3000`. `TURN-L02` recorded; prompt log populated. |
| `1.2.0` | `2026-10-18` | Deliverable pivot per user review: pipeline terminus is now the per-key part-atlas extractor (15 articulated parts + joint-pivot manifests per key, lossless-reassembly proof, 3 audit sheets). Automated gait-prior fitting replaced by audited per-key pose table + alignment-only fitting after three documented failure generations. `TURN-L03` recorded; atlas tests bring the suite to 16/16. |

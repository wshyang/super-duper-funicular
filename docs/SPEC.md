# Harmonised N-Way Greenfield Studio — Canonical Functional Specification (`docs/SPEC.md`)

- **Canonical Partner Specification:** [`docs/FDS.md`](./FDS.md) (`v4.0.0`, full `FDS_BUILDER.md` v2.0 object/attribute/surface/relationship/BDD specification, 21-call verbatim image prompt audit log, and continuous per-turn learning register).
- **Decision Register:** [`docs/ADDENDA.md`](./ADDENDA.md) (`ADD-001`..`ADD-025`).
- **Live N-Way Branch Comparison Ledger:** [`docs/N_WAY_COMPARISON.md`](./N_WAY_COMPARISON.md) (and root [`N_WAY_COMPARISON.md`](../N_WAY_COMPARISON.md)).

---

## 1. Artwork Inventory & Deduplication (`#obj-image-asset`, `#feat-dedupe`)

Inventory all repository artwork and preserve canonical bytes under descriptive `src/images/**` filenames. Deduplicate by byte SHA-256, decoded RGBA pixel SHA-256, and 64-bit perceptual difference hash (`dHash64`). Write both `src/images/manifest.json`, `public/sprites/catalog.json`, and `docs/artwork-inventory.json` (`CROSS-16`) recording exact cryptographic digests, dimensions, and provenance for every source image asset. Similar animation phases in the flawed reference sheet are preserved as diagnostic evidence and never silently deleted.

## 2. Reproducible Chroma-Key Extraction & Flaw Diagnosis (`#obj-extracted-frame`, `#feat-extract`, `#feat-analyze`)

Execute deterministic 100% pure-TypeScript (`jpeg-js`, `pngjs`) chroma-key extraction:
- Automatically detect the `132 px` title/numeral header and `6 × 8` cell grid on the `2528 × 1696` reference sheet.
- Apply border-seeded flood-fill magenta removal with spill suppression so interior character highlights remain untouched.
- Register all 48 frames onto a fixed `220 × 256` RGBA canvas with pelvis-centroid origin alignment under `public/sprites/extracted/{variant}/frame-01..08.png`.
- Produce quantitative flaw telemetry (`public/sprites/extracted/analysis.json` & `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`) proving why the reference 8-frame sheet fails (`94.7%` half-cycle silhouette IoU, `0–4 bit` dHash, `+53 px` unilateral lead-leg lock, `147 px` minimum foot gap, and `20–25 px` scale/baseline jitter).

## 3. 17-Part Articulated Biomechanics, 2-Segment Foot Roll & Multi-Mode Locomotion (`#obj-articulated-pose`, `#feat-algorithmic-runner`)

### 3.1 17-Part Articulated Hierarchy & Cervical Neck
A deterministic normalized phase $\phi \in [0, 1)$ drives a 17-part side-view character rig (`head`, `hairAccessory`, `neck`, `torso`, `pelvis`, `nearUpperArm`, `nearForearm`, `nearHand`, `farUpperArm`, `farForearm`, `farHand`, `nearThigh`, `nearShin`, `nearFoot`, `farThigh`, `farShin`, `farFoot`). Left and right limbs operate in strict contralateral anti-phase ($\Delta\phi = 0.5$). Analytical 2-bone inverse kinematics (`src/runner/two-bone-ik.ts`) preserves exact segment lengths (`femur = 36 px`, `tibia = 34 px`, `upperArm = 26 px`, `forearm = 24 px`). An independent cervical neck column (`c7Collar -> headPivot`) absorbs vertical impact and counter-rotates against thoracic surge to stabilize the runner's gaze.

### 3.2 Two-Segment Plantar Foot Roll (`src/runner/foot-roll.ts`)
Each foot models a 2-segment plantar roll (`heelPoint -> ballPoint -> tipPoint`) progressing across four contact stages: `midfoot-strike` -> `sole-roll` -> `heel-off-roll` -> `toe-off` -> `swing-recovery`. Photorealistic shoes deform continuously across the metatarsophalangeal (MTP) ball hinge via piece-wise chord-tent warping (`warpPhotorealRollingShoe`), and SVG exports emit hinged `<g id="*-rearfoot">` / `<g id="*-forefoot">` vector groups.

### 3.3 Multi-Mode Locomotion Profiles (`run`, `walk`, `brisk-walk`) & Per-Mode Session Settings (`CROSS-06`, `CROSS-14`)
Support three selectable locomotion families:
1. **`run` (Sprint / Run):** `stanceDuty = 0.38`, airborne flight window present, `+22°` forward-falling trunk lean (`fallForwardComLeadPx > 10 px`).
2. **`walk` (Grounded Walk):** `stanceDuty = 0.62`, zero airborne flight frames (`airborneFrames === 0`), periodic double-support (`2/2` grounded feet), heel-first strike, upright `+6°` trunk posture.
3. **`brisk-walk` (Fast Race/Brisk Walk):** `stanceDuty = 0.56`, zero airborne flight frames (`airborneFrames === 0`), shortened double-support window, elevated cadence (`1.35 Hz`) and arm swing, `+12°` trunk lean.

Switching locomotion mode in the studio (`useRunnerStudio.ts`, `RunnerControls.tsx`) remembers independent session slider adjustments per mode (`run`, `walk`, `brisk-walk`), and **Reset Profile** (`runner-controls__reset-profile`) restores the active locomotion mode to its biomechanical preset (`LOCOMOTION_MODE_DEFAULTS`).

## 4. Personas, 17-Part Photorealistic Studio Rig, Rounded Joints, Matte Invariants & SVG Vectorizer (`#feat-photoreal-rig`, `#feat-svg-vectorizer`)

### 4.1 Selectable Personas & Skinnable Hooks
Provide selectable adult Singaporean Chinese runner personas (`sg-chinese-male`, `sg-chinese-female`, and three body-positive photoreal female profiles: slim petite, athletic sprinter, and fuller everyday build) plus a runtime skin registration API (`registerCustomSkin`, `attachSkinPartHook`). Persona-specific asset width and segment-length defaults are tunable/resettable and are calibrated from the corresponding source master rather than forced to a shared silhouette.

### 4.2 View-Specific Lateral/Medial Studio Plates, Rounded-End Cutter & Additive End-Cap Composites
Extract 17 photorealistic cutouts from 10 view-specific `#FF00FF` magenta-backed studio photographs (`src/images/photoreal-female/01..10`), including an isolated medial left arm in a `90°` L-bend (`08-far-left-arm-medial-inside-palm.png`, `Call #21`) to guarantee true left-arm chirality:
- **Semicircular Rounded Joint Ends + Internal Shaft Blend (`src/pipeline/rounded-joint-cutter.ts`):** Every rotating limb boundary is semicircularly rounded about its joint rotation axis (`(80, 36)` and `(80, 124)` on a `160 × 160` canonical canvas) with a `6 px` Hermite internal shaft-shoulder blend (`CROSS-01`).
- **Additive End-Cap Composite (`attachEndCapComposite`, `ADD-019`, `RECT-01`, `RECT-06`):** Grafts a semicircularly rounded-top (`y = 36`), straight-bottom (`y = 66`) sprinter-shorts cuff onto `nearThigh` (with single-stripe deduplication) and `farThigh` (solid shaded charcoal fabric), and integrates the distal ankle-sock rib collar onto `nearShin` and `farShin`.
- **Material-Class Matte Invariant, Jacobi Joint Relaxation & Width-Parity Gate (`src/pipeline/photoreal-matte-and-qc.ts`, `CROSS-07`..`CROSS-09`):** Enforces `0` stray bright singlet pixels on skin cutouts (`purgeSkinPartFabricSpill`), Jacobi harmonic membrane relaxation (`fillHollowJointBallByJacobiRelaxation`), and `< 15%` near-vs-far medial limb width parity (`measureNearFarLimbWidthParity`).

### 4.3 Persona Height/Proportion Evidence & Neutral Upright Calibration (`ADD-034`)
For each photoreal persona, store a clearly labeled estimated height, approximate source-master pixel height, and by-eye segment/width measurements normalized to total standing height. These are fictional character estimates, not measured subject metadata. Generate keyed/cropped source-profile images and stage the actual 17-part composite in a neutral upright pose beside that reference on a shared sole baseline and normalized silhouette height. Display reference-versus-assembled segment lengths and horizontal spans; expose resettable persona-specific lengths (head/neck/torso/arm/hand/hip/thigh/shin/foot) and widths. The standing comparison is an inspection surface, not proof of anatomical accuracy; visual review remains mandatory.

### 4.4 Full-Colour Raster-to-SVG Vectorizer & Hierarchical SVG Stitcher (`#svg-vector-assessment`)
Convert all 17 photorealistic raster cutouts into standalone multi-band vector SVGs (`public/sprites/photoreal/sg-chinese-female/svg-parts/*.svg`) verified by a Marching-Squares silhouette IoU gate (`>= 0.90`), and assemble 8 hierarchically stitched full-pose vector frames (`public/sprites/photoreal/sg-chinese-female/svg-frames/frame-01..08.svg`).

## 5. Interactive Workbench, Asset Readiness & 16-Phase Full-Cycle Visual Audit (`#feat-web-studio`, `#gait-cycle-visual-audit`)

- **All-or-Nothing Photoreal Asset Readiness & Retry (`CROSS-05`, `CROSS-15`):** `usePhotorealRigAssets` validates that all 17 part bitmaps decode cleanly before marking status `'loaded'`, surfaces `'error'` with an explicit retry button (`joint-audit__retry-assets`), and gates photoreal audit PNG exports until all 17 parts are ready.
- **Interactive Joint End-Cutter & 16-Phase 3-Panel Audit Workbench (`JointAndCycleAuditPanel.tsx`, `useJointAndAuditInspector.ts`):** Inspect any articulated joint across `-75°..+75°` rotation, compare `rounded-composite` vs `base-square`, preview the 16-phase 3-panel (Light `#E2E6EE` / Dark `#181C26` / Joint Overlay + full-cell neutral support footer) cycle audit sheet, and export the PNG with one click.
- **Headless CLI 16-Frame Dumper (`npm run dump-cycle` & `.claude/skills/audit-gait-cycle/SKILL.md`):** Dumps 16 raw frames, 16 three-panel diagnostic plates, `contact-sheet-16frame.png`, `2×` magnified `joint-crops-sheet.png`, and `audit-report.json` (`totalDisconnectedIslands === 0`, `totalMagentaSpillPixels === 0`) to `/tmp/gait-cycle-audit` for multimodal vision inspection via `read_file`.

## 6. Continuous Per-Turn Learning & Live N-Way Branch Parity (`#continuous-learning-log`, `#n-way-branch-comparison`)

Update `docs/FDS.md#continuous-learning-log` (`TURN-L01..LNN`) and `docs/N_WAY_COMPARISON.md` (`npm run branches:compare`) during **every turn**, maintaining strict 4-way epistemic provenance separation and tracking all $N = 5$ repository branches toward 100% feature parity.

# Sequentially-Numbered Addenda Register (`GREENFIELD.md §1`)

Every architectural, algorithmic, or tooling decision not fixed by a single literal reading of the prompt is recorded here in the same change that implements it.

---

## `ADD-001` — Adoption and Section Split of `wshyang/greenfield`
- **What was decided:** Copy `GREENFIELD.md` and `FDS_BUILDER.md` from `wshyang/greenfield` into the repository root, create a contextualised `CLAUDE.md` index, and split each `##` section into `CLAUDE-decisions.md`, `CLAUDE-testing.md`, `CLAUDE-database.md`, `CLAUDE-conventions.md`, `CLAUDE-function-design.md`, `CLAUDE-validation.md`, `CLAUDE-deployment.md`, and `CLAUDE-checklist.md`.
- **Why:** `GREENFIELD.md §0` mandates establishing the split documentation architecture on day one so agents and contributors can query focused sections without loading the full corpus.
- **Related Spec Section:** `docs/FDS.md#exec-summary`
- **Practical Impact:** Every module and test adheres to the Greenfield function design, testing, and deployment contracts.

## `ADD-002` — Canonical Filing of Reference Sprite Sheet into `/src/images/`
- **What was decided:** Relocate the root `incorrect running sprites.jpeg` into `src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg`, generate the corrected algorithmic sheet at `src/images/spritesheets/runner-8frame-6color-algorithmic-sheet.png`, and generate three parallax stadium backdrops in `src/images/backdrops/stadium-track-{day,dusk,night}.png`, indexed by `src/images/manifest.json`.
- **Why:** Deliverable 1 & 2 require deduplicating repository art and filing assets into `/src/images` using meaningful filenames.
- **Related Spec Section:** `docs/FDS.md#obj-image-asset`, `docs/FDS.md#feat-dedupe`
- **Practical Impact:** `npm run dedupe` is idempotent: it relocates `incorrect running sprites.jpeg` if present, deduplicates by byte SHA-256, RGBA pixel SHA-256, and 64-bit dHash, and keeps `/src/images/manifest.json` updated.

## `ADD-003` — Pure-TypeScript Image Decoding (`jpeg-js` + `pngjs`)
- **What was decided:** Implement all raster decoding, chroma-keying, connected-component labeling, and PNG encoding in pure TypeScript using `jpeg-js` and `pngjs`.
- **Why:** Outbound sandbox network access is restricted to allowlisted registries; native C++ image libraries that fetch prebuilt binaries from arbitrary hosts can fail in locked-down CI or container builds.
- **Related Spec Section:** `docs/FDS.md#nfr`
- **Practical Impact:** `npm ci --ignore-scripts` succeeds deterministically inside Alpine Docker builds and local sandboxes.

## `ADD-004` — Two-Stage Border Flood-Fill + Interior Island Magenta Chroma Key
- **What was decided:** Combine border-seeded flood-fill (`R >= 205, B >= 198, R-G >= 95, B-G >= 90, |R-B| <= 45`) with high-confidence interior magenta island seeding (`R >= 218, B >= 215, R-G >= 112`) and a 1-pixel boundary despill pass.
- **Why:** Row 5 (`purple`) uses a violet jersey (`RGB ~ 128, 51, 157`). A naive global hue threshold either erodes the purple jersey or leaves enclosed magenta loops (such as the triangle between the bent rear arm and torso) unkeyed.
- **Related Spec Section:** `docs/FDS.md#feat-extract`
- **Practical Impact:** All 48 extracted sprites (`public/sprites/extracted/{variant}/frame-0{1..8}.png`) have clean transparent backgrounds, keyed interior arm loops, and intact purple jerseys.

## `ADD-005` — Centroid-Registered `220 × 256` Cutout Canvas & Intra-Row Deduplication
- **What was decided:** Register each cut-out character onto a `220 × 256` RGBA canvas with its foreground centroid anchored at `(110, 132)`, and classify intra-row duplicate poses using centroid-aligned silhouette IoU `>= 0.78`.
- **Why:** Raw cell bounding boxes jitter vertically by up to 25 px; centroid registration aligns corresponding poses across columns so `Frame k` vs `Frame k+4` similarity is measured accurately (`94.7%` mean IoU).
- **Related Spec Section:** `docs/FDS.md#obj-extracted-frame`, `docs/FDS.md#feat-analyze`
- **Practical Impact:** Automatically identifies that every 8-frame row in the reference sheet contains exactly 4 unique poses (`unique-01.png`..`unique-04.png`) repeated twice.

## `ADD-006` — Five-Factor Biomechanical Flaw Diagnosis
- **What was decided:** Codify and verify five distinct flaws in `src/pipeline/flaw-analyzer.ts` and `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`: (`FLAW-01`) Half-cycle duplication (`F1–F4 == F5–F8`), (`FLAW-02`) Unilateral lead-leg lock (no alternating gait), (`FLAW-03`) Zero leg crossover (`minFootSeparationPx = 147 px`), (`FLAW-04`) Scale and baseline jitter (`20 px` height delta, `25 px` baseline shift), and (`FLAW-05`) Two-tone `#FF00FF`/`#FD49FD` magenta grid with JPEG chroma spill.
- **Why:** Deliverable 4 requires a rigorous assessment of what is flawed in the extracted running animation.
- **Related Spec Section:** `docs/FDS.md#feat-analyze`
- **Practical Impact:** Both the markdown report and the web app's Diagnostics view surface exact quantitative metrics computed from the real sprite sheet.

## `ADD-007` — 15-Part Hierarchical Articulated Rig & Painter's Depth Shading
- **What was decided:** Model the algorithmic runner as 15 articulated parts (`farUpperArm`, `farForearm`, `farHand`, `farThigh`, `farShin`, `farFoot`, `pelvis`, `torso`, `head`, `nearThigh`, `nearShin`, `nearFoot`, `nearUpperArm`, `nearForearm`, `nearHand`) rendered back-to-front with two-pass (`silhouette outline → interior fill`) capsule rendering and darkened far-side shading (`skinFar`, `jerseyShadow`, `shortsShadow`, `sockShadow`).
- **Why:** Deliverable 5 requires generating the sprite body, torso, limbs, legs, and articulating parts algorithmically. Separate shading between near (right) and far (left) limbs makes left/right stride alternation visually unmistakable.
- **Related Spec Section:** `docs/FDS.md#obj-articulated-pose`, `docs/FDS.md#feat-algorithmic-runner`
- **Practical Impact:** Exports both full-body animation frames and 15 standalone body-part cutouts under `/public/sprites/algorithmic/parts/`.

## `ADD-008` — Analytical Law-of-Cosines Two-Bone IK + Contralateral Gait Phase Solver
- **What was decided:** Drive the near leg at phase $\phi$ and the far leg at $(\phi + 0.5) \bmod 1$ using a smooth periodic 8-knot ankle trajectory solved via analytical Law-of-Cosines two-bone IK (`bendDirection: 'knee-forward'`), paired with counter-rotating arm swing and double-frequency (`4πφ`) pelvis vertical oscillation.
- **Why:** Ensures exact contralateral symmetry (`Frame k+4` mirrors left/right limb roles of `Frame k`), enforces foot ground clamping during stance, and produces two true leg crossovers (`Pass` at $\phi = 0.25, 0.75$) and two airborne `Flight` phases ($\phi = 0.375, 0.875$) per cycle.
- **Related Spec Section:** `docs/FDS.md#feat-algorithmic-runner`
- **Practical Impact:** Completely eliminates the peg-leg hop, frame duplication, and scale jitter of the reference sheet.

## `ADD-009` — Hook/Component Split & Presentation-Only JSX Interior
- **What was decided:** Place all animation loop timers, state transitions, manifest fetching, and formatted derivations inside `src/app/hooks/useRunnerStudio.ts`, leaving all components in `src/app/components/*.tsx` with pure presentation JSX interiors.
- **Why:** Enforces `GREENFIELD.md §7.5` ("A component renders, a hook decides" and presentation-only JSX interior).
- **Related Spec Section:** `docs/FDS.md#surface-inventory`
- **Practical Impact:** Verified by automated static discipline checks in `src/discipline/greenfield-gate.test.ts`.

## `ADD-010` — Sandbox Container & Inert SHIP-HATS Pipeline Inclusion
- **What was decided:** Commit contextualised `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`, and inert `*.shiphats` pipeline files with Bash 3.2-compatible `activate-shiphats.sh` and `dev.sh`.
- **Why:** Required by `GREENFIELD.md §10` and `§11` items 10, 12, and 13.
- **Related Spec Section:** `docs/FDS.md#nfr`
- **Practical Impact:** Container contract (`0.0.0.0:3000`, numeric UID `1001`) and `activate-shiphats.sh` are continuously verified in `src/discipline/greenfield-gate.test.ts`.

## `ADD-011` — Articulated Cervical Neck & Horizon-Stabilised Head
- **What was decided:** Separate the upper spine into an articulated cervical neck segment (`collar → neck`, `neckAngleRad`) and an independent head pivot (`neck → headCenter`, `headAngleRad`) with counter-phase stabilization so the torso and head are never a single immovable block.
- **Why:** In natural human running, the cervical spine absorbs vertical impact and counter-rotates against thoracic surge so the runner's gaze remains stabilized on the horizon.
- **Related Spec Section:** `docs/FDS.md#uc-005`
- **Practical Impact:** Added `'neck'` and `'hairAccessory'` to `BodyPartId` (17 articulated parts total) and `neckAngleRad`, `headAngleRad`, `hairAngleRad`, `neck`, `hairAnchor`, and `hairTip` to `ArticulatedPose`.

## `ADD-012` — Two-Segment Plantar Foot Roll (Midfoot Strike → Ball Roll → Toe-Off)
- **What was decided:** Replace single-segment vertical foot placement with a 2-segment rolling foot model (`heelPoint → ballPoint → tipPoint`, `src/runner/foot-roll.ts`) that lands on the midfoot (`midfoot-strike`), rolls flat across the plantar sole (`sole-roll`), hinges at the metatarsophalangeal (MTP) ball joint as the heel peels upward (`heel-off-roll`), and drives off the toes (`toe-off`).
- **Why:** Real runners do not stamp the foot straight down and lift it straight up; plantar rolling transfers momentum smoothly forward across the sole toward the toes.
- **Related Spec Section:** `docs/FDS.md#uc-005`
- **Practical Impact:** Added `FootContactPhase`, `heelPoint`, `ballPoint`, `tipPoint`, `toeAngleRad`, `heelLiftPx`, and `contactPhase` to `LimbKinematics` and `solveRollingFootGeometry` in `src/runner/foot-roll.ts`.

## `ADD-013` — Forward-Leading ("Falling Forward") Running Posture
- **What was decided:** Set the default thoracic forward lean to `+22°` (`DEFAULT_GAIT_CONFIG.forwardLeanDeg = 22`) with continuous positive `fallForwardComLeadPx` so the runner's center of mass leads ahead of the pelvis and stance foot across the entire cycle.
- **Why:** Sprinters and distance runners maintain a continuous forward-falling gravity vector that drives propulsion at toe-off.
- **Related Spec Section:** `docs/FDS.md#uc-005`
- **Practical Impact:** `solveArticulatedPose` computes `fallForwardComLeadPx > 0` for all phases `u ∈ [0, 1)`.

## `ADD-014` — Skinnable Sprite Hooks & Dual Singapore Chinese Male / Female Personas
- **What was decided:** Implement a pluggable skinning registry (`src/runner/skin-registry.ts` with `RunnerSkinDefinition`, `SkinPartRenderHook`, `registerCustomSkin`, and `attachSkinPartHook`) and generate full 48-cell sheets and 17-part articulated cutouts for both **Singapore Chinese Male** (`sg-chinese-male`) and **Singapore Chinese Female** (`sg-chinese-female`) runners, with a live persona toggle in the web app.
- **Why:** Enables customizable character skins without modifying the IK/gait solver and provides full articulated sprite sets for both Singapore Chinese male and female runners.
- **Related Spec Section:** `docs/FDS.md#uc-005`, `docs/FDS.md#uc-006`
- **Practical Impact:** Generated `/public/sprites/algorithmic/sg-chinese-male/`, `/public/sprites/algorithmic/sg-chinese-female/`, `/public/sprites/algorithmic/parts/sg-chinese-male/`, `/public/sprites/algorithmic/parts/sg-chinese-female/`, and added the Persona Selector in `RunnerControls.tsx`.

## `ADD-015` — Photorealistic Singaporean Chinese Female Articulated Rig (`photo-sg-chinese-female`)
- **What was decided:** Generate 10 studio photographic assets (`src/images/photoreal-female/01-master-lateral-profile-reference.png` through `10-far-left-leg-medial-inside-shoe.png`) capturing both **lateral (outside/near)** and **medial (inside/far)** anatomical views of a Singaporean Chinese female sprinter, chroma-key and segment them into 17 standardized photographic cutouts (`src/pipeline/photoreal-extractor.ts`), and animate them via inverse-mapped bilinear bone warping and 2-segment MTP foot rolling (`src/runner/photoreal-warp.ts`, `src/runner/photoreal-rig.ts`) as an additional persona option (`photo-sg-chinese-female`) above and beyond the existing procedural sprite personas.
- **Why:** A single side profile cannot provide the medial (inside) view of the far leg/shoe or the medial (inside) view of the far arm/palm; dedicated lateral vs. medial studio assets ensure anatomical fidelity for both near and far limbs during photorealistic skeletal animation.
- **Related Spec Section:** `docs/FDS.md#uc-005`, `docs/FDS.md#uc-006`
- **Practical Impact:** Added `photo-sg-chinese-female` to `RunnerPersonaId`, generated `src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png`, `/public/sprites/photoreal/sg-chinese-female/parts/*.png`, and `/public/sprites/algorithmic/photo-sg-chinese-female/`, and wired `usePhotorealRigAssets.ts` into the live web app.

## `ADD-016` — Rounded Joint End Cutter Tool & True 90° Sagittal Profile Asset Regeneration
- **What was decided:** Regenerate studio component photographs `03` through `10` in `src/images/photoreal-female/` as strict 90° sagittal side profiles facing right (eliminating front-facing camera twist on the cervical neck `04`, torso `05`, pelvis shorts `06`, lateral/medial arms `07`/`08`, and lateral/medial legs `09`/`10`), and build a dedicated **Rounded Joint End Cutter Tool** (`src/pipeline/rounded-joint-cutter.ts` exporting `cutArticulatedLimbWithRoundedEnds` and `applyPivotArcRoundedCut`) paired with isotropic circular pivot cap mapping (`mapLongitudinalWithIsotropicCaps` in `src/runner/photoreal-warp.ts`).
- **Why:** Articulated elements with flat or oblique ends expose corners and gaps when rotated around a joint axis. Cutting semicircular rounded ends centered on each element's proximal `(80, 36)` and distal `(80, 124)` rotation pivots — and mapping those end caps isotropically onto the shared canvas joint pivot — enables the top-most element in Z-order to superimpose concentrically and cleanly over the rotation axis across all gait angles.
- **Related Spec Section:** `docs/FDS.md#uc-005`, `docs/FDS.md#uc-006`
- **Practical Impact:** Added `src/pipeline/rounded-joint-cutter.ts`, updated `src/pipeline/photoreal-extractor.ts`, `src/runner/photoreal-warp.ts`, and `src/runner/photoreal-rig.ts`, and regenerated all 17 cutouts in `public/sprites/photoreal/sg-chinese-female/parts/*.png` and all 48 frames in `src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png`.

## `ADD-017` — Far Left Arm `90°` Sagittal L-Bend Chirality Fix (`08-far-left-arm-medial-inside-palm.png`), Horizontal Limb Cutter & `FDS.md` v2.0.0 Prompt-Engineering Specification
- **What was decided:**
  1. Regenerate `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png` in a **strict `90°` sagittal running L-bend** (vertical upper arm `12->6 o'clock` with anterior biceps on the right `3 o'clock` and posterior triceps/olecranon on the left `9 o'clock`, bending `90°` forward to the right `3 o'clock` into a horizontal inner medial forearm and left runner's fist with the **inner palm and four curled fingers facing the camera and the thumb resting on top at `12 o'clock`**).
  2. Add `srcMaxX` bounding and `cutHorizontalLimbWithRoundedEnds` (`90°` clockwise crop rotation + semicircular rounded end cuts) to `src/pipeline/rounded-joint-cutter.ts`, and disable horizontal row-based shadow-groove interpolation on L-bent source images in `src/pipeline/photoreal-extractor.ts`.
  3. Document the complete conversation-wide thought process for determining the 17 articulated elements and 10 studio source photos, diagnosing failure modes across iterations, preventing camera twist and right-arm chirality illusions, and crafting diffusion prompts in `docs/FDS.md` (`v2.0.0`, `§8`).
- **Why:** Prompting an image generator for a straight vertical (`180°`) hanging arm with *"inner arm and palm facing the camera"* suffers from collinear cylinder degeneracy and a strong training prior toward front-facing right arms: a vertical hanging hand with the palm facing the viewer and the thumb on the right (`3 o'clock`) is anatomically a **right hand**. Posing the isolated far left arm in a `90°` sagittal L-bend (`forearm pointing right 3 o'clock` + `inner palm facing viewer +Z` + `thumb on top 12 o'clock`) locks 3D handedness ($\vec{v}_{\text{forearm}} \times \vec{n}_{\text{palm}} = +\hat{x} \times +\hat{z} = \text{upward } 12\text{ o'clock}$) so it can **only** be a human left arm viewed from its inner (medial) surface.
- **Related Spec Section:** `docs/FDS.md#thought-process`, `docs/FDS.md#feat-photoreal-rig`
- **Practical Impact:** Regenerated `08-far-left-arm-medial-inside-palm.png`, `public/sprites/photoreal/sg-chinese-female/parts/{farUpperArm,farForearm,farHand}.png`, `src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png`, and `/public/sprites/algorithmic/photo-sg-chinese-female/**`; expanded `docs/FDS.md` to `v2.0.0`.

## `ADD-018` — Mandatory `generate_image` Prompt & Regeneration Justification Audit Rule (`CLAUDE.md`) and Raster-to-SVG Articulated Vectorizer & Stitcher (`svg-vectorizer.ts`, `svg-rig-stitcher.ts`)
- **What was decided:**
  1. Codify in `CLAUDE.md`, `CLAUDE-decisions.md` (`§2`), and `CLAUDE-checklist.md` (`#14`) that every `generate_image` call must log its exact verbatim prompt in `docs/FDS.md` (`#image-prompt-log`), and that any subsequent regeneration of the same `file_path` must preserve all prior prompt entries and append the subsequent prompt plus a detailed **Regeneration Justification**.
  2. Populate `docs/FDS.md` (`§9`) with the complete chronological log of all 21 historical `generate_image` calls (`Pass 1` Calls `#01`–`#10`, `Pass 2` Calls `#11`–`#18`, `Pass 2b` Calls `#19`–`#20`, and `Pass 3` Call `#21`) and their regeneration justifications.
  3. Assess and implement a pure-TypeScript **Raster-to-SVG Articulated Element Vectorizer** (`src/pipeline/svg-vectorizer.ts`) and **Hierarchical SVG Rig Stitcher** (`src/runner/svg-rig-stitcher.ts`), documented in `docs/FDS.md` (`§10`, `#svg-vector-assessment`), exporting `/public/sprites/photoreal/sg-chinese-female/svg-parts/*.svg` and `/public/sprites/photoreal/sg-chinese-female/svg-frames/frame-01..08.svg`.
- **Why:** Maintaining an immutable chronological log of every diffusion prompt and regeneration rationale in `docs/FDS.md` prevents repeat prompt regressions (such as `45°` camera twist or straight-cylinder chirality illusions). Implementing the Raster-to-SVG converter and stitcher alongside the technical assessment demonstrates how rounded-end cutouts (`rounded-joint-cutter.ts`) can be traced into smooth Chaikin quadratic Bézier `<clipPath>` masks and quantized color-band `<path>` vectors and stitched via exact 6-parameter SVG affine matrices (`matrix(a b c d e f)`) and 2-segment hinged rearfoot/forefoot `<g>` groups.
- **Related Spec Section:** `docs/FDS.md#image-prompt-log`, `docs/FDS.md#svg-vector-assessment`, `docs/FDS.md#feat-svg-vectorizer`
- **Practical Impact:** Updated `CLAUDE.md`, `CLAUDE-decisions.md`, `CLAUDE-checklist.md`, `docs/FDS.md` (`v3.0.0`), `src/pipeline/svg-vectorizer.ts`, `src/runner/svg-rig-stitcher.ts`, `src/pipeline/algorithmic-sheet-builder.ts`, `src/app/hooks/studio-view-model.ts`, and `src/app/components/ArticulatedRigPanel.tsx`.

## `ADD-019` — Optional End-Cap Composite Attachment (`EndCapCompositeSpec` & `attachEndCapComposite`) for Articulated Thigh Shorts Cuffs
- **What was decided:**
  1. Add `EndCapCompositeSpec` and `attachEndCapComposite` to `src/pipeline/rounded-joint-cutter.ts` and wire optional `endCapComposite?: EndCapCompositeSpec` into `cutArticulatedLimbWithRoundedEnds`.
  2. In `src/pipeline/photoreal-extractor.ts` (`cutThighWithShortsCuff`), attach a proximal (`end: 'top'`) sprinter-shorts cuff extracted from the lower leg-hem section of `06-pelvis-sprinter-shorts.png` (`srcTopY: 460, srcBotY: 690`) onto both `nearThigh` (`sideStripeMode: 'with-stripe'`, preserving the vertical white side stripe) and `farThigh` (`sideStripeMode: 'solid-fabric'`, shaded medial charcoal fabric).
  3. Shape the composite attachment so that its **top (`y = 10..36`) is semicircularly rounded** around the hip pivot `(80, 36)` to gel concentrically with the rounded base of the torso/pelvis, while its **bottom (`dstStraightCutY = 66`) is cut straight across** perpendicular to the thigh axis.
- **Why:** When the base of the torso/pelvis shorts is rounded for hip articulation and the thigh elements are rendered as bare skin, the shorts appear rounded at the bottom as if the subject has no pants/shorts leg sleeves. Attaching a rounded-top, straight-bottom shorts cuff composite onto the proximal end of each thigh ensures that the hip joint rotates seamlessly while each swinging thigh displays a realistic straight-hemmed sprinter-shorts sleeve.
- **Related Spec Section:** `docs/FDS.md#thought-process`, `docs/FDS.md#feat-photoreal-rig`, `docs/FDS.md#svg-vector-assessment`
- **Practical Impact:** Updated `src/pipeline/rounded-joint-cutter.ts`, `src/pipeline/photoreal-extractor.ts`, `src/runner/photoreal-rig.ts`, `src/runner/svg-rig-stitcher.ts`, `src/pipeline/pipeline.test.ts`, and regenerated all PNG cutouts (`nearThigh.png`, `farThigh.png`, `torso.png`), SVG vector parts (`nearThigh.svg`, `farThigh.svg`), stitched SVG frames (`frame-01..08.svg`), and the 48-frame photorealistic sprite sheet.







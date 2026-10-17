# Functional Design Specification — Sprite Motion Lab & Algorithmic Running Engine

- **Document Version:** 3.1.0
- **Date:** 2026-10-17
- **Status:** Active Canonical Specification (`[INTENT_ALIGNED]`)
- **Meta Prompt Reference:** `FDS_BUILDER.md` v2.0 & `GREENFIELD.md` (`wshyang/greenfield`)
- **Tag Conventions:** `#obj-*` (Core Objects), `#feat-*` (Features), `#surf-*` (Surfaces), `#nfr-*` (Non-Functional Requirements), `[SEED]` (Bootstrap Seed)

---

## Table of Contents

1. [Executive Summary](#exec-summary)
2. [Phase Scope Summary](#phase-scope)
3. [Core Objects (`#obj-*`)](#core-objects)
4. [Central Relationship Map](#relationship-map)
5. [Surface Inventory (`#surf-*`)](#surface-inventory)
6. [Features (`#feat-*`)](#features)
7. [User Flows](#user-flows)
8. [End-to-End Engineering Thought Process: Articulated Element Decomposition, Image Prompt Design, Anatomical/Chirality Safeguards & Rounded-End Joint Superimposition](#thought-process)
9. [Complete Chronological Image Generation Prompt & Regeneration Justification Audit Log (`#image-prompt-log`)](#image-prompt-log)
10. [Technical Assessment & Reference Implementation: Raster-to-SVG Articulated Element Vectorization & Hierarchical SVG Rig Stitching (`#svg-vector-assessment`)](#svg-vector-assessment)
11. [Day-Zero Bootstrap (`R4`)](#day-zero-bootstrap)
12. [Non-Functional Requirements (`#nfr-*`)](#nfr)
13. [Changelog](#changelog)

---

## 1. Executive Summary {#exec-summary}

1. **Purpose:** Provide an end-to-end deterministic asset deduplication, magenta-key sprite extraction, quantitative biomechanical flaw diagnosis, and real-time algorithmic, photorealistic, and vectorized-SVG articulated running sprite synthesis platform.
2. **Primary Actors:** Game/Animation Engineer (`role:engineer`) and Interactive Web Viewer (`role:viewer`).
3. **Core Capabilities:**
   - Byte-level (`SHA-256`), pixel-buffer (`SHA-256`), and perceptual (`64-bit dHash`) deduplication and structured filing under `/src/images/`.
   - Automated grid detection and border-seeded flood-fill magenta chroma-key extraction of 48 character cells into `/public/sprites/extracted/`.
   - Quantitative biomechanical diagnosis proving why the reference 8-frame sheet fails (4 unique poses doubled into 8 columns at 94.7% mean IoU, unilateral lead-leg lock, zero leg crossover, and 20–25 px scale/baseline jitter).
   - 17-part articulated character rig with an independently articulated cervical neck (`neck`), a 2-segment rolling foot (`heelPoint -> ballPoint -> toePoint` modeling `midfoot-strike` -> `sole-roll` -> `heel-off-roll` -> `toe-off`), a forward-leading "falling forward" sprint posture (`14°` trunk pitch), and pluggable skinnable persona hooks (`sg-chinese-male`, `sg-chinese-female`, and photorealistic `photo-sg-chinese-female`).
   - Photorealistic studio asset pipeline combining 10 view-specific `#FF00FF` magenta-backed studio photographs, semicircular rounded-end joint cutting (`src/pipeline/rounded-joint-cutter.ts`), isotropic similarity-aligned segment warping, continuous chord-tent rolling-shoe deformation (`src/runner/photoreal-warp.ts`), and Raster-to-SVG vectorization & hierarchical SVG stitching (`src/pipeline/svg-vectorizer.ts`, `src/runner/svg-rig-stitcher.ts`).

---

## 2. Phase Scope Summary {#phase-scope}

| Phase Tag | Scope Description | Surfaces & Features Covered |
|---|---|---|
| `P1-Core` | Asset deduplication, `/src/images` filing, magenta-key extraction, biomechanical flaw analysis, 17-part algorithmic & photorealistic IK gait solver, rounded-end joint cutter, Raster-to-SVG vectorizer & stitcher, and interactive TypeScript web app | `#feat-dedupe`, `#feat-extract`, `#feat-analyze`, `#feat-algorithmic-runner`, `#feat-photoreal-rig`, `#feat-svg-vectorizer`, `#feat-web-studio`, `#surf-cli-*`, `#surf-ui-*` |

---

## 3. Core Objects (`#obj-*`) {#core-objects}

### 3.1 `#obj-image-asset` — Filed Image Asset (`P1-Core`)

Represents a deduplicated source spritesheet, studio photograph, or backdrop filed under `/src/images/`.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `filedPath` | `string(max:255)` | `P1-Core` | Required, unique, relative to repo root | Must begin with `src/images/` and end with `.png` or `.jpeg` | `"Asset path must reside inside src/images/ with a .png or .jpeg extension."` |
| `assetCategory` | `enum('spritesheet-reference','spritesheet-algorithmic','backdrop')` | `P1-Core` | Required | Must match one of the three registered asset categories | `"Unsupported asset category specified for catalog entry."` |
| `pixelSha256` | `string(len:64)` | `P1-Core` | Required, lowercase hex | SHA-256 digest of `width x height : RGBA` buffer | `"Invalid pixel buffer SHA-256 digest."` |
| `dHash64` | `string(len:16)` | `P1-Core` | Required, lowercase hex | 64-bit horizontal gradient difference hash over a 9×8 luma grid | `"Invalid 64-bit perceptual difference hash."` |
| `status` | `enum('active','deprecated')` | `P1-Core` | Required | `'active'` if first canonical occurrence of `pixelSha256`; `'deprecated'` if superseded | `"Asset status must be active or deprecated."` |

- **States:** `active` → `deprecated` (when a duplicate pixel hash is detected; hard deletion is replaced by soft status tagging in the catalog).
- **Edge & Failure Modes:**
  1. *Boundary:* 1×1 minimum raster dimensions validated on decode.
  2. *Invalid Input:* Non-image bytes rejected by `jpeg-js` / `pngjs` decoders.
  3. *Adversarial Input:* Path traversal blocked by resolving relative to repository root.
  4. *Race Condition:* Single-process atomic manifest write.
  5. *Dependency Failure:* Pure-JS decoders require zero external native binaries.
  6. *Authorization Change (`R8`):* Public read-only asset catalog in browser; CLI writes restricted to workspace execution.

### 3.2 `#obj-extracted-frame` — Extracted Sprite Cutout (`P1-Core`)

Represents one individual character frame cut out from the magenta-backed reference sheet and registered onto a `220 × 256` RGBA canvas under `/public/sprites/extracted/`.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `variant` | `enum('red','blue','green','yellow','purple','orange')` | `P1-Core` | Required | Must belong to the 6 canonical team color rows | `"Unknown runner color variant."` |
| `frameIndex` | `integer(1..8)` | `P1-Core` | Required | `1 <= frameIndex <= 8` | `"Frame index must be between 1 and 8 inclusive."` |
| `publicUrl` | `string(max:255)` | `P1-Core` | Required | Must start with `/sprites/extracted/` and resolve in `/public` | `"Extracted sprite public URL must begin with /sprites/extracted/."` |
| `isDuplicateInRow` | `boolean` | `P1-Core` | Required | `true` when centroid-aligned silhouette IoU with an earlier frame in the same row is `>= 0.78` | `"Duplicate classification flag is required."` |

### 3.3 `#obj-articulated-pose` — 17-Part Articulated Runner Pose (`P1-Core`)

Represents the solved 2D joint hierarchy, cervical neck counter-pitch, 2-segment foot roll, and limb kinematics at normalized gait phase $\phi \in [0, 1)$.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `phase` | `number[0,1)` | `P1-Core` | Required | Normalized via `((raw % 1) + 1) % 1` | `"Gait phase must be a finite number normalized to [0, 1)."` |
| `canonicalFrameIndex` | `integer(0..7)` | `P1-Core` | Required | `Math.floor(((phase + 0.0625) % 1) * 8)` | `"Canonical frame index must be in 0..7."` |
| `neck` | `{ base, top, tiltRad }` | `P1-Core` | Required | Articulated cervical column between `torso.neck` and `head.neckPivot` | `"Cervical neck articulation state is required."` |
| `nearLeg` | `LimbKinematics` | `P1-Core` | Required | Solved via 2-bone IK at phase $\phi$ with `bendDirection: 'knee-forward'` and 2-segment `FootRollKinematics` | `"Near leg kinematics failed two-bone IK validation."` |
| `farLeg` | `LimbKinematics` | `P1-Core` | Required | Solved via 2-bone IK at anti-phase $(\phi + 0.5) \bmod 1$ with 2-segment `FootRollKinematics` | `"Far leg kinematics failed contralateral phase validation."` |

---

## 4. Central Relationship Map {#relationship-map}

| Object A | Cardinality | Object B | Relationship Name | Constraints | Data-Carrying? | Surface Coverage |
|---|---|---|---|---|---|---|
| `#obj-image-asset` | `1 : N` | `#obj-extracted-frame` | `yields-extracted-frames` | 1 sheet (`2528×1696`) yields 48 frames (6 variants × 8 cols) | No | Create: `#surf-cli-extract`, List: `#surf-ui-diagnostics` |
| `#obj-articulated-pose` | `1 : 17` | `AlgorithmicBodyPartEntry` | `articulates-body-parts` | 17 anatomical layers rendered in back-to-front painter order (`zOrder = 1..17`) | No | Create: `#surf-cli-generate`, List: `#surf-ui-rig-inspector` |

---

## 5. Surface Inventory (`#surf-*`) {#surface-inventory}

| # | Surface | Anchor | Roles | Object/Relationship | CRUD/Associate | Phase |
|---|---|---|---|---|---|---|
| 1 | CLI Dedupe & File (`npm run dedupe`) | `#surf-cli-dedupe` | `role:engineer` | `#obj-image-asset` | Create / Update | `P1-Core` |
| 2 | CLI Sprite Extractor (`npm run extract`) | `#surf-cli-extract` | `role:engineer` | `#obj-extracted-frame` | Create | `P1-Core` |
| 3 | CLI Flaw Analyzer (`npm run analyze`) | `#surf-cli-analyze` | `role:engineer` | `SpriteFlawAnalysisReport` | Create | `P1-Core` |
| 4 | CLI Algorithmic, Photoreal & SVG Generator (`npm run generate-sheets`) | `#surf-cli-generate` | `role:engineer` | `#obj-articulated-pose` | Create | `P1-Core` |
| 5 | Web Live Stage & Side-by-Side Comparison | `#surf-ui-stage` | `role:viewer` | `#obj-articulated-pose`, `#obj-extracted-frame` | Read / Interactive | `P1-Core` |
| 6 | Web 8-Frame Gait Filmstrip & Phase Comparison | `#surf-ui-filmstrip` | `role:viewer` | `#obj-articulated-pose`, `#obj-extracted-frame` | Read / Interactive | `P1-Core` |
| 7 | Web Articulated Body Parts, Cutouts & SVG Rig Inspector | `#surf-ui-rig-inspector` | `role:viewer` | `#obj-articulated-pose` | Read / Interactive | `P1-Core` |
| 8 | Web Flaw Diagnostics & Asset Catalog | `#surf-ui-diagnostics` | `role:viewer` | `#obj-image-asset`, `SpriteFlawAnalysisReport` | Read | `P1-Core` |

*Parity Audit (`R5`):* All 8 model operations map 1:1 to a CLI or Web UI surface. Zero `[ORPHAN-CAPABILITY]` items remain.

---

## 6. Features (`#feat-*`) {#features}

### 6.1 `#feat-dedupe` — Asset Deduplication & `/src/images` Filing (`P1-Core`)
- **Given** raw image files in the repository, **When** `npm run dedupe` executes, **Then** duplicate files are identified by `pixelSha256` and `dHash64`, canonical files are filed under `/src/images/` with meaningful names, and `/src/images/manifest.json` is written.

### 6.2 `#feat-extract` — Multi-Piece Magenta Chroma-Key Sprite Extraction (`P1-Core`)
- **Given** `src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg`, **When** `npm run extract` executes, **Then** the header (`132 px`) and 6×8 grid dividers are automatically detected, magenta backdrops are flood-fill keyed out without eroding purple jersey pixels, and 48 registered PNGs (`220×256`) plus `manifest.json` are written to `/public/sprites/extracted/`.

### 6.3 `#feat-analyze` — Quantitative Animation Flaw Assessment (`P1-Core`)
- **Given** the 48 extracted frames, **When** `npm run analyze` executes, **Then** the analyzer computes the 8×8 silhouette IoU matrix, proves that Frames 5–8 duplicate Frames 1–4 (`94.7%` mean IoU), proves unilateral lead-leg lock and zero leg crossover (`minFootSeparationPx = 147 px > 0`), and emits `public/sprites/extracted/analysis.json` and `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`.

### 6.4 `#feat-algorithmic-runner` — 17-Part Articulated Body, Cervical Neck, Rolling Foot & Forward-Fall Gait (`P1-Core`)
- **Given** any gait phase $\phi \in [0, 1)$, team palette, persona (`sg-chinese-male`, `sg-chinese-female`, `photo-sg-chinese-female`), and gait parameters, **When** `solveArticulatedPose` and `renderRunnerPoseToRaster` execute, **Then** the engine computes a 17-part articulated pose with analytical 2-bone IK, articulated cervical neck (`neck`), 2-segment rolling foot (`midfoot-strike` -> `sole-roll` -> `heel-off-roll` -> `toe-off`), forward-leading center-of-mass posture (`14°` forward lean), exact 180° contralateral leg/arm phase alternation, two leg crossovers per stride ($\phi = 0.25, 0.75$), and two airborne flight phases ($\phi = 0.375, 0.875$).

### 6.5 `#feat-photoreal-rig` — Photorealistic Cutout Extraction, Rounded-End Joint Cutter & Warping Rig (`P1-Core`)
- **Given** the 10 studio source photographs under `src/images/photoreal-female/`, **When** `extractPhotorealSpriteParts` and `renderPhotorealRigPose` execute, **Then** 17 `160 × 160` RGBA cutouts with semicircular rounded joint ends are written to `/public/sprites/photoreal/sg-chinese-female/parts/` and composited in back-to-front Z-order with clean rotational joint superimposition.

### 6.6 `#feat-svg-vectorizer` — Raster-to-SVG Articulated Element Vectorizer & Hierarchical SVG Rig Stitcher (`P1-Core`)
- **Given** the 17 rounded-end `160 × 160` RGBA cutouts, **When** `vectorizeRasterCutoutToSvg` and `stitchArticulatedSvgRig` execute, **Then** each cutout is converted into a standalone SVG vector document (`/public/sprites/photoreal/sg-chinese-female/svg-parts/*.svg`) with a Chaikin-smoothed quadratic Bézier `<clipPath>` rounding mask and quantized color-band `<path>` vectors, and stitched into full-body animated SVG frames (`/public/sprites/photoreal/sg-chinese-female/svg-frames/frame-01..08.svg`).

---

## 7. User Flows {#user-flows}

1. **Engineer Pipeline Flow:** Run `./dev.sh` or `npm run pipeline` → deduplicates `/src/images/`, extracts 48 reference sprites to `/public/sprites/extracted/`, generates flaw report, extracts 17 photorealistic cutouts to `/public/sprites/photoreal/sg-chinese-female/parts/`, vectorizes 17 SVG parts + 8 stitched SVG frames to `/public/sprites/photoreal/sg-chinese-female/{svg-parts,svg-frames}/`, and renders 48 algorithmic & photorealistic sprites per persona + 17 body parts + 3 backdrops to `/public/sprites/algorithmic/`.
2. **Interactive Web Comparison Flow:** Open app on port `3000` → switch between `SG Chinese Male (Procedural)`, `SG Chinese Female (Procedural)`, and `SG Chinese Female (Photorealistic)` → compare against Extracted Flawed Sprite side-by-side → inspect individual PNG cutouts and SVG vector parts in the 17-Part Articulated Rig Inspector.

---

## 8. End-to-End Engineering Thought Process: Articulated Element Decomposition, Image Prompt Design, Anatomical/Chirality Safeguards & Rounded-End Joint Superimposition {#thought-process}

This section records the complete engineering thought process developed across the project conversation: how the 17 articulated elements and 10 studio source photographs were determined, why early image-generation and warping iterations failed, what anatomical and optical rules govern diffusion-generated articulated sprites, and how every prompt and cutter parameter was engineered.

### 8.1 Thought Process for Determining the 17 Articulated Elements & 10 Studio Source Photographs

#### 8.1.1 Why 17 Articulated Elements Are Required for Biomechanical Running
A 2D side-profile running character cannot be animated convincingly with a rigid trunk or single-piece limbs. We decomposed the human body into **17 independently articulated elements** arranged in strict back-to-front painter's Z-order (`zOrder = 1..17`):

| Z-Order | `BodyPartId` | Anatomical Role & Kinematic Joint Anchor | Why It Must Be a Separate Element |
|---|---|---|---|
| `1` | `farUpperArm` | Left (far) upper arm (`farShoulder -> farElbow`) | Swings behind the torso during half of the stride cycle; must be occluded by `torso`. |
| `2` | `farForearm` | Left (far) medial forearm (`farElbow -> farWrist`) | Flexes between `65°` and `110°` independently of `farUpperArm` during arm drive. |
| `3` | `farHand` | Left (far) closed runner's fist (`farWrist -> farHandTip`, inner palm facing viewer) | Continues the forearm vector with wrist sweatband and inner palm/curled fingers. |
| `4` | `farThigh` | Left (far) medial thigh (`farHip -> farKnee`) | Crosses behind `nearThigh` twice per cycle ($\phi = 0.25, 0.75$) and behind `pelvis`. |
| `5` | `farShin` | Left (far) medial lower leg (`farKnee -> farAnkle`) | Driven by 2-bone IK (`knee-forward` bend constraint); flexes up to `115°` during recovery heel-kick. |
| `6` | `farFoot` | Left (far) medial running shoe (`heelPoint -> ballPoint -> toePoint`) | Must deform across two segments (`heel->ball` rearfoot + `ball->toe` forefoot) for natural midfoot-to-toe roll. |
| `7` | `pelvis` | Sprinter shorts / hip unit (`hipCenter -> waistCenter`) | Bridges the lower extremities to the upper trunk while superposing over `farThigh` and beneath `nearThigh`. |
| `8` | `neck` | Cervical spine column (`neck.base -> neck.top`) | **Critical user requirement:** The torso and head must not be a single immovable block. During a `14°` forward-fall trunk lean, the cervical neck counter-pitches (`0.48 * torso.tiltRad`) between the thoracic outlet and the skull base. |
| `9` | `hairAccessory` | Dynamic ponytail (`head.hairPivot` -> trailing tip) | Secondary-motion element for female personas that lags and oscillates with vertical COM velocity (`vy`). |
| `10` | `torso` | Ribcage & racerback singlet (`waistCenter -> neck.base`) | Pitches forward (`14°` base lean + `2.2°` double-frequency oscillation) to create the "falling forward" running posture; overlaps `farUpperArm` and `neck.base`. |
| `11` | `head` | Cranium & right-facing profile (`neck.top -> head.center`) | Stabilizes horizon gaze (`0.16 * torso.tiltRad`) atop the articulated `neck` pivot (`C1/occiput`). |
| `12` | `nearThigh` | Right (near) lateral thigh (`nearHip -> nearKnee`) | Overlaps `pelvis` (`zOrder = 12 > 7`) via a rounded hip cap so the hip joint rotates cleanly without rectangular corner seams. |
| `13` | `nearShin` | Right (near) lateral lower leg (`nearKnee -> nearAnkle`) | Overlaps `nearThigh` at the knee pivot during flexion/extension. |
| `14` | `nearFoot` | Right (near) lateral running shoe (`heelPoint -> ballPoint -> toePoint`) | Displays the outside lateral swoosh wall while rolling from midfoot strike to toe-off. |
| `15` | `nearUpperArm` | Right (near) lateral deltoid/upper arm (`nearShoulder -> nearElbow`) | Superimposes in front of `torso` (`zOrder = 15 > 10`) over the shoulder socket pivot. |
| `16` | `nearForearm` | Right (near) lateral forearm (`nearElbow -> nearWrist`) | Superimposes over `nearUpperArm` at the elbow pivot. |
| `17` | `nearHand` | Right (near) lateral fist (`nearWrist -> nearHandTip`, dorsal knuckles facing viewer) | Frontmost layer (`zOrder = 17`), crossing across the chest and waist without being clipped by any body part. |

#### 8.1.2 Why a Single Side-Profile Photo Is Insufficient (Medial vs. Lateral Optical Asymmetry)
Because the camera stands on the runner's **right side** looking along `-Z` toward a right-facing (`3 o'clock`, `+X`) runner:
- The **near (right) limbs** present their **outside (lateral)** anatomical surfaces (`nearUpperArm`/`nearForearm` lateral deltoid & extensors, `nearHand` dorsal knuckles, `nearThigh`/`nearShin` vastus lateralis & lateral calf, `nearFoot` outer swoosh wall).
- The **far (left) limbs** present their **inside (medial)** anatomical surfaces (`farUpperArm`/`farForearm` inner biceps & medial flexors, `farHand` **inner palm and four curled fingers with thumb on top**, `farThigh`/`farShin` inner VMO & medial tibia, `farFoot` sculpted inner medial arch wall).

---

### 8.2 Deep-Dive: Why Diffusion Models Generate a Right Arm When Asked for an Isolated Medial Left Arm — and How to Guarantee True Left-Arm Chirality

1. **The Hanging-Arm Thumb Paradox (`180°` Collinear Cylinder Degeneracy):**
   - When an arm hangs straight down (`6 o'clock`), the upper arm and forearm are collinear vertical tubes with no sagittal elbow bend to define forward (`3 o'clock`) vs. backward (`9 o'clock`).
   - Anatomically, if a vertical hanging hand has its **inner palm facing the camera AND its thumb on the right (`3 o'clock`)**, that hand is **a RIGHT hand**! On a vertical hanging **left hand** with the inner palm facing the viewer, the thumb points **left (`9 o'clock`)** and only points **up (`12 o'clock`)** when the forearm bends `90°` forward to the right (`3 o'clock`).
2. **The `90°` Sagittal Running L-Bend Solution (`08-far-left-arm-medial-inside-palm.png`):**
   - By posing the isolated far left arm in a **`90°` sagittal running L-bend** (vertical upper arm `12->6 o'clock` with anterior biceps on the right `3 o'clock` and posterior triceps/olecranon on the left `9 o'clock`, bending `90°` forward to the right `3 o'clock` into a horizontal inner forearm and closed left fist with the **inner palm and four curled fingers facing the camera and the thumb on top at `12 o'clock`**), the 3D cross-product ($\vec{v}_{\text{forearm}} \times \vec{n}_{\text{palm}} = +\hat{x} \times +\hat{z} = \text{upward } 12\text{ o'clock}$) makes it **mathematically and anatomically impossible** for the limb to be a right arm.

---

### 8.3 Ten Mandatory Care Rules for Crafting Articulated Sprite Image Generation Prompts

1. **Anchor Style, Scale & Palette via Image-to-Image Reference (`images: [masterRef]`).**
2. **Specify Camera Angle Using Clock-Face & Orthographic Engineering Coordinates (`90°` Sagittal Profile, `3 o'clock`).**
3. **Never Name Frontal Landmarks in a Side-Profile Prompt (Anti-Camera-Twist Rule).**
4. **Break Collinear Symmetry with a `90°` Sagittal L-Bend for Isolated Medial Arms.**
5. **Explicitly Contrast Lateral (Outside) Near Limbs vs. Medial (Inside) Far Limbs.**
6. **Request Armless/Limbless Mannequin Tailoring Cuts on Torso & Pelvis.**
7. **Mandate Flat, Shadowless Studio Illumination Across the Full Limb Width.**
8. **Enforce Pure `#FF00FF` Magenta Chroma-Key Backdrops Orthogonal to Subject Colors.**
9. **Preserve Isotropic Aspect Ratio Between Cutout (`160 × 160`) and Destination Quad (`dstHalfWidthPx / 80 == dstLen / srcLen`).**
10. **Apply Semicircular Rounded Cuts Centered on Every Joint Rotation Pivot & Optional End-Cap Composite Attachments (`rounded-joint-cutter.ts`):**
    - Every articulated boundary passes through `cutArticulatedLimbWithRoundedEnds` or `applyPivotArcRoundedCut` so rotating layers superimpose concentrically over the joint axis.
    - When rounding the bottom of the torso/pelvis shorts (`06-pelvis-sprinter-shorts.png`), rendering bare-skin thigh elements (`nearThigh`, `farThigh`) directly below a rounded pelvis makes the shorts look rounded at the bottom as if the runner has no pants leg sleeves. To solve this, `cutArticulatedLimbWithRoundedEnds` supports an optional **`endCapComposite` (`EndCapCompositeSpec` / `attachEndCapComposite`)** that grafts a composite segment extracted from the base of `pelvisShorts` (`y = 460..690`) onto the proximal (`top`) end of `nearThigh` (with the vertical white side stripe) and `farThigh` (solid shaded charcoal fabric). The composite cuff is **semicircularly rounded at the top (`y = 10..36`)** to gel concentrically with the rounded base of the torso/pelvis, and **cut straight across at the bottom (`dstStraightCutY = 66`)** so each swinging thigh carries a crisp, straight sprinter-shorts hem perpendicular to the femur axis.

---

## 9. Complete Chronological Image Generation Prompt & Regeneration Justification Audit Log (`#image-prompt-log`) {#image-prompt-log}

Per `CLAUDE.md` and `CLAUDE-decisions.md §2`, every `generate_image` call executed in this repository is logged chronologically below with its **exact verbatim prompt**, target `file_path`, reference `images`, and — whenever an existing file path is regenerated — a full **Regeneration Justification** explaining why the additional call was required.

---

### 9.1 Pass 1 — Initial 10-Image Studio Generation (`Calls #01` – `#10`)

#### Call `#01` — `src/images/photoreal-female/01-master-lateral-profile-reference.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/01-master-lateral-profile-reference.png`
- **Reference `images`:** `[]` (Text-to-Image Master Seed)
- **Exact Prompt Used:**
  > `"Full-body studio reference photograph of a fit 25-year-old Singaporean Chinese female track-and-field sprinter standing in a strict 90-degree orthographic right-facing lateral side profile (facing right), neutral anatomical standing posture, natural realistic 1:7.5 adult human head-to-body proportions, toned athletic build, warm natural Southeast Asian Chinese skin tone, sleek black hair tied in a high sporty ponytail with a red hairband, wearing a fitted crimson-red (#B81D24) athletic racerback running singlet with a clean white vertical side stripe, fitted charcoal-black (#1C2026) sprinter shorts with a thin white side trim, sky-blue (#2898D8) terrycloth wrist sweatbands, white ankle running socks, and white-and-crimson carbon-plated marathon running shoes. Flat even studio lighting, crisp edges, shot on 85mm telephoto lens to eliminate perspective distortion, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero floor shadow."`

#### Call `#02` — `src/images/photoreal-female/02-head-profile-right.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/02-head-profile-right.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio close-up photograph of ONLY the head of the Singaporean Chinese female sprinter from the reference image in a strict 90-degree orthographic right-facing side profile (facing right). Sleek black hair pulled back tightly into a neat occipital bun base at the back of the head (without the long hanging ponytail tail, so the ponytail can be animated as a separate layer), clear jawline, ear, brow, nose bridge, and focused athletic gaze looking straight ahead to the right. Cropped cleanly at the upper submental jawline/skull base with a smooth rounded bottom contour ready for neck joint articulation. Even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#03` — `src/images/photoreal-female/03-ponytail-hair-accessory.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/03-ponytail-hair-accessory.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY a sleek sporty black ponytail hairpiece with a crimson-red (#B81D24) elastic hair tie at the right-hand root anchor point, streaming horizontally to the left in a dynamic aerodynamic S-curve as if trailing behind a right-facing female sprinter. Silky realistic black hair strands with subtle studio specular shine, clean self-contained silhouette with no head or skin attached, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#04` — `src/images/photoreal-female/04-cervical-neck-cylinder.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/04-cervical-neck-cylinder.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY the anatomical cervical neck segment of the fit Singaporean Chinese female sprinter from the reference image, viewed in a strict 90-degree right-facing lateral side profile (facing right). Shows the natural sternocleidomastoid muscle contour, smooth warm Southeast Asian skin tone matching the reference athlete, with rounded capsule-like top and bottom termination edges (extending slightly from below the jawline down to the upper trapezius/collarbone base) so it can rotate smoothly as an articulated neck joint between the torso and head. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#05` — `src/images/photoreal-female/05-torso-racerback-singlet.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/05-torso-racerback-singlet.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY the armless torso and ribcage of the fit Singaporean Chinese female sprinter from the reference image in a strict 90-degree right-facing lateral side profile (facing right, chest on the right side, back on the left side). Wearing the fitted crimson-red (#B81D24) athletic racerback running singlet with a crisp white vertical side stripe and a small slice of toned midriff skin at the bottom waist, with NO arms, NO head, NO neck, and NO shorts/legs attached. Clean rounded shoulder socket area and rounded waist bottom so limbs can articulate over it. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#06` — `src/images/photoreal-female/06-pelvis-sprinter-shorts.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/06-pelvis-sprinter-shorts.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY the pelvis and hip section of the fit Singaporean Chinese female sprinter from the reference image in a strict 90-degree right-facing lateral side profile (facing right, anterior hip on the right, glute curve on the left). Wearing fitted charcoal-black (#1C2026) athletic sprinter shorts with a crisp white vertical side seam stripe and elastic waistband, with NO torso above the waistband and NO legs extending below the shorts hem. Clean rounded contour for 2D skeletal hip articulation, flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#07` — `src/images/photoreal-female/07-near-right-arm-lateral-outside.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/07-near-right-arm-lateral-outside.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY the complete bare RIGHT arm of the fit Singaporean Chinese female sprinter from the reference image, viewed from the OUTSIDE (lateral view, near-side arm of a right-facing runner), hanging straight down vertically from the rounded deltoid shoulder cap at the top, through the lateral triceps/biceps and outer elbow in the middle, down the lateral forearm with a sky-blue (#2898D8) terrycloth sweatband on the wrist, ending in a relaxed athletic runner's fist at the bottom showing the OUTSIDE (dorsal/knuckle side) of the right hand with the thumb tucked forward to the right. Warm Southeast Asian skin tone, flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#08` — `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY the complete bare LEFT arm of the fit Singaporean Chinese female sprinter from the reference image, viewed from the INSIDE (medial view, far-side arm of a right-facing runner), hanging straight down vertically from the inner shoulder/axillary deltoid contour at the top, through the inner medial biceps/elbow crease in the middle, down the inner medial forearm with a sky-blue (#2898D8) terrycloth sweatband on the wrist, ending in a relaxed athletic runner's lightly curled hand at the bottom showing the INSIDE (palmar side, palm and curled fingers facing the viewer, thumb on the right/anterior side) of the left hand. Warm Southeast Asian skin tone with subtle natural far-limb studio shading, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#09` — `src/images/photoreal-female/09-near-right-leg-lateral-outside-shoe.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/09-near-right-leg-lateral-outside-shoe.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY the complete bare RIGHT leg and right running shoe of the fit Singaporean Chinese female sprinter from the reference image, viewed in a strict 90-degree right-facing OUTSIDE (lateral) side profile (near-side leg of a right-facing runner, kneecap and toes pointing right). Vertical straight leg from the rounded upper lateral thigh/quadriceps at the top, through the outer knee, toned lateral calf and gastrocnemius muscle, white athletic ankle sock, down to a white-and-crimson carbon-plated marathon running shoe at the bottom showing the OUTSIDE (lateral) side of the right shoe with a sleek crimson lateral swoosh stripe and sculpted white foam midsole. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#10` — `src/images/photoreal-female/10-far-left-leg-medial-inside-shoe.png` (Initial Generation)
- **Target File:** `src/images/photoreal-female/10-far-left-leg-medial-inside-shoe.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Exact Prompt Used:**
  > `"Isolated studio photograph of ONLY the complete bare LEFT leg and left running shoe of the fit Singaporean Chinese female sprinter from the reference image, viewed in a strict 90-degree right-facing INSIDE (medial) side profile (far-side leg of a right-facing runner, kneecap and toes pointing right, showing the inner thigh and inner arch of the left foot). Vertical straight leg from the rounded upper medial thigh/adductor contour at the top, through the inner knee (vastus medialis teardrop), inner tibia and medial calf muscle, white athletic ankle sock, down to a white-and-crimson carbon-plated marathon running shoe at the bottom showing the INSIDE (medial arch) side of the left shoe with sculpted medial arch support foam and inner crimson heel accent. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

---

### 9.2 Pass 2 — Regeneration of Plates `03`–`10` to Eliminate `45°` Camera Twist & Harsh Side Shadows (`Calls #11` – `#18`)

#### Call `#11` — `src/images/photoreal-female/03-ponytail-hair-accessory.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/03-ponytail-hair-accessory.png`
- **Reference `images`:** `['src/images/photoreal-female/02-head-profile-right.png']`
- **Regeneration Justification:** In Call `#03` (Pass 1), the ponytail was generated from an oblique top-three-quarter angle rather than a pure `90°` lateral profile matching `02-head-profile-right.png`. Regenerating with `02-head-profile-right.png` as the reference image aligned the crimson hairband anchor at `3 o'clock` and the tapering tip at `9 o'clock` in the exact sagittal plane.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral orthographic side-profile studio photograph of ONLY an isolated sleek black ponytail hairpiece with a crimson-red (#B81D24) elastic hair tie at the right-hand root anchor (3 o'clock), streaming horizontally to the left (9 o'clock) in a clean side-view wave. Pure side profile matching the reference head's hair texture, NO head or skin attached, flat studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

#### Call `#12` — `src/images/photoreal-female/04-cervical-neck-cylinder.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/04-cervical-neck-cylinder.png`
- **Reference `images`:** `['src/images/photoreal-female/02-head-profile-right.png']`
- **Regeneration Justification:** User inspection and visual audit of Call `#04` revealed that the neck was twisted `~45°` toward the camera (showing the front throat pit and both collarbones) because the Pass 1 prompt mentioned collarbones/trapezius without forbidding frontal landmarks. Call `#12` referenced `02-head-profile-right.png` and locked the anterior throat profile to `3 o'clock` and the posterior nuchal line to `9 o'clock` while explicitly forbidding frontal chest/clavicle rotation.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY the neck cylinder of the Singaporean Chinese female athlete from the reference image (facing right toward 3 o'clock, NOT twisted toward the camera). Must be a pure side view of the neck: anterior throat profile line on the right edge (3 o'clock), posterior nuchal neck line on the left edge (9 o'clock), smooth warm Southeast Asian skin tone with flat even lighting across the entire neck width, cropped below the jawline at the top and above the shoulder at the bottom, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

#### Call `#13` — `src/images/photoreal-female/05-torso-racerback-singlet.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/05-torso-racerback-singlet.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Call `#05` (Pass 1) produced a `45°` three-quarter front view showing both shoulder straps and the front chest logo area rather than a true `90°` sagittal profile. Call `#13` enforced a strict `90°` right-facing side profile with the chest contour on the right (`3 o'clock`), upper back on the left (`9 o'clock`), and the white vertical side stripe centered along the lateral ribcage.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY the armless torso of the Singaporean Chinese female sprinter from the reference image (facing strictly right toward 3 o'clock, NOT twisted toward the camera, zero front-chest perspective). Pure side profile: chest/bust profile on the right edge (3 o'clock), upper back/scapula profile on the left edge (9 o'clock), wearing the fitted crimson-red (#B81D24) racerback singlet with the single vertical white side panel visible right down the middle of the side view, small strip of toned waist skin at the bottom, NO arms, NO head, NO neck, NO shorts. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

#### Call `#14` — `src/images/photoreal-female/06-pelvis-sprinter-shorts.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/06-pelvis-sprinter-shorts.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Call `#06` (Pass 1) twisted the shorts `~45°` toward the viewer so both leg openings were visible. Call `#14` constrained the view to a pure `90°` right-facing side profile showing only the right hip side, a single vertical white side stripe down the center (`6 o'clock`), the anterior abdomen profile on the right (`3 o'clock`), and the rounded glute curve on the left (`9 o'clock`).
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY the pelvis/hip section in charcoal-black (#1C2026) sprinter shorts from the reference image (facing strictly right toward 3 o'clock, NOT twisted toward the camera, showing ONLY the right hip side view with a single vertical white side stripe down the center). Anterior lower-abdomen/hip profile on the right edge (3 o'clock), rounded gluteal profile on the left edge (9 o'clock), single leg opening at the bottom, NO torso above waistband and NO legs below hem. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

#### Call `#15` — `src/images/photoreal-female/07-near-right-arm-lateral-outside.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/07-near-right-arm-lateral-outside.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Call `#07` (Pass 1) had a strong directional shadow along the posterior triceps edge that rotated with the bone during animation, creating a dark longitudinal seam. Call `#15` enforced flat, even studio illumination across the entire lateral right arm width while locking the anterior biceps to `3 o'clock` and dorsal knuckles to the bottom.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY the isolated bare RIGHT arm of the Singaporean Chinese female sprinter from the reference image, viewed from the OUTSIDE (lateral side of the right arm, facing right toward 3 o'clock). Hanging straight vertically from the rounded lateral deltoid shoulder cap at top (12 o'clock), anterior biceps contour on the right edge (3 o'clock), posterior triceps contour on the left edge (9 o'clock), sky-blue (#2898D8) terrycloth wrist sweatband, and closed runner's fist at bottom (6 o'clock) showing the flat outside dorsal back of the right hand with thumb on the right (3 o'clock). Flat even studio illumination with NO harsh side shadows, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

#### Call `#16` — `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Call `#08` (Pass 1) had dark side-shadow grooves and a twisted forearm. Call `#16` requested flat, even lighting and a strict `90°` medial side profile of the vertical left arm.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY the isolated bare LEFT arm of the Singaporean Chinese female sprinter from the reference image, viewed from the INSIDE (medial side of the left arm, facing right toward 3 o'clock). Hanging straight vertically from the rounded inner shoulder cap at top (12 o'clock), anterior biceps contour on the right edge (3 o'clock), posterior triceps contour on the left edge (9 o'clock), sky-blue (#2898D8) terrycloth wrist sweatband, and runner's lightly curled fist at bottom (6 o'clock) showing the INSIDE palmar side of the left hand (curled fingers and inner palm facing the camera, thumb on the right edge at 3 o'clock). Flat even studio illumination with NO harsh side shadows, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

#### Call `#17` — `src/images/photoreal-female/09-near-right-leg-lateral-outside-shoe.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/09-near-right-leg-lateral-outside-shoe.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Call `#09` (Pass 1) had an oblique three-quarter view of the knee and shoe plus a dark posterior hamstring shadow. Call `#17` enforced a strict `90°` lateral side profile with flat studio lighting across the thigh and calf and a pure side-view marathon shoe pointing right (`3 o'clock`).
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY the isolated bare RIGHT leg and right running shoe of the Singaporean Chinese female sprinter from the reference image, viewed from the OUTSIDE (lateral side, facing strictly right toward 3 o'clock, NOT twisted toward camera). Vertical leg: anterior quadriceps/kneecap/shin profile on the right edge (3 o'clock), posterior hamstring/calf profile on the left edge (9 o'clock), white ankle sock, and white-and-crimson marathon running shoe pointing strictly right (3 o'clock) showing the outside lateral swoosh wall. Flat even studio illumination across the entire leg width with NO dark side shadow, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

#### Call `#18` — `src/images/photoreal-female/10-far-left-leg-medial-inside-shoe.png` (Regeneration #1)
- **Target File:** `src/images/photoreal-female/10-far-left-leg-medial-inside-shoe.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Call `#10` (Pass 1) had a dark shadow groove along the inner calf and slight perspective rotation on the shoe. Call `#18` enforced a strict `90°` medial side profile with flat studio illumination and a pure side-view left shoe pointing right (`3 o'clock`) showing the sculpted inner arch wall.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY the isolated bare LEFT leg and left running shoe of the Singaporean Chinese female sprinter from the reference image, viewed from the INSIDE (medial side, facing strictly right toward 3 o'clock, NOT twisted toward camera). Vertical leg: anterior quadriceps/kneecap/shin profile on the right edge (3 o'clock), posterior hamstring/calf profile on the left edge (9 o'clock), smooth inner thigh and medial calf with flat even studio illumination and NO dark shadow grooves, white ankle sock, and white-and-crimson marathon running shoe pointing strictly right (3 o'clock) showing the inside medial arch support wall. Isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

---

### 9.3 Pass 2b — Same-Turn Refinement of `05` Torso Armhole Cut & `08` Far Left Arm (`Calls #19` – `#20`)

#### Call `#19` — `src/images/photoreal-female/05-torso-racerback-singlet.png` (Regeneration #2)
- **Target File:** `src/images/photoreal-female/05-torso-racerback-singlet.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Upon inspecting Call `#13` via `read_file`, the diffusion model had still included a partial upper right arm hanging down over the crimson singlet's white side panel. If left in the torso cutout, that baked-in arm would appear as a second "ghost arm" whenever `nearUpperArm` swung forward or backward. Call `#19` explicitly requested a tailor's anatomical mannequin torso cut with a clean circular shoulder socket opening facing the viewer (`6 o'clock`) and zero arm attached.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY an armless female athletic mannequin-style human torso wearing the fitted crimson-red (#B81D24) racerback running singlet with a vertical white side panel from the reference image (facing right toward 3 o'clock). The right arm is completely removed at the circular shoulder socket opening so the full side of the crimson singlet and white side stripe are 100% visible and unoccluded. Bust profile on the right edge (3 o'clock), upper back profile on the left edge (9 o'clock), small strip of toned waist skin below the singlet hem, NO arms, NO hands, NO head, NO shorts. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

#### Call `#20` — `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png` (Regeneration #2)
- **Target File:** `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png`
- **Reference `images`:** `['src/images/photoreal-female/01-master-lateral-profile-reference.png']`
- **Regeneration Justification:** Upon inspecting Call `#16` via `read_file`, the elbow crease was facing slightly leftward (`9 o'clock`) instead of rightward (`3 o'clock`). Call `#20` attempted to correct the straight vertical arm by explicitly specifying the elbow flexion crease on the right (`3 o'clock`) and the bony olecranon on the left (`9 o'clock`). However, as analyzed in `§8.2`, keeping the arm in a straight `180°` vertical cylinder with the thumb requested on the right (`3 o'clock`) still resulted in a right arm with a twisted wrist, necessitating Pass 3 (`Call #21`).
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree lateral right-facing orthographic side-profile studio photograph of ONLY a single bare human arm hanging vertically, facing right toward 3 o'clock, matching the skin tone of the reference athlete. Anterior biceps and anterior elbow flexion crease on the RIGHT edge (3 o'clock), posterior triceps and olecranon elbow point on the LEFT edge (9 o'clock), sky-blue (#2898D8) terrycloth wrist sweatband above the wrist, and a lightly curled runner's hand at the bottom (6 o'clock) with the inner palm and curled fingers facing toward the camera and the thumb on the RIGHT side (3 o'clock). Smooth warm Southeast Asian skin tone with flat even studio illumination and NO harsh shadows, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background."`

---

### 9.4 Pass 3 — Chirality-Locked `90°` Sagittal Running L-Bend Regeneration of `08` Far Left Arm (`Call #21`)

#### Call `#21` — `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png` (Regeneration #3)
- **Target File:** `src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png`
- **Reference `images`:** `['src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png']`
- **Regeneration Justification:** User inspection identified that Call `#20` was still generating a **right arm facing the viewer with its palm twisted around** rather than a true **left arm with the inner (medial) surface of the left arm and inner left palm facing the viewer**. Root-cause analysis proved that on a straight (`180°`) vertical hanging arm, asking for the inner palm to face the viewer with the thumb on the right (`3 o'clock`) is anatomically a right hand. Call `#21` solved this permanently by posing the isolated left arm in a **`90°` sagittal running L-bend** (vertical upper arm `12->6 o'clock` bending `90°` forward to the right `3 o'clock` into a horizontal inner forearm and closed left fist with the **inner palm and four curled fingers facing the camera and the thumb resting on top at `12 o'clock`**), locking 3D chirality so only a human left arm can satisfy the geometry.
- **Exact Subsequent Prompt Used:**
  > `"Strict 90-degree sagittal side-profile studio photograph of ONLY the isolated bare LEFT arm of a fit Singaporean Chinese female sprinter (matching the skin tone and sky-blue wristband of the reference image), viewed from the INSIDE (medial surface facing the camera) in a natural 90-degree L-shaped running arm bend facing RIGHT (toward 3 o'clock). ANATOMICAL LAYOUT: (1) The LEFT UPPER ARM hangs vertically on the left side of the frame from the rounded inner shoulder cap at top (10 o'clock) down to the elbow at bottom-left (7 o'clock), showing the smooth inner medial biceps on the right side of the upper arm and triceps/olecranon elbow point at the back-left; (2) At the elbow, the arm bends 90 degrees FORWARD to the RIGHT (toward 3 o'clock) so the LEFT FOREARM extends horizontally to the right, showing the smooth hairless INSIDE (medial/anterior) surface of the left forearm with a sky-blue (#2898D8) terrycloth sweatband at the wrist; (3) At the right end (3 o'clock), the LEFT HAND forms a natural runner's loosely closed fist with the INSIDE OF THE LEFT PALM AND FOUR CURLED FINGERS (index, middle, ring, pinky curled inward) FACING DIRECTLY AT THE CAMERA, and the LEFT THUMB resting naturally along the TOP edge (12 o'clock radial side) pointing right. Because the forearm points right (3 o'clock), the thumb is on top (12 o'clock), and the inner palm/curled fingers face the viewer, this is unmistakably a human LEFT arm viewed from the inner medial side with zero wrist twist. Flat even studio lighting, isolated on a solid pure #FF00FF (RGB 255,0,255) flat magenta chroma-key background with zero shadow."`

---

## 10. Technical Assessment & Reference Implementation: Raster-to-SVG Articulated Element Vectorization & Hierarchical SVG Rig Stitching (`#svg-vector-assessment`) {#svg-vector-assessment}

### 10.1 Executive Feasibility Verdict

**Verdict: Highly Feasible — and Implemented Directly in `src/pipeline/svg-vectorizer.ts` and `src/runner/svg-rig-stitcher.ts`.**

Taking the 17 rounded-end `160 × 160` RGBA articulated cutouts, applying our semicircular pivot-centered rounding mask to round out the ends and edges, converting each element into a standalone SVG vector document (`/public/sprites/photoreal/sg-chinese-female/svg-parts/*.svg`), and stitching them together into a complete animated SVG character (`/public/sprites/photoreal/sg-chinese-female/svg-frames/frame-01..08.svg`) is not only architecturally sound — it provides complementary strengths alongside our per-pixel inverse-warped raster compositor (`src/runner/photoreal-rig.ts`).

---

### 10.2 Architectural Pipeline for Raster-to-SVG Articulated Conversion & Stitching

```
[10 Studio Source PNGs (1408x768 on #FF00FF)]
                   │
                   ▼
[Rounded-End Joint Cutter (`src/pipeline/rounded-joint-cutter.ts`)]
  • Semicircular caps centered at proximal `(80,36)` & distal `(80,124)` pivots
  • Elliptical pivot-arc cuts on `head`, `torso`, and `pelvis`
                   │
                   ▼
[17 Standardized 160x160 RGBA Cutouts (`public/sprites/photoreal/.../parts/*.png`)]
                   │
                   ▼
[Raster -> SVG Vectorizer (`src/pipeline/svg-vectorizer.ts`)]
  1. Outer Silhouette Contour Tracing (`alpha >= 96` left/right hull scan)
  2. 2-Pass Chaikin Corner-Cutting + Closed Quadratic Bézier Spline Fitting (`M ... Q ... Z`)
  3. Analytical `<clipPath id="rounded-mask-{partId}">` Rounding Mask Generation
  4. Perceptual RGB Color Quantization (`quantStep = 24`) + Merged Scanline Subpath Banding
  5. Emits `/public/sprites/photoreal/sg-chinese-female/svg-parts/{partId}.svg`
                   │
                   ▼
[Hierarchical SVG Rig Stitcher (`src/runner/svg-rig-stitcher.ts`)]
  • Back-to-Front Painter Order (`zOrder = 1..17`)
  • Exact 6-Parameter Affine Bone Matrix `transform="matrix(a b c d e f)"`
    mapping `(80, srcStartY) -> start(x1,y1)` and `(80, srcEndY) -> end(x2,y2)`
  • 2-Segment Hinged Rolling Foot (`rearfoot` + `forefoot` SVG sub-groups with
    circular `<clipPath>` hinge centered at `ballPoint` `x = 109`)
  • Emits `/public/sprites/photoreal/sg-chinese-female/svg-frames/frame-01..08.svg`
```

---

### 10.3 Mathematical Formulation of the SVG Stitching Transforms

#### 10.3.1 Rigid & Semicircular-Capped Articulated Segments (`matrix(a b c d e f)`)
For any articulated element whose `160 × 160` SVG cutout has its proximal rotation pivot at $(80, y_{\text{start}})$ and its distal rotation pivot at $(80, y_{\text{end}})$, and which must be placed onto the destination canvas from joint $\mathbf{p}_1 = (x_1, y_1)$ to joint $\mathbf{p}_2 = (x_2, y_2)$ with transverse half-width $W_{\text{dst}}$:

Let $L_{\text{dst}} = \|\mathbf{p}_2 - \mathbf{p}_1\|$, unit bone axis $\hat{\mathbf{u}} = (u_x, u_y) = \frac{\mathbf{p}_2 - \mathbf{p}_1}{L_{\text{dst}}}$, and right-hand unit normal $\hat{\mathbf{n}} = (n_x, n_y) = (-u_y, u_x)$. With transverse scale $s_x = \frac{W_{\text{dst}}}{80}$ and signed longitudinal scale $s_y = \frac{L_{\text{dst}}}{y_{\text{end}} - y_{\text{start}}}$, the exact SVG affine transform matrix is:

$$\begin{bmatrix} X \\ Y \\ 1 \end{bmatrix} = \begin{bmatrix} s_x n_x & s_y u_x & x_1 - 80 s_x n_x - y_{\text{start}} s_y u_x \\ s_x n_y & s_y u_y & y_1 - 80 s_x n_y - y_{\text{start}} s_y u_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x_{\text{src}} \\ y_{\text{src}} \\ 1 \end{bmatrix}$$

Because the proximal and distal ends of the cutout are rounded by `<clipPath id="rounded-mask-{partId}">` into smooth semicircular arcs centered at $(80, y_{\text{start}})$ and $(80, y_{\text{end}})$, any two connected segments sharing joint $\mathbf{p}_{\text{joint}}$ superimpose their circular end caps concentrically over $\mathbf{p}_{\text{joint}}$ at every rotation angle!

#### 10.3.2 Solving the 2-Segment Rolling Foot in Pure Vector SVG
A key question in assessing a Raster-to-SVG rig is: *How do you handle non-rigid 2-segment plantar foot roll (`heelPoint -> ballPoint -> toePoint`) in SVG, since a single `<g transform="matrix(...)">` is globally affine?*

In `src/runner/svg-rig-stitcher.ts` (`buildRollingFootSvgGroup`), we solve this cleanly in pure vector SVG by splitting each vectorized shoe (`nearFoot`, `farFoot`) at the metatarsophalangeal (`ballPoint`, `srcBallX = 109`) joint into **two hinged SVG sub-groups** with complementary semicircular `<clipPath>` arcs:
1. **Rearfoot + Ankle Sub-Group (`x <= 109` + semicircular forward cap `A 28 38 0 0 1 109 160`):** Transformed by the affine matrix mapping `(33, 116) -> heelPoint` and `(109, 116) -> ballPoint`.
2. **Forefoot + Toe Sub-Group (`x >= 109` + semicircular rear cap `A 22 34 0 0 1 109 0`):** Transformed by the affine matrix mapping `(109, 116) -> ballPoint` and `(148, 116) -> toePoint`.

Because both sub-groups anchor `(109, 116)` at the exact same `ballPoint` canvas coordinate and overlap via semicircular `<clipPath>` arcs centered at `x = 109`, the forefoot hinges smoothly through `midfoot-strike`, `sole-roll`, `heel-off-roll`, and `toe-off` in pure SVG without tearing the ankle sock or exposing a wedge gap.

---

### 10.4 Comparative Trade-Off Matrix: Per-Pixel Inverse-Warped Raster vs. Vectorized & Stitched SVG Rig

| Dimension | Per-Pixel Inverse-Warped Raster (`photoreal-rig.ts`) | Vectorized & Stitched SVG Rig (`svg-vectorizer.ts` + `svg-rig-stitcher.ts`) |
|---|---|---|
| **Resolution Independence** | Fixed to target raster buffer (`220 × 256` at `1x`); zooming in shows pixel grid | Infinite mathematical resolution at any zoom (`1x` to `16x+`) with crisp Chaikin Bézier `<clipPath>` edges |
| **Skin & Lighting Continuity** | Preserves every subtle 8-bit photographic pore and continuous skin gradient | Quantizes skin/garments into discrete perceptual tonal bands (`quantStep = 24`), producing a clean "stylized vector / rotoscoped illustration" look |
| **Joint End Rounding** | Semicircular alpha feather (`rounded-joint-cutter.ts`) + isotropic circular cap mapping (`mapLongitudinalWithIsotropicCaps`) | Analytical quadratic Bézier `<clipPath>` silhouette mask + exact affine pivot superposition |
| **2-Segment Foot Roll** | Continuous global heel-to-toe chord `(s, h)` with tent sole deflection `hSole(s)` | Dual hinged SVG `<g>` sub-groups (`rearfoot` + `forefoot`) with overlapping elliptical `<clipPath>` arcs at `ballPoint` (`x = 109`) |
| **Runtime DOM / CSS Inspectability** | Single flat `<canvas>` bitmap | Every anatomical element is an inspectable DOM `<g id="rig-part-{partId}" transform="matrix(...)">` node |

---

## 11. Day-Zero Bootstrap (`R4`) {#day-zero-bootstrap}

| Step | Actor | Surface | Object Populated | Unlock |
|---|---|---|---|---|
| 1 | `[SEED]` | `src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg` & `src/images/photoreal-female/*.png` | `#obj-image-asset` | Provides reference magenta sprite sheet and 10 photorealistic studio source plates |
| 2 | `role:engineer` | `#surf-cli-extract` (`npm run pipeline`) | `#obj-extracted-frame`, `SpriteFlawAnalysisReport`, `#obj-articulated-pose` | Populates `/public/sprites/**` manifests, 17 photorealistic PNG cutouts, 17 SVG vector parts, 8 stitched SVG frames, and 48-frame sprite sheets |
| 3 | `role:viewer` | `#surf-ui-stage` (`npm run dev` on `0.0.0.0:3000`) | Interactive Web App | Full side-by-side animation, persona switcher, PNG & SVG rig inspection, and flaw diagnostics |

---

## 12. Non-Functional Requirements (`#nfr-*`) {#nfr}

- **`#nfr-perf` (`PERF-2`):** Real-time 60 FPS (`<= 16.6 ms` per frame) algorithmic and photorealistic pose + raster synthesis in browser for a `220 × 256` canvas.
- **`#nfr-sec` (`SEC-2`):** Zero external runtime network calls; container runs as unprivileged numeric UID `1001:1001`.
- **`#nfr-a11y` (`A11Y-2`):** Semantic controls with `data-testid="{component-kebab}__{element-role}"` and keyboard-accessible phase scrubbing.

---

## 13. Changelog {#changelog}

| Version | Date | Decision Context | Summary |
|---|---|---|---|
| `1.0.0` | `2026-10-17` | `ADD-001`..`ADD-012` | Initial canonical FDS covering all 6 user deliverables under Greenfield discipline. |
| `2.0.0` | `2026-10-17` | `ADD-013`..`ADD-017` | Expanded to 17-part articulated rig (`neck`, `hairAccessory`), 2-segment rolling foot, forward-fall running posture, photorealistic female persona (`photo-sg-chinese-female`), semicircular rounded-end joint cutter (`rounded-joint-cutter.ts`), and complete end-to-end documentation of element determination, prompt engineering, and left-arm chirality safeguards (`§8`). |
| `3.0.0` | `2026-10-17` | `ADD-018` | Added complete chronological audit log of all 21 historical `generate_image` prompts and regeneration justifications (`§9`, `#image-prompt-log`), plus full technical assessment and reference implementation of Raster-to-SVG articulated element vectorization and hierarchical SVG rig stitching (`§10`, `#svg-vector-assessment`). |
| `3.1.0` | `2026-10-17` | `ADD-019` | Added optional End-Cap Composite Attachment (`EndCapCompositeSpec` & `attachEndCapComposite` in `src/pipeline/rounded-joint-cutter.ts`) so `nearThigh` and `farThigh` carry a proximal sprinter-shorts leg cuff extracted from the base of `pelvisShorts` — rounded at the top hip pivot to gel with the rounded torso/pelvis base and cut straight across at the bottom (`dstStraightCutY = 66`). |

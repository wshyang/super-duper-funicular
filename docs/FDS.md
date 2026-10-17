# Functional Design Specification — Harmonised Greenfield Sprite Motion Lab & Workbench

- **Document Version:** 1.0.0
- **Date:** 2026-10-18
- **Status:** Active Canonical Specification (`[INTENT_ALIGNED]`)
- **Branch:** `arena/db7c86d4-super-duper-funicular` (Harmonised Greenfield rebuild)
- **Upstream Discipline:** `wshyang/greenfield` `GREENFIELD.md` + `FDS_BUILDER.md` v2.0 at `8ba74027be5fad41e48cadde82cc0120d628b109`
- **Tag Conventions:** `#obj-*` / `#feat-*` / `#surf-*` / `#nfr-*`, `[DRAFT — {source}]`, `[CUSTOM: ... because ...]`, `[SEED]`, `[BLOCKED — ...]`, `[ORPHAN-CAPABILITY]`, `#image-prompt-log`, `#continuous-learning-log`, `#n-way-comparison`
- **Session Metrics:** 5 branches inspected, 24-dimension parity matrix adopted, 0 implementation turns yet (Stage 1 — specs)
- **Changelog:** See §15

---

## Table of Contents

1. [Executive Summary](#exec-summary)
2. [Phase Scope Summary](#phase-scope)
3. [Core Objects (`#obj-*`)](#core-objects)
4. [Central Relationship Map](#relationship-map)
5. [Cross-Object Constraints](#cross-constraints)
6. [Surface Inventory (`#surf-*`)](#surface-inventory)
7. [Features (`#feat-*`)](#features)
8. [User Flows](#user-flows)
9. [Day-Zero Bootstrap (`R4`)](#day-zero-bootstrap)
10. [Integrations](#integrations)
11. [End-to-End Engineering Thought Process (§8)](#thought-process)
12. [Complete Image Generation Prompt & Regeneration Justification Audit Log (`#image-prompt-log`)](#image-prompt-log)
13. [Technical Assessment: Raster-to-SVG Vectorization & Hierarchical Stitching](#svg-vector-assessment)
14. [Full-Cycle Frame Dump & Visual Audit Workflow (`#gait-cycle-visual-audit`)](#gait-cycle-visual-audit)
15. [Cross-Branch Comparative Analysis & Continuous Learning Register (`#continuous-learning-log`)](#continuous-learning-log)
16. [N-Way Branch Comparison Summary](#n-way-summary)
17. [Non-Functional Requirements (`#nfr-*`)](#nfr)
18. [Anti-Pattern Register](#anti-patterns)
19. [Changelog](#changelog)
20. [Appendices](#appendices)

---

## 1. Executive Summary {#exec-summary}

**Purpose:** Deliver an end-to-end deduplication, magenta-key sprite extraction, quantitative biomechanical flaw diagnosis, and real-time algorithmic + photorealistic + vector-SVG articulated running synthesis platform, unified across N branches toward **100% feature parity**.

**Primary Actors:**
- `role:engineer` (Game/Animation Engineer) — runs CLI pipeline, inspects audits, calibrates cutters.
- `role:viewer` (Interactive Web Viewer) — drives live workbench, scrubbing, palette/persona/motion switching, PNG exports.

**Core Capabilities (harmonised union):**
- Byte + pixel + perceptual (`dHash64`) dedupe into `/src/images/manifest.json` (pure TS).
- Automated border-flood + interior-island magenta chroma-key on 48 cells (`6×8`, `132 px` header) with purple-jersey preservation onto `220×256` centroid-registered canvases.
- Quantitative flaw report (`94.7%` mean IoU duplication, `0–4 bit` dHash, `+53 px` peg-leg lock, `147 px` min foot gap, `20–25 px` jitter) in `docs/SPRITE_ANALYSIS.md`.
- 17-part articulated rig (`head`, `hairAccessory`, `neck`, `torso`, `pelvis`, 6 arm/hand, 6 leg/foot) with analytical Law-of-Cosines 2-bone IK, contralateral `φ`/`(φ+0.5) mod 1` gait, double-frequency pelvis bounce, `+14°` forward-fall lean, counter-nod gaze stabilisation, and 2-segment plantar foot roll (`midfoot-strike` → `sole-roll` → `heel-off-roll` → `toe-off`).
- Multi-mode locomotion (`run`, `walk` `duty 0.62` zero-flight + double support, `brisk-walk` `duty 0.56`) with motion-parametric contact/stance invariants.
- Photorealistic decomposition: 10 sagittal `#FF00FF` studio plates (`90°` L-bent medial left arm `Call #21` for chirality), semicircular rounded-end cutter + `6 px` Hermite shaft-shoulder blend, material-class matte purge (`isSkin`/`isFabric` `r-g ≥ 96`), Jacobi harmonic ball fill, `<15%` near/far width-parity gate, additive end-cap composites (rounded-top `y=36` straight-bottom `y=66` shorts cuff + shin sock collar).
- Full-colour raster-to-SVG vectorizer (Chaikin Bézier `<clipPath>` + quantized tonal `<path>` bands) + hierarchical 6-parameter affine SVG stitcher with 2-segment foot sub-groups.
- Live React workbench: motion/phase scrubbing, palette/persona/motion switching, skeleton/onion overlays, library & reference strips, joint/hip calibration inspectors (pivot-preserving rotation, before/after, PNG/JSON downloads), and 16-phase 3-panel audit exporter (Light/Dark/Overlay + footer).
- Headless CLI `npm run dump-cycle` full-cycle dumper (16 raw + 16 plates + `4×4` contact sheet + `2×` joint crops + `audit-report.json`) + agent skill `.claude/skills/audit-gait-cycle/SKILL.md`.
- Live N-way parity ledger (`docs/N_WAY_BRANCH_COMPARISON.md` + `npm run branches:compare`) tracking SHA progression across all active `arena/*` branches.

**Surface Count:** 9 CLI + 7 UI = 16 surfaces (see §6). **Phase:** `P1-Core` (single-phase MVP; future `P2` reserved for walking texture-reconstruction canonicalisation and server-side session persistence if needed).

---

## 2. Phase Scope Summary {#phase-scope}

| Phase | Scope | Surfaces & Features |
|---|---|---|
| `P1-Core` | Dedupe, `src/images` filing, magenta extraction, flaw analysis, 17-part algorithmic + photoreal + SVG generation, pure-TS pipeline, multi-locomotion, calibration & audit workbench, live N-way ledger, honest validation, container contract, inert SHIP-HATS | All `#feat-*` + `#surf-cli-*` + `#surf-ui-*` below |
| `P2-Future` *(reserved)* | Canonical texture-reconstruction (vs subtractive masks), toe-independent deformation, automated anomaly metric calibration, male photorealistic persona parity, server-backed auth/session if needed | Deferred, never silently imported |

For each attribute, the phase column is mandatory (FDS_BUILDER D5).

---

## 3. Core Objects (`#obj-*`) {#core-objects}

### 3.1 `#obj-image-asset` — Filed Image Asset (`P1-Core`)

Deduplicated source spritesheet, studio photograph, or backdrop under `/src/images/`.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `filedPath` | `string(max:255)` | `P1-Core` | Required, unique, relative to repo root | Must start with `src/images/` and end with `.png` or `.jpeg` | "Asset path must reside inside src/images/ with a .png or .jpeg extension." |
| `assetCategory` | `enum('spritesheet-reference','spritesheet-algorithmic','photo-studio-plate','backdrop')` | `P1-Core` | Required | One of 3+1 categories | "Unsupported asset category." |
| `pixelSha256` | `string(len:64)` | `P1-Core` | Required, lowercase hex | SHA-256 of `width×height:RGBA` buffer | "Invalid pixel buffer SHA-256." |
| `dHash64` | `string(len:16)` | `P1-Core` | Required, lowercase hex | 64-bit horizontal luma gradient `9×8` hash | "Invalid 64-bit dHash." |
| `status` | `enum('active','deprecated')` | `P1-Core` | Required | `active` if first canonical hash, else `deprecated` | "Asset status must be active or deprecated." |

States: `active` → `deprecated` (on duplicate hash; no hard delete). Edge: 1×1 min raster; path traversal blocked; atomic manifest write; pure-JS decoders only.

### 3.2 `#obj-extracted-frame` — Extracted Sprite Cutout (`P1-Core`)

One character cell registered on `220×256` RGBA at centroid `(110,132)`.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `variant` | `enum('red','blue','green','yellow','purple','orange')` | `P1-Core` | Required | 6 canonical rows | "Unknown runner color variant." |
| `frameIndex` | `integer(1..8)` | `P1-Core` | Required | `1≤frameIndex≤8` | "Frame index must be 1..8." |
| `publicUrl` | `string(max:255)` | `P1-Core` | Required | Starts `/sprites/extracted/` | "Extracted public URL must begin with /sprites/extracted/." |
| `isDuplicateInRow` | `boolean` | `P1-Core` | Required | `true` if centroid IoU ≥0.78 with earlier frame in row | "Duplicate flag required." |

### 3.3 `#obj-articulated-pose` — 17-Part Articulated Runner Pose (`P1-Core`)

Solved 2D joint hierarchy at normalized phase `φ∈[0,1)`.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `phase` | `number[0,1)` | `P1-Core` | Required | Normalized `((raw%1)+1)%1`, finite | "Phase must be finite in [0,1)." |
| `canonicalFrameIndex` | `integer(0..7)` | `P1-Core` | Required | `floor(((phase+0.0625)%1)*8)` | "Canonical frame 0..7 required." |
| `neck` | `{base,top,tiltRad,headAngleRad,hairAngleRad}` | `P1-Core` | Required | Cervical column `collar→headPivot` with counter-nod | "Neck articulation required." |
| `nearLeg` | `LimbKinematics` | `P1-Core` | Required | IK at `φ`, `bendDirection:'knee-forward'`, 2-segment foot roll | "Near leg IK failed." |
| `farLeg` | `LimbKinematics` | `P1-Core` | Required | IK at `(φ+0.5)%1` | "Far leg IK failed." |
| `locomotionMode` | `enum('run','walk','brisk-walk')` | `P1-Core` | Required | One of 3 locomotion modes | "Locomotion mode required." |

Empty states: loaded / zero-permission (future) / zero-day-zero (before `npm run pipeline`) / loading-error (see Day-Zero §9).

### 3.4 `#obj-photo-plate` — Studio Photographic Plate (`P1-Core`)

One view-specific `#FF00FF` magenta-backed studio photograph producing registered parts.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `plateId` | `string(max:64)` | `P1-Core` | Required, unique | Matches `sg-chinese-{female,male}__{view}__chroma-{color}__source` | "Plate ID malformed." |
| `viewCoverage` | `enum('neutral-profile','far-arm-medial','far-leg-medial','far-lower-leg-medial','torso-only')` | `P1-Core` | Required | Covers chirality + medial surfaces | "View coverage required." |
| `sourceSha256` | `string(len:64)` | `P1-Core` | Required | Pixel-buffer SHA of plate | "Invalid plate pixel hash." |

### 3.5 `#obj-svg-part` — Vectorized Articulated Part (`P1-Core`)

Standalone SVG vector document for one articulated element via Chaikin-smoothed `<clipPath>` + quantized tonal paths.

| Attribute | Type | Phase | Constraints | Validation Rule | Error Message |
|---|---|---|---|---|---|
| `partId` | `enum('torso','head','neck','hairAccessory','pelvis','nearUpperArm','nearForearm','nearHand','farUpperArm','farForearm','farHand','nearThigh','nearShin','nearFoot','farThigh','farShin','farFoot')` | `P1-Core` | Required | 17 values | "Invalid articulated part ID." |
| `svgDocumentUrl` | `string(max:255)` | `P1-Core` | Required | `/sprites/photoreal/.../svg-parts/*.svg` | "SVG document URL required." |

---

## 4. Central Relationship Map {#relationship-map}

| Object A | Cardinality | Object B | Relationship Name | Constraints | Data-Carrying? | Surface Coverage |
|---|---|---|---|---|---|---|
| `#obj-image-asset` | `1 : N` | `#obj-extracted-frame` | `yields-extracted-frames` | 1 sheet `2528×1696` yields 48 frames (6×8) | No | Create: `#surf-cli-extract`, List: `#surf-ui-diagnostics` |
| `#obj-image-asset` (`photo-plate`) | `1 : N` | `#obj-photo-plate` | `sources-plates` | 10 plates per photoreal persona | No | Create: `generate_image`, List: `#surf-ui-library` |
| `#obj-photo-plate` | `1 : N` | `#obj-extracted-frame` (photo) | `yields-photo-cutouts` | 1 plate yields ≥1 part via matte/cutter | No | Create: `#surf-cli-photo-extract` |
| `#obj-articulated-pose` | `1 : 17` | `#obj-svg-part` | `articulates-body-parts` | 17 layers back-to-front `zOrder 1..17` | No | Create: `#surf-cli-generate`, List: `#surf-ui-rig-inspector` |
| `#obj-extracted-frame` (photo) | `N : M` | `#obj-articulated-pose` | `poses-photo-rig` | Junction as first-class `PhotoRigInstance` with `phase`, `persona`, `palette` | Yes | Create/List/Remove/Inverse: `#surf-cli-generate`, `#surf-ui-stage` |
| Persona | `1 : N` | `#obj-photo-plate` | `persona-owns-plates` | Each photoreal persona owns ≥10 plates | No | Create: `generate_image` |

All N:M or data-carrying links declare Create/List/Remove/Inverse-view surfaces per R1.

## 5. Cross-Object Constraints {#cross-constraints}

1. **Contralateral gait invariant:** `farLeg.phase = (nearLeg.phase + 0.5) % 1` within `1e-9`; violation → two legs identical is not running.
2. **Ground-contact invariant:** During stance, foot `soleY` clamped to `groundY`; swing minimum clearance `> 4 px`; walking `walk`/`brisk-walk` retain double support (`support=2` for some phases) and zero flight.
3. **Pixel parity:** `public/sprites/**` must reproduce byte-for-byte via `npm run pipeline`; manifests must list every PNG that exists and no file unlisted.
4. **Cutter pivot preservation:** Rounded-end cut preserves source dimensions and IK pivot; registered centroid `(110,132)` survives cut + matte + stitch.
5. **Photoreal completeness:** `isCompletePhotorealBank(persona)` requires all 17 parts; partial banks expose `'error'` state and gate exports (Stride Lab all-or-nothing invariant).
6. **Matte spill freedom:** After `purgeSkinPartFabricSpill`, bright-singlet pixel count on `skin`-class parts (`isSkin`) is `0`; width-parity gate `<15%` vs near limb.

---

## 6. Surface Inventory (`#surf-*`) {#surface-inventory}

| # | Surface | Anchor | Roles | Object/Relationship | CRUD/Associate | Phase |
|---|---|---|---|---|---|---|
| 1 | CLI Dedupe & File | `#surf-cli-dedupe` | `role:engineer` | `#obj-image-asset` | Create/Update | `P1-Core` |
| 2 | CLI Sprite Extractor (48-frame) | `#surf-cli-extract` | `role:engineer` | `#obj-extracted-frame` | Create | `P1-Core` |
| 3 | CLI Photo Rig Extractor | `#surf-cli-photo-extract` | `role:engineer` | `#obj-photo-plate` → photo cutouts | Create | `P1-Core` |
| 4 | CLI Flaw Analyser | `#surf-cli-analyse` | `role:engineer` | `SpriteFlawAnalysisReport` | Create | `P1-Core` |
| 5 | CLI Algorithmic / Photoreal / SVG Generator | `#surf-cli-generate` | `role:engineer` | `#obj-articulated-pose` + `#obj-svg-part` | Create | `P1-Core` |
| 6 | CLI Full-Cycle Dumper | `#surf-cli-dump-cycle` | `role:engineer` | Audit artefacts | Create | `P1-Core` |
| 7 | CLI N-Way Branch Compare | `#surf-cli-branches-compare` | `role:engineer` | `BranchTips` ledger | Create/List | `P1-Core` |
| 8 | Web Live Stage & Phase Scrub | `#surf-ui-stage` | `role:viewer` | `#obj-articulated-pose` + `#obj-extracted-frame` | List/Associate | `P1-Core` |
| 9 | Web Persona / Palette / Motion Picker | `#surf-ui-picker` | `role:viewer` | Persona + palette + locomotion | List/Associate | `P1-Core` |
| 10 | Web Transport & Playback Controls | `#surf-ui-transport` | `role:viewer` | `#obj-articulated-pose` | Read | `P1-Core` |
| 11 | Web Reference / Library / Flaw Diagnostics | `#surf-ui-diagnostics` | `role:viewer` | `#obj-extracted-frame` + report | List | `P1-Core` |
| 12 | Web Joint / Hip Cutter Calibration Inspector | `#surf-ui-cutter` | `role:viewer` | Photo plate cutouts | Update (mask) + Download | `P1-Core` |
| 13 | Web Joint & Cycle Audit Panel | `#surf-ui-audit` | `role:viewer` | Audit report + 16-phase PNG | Create/Export | `P1-Core` |
| 14 | Web Skeleton Overlay & Asset Readiness | `#surf-ui-overlay` | `role:viewer` | Rig state + error/retry | Read | `P1-Core` |

All capabilities reachable by a surface; orphan check `R5` required at deep-dive exit.

---

## 7. Features (`#feat-*`) {#features}

### #feat-dedupe — Byte + Pixel + Perceptual Deduplication (`P1-Core`)

- **Objects:** `#obj-image-asset`
- **Preconditions:** `incorrect running sprites.jpeg` present at repo root or already filed in `src/images/`; pure-TS decoders available.
- **User Story:** As `role:engineer`, I relocating the root JPEG, deduplicate by byte-SHA + RGBA-SHA + `dHash64`, and file into `src/images/spritesheets/*.jpeg|png` + `src/images/backdrops/*.png` + `src/images/manifest.json` so derived assets reference stable content hashes.
- **BDD:**
  - Given: `incorrect running sprites.jpeg` at root; When: `npm run dedupe`; Then: file moves to `src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg` and manifest lists it with `status:active`.
  - Given: identical byte hash already cataloged; When: re-dedup; Then: second entry marked `deprecated` with `supersededBy` pointer.
  - Given: empty/invalid image; When: decoded; Then: error "Invalid image bytes".

### #feat-extract — 48-Frame Magenta-Key Sprite Extraction (`P1-Core`)

- **Objects:** `#obj-extracted-frame`
- **Rules:** Auto-detect `132 px` header + `6×8` divider peaks on `#FF00FF`; border-seeded flood (`R≥205,B≥198,R-G≥95,B-G≥90,|R-B|≤45`) + interior island (`R≥218,B≥215,R-G≥112`) + 1 px despill; purple jersey (`~128,51,157`) preserved; centroid `(110,132)` on `220×256` (+ `308×258` compatibility where historically used).
- **Verification:** Real JPEG decode in tests; `manifest.json` lists 48 entries; silhouette IoU gating verifies `0.78` duplicate threshold.

### #feat-analyze — Quantitative Biomechanical Flaw Analysis (`P1-Core`)

- **Objects:** `SpriteFlawAnalysisReport` (5 flaws)
- **Flaws:** `FLAW-01` half-cycle duplication (`94.7%` IoU, `0–4 bit` dHash, 4 unique of 8), `FLAW-02` peg-leg (`frontFootOffsetX>+53px` locked), `FLAW-03` zero crossover (`minFootSeparation=147px`), `FLAW-04` jitter (`Δh 20px`, baseline `25px`), `FLAW-05` two-tone `#FF00FF`/`#FD49FD` + JPEG spill. See `docs/SPRITE_ANALYSIS.md`.

### #feat-algorithmic-runner — 17-Part Algorithmic Runner Engine (`P1-Core`)

- **Objects:** `#obj-articulated-pose`, kinematic `LimbKinematics` + `FootRollKinematics`
- **Sub-features:** Articulated cervical `neck` + counter-nod, 2-segment foot roll (midfoot→sole→heel-off→toe-off via `heelPoint/ballPoint/tipPoint`), `+14°` forward lean + double-frequency surge, analytical 2-bone IK (`bendDirection:'knee-forward'`), contralateral gait `(φ+0.5)%1`, double-frequency pelvis bounce, pluggable persona hooks.

### #feat-photoreal-rig — Photorealistic Photographic Rig (`P1-Core`)

- **Objects:** `#obj-photo-plate` + 17 cutouts + cutter/matte invariants
- **Notes:** 10 sagittal plates (`08-far-left-arm-medial-inside-palm.png` is `90°` L-bend to lock chirality, Call #21); rounded-end cutter `cutArticulatedLimbWithRoundedEnds` on `160×160` with `6 px` Hermite shaft-shoulder blend; material-class purge (`purgeSkinPartFabricSpill`, `r-g≥96` preserves SE Asian warm skin); Jacobi harmonic ball fill; width-parity `<15%`; additive end-cap composite `attachEndCapComposite` (rounded-top `y=36`, straight-bottom `y=66` shorts cuff + shin sock collar).

### #feat-svg-vectorizer — Raster-to-SVG Vectorizer & Stitcher (`P1-Core`)

- Chaikin quadratic Bézier `<clipPath>` rounding + quantized tonal `<path>` bands per part + `matrix(a b c d e f)` affine stitch in Z-order (`1..17`) with hinged `nearFoot-rearfoot/forefoot` groups.

### #feat-walking-profiles — Multi-Mode Locomotion (`run`/`walk`/`brisk-walk`) (`P1-Core`)

- `walk` `duty 0.62` zero flight + double support, `brisk-walk` `duty 0.56` shorter double-support, same bone/photo/SVG contracts; independent session tuning per motion, instant switch.

### #feat-web-studio — Interactive Web Studio Workbench (`P1-Core`)

- Live 60 FPS Canvas stage with pause/step/scrub, palette/persona/motion pickers, skeleton/onion overlays, reference/original vs procedural comparison, library strip, flaw diagnostics, cycle audit exporter, calibration inspectors with isolated pivot-rotation preview, assembled-joint comparison, PNG/JSON downloads, and all-or-nothing asset readiness (`pending`/`ready`/`error` + retry).

### #feat-n-way-ledger — Live N-Way Parity Ledger (`P1-Core`)

- `npm run branches:compare` → `docs/BRANCH-TIPS.json` + `docs/BRANCH-HISTORY.json` + `docs/N_WAY_BRANCH_COMPARISON.md` (mirrors for compat); 24-dimension parity matrix + FDS (§5) + discipline (§6) comparison + adoption queue + append-only progress log; preserves local strengths, never alters sibling branches.

---

## 8. User Flows {#user-flows}

### Flow 1 — Engineer bootstraps from empty DB to live studio (Happy Path)

1. Clone repo; verify `incorrect running sprites.jpeg` at root.
2. `npm install` → `npm run pipeline` (`dedupe` + `extract` + `analyse` + `generate-sheets`) populates `src/images/manifest.json` + `public/sprites/**`.
3. `npm run typecheck && npm test && npm run build` green.
4. `npm run dev` on `0.0.0.0:3000`; open viewer; verify stage scrubs `φ 0→1`, persona switches, palette switches, motion switches, skeleton overlay toggles, library populated.

Postconditions: All 48 sprites, 17 algorithmic parts, flaw report, and algorithmic sheets exist; manifests reproducible.

### Flow 2 — Viewer calibrates photographic joint (Alternate)

Trigger: photographic persona selected. Precondition: `isCompletePhotorealBank(persona)` or `'error'` surfaced.

Steps: Open calibration panel → adjust proximal/distal endpoints → preview isolated rotation + assembled joint → download PNG + JSON → settings apply to live render + audit export; comparison/guides are inspector-only; source files untouched; session-only unless downloaded.

Exception: partial bank → export gated, error shown, retry offered.

### Flow 3 — Engineer audits visual quality (Audit Skill)

1. Run `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red`.
2. Open `contact-sheet-16frame.png` + `joint-crops-sheet.png` + 4 extreme-pose plates via `read_file`.
3. Note `detachedIslands`, `magentaSpill`, joint gaps in `PLAN.md` + `docs/FDS.md#gait-cycle-visual-audit`; propose `RECT-NN`.

---

## 9. Day-Zero Bootstrap (`R4`) {#day-zero-bootstrap}

| Step | Actor | Surface | Object Populated | Unlock |
|---|---|---|---|---|
| 0 | `[SEED]` | File system | `incorrect running sprites.jpeg` (root) + `/src/images/manifest.json` seed entries | Provides flawed reference sheet |
| 1 | `role:engineer` | `#surf-cli-dedupe` (`npm run dedupe`) | `#obj-image-asset` (filed sheet + algorithmic sheet + 3 backdrops) | Stable hashed source of truth |
| 2 | `role:engineer` | `#surf-cli-extract` | `#obj-extracted-frame` (48) + extracted manifest | Registered cutouts available |
| 3 | `role:engineer` | `#surf-cli-analyse` | `SpriteFlawAnalysisReport` | Quantitative flaw proof |
| 4 | `role:engineer` | `generate_image` ×10 + `#surf-cli-photo-extract` | `#obj-photo-plate` (10) + 17 photo cutouts | Photoreal rig bank |
| 5 | `role:engineer` | `#surf-cli-generate` | `#obj-articulated-pose` sheets + `#obj-svg-part` (17) + stitched SVG frames (8) | Algorithmic + photoreal + SVG outputs |
| 6 | `role:viewer` | `#surf-ui-stage` (`npm run dev`) | Live workbench | 60 FPS scrub + inspections + exports |
| 7 | `role:engineer` | `#surf-cli-dump-cycle` + `#surf-cli-branches-compare` | Audit artefacts + `BRANCH-TIPS.json` + ledger | Visual QA + parity convergence |

If any `generate_image` fails, `src/images/photo/**` plate for that view remains `[BLOCKED — plate missing]`; regeneration justification required.

---

## 10. Integrations {#integrations}

| Provider | Purpose | Auth | Endpoints / Pseudo-Schema | Failure Matrix | Fallback |
|---|---|---|---|---|---|
| `generate_image` (AI Studio Plates) | Create 10 `#FF00FF` sagittal studio plates | Agent tool (sandbox) | Prompt + `file_path` + `images[]` → PNG | Plate malformed / chirality wrong / harsh shadows → regenerate with constraint, never fabricate prompt | Log exactly, preserve prior entries, retry with tighter constraints |
| `jpeg-js` / `pngjs` | Decode/encode sheet & cutouts | None (npm) | `decode(buffer)` → `RGBA` ; `encode(RGBA)` → PNG bytes | Non-image bytes → reject; truncated JPEG → error message | Pure-TS only (no native addon) |
| `@napi-rs/canvas` | Node canvas rasterisation for dump-cycle / tests | None (npm) | `createCanvas(w,h) → ctx` | Canvas unavailable in sandbox subset → mark `VALIDATION.md` caveat | Use `pngjs` raster path for manifests |

---

## 11. End-to-End Engineering Thought Process (§8) {#thought-process}

- **Decomposition into 17 parts:** Determined by kinematic necessity (each joint that rotates needs its own pivot). `head` needs gaze stabilisation → split `neck`; `hairAccessory` needs secondary whip → separate; `pelvis` + `torso` split shorts hem; 6 arm/hand + 6 leg/foot cover all rotational DoFs; two-segment foot captures plantar roll.
- **Why single-profile reuse fails:** Lateral near-limb (outside) vs medial far-limb (inside) have optically asymmetric silhouettes (e.g., biceps lateral bulge vs medial crease; outer thigh vs inner thigh with short hem). Reusing the lateral texture as medial creates chirality illusion and width-pinching.
- **`90°` sagittal L-bend solution:** The left (far) forearm was re-shot with `90°` elbow flexion (upper arm horizontal, forearm vertical) so the palm faces the viewer (inner palm + 4 curled fingers + thumb at 12 o'clock), eliminating the straight-cylinder right-palm illusion observed in earlier `0°` straight-arm renders.

## 12. Complete Image Generation Prompt & Regeneration Justification Log (`#image-prompt-log`) {#image-prompt-log}

> **Harmonised history:** This branch inherits the 21-call provenance model from Sprite Motion Lab (`Calls #01–#21` verbatim in `docs/FDS.md §9` of `arena/917ef347`). **No images have been generated yet on this harmonised branch** (`arena/db7c86d4`). Historical prompts below are credited to their origin; entries for new calls on this branch will be appended in chronological order with exact verbatim prompts and regeneration justifications.

| Call | Target `file_path` | Prompt (verbatim or attribution) | Justification |
|---|---|---|---|
| — | `src/images/photo/sg-chinese-female__neutral-profile__chroma-green__source.png` *(P1 ancestral)* | `[HISTORICAL — arena/917ef347 Calls #01–#10 Pass 1 + Calls #11–#20 Pass 2]` — 10 sagittal plates on pure `#FF00FF` magenta, sagittal profile running pose, studio softbox lighting; see `arena/917ef347 docs/FDS.md §9` for exact prompts | Attributed to `arena/917ef347` `5c48767`; not reconstructed here — inspect `git show arena/917ef347:docs/FDS.md` for verbatim strings |
| #21 | `src/images/photo/sg-chinese-female__far-left-arm-medial__chroma-green__source.png` → `far-left-arm-medial-inside-palm.png` | `[HISTORICAL — arena/917ef347 Call #21]` — `90°` L-bent medial left arm, inner palm facing viewer, 4 curled fingers + thumb at 12 o'clock, sagittal view, pure `#FF00FF` backdrop | Fixes straight-cylinder chirality illusion where right palm was inferred from a straight arm; see origin FDS `§8.3` |
| *Next* | *(to be logged)* | Every future `generate_image` on this branch MUST append its exact verbatim prompt, `file_path`, reference `images`, and (if regeneration) prior-defect + prompt fix | Enforced by `CLAUDE-decisions.md §2` + `greenfield-gate.test.ts` |

Full verbatim log lives in `docs/PHOTO-PROMPTS.md` (plate-by-plate) with `src/images/photo/**` provenance.

## 13. Technical Assessment: Raster-to-SVG Vectorization & Stitching (`#svg-vector-assessment`) {#svg-vector-assessment}

**Assessment:** Raster pipeline produces `160×160` RGBA cutouts with semicircular caps; vector pipeline must preserve cap curvature without stair-stepping.

- **Vectorizer** (`src/pipeline/svg-vectorizer.ts`): Chaikin quadratic Bézier smoothing of the cutout alpha boundary → `<clipPath id="clip-{partId}">` + quantized tonal `<path>` layers (12 colour bands) inside clipped group. Guarantees `clipPath` curvature matches `rounded-joint-cutter.ts` `r = halfWidth`.
- **Stitcher** (`src/runner/svg-rig-stitcher.ts`): Back-to-front Z-order `1..17` via SVG 6-parameter affine `matrix(a b c d e f)` per part, with hinged `nearFoot-rearfoot` / `nearFoot-forefoot` groups (`matrix` on each). Validates viewBox and pivot alignment against `src/lib/vector/trace.ts` Marching-Squares IoU `≥0.985`.

Branch 3's `trace.ts` silhouette-IoU gate adopted as fidelity metric; Branch 2 has no SVG pipeline (raster-only) — documented in parity matrix.

## 14. Full-Cycle Frame Dump & Visual Audit (`#gait-cycle-visual-audit`) {#gait-cycle-visual-audit}

**Workflow:** `npm run dump-cycle -- /tmp/gait-cycle-audit 16 <persona> <palette>` → 16 raw frames + 16 `audit-frame-XX-deg-YYY.png` (Light | Dark | Joint Overlay) + `contact-sheet-16frame.png` (4×4) + `joint-crops-sheet.png` (2× joints) + `audit-report.json` (`{ detachedIslands, magentaSpill, uncoveredJoints, frameCount }`). Complemented by browser `JointAndCycleAuditPanel` (`data-testid="joint-audit-panel"`) with isolated pivot rotation + assembled inspection + 16-phase PNG export.

Known 2D limitation: independent cutouts have garment-skin seams and lighting deltas; audit exposes but does not erase them. No `detachedIslands=0` means "no zero-alpha holes in rendered composite", not "no visible seam".

## 15. Cross-Branch Comparative Analysis & Continuous Learning Register (`#continuous-learning-log`) {#continuous-learning-log}

### TURN-L01 · 2026-10-18 · Harmonised Greenfield & N-Way Parity Establishment

- **Context & Trigger:** User requested adoption of `wshyang/greenfield` discipline, evaluation of all unmerged PR branches, extraction of their strengths into our FDS, synthesis of a merged `CLAUDE.md` discipline, and construction of a live N-way parity ledger with continuous-learning codification toward 100% feature parity. Stage 1 (harmonised specs) then Stage 2 (implementation).

- **Evidence & Provenance (read source code):**
  - Queried `gh pr list --repo wshyang/super-duper-funicular --state open` → 3 OPEN PRs: `#1 arena/917ef347` `@e172b0f`, `#2 arena/263385da` `@b227e2f`, `#3 arena/77ffb088` `@43352cf`.
  - `git ls-remote --heads origin` + `git log --all --graph` confirmed `main @396ce25` base and `greenfield @8ba74027be5fad41e48cadde82cc0120d628b109`.
  - Fetched all arena branches: `git fetch origin arena/{917ef347,263385da,77ffb088,ce6d2a6e}`.
  - Inspected via `git show` / `git ls-tree` for each: `CLAUDE.md`, `docs/FDS.md`, `docs/SPEC.md`, `docs/ADDENDA.md`, `docs/THREE_WAY_BRANCH_COMPARISON.md`, `docs/VALIDATION.md`, `package.json`, file trees.
  - Copied upstream discipline verbatim into repo root: `GREENFIELD.md` (27,541 bytes) + `FDS_BUILDER.md` (20K) + `initial-templates/`.

- **Comparison — Strengths Worth Taking (adopted into our harmonised discipline):**
  1. **Modular `CLAUDE-*.md` split (Branch 1 originator, Branch 3 concordant):** 8 focused files per `GREENFIELD.md §0`, each agent `grep`s without loading whole corpus. **Adopted.**
  2. **Mandatory per-turn learning register (all 3 branches, invented independently):** Branch 1 `TURN-L01..L11` depth + greenfield-gate enforcement, Branch 2 `L001/L002` evidence→decision→validation chain, Branch 3 `RIG-QUALITY-PLAN.md` measured failed-experiments. **Adopted: `docs/FDS.md §15` + `CLAUDE-decisions.md §3` + codified in `CLAUDE.md` Core Rule 3.**
  3. **Image-prompt provenance (Branch 1 originator `ADD-018`, adopted by 2+3):** 21-call verbatim log + regeneration justifications, prospective-only honestly for missing history. **Adopted as `CLAUDE-decisions.md §2` + `docs/FDS.md §12` + `docs/PHOTO-PROMPTS.md`.**
  4. **Pure-TS zero-Python pipeline (Branches 1+3):** `jpeg-js` + `pngjs` + `@napi-rs/canvas`, no native binaries, sandboxed/alpine-safe. Branch 2 requires `Pillow/NumPy/SciPy` venv. **Adopted as mandatory binding.**
  5. **Live N-way ledger + `npm run branches:compare` (Branches 1+3 joint evolution):** Branch 1 24-dimension matrix + `CROSS-01..CROSS-12`, Branch 3 `BRANCH-TIPS.json` + `BRANCH-HISTORY.json` automation, Branch 2 timestamp-based latest-selection correctness. **Adopted and extended to N-way (5 tracked branches, 24+ dims) in `tools/compare-branches.ts`.**
  6. **All-or-nothing photoreal bank readiness (Branch 2 originator `photo/assets.ts`, adopted by Branch 1 `CROSS-05`):** Guards export until all 17 parts ready, exposes `'error'` + retry vs null-swallow. **Adopted.**
  7. **Multi-locomotion profiles `run`/`walk`/`brisk-walk` with double support invariants (Branch 2 originator, adopted `CROSS-06`):** `duty 0.62/0.56` zero-flight walking + tests. **Adopted.**
  8. **Material-class matte invariant `isSkin`/`isFabric` purge + Jacobi ball fill + `<15%` width-parity gate (Branch 3 originators, adopted `CROSS-07..CROSS-09`):** `purgeSkinPartFabricSpill` `r-g ≥96`, `fillHollowJointBallByJacobiRelaxation`, `measureNearFarLimbWidthParity`. **Adopted.**
  9. **Headless dump-cycle dumper + joint-crops-sheet + `audit-report.json` integrity checks (Branch 1 originator `ADD-020`, adapted by Branch 2 browser export):** `detachedIslands=0/magentaSpill=0` telemetry + skill `.claude/skills/audit-gait-cycle/SKILL.md`. **Adopted, both CLI + browser panel.**
  10. **Interactive calibration inspectors (Branch 2 originator `EndCutTool`/`HipCutTool`):** Per-part proximal/distal endpoints, pivot-preserving rotation, before/after comparison, PNG/JSON downloads, bounded caches (`32`/`8`). **Adopted.**
  11. **Provenance honesty vocabulary (Branches 1+2+3 convergence `CROSS-10`/`CROSS-12`):** 4-way separation (read code / viewed output / executed gates / other-reported); dedicated `docs/VALIDATION.md`. **Adopted in `CLAUDE-validation.md §8.1` + `docs/VALIDATION.md`.**
  12. **Failed experiments register (Branch 3 `RIG-QUALITY-PLAN.md §1.3` → Branch 1 `PLAN.md §4` `CROSS-11`):** Logs "Do Not Retry As-Is" with measured reasons. **Adopted in `PLAN.md` + `docs/RECTIFICATION_PLAN.md`.**

- **What no single prior branch did perfectly — our harmonised strengths:**
  - **Unified FDS that is simultaneously FDS_BUILDER-complete *and* learning-register-append-only:** Prior branches split the duties (1: unified but heavy, 2: split SPEC/light FDS, 3: index + domain docs). Ours keeps one canonical `docs/FDS.md` with both `#obj/#feat/#surf/#nfr` completeness (§1–§11) and `TURN-LNN` (§15) plus a compat `docs/SPEC.md` alias, so no divergent spec.
  - **N-way automation that does not lose history:** We keep `BRANCH-TIPS.json` live tips + `BRANCH-HISTORY.json` append-only history + `N_WAY_BRANCH_COMPARISON.md` narrative + legacy mirrors, so adding a 6th arena branch is a one-line change to `tools/compare-branches.ts`.
  - **Explicit 2D-vs-3D scope boundary:** We codify that `detachedIslands=0` proves composite integrity, not photographic seamlessness, and retirement of exclusivity claims when peers catch up — preventing "more tests = better visuals" fallacy (noted in both Branch 2+3 learning notes).

- **Adopted / Rectified / Deferred in this Stage 1 commit:**
  - **Adopted:** `GREENFIELD.md` + `FDS_BUILDER.md` at repo root; 8× `CLAUDE-*.md` harmonised; `docs/FDS.md v1.0.0` canonical; `docs/ADDENDA.md ADD-001..ADD-006`; `docs/VALIDATION.md`; `PLAN.md` + `docs/RECTIFICATION_PLAN.md`; `docs/N_WAY_BRANCH_COMPARISON.md` + 3 mirrors + `docs/BRANCH-TIPS.json` seed; `.claude/skills/audit-gait-cycle/SKILL.md`; `Dockerfile*`, `.dockerignore`, `activate-shiphats.sh`, `dev.sh`; `package.json`/`vite`/`tsconfig`/`vitest`/`playwright`; `tools/compare-branches.ts` skeleton.
  - **Deferred (Stage 2):** Full pipeline source (`src/pipeline/**`, `src/runner/**`, `src/lib/**`), workbench views, generated public assets, discipline gate implementation, audit image probes. Deferred ≠ abandoned — tracked in `docs/N_WAY_BRANCH_COMPARISON.md` adoption queue.
  - **Rejected:** Copying Branch 2's Python-only extraction path as primary (kept as optional compat check only, not primary pipeline), and blindly importing Branch 3's plate-space 3× knee crops as gait proof (plate-space metrics ≠ app-fidelity seam proof — codified in FDS §14).

- **Executed Validation (locally executed validation gates):**
  - Stage 1 is spec/discipline/docs only — no compiled source yet. Therefore `npm run typecheck` / `npm test` intentionally deferred to Stage 2 (no claim of passing gates without code). Validation here is **provenance + doc-sync correctness**:
    - `git ls-remote` + `git show` inspections above are **read source code** provenance.
    - No visual audits executed this stage (`read_file` on generated sheets deferred until Stage 2 dumper exists) — stated honestly.
    - `docs/BRANCH-TIPS.json` + `docs/N_WAY_BRANCH_COMPARISON.md` cross-checked against PR list; divergence `e->0`.

- **Next Actions:**
  1. Implement `src/shared/types.ts` + `src/discipline/greenfield-gate.test.ts` to mechanically enforce the standing rules.
  2. Port pipeline stages (`dedupe`, `extract`, `matte`, `rounded-joint-cutter`, `svg-vectorizer`, `svg-rig-stitcher`) from the richest prior branch (`arena/917ef347 @e172b0f`) with harmonised naming (`src/pipeline/` + `src/runner/`).
  3. Re-establish `npm run pipeline` reproducibility and run `audit-gait-cycle` skill on first full-cycle dump to seed `PLAN.md DEFECT-*` rectifications.

---

## 16. N-Way Branch Comparison Summary {#n-way-summary}

Detailed ledger: [`docs/N_WAY_BRANCH_COMPARISON.md`](./N_WAY_BRANCH_COMPARISON.md) (+ `N_WAY_COMPARISON.md`, compat `THREE_WAY_*` mirrors). Snapshot: all 3 active PRs remain **OPEN**; `arena/db7c86d4` is the harmonising 4th active + historic 5th.

---

## 17. Non-Functional Requirements (`#nfr-*`) {#nfr}

| ID | Archetype | Selected Values | Testable Requirement | Acceptance (BDD) |
|---|---|---|---|---|
| `#nfr-perf` | `PERF-2` Interactive `60 FPS` | `16.6 ms/frame` on `220×256` canvas, `≤ 3 ms` IK/pose solve | `npm run dump-cycle` 16 frames each render ≤ `50 ms` headless; browser `requestAnimationFrame` locks `60 FPS` | Given live stage running; When: scrub φ 0→1; Then: no frame skip, `support` telemetry updates per frame |
| `#nfr-sec` | `SEC-2` Zero runtime trust | No external network at runtime; numeric `UID 1001`; provenance-gated | CSP `default-src 'self'`; no `fetch` to external host at runtime; container not root | Given `Dockerfile` build; When: inspected; Then: `USER 1001:1001`, no host fetch |
| `#nfr-a11y` | `A11Y-2` Keyboard + testid | `data-testid` on all controls; focusable scrub/presets | `greenfield-gate.test.ts` scans `src/app/components/**`; Playwright E2E navigates by testid + keyboard | Given workbench loaded; When: `Tab` + `Space` on play toggle; Then: animation starts |
| `#nfr-audit` | `LOG-3` Structured audit | `Vite` dev on `0.0.0.0:3000`, `npm run dump-cycle` artefacts + `audit-report.json` | Audit skill produces contact sheet + crops + JSON | Given gated pipeline; When: post-rig change; Then: `detachedIslands` + visual sheets reviewed |
| `#nfr-scale` | `SCALE-1` Static site | Single-origin static hosting; all sprites pre-generated; no DB scaling | `dist/` is self-contained static bundle; no backend QPS target | Given `npm run build`; When: `serve dist -s -l tcp://0.0.0.0:3000`; Then: all routes respond |

---

## 18. Anti-Pattern Register {#anti-patterns}

| ID | Anti-pattern | Description | Why prohibited | Detection signal |
|---|---|---|---|---|
| `AP-01` | Two-casing hand-written mapper | Adding a second casing translation atop ORM/manifest types | Two truths diverge, field rename becomes runtime `undefined` | `grep mapper` outside `src/shared/types.ts` |
| `AP-02` | Boolean flag parameter | `fn(x, true)` | Obscures intent, branches hidden | Boolean param in AST scan |
| `AP-03` | Presentation JSX with business logic | `.filter` inside `return` | Logic untested, render impure | `greenfield-gate` JSX interior scan |
| `AP-04` | Fabricated historical prompt | Recreating a missing earlier `generate_image` prompt as verbatim | Audit trail falsified | Prompt without `[HISTORICAL — …]` tag |
| `AP-05` | Claimed sibling test results as own | Copying another PR's test counts as locally executed | Provenance fraud | Commit without 4-way provenance label |
| `AP-06` | Plate-space metric as sewn-proof | `3×` knee crop gap ≠ gait seam proof | Diagnostic probe ≠ app fidelity | `CLAUDE-validation.md` audit rule |

---

## 19. Changelog {#changelog}

| Version | Date | Decision Context | Summary |
|---|---|---|---|
| `1.0.0` | `2026-10-18` | `ADD-001`..`ADD-006` + `TURN-L01` | Initial harmonised Greenfield FDS: adopts `wshyang/greenfield` @`8ba74027`, merges best from all 4 arena branches, establishes N-way parity ledger, 17-part rig + 2-segment foot + multi-locomotion + SVG + audit contracts, and per-turn learning discipline. |

---

## 20. Appendices {#appendices}

- **A:** Directive quick ref `D1–D21` — see `FDS_BUILDER.md §3`.
- **E:** Error message templates — see `FDS.md §3` per-object validation rules.
- **F:** NFR archetype index — `SEC-1..7`, `PERF-1..5`, `SCALE-1..5`, `A11Y-1..5`, `LOG-1..5`, `OBS-1..4`.
- **H:** Decision atomicity — each `ADD-NNN` cascades R2/R5/bootstrap rechecks; reversal rolls back atomically (FDS_BUILDER §5.10).

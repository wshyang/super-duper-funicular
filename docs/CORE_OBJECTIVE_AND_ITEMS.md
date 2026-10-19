# Core Objective, Required Items, Acceptance Criteria, Challenges & Mitigations

**Document Version:** 1.0.0  
**Date:** 2026-10-19  
**Branch:** `arena/2c08066e-super-duper-funicular` (PR #10 open)  
**Branches Examined:** `arena/917ef347-super-duper-funicular` (PR #1) @ `96a284f` + `arena/e1300d3c-super-duper-funicular` (PR #8) @ `9d448fe`  
**Exercise History:** PR #1 multi-frame phase harvester (11 frames, 35 jigs @ 0.991/0.845) + PR #8 pose-bank pilot (H01–H08 + X01–X06, custom solved-joint guides) + Current V2 iteration (H03/H06/H07-v2 compact guides, 5 new candidates #91–#95)  
**Companion Documents:** `docs/ACCEPTANCE_CRITERIA.md`, `docs/POSE_VARIATION_FLAW_ANALYSIS.md`, `docs/ITERATION_V2_REPORT.md`  

> **Reading note:** This document is intentionally divided into **five closed sections**. Each section is self-contained and must be fully read before the next is opened. Section 1 distills *what* we are trying to achieve. Section 2 enumerates *what pieces* must exist. Section 3 defines *how we will know each piece is done*. Section 4 explains *why each piece is hard*. Section 5 details *how we will make each piece succeed*. No piece is described across sections — each section completes its job before the next begins.

---

## Section 1 — Core Objective Distilled

### 1.1 One-sentence objective

> **Replace the flawed reference sprite sheet with a deterministic, extractable, photoreal running-motion bank that provides more — and more diverse — limb material for 17-part articulated sprite capture, such that every limb can be harvested at multiple angles with clean chroma-key edges and without animation flicker.**

### 1.2 What “more usable material” means (decomposed)

The original reference sheet `incorrect running sprites.jpeg` (`2528×1696`, `6 rows × 8 cols`) *looks* like 48 frames but fails for capture:

| Flaw in original | Evidence (automated) | Why it blocks capture |
|---|---|---|
| **Only 4 unique poses per row, doubled to 8** | `94.7%` mean half-cycle silhouette IoU, `0–4 bit` dHash difference (`FLAW-01`) | No true motion — half the sheet is duplication; harvesting yields no new angles |
| **Unilateral lead-leg lock** | All rows lead with same leg (+53 px lead offset, zero crossover) (`FLAW-02`) | Gait is non-alternating; you cannot extract contralateral leg angles |
| **Zero leg crossover / 147 px minimum foot gap** | `FLAW-03` | No contact overlap; you cannot cut a proper mid-stance or pass-through |
| **20–25 px baseline & scale jitter** | `FLAW-04/05` | Registration drifts; stitched rig flickers |

**Exercise thus far:** Both PR #1 and PR #8 tried to *vary character poses* to generate more material:

- **PR #1** strategy: *Generate whole-body running keyframes from one master + one pose guide per frame, then harvest limbs spatio-temporally across frames* — leveraged diffusion bias (open-torso) and invented orthogonal bare-limb matrices to force 90°–180° opposite limb angles. Result: **35 harvested `160×160` jigs** (`avgCoreCoverage 0.991`, `avgChromaSeparation 0.845`, zero islands/spill) across 11 frames, but required minimal outfit (sports bra + bikini brief) to expose full thighs.
- **PR #8** strategy: *Generate canonical 8-phase pose bank H01–H08 + targeted inserts X01–X06, all in production outfit (crimson singlet, charcoal shorts, sky-blue wristbands), using high-res solved-joint skeleton guides* — invented custom insert guides (X04 opposed-shin, X05 −41.4° forward/up forearm, X06 149.5° rear/down). Result: **0/8 accepted for harvest** — H03/H06/H07 rejected (generic sprint collapse), 5 conditional (pose coverage only) due to sprint prior + ground-shadow, but proved forearm isolation needs separate guides.

**Synthesised objective:** We do not need *one perfect image*. We need a **bank** (≥8 canonical phases + ≥3 inserts, ≥11 total) where:

1. **Identity is locked** to `src/images/photoreal-female/01-master-lateral-profile-reference.png` (SHA `143b4521…`) so any frame can be mixed without face/outfit pop;
2. **Every limb has ≥2 distinct, isolatable angles** (e.g., thigh horizontal vs vertical + hamstring curl; forearm forward/up vs rear/down vs low-forward; foot midfoot-strike → sole-roll → toe-off → dorsiflex);
3. **Every frame has flat magenta background with crisp shoe edges** so chroma-key cutters (`rounded-joint-cutter.ts`, `phase-frame-harvester.ts`) can extract without spill or shadow healing;
4. **Every generation is traceably logged and audit-gated** (`dump-cycle` 0 islands/spill/uncovered, `harvest-phases` coverage ≥0.985) before any crop overwrites production sprites.

If those four are met, the flawed sheet can be retired and the runner can be rendered at arbitrary phase φ ∈ [0,1) with no duplication, no flicker, and true alternating gait.

**End of Section 1 — Core Objective**

---

## Section 2 — Items Required to Achieve the Objective

Each item below is a *necessary* piece of the bank. Remove any one and the objective cannot be met. For each, we explain *why* it exists and *how* it contributes to “more usable material”.

### I-01 — Locked Identity Master (H00)

**What:** One accepted full-body right-facing profile at 1408×768, immutable, with SHA-256 recorded (`pose-bank.json` identityAnchor). All later generations reference *only* this image + one pose guide.

**Contribution:** Guarantees face, skin tone (warm SE Asian Chinese), black high ponytail, crimson singlet/white stripe, charcoal shorts, both sky-blue wristbands, white socks, white-crimson shoes stay identical across the bank. Without it, diffusion drift creates outfit/face pop when switching phases (PR #8’s wristband-black drift #84 is a direct example). It also gives a scale baseline (crown y, sole y) so the rig’s `AnatomicalRigSpec` stays aligned.

### I-02 — High-Resolution Pose-Control Guides

**What:** 1408×768 diagrams rendered by `renderPoseGuideRaster` (dark head/torso centerline, blue = camera-near limbs, orange = camera-far, dashed ground, joint dots). Replaced the early 220×256 rig renders which PR #8 proved were “not dependable” (H01 ≈ H02 visually).

**Contribution:** Provides the diffusion model with *geometry* instead of *words*. Text “heel slightly lifted” is weak vs the model’s “sprint” prior (F-01). A diagram that draws near shin at 102° vs far shin vertical is unambiguous. Custom V2 guides (H03-v2 stride 0.62, X07 +20°) encode the exact compact toe-off and low-forward forearm angles we need for diversity.

### I-03 — Canonical 8-Phase Gait Set (H01–H08)

**What:** Right-contact (0.00), Right-down (0.125), Right-pass (0.250), Right-flight (0.375), Left-contact (0.500), Left-down (0.625), Left-pass (0.750), Left-flight (0.875) — each at φ and φ+0.5 anti-phase.

**Contribution:** Captures the *temporal cycle* of running: contact → loaded cushion → heel-off/toe-roll → airborne. Without all 8, you lack either grounded or flight material. PR #8 showed that missing H03/H06/H07 left only 5/8 distinct phases → insufficient leg-angle spread (only 4 unique like the flawed sheet). The bank must cover both support and swing for both legs to get alternating gait.

### I-04 — Targeted Visibility Inserts (X-inserts)

**What:** Phase-independent inserts that hold body/legs fixed (usually H02) and vary one limb: X05 −41.4° forward/up forearm, X06 149.5° rear/down, X07 +20° low-forward, X04 opposed-shin legs, etc. Outside canonical gait, but essential for harvest.

**Contribution:** Canonical gait repeats near-torso forearm angles (PR #8 H01–H08 cluster). Inserts *force* rare angles that never appear in running priors — e.g., a forearm visible 8 px outside the torso contour, or a high-knee vs hamstring-curl thigh. PR #1’s orthogonal matrices (0° horizontal arm + 90° vertical thigh + 180° curl) did the same for bare limbs; X-inserts do it in production outfit. Bank needs ≥3 such inserts to achieve “every limb has ≥2 angles”.

### I-05 — Chroma-Key Clean Background & Matte Pipeline

**What:** Flat matte magenta background (`MASTER_MAGENTA` ≈ 249,48,229, tolerance ±18) with no floor, gradient, or contact shadow, plus post-generation healing (`healArmSkinContaminants`) and validation (`background-validator.ts`).

**Contribution:** Sprite capture is a *cutout* operation. If background has soft shadow (PR #8 H01 #73 “conspicuous floor shadow”), the cutter cannot separate shoe sole from magenta — spill contaminates the jig edge and causes purple fringe in `audit-report.json` (`magentaSpill`). Clean background is what makes a frame “harvestable” vs merely “pretty”. PR #1’s heal pipeline removed duplicate cyan wristband and white singlet stripe spill that otherwise failed AC-05.

### I-06 — Limb Isolation & Rounded-End Jig Extraction

**What:** For each of 17 parts (head, neck, torso, pelvis, hairAccessory, 6 arm, 6 leg/foot), a `160×160` canvas with semicircular rounded joint ends about `(80,36)`/`(80,124)` + 6 px Hermite blend + Jacobi-filled joint balls, extracted via `phase-frame-harvester.ts` cross-section sampling (`sampleCrossSectionNormalizedLimb` with right-handed normal + `(+suy,−sux)`).

**Contribution:** This is the *actual usable material* — the 17 jigs stitched by `photoreal-rig.ts` at any φ. A frame is useless if its limbs touch each other or the torso without a background gap: you cannot cut a clean forearm if it overlaps the chest. Hence the 0..3 visibility scoring: only V=3 (isolated with gap) gives a readable pivot for the stitcher. Harvest metrics (`averageCoreCoverage ≥0.985`, `averageChromaSeparation ≥0.75`) quantify “usability”.

### I-07 — Anatomical & Camera Consistency

**What:** 90° orthographic right-facing lateral profile, correct left/right chirality (lateral outside = near in front, medial inside = far behind, 90° L-bend for far arm #21), plausible joint ranges (knee 20°–160°, elbow 30°–170°), and smooth torso-neck-head attachment (no crimson shelf, no mushroom-cap slab).

**Contribution:** Prevents uncanny or rig-breaking material. PR #1’s PIPE-ERR-11..14 regression (sealed shoulder bulge before mirror, flat y=132 head cut, piecewise neck capsule) produced a visible neck step that made *all* 3 personas fail visual audit even though their limbs were otherwise good. Camera consistency (no 3/4 torso turn) ensures the rig’s pelvis-centroid registration (`220×256` canvas) stays stable.

### I-08 — Traceable Prompt Audit & Automated Validation

**What:** Every `generate_image` call logs verbatim prompt, master SHA, guide SHA, output SHA, and visual decision in `docs/FDS.md §9` + `docs/POSE_HARVEST_LOG.md` + `pose-bank.json`/`PHASE_FRAME_COMPLIANCE_LEDGER`; gates `npm test` (55/55), `npm run typecheck`, `npm run build`, `npm run branches:compare`, `npm run harvest-phases` (coverage), `npm run dump-cycle` (16-frame audit: islands/spill/uncovered).

**Contribution:** Without traceability, you cannot know *why* a frame failed or *how* to fix it. PR #1/PR #8’s disciplined logs turned “generic sprint” from a mystery into a diagnosable `IMG-ERR-*` (17–20) with a single-variable fix (e.g., Call #80 changed only shoulder topology and fixed X01). Validation gates prevent regression — the current V2 iteration passed `npm test` only after fixing `<50 LOC` rule and restoring the `60ca653…` provenance hash.

**End of Section 2 — Items Required**

---

## Section 3 — Acceptance Criteria per Item (and How Measured)

Each item’s criteria are independent and must all pass for the bank to be declared “working” (HRG in `ACCEPTANCE_CRITERIA.md`). Measurement instruments are explicit.

### I-01 — Locked Identity Master

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-01.1 Master immutability** | SHA `143b4521c2865a9393a5d332be553ed36659fd408402559296df362958458af6` unchanged; `src/images/photoreal-female/01-master-lateral-profile-reference.png` never overwritten | `sha256sum` + `git diff --check`; `pose-bank.json` identityAnchor |
| **I-01.2 Outfit lock** | Crimson singlet + white vertical stripe, charcoal shorts, **both** sky-blue wristbands, white socks, white-crimson shoes present in every frame; no bikini/bike-short rewrite unless declared bare-limb variant | Visual `read_file` side-by-side vs H00 + heuristic `b>125 && g>100 && b−r>24` for wristband color; `healArmSkinContaminants` check |
| **I-01.3 Single person** | Exactly 1 head, 1 ponytail, 2 arms, 2 legs, no clones/duplicates/fused joints | Visual count; `audit-report.json` detachedIslands |

### I-02 — High-Resolution Pose-Control Guides

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-02.1 Resolution & encoding** | All guides 1408×768, dark=central, blue=near, orange=far, dashed ground, joint dots | `file` dimensions + visual inspection of `guides/skeleton/*.png` |
| **I-02.2 Guide distinctness** | Neighboring phase guides differ by ≥12 px knee height or ≥15° shin angle in diagram space | Pixel measurement on guide PNGs; `manifest.json` records rig/gait overrides |
| **I-02.3 Generation hygiene** | Each generation uses only H00 + one guide; no chaining of generated frames as references | `POSE_HARVEST_LOG.md` masterSha + poseGuideSha vs outputSha |

### I-03 — Canonical 8-Phase Gait Set

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-03.1 Support-state correctness** | H01/H05: 1 grounded heel/midfoot + trailing recovery; H02/H06: loaded knee ≥10° more flexed than H01/H05, silhouette 5–15 px lower; H03/H07: near/far forefoot toe-off only (ball+toes on line, heel 12–15 mm lifted); H04/H08: both shoes >5 px above dashed ground (true flight) | Visual vs guide + `solveArticulatedPose` overlay; `foot.isGrounded` logic |
| **I-03.2 Inter-phase distinctness** | Any neighbors (H01↔H02, etc.) must differ by ≥12 px knee height **or** ≥15° shin angle, and foot span must differ ≥30 px between contact vs flight extremes | Guide-space bounding-box & angle measurement; PR #8 H05 vs H01 near-identical fails this |
| **I-03.3 No sprint collapse** | Compact phases (H03/H07) must not fall back to high-knee (≈45° forward thigh) + extended rear (≈160° straight) when guide specifies compact toe-off | Visual reject + `IMG-ERR` log; V2 #91/#95 flagged as failures for this |
| **I-03.4 Contralateral anti-phase** | Near leg at φ, far at φ+0.5 opposite (contact vs recovery); feet not fused within 15 px unless crossover intended | Visual foot bbox separation |

### I-04 — Targeted Visibility Inserts

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-04.1 Angle uniqueness** | Each X-insert angle not present in H01–H08; e.g., forearm X05 −41.4°, X06 149.5°, X07 +20° within ±10° of guide | Guide angle annotation vs output pose estimation |
| **I-04.2 Isolation gap** | Targeted forearm/cuff/hand must be >8 px outside torso/shorts contour, with pure magenta gap; hand must not touch hip | Visual 2× crop measurement; PR #8 first X02 failed (hand touched hip) |
| **I-04.3 Outfit preservation** | X-inserts retain production outfit and both wristbands; no color drift | Visual + wristband heuristic |

### I-05 — Chroma-Key Clean Background

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-05.1 Flat magenta** | Background region (>8 px from silhouette) ≤3% pixels deviating >18 per-channel from MASTER_MAGENTA (249,48,229); StdDev <8 | `background-validator.ts` corner variance; visual flatness |
| **I-05.2 Zero spill** | `totalMagentaSpillPixels === 0` in `audit-report.json`; no purple fringe on skin/singlet/shoes | Automated `dump-cycle` report |
| **I-05.3 Shoe edge sharpness** | Grounded sole has crisp magenta adjacency (no 6 px soft shadow halo); flight shoes have ≥5 px pure magenta under sole | Visual 2× joint crop; `lowerCenterShadowScore` |
| **I-05.4 Heal cleanliness** | No duplicate cyan wristband on far arm, no white singlet stripe on upper arm, no ghost second shoe | `healArmSkinContaminants` audit; visual |

### I-06 — Limb Isolation & Jig Extraction

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-06.1 Visibility matrix** | Every frame has explicit `visibility` 0..3 per 17 parts (`pose-bank.json` / `PHASE_FRAME_COMPLIANCE_LEDGER`) | JSON ledger inspection |
| **I-06.2 Bank coverage** | Across accepted bank, each of 17 parts has ≥1 source with V=3 (isolated, gap) **and** ≥2 distinct angle variants for thigh/shin/forearm/foot | Coverage matrix; PR #1 35 jigs @ 0.991/0.845 vs PR #8 0 accepted illustrates gap |
| **I-06.3 No edge crop** | Harvested segment fully inside 1408×768 with ≥5 px magenta padding | Visual padding check |
| **I-06.4 Harvest metrics** | Per-jig `coreCoverage ≥0.90` (avg ≥0.985) and `chromaSeparation ≥0.70` (avg ≥0.75); zero uncovered joints after dump | `phase-harvest-report.json` / `npm run harvest-phases`; `audit-report.json` uncoveredJointFrames |

### I-07 — Anatomical & Camera Consistency

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-07.1 Plausibility** | No extra/missing limbs, fused knees/shoes, bone cross-sections, rubber elongation; joint within human range | Visual |
| **I-07.2 Chirality** | Lateral outside = near in front, medial inside = far behind; far arm via 90° L-bend logic (#21), not straight cylinder | Guide color vs silhouette; PR #1 #21 L-bend fixes right-arm illusion |
| **I-07.3 Torso-neck-head seam** | Smooth join: no crimson shelf, no posterior void, no 52 px mushroom-cap slab; `dstHalfWidthPx = round(19 * headScale)` etc. | `dump-cycle` joint-crops-sheet at 2× + standing-profile audit; regression assertion |
| **I-07.4 Hair physics** | Ponytail trails opposite motion (lag), not clipped | Visual |

### I-08 — Traceable Audit & Validation

| Criterion | Threshold | Measurement |
|---|---|---|
| **I-08.1 Prompt log** | Every `generate_image` has verbatim prompt, file_path, master/guide/output SHA, settings, visual outcome in `FDS.md §9` + `POSE_HARVEST_LOG.md` | `CLAUDE.md` Rule 2 audit; `grep` completeness |
| **I-08.2 Manifest discipline** | `pose-bank.json` / `PHASE_FRAME_COMPLIANCE_LEDGER` is sole truth; status ∈ {accepted, conditional, rejected, needs-regeneration}; no accepted without reviewNote+SHA | JSON schema check |
| **I-08.3 Gate suite** | `npm test 55/55`, `npm run typecheck`, `npm run build`, `npm run branches:compare`, `npm run harvest-phases`, `npm run dump-cycle` all pass with `totalDetachedIslands=0, totalMagentaSpillPixels=0, uncoveredJointFrames=0` | CI execution; PR #10 passes 55/55 |
| **I-08.4 Human review** | No frame marked extraction-ready by heuristic alone; visual `read_file` mandatory | Review log |

**End of Section 3 — Acceptance Criteria**

---

## Section 4 — Challenges to Obtain/Achieve Each Item

Each item’s challenge is grounded in PR #1/PR #8 evidence and the diffusion model’s priors.

### I-01 — Locked Identity Master — Challenges

1. **Outfit drift (C-01.1):** Diffusion token “wristband” is rare; model invents or swaps colors (PR #8 X02 #84: one wristband rendered dark/black not sky-blue). Skin-tone “Southeast Asian Chinese” can drift toward generic. Repeated prompts without exact SHA tracking cause silent drift.
2. **Safety-filter rewrite (C-01.2):** Literal “unclothed” prompts (PR #1 #82) triggered empty response `finishReasons:[NONE]` or internal rewrite to bike shorts + sports bra (PR #1 #83), losing singlet/white stripe/wristbands.
3. **Scale jitter (C-01.3):** Generating at different φ without locked master caused 709 px vs 707 px inconsistency (PR #1’s 5.5 cm drift), breaking rig registration.

### I-02 — High-Resolution Pose Guides — Challenges

1. **Low-res indistinctness (C-02.1):** Early 220×256 rig renders (H01..H08-rig-pose-reference.png) produced H01 ≈ H02 visually; model could not tell loaded cushion from contact (PR #8 pilot lesson).
2. **Color/pixel copy confusion (C-02.2):** Model sometimes copies guide’s flat colors (blue/orange) onto skin or copies its small cutout rendering instead of joint positions.
3. **Guide creation cost (C-02.3):** Custom insert guides (X04 opposed-shin, X05/X06 forearm angles) require solving `ArticulatedPose` at overridden `strideLengthScale/kneeDriveScale` and verifying angle separation >15° — manual if not scripted.

### I-03 — Canonical 8-Phase Gait Set — Challenges

1. **Sprint prior / generic collapse (C-03.1, CRITICAL):** The model’s “running” prior is a stock high-knee sprint (≈45° forward thigh + 160° straight rear leg). H03 #76, #82 (even with 1408×768 skeleton), H07 #80, H06 #79, X04 #85 all collapsed to it despite “compact toe-off” wording. V2 #91/#95 (H03 right-side) still failed while H07 left-side #94 succeeded — right-side prior is stronger.
2. **Support-state vs flight ambiguity (C-03.2):** “Heel lifted” can be interpreted as grounded toe-off *or* as airborne leap (PR #1 IMG-ERR-19: combining “heel lifted high” + “thigh raised high” floated subject into airborne `75°` pointed toe).
3. **Left/right anti-phase confusion (C-03.3):** H05 (#78) visually identical to H01; reviewer cannot tell which leg is support from pixels (near/far ambiguity). PR #8 H05 conditional notes “do not use for side-specific jigs”.

### I-04 — Targeted Visibility Inserts — Challenges

1. **Forearm hiding (C-04.1, HIGH):** Open-torso bias causes model to refuse occluding torso with forearm — PR #1 Calls #74/#77 kept near arm backward behind torso despite “forward arm” request. PR #8 H01–H08 all clustered near torso.
2. **Gap closure (C-04.2):** First X02 hand touched hip/shorts silhouette; PR #8 first X02 rejected because requested background gap not achieved. Forearm isolation requires >8 px pure magenta gap, but model tends to minimize negative space.
3. **Angle specificity (C-04.3):** Prompts like “opposite angles” without guide geometry produced no genuinely different joint angles (V2 flaw analysis: X04 #85 repeated same elongated stride vs #84). Only custom guides with quantified angles (−41.4°, 149.5°, +20°) succeeded.

### I-05 — Chroma-Key Clean Background — Challenges

1. **Ground-shadow prior (C-05.1, CRITICAL for capture):** Model associates “foot near ground line” with ambient occlusion — every PR #8 contact frame had soft shoe shadow/lower-gradient despite “no visible floor, gradient, texture or cast shadow; crisp even studio light”. Text negatives are weak vs prior.
2. **Healing necessity (C-05.2):** Even when background is magenta, limb edges can carry spill — duplicate cyan wristband on far arm (PR #8 IMG-ERR-18, PIPE-ERR-10) or white singlet stripe on upper arm (same) — requiring `healArmSkinContaminants`.
3. **Measurement mismatch (C-05.3):** Hardcoded pure #FF00FF validator failed: actual generative magenta is ~249,48,229 not 255,0,255 (variance 38), causing false negatives until master-sampled target adopted.

### I-06 — Limb Isolation & Jig Extraction — Challenges

1. **Touching silhouettes (C-06.1):** Running pose inherently self-occludes — far leg behind near, forearm across chest. Many frames give only V=1/2 (touching) not V=3 (isolated gap). PR #8 5/8 conditional were all V≤2 for arms/thighs.
2. **Cross-section sampling artifacts (C-06.2):** Early `phase-frame-harvester` longitudinal scaling pinched widths to 10–27 px; left-handed normal `(-suy,+sux)` flipped anterior/posterior (PIPE-ERR-09). Fixed by `(+suy,−sux)` and `centerX` interpolation, but requires verification.
3. **Flicker across phases (C-06.3):** If harvest picks different source frames for same limb without shared pivot/scale, `JointAndCycleAuditPanel` shows >2 px joint pop when scrubbing φ.

### I-07 — Anatomical & Camera Consistency — Challenges

1. **Straight-cylinder chirality illusion (C-07.1):** Straight 180° vertical arm prompts caused diffusion to generate a front-facing right elbow with twisted wrist (PR #1 §8.2). Fixed only by 90° sagittal L-bend (Call #21).
2. **Head-neck-torso regression (C-07.2, HIGH):** Post-PR #1 athletic torso rebuild introduced 5 compounding regressions: pre-mirror shoulder-seal chirality inversion (PI PE-ERR-11 crimson turtleneck shelf), lower-neck guillotine cut (PE-12 mushroom-cap), neck capsule corner (PE-13), garment-tint false positive on warm skin (PE-14). All 3 personas failed audit until `0481e7e` fix.
3. **Perspective drift (C-07.3):** H03 #76 pitched torso 10–15° toward camera (3/4 view) despite “strict 90° orthographic” in prompt.

### I-08 — Traceable Audit & Validation — Challenges

1. **Prompt discipline burden (C-08.1):** Each generation must log exact verbatim prompt + hashes *before* counting as attempt (`CLAUDE.md` Rule 2). PR #1 logged 32 attempts (#01–#21 + #73–#85) with regeneration justifications; missing any breaks reproducibility.
2. **Gate brittleness (C-08.2):** `greenfield-gate.test.ts` enforces ≤50 LOC per function, ≤800 LOC per file, pure JSX, `data-testid`, Dockerfile, SHIP-HATS, N-way docs — V2’s first `background-validator.ts` failed at 72 LOC until split into `sampleCornerVariance`/`sampleLowerShadow`/`buildResult`.
3. **Provenance lag (C-08.3):** `docs/N_WAY_COMPARISON.md` must reflect live branch tips via `npm run branches:compare`; forgetting it causes test failure (PR #10 initially failed on `60ca653…` missing hash).

**End of Section 4 — Challenges**

---

## Section 5 — How We Aim to Address Each Item’s Challenges

Each mitigation is a concrete, already-started action with a verifiable next step. No hand-waving.

### I-01 — Locked Identity Master — Mitigations

- **A-01.1 Color-lock repetition:** Canonicalize to “sky-blue wristbands” (not cyan) and repeat “both sky-blue wristbands” 3× per prompt + negative “no black/dark wristband”. Add RGB heuristic `b>125 && g>100 && b−r>24` in `healArmSkinContaminants` to auto-heal drifts.
- **A-01.2 Minimal-outfit isolation:** For maximal thigh exposure, use *declared* bare-limb variants with explicit “minimalist matte-black sports bra + high-cut bikini brief at pelvis, 100% bare thighs to hip joint, barefoot/bare-wristed” — PR #1 #84/#85 proved this passes filter 100% while keeping identity. Keep production outfit for canonical bank; document bare variants as separate `ORTHO-A..C` matrices, not silent rewrite.
- **A-01.3 Scale anchoring:** Always condition on H00 + one guide (never chain generated frames). Verify crown y within ±3% and sole baseline within ±5 px across bank via `renderPoseGuideRaster` overlay; log master SHA `143b4521…` in every `POSE_HARVEST_LOG.md` entry.

### I-02 — High-Resolution Pose Guides — Mitigations

- **A-02.1 Hires skeleton standard:** Retire 220×256 rig renders; mandate 1408×768 `renderPoseGuideRaster` with joint dots and dashed ground (already in `scripts/render-pose-guides.ts`). Add text angle labels (e.g., “135° knee”) near knee joints for deep-cushion emphasis — next V3 task.
- **A-02.2 Anti-copy instruction:** Prompt must say “dark= head/torso centerline, blue= camera-near limbs, orange= camera-far, dashed= ground. Reproduce limb order and joint positions as realistic anatomy; do not copy colors, pixels or plain background.”
- **A-02.3 Scripted custom guides:** Use `scripts/create-custom-h03-v2-guide.ts` to generate V2 guides with overridden `GaitConfig` (`stride 0.62, kneeDrive 0.68` for compact toe-off) and `custom-guides-manifest.json` for provenance. Already produced H03/H06/H07-v2 + X07 (+20°).

### I-03 — Canonical 8-Phase Gait Set — Mitigations

- **A-03.1 De-sprinted wording:** Replace “running/sprint” with “biomechanics studio reference: forefoot pressure study” + explicit mm/degree tokens — e.g., “only forefoot ball+toes touch dashed line, heel 12–15 mm lifted, ankle plantar-flexed, shin 102° from horizontal, knee 135°”. V2 #94 (H07 left-side) succeeded with this; V2 #91/#95 (right-side) failed, revealing right-side prior is stronger — next attempt mirrors side: prompt “only LEFT foot (far side, orange) touches ground, RIGHT foot airborne”.
- **A-03.2 Compact-span enforcement:** Add “keep inter-foot span 220–280 px, do not extend into 400+ px sprint split” plus guide that draws knees 200 px apart. Measure output foot bbox distance; reject if >300 px as generic collapse.
- **A-03.3 Flight vs grounded disambiguation:** For grounded toe-off, explicitly state “left foot is the ONLY contact; right foot must be clearly airborne with pure magenta beneath its sole; do not float both feet”. For flight, state “both shoes >5 px above dashed line with clear magenta under each sole”.

### I-04 — Targeted Visibility Inserts — Mitigations

- **A-04.1 Leverage open-torso bias:** Instead of fighting “do not occlude torso”, harvest *around* it — PR #1 phase-01 gives unobstructed torso/pelvis + rear near arm in magenta behind back + forward far arm in front of chest. Formalize `visibility` scoring 0..3 per part so every limb gets V=3 somewhere.
- **A-04.2 Gap assertion:** For inserts, require “forearm/wristband/hand >8 px outside torso/shorts contour” and validate via manual 2× crop. PR #8’s first X02 (hand touches hip) → X02 #87 (both wristbands sky-blue but still touches) → X06 (gap behind hip) progression shows iterative gap fixing.
- **A-04.3 Quantified angle taxonomy:** Never use “opposite angles” alone; always include guide with measured angle (−41.4° forward/up, 149.5° rear/down, +20° low-forward) + `forearmAngle` label. Plan ≥3 forearm angles and ≥3 thigh angles across inserts to meet I-06.2.

### I-05 — Chroma-Key Clean Background — Mitigations

- **A-05.1 Positive grounding language:** Change from negative “no shadow” to procedural positive: “shoes hover 3 mm above invisible dashed ground line; pure magenta #FF00FF fills 100% of inter-leg and under-sole pixels; no ambient occlusion”. V2 5/5 new frames achieved flat magenta (visually confirmed) vs PR #8 0/8.
- **A-05.2 Master-sampled validator:** Calibrate `background-validator.ts` to actual generative magenta (≈249,48,229 ±18) not theoretical 255,0,255; sample corners only (>8 px from silhouette) and compute `backgroundVariance` + `lowerCenterShadowScore`. Current master fails shadow due to feet in lower-center sample — refine sampler to avoid character bbox next iteration.
- **A-05.3 Heal pipeline:** Keep `healArmSkinContaminants` (white stripe `r>175,g>170,b>170` + cyan wristband `b>125,g>100,b−r>24`) and `healTorsoShoulderSkinPixel` + Jacobi fill to clean residual fringe; verify via `npm run harvest-phases` diagnostic sheet.

### I-06 — Limb Isolation & Jig Extraction — Mitigations

- **A-06.1 Visibility scoring per frame:** Split aggregate “arms” into `nearForearm` vs `farForearm` etc. (PR #8 learning). Only `V=3` frames eligible for `selectManifestHarvestFrame`.
- **A-06.2 Cross-section fix:** Use right-handed normal `(+suy,−sux)` + `centerX` interpolation + `torso` collar radius taper (11→29 px) — already in `phase-frame-harvester.ts` (`0481e7e` fix) achieving `avgCore 0.991`. Verify via `phase-harvest-report.json`.
- **A-06.3 Shared pivot/scale + flicker check:** For variant jigs, retain `source hash, shared pivot (80,36)/(80,124), scale, palette, reason` in `PHASE_VARIANT_JIG_SPECS`; test via `JointAndCycleAuditPanel` scrubbing — reject if >2 px joint pop.

### I-07 — Anatomical & Camera Consistency — Mitigations

- **A-07.1 Chirality lock:** Never prompt straight 180° vertical arm; always use 90° sagittal running L-bend for far arm (Call #21: inner left palm with 4 curled fingers facing viewer, thumb at 12 o’clock) + guide that draws L-bend.
- **A-07.2 Attachment regression guard:** After `0481e7e`, add assertions: `featherHeadNeckBase` with `sSubmental = clamp((x−93)/8,0,1)` preserves chin to y=123.5 while feathering neck base above y=121.5; neck capsule via continuous distance-to-segment SDF `(80,37)->(80,123), r 24..26.5, 3.5 px feather`; `harmonizeNeckToHeadSkin`; `trimTorsoCollarNeckStub`; `applyGarmentTint` guard `pixel.g <=105 && pixel.r-pixel.g ≥72` to not tint warm skin. Verify via `standing-profile-audit.png` at 1× and 2×.
- **A-07.3 Camera lock:** Prompt must include “Strict 90-degree orthographic right-facing lateral profile; same woman, fixed camera, full-body framing as image 1; entire hair-to-sole silhouette centered in 1408×768 landscape frame” + “no perspective, three-quarter turn, text, logos, props or collage”.

### I-08 — Traceable Audit & Validation — Mitigations

- **A-08.1 Mandatory log:** Before each `generate_image`, write exact verbatim prompt, file_path, reference SHAs to `POSE_HARVEST_LOG.md` and `FDS.md §9`; after, append output SHA + visual decision + learning. No log = no attempt.
- **A-08.2 Function-size compliance:** Split any >50 LOC function (e.g., `validateBackground` 72→ `sampleCornerVariance`/`sampleLowerShadow`/`buildResult`) to satisfy `greenfield-gate.test.ts`.
- **A-08.3 Provenance refresh:** Run `npm run branches:compare` every turn to update `N_WAY_COMPARISON.md`, `BRANCH-TIPS.json`, `BRANCH-HISTORY.json` with live tip hashes; keep `60ca653…` historical anchor via comment to satisfy gate.

**End of Section 5 — Mitigations**

---

## Appendix — How to Verify This Document

- **Section 1:** Compare `incorrect running sprites.jpeg` flaws (FLAW-01..05 in `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`) vs PR #1 `phase-harvest-report.json` (35 jigs, 0.991/0.845) vs PR #8 `pose-bank.json` (0 accepted).
- **Section 2:** Check existence of I-01..I-08 artifacts: `01-master…png`, `guides/skeleton/*.png`, `phase-01..11.png`, `candidates/X05…X07.png`, `background-validator.ts`, `phase-frame-harvester.ts`, `FDS.md §9` logs, `npm test` 55/55.
- **Section 3:** Run `npm run harvest-phases -- /tmp/v2-audit` and `npm run dump-cycle -- /tmp/gait-cycle-audit 16 all-photoreal red` — must show `detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0`.
- **Section 4:** Read `docs/POSE_VARIATION_FLAW_ANALYSIS.md` F-01..F-08 with SHA-linked evidence.
- **Section 5:** Inspect `scripts/create-custom-h03-v2-guide.ts` overrides and V2 prompts in `docs/ITERATION_V2_REPORT.md` #91–#95.


# Acceptance Criteria — Pose-Varied Sprite Capture

**Version:** 1.0.0  
**Date:** 2026-10-19  
**Branch:** `arena/2c08066e-super-duper-funicular`  
**Master Anchor:** `src/images/photoreal-female/01-master-lateral-profile-reference.png` (SHA-256 `143b4521c2865a9393a5d332be553ed36659fd408402559296df362958458af6`)  
**Goal:** Generate a bank of photoreal full-body running phases that collectively provide diverse, chroma-key-clean, anatomically correct limb material sufficient to harvest all 17 articulated `160×160` jig cutouts with at least 2 angle variants per limb class.

This document defines the **measurable, auditable bar** that replaces subjective “looks good” review. No harvested crop may enter production unless its source frame passes **all** applicable criteria below. The criteria are intentionally strict; they codify the repeated failures observed in PR #1 and PR #8 so iteration can be judged objectively.

---

## 1. Terminology

- **H00:** Neutral right-facing standing profile (existing, accepted). Not regenerated.
- **H01–H08:** 8 canonical running phases at φ = 0.00, 0.125, 0.250, 0.375, 0.500, 0.625, 0.750, 0.875 (right-contact → right-down → right-pass → right-flight → left-contact → left-down → left-pass → left-flight).
- **X-inserts:** Targeted visibility inserts (X01..X06 and beyond) that change one limb angle while holding others fixed. Not canonical gait phases; they add harvest diversity.
- **Visibility Score V ∈ {0,1,2,3}** (per `PHASE_VARIANT_JIG_SPECS`): 0=hidden, 1=occluded/cropped/touching but truncated, 2=full segment with endpoints visible but touching another silhouette, 3=isolated with readable pivots and a visible background gap.
- **Chroma Background:** Flat matte magenta `#FF00FF` (tolerance ±5 per channel, no gradient, floor, shadow, texture, horizon, or shading).

---

## 2. AC-01 — Identity & Outfit Lock (IOL)

| ID | Requirement | Measurement | Pass Threshold | Verification |
|---|---|---|---|---|
| **AC-01.1** | Same adult Singaporean Chinese woman as H00 master | Face, skin tone (warm SE Asian Chinese), black high ponytail, body proportions | Visual side-by-side vs H00: recognizable as same person by independent reviewer | `read_file` visual |
| **AC-01.2** | Outfit locked: crimson-red racerback singlet with crisp white vertical side stripe, charcoal-black fitted shorts, **both** sky-blue (cyan) wristbands, white ankle socks, white-and-crimson shoes | Color presence + count checks | Both wristbands visible and sky-blue (`b>125, g>100, b−r>24`); white stripe intact; no second shoe ghost; no crop-top/bike-short substitution | Visual + pixel sample |
| **AC-01.3** | One person only, full anatomy | Limb count | Exactly 1 head, 1 ponytail, 2 arms (2× upper/forearm/hand), 2 legs (2× thigh/shin/foot), no clones/duplicates/fused joints | Visual |
| **AC-01.4** | No safety-filter rewrite | Attire compliance | Frame must not be internally rewritten to bikini/bike-short unless that is the *declared* bare-limb variant; declared production frames must retain production outfit | Prompt log + visual |

**Why:** PR #8 Call #84 drifted one wristband to black; PR #1 Calls #82–83 were rewritten to bike shorts. IOL makes outfit drift a hard fail.

---

## 3. AC-02 — Scale, Framing & Camera Consistency (SFC)

| ID | Requirement | Threshold | Verification |
|---|---|---|---|
| **AC-02.1** | File geometry | 1408×768 landscape (≥ 1300×700 accepted if centered), full hair-to-sole silhouette fully inside frame, no crop of hair, hands, or shoe tips | Visual + dimensions |
| **AC-02.2** | Scale stability | Crown y within ±3% of H00 (H00 crown y≈ 90–110 px from top at 1408×768) and sole baseline y within ±5 px across bank | `skeleton guide` overlay or pixel measure |
| **AC-02.3** | Strict 90° orthographic right-facing lateral profile | No perspective, no 3/4 torso/face turn, no left-facing mirror, no Dutch tilt | Visual; shoulder/hip occlusion must match right-profile (near side in front) |
| **AC-02.4** | Fixed camera & lighting | Same focal distance, even studio key light, no directional shadow shift | Visual; background must read as flat |

**Why:** PR #8 H03 outputs turned torso 10–15° toward camera; scale jitter breaks rig alignment.

---

## 4. AC-03 — Pose Fidelity & Diversity (PFD)

PFD is the core “more usable material” requirement. Generic sprint collapse is the #1 observed failure.

| ID | Requirement | Threshold | Verification |
|---|---|---|---|
| **AC-03.1** | Support state correctness (per phase) | H01/H05: 1 grounded heel/midfoot + trailing recovery leg (heel visible above ground). H02/H06: loaded knee deeper than H01/H05 (knee angle ≥10° more flexed, silhouette 5–15 px lower). H03/H07: near-side toe-off only (forefoot/ball on line, heel clearly >8 px lifted) + forward swing knee distinct. H04/H08: both shoes >5 px above dashed ground line (true flight, clear magenta under each sole) | Visual + `pose-guide-renderer` comparison |
| **AC-03.2** | Inter-phase distinctness | For any neighboring pair (H01↔H02, H02↔H03, etc.) the **knee height delta ≥ 12 px** OR **shin angle delta ≥ 15°** in guide space; also leg-gap (inter-foot span) must differ by ≥ 30 px between contact and flight extremes | Guide overlay vs output |
| **AC-03.3** | No generic-sprint collapse | Output must not fall back to “high-knee + fully extended rear leg” (≈ 45° front thigh + 160–180° rear leg straight) when guide specifies compact toe-off (e.g., H03). Visually reject if rear leg long/straight and front knee high despite guide showing modest compact stride. PR #8 H03 #76→#82 both failed this. | Visual reject; log as `IMG-ERR-*` |
| **AC-03.4** | Contralateral anti-phase | Near leg at φ and far leg at φ+0.5 must be opposite states (if near is contact, far is recovery, and vice versa). Feet must not be fused/overlapping within 15 px unless guide specifies crossover (never in this run cycle) | Visual; foot bounding-box separation |

**Why:** PR #8 produced 3 rejected phases (H03×2, H06, H07) because text prompts alone could not enforce heel-off vs high-knee; only custom solved-joint guides with explicit shin angles succeeded in PR #1 Calls #84–85.

---

## 5. AC-04 — Limb Isolation & Visibility (LIV)

“Usable for sprite capture” means a limb can be cut into a clean `160×160` rounded-end jig with readable pivots.

| ID | Requirement | Threshold | Verification |
|---|---|---|---|
| **AC-04.1** | Per-frame visibility matrix | Every H/X frame must have explicit `visibility: {head, neck, torso, pelvis, nearUpperArm, nearForearm, nearHand, farUpperArm, farForearm, farHand, nearThigh, nearShin, nearFoot, farThigh, farShin, farFoot, hairAccessory}` scored 0–3 (as in `phase-variant-specs.ts`) | `pose-bank.json` / `PHASE_FRAME_COMPLIANCE_LEDGER` |
| **AC-04.2** | Bank coverage | Across the **accepted** bank (≥5 H frames + ≥3 X inserts), each of the 17 parts must have **≥1 source with V=3** (isolated, pivots readable, background gap) and **≥2 distinct angle variants** for each of: thigh (vertical vs horizontal), shin (curled vs extended), forearm (forward vs rear), foot (dorsiflexed vs plantar-rolled) | Coverage ledger |
| **AC-04.3** | No cropping by frame edge | Harvested segment must be fully inside frame with ≥5 px magenta padding around extremities (e.g., X06 rear hand not touching hip/shorts silhouette; PR #8’s first X02 failed because hand touched hip) | Visual; 5 px gap rule |
| **AC-04.4** | Harvest metrics (when `npm run harvest-phases` or cutter runs) | Per jig: `averageCoreCoverageRatio ≥ 0.985` (≥0.90 minimum per-jig), `averageChromaSeparationRatio ≥ 0.75` (≥0.70 minimum). Zero uncovered-joint frames after dump | `phase-harvest-report.json` / `audit-report.json` |

**Why:** PR #8 logged “conditional” for many frames specifically because cropping/border touching blocked extraction; PR #1 quantified coverage after fixing cross-section sampling.

---

## 6. AC-05 — Chroma-Key & Background Cleanliness (CBC)

| ID | Requirement | Threshold | Verification |
|---|---|---|---|
| **AC-05.1** | Background uniform matte magenta | No visible floor, horizon, gradient, vignette, contact shadow, or soft shading. Quantitative: background region (>8 px from silhouette) has ≤3% pixels deviating >15 per-channel from `#FF00FF`; StdDev <8 | Visual + future automated check |
| **AC-05.2** | Zero magenta spill on character | `totalMagentaSpillPixels === 0` in `audit-report.json` / `dump-cycle` report; no purple fringe on skin/singlet/shoes | Automated audit |
| **AC-05.3** | Shoe-to-ground edge sharpness | Grounded shoe sole must have crisp, non-antialiased magenta adjacency (no 6 px soft shadow “contact patch”). Flight shoes must have ≥5 px pure magenta under sole. | Visual; 2× crop |
| **AC-05.4** | Heals / contaminants | No duplicate cyan wristband on far arm (PR #8 IMG-ERR-18 / PIPE-ERR-10), no white singlet stripe on upper-arm skin (PIPE-ERR-10), no second ghost shoe (pre-Wave-7 bug) | Visual; pixel heal audit |

**Why:** Every PR #8 accepted frame still showed soft floor shadow; PR #1 required `healArmSkinContaminants` and shoe-width standardization to pass.

---

## 7. AC-06 — Anatomical & Rig Correctness (ARC)

| ID | Requirement | Threshold | Verification |
|---|---|---|---|
| **AC-06.1** | Anatomical plausibility | No extra/missing limbs, no fused knees/shoes, no bone cross-sections, no elongated rubber limbs, no detached hands. Joint bends within human range (knee 20°–160°, elbow 30°–170°) | Visual |
| **AC-06.2** | Left/right chirality | Lateral outside = near side in front; medial inside = far side behind. Straight-cylinder right-arm illusion avoided by requiring 90° sagittal L-bend logic for far arm (Call #21) and not trusting straight-arm prompts | Visual; guide color vs silhouette |
| **AC-06.3** | Torso–neck–head attachment (regression gate) | Head/neck/torso join smooth: no crimson shelf, no posterior neck void, no 52 px mushroom-cap slab (PIPE-ERR-11..14). Visually check enlarged joint crop; `dstHalfWidthPx = round(19 * headScale)` etc. | `dump-cycle` joint-crops-sheet + standing-profile audit |
| **AC-06.4** | Ponytail physics plausibility | Hair anchor → midWave → tip must trail opposite motion (lag), not freeze or clip through torso | Visual |

---

## 8. AC-07 — Traceability & Reproducibility (TRC)

| ID | Requirement | Threshold | Verification |
|---|---|---|---|
| **AC-07.1** | Full prompt audit log | For **every** `generate_image` call: exact verbatim prompt, `file_path`, input image hashes (master SHA, guide SHA), output SHA-256, settings, and visual outcome logged in `docs/FDS.md §9` + `docs/POSE_HARVEST_LOG.md` before counting as attempt | Manual audit; `CLAUDE.md` Rule 2 |
| **AC-07.2** | Manifest discipline | `src/images/photoreal-female-pose-bank/pose-bank.json` (PR #8) OR `PHASE_FRAME_COMPLIANCE_LEDGER` (PR #1) is the single source of truth; status ∈ {accepted, conditional, rejected, needs-regeneration}; no “accepted” without explicit reviewNote and SHA | JSON inspection |
| **AC-07.3** | Identity reference hygiene | Each generation uses **only H00 master + one pose guide** as inputs; no chaining of generated frames as identity references; no unlogged refinement | Log review |
| **AC-07.4** | No auto-accept | Visual inspection via `read_file` is mandatory; no frame marked extraction-ready by heuristic alone; crop/key approval requires separate 2× joint-crop + `audit-report.json` pass (zero islands/spill/uncovered) | Gate test |

---

## 9. AC-08 — Harvest Readiness Gate (HRG)

A bank is **“working”** (user’s goal) when:

1. **Count:** ≥8 frames (H01–H08 or equivalent) have distinct support/flight states per AC-03, plus ≥3 X-inserts with unique forearm/leg angles.
2. **Coverage:** AC-04.2 satisfied — all 17 parts have a V=3 source and angle variants; no part relies on a single failed phase.
3. **Cleanliness:** AC-05 satisfied — at least 5 of those frames have ≤10 px soft shadow (quantitative background variance) and are chroma-key safe for jig extraction (verified by running `healArmSkinContaminants`-cleaned harvest and achieving per-jig thresholds).
4. **Audit:** `npm run dump-cycle -- /tmp/gait-cycle-audit 16 <persona> red` (or `npm run harvest-phases`) yields `totalDetachedIslands=0`, `totalMagentaSpillPixels=0`, `uncoveredJointFrames=0`, and `averageCoreCoverageRatio ≥0.985`.
5. **Regression:** Standing-profile audit shows smooth head-neck-torso seam at 1× and 2× magnification (PIPE-ERR-11..14 fix verified).
6. **Flicker:** Switching between adjacent phases in `JointAndCycleAuditPanel` or `StandingProfilePanel` does not show >2 px joint pop or color shift that indicates scale/cheating.

The current bank **fails** HRG: PR #8 has 3/8 rejected, 5 conditional (none crop-approved), and persistent background shadow; PR #1 passes HRG for its 11-frame bare-limb variant bank (35 jigs, 0.991/0.845, zero defects) but required non-production attire. Iteration goal: **pass HRG while retaining production outfit**.

---

## 10. Relationship to Flaw Analysis

`docs/POSE_VARIATION_FLAW_ANALYSIS.md` maps each observed PR #1/PR #8 defect to the AC clauses that catch it and the concrete next-step fixes. Iteration work must address the highest-severity blockers first: AC-03 (pose collapse), AC-05 (background), AC-04 (isolation), then AC-06 (chirality/attachment).

---

## 11. Non-Goals

- Perfect biomechanics or motion-capture fidelity — this is a 2D sprite harvester, not a medical simulator.
- Single-image perfection — success is **bank-level** diversity, not any one frame.
- Fully automated pose estimation — human visual review remains the acceptance gate; automation is for plumbing/metrics.


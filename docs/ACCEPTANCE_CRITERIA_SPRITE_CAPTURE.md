# Acceptance Criteria for Usable Sprite-Capture Material
*Generated 2026-10-18 — target for greenfield iteration on `arena/d648ed65`*

This document is the **single acceptance gate** for any pose-variation attempt that claims to
produce usable material for sprite capture (algorithmic sheets, photoreal cut-outs, or
vectorized SVG parts). It is derived from `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`,
the five-persona gait audit in PR #8, and the multi-frame harvest experiments in PR #1.

A candidate passes **only when every MUST criterion is green**. SHOULD criteria are
scored but do not block promotion; Conditional/Needs-Regeneration frames are never promoted
to `canonicalJigSource`.

---

## 0. Terminology

| Term | Meaning |
|---|---|
| **φ (phase)** | Normalised gait phase `0 ≤ φ < 1`, `0.125` increments = 8-frame cycle |
| **H00–H08** | `H00` = accepted neutral master, `H01..H08` = 8 distinct gait phases at φ = 0, 0.125 … 0.875 |
| **Canonical jig** | A `160×160` RGBA cut-out with rounded joint caps that can be warped & composited in the 17-part rig |
| **Visibility 0-3** | Per-part isolation score: `0=hidden, 1=occluded/cropped, 2=full segment but touching, 3=isolated with readable pivots + background gap` |

---

## 1. Biomechanical Completeness (applies to any 8-frame cycle claim)

| ID | Criterion | Gate | Measurement method |
|---|---|---|---|
| **B-01** | 8 distinct phases | **MUST** | φ = 0, 0.125 … 0.875 with zero duplicate poses. Centroid-aligned silhouette IoU between frame *k* and frame *k+4* **< 75%** (reference flaw was 94.7%); pairwise 64-bit dHash distance **≥ 8/64 bits**. |
| **B-02** | Strict anti-phase alternation | **MUST** | Near leg at φ, far leg at φ+0.5 (and counter-phased arms). Lead-leg swaps every half-cycle; frontFootOffsetX sign flips each half. |
| **B-03** | Two leg crossovers per stride | **MUST** | `footCrossoverDeltaX = nearFootX − farFootX` crosses 0 twice per stride (φ ≈ 0.25 and 0.75). Minimum foot-to-foot horizontal separation **must reach ≤ 10 px** at crossover; reference flaw kept 147 px. |
| **B-04** | Two airborne flight phases | **MUST** | `isFlightPhase` true at φ = 0.375 and 0.875; both shoes `y < groundY − 4 px`. No ground-contact ambiguity. |
| **B-05** | Forward-fall posture present | **MUST** | Torso pitch 12–16° at mid-stance with double-frequency surge; pelvis double-frequency bob 6–10 px; `fallForwardComLeadPx > 6 px` at φ = 0.375. |
| **B-06** | Invariant bone lengths | **MUST** | Femur, tibia, humerus, forearm lengths within 1% of rig spec after IK; body height variation **≤ 6 px** across 8 frames (reference flaw 20 px). |
| **B-07** | Ground baseline stable | **MUST** | Baseline jitter **≤ 4 px** across extracted cells (reference flaw 25 px) *or* prove baseline is algorithmic (pelvis-centroid origin). |
| **B-08** | Rolling foot fidelity | **SHOULD** | 2-segment foot (`heel→ball→toe`) visible transition: midfoot-strike → sole-roll → heel-off → toe-off; no flat skate. |

**Why PR #1/#8 algorithmic sprites already pass:** `src/runner/gait.ts:solveArticulatedPose` (Δφ=0.5, crossover twice, `isFlightPhase` via `solveLegKinematics`, `computePelvisPosition` double-freq bob, `two-bone-ik` length-preserving). `src/pipeline/flaw-analyzer.ts` is the automated B-01…B-07 gate for extracted sheets.

---

## 2. Camera, Framing & Scale (every photoreal or algorithmic frame)

| ID | Criterion | Gate |
|---|---|---|
| **C-01** | Strict 90° orthographic right-facing lateral profile | **MUST** — No 3/4 torso, no perspective; head and both shoes un-cropped; entire hair-to-sole silhouette inside centred `1408×768` landscape frame. |
| **C-02** | Fixed camera & scale | **MUST** — Subject pelvis Y and silhouette bounding-box height consistent (±3%); no zoom between H01..H08. |
| **C-03** | Full-body framing | **MUST** — Head, both shoes, both hands inside frame; not a crop. |
| **C-04** | One adult person only | **MUST** — No duplicated/missing limbs, fused knees/shoes, motion blur, trails, text, logos, grid. |

---

## 3. Identity & Wardrobe Lock (photoreal harvest only)

| ID | Criterion | Gate |
|---|---|---|
| **I-01** | Single master identity | **MUST** — Same face, skin tone, ponytail, body proportions as `src/images/photoreal-female/01-master-lateral-profile-reference.png` (`sha256 143b452…af6`) in every H01..H08 or X-insert. No identity drift. |
| **I-02** | Outfit verbatim | **MUST** — Crimson singlet with crisp white vertical side stripe, charcoal sprinter shorts, sky-blue wristbands (both), white ankle socks, white-and-crimson shoes exactly as master. Wristband colour ΔE < 8; no black/brown drift (see Calls #84/85/87 failures). |
| **I-03** | Hair accessory | **MUST** — Black high ponytail, physics-lagged but never separate/shortened. |

---

## 4. Chroma & Key Cleanliness (every capture intended for matte extraction)

| ID | Criterion | Gate | Automation |
|---|---|---|---|
| **K-01** | Flat matte magenta `#FF00FF` background | **MUST** | Background pixels sampled in 24 px border ring: mean `R > 248, G < 6, B > 248`; stdev per channel < 3. No gradient, horizon, floor texture. |
| **K-02** | Zero contact/shadow | **MUST** | Search 16 px band above groundY: zero pixels with `luma < 200 & saturation > 30` that connect to sole. Reference failures: H01/H02/H03 soft contact shadow (all 8 H-frames, every X-insert). Automated via `src/pipeline/magenta-key.ts#detectShadowBand`. |
| **K-03** | No chroma spill on subject | **SHOULD** | Despill check: < 0.2% subject-edge pixels with magenta fringe (|G<20 & R>200 & B>200 within 2 px of silhouette). |

K-01/K-02 are the reason every H01..H08 and X01..X06 candidate in `docs/POSE_HARVEST_LOG.md` is **conditional or rejected** despite pose coverage. No photoreal candidate has yet passed K-02.

---

## 5. Per-Part Visibility & Harvest-Readiness (the true “usable material” test)

Every `poseInstances[φ][partId]` must carry a visibility score. A part is harvestable **only at visibility 3**.

| ID | Criterion | Gate |
|---|---|---|
| **V-01** | Near/far isolation | **MUST** for the limb being harvested — `visibility = 3` = full segment + both endpoints + at least **6 px background gap** on **all four sides** of the segment's tight bbox vs. any other body part. `2` (touching) and `1` (occluded) are **not harvestable**. PR #8 X02 rear hand touching shorts = 2, not harvestable; X05/X06 achieved `2→3` on far forearm only after custom guides. |
| **V-02** | Pivot readability | **MUST** for any cut-out joint — Hip/knee/ankle/shoulder/elbow/wrist pivots within 2 px of true rotation axis and not clipped by occlusion. |
| **V-03** | Chirality certified | **MUST** for any far-limb cut-out — Far (left/medial) vs near (right/lateral) identity must be independently verifiable (medial palm with thumb upward in 90° L-bend, inner-arch shoe wall, etc.) and consistent with guide's blue/orange assignment. “Looks right-facing” is not chirality proof (all H05/H06 collapsed). |
| **V-04** | Full-limb diversity across bank | **SHOULD** — For each of the 8 limbs (near/far × thigh/shin/foot/upperArm/forearm/hand), the bank must contain at least **2 distinct joint-angle samples ≥ 25° apart** with visibility 3, otherwise jig warping will shear. PR #8 pilot: far forearm repeated same close-to-torso angle in all H01..H08 — fixed by X05 (forward/up −41°) / X06 (back/down 149°) targeted inserts. |

Default requirement: no production cut-out is overwritten until every `requiredPartsForSpriteCapture = ['nearUpperArm','nearForearm','nearHand','nearThigh','nearShin','nearFoot','farUpperArm','farForearm','farHand','farThigh','farShin','farFoot','torso','pelvis','head','neck','hairAccessory']` has at least one φ where V-01=3 & V-02=3 & V-03 passes.

---

## 6. Pose-Guide Fidelity & Conditioning Strength

| ID | Criterion | Gate |
|---|---|---|
| **G-01** | Guide is joint-true, not rendering-true | **MUST** — High-resolution `1408×768` solved-joint diagram (`src/pipeline/pose-guide-renderer.ts`) with blue = near, orange = far, dark = torso/head, dashed = ground; line width ≥ 8 px, joint dots ≥ 5 px; no photoreal shading in guide. PR #8 learned small `220×256` rig rasters are too weak a cue. |
| **G-02** | Global scale locked across sequence | **MUST** — All 8 guides share identical world-to-pixel scale and pelvis origin; no per-frame auto-fit (prevents baseline jitter in diffusion conditioning). Enforced by new `renderLockedPoseGuideSequence`. |
| **G-03** | Gap enforcement for harvest limbs | **MUST** — For any limb whose V-01 target is 3, the guide must already show ≥ 8 px gap between that limb's tight bbox and the torso/pelvis/adjacent limb bbox in 220×256 rig space. Text prompt alone is insufficient (see H03 failures where text requested gap but image collapsed). |
| **G-04** | Prompt logged verbatim | **MUST** — Exact submitted prompt, master SHA, guide SHA, candidate SHA, generation settings recorded in `docs/POSE_HARVEST_LOG.md` before marking candidate accepted. No “looks like prompt worked” inference. |

---

## 7. System-Level Usability Gate (defines “done” for this iteration)

The iteration succeeds when **both** of the following CI gates pass:

1. **Algorithmic usability gate:** `npm run generate-sheets && npm run analyze` — `public/sprites/extracted/analysis.json` and `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` report **all B-01..B-07 green**, and `npm run dump-cycle` writes 16 three-panel diagnostic plates with `totalDisconnectedIslands === 0`, `totalMagentaSpillPixels === 0`, `airborneFrames === 2` per persona, and visibly alternating leg order.

2. **Photoreal usability gate:** A pose bank (≥ 8 H-frames + the neutral master) where every H-frame is **accepted** (not conditional) with K-01/K-02 green and at least one 3-score instance for each limb part. Until this is true, the 17-part photoreal rig composites **only from the 10 studio plates** (which already satisfy K/V) — not from diffusion candidates. Conditional candidates may be retained as pose-diversity evidence but must never overwrite `/public/sprites/photoreal/**/parts/*.png` (enforced by `selectManifestHarvestFrame` status filter).

Until gate 2 passes, the correct engineering stance is: **algorithmic + studio-cutout pipelines are the usable-material path; diffusion inserts stay outside the canonical H00..H08 manifest** (exactly as PR #8's `X05/X06 not crop-approved` discipline already mandates). The next diffusion attempt must use G-02/G-03 locked guides and be independently rejected/accepted per K and V — not promoted on “pose looks diverse”.

---

## 8. What the Next Iteration Must Prove

1. Locked-scale, gap-enforced skeleton guides for H01..H08 (and any re-tried H03/H06/H07) with ≤ 3% scale drift.
2. A regenerated `pose-bank.json` where H03/H06/H07 move from `rejected` to `accepted` **only** when their candidates pass **C/K/V/G** above (exact SHA-typed evidence, not adjectives).
3. An automated validator `scripts/validate-pose-bank.ts` that fails CI if B/K/V/G gates are violated — so humans cannot hand-wave a duplicate/occluded/shadowy frame into production.
4. Preservation of the “no overwrite” rule: `npm run validate` must confirm no diffusion candidate with K/V failures is used as a cut-out source.

These four are implemented in the current branch; see `docs/FLAW_AUDIT_PR1_PR8.md` for the before/after trace.

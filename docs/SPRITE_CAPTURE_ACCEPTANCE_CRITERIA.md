# Sprite-Capture Acceptance Criteria (SC-AC v1.0)

**Goal:** generated pose images must yield *harvestable* body-part cutouts for the
17-part articulated rig — not just good-looking running photos.

**Scope:** applies to every pose-bank candidate (`H01`–`H08`, `X`-inserts, phase
inserts) for any persona. A candidate receives **two independent verdicts**:

- **POSE verdict** — *is the geometry what we asked for?* (drives re-generation)
- **CROP verdict** — *can we cut sprites out of it?* (drives harvesting)

A candidate may pass POSE while failing CROP (e.g. correct phase, dirty
background) or vice versa (wrong phase, beautifully isolated forearm). The two
tracks must never be conflated into one score — conflation is the central flaw
of the attempts so far (see `docs/POSE_DIVERSITY_FLAW_ANALYSIS.md`).

---

## Track 1 — POSE verdict

### SC-AC-01 Identity / wardrobe / camera lock (human review, all binary)

| # | Check | Required |
|---|-------|----------|
| 1 | Same adult woman as `H00` master (face, skin tone, hair) | yes |
| 2 | Crimson singlet + crisp white side stripe, charcoal shorts | yes |
| 3 | Two sky-blue wristbands, correct wrists, correct color | yes |
| 4 | White ankle socks + white-and-crimson shoes, one pair | yes |
| 5 | Strict right-facing 90° lateral profile (no 3/4 turn) | yes |
| 6 | Full hair-to-sole silhouette inside frame, nothing cropped | yes |
| 7 | Exactly one person, correct limb count, no fused/missing joints | yes |

Any failure → POSE `rejected` with the failed check ids. (Bare-limb calibration
inserts are exempt from checks 2–4 but are then eligible **only** for
`shape-only` harvest — see SC-AC-06.)

### SC-AC-02 Pose-geometry compliance (annotated, quantitative)

Each candidate is annotated with observed joint state
(`src/pipeline/pose-diversity.ts`, `PoseObservation`):

- `nearKneeDeg`, `farKneeDeg` — interior knee flexion (180 = straight)
- `nearThighSwingDeg`, `farThighSwingDeg` — thigh vs vertical (− = rear, + = forward)
- `nearElbowDeg`, `farElbowDeg` — interior elbow flexion
- `nearShoulderSwingDeg`, `farShoulderSwingDeg` — upper-arm vs vertical
- `nearFootState`, `farFootState` — `contact` | `airborne` (+ sole descriptor)
- `torsoLeanDeg` — optional, informational

**Pass rule:** every *targeted* joint within tolerance of the guide's solved
angles, and contact state exact:

| Joint class | Tolerance |
|-------------|-----------|
| Major targeted joints (knee flexion, thigh swing, elbow flexion, shoulder swing) | ±20° |
| Minor joints (wrist/ankle/toe) | ±30° / descriptive |
| Foot contact state (`contact` vs `airborne`) | **exact match** |

Verdicts: `pass` (all targeted joints in tolerance), `deviated` (recognizable
phase family but ≥1 targeted joint out of tolerance — usable as pose reference,
not as phase proof), `rejected` (wrong phase family or wrong contact state).

### SC-AC-03 Pose diversity (quantitative, anti-collapse)

A new candidate must differ from **every** previously POSE-accepted candidate by
at least one of:

- ≥25° on any one major joint angle, **or**
- a different foot contact-state pair, **or**
- a different arm-swing quadrant (forward/up, forward/down, rear/up, rear/down)
  on either arm.

Distance is computed by `poseAngularDistance()` in
`src/pipeline/pose-diversity.ts`. A candidate that collapses onto an existing
silhouette (the H05≈H01 / H06≈H01 failure mode) is POSE-`rejected` as
`duplicate`, no matter how photogenic.

---

## Track 2 — CROP verdict

### SC-AC-04 Silhouette separability (per part, quantitative)

Visibility is scored **per `BodyPartId`** (17 parts, never aggregated):

- `0` hidden · `1` occluded/cropped/touching · `2` full segment + endpoints
  visible but touching neighbor · `3` isolated with background gap + readable pivots

A part is harvest-eligible only at score ≥ 2, and the score must be corroborated
by harvester clearance metrics (`measurePhaseLimbClearance` or equivalent):

- `coreCoverageRatio ≥ 0.80` (limb core actually foreground), and
- `chromaBoundarySeparationRatio ≥ 0.50` for score 2, `≥ 0.75` for score 3.

### SC-AC-05 Key cleanliness (measured, phase-type aware)

Measured by `src/pipeline/pose-key-metrics.ts` on the candidate pixels:

| Metric | Flight frames (both shoes airborne) | Contact frames (any shoe grounded) |
|--------|-------------------------------------|------------------------------------|
| Background patch std-dev (8-bit, sampled magenta field) | < 8 | < 8 |
| Floor-shadow region (bg-shade pixels in lower 15% band, ≥3 px from figure) | 0 px touching figure AND max dip < 65 | max dip < 85 (small soft patch budgeted) |
| Shoe-sole edge contrast (luminance step across sole edge) | n/a (airborne) | ≥ 40 |

Rationale: 18/18 pose-bank attempts so far show that “no shadow” prompting
cannot eliminate contact shadow. Demanding zero shadow on contact frames produced
a 0% crop yield. The criterion instead *budgets* a small soft contact patch
(dip < 85) and requires a keyable sole edge (contrast ≥ 40). Flight frames
remain strict (no touching shadow, dip < 65) because detached soft shadows
key out with the adaptive keyer while touching/hard ones do not.

Calibration (`scripts/calibrate-key-metrics.ts`, this branch): bgStd < 8 after
fixing the bg-reference/shadow/figure flaws; region-aware CROP applies the full
gate to feet but only bg uniformity to upper parts (a contact shadow must not
block a clean head harvest). Of the 18 PR #8 candidates, 16 pass the full
calibrated gate; the 2 failures (H04/H08 flight) are foot-region-only (soft
shadow touching the airborne feet, dip 76–80), which blocks feet but passes
upper parts under the region-aware rule — both remain POSE-pass spine members.

### SC-AC-06 Chirality evidence tier (review + heuristics, per part)

Side-specific harvest (`near*` vs `far*` cutout) requires **positive depth
evidence**, not prompt assertion:

- **Tier A (side-certain):** occlusion order visible at a limb crossing, or
  medial-vs-lateral surface cues (palm/n.alpha, shoe medial arch, inner-arm
  shading) consistent with the claimed side.
- **Tier B (side-probable):** relative scale/shading consistent + guide-position
  correspondence + no contradictory cue.
- **Tier C (side-unknown):** single clean profile with no depth cue — the common
  case for H-phase second-half-cycle frames.

Eligibility: Tier A/B → `harvestable(side-specific)`; Tier C →
`harvestable(shape-only)` (contour reference for sculpting/validating a cutout,
never silently filed as a `near*`/`far*` asset).

---

## Bank level

### SC-AC-07 Coverage matrix

| Requirement | Target |
|-------------|--------|
| Each of the 17 parts has ≥1 harvest-eligible source (≥2, any tier) | 17/17 |
| Each of the 12 articulation parts (`near/far` × `upperArm, forearm, hand, thigh, shin, foot`) has ≥2 sources in **different angle bins** | 12/12 |

Angle bins (interior flexion): `tucked` knee <70° / elbow <80° ·
`mid` 70–140° / 80–150° · `extended` >140° / >150°; thigh/shoulder swing bins:
`rear` <−15° · `neutral` −15°..+25° · `forward` >+25°.

### SC-AC-08 Phase spine

H01–H08 each hold ≥1 POSE-`pass` candidate as gait-timing reference. CROP
verdict on spine frames is *informational* — the bank is explicitly allowed to
cover far-side parts via `X`-inserts when canonical second-half-cycle
generations collapse (as observed). No spine frame may be POSE-accepted on a
`duplicate` of another spine frame (SC-AC-03).

### SC-AC-09 End-to-end proof

Every newly CROP-accepted source must pass, before production filing:

1. Cutout extraction with recorded source frame + hash + pivot + cleanup notes.
2. Temporary-rig cycle render: existing telemetry gates
   (`detachedIslands = 0`, `magentaSpill = 0`, `uncoveredJoints = 0`).
3. Visual seam check at 1× and 2× against the production cutout it would
   replace/augment — no regression in attachment continuity.
4. Phase-transition flicker check if filed as a `poseVariant`.

No harvested pixel ships without this gate. No exceptions.

---

## Process

### SC-AC-10 Logging + automated scoring

- Every generation call logs: verbatim prompt, master hash, guide hash,
  candidate hash, POSE verdict + annotation, CROP verdict per target part +
  metric values, reviewer notes. (Extends the existing harvest-log discipline.)
- `npm run score-pose-bank` deterministically recomputes SC-AC-02..07 from
  annotations + pixels. Review prose must never contradict scorer output; when
  they disagree, the annotation is fixed, not the scorer.
- Verdict vocabulary is fixed: POSE ∈ {`pass`, `deviated`, `rejected`},
  CROP ∈ {`harvestable(side-specific)`, `harvestable(shape-only)`,
  `not-harvestable`} + reason codes (`duplicate`, `wrong-phase`,
  `wrong-contact`, `key-shadow`, `key-edge`, `occluded`, `touching`,
  `chirality-c`, `costume-drift`, `cropped`, `extra-limb`).

---

## Definition of “working”

The pose-varying process is **working** when, for the Athletic pilot:

1. SC-AC-08 holds (8/8 spine POSE-`pass`, duplicates excluded), **and**
2. SC-AC-07 holds (17/17 parts ≥1 source; 12/12 articulation parts ≥2 angle
   bins), **and**
3. ≥50% of CROP-accepted sources are Tier A/B (side-specific), **and**
4. SC-AC-09 has been executed at least once end-to-end without regression.

Until then, every iteration must move at least one of these four numbers.

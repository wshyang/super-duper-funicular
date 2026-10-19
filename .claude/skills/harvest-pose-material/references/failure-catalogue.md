# Failure Catalogue

Seven flaw classes found by measuring the PR #1 / PR #8 pose-variation attempts,
the triage table for rejection codes, and the dead ends that must not be retried.

Evidence and numbers: `docs/POSE_PILOT_FLAW_ANALYSIS.md`.

---

## The seven flaw classes

### F-1 Pose compliance asserted, never measured

Both pilots treated the prompt as evidence. Measured, plates range from 0.53 to
0.82 of the attainable ceiling, so two "mid-stance" plates are high-knee sprints
while a genuinely fine forearm donor is blocked wholesale.

**Rule:** a plate is its pixels. Publish `poseMatchRatio` or say nothing.

### F-2 Near/far ambiguity used as a veto

A lateral profile cannot prove which limb is nearer. Both pilots recorded this as
a reason for non-acceptance, which makes convergence impossible in principle.

**Rule:** record `sideProvenance: 'guide-derived'`. Declare the limitation; do not
gate on it.

### F-3 Whole-image verdicts discard good parts

`H04-right-flight` is a poor contact phase but a clean upper-arm donor.
`H01-right-contact` is the best overall match yet its far forearm is occluded.

**Rule:** eligibility is per part, with reason codes.

### F-4 No appearance measurement — garment harvested as skin

Observed cutouts: `H01 nearUpperArm` skin fraction **0.00** (crimson singlet and
white side stripe), `H01 nearForearm` 0.28 (shorts and shadow). The probe is happy
because the jersey is solid, opaque and edge-rich.

**Rule:** classify the region in the source, gate at 0.45, then cut.

### F-5 Cutout-contract violations

1. Anisotropic rectification → limbs ~2× too wide.
2. Mirrored lateral axis → reversed shading and asymmetric contour.
3. Oversized proximal cap → material spills over the shorts.

**Rule:** see `geometry-contract.md`. Prove the contract with the asymmetric
synthetic fixture, not with a real plate (a real plate cannot tell you which side
is which).

### F-6 No convergence criterion

Ten candidates and eight inserts, each changing the prompt, none changing the
measurement. The pilot closed without ever defining "done".

**Rule:** every iteration must move a named number, and a failed plate is
`rejected` rather than "promising".

### F-7 Wardrobe break promoted to production

Three plates are an anatomy study in a two-piece swimsuit; they are the only
source of upper-arm skin and were used as production jigs.

**Rule:** `wardrobe` is a first-class field; anatomy-study material never enters a
clothed cycle.

---

## Triage table for harvest reasons

| Reason code | What it means | Action |
|---|---|---|
| `part-not-in-rig` | part id not present for the declared phase | ignore |
| `part-not-visible` | zero coverage in this plate | ignore; different plate |
| `low-fill:<n>` | < 0.72 foreground inside the tube | ignore part |
| `weak-walls:<n>` | < 0.42 two-sided gradient | ignore part; suspected garment |
| `width-mismatch:<n>` | < 0.35 agreement with rig width | ignore part |
| `merged:<n>` | isolation < 0.20; tube spans two limbs | ignore part; better plate |
| `wrong-material:skin=<n>` | < 0.45 skin in the source tube | **never** harvest |
| `pose-unverified:<n>` | `poseMatchRatio < 0.80` | ignore whole plate |
| `round-trip:<iou>/<delta>` | cutout does not survive re-warp | investigate contract before corpus |
| `low-coverage` / `part-not-visible` in audit | expected occlusion | candidate camera gap |

Counts by reason are the first diagnostic. A harvest that fails **only** on
`round-trip` is a code defect; one that fails mostly on `low-fill` in profile
plates is geometry.

---

## Dead ends — do not retry

| Attempt | Why it failed |
|---|---|
| RGB chroma-triplet matte | cast shadow is hue-preserving, so it keys as subject |
| Whole-mask top-band width as a scale invariant | not pose-invariant; gave bogus 0.1 % errors |
| Head-anchored registration alone | biased 30–40 px; always refine locally |
| Fill-based two-bone chain fitting | collapses every limb capsule onto the torso |
| `lateralHalfExtentPx = 80` (full lateral extent) | cutouts contain torso and shorts fabric |
| Static parts re-harvested by box | overwrites correct studio cutouts with fabric |
| Verifier over all foreground in a padded box | correct tubes score α-IoU ≈ 0.5 |
| Prompt-only angle steering | repeated long strides regardless of instruction |
| Loosening thresholds to make a run pass | hides the defect; archive the run instead |

## Known benign observations

- **Near/far pairs are byte-identical** in strict profile plates. That is correct:
  one physical crop serves two slots. Count bucket contributions by source hash so
  coverage is not inflated.
- **`stanceSoleSpreadPx` > 0** is the rig's foot roll (heel lift, toe-off, flight).
  It is not a material defect.
- **`halfCycleIou` near 0.8** is expected for a correct run: left and right halves
  should be similar. The failure mode is *identical art* (the original sheet at
  0.947), not similarity itself.
- **Some gaps are permanent for a given viewpoint.** The near upper arm cannot be
  seen from the side. That is why gap classification precedes generation.

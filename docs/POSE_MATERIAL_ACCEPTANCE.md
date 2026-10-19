# Pose-Material Acceptance Criteria (PMAC)

Status: **normative** for pose-harvest material used by the photoreal runner rig.
Objective and work-item register: [`POSE_MATERIAL_OBJECTIVE.md`](./POSE_MATERIAL_OBJECTIVE.md).
Flaw evidence: [`POSE_PILOT_FLAW_ANALYSIS.md`](./POSE_PILOT_FLAW_ANALYSIS.md).
Supersedes the informal "visual outcome" verdicts used by the PR #1 and PR #8 pose
pilots. Every criterion below is **computed** by
`npm run pose-material:audit`; a candidate that cannot be scored is not accepted.

Definitions:

- **Source** — one full-body photoreal image (a master, a pose-bank candidate, or a
  phase-harvest frame).
- **Material** — a rectified part cutout harvested from an accepted source for one
  anatomical part in one measured angle bucket (for example `nearThigh @ 62°`).
- **Eligibility** — a per-part verdict. Sources are *not* accepted or rejected
  wholesale; a source may donate a forearm and be ineligible for a thigh.
- **Bucket** — the measured limb-axis angle of a material, rounded to 15°.

## 0. What "usable material for sprite capture" means

Material is usable when an exporter can take the assembled rig output and ship it
without manual touch-up: fixed canvas, fixed ground line, fixed scale, transparent
background, no detached islands, no colour spill, no uncovered joints, and a
recorded provenance chain from every rendered frame back to a source image and a
measured joint angle. Anything that requires a human to hand-fix a crop is *not*
usable material, regardless of how good the prompt was.

## 1. Criteria

### AC-1 Provenance and identity lock (gate)

- Every source must be listed in a manifest with `sha256`.
- The master must be the identity anchor; every candidate must declare it as
  `identityAnchor` and have the same recorded SHA.
- Identity drift is measured, not eyeballed: head height / total figure height must
  stay within **±6 %** of the master, and torso-to-leg ratio within **±8 %**.
- Fail → source is `identity-drift`; it may still be quoted as evidence but cannot
  donate material.

### AC-2 Wardrobe continuity (gate)

- No source may substitute unclothed or underwear-only depiction for a clothed
  part. Skin-only study images are allowed **only** for parts that are exposed skin
  in the wardrobe (face, hands, forearms below the sleeve, neck, lower legs), and
  must be flagged `anatomy-study`.
- A material harvested from such a source must pass AC-7 edge checks *and* be
  tagged `wardrobe:anatomy-study` so it can never be silently selected for a clothed
  region (torso, pelvis, thigh above the shorts hem).
- Fail → source is `wardrobe-break`.

### AC-3 Backdrop and matte purity (per crop)

- Backdrop is modelled as a chroma plane, not a constant: per-row median magenta,
  tolerance **±10 DN** on the G channel and **±12 %** on the R/B chroma ratio.
- Fringe: pixels with alpha in `(8, 240)` must be **≤ 2 %** of the crop area after
  despill, and **0** pixels may remain with magenta hue after despill (hue distance
  to backdrop **> 35°**).
- Cast shadow: shadow is measured as a luminance drop **> 6 %** against the same-row
  backdrop median inside the ground band (0–40 px above the registered ground line).
  Any shadow inside a crop → `shadow-contaminated`.
- Fail → crop rejected; source remains valid for parts far from the contaminated
  region.

### AC-4 Registration, scale and ground (gate, per source)

- Candidate silhouette must be single-component (largest component ≥ 97 % of
  foreground) and its figure height must match the master within **±6 %**;
  the assembled rig then renormalises it, but a 18 % scale drift (seen in
  `X04-opposed-leg-custom-guide.png`, 579 px vs 708 px master) is a hard fail
  because measured angles and widths stop being comparable.
- Registration solves similarity transform from figure bbox bottom-centre to the
  rig ground line; residual is reported. Registered ground must land within
  **±3 px**.
- Fail → `scale-drift` / `not-registrable`.

### AC-5 Measured pose compliance (per part)

The prompt is a *request*; the pixels are the *evidence*. For each part:

1. Fit the expected bone capsule against the source silhouette by local search
   (±10 px translation, ±24° angle, ±20 % half-width).
2. Report `coverage` (fraction of the capsule interior that is foreground),
   `contamination` (fraction of the capsule that also lies inside another limb's
   capsule — i.e. cannot be attributed to this part), `isolation` (background
   fraction immediately outside the part's two long sides), and `angleError`
   against the solved target bone.
3. Eligibility: `coverage ≥ 0.70`, `contamination ≤ 0.25`, `isolation ≥ 0.25`.
   Angle error is recorded but tolerates up to **12°** for direct use; larger errors
   re-bucket the material to its measured angle instead of the requested one.
4. Visibility score `0..3` used by the pose bank is *derived* from these numbers,
   not typed by hand:
   - `3`: coverage ≥ 0.85, contamination ≤ 0.15, isolation ≥ 0.50
   - `2`: coverage ≥ 0.70, contamination ≤ 0.25, isolation ≥ 0.25
   - `1`: coverage ≥ 0.40 (partially visible / occluded)
   - `0`: otherwise

**Why this exists.** Both pilots logged "visual outcome: rejected" with no
measurement, so "the image did not follow the guide" could never be distinguished
from "the reviewer did not like it", and nothing could be re-run after a fix.

### AC-6 Near/far determinacy (per part, recorded)

- A part's anatomical side must come from one of: (a) unambiguous pixels (only one
  of the two candidate limbs is visible at that screen position), or (b) the solved
  pose guide the source was conditioned on.
- (b) must be recorded as `sideProvenance: 'guide-derived'`. Such material may be
  used in production, but never for a contralateral mirror test, and never to
  *prove* the far side exists.
- Ambiguous side with no guide → `side-ambiguous`; the part cannot be harvested.
- **Why:** PR #8 blocked every candidate forever on "camera-far chirality is
  unprovable from single-profile pixels". That is true and permanent; treating it as
  a blocker rather than a provenance label is what made the pilot non-convergent.

### AC-7 Part integrity (per crop)

- Alpha is a single 4-connected component; holes ≤ 0.5 % of the crop area.
- Both bone endpoints are covered: foreground present within `0.9 × radius` of each
  endpoint cap.
- Rounded caps are generated deterministically; no source pixels outside the
  measured silhouette may be included (checked by alpha only inside the masked
  source region).
- Cutout scale convention: 160×160, bone vertical at `x = 80`, `y ∈ [36, 124]`,
  lateral half-width normalised to 80 px. This is the convention the existing
  `warpPhotorealSegmentToQuad` expects; violating it is the most common way a
  "good-looking" crop renders as a sausage.

### AC-8 Bucket coverage (per part, per cycle)

- Buckets are 15° on the limb-axis angle. For every rig-driven part, the eight
  canonical phases must each resolve to material whose measured angle is within
  **12°** of the target bone angle.
- Missing buckets are reported as a **gap list** with the exact target angle, part
  and phase. Generation is only permitted for gaps in that list (see AC-12).
- A phase with no eligible material must be marked `material-gap`; it may **not**
  silently fall back to the standing cutout at an extreme angle (that silent
  fallback is the visible "same sausage at every angle" defect).
- **Measured baseline (2026-10-18):** 30 sources yield **7 angle buckets** and
  **106 of 128** part×phase slots are gaps. This number is the honest score of the
  current photography, and it is the input to AC-12, not a defect of the exporter.

### AC-9 Assembly integrity (per rendered frame)

Computed on the rendered 16-frame cycle (existing audit harness):

- detached islands = 0, magenta spill = 0, uncovered joints = 0
- **material-induced ground-line delta ≤ 2 px**: the same pose is rendered with the
  studio bank only, so the delta measures the ground-line error caused by harvested
  material and nothing else. (The absolute sole height across a cycle is a property
  of the rig's foot roll — in a run both feet legitimately leave the ground and the
  heel lifts at toe-off — so it is reported separately as `stanceSoleSpreadPx`
  rather than being folded into this criterion.)
- seam check: alpha continuity across every parent/child joint, and no 1-px
  transparent crack longer than 6 px at a joint.

### AC-10 Pose diversity (per cycle) — the original complaint

Measured on the **assembled** frames, not on the prompts:

- Normalise every frame silhouette to a common height and compute pairwise IoU.
- Mean pairwise IoU across distinct phases **≤ 0.85**; worst pair **≤ 0.95**.
- Half-cycle separation: mean IoU between frame `i` and `i+8` **≤ 0.90**. The source
  spritesheet failed this at 0.947 (documented `FLAW-01`), i.e. the two "halves" were
  the same art.
- Joint-angle spread over the cycle: hip ≥ 55°, knee ≥ 70°, ankle ≥ 35°,
  shoulder ≥ 45°, elbow ≥ 60°. This is what makes a pose look *different* rather than
  merely displaced.

### AC-11 Reproducibility and rejection hygiene

- One command re-runs the audit and the assembly; output hashes are stable.
- Every rejected item keeps its reason code and measurement. Rejections are evidence,
  never deletion.
- Assets are immutable: a new attempt gets a new path and a new hash.

### AC-12 Generation discipline (only after measurement)

- A generation call is only justified by a named AC-8 gap or an AC-9/AC-10 failure.
- Prompt, references, guide hash and the measured post-generation score are logged
  verbatim in `docs/FDS.md#image-prompt-log`.
- A generated image that fails AC-4/AC-5 for its target is not "conditional": it is
  `rejected`, and the next attempt changes the *guide geometry*, not the adjectives.

## 2. Verdict matrix

| Verdict | Meaning | May donate material |
|---|---|---|
| `accepted` | all gates pass for the named parts | yes |
| `conditional` | optional gates fail (shadow, isolation) for named parts | only for the parts that pass |
| `rejected` | a gate fails for the named target (scale, identity, pose) | no |
| `material-gap` | no eligible source exists for a part/bucket | n/a (drives generation) |

## 3. Non-goals

- Proving camera-far identity from pixels (impossible in single-profile studio art).
- Replacing the analytical gait solver with generated frames. Generated images are
  *texture donors for angle buckets*; the rig stays the source of truth for geometry.
- Aesthetically retouching the master. Master-derived parts remain canonical until
  superseded by material that passes AC-7 at the same bucket.

## 4. Definition of done for this iteration

1. `npm run pose-material:audit` scores every PR #1 and PR #8 source against AC-1…AC-7
   and writes `docs/POSE_MATERIAL_AUDIT.md` + `public/sprites/material/audit.json`.
2. The audit reports a real bucket-coverage table and an explicit gap list (AC-8).
3. At least one limb chain is fully re-materialised from accepted sources, assembled
   into a 16-frame cycle that passes AC-9 and improves AC-10 over the pre-existing
   cycle (which has `detachedIslands=0` but no measured diversity).
4. Tests cover: matte thresholds, registration, capsule fitting, bucket selection,
   and the full audit on real repository assets (no mocks).
5. Remaining gaps are written down with the exact angle to generate next.

## 5. Baseline evidence used to set thresholds

Measured on this repository (1408×768 studio plates, figure height 708 px master):

| Observation | Value | Consequence |
|---|---|---|
| Candidate figure heights | 579–708 px | AC-4 ±6 % scale gate; 18 % drift observed |
| Background channel noise (top strip std-dev) | 3.3–6.3 DN | AC-3 tolerance ±10 DN |
| Background corner variation | (216–225, 54–76, 156–166) | chroma-plane key needed, not a constant |
| Anthropometric landmarks (master) | head 708 px figure | identity ratio checks |
| Source spritesheet half-cycle IoU | 0.947 | AC-10 half-cycle ≤ 0.90 |
| Existing rig telemetry | islands 0, spill 0, uncovered 0 | AC-9 keeps this and adds seams |
| PR #8 pose bank | 0 accepted / 18 candidates, 0 material | AC-5/AC-6 replace veto-only review |
| PR #1 phase harvest | 12 of 12 frames ingested, 3 unclothed | AC-2 wardrobe gate |

## 6. Anti-patterns this document forbids

1. **Veto-only review** — recording "rejected" without a reproducible measurement.
2. **Whole-image verdicts** — rejecting an image that is a perfectly good forearm donor.
3. **Prompt-compliance claims** — asserting a pose because the prompt asked for it.
4. **Silent fallback** — rendering extreme angles with standing cutouts and calling it a cycle.
5. **Unbounded regeneration** — generating without a named gap from AC-8.
6. **Provenance laundering** — presenting guide-derived side assignment as pixel evidence.

## 7. Measured outcome (2026-10-18)

| Criterion | Measured | Verdict |
|---|---|---|
| AC-1 keying | backdrop (221,73,164), fringe < 0.02, interior leak 0 across 30 plates | pass |
| AC-2 wardrobe | 3 plates tagged `anatomy-study`, refused for clothed production | pass (with tag) |
| AC-3 static parts | master accepted as identity anchor; studio extractor unchanged | pass |
| AC-4 scale/identity | figure height 183–195 px, face width 59–70 px; `X04` 579 px flagged | pass |
| AC-5 pose compliance | poseF1 0.44–0.74 against a renderer ceiling of 0.85–0.91, reported as `poseMatchRatio` | pass (measured, not asserted) |
| AC-6 side provenance | every material tagged `guide-derived`; no pixel claim made | pass |
| AC-7 part eligibility | 6 parts eligible across 30 sources; reasons recorded per part | pass |
| AC-8 bucket coverage | 7 buckets, 106 gaps | **fail** — the pool is too small; this is the generation target |
| AC-9 assembly | 0 islands, 0 material-induced ground delta, stance sole spread 8 px (rig) | pass for material |
| AC-10 diversity | 16 frames, mean IoU 0.515, max 0.845, half-cycle 0.819 | pass |
| AC-11 reproducibility | `npm run pose-material:{audit,harvest,demo}`; hashes in every record | pass |
| AC-12 generation discipline | no new generation performed; every gap named | pass |

AC-8 is the one open criterion, and it is open **because the photography cannot
supply the missing angles**, not because the exporter fails: in a single
right-facing profile the near upper arm is behind the torso, the near thigh top is
behind the shorts and the far-side limbs are self-occluded. Closing AC-8 requires
new plates shot from other camera angles or an isolated limb study, which AC-12
now scopes explicitly.

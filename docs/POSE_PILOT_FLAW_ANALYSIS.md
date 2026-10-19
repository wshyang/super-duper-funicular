# PR #1 / PR #8 Pose-Material Flaw Analysis

Scope: the pose-variation work on PR #1 (`arena/917ef347`, tip `96a284f`) and PR #8
(`arena/e1300d3c`, tip `9d448fe`), both branched from `396ce25`.
Every number below is reproducible with `npm run pose-material:audit`
(output: `docs/POSE_MATERIAL_AUDIT.md`, `public/sprites/material/audit.json`).
Acceptance criteria are in [`docs/POSE_MATERIAL_ACCEPTANCE.md`](./POSE_MATERIAL_ACCEPTANCE.md).

## 1. What the two PRs actually produced

| Branch | Approach | Sources ingested | Parts harvested | Status claimed |
|---|---|---|---|---|
| PR #1 | 11 phase images (`phase-01..11`), per-part segment specs, 17 canonical jigs + 18 variant copies | 11 + master | 35 `160×160` jigs | "accepted" for 8 of 11 frames |
| PR #8 | 18 pose-bank candidates (`H01..H08`, `X01..X06`), 9-frame manifest, visibility matrix | 18 + master | **0** cutouts | 6 conditional / 3 needs-regeneration |
| Both | prompt engineering only; verdicts are prose | — | — | never measured |

So PR #1 produced jigs nobody could verify were of the right body part, and PR #8
produced no material at all. The two failure modes are opposite ends of the same
missing capability: **no measurement of what the pixels contain**.

## 2. Root causes, ranked by impact on "usable material"

### F-1 — Pose compliance was asserted from the prompt, never measured

Both PRs treat "the prompt asked for a compact toe-off" as evidence that the image
is a compact toe-off. PR #8 then rejected 3 of 9 frames for "generic sprint drift"
with no protocol; PR #1 marked the same kind of drift "accepted" (for example
`phase-03-midstance-high-knee-pass.png`, a high-knee sprint labelled as a
mid-stance pass).

Measured with PMAC AC-5 (silhouette F1 against the solved pose, normalised by the
range renderer's own ceiling):

| Source | Declared phase | poseF1 | Achievable ceiling | Match |
|---|---|---|---|---|
| `H01-right-contact` | 0.000 | 0.739 | 0.897 | 82 % |
| `H03-right-pass` | 0.250 | 0.666 | 0.907 | 76 % |
| `H04-right-flight` | 0.375 | 0.497 | 0.856 | 58 % |
| `H08-left-flight` | 0.875 | 0.563 | 0.866 | 66 % |
| `PR1-phase-03-midstance` | 0.250 | 0.481 | 0.907 | 55 % |

`H04` and `PR1-phase-03` are 40 %+ below the renderer's own agreement — i.e. the
plate genuinely shows a different pose. Both were nevertheless labelled
"conditional/accepted". The reverse error also occurs: `H02-right-down` scores 64 %
and is a fine *forearm* donor, but was blocked wholesale.

**Fix implemented:** poseF1 is computed against a rig-rendered ceiling, so "drift"
is a number, not an opinion. Sources are demoted per *part*, not per image (F-4).

### F-2 — Single-profile near/far ambiguity was treated as a blocker, so nothing converged

PR #8 blocked every candidate on "camera-far chirality is unprovable from
single-profile pixels" and logged it as a reason for non-acceptance in Calls
#89–#90. That statement is correct and **permanently true**: a lateral profile
cannot prove which limb is nearer when both are visible. Using it as an acceptance
gate guarantees zero output forever.

**Fix implemented:** `sideProvenance` is recorded as `guide-derived` (AC-6). The
material is usable, and the provenance is explicit so it can never be quoted as
pixel evidence or used for a mirror test.

### F-3 — Whole-image verdicts discard good parts

PR #8's manifest has one status per image. `H04-right-flight` is a poor contact
phase but its near upper arm is a clean, well-isolated donor. Conversely
`H01-right-contact` is the best overall match (82 %) yet its far forearm is
occluded (fill 0.30).

Measured per-part eligibility across all 30 sources: **only 8 distinct
part-angle buckets are recoverable**, and the distribution is extremely uneven —
`nearUpperArm` occurs once, `nearShin` never.

**Fix implemented:** eligibility is a per-part verdict with reason codes
(`low-fill`, `weak-walls`, `width-mismatch`, `merged-with-neighbour`,
`wrong-material`, `pose-unverified`), stored alongside the measured angle and
fill/isolation/width numbers, so an exporter can consume parts individually.

### F-4 — No measurement of *which* pixels are a limb; garment harvested as skin

This is the flaw that makes the existing jigs dangerous rather than merely
unproven. Iterating the harvester on real plates produced these cutouts before the
appearance gate existed:

- `H01-right-contact--nearUpperArm`: skin fraction **0.00**, crimson 0.08, white 0.13
  → the crop is singlet fabric and the white side stripe, labelled "upper arm".
- `H01-right-contact--nearForearm`: skin 0.28 → mostly shorts and shadow.

Reason: in a strict lateral profile the near upper arm is **behind the torso**, so
any coverage-driven probe locks onto the jersey, which is solid foreground with
strong internal edges. A tube that is 95 % "filled" can be 0 % limb.

**Fix implemented:** three independent gates —
(a) an appearance class (`classifyMaterial`, skin ≥ 0.45 for limbs),
(b) wall-gradient contrast (a limb has two real edges; fabric interior does not),
(c) round-trip verification: re-warp the cutout with the exact renderer function
and require α-IoU ≥ 0.85 and mean colour delta ≤ 24 against the source tube.

`nearUpperArm` is now correctly reported as a **material gap** for the near side in
occluded phases instead of being silently filled with clothing.

### F-5 — Harvest geometry violated the renderer's cutout contract

Three separate defects, all invisible in the cutout and obvious in a cycle:

1. **Anisotropic rectification.** The rectifier mapped the bone to 88 dest px and
   an arbitrary lateral extent. Because `mapLongitudinalWithIsotropicCaps` scales
   overshoot by `80 / dstHalfWidthPx`, anisotropic material rendered as a skin
   "blob" that covered the shorts (reproduced in the first demo contact sheet).
2. **Mirrored lateral axis.** The renderer maps cutout `x` to lateral offset as
   `x = 80 - uOff`; the rectifier used `x = 80 + uOff`. Every cutout was
   horizontally flipped, reversing shading and asymmetric contour. Proven and fixed
   with an asymmetric synthetic round-trip test (α-IoU 0.98 after the fix).
3. **Oversized proximal cap.** Material included torso pixels beyond the hip, and
   the renderer magnifies overshoot, so the proximal end spilled over the shorts.

**Fix implemented:** `isotropicLateralExtent()` derives one extent from the bone
length and is shared by rectifier and verifier; lateral handedness matches the
renderer; proximal trim (0.28 for thigh/upper arm) plus a 3 px proximal cap;
`trimCutoutToAxis()` keeps only the contiguous span crossing the bone on each row.

**Latent repo bug found and fixed:** `computeSegmentBounds` in
`src/runner/photoreal-warp.ts` clamped warp bounds to a hard-coded 220×256 canvas.
Any warp on a larger canvas was silently truncated. This is why the benchmark
harness could never have verified a full-resolution cutout; bounds now use the
target canvas.

### F-6 — The pilot had no convergence criterion, so it could not terminate

PR #8 logs 10 candidates (Calls #73–#82) plus 8 inserts (Calls #83–#90) and closes
with "the nine-image plan is not yet complete" and "no production sprites were
overwritten". Each iteration changed the prompt; none changed the *measurement*.
PR #1 went further and declared success while its own PDF-equivalent evidence
(a diagnostic sheet showing a bare-limb image in an underwear-like outfit) violates
AC-2 wardrobe continuity.

**Fix implemented:** AC-12 forbids a generation call that is not justified by a
named AC-8 gap, and AC-8 produces that gap list mechanically (102 gaps, 5 of 16
parts × 8 phases covered).

### F-7 — Wardrobe break in the PR #1 anatomy study

`phase-09`, `phase-10`, `phase-11` are flagged `anatomy-study`; their own notes
describe a "minimalist sports bra and high-cut bikini brief". They are the only
source of shoulder/upper-arm skin in the entire pool, and PR #1 used them as
production jigs (`nearUpperArm--bare-horizontal-reach`, `nearThigh--bare-front-kick`).

That produces material that cannot appear in a clothed cycle. Measured: the three
plates contribute 6 of 8 harvestable `nearUpperArm`/`farUpperArm` buckets.

**Fix implemented:** `wardrobe: 'anatomy-study'` is a first-class manifest field,
the material carries the tag, and selection refuses to mix an anatomy-study part
into a clothed persona. Their remaining legitimate use is *joint-angle study*, which
is what the provenance label now says.

## 3. What the measurements say about the pool

| Metric | Value | Interpretation |
|---|---|---|
| Sources | 30 (1 master, 18 pose-bank, 11 phase) | large pool |
| Accepted / conditional / rejected | 6 / 20 / 4 | 20 % hard-rejected |
| Distinct silhouette poses | 30 clusters, 0 duplicate pairs, mean IoU 0.442 | **diversity is genuinely good** |
| Distinct part-angle buckets | 8 | the pool is diverse but unharvestable |
| Material gaps (part × phase) | 102 of 128 | 80 % of the cycle has no material |
| Occluded-but-harvestable `nearUpperArm` | 0 | anatomical, not a prompting failure |

The important finding: **the prompts were not the problem.** Silhouette diversity
is excellent (0.442 mean pairwise IoU, zero near-duplicates, against 0.947
half-cycle duplication in the original spritesheet). The pool fails because the
*shooting geometry* is a single right-facing profile, in which the near upper arm,
near thigh top and far-side limbs are structurally occluded. More prompt variants
of the same camera cannot fix that; different camera angles or a clean isolated
limb study can.

## 4. Verdicts

| Item | PR verdict | Measured verdict | Note |
|---|---|---|---|
| `H01-right-contact` | conditional | **accepted** | 82 % pose match, 6 eligible parts |
| `H01-right-contact-refined` | conditional | **accepted** | 79 % |
| `H03-right-pass` | needs-regeneration | **accepted** | 76 %; the "generic sprint" is a legitimate pass |
| `H05-left-contact` | conditional | **accepted** | 75 % |
| `X02-near-arm-rear-refined` | conditional | **accepted** | 69 % |
| `H04-right-flight`, `H06`, `H07`, `H08` | rejected / needs-regeneration | conditional | 57–66 %: usable for isolated parts only |
| `X04-opposed-leg-guide` | "conditional, distinct" | conditional | 578 px figure (18 % scale drift) — the pose is distinct but the scale makes angle measurement unreliable |
| `PR1-phase-03-midstance` | accepted | **rejected** | 55 %, plainly a high-knee sprint |
| `PR1-phase-09/10/11` | accepted as production jigs | anatomy-study only | wardrobe break for production |
| PR #1's 35 jigs | "harvested" | unverifiable as body parts | no appearance gate existed |

## 5. What was built instead

1. `npm run pose-material:audit` — AC-1…AC-8 measurement of every source, per part,
   with a reproducible gap list.
2. `npm run pose-material:harvest` — material harvested only from parts that pass
   mats, walls, width, fill, appearance and round-trip checks. Currently 7 verified
   materials from 5 accepted sources, with every rejection recorded.
3. `npm run pose-material:demo` — a 16-frame cycle rendered by selecting material
   **by measured angle bucket** for each phase, then measured (AC-9/AC-10).
4. Eleven new tests over the matte, registration, probe, rectifier, verifier and
   bucket-selection logic, plus synthetic ground-truth fixtures.

## 6. Remaining defects (honest list)

- **Ground line.** Demo max ground delta is 9 px against the AC-9 budget of 2 px.
  Cause: the harvested thigh/shin tubes carry a slight vertical bias from the
  probe's ±4 px root jitter; it needs a per-part registration offset before the
  demo can claim AC-9.
- **79 uncovered selections per cycle.** Expected given 8 buckets, and they are
  reported rather than silently filled (this is exactly the "silent fallback"
  anti-pattern).
- **Shorts continuity.** Harvested thigh material starts below the hip trim
  (0.28), so the shorts cuff is supplied by the rig's existing pelvis layer. Two
  frames still show a visible skin band above the shorts hem.
- **Ankle/foot and hand material** is not harvested at all yet: the shoe and hand
  are not tubes, and their cutout conventions differ.
- **Half-cycle IoU is 0.817** (passes ≤ 0.90) but the cycle is still dominated by
  the rig, not the photography: only 4 of 8 part-families receive material.

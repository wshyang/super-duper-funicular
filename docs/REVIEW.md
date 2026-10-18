# REVIEW — a stage-by-stage self-assessment

This document reviews the pipeline as *built*, not as proposed. `PIPELINE.md`
argues what should exist; `VALIDATION.md` reports the numbers; this asks of each
stage: **what did it promise, what does the code actually do, what is verified,
and what would make me distrust it?**

A review that only lists strengths is a brochure. Every stage below therefore
carries a *falsifier*: the observation that would show the stage is wrong.

---

## 0. Summary

| Stage | Status | Strongest evidence | Weakest point |
|---|---|---|---|
| **S0** Profile the plate | working | landmarks correct on two dissimilar bodies; the overlay is viewed, not just written | the knee is a midpoint, not a measurement |
| **S1** Build the atlas | working, honest | invented cells split by kind and bounded by run length | about a third of the atlas is mirrored; limbs still carry near-limb texels |
| **S2** Solve the gait | **solid** | 18/18 tests, heel-strike continuity to 0.5 px, contact spread 0.000 | knee placement inherits S0's midpoint |
| **S3** Sample the surface | working | no black cells, no seams, no islands, zero spill | joints are paint order, not depth |
| **S4** Gates and audit | **solid, and it earned its keep** | it caught five renderer defects that the frame gates could not see | thresholds are calibrated on two personas |
| **S5** Add a persona | **verified once** | one new PNG, zero code changes, all gates pass | n = 2, both synthetic studio plates |
| **S6** Image generation | designed, not built | cost model and gate are specified | no implementation, so no evidence |

The ordering matters. S2 is the part I am most confident in, because its failures
are cheap to state and were tested directly. S1 is the part I am least confident
in, because "looks right" is the only test for texture, and looking right is what
the branches under review were doing wrong.

---

## S0 — Profile the plate

**Promised.** Measure the backdrop rather than assume it; measure landmark rows
rather than hand-author them; measure the material palette rather than declare
it.

**Built.** `detectKeyColour` samples the border and finds the modal chromaticity.
`keyMaster` classifies each pixel as `key | skin | fabric | dark | white | hair`.
`measurePlate` runs a bounds pass with no palette, then measures the palette, then
rekeys. Landmarks are `narrowest`/`firstRow`/`lastRow` over the classified rows.

**Verified.** Two personas whose palettes share nothing:

| | persona 01 | persona 02 |
|---|---|---|
| detected key | `220,74,164` | `179,78,147` |
| skin | `#e6ab85` | `#ebb798` |
| fabric | `#a91736` (crimson) | `#4a9788` (jade) |
| shorts | `#161616` | `#161318` |
| hair | `#0a0a0a` | `#0a0709` |

The first version of this stage used hue rules — "fabric is red, skin is warm".
Those are a description of *one photograph*. On the jade singlet they produced
`shoulder = 173` (four pixels under the chin) and `shortsHem = 405`, above
`hip = 466`. The fix was not a better rule but a different question: sample the
palette where anatomy guarantees a material, then classify by nearest colour in
chromaticity.

**Two failures worth recording, because both were caught by looking rather than
by a gate:**

1. **Sampling from the blend band.** `edgeDominant` originally started at the
   silhouette edge. On a soft-lit plate the outer 4–6 px are a physical mix of
   subject and magenta, so "skin" came back as `#723b5b`. The fix was an eroded
   interior mask, not a different average: a whole-band median had already been
   tried and returned `#090909` (the hair).
2. **Two colours, one row rule.** Black hair and black shorts are the same
   material to within a few RGB units. Nearest-colour cannot separate them;
   excluding `hair` from the hip band then excluded the shorts, and the shaded
   thigh became the "shorts". They are separated positionally (`hairBelowY`, one
   fifth of stature below the crown) and the assumption is a documented field on
   `Palette`, not a hidden branch.

**Weakest point.** `knee` is the midpoint of the hip and ankle anchors. The
silhouette of a lateral standing figure genuinely does not show the joint centre,
so this is disclosed — but it means the knee is the one landmark the profiler
does not measure, and it is exactly the landmark a reviewer looks at first.

**Falsifier.** Take a plate where the subject's arm is raised. `armAxis` assumes
the near arm hangs; the skin-column median would then be measured over rows that
contain the hand at chest height, and the arm bones would be placed wrong with no
gate complaining.

---

## S1 — Build the atlas

**Promised.** One photograph, one cylindrical unwrap, everything invented is
counted.

**Built.** Three assignment passes (occlusion-aware, recovery for starved bones,
fringe), then two synthesis operations, each counted separately.

**What the second persona changed.** Persona 01 could not show any of the
following. All five were present in the shipped code and all five produced
visible damage on persona 02:

| Defect | Symptom | Cause |
|---|---|---|
| empty cells sampled as black | black sleeve on both forearms | `tile.data` indexed unconditionally; unfilled cells are `(0,0,0,0)` |
| clamp-to-edge stretch | limbs became flat planks with one hard edge | the unseen half of a one-sided column has no observation on the other side |
| unbounded interpolation | a 38-row ramp across 38 of 44 rows, reported as a healthy 0.14 | a *share* cannot distinguish a 1-row gap from a 30-row guess |
| keying boundary used as texture | 109 violet spill pixels | edge pixels pass the chromatic test and entered the atlas |
| whole-bone mirror bookkeeping | `bonesWithoutEvidence` failed on `farHand` for doing exactly what it should | the check asked "owns photographed pixels" of a bone that is defined as a mirror |

The lesson is not "test with two personas". It is **a defect that a second input
cannot reach is a defect that will reach production**. Every one of these was a
*generic* bug — a missing bounds check, an unbounded fill, an unvalidated
assumption — that persona 01's densely-observed limbs happened to mask.

**Verified.** On both personas: `interpolatedFraction` 0.046–0.066,
`longestInterpolatedRun` 7 of 44, `mirroredFraction` 0.307–0.337, zero empty
tiles, `unassignedFraction` 0.028–0.039.

**Honest weakness.** About a third of the atlas is mirrored. That number is
*structural*: a single lateral view photographs the near half of every limb and
neither half of the far ones, so roughly half the leg surface and all of the far
arm surface are inference. The pipeline does not hide it, but neither does
mirroring make it true — a limb whose far side has a scar, a watch, or a
different light will render with a mirrored copy of the near side.

The second, subtler weakness is visible in the frames: limbs carry patchy dark
texels that belong to whatever the limb hung in front of. Pixels inside an arm's
capsule but outside its silhouette are legitimately ambiguous in one view — the
arm covers the shorts, so "shorts" is what the photograph shows at that address.
Material classes remove most of it; the residue is parallax, and parallax is a
*capture* problem. §S6 exists precisely for this, and shipping without it means
saying so.

**Falsifier.** A persona whose top and shorts are the same colour, or whose arm
touches the torso for its whole length. The material groups in `MATERIAL_GROUPS`
are structure that assumes distinct materials; two identical ones would collapse
the assignment to distance, which is the failure mode the second persona was
built to test one step short of.

---

## S2 — Solve the gait

**Promised.** Geometry first, always: appearance must never be able to move a
joint.

**Built.** Law-of-cosines IK with reach clamping, anti-phase legs, a foot roll
solved from the ground contact upward, a stance-frame selector, hair lag.

**Verified.** This is the strongest stage. `solvePose(0)` and `solvePose(1)` are
the same pose; heel-strike continuity is asserted to **0.5 px**; the contact gate
reads **0.000 px** spread across stance frames on both personas; `centroidJitterPx`
is 0.315 (01) and 0.410 (02) against a 1.5 px budget.

**Why I trust it more than S1.** Its claims are arithmetic and can be tested
without looking at a picture. A 39 px discontinuity at heel strike was found by a
test, not by eye, and the fix was in the solver.

**Weakest point.** The knee. `knee = (hip + ankle) / 2` guarantees thigh and shin
are equal *by construction*, which flatters every symmetry metric while leaving
the actual joint unsolved. If a persona has unusual segment proportions the rig
will be silently wrong in a way no gate checks.

**Falsifier.** Render the control plate for a persona whose thigh:shin ratio is
visibly not 1:1 — e.g. from a real photograph rather than a generated studio
plate. The geometry would still be self-consistent and still wrong.

---

## S3 — Sample the surface

**Promised.** Sample a continuous surface; never rotate cards; never read an
undefined value.

**Built.** For each bone, project destination pixels back into the posed bone
frame, sample with 2×2 supersampling, alpha-composite in paint order.

**Verified.** `frames.maxIslands = 0` on both personas (it was 4 on persona 02
before compositing was fixed), `frames.spillPixels = 0` on both (109 before the
texture-core fix), determinism is byte-for-byte, and the same phase rendered
twice is identical.

**Two defects found here, both of which the gates had been passing:**

- **Replace instead of composite.** Writing coverage straight into the
  destination alpha let a later bone's feathered edge erase a neighbour's. A
  one-pixel translucent seam is invisible in a contact sheet and decisive when
  thresholded: the near shoe detached from the leg at one phase. Islands went
  4 → 0.
- **Sampling outside the observation.** Covered in S1, but the renderer half of
  the bug was here: an undefined sample became a black pixel rather than a
  skipped one.

**Honest weakness.** Depth is paint order. Two layers plus an anatomical order
inside each is enough for a lateral figure and would not survive a three-quarter
view. That is stated as out of scope, and it is the first thing that would break
if the brief changed.

**Falsifier.** Two bones that intersect in pose but not in anatomy — a hand
crossing the chest in front of the far arm. The paint order is fixed, so whichever
bone is later wins regardless of which is nearer, and the error is a whole limb
behind the wrong surface.

---

## S4 — Gates and audit

**Promised.** Measure the things that went wrong in the branches; every gate must
be able to fail.

**Built.** Three per-frame gates, eleven per-persona checks, a discipline gate
over `src/`, and two contact sheets per persona.

**Verified — and this is the stage that justified the whole exercise.** While
persona 02's sleeves were black, the frame gates read `adjacentPop 0.12`,
`centroidJitterPx 0.33`, `contactGroundSpreadPx 0.000` — all green, all the time.
The atlas checks plus a human looking at a contact sheet found it. The conclusion
is uncomfortable and worth stating plainly: **the frame gates measure motion, not
appearance**, and a cycle can be geometrically perfect and visibly broken.

Two of the audit checks were themselves broken in the way they were meant to
catch:

- `bonesWithoutEvidence` failed a far bone for being a far bone (fixed by
  `emptyTiles`: does the bone have *anything* to paint?);
- `syntheticFraction` mixed two assumptions of different risk, and its value
  moved 0.22 → 0.37 → 0.40 whenever the sampler changed, inviting the threshold
  to be re-tuned instead of the pipeline fixed. Split apart, the interpolated
  share *fell* from 0.14 to 0.05 while the mirrored share rose — the split was
  hiding a real change in behaviour.

**Honest weakness.** The budgets are calibrated on two personas and were set
after seeing the measurements. They are regression guards, not quality
standards, and `VALIDATION.md` §8 says so in those words.

**Falsifier.** Run the audit on a third persona from a different source (a real
camera, a textured background). If the budgets hold, they were never calibrated;
if they fail, they were never gates.

---

## S5 — Add a persona

**Promised.** One photograph, no code change.

**Verified — once.** Persona 02 was added by dropping a PNG and running three
commands. No constant was edited for her; the palette, landmarks, atlas, gait and
gates are all measured. She passes 11/11 checks and all three frame gates.

**What this proves and what it does not.** It proves the claim is *achievable*
and that the pipeline is not secretly persona-01-specific in its constants — the
five defects above were invisible until a body with different materials and
different limb exposure went through. It does not prove the pipeline generalises:
two synthetic studio plates, one camera angle, both generated with the same kind
of prompt. The honest statement is "one new PNG, zero code changes, twice", and
`VALIDATION.md` §8 records it as such.

**Falsifier.** A real photograph: motion blur, a background that is not a single
chromaticity, a shadow on the floor. `detectKeyColour` assumes a border of
backdrop and the key is a single colour; a textured studio wall breaks S0 before
anything else runs.

---

## S6 — Optional generation

**Promised.** Image generation is a *repair* path, never a dependency: at most
three calls per persona, gated, logged, and rejected back to the measured atlas.

**Status.** Designed, not implemented. The cost model, the acceptance rule and
the "gated and logged verbatim" requirement are in `PIPELINE.md` §S6; no code
exists. This review therefore makes no claim about it.

What S1's results imply for it: the cells worth repairing are known exactly —
`mirrored` cells and columns whose interpolated run exceeded the bound. That is a
small, addressable set, which is why the design can promise three calls rather
than ten plates.

---

## What I would fix next, in order

1. **Measure the knee.** The only landmark that is a midpoint. The posterior
   contour between hip and ankle has a curvature extremum at the knee; that is
   measurably better than `(hip + ankle) / 2` and removes the last
   constant-derived joint.
2. **Hair as a rigid decal.** The head is rigid; the hair should be painted from
   the head's transform, not as its own articulated capsule. It is the weakest
   element in every frame, and it is the one element whose geometry is genuinely
   known.
3. **A third persona from a non-generated source.** Until then, every claim about
   generalisation is a claim about two images by the same generator.
4. **The §S6 repair pass**, restricted to `mirrored` cells and long interpolated
   runs, gated by `spillPixels`, `maxIslands` and a visual diff against the
   un-repaired cycle.

---

## What I would defend

- **One photograph, no constants.** Nothing per-persona exists in the source.
- **Appearance never moves a joint.** The control plate is the geometry; the
  skinned frame is geometry plus photograph. A defect in both is geometry, a
  defect in one is appearance, and that distinction took one afternoon to add and
  has been worth it at every step.
- **Everything invented is counted, by kind.** The pipeline can be wrong, but it
  cannot be quietly wrong: `interpolatedFraction`, `mirroredFraction`,
  `longestInterpolatedRun`, `unassignedFraction` and the per-bone coverage all
  describe the gap between the photograph and the frame.

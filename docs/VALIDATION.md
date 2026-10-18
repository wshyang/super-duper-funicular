# VALIDATION — what was measured, and what was not

The point of this document is to make it impossible to mistake activity for
evidence. Every number below was produced by a command in this repository, on
2026-10-18, from `assets/personas/athletic/01-master-lateral.png` (1408 × 768,
backdrop `rgb(220,74,164)`).

Reproduce everything with:

```
npm ci
npm run validate
```

`validate` is `typecheck → test → profile → plates → audit`. It exits non-zero if
any stage fails.

---

## 1. The pipeline runs

| Stage | Command | Output | Time |
|---|---|---|---|
| typecheck | `npm run typecheck` | clean (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | ~2 s |
| tests | `npm test` | **18 passed / 18** | ~3 s |
| profile | `npm run profile` | `out/profile/athletic/{profile,persona}.json`, `profile-overlay.png` | ~1 s |
| plates | `npm run plates` | 16 frames, 16 control plates, `standing.png`, `manifest.json` | ~4 s |
| audit | `npm run audit` | `out/audit/athletic/audit-report.{json,txt}` | ~4 s |

Whole repository: **30 TypeScript modules, 3 952 lines including 186 lines of
tests**, plus 1 589 lines of new documentation (this file, `PIPELINE`, `FDS`,
`SPEC`, `ADDENDA`, `BRANCH_REVIEW`, `README`). For comparison, PR #1 carried
13 507 lines of TypeScript and 4 327 lines of documentation for the same job —
and the documentation was larger than the code it described.

---

## 2. Measured correspondence

`persona.json` now contains six stretch numbers instead of crop constants:

| Parameter | Value | Meaning |
|---|---|---|
| `scale` | 3.4488 | master px per sprite px |
| `originX` | 708.5 | pelvis column on the plate |
| `originY` | 378.4 | pelvis row on the plate |
| `headStretch` | 1.317 | this person's head is 32 % taller than the rig's |
| `neckStretch` | 1.605 | measured chin→shoulder, not assumed |
| `torsoStretch` | 0.783 | shorter trunk than the rig |
| `thighStretch` | 0.982 | |
| `shinStretch` | 0.978 | |
| `silhouetteIou` | **0.458** | rig vs. plate, *reported only* |

The IoU of 0.458 is modest, and honestly so: a 17-capsule stick figure cannot
cover a photograph that includes a ponytail, a singlet with a dark side panel and
a pair of trainers. It is a sanity check — "is the rig on the person" — not a
quality score. It is deliberately **not** optimised; see `PIPELINE.md` §4.7.3.

---

## 3. Atlas measurements

From `out/audit/athletic/audit-report.json`:

| Quantity | Value |
|---|---|
| subject pixels on the plate | 54 690 |
| atlas cells holding a photograph | 15 642 |
| atlas cells synthesised (interpolated or mirrored) | 4 337 |
| **synthetic fraction** | **0.217** |
| subject pixels no capsule reached | 4 494 (**8.2 %**) |
| bones with zero photographed cells | **0** |

Per-bone coverage is in the JSON. The far limbs are entirely synthetic (mirrored
from the near limb and darkened), which is the honest consequence of using one
lateral plate; that cost is visible in the number rather than hidden.

Compare with the two branches: they needed **72 image generations for 30 plates**
and still had no way to say how much of any frame was invented.

---

## 4. Frame gates

`npm run plates` prints:

```
gates: adjacentPop=0.118, centroidJitterPx=0.293, contactGroundSpreadPx=0.000
```

| Gate | Measured | Budget | Verdict |
|---|---|---|---|
| `adjacentPop` (largest change in adjacent-frame IoU) | 0.118 | 0.15 | pass |
| `centroidJitterPx` (head centre, adjacent frames) | 0.293 | 1.5 | pass |
| `contactGroundSpreadPx` (stance frames) | 0.000 | 2 | pass |

The 0.118 occurs at heel strike, which is the fastest silhouette event in a run:
a whole shoe enters the contour in one frame step. The continuity of the strike
itself is checked geometrically, at half a pixel, in `src/rig/rig.test.ts` — a
pixel-level gate sampled 16 times a cycle cannot make that claim, and pretending
it could is how the old gates ended up measuring cleanliness instead of
correctness.

Two gates that used to be unpassable or uninformative were fixed during this
work and are worth calling out:

- `countOpaqueIslands` counted **every** opaque component, so a perfect frame
  scored 1 against a threshold of 0. It now counts components *other than the
  largest*.
- `adjacentPop` reported the *excess* over its threshold, so a healthy cycle read
  `0.000` — indistinguishable from a gate that never ran. It now reports the
  measured discontinuity.

---

## 5. Audit checks

All nine pass. Each one is a question that the previous branches' audit could not
answer:

| Check | Result | What it would have caught in PR #1 / PR #8 |
|---|---|---|
| `atlas.syntheticFraction` ≤ 0.35 | 0.217 | a slice of "photographic" frames that was mostly invented |
| `atlas.bonesWithoutEvidence` = 0 | 0 | the empty arm tile that made a forearm a tube |
| `atlas.unassignedFraction` ≤ 0.12 | 0.082 | photographed surface silently dropped |
| `correspondence.silhouetteIou` ≥ 0.35 | 0.458 | a rig placed tens of pixels off the figure |
| `keying.holesInsideSubject` ≤ 0.002 | 0.000 | the porous key that speckled the shoes |
| `frames.maxIslands` = 0 | 0 | detached hair slab, ghost shoe |
| `frames.spillPixels` = 0 | 0 | magenta fringe around every limb |
| `frames.crownReached` = 0 failures | 0 | the figure sinking out of frame |
| `discipline.violations` = 0 | 0 | 800-line modules, non-deterministic code |

---

## 6. Determinism

`src/atlas/unwrap.test.ts` renders the same phase twice and compares the RGBA
buffers byte for byte; `src/rig/rig.test.ts` asserts `solvePose(0.375)` equals
itself and that `solvePose(1.375)` equals `solvePose(0.375)`. The discipline gate
bans `Date.now`, `Math.random`, `process.env` and `new Date(` from every module
under `src/`.

There is no caching, no sampling, and no network access anywhere in the render
path.

---

## 7. What is *not* validated

This section is the reason the document exists.

1. **One persona.** All numbers above come from one photograph of one person.
   The claim "a new persona costs one photograph" is a design claim with a
   single supporting instance, not a measured result. Stage 5 of
   `PIPELINE.md` §6 is exactly this experiment and has not been run.
2. **Faces.** The head is a capsule. It reads as a head at 220 × 256 and as a
   smeared blob at 3× zoom. No gate measures face quality, and none could.
3. **Hair.** The ponytail is a single tapered capsule with a lag term. Its
   *direction* is now correct (it hangs down the back of the skull, `ADDENDA`
   A9) but it is rigid, and it is the weakest element in the output.
4. **Far-side lighting.** Mirrored far limbs are darkened by a constant 0.86. A
   photograph with strong directional light will show this as a mismatch. It is
   counted in `syntheticFraction`, not corrected.
5. **Cloth.** The singlet's dark side panel is baked into the torso tile, so it
   rotates with the bone rather than with the light. Visible at large trunk lean.
6. **The gates are not a quality score.** Every number in §3–§5 can be satisfied
   by a figure that is anatomically correct and visually mediocre. That is a
   deliberate trade: correctness is cheap to measure, taste is not.
7. **The `adjacentPop` budget of 0.15** was chosen after measuring 0.118. This is
   disclosed rather than dressed up: the *geometric* continuity of heel strike is
   tested independently at 0.5 px, so the budget is not the only thing standing
   between the cycle and a pop — but it is still a threshold set with knowledge
   of the measurement, and should be revisited when a second persona exists.

---

## 8. Contact sheets

Committed for review; regenerate any time with `node sheet.cjs <dir> <out.png>`.

- `docs/assets/cycle-contact.png` — the 16 skinned frames, 4 × 4.
- `docs/assets/control-contact.png` — the same 16 phases as deterministic
  flat-shaded control plates.

Read them side by side. The control sheet is what the geometry alone produces;
the skinned sheet is what the photograph contributes. Any disagreement between
the two is an appearance bug, and any defect visible in *both* is a geometry bug.
That separation is the single most useful thing this pipeline has that the
branches did not.

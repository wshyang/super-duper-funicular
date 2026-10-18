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
| subject pixels on the plate | 52 122 |
| atlas cells holding a photograph | 17 658 |
| cells interpolated between two observations | 1 146 |
| cells mirrored from the observed half | 5 947 |
| **invented fraction** | **0.401** (interpolated 0.065, mirrored 0.337) |
| longest unbroken interpolated run | 7 rows of 44 |
| subject pixels no capsule reached | 2 118 (**3.9 %**) |
| bones with no cells to paint | **0** |

The invented fraction rose from 0.217 when the metric was one number to 0.401
when it was split, which is not a regression in the pipeline but in the
accounting: the old figure counted far-side mirroring only for whole bones and
silently omitted the unseen half of every near limb, which the sampler was
filling by clamping to an edge row. Making that explicit is what turned it from
"planks with a hard edge" into rounded limbs (`ADDENDA` A16, A20).

Per-bone coverage is in the JSON. The far limbs are entirely synthetic (mirrored
from the near limb and darkened), which is the honest consequence of using one
lateral plate; that cost is visible in the number rather than hidden.

Compare with the two branches: they needed **72 image generations for 30 plates**
and still had no way to say how much of any frame was invented.

---

## 4. Frame gates

`npm run plates` prints:

```
gates: adjacentPop=0.120, centroidJitterPx=0.315, contactGroundSpreadPx=0.000
```

| Gate | Measured | Budget | Verdict |
|---|---|---|---|
| `adjacentPop` (largest change in adjacent-frame IoU) | 0.120 | 0.15 | pass |
| `centroidJitterPx` (head centre, adjacent frames) | 0.315 | 1.5 | pass |
| `contactGroundSpreadPx` (stance frames) | 0.000 | 2 | pass |

The 0.120 occurs at heel strike, which is the fastest silhouette event in a run:
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

All eleven pass on both personas. Each one is a question that the previous
branches' audit could not answer:

| Check | athletic | jiamin | What it would have caught in PR #1 / PR #8 |
|---|---|---|---|
| `atlas.interpolatedFraction` ≤ 0.25 | 0.065 | 0.046 | a slice of "photographic" frames that was mostly invented |
| `atlas.longestInterpolatedRun` ≤ 10 | 7 | 7 | a column ramped across 38 of 44 rows |
| `atlas.mirroredFraction` ≤ 0.55 | 0.337 | 0.307 | the unseen half of every limb, undeclared |
| `atlas.emptyTiles` = 0 | 0 | 0 | the empty arm tile that made a forearm a tube |
| `atlas.unassignedFraction` ≤ 0.12 | 0.039 | 0.028 | photographed surface silently dropped |
| `correspondence.silhouetteIou` ≥ 0.35 | 0.461 | 0.477 | a rig placed tens of pixels off the figure |
| `keying.holesInsideSubject` ≤ 0.002 | 0.000 | 0.000 | the porous key that speckled the shoes |
| `frames.maxIslands` = 0 | 0 | 0 | detached hair slab, ghost shoe |
| `frames.spillPixels` = 0 | 0 | 0 | magenta fringe around every limb |
| `frames.crownReached` = 0 failures | 0 | 0 | the figure sinking out of frame |
| `discipline.violations` = 0 | 0 | 0 | 800-line modules, non-deterministic code |

---

## 6. Second persona — the out-of-distribution test

`assets/personas/jiamin/01-master-lateral.png` is one generated studio plate of a
different person: female, 1.60 m, jade-green racerback singlet, black shorts,
white shoes, shoulder-length black hair in a low ponytail — deliberately every
material and proportion persona 01 is not. No constant was edited for her. The
only commands run were:

```
npm run profile -- jiamin
npm run plates  -- jiamin
npm run audit   -- jiamin
```

| | athletic (01) | jiamin (02) |
|---|---|---|
| plate | 1408 × 768 | 1376 × 768 |
| detected key | `220,74,164` | `179,78,147` |
| stature (px) | 707 | 696 |
| skin / fabric / shorts / shoe / hair | `#e6ab85` / `#a91736` / `#161616` / `#e7e6ea` / `#0a0a0a` | `#ebb798` / `#4a9788` / `#161318` / `#e5dae3` / `#0a0709` |
| landmarks (neck, shoulder, waist, hip, hem, knee, ankle) | 160, 223, 376, 393, 441, 521, 649 | 169, 236, 393, 396, 468, 536, 676 |
| atlas interpolated / mirrored / longest run | 0.065 / 0.337 / 7 | 0.046 / 0.307 / 7 |
| `adjacentPop` / `centroidJitterPx` / contact spread | 0.120 / 0.315 / 0.000 | 0.122 / 0.410 / 0.000 |
| audit | 11/11 | 11/11 |

The palette is measured, not declared: the classifier scores candidates on
2 × chromaticity + 0.5 × luma, so a jade singlet and a crimson one are the same
kind of object, and her skin, hair and shorts separate on hue rather than on
brightness. Colour alone could not separate her black hair from her black shorts
— they are the same material to within a few RGB units — so a row rule
(`hairBelowY`, one fifth of stature below the crown) decides, and that is stated
in `Palette` rather than buried in the classifier.

**What this run found.** Five defects, none of which persona 01 could show, all
of them generic rather than persona-specific (`ADDENDA` A15–A20):

1. sampling an atlas cell with no observation returned opaque black — a black
   sleeve on both forearms;
2. clamping to the last observed row turned each limb into a flat plank;
3. interpolation bridged 38 of 44 rows and reported a healthy-looking 0.14;
4. painting replaced pixels instead of compositing, so a feathered edge erased a
   neighbour's alpha — the near shoe detached from the leg at one phase;
5. the keying boundary was being used as texture — 109 violet spill pixels.

None of the five moved `adjacentPop`, `centroidJitterPx` or
`contactGroundSpreadPx` outside their budgets while they were present. **The
frame gates were green throughout.** That is the most important result in this
document: a cycle can be geometrically perfect and still be visibly broken, and
the per-persona atlas checks are what caught it — after a human looked at the
contact sheet and asked why the sleeves were black.

**What is still visibly wrong on persona 02** (and, less severely, on 01): the
limbs carry patchy dark texels that rotate with the bone. They are photographed
pixels that legitimately sat near the limb in the plate — the arm hangs over the
shorts, so pixels within the arm's capsule but beyond its silhouette belong to
the shorts and are unavoidably ambiguous in one view. Material classes prevent
most of it; the residue is the single-view parallax that §S1 is honest about and
that no sampler fix can remove. It is a *capture* problem, and §S6 (optional
generation) is the escape hatch: a repair pass over exactly those cells, gated
and counted, is stage 5 work.

---

## 7. Determinism

`src/atlas/unwrap.test.ts` renders the same phase twice and compares the RGBA
buffers byte for byte; `src/rig/rig.test.ts` asserts `solvePose(0.375)` equals
itself and that `solvePose(1.375)` equals `solvePose(0.375)`. The discipline gate
bans `Date.now`, `Math.random`, `process.env` and `new Date(` from every module
under `src/`.

There is no caching, no sampling, and no network access anywhere in the render
path.

---

## 8. What is *not* validated

This section is the reason the document exists.

1. **Two personas, not a population.** Persona 02 (`jiamin`, §6) was added to
   test the claim rather than to decorate the document, and it earned its place:
   the sampler had five defects that persona 01 could not show. Two is still not
   a population, and both personas are synthetic studio photographs on a flat
   backdrop with one lateral view. Nothing here validates a real camera, a
   textured background, or a three-quarter pose.
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
7. **The gates were calibrated against these two personas.** `adjacentPop` 0.15
   was chosen after measuring 0.120; the atlas budgets were set after seeing the
   measured values (interpolated 0.05–0.07, mirrored 0.31–0.34, run 7). This is
   disclosed rather than dressed up: a budget set by observation is a regression
   guard, not a quality standard, and all of them should be revisited on a third
   persona taken from a different source.
8. **`adjacentPop` is not the only thing standing between the cycle and a pop.**
   The geometric continuity of heel strike is tested independently at 0.5 px in
   `src/rig/rig.test.ts`, so the frame gate is a backstop rather than the sole
   guard.

---

## 9. Contact sheets

Committed for review; regenerate any time with `node sheet.cjs <dir> <out.png>`.

- `docs/assets/cycle-contact.png` — the 16 skinned frames, 4 × 4.
- `docs/assets/control-contact.png` — the same 16 phases as deterministic
  flat-shaded control plates.

Read them side by side. The control sheet is what the geometry alone produces;
the skinned sheet is what the photograph contributes. Any disagreement between
the two is an appearance bug, and any defect visible in *both* is a geometry bug.
That separation is the single most useful thing this pipeline has that the
branches did not.

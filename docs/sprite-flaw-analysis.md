# Why the reference running cycle is wrong

**Subject:** `src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg`,
titled *"8-FRAME COMPLETE RUNNING CYCLE (Alternating Gait)"* — six colourways × eight frames.

**Method.** Every number below is produced by `npm run sprites:analyse`, which cuts all 48 frames out of
the sheet (`src/lib/pipeline/`) and measures them with `src/lib/analysis/cycle.ts`. The same instrument
measures the generated runner, so the comparison is like-for-like. Raw output:
`reports/cycle-analysis.json` and `src/generated/reference-analysis.json`.

---

## Summary

The sheet is not an eight-frame run. It is **four poses, each duplicated eight frames later**, drawn on a
**drifting, floating, size-changing** cell. The legs never alternate, two frames out of eight touch the
ground, and the figure slides sideways by half a body width during the loop. Any one of these would be
visible in motion; together they make the animation read as a stutter rather than a run.

---

## Finding 1 (critical): there are four poses, not eight

Pose distance is the mean absolute difference between two 16×16 occupancy grids, each normalised to its
own bounding box. For the red row:

| | f1 | f2 | f3 | f4 | f5 | f6 | f7 | f8 |
|---|---|---|---|---|---|---|---|---|
| **f1** | 0.00 | 0.24 | 0.25 | 0.23 | **0.02** | 0.24 | 0.24 | 0.23 |
| **f2** | 0.24 | 0.00 | 0.15 | 0.24 | 0.24 | **0.02** | 0.16 | 0.24 |
| **f3** | 0.25 | 0.15 | 0.00 | 0.25 | 0.24 | 0.16 | **0.03** | 0.25 |
| **f4** | 0.23 | 0.24 | 0.25 | 0.00 | 0.23 | 0.24 | 0.25 | **0.01** |

- Mean distance between frame *i* and frame *i+4*: **0.016**.
- Mean distance between neighbouring frames: **0.238** (fifteen times larger).
- The same pattern holds in all six colourways; the duplicate groups are `f1=f5, f2=f6, f3=f7, f4=f8`
  in every row.

**Consequence.** Frame 5 is a re-draw of frame 1, so the leading leg at the start of the loop is the
*left* leg both times. An alternating gait requires the opposite leg to lead at the half cycle. Played as
an eight-frame loop, the cycle shows a single step repeated twice — the stutter is inherent to the
artwork, not to the playback.

**The generator's answer.** Because a leg's phase is `phase` and `phase + 0.5` and the pose is a
continuous function of phase, frame *i* and frame *i+4* differ by construction: eight samples give
**8 unique poses**, and the test `tests/analysis.test.ts` asserts it.

---

## Finding 2 (critical): only two frames in eight touch the ground

Ground clearance is the distance between a frame's lowest point and the lowest point reached anywhere in
the cycle (the ground line).

| Frame | f1 | f2 | f3 | f4 | f5 | f6 | f7 | f8 |
|---|---|---|---|---|---|---|---|---|
| Clearance (px) | **0** | 17 | 20 | 17 | **0** | 16 | 17 | 19 |

- **2 of 8 frames** are planted. The other six float 16–20 px above the floor — about a tenth of body
  height.
- Mean clearance **13.3 px**; maximum **20 px**.

**Consequence.** A runner spends roughly 30–45 % of each cycle in stance per foot, and never in a
sustained float. Here the character is airborne for three quarters of the loop, which reads as
"hovering", and there is no frame where weight is visibly carried. Combined with Finding 1, the two
planted frames are the *same* frame twice.

**The generator's answer.** Stance is derived from a duty factor (36 % per foot), so 6 of 8 evenly spaced
samples have a foot on the ground and two are a genuine flight phase; `tests/analysis.test.ts` asserts
both the contact count and the presence of a flight phase.

---

## Finding 3: the figure drifts sideways

| Frame | f1 | f2 | f3 | f4 | f5 | f6 | f7 | f8 |
|---|---|---|---|---|---|---|---|---|
| Head x (px) | 115 | 118 | 157 | 115 | 114 | 120 | 163 | 113 |

**Head drift across the cycle: 50.6 px** — 0.22 body heights, roughly half a head width. The figure is
composed independently in each cell, so no two frames agree on where the body is.

**Consequence.** Played in place, the character lurches left and back twice per loop. This is the single
most obvious "cheap animation" tell, and it is invisible if you look at the frames one at a time.

**The generator's answer.** The pelvis is a single joint at world x = 0. Head drift over the cycle is
**1.6 px** at the same scale (the residual is deliberate torso/head counter-rotation), and the registered
extraction set is pivoted on the pelvis so a reviewer can see the sheet's real drift.

---

## Finding 4: the figure changes size

| Frame | f1 | f2 | f3 | f4 | f5 | f6 | f7 | f8 |
|---|---|---|---|---|---|---|---|---|
| Height (px) | 231 | 214 | 211 | 213 | 231 | 214 | 214 | 212 |

**Range 20 px.** The character grows and shrinks through the loop.

**Consequence.** The eye reads the size change as the character moving toward and away from camera, which
fights the side-on staging.

**The generator's answer.** One rig, one set of body metrics. The height range is **3.9 px**, and that
residual is the pelvis bob (the torso rises and falls), not a change in the body's proportions.

---

## Finding 5: no depth ordering between the limbs

The two legs are drawn with the same palette and the same outline weight. Where they overlap, which leg
is in front is ambiguous, and the percept flips between readings as the loop plays.

**The generator's answer.** The far side is shaded to 84 % value and cooled toward blue, and the draw
order is explicit: far leg → far arm → torso → near leg → head → near arm. `tests/rig.test.ts` asserts
both the order and the shade difference.

## Finding 6: the arms do not counter-rotate

The sheet's four poses repeat the near arm and the near leg relationship: no frame has the near arm
forward while the near leg is back. In a real run, arms oppose legs; here the upper body reads as static
scaffolding attached to a moving lower body.

**The generator's answer.** Each arm is sampled at the same phase as its own leg with a negative swing, so
the correlation between the same-side ankle x and shoulder angle is **−0.89**, and the two arms are
themselves anti-correlated at **−1.00**. Both are asserted in `tests/gait.test.ts`.

---

## Finding 7: the outlines are baked into the artwork

The sheet's dark outline is part of every pixel, so it cannot be recoloured, scaled or re-lit, and the
cut-out carries a magenta-tinted rim wherever the JPEG edge was anti-aliased against the key.

**The generator's answer.** The outline is a render pass: each part's shapes are stroked once at 1.15×
line width, then filled, so the fills cover the inner half of the stroke and leave one clean silhouette
edge per part. Nothing is baked; the whole figure can be re-coloured from six palette entries.
See ADD-003 and ADD-005.

---

## Side-by-side measurement

Generated by `npm run sprites:analyse`; full tables in `docs/assets/flaw-comparison.md`.

| Metric | Reference sheet | Generated runner |
| --- | --- | --- |
| Unique poses in 8 samples | 4 | **8** |
| Mean pose distance, frame *i* vs *i+4* | 0.016 (identical) | **0.289** (new pose) |
| Frames touching the ground | 2 of 8 | **6 of 8** |
| Maximum ground clearance | 20 px | 12 px (a real flight phase) |
| Head drift over the cycle | 50.6 px | **1.6 px** |
| Figure height range | 20.0 px | **3.9 px** |
| Depth cue between limbs | none | far side shaded 84 % |
| Arm/leg opposition | absent | correlation −0.89 |

---

## Reproduce

```bash
npm run sprites:extract     # 48 cut-outs + manifest + contact sheet
npm run sprites:analyse     # reports/cycle-analysis.json, src/generated/reference-analysis.json
npm test                    # asserts every claim in this document
npm run runner:preview -- red   # reports/runner-preview-red.png
```

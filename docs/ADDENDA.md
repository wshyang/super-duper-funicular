# ADDENDA — decisions taken while building, with their evidence

Each entry records a decision that was **not** in the original design, the
observation that forced it, and what would have to change for it to be revisited.
Entries are append-only: a superseded decision is struck through, not deleted.

Format: `A<n> — decision`. Evidence is a path and, where possible, a number
produced by a command in this repository.

---

## A1 — The key is detected, never assumed

**Decision.** `detectKeyColour` takes the median of the image border. No module
may contain `255,0,255`.

**Why.** The master plate's backdrop is `rgb(220,74,164)`. Both reviewed branches
hard-coded `#FF00FF`; both shipped plates whose backdrop was not that colour.
The first profiler in this repository inherited the assumption and reported a
subject height of 26 px.

**Evidence.** `out/profile/athletic/profile.json → detectedKey`.

---

## A2 — The keying rule is chromatic, not metric

**Decision.** A pixel is backdrop when `r > 120 && b > 90 && g < 0.72·min(r,b)`,
with a tight Manhattan fallback of 48 for near-exact pixels.

**Why.** The metric version (Manhattan < 120 from the key) matted the plate and
punched holes *inside* the subject: a bright skin highlight at
`(200,150,140)` is 120 away from `(220,74,164)`. The holes became speckled shoes
and empty limb tiles.

**Evidence.** `audit-report.txt → keying.holesInsideSubject = 0.00000`. Before the
change the same measurement over the plate was 3 000+ interior background pixels
and `atlas.syntheticFraction` was 0.60.

**Revisit if.** A plate uses a non-magenta backdrop. The predicate is one
function in `src/analysis/chroma.ts`.

---

## A3 — Two layers, seventeen bones, one paint order

**Decision.** `back` and `front` only. Inside a layer, bones paint in a fixed
anatomical order (`paintOrder`, 1..8). No per-frame depth sort, no z-index cards.

**Why.** PR #1's `photoreal-extractor.ts` carried 80 per-persona ternaries and a
per-part z-order; the defects it produced (far forearm peeking through the back,
hair over face) are ordering bugs, not rendering bugs. Making the order a
constant of anatomy makes them impossible to introduce per frame.

**Evidence.** `src/rig/bones.ts → PAINT_ORDER`; `docs/BRANCH_REVIEW.md` §3.2.

---

## A4 — Occlusion is declared, because one photograph has no depth

**Decision.** Among the bones whose capsule contains a pixel, the most forward
one wins. Distance is used only for pixels outside every capsule.

**Why.** In the master plate the hand rests on the thigh. Same material, same
lighting, and the thigh's axis is nearer — so every distance metric gave the
thigh the hand's pixels and the hand tile came out **empty** (`nearHand hw = 0.0`).
The fix is not a better metric; it is an explicit anatomical order. The hidden
part of the thigh then becomes a hole that is *reported* rather than stolen.

**Evidence.** `out/atlas/athletic/atlas-report.json → nearHand.observed > 0`.

**Revisit if.** A second camera angle is added. The order is a lateral-view
statement; a 3/4 view needs its own.

---

## A5 — Evidence before invention

**Decision.** Three claim passes before any synthesis: occlusion-aware, then
recovery for starved bones (`< 40` observed cells), then a low-weight fringe pass
within 2.5 capsule radii.

**Why.** Pass 1 alone left 6 835 subject pixels (12.5 %) unclaimed — the
anti-aliased halo, the shoe sole, the fingertips — which rendered as transparent
bites in the silhouette. Pass 3 brought it to 4 494 (8.2 %). The recovery pass is
what gives the neck its own texture instead of a copy of the jaw.

**Evidence.** `audit-report.txt → atlas.unassignedFraction = 0.08220`.

---

## A6 — Interpolation must be bracketed

**Decision.** `interpolateGap` fills a hole along `v` only when observations exist
on **both** sides. No extrapolation past the last observation.

**Why.** The first version extrapolated to the tile edge and painted invented
fringe — visible as violet stripes in the tile inspector
(`npx tsx scripts/dump-atlas.ts`). The tile had texture where the body had
nothing.

**Evidence.** `out/atlas/athletic/atlas-sheet.png`: transparent cells at the top
and bottom of tiles, no coloured fringe.

---

## A7 — Far limbs are mirrored, and the mirror is counted

**Decision.** Bones with under 8 % observed coverage take their near-side
counterpart's tile, flipped in `v` and darkened by 0.86. Every mirrored cell is
counted as synthetic.

**Why.** A strict geometric assignment gives the far arm nothing to sample, and
an empty far arm renders as a hole. Mirroring is the honest alternative to
inventing: it produces a visually consistent far limb, and the cost appears in
`syntheticFraction` rather than being hidden.

**Evidence.** `atlas-report.json → mirroredFraction = 0.337` (the combined
invented fraction was 0.60 before the keying and assignment fixes, and 0.217
while the unseen half of a near limb was still being hidden).

---

## A8 — Widths are measured, then clamped to ±25 % of anatomy

**Decision.** Each bone's half-width is the medial-axis radius at three points
along its axis, clamped to `[0.7, 1.25] ×` the rig's own width.

**Why.** The medial-axis radius is exact where a limb is isolated and exactly
wrong where two limbs touch: the hand on the thigh inflates both to the radius of
the union. Unclamped, the torso measured 40.6 px, the forearm 31.8 px and the
rendered figure became a set of slabs.

**Evidence.** `persona.json → boneHalfWidths`; `WIDTH_TRUST_MIN/MAX` in
`src/render/persona.ts`.

---

## A9 — Hair hangs from the crown, downward

**Decision.** `solveHairTip` uses `π·0.62` (about 112°) from a root just behind
the crown, length 34 px in sprite space.

**Why.** The previous angle was `π − lean·0.4`, i.e. almost exactly horizontal
backwards. The geometry did precisely what it was told, and the hair rendered as
a plank sticking out of the skull. It now leaves the crown and falls behind the
shoulder, which is what a ponytail does.

**Evidence.** `docs/assets/cycle-contact.png`, first column.

---

## A10 — The correspondence is measured, not optimised

**Decision.** Six stretches derived from four measured rows (crown, chin,
shoulder, sole) plus two anthropometric ratios (hip, ankle). Silhouette IoU is
computed and reported, never optimised.

**Why.** Coordinate descent on silhouette IoU chose a fit in which the skull sat
about 50 px below the photographed head, because the head is ~4 % of the
silhouette area and its gradient is weaker than the torso's noise. The optimiser
improved the score while making the picture worse.

**Evidence.** `persona.json → correspondence`; `PIPELINE.md` §4.7.3.

---

## A11 — Hip anchor is measured from the ground, not from the crown

**Decision.** `originY = soleY − 0.52 · heightPx`.

**Why.** The first version used `topY + hip · heightPx`, which places the hip 53 %
*down from the crown* instead of 53 % *up from the sole*. On this plate that
displaced the entire rig by 42 px and forced every stretch parameter to its clamp
to compensate.

**Evidence.** `ADDENDA` A10's numbers changed from
`scale 3.45 / torso 0.70 / thigh 0.81 / shin 1.06` to
`torso 0.78 / thigh 0.98 / shin 0.98`, all within anatomical plausibility.

---

## A12 — A metric that cannot fail is a bug

**Decision.** `countOpaqueIslands` counts components **other than the largest**.
`adjacentPop` reports the largest *change* in adjacent-frame IoU, not the excess
over a threshold.

**Why.** With the old definition, a perfectly merged figure scored 1 island
against a threshold of 0 — the gate could never pass, so it was either ignored or
"fixed" by editing the threshold. And the pop gate reported `0.000` on every
healthy cycle, which is indistinguishable from a gate that never ran.

**Evidence.** `docs/VALIDATION.md` §4.

---

## A13 — The manifest is written last

**Decision.** `scripts/render-cycle.ts` writes every frame, then `manifest.json`.

**Why.** The previous order wrote a manifest that referenced frames which did not
yet exist; a crashed run left a manifest describing a cycle that was never
produced. A manifest that lies is worse than no manifest.

**Evidence.** `scripts/render-cycle.ts`, comment at the `writeFileTree` call.

---

## A14 — Diagnostics are part of the deliverable

**Decision.** `scripts/dump-atlas.ts` renders every tile with synthetic cells
tinted, on a dark background, with a five-by-seven bitmap font drawn in code.

**Why.** Atlas pollution was invisible in the frames and obvious in the tiles. A
pipeline whose internal state cannot be looked at will be debugged by staring at
contact sheets, which is how six weeks disappear. The font exists because adding
a text dependency to a project with one dependency is a bad trade.

**Evidence.** `out/atlas/athletic/atlas-sheet.png`.

---

## A15 — Sampling an empty atlas cell is a colour, and the colour is black

**Decision.** `sampleAtlas` returns `{ r, g, b, a }` and never samples a cell that
holds no data. Addresses outside a column's filled rows are clamped *into* that
column's extent; an empty column is replaced by the nearest filled column
(`RowExtent.nearestColumn`); a tile with no filled column at all returns
`a = 0` and the renderer skips the sample.

**Why.** The first version indexed `tile.data` unconditionally. Unfilled cells are
zeroed RGBA, so "no observation" arrived at the renderer as opaque black. On the
reference persona this was almost invisible — her arms and legs are densely
observed. On the second persona it put a black sleeve on both forearms, and the
defect had nothing to do with her; it was latent in every persona and only a
different silhouette exposed it.

**Evidence.** `ADDENDA` A16's before/after contact sheets; the fix converts a
near-side forearm tile with 18 of 44 rows observed from "black bands" to skin.

---

## A16 — The unseen half of a limb is mirrored, not stretched

**Decision.** Cells that no photograph reached and that interpolation cannot bound
are filled by mirroring the observed half of the column across the bone axis,
darkened for the turning-away side, and counted as `mirrored`.

**Why.** A single lateral view photographs the near half of every limb. Clamping
the last observed row across the rest — the obvious fix from A15 — turns a rounded
limb into a flat plank with one hard edge, which is what the frames looked like
immediately after A15. A limb is approximately a cylinder; the unseen half is the
seen half reflected. Marking those cells synthetic keeps the assumption visible in
the audit instead of hiding it in the sampler.

**Evidence.** `docs/VALIDATION.md` §6 (second persona), `atlas.mirroredFraction`.

---

## A17 — Interpolation is bounded by run length, not by share

**Decision.** `interpolateGap` refuses to bridge more than `MAX_INTERPOLATION_SPAN`
(8 rows) and the audit reports `longestInterpolatedRun` (budget 10) beside
`interpolatedFraction`.

**Why.** The share of invented cells is a weak signal: a two-row gap is invisible
and a thirty-eight-row ramp between two distant observations is a guess, yet both
are "a few percent". The first persona's worst column bridged 38 of 44 rows while
`interpolatedFraction` read a healthy-looking 0.14. Past the bound the column is
left to the mirror pass, whose result is at least measured on one side.

**Evidence.** `atlas.longestInterpolatedRun`: 38 → 7 on both personas.

---

## A18 — Painting must composite, not replace

**Decision.** `compositeOver` alpha-composites each bone sample over the canvas.

**Why.** Writing `alpha = coverage` straight into the destination made a bone's
feathered edge *erase* the alpha of whatever was already painted. At a joint the
later bone's edge crosses a solid neighbour and leaves a one-pixel translucent
seam; thresholded, that seam is a gap, and the near shoe detached from the leg at
one phase of the cycle. Four islands per frame came from a compositing bug, not
from geometry.

**Evidence.** `frames.maxIslands`: 4 → 0 on persona 02, `docs/VALIDATION.md` §6.

---

## A19 — Texture is never sampled from the keying boundary

**Decision.** Only pixels inside an eroded subject mask (`interiorMask`, radius 3
in master px) may accumulate colour into a tile. Edge pixels are still *claimed*,
so ownership and coverage metrics are unchanged.

**Why.** The outermost two or three pixels of a soft-lit plate are a physical blend
of subject and backdrop. They pass the chromatic key test, so they entered the
atlas, and every place the sampler mirrored or clamped onto one painted violet
fringe onto a limb: 109 `spillPixels` on the first persona with no visible cause.
Erosion radius 2 left 22; radius 3 leaves 0 on both personas at the cost of
repeating one interior row at the silhouette — which the mirror pass already does
by construction.

**Evidence.** `frames.spillPixels`: 109 → 0 on persona 01.

---

## A20 — A metric must be checkable against its own parts

**Decision.** `AtlasReport` reports `observedPixels`, `interpolatedPixels`,
`mirroredPixels` and the three shares, and a unit test asserts the shares add up.

**Why.** The single `syntheticFraction` mixed two assumptions with different risk
and moved every time the sampler changed — 0.22, then 0.37, then 0.40 — so its
threshold was quietly re-tuned instead of the pipeline being fixed. Split apart,
each number means one thing, and `interpolatedFraction` fell from 0.14 to 0.05
while `mirroredFraction` rose: the split was hiding a real change in behaviour.

**Evidence.** `src/atlas/unwrap.test.ts`, `docs/PIPELINE.md` §S4.

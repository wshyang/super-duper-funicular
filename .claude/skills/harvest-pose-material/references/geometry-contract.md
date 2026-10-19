# Geometry Contract

The rules that make a cutout consumable by `warpPhotorealSegmentToQuad`. Every
one of these was violated at least once, and each violation was invisible in the
cutout and obvious in the assembled frame.

## Coordinate convention

The renderer maps a dest pixel to a lateral offset `uOff` and samples the cutout at

```
x = 80 − uOff
```

so a cutout's left edge (`x = 0`) is the material's **right** side in the frame.
The rectifier must therefore use

```
across = (DST_HALF_LATERAL − x) · lateralScale
```

A rectifier using `x = 80 + uOff` produces a mirrored cutout that reverses shading
and asymmetric contour. A naive verifier still scores it 0.58–0.69, which looks
like "the corpus is bad" rather than "the rectifier is flipped".

## Isotropy

`mapLongitudinalWithIsotropicCaps` magnifies beyond-bone-end material by
`80 / dstHalfWidthPx`. If the lateral and longitudinal scales differ, the rendered
limb is stretched by their ratio (measured ≈ 2× at `lateralScale = 0.41`) and
overlaps the shorts as a skin blob.

```
isotropicLateralExtent(sourceBoneLengthPx) = 80 · sourceBoneLengthPx / 88
```

Dest frame: cutout `160 × 160`, bone mapped onto `y 36 → 124` (88 px).
The **same** value must be passed to the verifier; two independently computed
extents is a latent bug, not a style choice.

## Cutout geometry

| Quantity | Value | Reason |
|---|---|---|
| cutout size | 160 × 160 | matches renderer sampling domain |
| bone span | `y 36 → 124` | 88 px longitudinal reference |
| lateral half extent | `isotropicLateralExtent(len)` | no stretch |
| proximal cap radius | 3 px | renderer magnifies overshoot |
| distal cap radius | `clamp(0.28 · halfWidth, 6, 12)` | same |
| proximal trim (upper arm, thigh) | 0.28 of bone | torso/shorts occlusion |
| proximal trim (other limbs) | 0.08 | cap hygiene |
| per-row span | contiguous through `axisX = 80`, drop rows outside median ± max(6, 45 %) | prevents merging with a neighbour |

## Probe

`searchLimbTube(mask, gradient, root, tip, halfWidth)` searches for the tube that
best explains the pixels and returns a **measured** angle, not the requested one.

Scored by:

- `fill` — foreground fraction inside the tube;
- `wallContrast` — two-sided gradient at the tube walls (a limb has two edges; a
  garment interior does not);
- `widthAgreement` — measured half width vs the rig's expected width;
- `angleDeltaRad` — deviation from the rig's bone direction.

Eligibility: `fill ≥ 0.72`, `wallContrast ≥ 0.42`, `widthAgreement ≥ 0.35`,
isolation `≥ 0.20`.

## Round-trip verifier

Re-warp the cutout with the **exact renderer function**
(`warpPhotorealSegmentToQuad`) and compare against the source.

Semantics, in order of importance:

1. The comparison domain is foreground **inside the tube footprint**
   (`distanceToSegment ≤ halfWidthPx`). All anatomy in a padded bounding box is
   not the same thing and rejects correct tubes at α-IoU ≈ 0.5.
2. Caps are excluded: compare the shaft only (`0.22 ≤ fractionAlongTube ≤ 0.78`).
   Rectifier and renderer handle ends differently by design.
3. Pass: `α-IoU ≥ 0.85` **and** `meanColorDelta ≤ 24`.

Synthetic fixture for regression: a bar with a notch on one edge, tested
vertically, horizontally and diagonally. Correct implementation scores
α-IoU 0.965–0.985 and Δ 0.7–2.8; a mirrored implementation fails all three.

## Appearance

`skinFractionInCapsule(source, start, end, halfWidth)` — measured on the **source
plate**, inside the tube, before cutting. Gate: `≥ 0.45`.
`isSkinPixel` is shared with the audit so the two cannot disagree.

## Known engine constraints

- `computeSegmentBounds` must use the target canvas, not a hard-coded 220 × 256.
  A hard-coded canvas silently truncates every warp on a 1408 × 768 plate.
- The shoe is **not a tube**: it uses a two-segment heel/ball/toe mapping with
  source points `(38,112) (102,116) (136,118)`. Limb techniques do not transfer.
- The pelvis warp uses source `(82,32) → (78,120)` and the head `(76,12) → (76,120)`.

## Ground line

Ground contact is contact-aware, not absolute. In a run both feet legitimately
leave the ground and the heel lifts at toe-off, so "sole must equal groundY in
every frame" scores correct physics as a defect. Measure material-induced delta
against the same pose rendered with the studio bank only.

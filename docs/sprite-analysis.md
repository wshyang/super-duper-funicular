# Sprite animation assessment: why the reference run cycle does not look right

Subject: `src/images/reference/running-cycle-8frame-6variants.jpeg`, titled "8-FRAME COMPLETE
RUNNING CYCLE (Alternating Gait)". It has 6 colour variants × 8 frames. The measurements below come
from the extracted frames in `public/sprites/running-cycle-8frame/` (registered canvas, 213×232).

## Summary

The sheet is advertised as an alternating gait, but it contains **four unique poses, each drawn
twice**. Frame *i* and frame *i+4* are the same silhouette. Because the legs do not swap between the
two halves, the loop repeats one stride instead of alternating two. The frames are also not
registered: the figure drifts and bobs as it cycles, and the cut-outs carry artefacts from the
background.

## Finding 1 (critical): the cycle is four poses duplicated, and the legs never alternate

Silhouette IoU on the registered canvas (red row; the other five rows give the same pattern):

| | f1 | f2 | f3 | f4 | f5 | f6 | f7 | f8 |
|---|---|---|---|---|---|---|---|---|
| f1 | 1.00 | 0.44 | 0.48 | 0.45 | **0.97** | 0.45 | 0.48 | 0.45 |
| f2 | 0.44 | 1.00 | 0.57 | 0.65 | 0.45 | **0.97** | 0.52 | 0.66 |
| f3 | 0.48 | 0.57 | 1.00 | 0.50 | 0.48 | 0.57 | **0.83** | 0.50 |
| f4 | 0.45 | 0.65 | 0.50 | 1.00 | 0.46 | 0.66 | 0.48 | **0.93** |

- Mean IoU of frame *i* vs *i+4*: **0.925**. Mean IoU of adjacent frames: **0.489**.
- Across all six variants, IoU(*i*, *i+4*) ranges 0.75 to 0.97. The palettes are identical, so the
  silhouette is the same in every colour.
- Visually: frame 1 and frame 5 both show the same leg forward and the same leg back. In a true
  alternating gait, frame 5 should show the opposite leg forward.

**Consequence:** Played at 8 frames, the same leg leads at frames 1 and 5, so the loop reads as a stutter that repeats
a single step rather than alternating steps.

## Finding 2: no registration; the figure drifts and bobs

Measured on the original cells (before registration), red row:

| Frame | Ground line (bottom y) | Height | Width | Centroid x |
|---|---|---|---|---|
| 1 | 248 | 232 | 178 | 154.6 |
| 2 | 248 | 214 | 157 | 155.9 |
| 3 | 239 | 211 | 202 | 165.9 |
| 4 | 223 | 214 | 179 | 158.5 |
| 5 | 248 | 231 | 177 | 152.7 |
| 6 | 248 | 215 | 157 | 160.5 |
| 7 | 236 | 214 | 211 | 166.6 |
| 8 | 223 | 212 | 178 | 160.8 |

- **Centroid x** moves 14 px across the cycle. Played in place, the character slides forward and back.
- **Ground line** moves 25 px. Frames 4 and 8 sit high (223) and frames 1, 2, 5 and 6 sit on the floor (248).
  Some of this is a real flight phase. The rest is because nothing anchors the figure, so the bob is
  mixed with the sprite's own changes in height.
- **Height** varies from 206 to 232 px: the sprites change size as well as pose.

Fix applied (ADD-004): all frames are placed on a shared canvas with the centroid column and the
ground line aligned. After registration the bottom is 232 and the centroid column is 126.5 to 127.5
in every frame.

## Finding 3: background artefacts in the cut-outs

- A border-connected background flood fill leaves **magenta slivers** inside the arm-to-torso gap in
  frames 2 and 6 (visible in the 2× zoom). They are not connected to the border, so they survive.
- The purple outline around the figure is part of the artwork. It is kept.

Fix applied (ADD-003): global chroma key. The cut-outs have 0 magenta-like opaque pixels across 48
frames.

## Finding 4: the within-cycle variation is modest and repeats

Torso lean and arm position do change through the cycle, but the leg configuration repeats every four
frames, so the stride variation does not add up to a second step. Upper-body pose is secondary to
the leg problem above.

## What the procedural runner does differently

`src/runner/` generates the figure from a skeleton, not from pre-drawn poses. Its gait is built to
avoid the four failures above:

1. **Alternation by construction.** Each leg has its own phase, offset by half a cycle. Pose
   samples are checked by tests (`src/runner/gait.test.ts`), including the half-cycle copy.
2. **Planted feet.** In stance the ankle is held on the sole line, and the foot moves steadily
   backwards relative to the hip. Tests check the ankle height on every stance frame.
3. **Anchored body.** The hip is a single joint at the body's centre, so the figure stays in place.
4. **Arms oppose legs.** The near shoulder is exactly the negative of the far shoulder.

Known limitation (ADD-005): the mid-stance knee is still fairly flexed, so the procedural pose is
lower-hipped than a sprinter's. It runs in place and plants its feet, but it is an approximation,
not a motion-capture match.

## Reproduce

```
npm run sprites:extract   # regenerates the registered frames and manifest
npm run runner:preview    # writes docs/runner-preview.png (8 phases, figure and rig)
npm test                  # includes the sheet-based checks
```

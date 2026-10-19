# Pose-Material Run

Generated: 2026-10-19T01:56:57.325Z
Commit: `97a3c12`
Audit: `2026-10-19T01:56:34.635Z`

## 1. Corpus and audit

Produced by `npm run pose-material:audit` → `:harvest` → `:demo`.

| quantity | value |
| --- | --- |
| sources | 30 |
| master / pose-bank / phase | 1 / 18 / 11 |
| accepted / conditional / rejected | 2 / 26 / 2 |
| angle buckets | 34 |
| material gaps | 74 of 128 |
| mean silhouette IoU | 0.442 |
| duplicate pairs | 0 |

### Angle buckets

| part | bucket | sources | supplied by |
| --- | --- | --- | --- |
| farForearm | 15° | 2 | H03-right-pass, H03-right-pass-refined |
| farHand | 0° | 1 | PR1-phase-03-midstance |
| farHand | 15° | 2 | H03-right-pass, PR1-phase-04-flight-split |
| farHand | 30° | 1 | H03-right-pass-refined |
| farShin | 120° | 1 | X01-near-arm-forward |
| farThigh | 15° | 1 | X02-near-arm-rear-refined |
| farThigh | 45° | 1 | X04-leg-scissor |
| farThigh | 60° | 1 | H01-right-contact |
| farUpperArm | 45° | 1 | X01-near-arm-forward |
| farUpperArm | 60° | 1 | PR1-phase-07-shoulder-fwd |
| farUpperArm | 90° | 1 | PR1-phase-09-bare-ortho-a |
| farUpperArm | 105° | 1 | H05-left-contact |
| farUpperArm | 120° | 2 | H06-left-down, PR1-phase-08-forefoot-roll |
| farUpperArm | 135° | 1 | H07-left-pass |
| nearForearm | 15° | 2 | H03-right-pass, H03-right-pass-refined |
| nearForearm | 45° | 1 | H00-master |
| nearHand | 0° | 1 | PR1-phase-03-midstance |
| nearHand | 15° | 1 | H03-right-pass |
| nearHand | 30° | 1 | H03-right-pass-refined |
| nearHand | 60° | 1 | PR1-phase-11-bare-ortho-c |
| nearHand | 75° | 2 | X05-far-forearm-forward, PR1-phase-09-bare-ortho-a |
| nearThigh | 15° | 1 | PR1-phase-11-bare-ortho-c |
| nearThigh | 45° | 3 | H08-left-flight, PR1-phase-02-left-strike, PR1-phase-07-shoulder-fwd |
| nearThigh | 60° | 1 | H01-right-contact |
| nearUpperArm | 45° | 1 | X01-near-arm-forward |
| nearUpperArm | 60° | 2 | H05-left-contact, PR1-phase-07-shoulder-fwd |
| nearUpperArm | 90° | 1 | PR1-phase-09-bare-ortho-a |
| nearUpperArm | 105° | 1 | PR1-phase-11-bare-ortho-c |
| nearUpperArm | 120° | 3 | H02-right-down, X05-far-forearm-forward, PR1-phase-08-forefoot-roll |
| nearUpperArm | 135° | 1 | H07-left-pass |
| neck | -90° | 10 | H01-right-contact, H04-right-flight, H05-left-contact, H08-left-flight, X04-opposed-leg-guide, X04-tucked-flight, PR1-phase-01-right-strike, PR1-phase-02-left-strike, PR1-phase-04-flight-split, PR1-phase-09-bare-ortho-a |
| neck | -75° | 12 | H02-right-down, H03-right-pass-refined, H06-left-down, H07-left-pass, X01-near-arm-forward, X02-near-arm-rear, X02-near-arm-rear-refined, X05-far-forearm-forward, X06-far-forearm-back, PR1-phase-05-near-arm-fwd, PR1-phase-07-shoulder-fwd, PR1-phase-08-forefoot-roll |
| torso | -75° | 5 | H01-right-contact, H01-right-contact-refined, PR1-phase-01-right-strike, PR1-phase-02-left-strike, PR1-phase-11-bare-ortho-c |
| torso | -60° | 2 | H03-right-pass, PR1-phase-04-flight-split |

## 2. Materials (4)

| part | measured | bucket | skin | α-IoU | Δcolour | source |
| --- | --- | --- | --- | --- | --- | --- |
| nearThigh | 58.3° | 60° | 0.62 | 0.978 | 2.69 | H01-right-contact |
| farThigh | 56.2° | 60° | 0.64 | 0.980 | 2.60 | H01-right-contact |
| nearForearm | 13.2° | 15° | 0.82 | 0.974 | 2.23 | H03-right-pass |
| farForearm | 13.2° | 15° | 0.82 | 0.974 | 2.23 | H03-right-pass |

## 3. Rejections (5)

| reason | count |
| --- | --- |
| wardrobe | 5 |

## 4. Cycle

| metric | value | limit | verdict |
| --- | --- | --- | --- |
| frames | 16 | = 16 | pass |
| detached islands | 0 | = 0 | pass |
| material-induced ground Δ | 0 px | ≤ 2 px | pass |
| mean pairwise IoU | 0.514 | ≤ 0.85 | pass |
| worst pair IoU | 0.847 | ≤ 0.95 | pass |
| half-cycle IoU | 0.836 | ≤ 0.90 | pass |
| stance sole spread | 8 px | rig-owned | n/a |

## 6. Visual review

Contact sheet inspected (`/tmp/pose-material-demo/contact-sheet-material.png`).

- Limbs read as limbs in all 16 frames: no blobs, no stretched material, no
  mirrored shading. The thigh and forearm tubes are correctly proportioned.
- Shading is continuous across hip and knee; the shorts hem meets harvested thigh
  material without a visible skin band at this scale.
- Near and far limbs remain distinguishable in the crossover frames.
- Two frames still show the far shoe overlapping the near ankle at toe-off. That
  is the rig's two-segment shoe warp, not harvested material (see AC-9 scope).
- Coverage is visibly sparse: only thighs and forearms carry photographic
  material; upper arms and shins are studio cutouts, which is why some frames read
  as flatter than others.

## 7. Gap classification

Fill the last column from `references/objective-register.md`:
**pose gap** (visible somewhere, angle missing) or **camera gap** (occluded from this
viewpoint for every pose). Only pose gaps may enter a generation queue.

| part | gaps | phases | class |
| --- | --- | --- | --- |
| head | 8 | 0, 1, 2, 3, 4, 5, 6, 7 | TODO |
| pelvis | 8 | 0, 1, 2, 3, 4, 5, 6, 7 | TODO |
| nearShin | 8 | 0, 1, 2, 3, 4, 5, 6, 7 | TODO |
| nearFoot | 8 | 0, 1, 2, 3, 4, 5, 6, 7 | TODO |
| farFoot | 8 | 0, 1, 2, 3, 4, 5, 6, 7 | TODO |
| farShin | 7 | 0, 1, 2, 3, 4, 6, 7 | TODO |
| nearForearm | 6 | 0, 1, 2, 5, 6, 7 | TODO |
| nearThigh | 6 | 2, 3, 4, 5, 6, 7 | TODO |
| farForearm | 4 | 0, 1, 2, 3 | TODO |
| farHand | 3 | 0, 1, 2 | TODO |
| farThigh | 3 | 0, 1, 7 | TODO |
| nearHand | 3 | 3, 6, 7 | TODO |
| farUpperArm | 1 | 3 | TODO |
| nearUpperArm | 1 | 5 | TODO |

## 8. Decision

Record the `TURN-LNN` / `ADD-NNN` entries, or state "no change; measured only".

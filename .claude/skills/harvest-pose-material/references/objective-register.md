# Objective Register

The distilled objective, its six necessary conditions, and the eleven work items
with their contribution and closure state. Full text with per-item challenges and
remedies: `docs/POSE_MATERIAL_OBJECTIVE.md`.

---

## Objective

> Build a reproducible pipeline that turns a fixed photographic corpus into an
> 8-phase / 16-frame running cycle in which every frame is a genuinely different,
> biomechanically correct pose, assembled from material that provably came from
> the named body part of a named real plate — with every one of those claims
> expressed as a number produced by a command.

## Six conditions

| ID | Condition | Failure looks like |
|---|---|---|
| C1 | **Pose truth** — the frame is the phase it claims | a sprint filed as mid-stance |
| C2 | **Material truth** — every pixel traceable and verified both ways | jersey harvested as an arm |
| C3 | **Identity continuity** — person, wardrobe, scale, light | a swimsuit plate in a jersey cycle |
| C4 | **Assembly integrity** — no islands, seams, penetration | limb blob over the shorts |
| C5 | **Coverage** — enough measured angles; gaps named | same sausage at every angle |
| C6 | **Reproducibility** — claims re-derivable from a command | "looks better now" |

## Eleven work items

| ID | Item | Serves | State |
|---|---|---|---|
| I-1 | Source corpus and provenance ledger | C2, C3, C6 | closed |
| I-2 | Photographic intake quality | C3 | closed |
| I-3 | Pose truth (registration + phase compliance) | C1 | closed |
| I-4 | Part visibility and eligibility | C2, C5 | closed |
| I-5 | Appearance fidelity (skin vs garment) | C2, C3 | closed |
| I-6 | Cutout contract and round-trip verification | C2, C4 | closed |
| I-7 | Angle-bucketed bank and selection | C5 | **open (coverage)** |
| I-8 | Assembly integrity and seam continuity | C4 | closed, one residual (hip skin band) |
| I-9 | Cycle composition and diversity measurement | C1, C3, C4 | closed |
| I-10 | Gap-driven acquisition | C5 | **open** |
| I-11 | Reproducibility, regression, documentation | C6 | closed |

## Current measured standing

| Quantity | Value |
|---|---|
| Sources audited | 30 (1 master + 18 pose-bank + 11 phase) |
| Accepted / conditional / rejected | 6 / 20 / 4 |
| Distinct silhouette clusters | 30, zero duplicate pairs, mean pairwise IoU 0.442 |
| Angle buckets | 7 |
| Material gaps (part × phase) | 106 of 128 |
| Verified materials | 6 |
| Rejections recorded | 26 |
| Cycle | 16 frames, 0 islands, 0 px material-induced ground delta |
| Cycle diversity | mean 0.515 / max 0.845 / half-cycle 0.819 (source sheet 0.947) |

## Why coverage is the only open condition

The corpus is a single right-facing profile. In that view:

- the **near upper arm** sits behind the torso;
- the **near thigh top** sits behind the shorts;
- **far-side limbs** sit behind near-side limbs;
- the **near shin** never clears the far shin.

These are properties of the camera, not of the prompt. No additional profile from
the same viewpoint recovers them, which is why the next work is acquisition, not
generation.

## Gap classification (the output that justifies new imagery)

For every gap from AC-8, decide:

**Pose gap** — the part is visible in at least one plate but no plate holds it at
the required angle. Closeable by generating a new pose from the same camera.

**Camera gap** — the part is occluded for every pose from this viewpoint.
Closeable only by:

1. a three-quarter view (opens the near shoulder and hip);
2. an opposite-facing profile (makes the other side's near limb the near limb);
3. an isolated limb study in the same wardrobe, lighting and scale.

Only pose gaps enter the prompt queue. Camera gaps change the shoot plan. Each
acquisition must cite the gap, ship a solved-pose guide, and be scored on arrival
before any crop is attempted (AC-12).

## Rules that follow from the register

1. Do not generate without a named gap.
2. Do not accept a plate that fails AC-4/AC-5 for its target — reject it.
3. Do not close a gap by widening the tolerance; that changes the claim, not the
   coverage.
4. Do not report coverage without the residual angle distribution next to it.

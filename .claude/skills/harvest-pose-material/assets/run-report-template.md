# Pose-Material Run

Generated: `<ISO timestamp>`
Commit: `<short hash>`
Audit: `<audit generatedAt>`

## 1. Corpus and audit

| quantity | value |
|---|---|
| sources | |
| master / pose-bank / phase | |
| accepted / conditional / rejected | |
| angle buckets | |
| material gaps | |
| mean silhouette IoU | |
| duplicate pairs | |

Summarise the verdicts. Name the plates that changed status since the last run and
why. Do not describe a plate by its filename; cite `poseMatchRatio`.

### Angle buckets

| part | bucket | sources | supplied by |
|---|---|---|---|

## 2. Materials

| part | measured | bucket | skin | α-IoU | Δcolour | source |
|---|---|---|---|---|---|---|

Every row must come from `bank.json`; if a value is missing, the material is not
verified and must not be listed here.

## 3. Rejections

| reason | count |
|---|---|

Name the dominant reason and whether it is a corpus property (`low-fill`), a
geometry property (`merged`, `width-mismatch`) or a code property (`round-trip`).

## 4. Cycle

| metric | value | limit | verdict |
|---|---|---|---|
| frames | | = 16 | |
| detached islands | | = 0 | |
| material-induced ground Δ | | ≤ 2 px | |
| mean pairwise IoU | | ≤ 0.85 | |
| worst pair IoU | | ≤ 0.95 | |
| half-cycle IoU | | ≤ 0.90 | |
| stance sole spread | | rig-owned | n/a |

## 6. Visual review

What the contact sheet actually shows. Specifically:

- do limbs read as limbs at every phase (no blobs, no stretched material);
- is shading continuous across the shoulder, hip and knee;
- is any skin visible above a shorts hem, or any sock gap at an ankle;
- are the near and far limbs still distinguishable in crossover frames.

If a metric passed but the image is wrong, say so and treat the run as failed.

## 6. Gap classification

| part | gaps | phases | class |
|---|---|---|---|

`pose gap` = the part is visible somewhere; only the angle is missing.
`camera gap` = the part is occluded from this viewpoint for every pose.

## 7. Decision

- FDS: `TURN-L__`
- ADDENDA: `ADD-___` (only if a rule, threshold or contract changed)
- Next action: which gaps are queued for acquisition, or "no change; measured only".

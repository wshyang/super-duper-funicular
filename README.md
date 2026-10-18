# sprite-anchor-pipeline

One lateral photograph per persona → a rig-correct, deterministic running sprite
cycle, with every invented pixel counted.

This repository is the deliverable of a design review of
[`wshyang/super-duper-funicular`](https://github.com/wshyang/super-duper-funicular)
PR #1 and PR #8. The review is in [`docs/BRANCH_REVIEW.md`](./docs/BRANCH_REVIEW.md);
the revised pipeline is in [`docs/PIPELINE.md`](./docs/PIPELINE.md); this is a
working reference implementation of its first two stages.

```
docs/assets/cycle-contact.png    16 frames, skinned from one photograph
docs/assets/control-contact.png  the same 16 phases, geometry only
```

---

## Quick start

```bash
npm ci
npm run validate        # typecheck → 18 tests → profile → 16 frames → audit
```

Individual stages:

| Command | Produces |
|---|---|
| `npm run profile` | `out/profile/athletic/{profile,persona}.json`, landmark overlay |
| `npm run plates` | `out/frames/athletic/{frames,control,manifest.json,standing.png}` |
| `npm run audit` | `out/audit/athletic/audit-report.{json,txt}` |
| `npx tsx scripts/dump-atlas.ts` | `out/atlas/athletic/atlas-sheet.png` — every tile, synthetic cells tinted |

Add a persona by dropping a PNG at
`assets/personas/<id>/01-master-lateral.png` and running
`npm run plates -- <id>`. No code change; nothing per-persona lives in the source.

---

## How it works, in five sentences

1. **Measure the plate.** The backdrop is detected (not assumed), the subject is
   keyed by a chromatic test, and four landmark rows are measured.
2. **Place the rig.** Six numbers — scale, origin, and four segment stretches —
   map the anthropometric rest skeleton onto the photograph.
3. **Unwrap the texture.** Every subject pixel is assigned to a bone by material,
   then by occlusion order, then by distance, and accumulated into a `u × v` tile
   for that bone. What the photograph never showed is interpolated, mirrored, or
   left empty — and counted.
4. **Solve the gait.** Law-of-cosines IK, anti-phase legs, a foot roll solved from
   the ground contact upward. No persona data is consulted here.
5. **Sample, don't stitch.** Per frame, per bone, project each pixel back into the
   posed bone frame and sample the atlas. Two layers, one fixed paint order,
   2×2 supersampling, a one-pixel feather.

---

## What is different from the branches under review

| | PR #1 / PR #8 | This |
|---|---|---|
| Photographs per persona | 10 | 1 |
| Image generations | 72 for 30 plates | 0 |
| Crop / pivot constants | ~50 | 0 |
| Per-persona ternaries | ~80 | 0 |
| Code | 13 507 TS lines | 3 952 TS lines |
| Appearance model | rigid parts with hard caps | continuous surface, one atlas |
| Quality signal | 0 islands / 0 spill | 9 checks, each able to fail |

Details and measurements: [`docs/BRANCH_REVIEW.md`](./docs/BRANCH_REVIEW.md) §3.

---

## Documentation

| File | Contents |
|---|---|
| [`docs/BRANCH_REVIEW.md`](./docs/BRANCH_REVIEW.md) | measured post-mortem of PR #1 and PR #8 |
| [`docs/PIPELINE.md`](./docs/PIPELINE.md) | options considered, the S0–S6 design, cost model |
| [`docs/FDS.md`](./docs/FDS.md) | functional specification and acceptance |
| [`docs/SPEC.md`](./docs/SPEC.md) | module contracts and invariants |
| [`docs/VALIDATION.md`](./docs/VALIDATION.md) | what was measured, and what was not |
| [`docs/ADDENDA.md`](./docs/ADDENDA.md) | decisions taken while building, with evidence |
| [`GREENFIELD.md`](./GREENFIELD.md), [`CLAUDE.md`](./CLAUDE.md) | the engineering discipline adopted from the upstream project |

---

## Honest limits

The pipeline ships with one persona, one camera angle, and a head that reads as a
head only at sprite scale. The far limbs are mirrored from the near ones and
darkened by a constant. All of that is counted, gated where possible, and listed
in [`docs/VALIDATION.md`](./docs/VALIDATION.md) §7 rather than left for a viewer
to discover.

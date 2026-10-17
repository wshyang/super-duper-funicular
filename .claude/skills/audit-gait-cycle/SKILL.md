---
name: audit-gait-cycle
description: Inspect sixteen gait phases on light and dark backgrounds, at magnification, after any gait, mask, cut-out or compositing change.
---

# Full-cycle visual review

Adopted from the sibling branches (Stride Lab's multi-background browser audit, Funicular's
`photo:audit` CLI, Sprite Motion Lab's 16-frame dumper) and adapted to this repository's shared scene
contract. The mechanism is shared; the coordinate model is ours.

## When to run

After **any** change to gait, rig metrics, pose solving, the scene graph, or either painter. Also
after adding a persona or colourway.

## Procedure

1. **Render the audit.**

   ```bash
   npm run dump-cycle -- /tmp/funicular-cycle-audit 16 mei-lin red run
   ```

   Arguments: output directory, phase count (16), persona (`wei-ming` | `mei-lin`), colourway
   (`red` … `orange`), motion (`run` | `brisk-walk` | `walk`).

2. **Open the evidence, don't just generate it.**

   - `/tmp/funicular-cycle-audit/contact-sheet.png` — 16 phases × light/dark.
   - `/tmp/funicular-cycle-audit/frames/audit-frame-XX-deg-YYY.png` — one panel per phase.
   - `/tmp/funicular-cycle-audit/audit-report.json` — flight / double-support flags, alpha coverage,
     sole heights, ankle separation.

3. **Inspect at magnification**, not at thumbnail size. Crop and zoom:
   - neck / jaw / shoulder;
   - hip and shorts hem;
   - knees;
   - ankles and shoes at the **intermediate** phases (odd sixteenths), which the eight keyframes
     never show.

4. **Check for** the failure modes that have actually occurred in this family of implementations:
   - far chain reading in front of the near chain (z-order inversion);
   - shoe overlapping the shin at maximum dorsiflexion;
   - sole below the ground line, or floating above it during stance;
   - ponytail segments collapsing into one blob;
   - jersey/shorts gap at the waist;
   - detached primitives (a joint disc separated from both its segments).

5. **Record findings**, with the exact phase and motion, in `docs/FDS.md` for the turn and in
   `PLAN.md` §4 if an approach was rejected. If a fix is not made in this turn, the finding still
   gets written down — an unrecorded known defect becomes an unknown one.

6. **Re-run the audit after the fix** and view it again. A test passing is not a re-audit.

## What the automation proves

- 16 phases were rendered, each on two backgrounds.
- Panels are the expected dimensions and contain a non-trivial amount of opaque pixels.
- Telemetry flags flight vs double-support phases and reports sole heights and ankle separation.

## What it does **not** prove

- Anatomical realism, seamlessness, or correct occlusion at every phase.
- Chroma or texture correctness (there is no photographic pipeline yet).
- Continuity between phases beyond what the telemetry suggests.

Never report the audit as "passed" in the sense of "the art is correct". Report it as
"generated and viewed", and write down what was seen.

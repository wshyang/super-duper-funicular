# Skill: audit-gait-cycle

Trigger: after any change to gait, rig, foot roll, cutouts, masks or compositing.

1. `npm run runner:audit` — writes `public/renders/audit-<persona>-<motion>.png`
   (16 phases × light/dark/joint panels) plus `public/renders/audit-labels.json`
   (panel order; the pure-TS raster has no font renderer).
2. `npm run runner:filmstrip` — 8-phase filmstrips per persona.
3. Open every sheet with `read_file`; inspect for joint steps, sole/ground gaps,
   ankle shear, silhouette pops, panel bleed, label contrast.
4. Record findings + limitations in `docs/FDS.md#gait-cycle-visual-audit`
   (date, sheet path, persona/motion, what was looked at).
5. Scratch copies for zoomed crops go to `/tmp/gait-cycle-audit-<run>/`, never git.

This skill is a visual inspection aid, not a promise of defect detection.

---
name: audit-gait-cycle
description: Review gait, rig, cutout, mask, and compositing changes through a full-cycle diagnostic and the real app renderer.
---

# Full-cycle visual review

Use this review for any gait, IK, shoe/foot, photo-part, crop, mask, layer-order, or compositing change. A unit test or eight-frame strip alone is not visual acceptance.

1. Run the affected unit, real-asset, and browser tests first. Record commands and failures honestly. If the audit renderer is not yet implemented, record that as a blocked check; do not substitute a plate-space crop and call it app-fidelity.
2. Generate at least 16 evenly spaced phases over `[0,1)`, including odd intermediate phases. Use the current persona, motion, settings, and calibration through the actual scene composition and painter.
3. For every phase, render a clean light-background panel, a clean dark-background panel, and a joint/skeleton overlay. Keep phase/motion labels readable and prevent cells from bleeding into neighboring panels.
4. Open the generated sheet. Magnify the joints touched by the change and inspect near/far order, visible gaps, texture/width discontinuities, key-color spill, detached pixels, clipping, sole penetration, and contact/clearance over the cycle. Check relevant control extremes, not only defaults.
5. For suspected defects, record motion, normalized phase, part, crop, and the evidence. Separate an actual app-fidelity defect from a diagnostic-view or plate-space artifact.
6. Make only a supported correction. Regenerate and reopen the sheet after the fix; rerun affected tests. A mask that removes pixels may expose a gap and cannot recreate missing source texture.
7. Update `docs/FDS.md` with adopted/rejected alternatives, visual findings, limitations, exact validation, and next action. Update feature acceptance/addenda in the same change when behavior or a design contract changes.

The audit is a human inspection aid. It does not prove anatomy, clinical biomechanics, photorealism, fully connected joints, or absence of defects. Numeric metrics need explicit definitions and calibrated thresholds; zero islands or high silhouette IoU alone is not a realism score.

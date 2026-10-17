---
name: audit-gait-cycle
description: Inspect sixteen phases through the real browser renderer on light/dark backgrounds and with joint overlays after gait, masking or compositing changes.
---

# Full-cycle visual review

Adapted conceptually from `arena/917ef347-super-duper-funicular` at `f4c31978650ede094bfc96b0a610d53efd7f9ebe`, not copied from its separate raster engine.

1. Run `npm ci` if necessary, then `npm run test:e2e:sandbox` (or standard `npm run test:e2e` where browser dependencies are available). Playwright saves `run-audit.png`, `walk-audit.png` and `brisk-walk-audit.png` under the cycle-audit test's ignored `test-results/` directory and attaches them to results. Do not commit generated audit PNGs/videos.
2. For custom settings/personas, use **Export 16-phase audit · PNG** under the stage. It exports generated motion, even if the stage currently shows the original source sheet. It preserves playback and uses current gait/hip/end-cap calibration. Pending/failed photo loading disables export.
3. Open all relevant sheets with an image viewer/read-file tool. Enlarge or crop shoulder/neck, hip/shorts, knees and ankles at the intermediate phases (odd sixteenths), not just the existing eight keyframes. Check all three columns: light, dark and joint overlay. Use the element inspector for suspect rotating overlaps.
4. Check for visible gaps, cloth seams, width jumps, fringe/colour spill, detached pixels, clipping, shoe/ground contact and near/far ordering. Record exact phase and motion for any finding. Distinguish a drawn ground line/IK support state from actual texture/sole contact.
5. Fix well-supported causes; do not invent source texture or adjust pivots merely to hide a seam. Re-run the audit and affected tests after fixes. Treat unsupported changes as hypotheses needing evidence.
6. Append evidence, adopted/rejected approaches, remaining defects and next action to `docs/FDS.md`; update SPEC/ADDENDA for changed contracts and VALIDATION for actual gate results.

The browser test proves all 48 panels per motion contain rendered content, correct dimensions/naming, and unchanged live pose. It does **not** certify anatomical realism, connectivity, chroma correctness or seamless joints. This implementation does not yet port the reference's raw-frame JSON anomaly metrics or automatic joint crops. Never report those as available or passing. A montage is a review aid, not a substitute for visual inspection or continuous-phase gait tests.

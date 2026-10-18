---
name: audit-gait-cycle
description: Dump a full 16-frame gait cycle with 3-panel diagnostic plates, zoomed joint crops, standing-profile plate, and quantitative telemetry to a temporary directory, then visually inspect the generated PNGs to diagnose rendering defects and propose rectifications.
---

# Agent Skill: Full-Cycle Gait Frame Dump & Visual Defect Audit (`audit-gait-cycle`)

Use this skill whenever modifying articulated cutouts, rounded-joint cutters, bone/shoe warpers, rig compositing, keyframe selection, in-between warping, or any sprite-assembly code.

> **Provenance note (this repository):** the dumper CLI (`npm run dump-cycle`) lands with the P2 implementation. Until then, execute the watched branches' dumper inside their checked-out worktrees (`/home/user/pr1-review`, `/home/user/pr8-review`) and record that provenance per `CLAUDE-validation.md §8.1`. The inspection, defect taxonomy, and gating steps below apply unchanged.

---

## Step 1 — Dump Full Cycle Screenshots & Telemetry to a Temporary Directory

```bash
# Inside a worktree that carries the dumper (e.g. /home/user/pr8-review):
npm run dump-cycle -- /tmp/audit-<label> 16 <persona|all-photoreal|all-personas> <variant>

# Example:
npm run dump-cycle -- /tmp/audit-pr8 16 photo-sg-chinese-female red
```

This generates (per persona):
1. `audit-report.json` — per-frame quantitative metrics (`disconnectedIslandsCount`, `detachedIslandPixels`, `magentaSpillPixelsCount`, `semiTransparentFringeCount`, `lowestFootY`, `groundLineDeltaPx`, `uncoveredJointNames`) plus resolved tuning and effective rig lengths.
2. `contact-sheet-16frame.png` — 4×4 full-cycle overview over a neutral warm-grey backdrop with the track ground line.
3. `joint-crops-sheet.png` — pose-adaptive `2×` magnified close-ups across φ ∈ {0.00, 0.25, 0.50, 0.75} for three zones: head/neck/shoulder, torso/pelvis/knee, ankle/shoe/ground line.
4. `standing-profile-audit.png` — neutral upright calibration plate verifying element sizing and waist-to-shorts continuity.
5. `frames/audit-frame-NN-deg-DDD.png` — 16 three-panel plates: neutral grey + ground line; dark slate with magenta-spill highlights; joint-pivot crosshairs.

**P2 addition (`ADD-007`):** also render and inspect the `1×` display-resolution strip of the same 16 phases (and a `4×` strip for disputed areas). Numeric telemetry and zoomed inspection never substitute for the `1×` view a player actually sees.

## Step 2 — Inspect Generated Screenshots with the `read_file` Vision Tool

Never rely solely on numeric telemetry. Always `read_file`:
1. `contact-sheet-16frame.png`
2. `joint-crops-sheet.png`
3. `standing-profile-audit.png`
4. At least 4 individual three-panel plates spanning extreme poses (φ = 0.000 midfoot strike, 0.250 knee pass, 0.375 flight, 0.500 contralateral strike).

## Step 3 — Evaluate the Defect Taxonomies

**Inherited (PR `#1`/`#8`) categories:**
- `DEFECT-01` joint pivot step/notch at high flexion; `DEFECT-02` garment/skin boundary bleed or gap; `DEFECT-03` limb width/proportion discontinuity; `DEFECT-04` rolling-shoe & ankle-sock deformation; `DEFECT-05` contralateral contrast & z-order occlusion; `DEFECT-06` detached islands & chroma spill (must be 0/0); `DEFECT-07` anatomical surface/chirality fidelity.

**P2 categories (see `docs/BRANCH_ASSESSMENT_PR1_PR8.md §5` for photographic evidence):**
- `TEX-ERR` texture streaking/melting under rotation (warp resampling of baked shading).
- `TONE-ERR` cross-part tone/grade seams (parts sourced from different plates).
- `JOIN-ERR` joint gap/overlap failure beyond rounded-cap coverage (extreme flexion).
- `SHOE-ERR` shoe ghosting/duplication under chord-tent roll warp.
- `PEN-ERR` ground penetration (`groundLineDeltaPx` outside −9…+2 px; ≤ 2 px on support frames).
- `IDENT-ERR` identity drift between frames vs persona master (dHash distance at sprite scale).

## Step 4 — Propose & Log Concrete Rectifications

Record findings, quantitative metrics, and prioritised rectifications in `docs/FDS.md#continuous-learning-log` (as part of the current turn's entry) and, where they change a design decision, `docs/ADDENDA.md`. Never end the turn with an undocumented audit outcome.

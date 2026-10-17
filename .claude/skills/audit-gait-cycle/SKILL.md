---
name: audit-gait-cycle
description: Dump a full 16-frame gait cycle with 3-panel diagnostic plates, zoomed joint crops, and quantitative telemetry to a temporary directory, then visually inspect the generated PNGs to diagnose rendering defects and propose rectifications.
---

# Agent Skill: Full-Cycle Gait Frame Dump & Visual Defect Audit (`audit-gait-cycle`)

Use this skill whenever modifying articulated cutouts (`src/pipeline/photoreal-extractor.ts`), rounded-joint cutters (`src/pipeline/rounded-joint-cutter.ts`), inverse-mapped bone/shoe warpers (`src/runner/photoreal-warp.ts`), or rig compositing (`src/runner/photoreal-rig.ts`).

---

## Step 1 — Dump Full Cycle Screenshots & Telemetry to a Temporary Directory

Execute the CLI dumper to generate a 16-frame ($22.5^\circ$ phase increments across $\phi \in [0, 1)$) diagnostic suite in `/tmp/gait-cycle-audit`:

```bash
npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red
```

This generates:
1. `/tmp/gait-cycle-audit/audit-report.json`: Per-frame quantitative defect metrics (`disconnectedIslandsCount`, `detachedIslandPixels`, `magentaSpillPixelsCount`, `semiTransparentFringeCount`, `lowestFootY`, `groundLineDeltaPx`, and `uncoveredJointNames`).
2. `/tmp/gait-cycle-audit/contact-sheet-16frame.png`: A `4 × 4` full-cycle overview grid (`880 × 1024`) over a neutral warm-grey backdrop (`#E2E6EE`) with the track ground line (`y = 212`).
3. `/tmp/gait-cycle-audit/joint-crops-sheet.png`: A `2×` magnified close-up grid (`720 × 480`) across phases $\phi \in \{0.00, 0.25, 0.50, 0.75\}$ and 3 critical articulation zones:
   - **Row 1:** Head + Cervical Neck + Shoulder Socket + Upper Torso
   - **Row 2:** Lower Torso + Pelvis Shorts + Near/Far Thigh Shorts-Cuff & Knee
   - **Row 3:** Near & Far Ankle Sock + 2-Segment Rolling Shoe
4. `/tmp/gait-cycle-audit/frames/audit-frame-01-deg-000.png` .. `audit-frame-16-deg-338.png`: 16 three-panel (`660 × 256`) diagnostic screenshots:
   - **Left panel:** Neutral studio grey (`#E2E6EE`) + ground reference line.
   - **Center panel:** High-contrast dark slate (`#181C26`) with cyan (`#00FFFF`) magenta-spill highlights.
   - **Right panel:** Kinematic joint pivot crosshairs (`headCenter`, `neck`, `collar`, `pelvis`, `nearElbow`, `nearKnee`, `nearAnkle`, `nearBall`).

---

## Step 2 — Inspect Generated Screenshots with the `read_file` Vision Tool

Never rely solely on numeric telemetry. You MUST call `read_file` on:
1. `/tmp/gait-cycle-audit/contact-sheet-16frame.png`
2. `/tmp/gait-cycle-audit/joint-crops-sheet.png`
3. At least 4 individual 3-panel plates spanning extreme poses:
   - `frames/audit-frame-01-deg-000.png` ($\phi = 0.000$, Right Midfoot Strike / Max Contralateral Extension)
   - `frames/audit-frame-05-deg-090.png` ($\phi = 0.250$, Right Mid-Stance & Left Recovery Knee Pass)
   - `frames/audit-frame-07-deg-135.png` ($\phi = 0.375$, Airborne Flight Phase)
   - `frames/audit-frame-09-deg-180.png` ($\phi = 0.500$, Left Midfoot Strike / Near Leg Trailing Extension)

---

## Step 3 — Evaluate the 7 Anatomical & Rendering Defect Taxonomies

Examine the inspected images against these 7 defect categories:
- **`DEFECT-01` (Joint Pivot Step/Notch):** Does any rotating joint (`neck/collar`, `shoulder`, `elbow`, `hip`, `knee`, `ankle`) expose a sharp rectangular step, corner notch, or non-concentric bulge at high flexion angles?
- **`DEFECT-02` (Garment/Skin Boundary Bleed or Gap):** Does the `torso` singlet hem, `pelvis` waistband/hem, or `nearThigh`/`farThigh` composite shorts cuff expose an unintended skin sliver or garment gap when legs swing to `±40°`?
- **`DEFECT-03` (Limb Width / Proportion Discontinuity):** Does the transverse width jump abruptly across connected segments (`upperArm -> forearm -> hand` or `thigh -> shin -> ankle`)?
- **`DEFECT-04` (2-Segment Rolling Shoe & Ankle Sock Deformation):** During `heel-off-roll` and `toe-off`, does the white ankle sock shear or separate from the distal shin, or does the midsole compress unnaturally?
- **`DEFECT-05` (Contralateral Contrast & Z-Order Occlusion):** Are `far*` medial limbs clearly distinguishable behind `near*` lateral limbs during leg/arm crossover ($\phi = 0.25, 0.75$)?
- **`DEFECT-06` (Detached Islands & Chroma Spill):** Are `totalDisconnectedIslands == 0` and `totalMagentaSpillPixels == 0` across all 16 frames?
- **`DEFECT-07` (Anatomical Surface / Chirality Fidelity):** Do the near limbs show outside lateral anatomy (outer swoosh, dorsal knuckles, vastus lateralis) and the far limbs show inside medial anatomy (inner palm + 4 curled fingers with thumb on top, medial arch wall)?

---

## Step 4 — Propose & Log Concrete Rectifications

Record the visual audit findings, quantitative metrics, and prioritized engineering rectifications in `docs/FDS.md` (`#gait-cycle-visual-audit`) and `docs/ADDENDA.md`.

# Biomechanical & Quantitative Flaw Analysis of Extracted Running Sprites

- **Source Sheet Analyzed:** `src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg`
- **Sheet Header Claim:** `"8-FRAME COMPLETE RUNNING CYCLE (Alternating Gait)"`
- **Actual Unique Poses per Row:** **4 of 8** (24 of 48 total cells)
- **Mean Half-Cycle Silhouette IoU (Frame $k$ vs Frame $k+4$):** **94.7%**
- **Minimum Horizontal Foot Separation:** **147 px** (never crosses 0 px — zero leg crossover)
- **Raw Cell Vertical Baseline Jitter:** **25 px**
- **Character Height Inconsistency Across Cycle:** **20 px**

---

## 1. Executive Summary of Animation Flaws

### 1.1 FLAW-01: Half-Cycle Frame Duplication (4 Poses Doubled into 8 Columns) (`CRITICAL`)
- **Finding:** Frames 5, 6, 7, and 8 are near-identical copies of Frames 1, 2, 3, and 4 rather than the second half of an 8-frame running stride.
- **Quantitative Evidence:** Mean centroid-aligned silhouette IoU between Frame k and Frame k+4 is 94.7% (4 unique poses out of 8 columns per row; 24 unique poses out of 48 total cells).
- **Biomechanical Impact:** Halves the effective animation resolution to 4 frames and causes the cycle to repeat twice per loop.
- **Algorithmic Remedy:** Evaluate continuous gait phase φ ∈ [0, 1) across 8 distinct 45° phase increments (φ = 0.000, 0.125, ..., 0.875) with zero duplicated poses.

### 1.2 FLAW-02: Missing Alternating Gait — Unilateral "Peg-Leg" Hop (`CRITICAL`)
- **Finding:** Despite the sheet title claiming "(Alternating Gait)", the same leg (far leg) stays permanently extended in front and the near leg stays permanently behind across all 8 frames.
- **Quantitative Evidence:** In all 8 frames, frontFootOffsetX > +45 px and rearFootOffsetX < -60 px with identical limb shading order; the left and right legs never swap lead.
- **Biomechanical Impact:** A human runner alternates left and right lead legs every half-stride (180° phase offset) with opposite arm counter-rotation. Keeping one leg permanently ahead produces a comical one-legged limp/hop.
- **Algorithmic Remedy:** Drive the near (right) leg at phase φ and the far (left) leg at exact anti-phase (φ + 0.5) mod 1, with counter-phased arm swing and distinct near/far depth shading.

### 1.3 FLAW-03: Zero Leg Crossover (Missing "Pass" / Recovery Phase) (`CRITICAL`)
- **Finding:** Neither leg ever passes beneath the pelvis; the legs remain permanently scissored apart in every frame.
- **Quantitative Evidence:** Minimum horizontal foot-to-foot separation across all 8 frames is 147 px (a real run cycle crosses 0 px twice per stride during the Pass phase).
- **Biomechanical Impact:** Without a passing pose where the swing knee overtakes the stance leg under the hip, the limbs appear to oscillate statically in place and snap backward instantly between Frame 4 and Frame 5/1.
- **Algorithmic Remedy:** Solve closed orbital foot trajectories where the stance foot sweeps backward on the ground via 2-bone IK while the swing knee drives forward past the hip at φ = 0.25 and φ = 0.75.

### 1.4 FLAW-04: Unregistered Pivot & Counter-Physical Scale/Baseline Jitter (`MAJOR`)
- **Finding:** Character body height, head volume, and ground contact line fluctuate erratically between adjacent cells.
- **Quantitative Evidence:** Bounding-box height varies by 20 px (212 px to 232 px) and the raw cell ground baseline shifts by 25 px without matching ballistic flight phases.
- **Biomechanical Impact:** Playing raw cell crops causes vertical popping and horizontal sliding, while the character shrinks during mid-stride.
- **Algorithmic Remedy:** Enforce invariant segment bone lengths (femur, tibia, trunk, humerus, forearm) from a single anatomical rig with double-frequency pelvis bob Δy(φ) locked to stance/flight physics.

### 1.5 FLAW-05: Two-Tone Magenta Checkerboard & JPEG Chroma Spill (`MODERATE`)
- **Finding:** The sheet combines #FF00FF grid lines over #FD49FD pink cell backgrounds with JPEG 8×8 block compression artifacts.
- **Quantitative Evidence:** Cell backgrounds average RGB(253, 74, 253) while dividers are RGB(253, 0, 252), with 1–2 px magenta fringe bleed along dark outlines.
- **Biomechanical Impact:** Naive single-color chroma keying leaves pink halos around the runner or accidentally erodes purple jersey pixels.
- **Algorithmic Remedy:** Use border-seeded flood-fill chroma keying with boundary despill for extraction, and render algorithmic sprites directly into clean RGBA buffers.

## 2. Half-Cycle Duplication Proof (Frames 1–4 vs Frames 5–8)

| Frame Pair | Centroid-Aligned Silhouette IoU | 64-bit dHash Distance | Half-Cycle Duplicate? |
|---|---|---|---|
| Frame 1 vs Frame 5 | 96.4% | 1 / 64 bits | YES (Duplicate Pose) |
| Frame 2 vs Frame 6 | 96.9% | 3 / 64 bits | YES (Duplicate Pose) |
| Frame 3 vs Frame 7 | 90.7% | 4 / 64 bits | YES (Duplicate Pose) |
| Frame 4 vs Frame 8 | 94.8% | 1 / 64 bits | YES (Duplicate Pose) |

## 3. Per-Frame Biomechanical Measurements (Red Row)

| Frame | Tight BBox (W×H) | Cell Foot Baseline Y | Front Foot ΔX | Rear Foot ΔX | Foot Separation | Lead Leg |
|---|---|---|---|---|---|---|
| Frame 1 | 178×231 px | 249 px | +78.5 px | -98.5 px | 177 px | Unilateral (No Swap) |
| Frame 2 | 158×214 px | 249 px | +63.6 px | -93.4 px | 157 px | Unilateral (No Swap) |
| Frame 3 | 202×211 px | 240 px | +81 px | -120 px | 201 px | Unilateral (No Swap) |
| Frame 4 | 179×214 px | 224 px | +53.5 px | -94.5 px | 148 px | Unilateral (No Swap) |
| Frame 5 | 177×231 px | 249 px | +78.3 px | -97.7 px | 176 px | Unilateral (No Swap) |
| Frame 6 | 158×215 px | 249 px | +64.1 px | -92.9 px | 157 px | Unilateral (No Swap) |
| Frame 7 | 211×214 px | 237 px | +83.3 px | -126.7 px | 210 px | Unilateral (No Swap) |
| Frame 8 | 178×212 px | 224 px | +53.2 px | -93.8 px | 147 px | Unilateral (No Swap) |

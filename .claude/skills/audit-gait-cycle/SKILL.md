# Agent Skill — Audit Gait Cycle (Full-Cycle Visual Defect Inspection)

## When to run

Execute this skill whenever articulated cutouts, rounded-joint cutters, bone/foot warpers, photographic mats, or gait foot-roll/lean are changed — or when a user asks for a visual review. Do not rely on passing unit tests or 8-thumbnail inspection alone.

## Procedure

1. **Dump headless full-cycle artefacts:**
   ```bash
   npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red
   # Produces:
   #   /tmp/gait-cycle-audit/frames/frame-*.png                 (16 raw frames)
   #   /tmp/gait-cycle-audit/frames/audit-frame-*-deg-*.png    (16 three-panel plates: Light | Dark | Joint Overlay)
   #   /tmp/gait-cycle-audit/contact-sheet-16frame.png          (4×4 grid)
   #   /tmp/gait-cycle-audit/joint-crops-sheet.png              (2× magnified joint crops)
   #   /tmp/gait-cycle-audit/audit-report.json                  ({ detachedIslands, magentaSpill, uncoveredJoints, frameCount })
   ```

2. **Visually inspect with `read_file`:**
   - Open `contact-sheet-16frame.png` and `joint-crops-sheet.png` via `read_file`.
   - Open at least 4 individual extreme-pose plates (e.g., `audit-frame-00-deg-0.png`, `audit-frame-04-deg-90.png`, `audit-frame-08-deg-180.png`, `audit-frame-12-deg-270.png`).
   - Look for: joint-step notches, garment-boundary gaps (hip/knee/shorts hem), ankle/shoe shear, toe overlap bleed, chroma spill, inter-phase bleed, detached islands.

3. **Measure and record:**
   - `detachedIslands`, `magentaSpill`, `uncoveredJoints` from `audit-report.json`.
   - File-level findings: which joint, which phase, pixel measurements where possible.

4. **Document:**
   - Findings + rectification proposals (`DEFECT-NN` / `RECT-NN`) go in `PLAN.md` / `docs/RECTIFICATION_PLAN.md` and `docs/FDS.md#gait-cycle-visual-audit`.
   - Add a `TURN-LNN` entry in `docs/FDS.md#continuous-learning-log` citing viewed sheets, CLI output, and the visual conclusion.

5. **Complement with browser audit where relevant:**
   - The browser `JointAndCycleAuditPanel` exports a 16-phase 3-panel PNG via `Export 16-phase audit · PNG` (`data-testid="joint-audit-panel__export-audit-png"`).
   - For interactive calibration, open the joint end-cutter inspector (`data-testid="joint-audit-panel"`), exercise isolated pivot rotation and assembled-joint comparison.

## Rules

- Keep generated evidence in `/tmp/gait-cycle-audit` or `reports/` temp (gitignored except committed `reports/runner-preview-*.png` preview).
- Label plate-space diagnostic probes vs app-fidelity output explicitly (3× plate-space knee crops ≠ running gait seam).
- Passing `audit-report.json` metrics (`detachedIslands = 0`) does not certify photographic realism — seams between independent cutouts remain a 2D limitation.

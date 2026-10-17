# Validation & Executed Gate Register (`docs/VALIDATION.md`)

- **Repository:** `wshyang/super-duper-funicular`
- **Branch:** `arena/917ef347-super-duper-funicular` (PR `#1`)
- **Related Discipline:** `CLAUDE-validation.md §8–§10`, `GREENFIELD.md §8–§9`, and `docs/THREE_WAY_BRANCH_COMPARISON.md §5`.

---

## 1. Executed Validation Gates (Current Checkout)

Every functional change in this branch is validated against the following locally executed commands before commit/push:

1. **`npm run dedupe` (`tsx scripts/dedupe-images.ts`):**
   - Scanned 17 image files across `src/images/` (byte SHA-256, raw RGBA pixel SHA-256, and 64-bit perceptual `dHash`); 17 unique assets cataloged in `public/sprites/catalog.json` (`0` duplicate files).
2. **`npm run generate-sheets` (`tsx scripts/generate-algorithmic-sprites.ts`):**
   - Extracted 17 `160 × 160` RGBA photorealistic cutouts (`public/sprites/photoreal/sg-chinese-female/parts/*.png`) with semicircular pivot caps, internal `6 px` Hermite shaft-shoulder blending, additive sprinter-shorts end-cap composites (`attachEndCapComposite`), and material-class skin/fabric spill purge (`0` bright singlet pixels on skin parts).
   - Vectorized all 17 cutouts into standalone multi-band SVGs (`public/sprites/photoreal/sg-chinese-female/svg-parts/*.svg`) and stitched 8 hierarchical SVG pose frames (`svg-frames/frame-01..08.svg`).
   - Generated 48-frame (`6 colorways × 8 frames`) sprite sheets for `sg-chinese-male`, `sg-chinese-female`, and `photo-sg-chinese-female`.
3. **`npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red` (`tsx scripts/dump-cycle-frames.ts`):**
   - Dumped 16 full-cycle raw frames (`0°..337.5°`), 16 three-panel diagnostic plates (`frames/audit-frame-01..16-deg-000..338.png`), `contact-sheet-16frame.png`, `2×` magnified `joint-crops-sheet.png`, and `audit-report.json`.
   - Verified quantitative telemetry: `totalDisconnectedIslands = 0`, `totalMagentaSpillPixels = 0`, `framesWithUncoveredJoints = 0`.
   - Visually inspected `contact-sheet-16frame.png`, `joint-crops-sheet.png`, and `audit-frame-09-deg-180.png` via `read_file`.
4. **`npm run typecheck` (`tsc --noEmit`):**
   - Passed with zero TypeScript strict-mode errors.
5. **`npm test` (`vitest run`):**
   - **29/29 tests passed across 4 suites** (`src/pipeline/pipeline.test.ts`, `src/runner/runner.test.ts`, `src/discipline/greenfield-gate.test.ts`, `src/app/hooks/studio-view-model.test.ts`):
     - Real reference JPEG (`1376 × 768`) `132 px` header & `6 × 8` grid detection, border-flood chroma key, and half-cycle duplicate IoU (`> 0.90`).
     - Full-cycle 3-panel diagnostic dump (`totalDisconnectedIslands === 0`, `totalMagentaSpillPixels === 0`).
     - Material-class matte invariant (`countBrightSingletPixels === 0` on `nearUpperArm`, `nearForearm`, `farUpperArm`, `farForearm`, `neck`) and `< 15%` near/far medial limb width parity (`measureNearFarLimbWidthParity`).
     - Analytical 2-bone IK bone-length conservation, cervical neck articulation, 4-stage midfoot-to-toe foot roll, forward-falling center-of-mass lead, and `walk` / `brisk-walk` locomotion modes (`isFlightPhase === false` across all 16 phases + double support `2/2`).
     - Automated Greenfield discipline gate (`<= 800 LOC` per file, `<= 50 LOC` per named function, `data-testid="{component-kebab}__{element-role}"` on interactive JSX elements, `#image-prompt-log`, `#continuous-learning-log`, and `#three-way-branch-comparison`).
6. **`npm run build` (`tsc -b && vite build`):**
   - Production bundle built cleanly into `dist/`.
7. **Live Dev Server (`start_process`: `npm run dev`):**
   - Verified listening on `0.0.0.0:3000`.

---

## 2. Honest Environment & Verification Limits

1. **Container & CI Templates (`Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.gitlab-ci.yml.shiphats`, `activate-shiphats.sh`):**
   - Verified structurally by `src/discipline/greenfield-gate.test.ts` and scratch-directory execution of `activate-shiphats.sh`. Docker image builds (`docker build`), `cloudflared` tunnel execution, and remote GitLab SHIP-HATS pipeline runners were **not** executed in this sandbox environment.
2. **Cross-Branch Reference Checkouts (`/tmp/branch-263385da` & `/tmp/branch-77ffb088`):**
   - Source code, specifications, and test suites on `origin/arena/263385da-super-duper-funicular` (`b227e2f`) and `origin/arena/77ffb088-super-duper-funicular` (`c690201`) were checked out into `/tmp` and read directly; their reported test counts (Branch 2: 39 unit / 14 Playwright tests; Branch 3: 177 unit tests) are cited as reference-branch evidence while our own 29 Vitest suites and 16-phase visual dumps were executed locally here.
3. **2D Photographic Rig Scope & Honest Visual Limits:**
   - Although `RECT-01`..`RECT-06` and `CROSS-01`..`CROSS-09` eliminate detached pixel islands (`0`), chroma spill (`0`), crossing white shorts stripes, rear-swing arm peeks, and `farForearm` width pinching (`< 15%` delta), the photorealistic persona remains a **2D articulated cutout rig synthesized from 10 studio plates** rather than a 3D Skinned Mesh or live-action video capture. Subtle studio lighting differences across independently generated plates and 2D perspective limits remain inherent to 2D cutout animation.

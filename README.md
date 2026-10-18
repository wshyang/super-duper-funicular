# Sprite Motion Lab — Algorithmic Articulated Runner & Sprite Pipeline

This repository adopts the coding discipline from [`wshyang/greenfield`](https://github.com/wshyang/greenfield) (`GREENFIELD.md` and `FDS_BUILDER.md`) and implements an end-to-end sprite asset deduplication, magenta chroma-key piece extraction, quantitative biomechanical flaw diagnosis, and real-time algorithmic running sprite synthesis engine in TypeScript.

---

## Deliverables Overview

### 0. Greenfield Discipline Adoption (`wshyang/greenfield`)
- **Standing Instructions Index & Section Split:** [`CLAUDE.md`](./CLAUDE.md) plus focused section files (`CLAUDE-decisions.md`, `CLAUDE-testing.md`, `CLAUDE-database.md`, `CLAUDE-conventions.md`, `CLAUDE-function-design.md`, `CLAUDE-validation.md`, `CLAUDE-deployment.md`, `CLAUDE-checklist.md`), alongside upstream [`GREENFIELD.md`](./GREENFIELD.md) and [`FDS_BUILDER.md`](./FDS_BUILDER.md).
- **Living Specification & Addenda Register:** [`docs/FDS.md`](./docs/FDS.md) and [`docs/ADDENDA.md`](./docs/ADDENDA.md) (`ADD-001`..`ADD-010`).
- **Deployment & Inert SHIP-HATS Pipeline:** Contextualised `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`, Bash 3.2-compatible `./dev.sh` and `./activate-shiphats.sh`, and inert `*.shiphats` pipeline definitions.
- **Automated Discipline Gate (`src/discipline/greenfield-gate.test.ts`):** Enforces ≤ 50 LOC per function, ≤ 800 LOC per file, presentation-only JSX interiors, `data-testid` coverage, Dockerfile contract, and `activate-shiphats.sh` scratch activation.

### 1 & 2. Asset Deduplication & Structured Filing in `/src/images`
- Command: `npm run dedupe` (`scripts/dedupe-images.ts` / `src/pipeline/dedupe-catalog.ts`)
- Deduplicates candidate images using byte `SHA-256`, normalized RGBA pixel `SHA-256`, and 64-bit perceptual difference hash (`dHash64`), and files them into `/src/images/` with meaningful names:
  - `src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg` (relocated from `incorrect running sprites.jpeg`)
  - `src/images/spritesheets/runner-8frame-6color-algorithmic-sheet.png`
  - `src/images/backdrops/stadium-track-day.png`
  - `src/images/backdrops/stadium-track-dusk.png`
  - `src/images/backdrops/stadium-track-night.png`
  - `src/images/manifest.json`

### 3. Multi-Piece Sprite Cutout & Public URL Filing (`/public/sprites/`)
- Command: `npm run extract` (`scripts/extract-sprites.ts` / `src/pipeline/sprite-extractor.ts`)
- Automatically detects the `132 px` header band and `6 rows × 8 columns` grid dividers from pure `#FF00FF` magenta peaks, performs border-seeded flood-fill + interior magenta island keying + 1 px boundary despill (preserving the purple jersey row cleanly), registers each cutout onto a `220 × 256` RGBA canvas, and writes to publicly accessible URLs:
  - `/sprites/extracted/{red|blue|green|yellow|purple|orange}/frame-0{1..8}.png` (48 frames)
  - `/sprites/extracted/{variant}/unique-0{1..4}.png` (24 deduplicated unique poses)
  - `/sprites/extracted/manifest.json`
  - `/sprites/algorithmic/{variant}/frame-0{1..8}.png` and `/sprites/algorithmic/parts/{partId}.png`

### 4. Quantitative & Biomechanical Flaw Assessment
- Command: `npm run analyze` (`scripts/analyze-sprites.ts` / `src/pipeline/flaw-analyzer.ts`)
- Full report: [`docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`](./docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md) and `/sprites/extracted/analysis.json`
- Key measured findings on `runner-8frame-6color-flawed-sheet.jpeg`:
  1. **`FLAW-01` — Half-Cycle Frame Duplication:** Columns 5–8 are near-exact copies of Columns 1–4 (**94.7% mean centroid-aligned silhouette IoU**, `dHash` distance 0–4 bits). Only **4 unique poses** exist per 8-frame row (24 unique out of 48 cells).
  2. **`FLAW-02` — Missing Alternating Gait ("Peg-Leg Hop"):** Despite the header claiming `"(Alternating Gait)"`, the same leg (far leg) stays permanently extended in front (`frontFootOffsetX > +53 px`) and the near leg stays permanently behind (`rearFootOffsetX < -92 px`) in all 8 frames.
  3. **`FLAW-03` — Zero Leg Crossover (Missing "Pass" Phase):** Minimum horizontal foot-to-foot separation across all 8 frames is **147 px**; the legs never pass beneath the hip.
  4. **`FLAW-04` — Unregistered Scale & Baseline Jitter:** Character height fluctuates by **20 px** (`211 px` to `231 px`) and raw cell foot baseline shifts by **25 px**.
  5. **`FLAW-05` — Two-Tone Magenta Grid & Chroma Spill:** Combines `#FF00FF` dividers with `#FD49FD` cell fills and JPEG 8×8 DCT fringe spill.

### 5 & 6. Algorithmic Articulated Sprite Engine & TypeScript Web App
- Modules: `src/runner/` (`body-proportions.ts`, `two-bone-ik.ts`, `gait.ts`, `shapes.ts`, `rasterizer.ts`, `palette.ts`) and `src/app/`
- Generates a **15-part articulated rig** (`farUpperArm`, `farForearm`, `farHand`, `farThigh`, `farShin`, `farFoot`, `pelvis`, `torso`, `head`, `nearThigh`, `nearShin`, `nearFoot`, `nearUpperArm`, `nearForearm`, `nearHand`) driven by an **analytical Law-of-Cosines Two-Bone IK solver** and a **contralateral alternating gait solver** ($\phi_L = (\phi_R + 0.5) \bmod 1$).

---

## Quick Start

```bash
# Run full asset pipeline (dedupe -> extract -> analyze -> generate-sheets)
npm run pipeline

# Run typecheck and Vitest suite (real image buffers, zero mocks)
npm run typecheck
npm test

# Start live web application on 0.0.0.0:3000
npm run dev
```

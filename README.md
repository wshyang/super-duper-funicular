# Procedural running sprite

A TypeScript project with three parts:

1. **Sprite extraction** (`src/pipeline/`, `npm run sprites:extract`). It reads the reference running
   sheet, finds the 8×6 grid, keys out the magenta background, cuts each sprite, registers all 48 frames
   on one canvas, and writes PNGs plus `manifest.json` to `public/sprites/running-cycle-8frame/`.
2. **Procedural runner** (`src/runner/`). A skeleton and gait model generate body, torso, arms, legs and
   shoes algorithmically, and render each frame with a pixel rasterizer. There are no pre-drawn poses.
3. **Web app** (`src/app/`, `npm run dev`). It plays the generated run, offers six colour variants, a
   skeleton overlay, speed and phase controls, and shows the extracted reference frames beside it.

Assessment of the reference sheet's flaws: [`docs/sprite-analysis.md`](docs/sprite-analysis.md).
Decisions: [`docs/ADDENDA.md`](docs/ADDENDA.md). Working agreement: [`CLAUDE.md`](CLAUDE.md).

## Source artwork

| File | Purpose |
| --- | --- |
| `src/images/reference/running-cycle-8frame-6variants.jpeg` | The only source image. 8 frames × 6 colours. |

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install pinned dependencies. |
| `npm run dev` | Dev server on `0.0.0.0:3000` (proxy host allowlisted). |
| `npm run build` | Typecheck, then production build to `dist/`. |
| `npm test` | Unit and integration tests (Vitest), including real-sheet tests. |
| `npm run sprites:extract` | Regenerate the cut-out frames and manifest. |
| `npm run images:dedupe` | Report pixel-identical images in `src/images` and `public/sprites`. Add `-- --apply` to delete redundant source copies. |
| `npm run runner:preview -- red` | Render the 8-phase contact sheet to `docs/runner-preview.png`. |

## Layout

```
src/images/        source artwork (meaningful names)
src/pipeline/      sheet extraction, keying, registration, hashing, dedupe (Node)
src/runner/        gait, IK, skeleton, painter, rasterizer, palettes (pure TypeScript)
src/app/           React app: components render, hooks drive state
scripts/           command-line entry points
public/sprites/    generated cut-outs, served at /sprites/...
docs/              addenda, analysis, provenance, preview image
```

## Limitations

- The app was verified with a typecheck, unit tests, a production build, an HTTP smoke test and
  rendered contact sheets. It was not run in a browser, because the sandbox cannot download one.
- The gait is an approximation tuned by eye; see `docs/sprite-analysis.md` and ADD-005.
- Deployment and SHIP-HATS files are deferred (ADD-007).

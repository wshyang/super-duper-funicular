# Funicular Motion Lab

A local-first sprite source and gait workbench built around the preserved `incorrect running sprites.jpeg` reference. Stage 1 (Greenfield/FDS discipline) is complete; the current Stage 2 implementation covers the deterministic source pipeline, quantitative diagnostics, a procedural Canvas 2D runner, and the first responsive studio surfaces. Full feature parity remains in progress.

## Run locally

Requirements: Node.js `>=22.12.0` and npm.

```bash
npm ci
npm run pipeline
npm run dev
```

Open the Vite URL printed in the terminal. The extraction command checks the pinned source SHA before writing 48 transparent frame PNGs plus `public/sprites/manifest.json`, `public/sprites/analysis.json`, and the generated `docs/SPRITE-FLAW-ANALYSIS.md` report. The original JPEG is never rewritten.

## Available surfaces

- **Motion studio:** continuous run, walk, and brisk-walk profiles; two procedural personas; six palette choices; phase playback/scrubbing; skeleton and onion-skin toggles; extracted-frame strip.
- **Source library:** preserved original sheet and detected grid/registration metadata.
- **Source analysis:** source-derived duplicate, half-cycle similarity, baseline/height, and lower-band proxy measurements, with methods and limitations.
- **Exports:** transparent eight-phase PNG sheet, typed settings/frame manifest, and a 16-phase × three-panel light/dark/skeleton audit PNG with its configuration manifest.

The procedural character is a stylized model, not a photoreal, clinical, or biomechanical simulation. The photographic cutout rig, reversible joint calibration, full-color SVG output, Playwright browser flow, and independent app-fidelity visual acceptance are not yet complete.

## Checks

```bash
npm run pipeline
npm run validate
npm audit
```

`validate` runs strict TypeScript, ESLint, Prettier, Vitest (including real-JPEG and deterministic-output checks), and a production Vite build. Visual and browser-level acceptance remain separate and are not implied by these checks.

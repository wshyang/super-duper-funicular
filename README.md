# Funicular Motion Lab

A TypeScript workbench for the running-sprite problem: **measure** why the supplied eight-frame
sheet fails, **synthesise** a replacement from an articulated rig at any continuous phase, and
**track** parity with the four sibling branches that implement the same product.

## Run

```bash
./dev.sh          # install → regenerate assets → gate → Vite on 0.0.0.0:3000
```

or, step by step:

```bash
npm ci
npm run pipeline   # dedupe + extract + analyse the real artwork
npm run validate   # typecheck + tests + production build
npm run dev
```

Node 20.19+ (developed on 22). No server, no database, no accounts.

## What is in the box

| Area | What it does |
| --- | --- |
| **Motion studio** | Live articulated runner, reference-frame comparison, playback with phase scrub and eight phase buttons, persona / colourway / motion switching that preserves phase, four gait sliders, skeleton / ground / onion-skin overlays |
| **Rig inspector** | Isolate any of the 17 parts, listed in painter order (far chain first) |
| **Source diagnostics** | The measured verdict on the original sheet: duplicate pose pairs, stance-side lock, foot separation, scale and baseline jitter |
| **Asset library** | All 48 extracted reference frames, six colourways, with a lightbox |
| **Parity ledger** | 23-capability union across five implementations, with the observed tip of each branch and an explicit acceptance note per row |
| **Exports** | A transparent 8-cell sprite sheet and a 16-phase × 3-panel audit sheet, both painted by the same scene the stage uses |

## Artwork

One source file, `src/images/source/runner-8frame-6-colorways-source.jpeg` (2528×1696,
sha256 `f9911423…07030`), byte-identical to the sheet used by every sibling branch.

The pipeline detects the grid **from pixels** (six rows × eight columns, 129 px header, 316×262
cells), keys the magenta backdrop with a **border-seeded flood fill** so the purple jersey survives,
and writes 48 RGBA PNGs with silhouette bounds, centroid pivot and duplicate flags — plus a measured
flaw report. Re-running it reproduces the committed output byte-for-byte.

## The engine

- 17 parts in a fixed painter order (`PART_ORDER`), far chain to near chain.
- Analytical **two-bone IK** with preserved segment lengths and a forward knee bias.
- An **articulated cervical neck** that counter-pitches against the trunk, so a forward-falling
  sprint posture keeps the gaze level.
- A **two-segment rolling shoe**: heel-strike → flat → heel-off → toe-off, with the stance sole
  placed exactly on the ground line instead of rotating through it.
- Three profiles: **run** (duty 0.38, flight), **brisk walk** (0.56), **walk** (0.62), the last two
  with double support and no flight.
- Two personas (Wei Ming, Mei Lin — fictional Singaporean adults) and six colourways.

## Honest limits

- **No photographic persona, no SVG vector output, no interactive joint calibration.** These are
  `Gap` rows in `docs/N_WAY_COMPARISON.md`, each with an exit criterion.
- **No browser E2E suite.** This sandbox has no browser runtime; `docs/VALIDATION.md` says so
  explicitly rather than implying coverage.
- **The Dockerfiles are statically gate-checked, not built here.**
- The visual audit sheet shows a far-arm occlusion and a shoe/shin overlap at some phases. They are
  recorded in `PLAN.md` and `docs/VALIDATION.md`, not hidden.

## Discipline

This repository adopts the harmonised GREENFIELD discipline in [`GREENFIELD.md`](./GREENFIELD.md),
with upstream copies preserved verbatim under `docs/greenfield/`. Read
[`CLAUDE.md`](./CLAUDE.md) first. The short version:

- decisions are written in `docs/ADDENDA.md` in the same change;
- every turn appends a learning entry to `docs/FDS.md`;
- the n-way ledger (`docs/N_WAY_COMPARISON.md`) is refreshed with `npm run branches:compare` and its
  matrix is enforced against `src/shared/parity.ts` by a test;
- the rules that matter are executed by `tests/discipline/greenfield-gate.test.ts`, not merely
  documented.

## Layout

```
src/images/source/   the single source artwork
src/pipeline/        grid detection, chroma key, dedupe, extraction, analysis
src/runner/          vec, IK, gait, pose, scene, painters
src/app/             React shell, hooks (decisions), components (rendering)
src/shared/          contracts, palettes, parity matrix
src/generated/       branch tip snapshots + history (written by branches:compare)
public/sprites/      extracted PNGs + manifest + analysis
tools/               pipeline, audit dump, branch compare
tests/               runner, pipeline, app smoke, discipline
docs/                FDS, addenda, ledger, validation, plan, prompts, provenance
```

# Stride Harmonised Lab

The n-way parity branch of `wshyang/super-duper-funicular`: forensic analysis of
the flawed `incorrect running sprites.jpeg` ("8-frame alternating gait" sheet
that repeats four poses twice) plus a procedural, articulated replacement runner
and a workbench to inspect, tune and export it.

## Discipline

- Coding discipline: [`GREENFIELD.md`](GREENFIELD.md) / [`FDS_BUILDER.md`](FDS_BUILDER.md)
  copied verbatim from [`wshyang/greenfield`](https://github.com/wshyang/greenfield)
  @ `8ba74027be5fad41e48cadde82cc0120d628b109`; project synthesis in [`CLAUDE.md`](CLAUDE.md)
  and its `CLAUDE-*.md` section files.
- Living spec: [`docs/FDS.md`](docs/FDS.md) · decisions: [`docs/ADDENDA.md`](docs/ADDENDA.md).
- **Live n-way parity ledger:** [`docs/N_WAY_COMPARISON.md`](docs/N_WAY_COMPARISON.md),
  refreshed by `npm run branches:compare` (7 rows incl. `main`; append-only history
  in `docs/BRANCH-HISTORY.json`). Final goal: feature parity across all branches.

## Quick start

```bash
npm install          # pinned deps (Node ≥ 20)
./dev.sh             # install → pipeline → validate → dev server on 0.0.0.0:3000
npm run validate     # typecheck + 66 tests + production build (the real gate)
npm run pipeline     # extract → analyse → filmstrips → audit sheets → svg (byte-reproducible)
npm run branches:compare
```

## What the pipeline produces (committed, reproducible)

| Path | Content |
|---|---|
| `public/sprites/extracted/` | 48 registered RGBA cutouts + `manifest.json` |
| `public/analysis/source-flaws.json` | FLAW-01..05 forensics + generated-cycle audit |
| `public/analysis/raw-cell-stats.json` | pre-registration cell measurements |
| `public/analysis/dedupe-report.json` | byte/dHash duplicate candidates (report-only) |
| `public/renders/` | filmstrips, 16-phase audit sheets (light/dark/joint) + label sidecar |
| `public/renders/svg/` | 8 SVG frames, 17 parts each, exact affine matrices |

## Workbench

Stage with skeleton/onion overlays · play/pause/step/scrub · speed · motion
(run / walk / brisk-walk) · persona (Wei Ming / Mei Lin) · eight-phase filmstrip
(click to scrub) · asset library (flawed source + extracted cutouts) · forensics
table · PNG exports (8-frame sheet, 16-phase audit).

## Honest scope

No database/backend (GREENFIELD §4–§5 dormant). Browser e2e deferred (ADD-006:
no Chromium downloadable in this sandbox). Photographic personas/rig deferred
(CROSS-011). Docker/SHIP-HATS contracts carried and tested statically; no daemon
build executed here. See [`docs/VALIDATION.md`](docs/VALIDATION.md).

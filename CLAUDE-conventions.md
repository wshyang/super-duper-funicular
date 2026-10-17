# CLAUDE-conventions.md — conventions, contracts, artefacts (GREENFIELD §6)

## Testids
`data-testid="{component-kebab}__{element-role}"`, authored with the element:

- `persona__option-mei-lin`, `motion__option-run`, `palette__option-red`
- `gait__cadence`, `playback__play-toggle`, `playback__phase-03`
- `overlay__skeleton`, `export__sprite-sheet`, `export__audit-sheet`
- `workspace-tabs__tab-inspector`, `inspector__part-nearShin`
- `gallery__frame-04`, `diagnostics__retry`, `lightbox__close`

Repeated rows share one testid and are scoped by index/text. The gate test fails
any `button`/`input`/`select`/`textarea` without one.

## Typed contracts
- `src/shared/types.ts` is the single definition of palettes, personas, motions,
  poses, scenes, manifests, analyses and branch tips. Pipeline, runner, app and
  tools all import from it.
- The sprite manifest and the analysis JSON are typed on both the writer
  (`src/pipeline/`) and the reader (`src/app/hooks/useSpriteData.ts`), so a field
  rename is a compile error rather than an empty panel.
- `src/shared/parity.ts` is the in-app capability matrix; the markdown ledger must
  agree with it (gate-enforced).

## Reproducible artefacts
- `npm run pipeline` regenerates `public/sprites/**`, `src/images/manifest.json`
  and `docs/SPRITE_FLAW_ANALYSIS.md` deterministically.
- `npm run branches:compare` regenerates `src/generated/branch-tips.json` and its
  history; commit the result.
- Never hand-edit a generated file; change the generator.

## Copy and naming
- User-facing labels describe the domain ("Brisk walk", "Double support"), never
  internal design vocabulary ("CROSS-07", "branch 917").
- Internal identifiers (addenda ids, cross-branch adoptions) stay in docs.
- External keys keep the external system's spelling and casing.

## No magic numbers
Tuned values are named constants with units: `FOOT.heelStrikeRad`,
`DUPLICATE_IOU = 0.9`, `NEAR_DUPLICATE_IOU = 0.78`, `CANVAS.groundY`. A number
that changes behaviour gets a test.

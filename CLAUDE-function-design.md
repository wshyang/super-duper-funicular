# CLAUDE-function-design.md — function and module design (GREENFIELD §7)

## 7.1 Size
- Target **≤ 20 lines** per function body; **hard limit 50** (gate-enforced).
- One level of abstraction per function: orchestration calls named steps.

## 7.2 Control flow
- Guard clauses first; no `if/if` happy paths.
- Maximum nesting **3**; beyond that, extract.

## 7.3 Parameters
- **≤ 3 parameters**. Beyond three, a typed parameter object
  (`solveTwoBone(request: TwoBoneRequest)`).
- **No boolean flags.** Split the function (`renderSpriteSheet`,
  `renderAuditSheet`) or pass a mode union.
- Preserve whole objects; do not explode a domain object into scalars.

## 7.4 Mutation
- Domain state is immutable; return new objects.
- Explicit, contained exceptions at the I/O boundary: `Uint8ClampedArray` pixel
  buffers inside `paint-raster.ts`, canvas contexts inside `paint-canvas.ts`,
  animation refs inside `useAnimationClock.ts`. Each is named and local; none
  leaks into gait, IK or pose maths.
- Separate Query from Modifier: `solvePose` computes, `useStageCanvas` paints.

## 7.5 Frontend: a component renders, a hook decides
- Hooks (`src/app/hooks/`) own the animation clock, asset loading with retry,
  reference-frame selection, derived pose information and exports.
- Components (`src/app/components/`) destructure hook results and render markup.
- No `fetch`, no `node:` import, no dataset iteration and no formatting maths
  inside `return (...)`.
- Inline handlers are wiring only (`onClick={() => onSelect('all')}`); anything
  with a branch or a computation is named above the return.
- Exports live in `src/app/lib/export-sheets.ts`; the hook only orchestrates.

## 7.6 Modules
- Domains: `shared/`, `pipeline/`, `runner/`, `app/`, `generated/`.
- Files ≤ 400 lines typical, **800 hard**. Split with a barrel re-export to avoid
  call-site churn.
- No circular dependencies between peer domains; `runner` never imports `app`.

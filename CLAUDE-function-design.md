# GREENFIELD §7 — function design and module structure

## Function rules (merge gates)

- **≤ 20 lines** per function body as a target, **50 lines hard limit**.
- **Maximum nesting depth 3.** Beyond that, extract.
- **≤ 3 parameters.** Beyond that, pass a parameter object (`decompose(sample, body)`, not
  `decompose(hip, knee, ankle, angle, scale)`).
- **No boolean flag parameters.** `paintScene(ctx, scene, view, { drawOutline })` is an options object,
  not `paintScene(ctx, scene, view, true)`.
- **No mutation of inputs.** The store produces a new settings object; the pipeline returns new buffers.
- **Separate query from modifier.** `advanceTrail(state, ...)` returns the next state; it does not also
  draw. `paintScene(...)` draws and returns nothing.
- **Names reveal intent.** `stanceHalfReach`, `estimateCoverage`, `isKeyBlend`, `footContactY`.
  Booleans read as `is*`/`has*`/`can*`.

## Module rules

- One concern per file; the file name is the contract.
- **800 LOC hard limit**; 400 LOC is the working target. Current largest file is
  `src/lib/rig/parts.ts` at roughly 500 lines, which is the next extraction candidate (split per part).
- No circular imports between peer domains. `render` may import `rig` and `gait`; `rig` may not import
  `render`.

## The component / "hook" split, adapted

GREENFIELD's React rule is *a component renders, a hook decides*. This project uses plain DOM, so the
equivalent is:

| Layer | Owns | Files |
| --- | --- | --- |
| View/component | DOM structure, classes, event wiring, canvas painting | `src/app/components/*.ts` |
| Model/state | Any computation, clamping, derived values | `src/app/state/*.ts`, `src/app/model/*.ts` |
| Engine | Pure geometry, gait, rig, pipeline | `src/lib/**` |

- A component may not contain domain maths. `metrics.ts` formats values that `resolveGait` produced; it
  does not compute a gait.
- A component receives a `SettingsStore` and calls `update`, never mutates shared state directly.
- The canvas renderer (`stage.ts`) may paint, but the pose comes from `solvePose` and the scene from
  `composeRunner` — no geometry is written inside the painter.

## Code smell → remedy

| Smell | Remedy used here |
| --- | --- |
| Long function (the first `paintScene`) | Extracted `tracePolygon`, `paintGround`, `paintPath` |
| Boolean parameter (`drawOutline`) | Kept as an options object, defaulted once |
| Duplicated limb drawing | `lowerBodyCommands` / `armCommands` shared by both sides |
| Magic numbers in the renderer | `OUTLINE_WIDTH` in `render/scene.ts`; body metrics in `rig/body.ts` |
| God module risk (`parts.ts`) | Tracked; split per part when it crosses 600 lines |
| Derivation inside the render loop | Gait resolved once per frame from the store, not per shape |

## Practical impact

- Reviewers reject a function over 50 lines or with a fourth positional parameter.
- When adding a part, add a builder in `rig/parts.ts` and register it in `buildAllParts()`; do not add
  geometry inside the renderer.

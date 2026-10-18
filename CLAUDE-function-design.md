# CLAUDE-function-design.md — sizes, guards, modules (§7)

Authority: `GREENFIELD.md §7` (verbatim upstream copy at repo root), including the
Fowler smell→remedy table and the "component renders, a hook decides" rule.

## Project mapping of the component/hook rule (vanilla TS)

- `src/app/views/**` = the *component* half: builds DOM, binds events, paints the
  canvas. **No** business logic, no `.filter/.reduce/.sort/.find/.some/.every`
  over domain data inside a render path, no inline `new Date()/.toFixed()/JSON.parse`;
  compute derivations in the model and hand them over.
- `src/app/model/**` = the *hook* half: pure TS modules (view models, playback
  state machine, export builders) with their co-located `*.test.ts`. A view must
  not import from `src/lib/pipeline` or compute poses; `grep -c "lib/gait" src/app/views/*`
  must be `0` (gait is reached only through the model).
- **Move bodies, don't rewrite them:** extractions must be diff-verifiable with
  whitespace normalised; anything not byte-identical is a behaviour change.

## Sizes and shapes (merge gate)

- Function body ≤20 lines target, **50 hard**; comment-needed block ⇒ extract.
- Guard clauses; nesting ≤3; ≤3 params then Parameter Object; no boolean flag
  params (split into two named functions); Preserve Whole Object.
- Never mutate domain state in place; Separate Query from Modifier.
- **Declared mutation exceptions** (adopted from Stride Lab PR #2): Canvas2D
  contexts, `Uint8ClampedArray` raster buffers and `requestAnimationFrame` refs
  at the render/I/O boundary. Gait/geometry/pipeline maths stay pure.
- Files ≤400 LOC typical, **800 hard**; barrel-split god modules
  (`index.ts` re-export) with zero call-site churn.
- Group by domain, not by type; no circular imports between peer domains;
  file names are the contract.

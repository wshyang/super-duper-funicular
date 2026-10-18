# CLAUDE-function-design.md — Function Design & Module Structure (§7)

Adopted from `wshyang/greenfield` `GREENFIELD.md §7` (full reference table of smells → remedies lives there).

### Function size and extraction
- **≤ 20 lines** target per function body; **50 lines hard limit** (mechanically gated once the stack lands).
- If a block needs a comment to explain it, extract the block as a named function.
- One function = one thing at one level of abstraction. Orchestration code never mixes with pixel-level implementation detail.

### Guard clauses over nesting
- Exit early; never nest `if/if` for the happy path; max nesting depth **3**.

### Parameter discipline
- **≤ 3 parameters**; beyond that, introduce a typed Parameter Object (the siblings' `SegmentWarpSpec` / `PhotorealAssetTuningSpec` pattern is the house style).
- **No boolean flag parameters** — split into two named functions.
- Preserve Whole Object: pass the domain object, not extracted fields.

### Naming & mutation
- Names reveal intent; booleans take `is`/`has`/`should`/`can` prefixes; no abbreviations in domain code.
- **Never mutate domain state in place.** Low-level `Uint8ClampedArray` pixel buffers and Canvas 2D contexts are the sanctioned exception, encapsulated inside dedicated rendering/raster boundary functions; all gait/IK/cutter/conformance math is 100% pure.
- Separate Query from Modifier: a function returns a value OR has a side effect, never both.

### Frontend: a component renders, a hook decides
- The hook owns anything touching the API/asset layer, computation over server data, and fetching effects; the component owns layout/JSX, view-only state, and event wiring. `grep -c "lib/api" <Component>.tsx` must be `0`.
- **Presentation-only JSX interior:** no `.filter()`/`.reduce()`/`.sort()`/`.find()`/`.some()`/`.every()`, no inline `new Date()`/`.toFixed()`/`JSON.parse` inside `return (...)`; compute derivations once, above the return, as named bindings.

### Module & directory structure
- Group by domain feature (`pipeline/`, `runner/`, `app/`, `discipline/`), not by generic type layer.
- Files ≤ 400 LOC typical, **800 LOC hard limit**; split god modules with the barrel pattern (`export * from './sub/index.ts'`), zero call-site churn.
- No circular dependencies between peer modules; file names are the contract.

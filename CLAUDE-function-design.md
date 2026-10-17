# CLAUDE-function-design.md — Function Design & Module Structure (§7)

Adopted from `wshyang/greenfield` `GREENFIELD.md §7`.

Decide these rules **before the first line of application code ships**; retrofitting them into an existing codebase is expensive.

## 7.1 Function Size & Extraction

- **≤ 20 lines** target per function body; **50 lines hard limit** (enforced by `src/discipline/greenfield-gate.test.ts` AST/line scanner).
- If you need a comment to explain a block, extract the block as a named function.
- A function does one thing at one level of abstraction — no orchestration mixed with implementation detail inside one function.

## 7.2 Guard Clauses Over Nesting

- Exit early with guard clauses at the top; never nest `if/if` for the happy path.
- Maximum nesting depth: **3 levels**. Beyond that, extract.
- Booleans read as `is*`/`has*`/`can*`/`should*`.

## 7.3 Parameter Discipline

- **≤ 3 parameters**. Beyond 3, introduce a Parameter Object (`interface` with named fields).
- **No boolean/flag parameters** — split into two named functions or pass an explicit mode/options union object.
- Preserve Whole Object: pass the domain object, not extracted fields.
- Examples: `decompose(sample, body)` not `decompose(hip,knee,ankle,angle,scale)`; `paintScene(ctx,{scene,view,options})` not `paintScene(ctx,scene,view,true)`.

## 7.4 Immutability & Query/Modifier Separation

- **Never mutate domain state in place** — always produce a new object (`{ ...old, field: value }`) and return it.
- Low-level `Uint8ClampedArray` pixel buffers are encapsulated inside dedicated raster builder functions (`src/pipeline/*`, `src/lib/photo/*`) that return new buffers.
- **Separate Query from Modifier:** A function either returns a derived value (`solvePose`, `evaluateGait`, `measureIoU`) OR performs I/O/DOM side effects (`paintScene`, `writeManifest`) — never both.
- Mutable store state (`useWorkbench`, `useMotionSettings`) lives behind a reducer/store boundary; components call `update()`, never mutate shared state directly.

## 7.5 Frontend: A Component Renders, A Hook Decides

- **Hooks (`src/app/hooks/use*.ts`)** own state transitions, animation loop timing, manifest fetching, derivation, and validation. Each ships with `use*.test.ts` via `renderHook`.
- **Components (`src/app/components/*.tsx`)** destructure hook state and render markup — pure presentation interiors.
- **Presentation-only JSX interior:** Inside `return (...)`, never call `.filter()`, `.reduce()`, `.sort()`, `.find()`, `.some()`, `.every()`, `new Date()`, `.toFixed()`, or `JSON.parse()`. Compute formatted strings and filtered lists **above** `return (` or inside the hook.
- Inline event handlers are wiring only: `onClick={() => onSelect(item.id)}`.
- No circular imports between peer domains; `render` may import `rig`/`gait`, `rig` may not import `render`.

## 7.6 Module & Directory Structure

- **Group by domain, not by type:** `src/shared/` (types), `src/pipeline/` (sheet detection, chroma-key, matte, cutter, vectorizer), `src/runner/` + `src/lib/` (gait, IK, foot-roll, rig, personas), `src/app/` (hooks, components, views, loop), `src/discipline/` (gate), `scripts/` & `tools/` (CLI entry points), `public/sprites/` (committed derived assets), `docs/` (FDS, ADDENDA, VALIDATION, analysis).
- Files **≤ 400 LOC** typical; **800 LOC hard limit** (enforced). Barrel-split god modules via per-part files (`src/lib/rig/parts/*.ts`, `src/runner/shapes/*.ts`) before they cross 600 lines.
- One concern per file; filename is the contract.

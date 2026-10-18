# CLAUDE-function-design.md — Function Design & Module Structure (§7)

Adopted from `wshyang/greenfield` `GREENFIELD.md §7`.

## 7.1 Function Size & Extraction
- **≤ 20 lines** target per function body; **50 lines hard limit** (enforced by `src/discipline/greenfield-gate.test.ts`).
- Each function does one thing at one level of abstraction.

## 7.2 Guard Clauses Over Nesting
- Exit early with guard clauses at the top of functions.
- Maximum nesting depth: **3 levels**.

## 7.3 Parameter Discipline
- **≤ 3 parameters** per function. For 4+ values, pass a typed Parameter Object (`interface`).
- **No boolean flag parameters** — split into two explicitly named functions or pass an options/mode union object.

## 7.4 Immutability & Query/Modifier Separation
- Never mutate input objects in place; return new objects/arrays. (Low-level `Uint8ClampedArray` pixel buffers are encapsulated inside dedicated raster builder functions.)
- Functions either compute and return a value (Query) or perform an I/O / DOM side effect (Modifier).

## 7.5 Frontend: A Component Renders, A Hook Decides
- Hooks (`src/app/hooks/use*.ts`) own state transitions, animation loop timing, manifest loading, and derived view models.
- Components (`src/app/components/*.tsx`) destructure hook state and render markup.
- **Presentation-only JSX interior:** Inside `return (...)`, never call `.filter()`, `.reduce()`, `.sort()`, `.find()`, `.some()`, `.every()`, `new Date()`, `.toFixed()`, or `JSON.parse()`. Compute formatted strings and filtered lists above `return (` or inside the hook.
- Inline event handlers in JSX are wiring only (`onClick={() => onSelect(item.id)}`).

## 7.6 Module & Directory Structure
- Grouped by domain: `src/shared/`, `src/pipeline/`, `src/runner/`, `src/app/`, `src/discipline/`.
- Files **≤ 400 LOC** typical; **800 LOC hard limit**.

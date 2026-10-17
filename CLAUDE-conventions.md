# CLAUDE-conventions.md — Code Conventions & Wire Contracts (§6)

Adopted from `wshyang/greenfield` `GREENFIELD.md §6`.

## 6. Code Conventions That Prevent Whole Classes of Bugs

### `data-testid` Stable Contract

- **Every interactive element** (`<button>`, `<input>`, `<select>`, `<a>`, canvas controls, inspector toggles) carries `data-testid="{component-kebab}__{element-role}"` at authoring time. No retrofitting.
- Naming: `{component-kebab}` = file/component in kebab-case (`runner-controls`, `joint-audit-panel`, `variant-picker`); `{element-role}` = action/target in kebab-case (`play-toggle`, `export-audit-png`, `option-red`).
- Repeated rows share one `testid`; scope by anchor text first.
- Automated check: `src/discipline/greenfield-gate.test.ts` scans `src/app/components/**/*.tsx` for missing `data-testid`.

### Stable, Typed Wire Contracts

- `src/shared/types.ts` defines manifest shapes, flaw-report types, gait parameters, skeleton/pose types, persona contracts, and SVG stitcher types **once** and exports them to `src/pipeline/`, `src/runner/`, `src/lib/`, and `src/app/`.
- A field rename is a compile error, not a runtime `undefined` that silently breaks a test or page helper.
- Preserve third-party/external contract keys exactly as demanded (e.g., `generate_image` reference `images` array, SHIP-HATS `@@SHIPHATS_*@@` placeholders, external payload keys) — not everything is yours to rename.

### Copy & Documentation Rules

- **User-facing copy stays user-facing:** Labels describe domain concepts (stance duty, leg crossover, hip bounce, magenta threshold, silhouette IoU) without leaking internal addendum IDs, gate internals, or design rationale into UI labels.
- **Internals stay internal:** Rationale, "why this is done this way," and anti-pattern register entries live in code comments, `docs/FDS.md`, and `docs/ADDENDA.md`, never as user-facing feature descriptions. Scrub `ADD-NNN` / `CROSS-NN` slugs from shipped copy.
- **Pure-TS PNG/JPEG output only:** No generated code comments claiming native addon use. Generated PNGs carry standard `tEXt` provenance where useful.


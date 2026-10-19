# CLAUDE-conventions.md — Code Conventions & Wire Contracts (§6)

Adopted from `wshyang/greenfield` `GREENFIELD.md §6`.

## 6. Code Conventions That Prevent Whole Classes of Bugs

- **`data-testid` on Every Interactive Element:** Every `<button>`, `<input>`, `<select>`, and interactive control carries `data-testid="{component-kebab}__{element-role}"` (e.g. `runner-controls__play-toggle`, `variant-picker__option-red`, `workspace-tabs__tab-stage`).
- **Stable, Typed Contracts:** `src/shared/types.ts` defines the manifest, flaw report, gait parameter, and skeleton types once and exports them to both `src/pipeline/`, `src/runner/`, and `src/app/`.
- **Clean User-Facing Copy:** User-facing labels describe domain concepts clearly (biomechanical gait phases, joint angles, chroma-key thresholds, silhouette IoU) without leaking internal addendum IDs or developer shorthand into UI labels.

# CLAUDE-conventions.md — Code Conventions That Prevent Whole Classes of Bugs (§6)

Adopted from `wshyang/greenfield` `GREENFIELD.md §6`.

- **`data-testid` on every interactive element** at authoring time, named `{component-kebab}__{element-role}` (e.g. `joint-audit__retry-assets`). Repeated rows share one testid, scoped by anchor text.
- **Stable, typed wire contracts** between pipeline CLIs, manifests, and the app: define response/manifest shapes once in shared typed modules; both sides compile against them.
- **Don't show internal design decisions to end users.** Rationale and "why" notes live in code comments and `docs/`; internal slugs (`#feat-*`, `ADD-NNN`, `TURN-LNN`, `IMG-ERR-*`) never appear in user-facing labels or shipped copy.
- **Keep external contract keys exactly as the external system requires** (e.g. platform image-tool parameter names), even when they don't match internal casing. Not everything is ours to rename.
- **Magic numbers are a defect.** Every pixel constant in a cutter/warper/compositor (pivot coordinates, cuff windows, baseline offsets) must be either (a) derived from a measured persona/calibration record at runtime, or (b) a named constant with a comment stating its measured provenance. The sibling branches' recurring regressions (`anklePivot.y` 76→82, `cuffTopY` windows, torso window shifts) are the anti-pattern this rule exists to prevent. See `ADD-008`.

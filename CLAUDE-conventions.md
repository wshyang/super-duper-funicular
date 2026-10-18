# CLAUDE-conventions.md — wire/asset contracts & copy (§6)

Authority: `GREENFIELD.md §6` (verbatim upstream copy at repo root).

- **`data-testid` on every interactive element** at authoring time,
  `{component-kebab}__{element-role}` (e.g. `runner-controls__play-toggle`,
  `filmstrip__frame`). Repeated rows (filmstrip cells, library entries) share one
  testid and are scoped by anchor text/label in tests. Gaps defeat the contract.
- **Typed contracts defined once.** Asset manifests, analysis reports and render
  settings are typed in `src/shared/types.ts`; the browser views, the Node tools
  and the tests all consume the same types, so a field rename is a compile
  error, not a runtime `undefined`.
- **Manifest discipline** (adopted from ce6d2a6e): every generated asset set has
  a `manifest.json` mapping logical ids → URLs, SHA-256, bounds and pivot, so
  playback, exports and tests agree on geometry instead of re-deriving it.
- **User-facing copy stays user-facing.** Rationale, flaw codes (`FLAW-01`),
  addenda ids and design references live in comments/docs, never in shipped
  labels. Scrub internal slugs from UI strings.
- **External keys are not ours to rename:** palette names from the source sheet
  (crimson, cobalt, leaf, sunshine, violet, tangerine) and the source JPEG's own
  header text are preserved verbatim in manifests and comparisons.

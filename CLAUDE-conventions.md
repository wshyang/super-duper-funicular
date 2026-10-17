## 6. Code conventions that prevent whole classes of bugs

- **`data-testid` on every interactive element** at authoring time, with a
  documented naming convention (`{component-kebab}__{element-role}`). Repeated
  rows share one testid; scope by anchor text first. This makes testids a
  stable contract the unit and e2e suites rely on — gaps defeat the point.
- **Stable, typed wire contracts** between backend and frontend — define the
  response shapes once and type both sides from them, so a field rename is a
  compile error, not a runtime `undefined` that silently breaks a test or a
  page. (We hit a demo-video outage purely from a wire-field rename that the
  test helper still read under the old name.)
- **Don't show internal design decisions to end users.** Keep rationale and
  "why this is done this way" notes in code comments and docs, never in
  user-facing labels or descriptions. Scrub internal slugs / design references
  from shipped copy.
- **Keep user-facing copy user-facing, internals internal** — and keep third-
  party/external contract keys exactly as the external system requires,
  even when they don't match your internal casing. Not everything is yours to
  rename (external payload keys, notification-template placeholders).


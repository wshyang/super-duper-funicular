# CLAUDE-testing.md — tests first, real inputs (§2–§3)

Authority: `GREENFIELD.md §2–§3` (verbatim upstream copy at repo root).

## 2. Real tests, no mocks where it counts

- **Vitest** suites live in `tests/` grouped by domain
  (`tests/geometry`, `tests/gait`, `tests/pipeline`, `tests/analysis`,
  `tests/render`, `tests/vector`, `tests/app`, `tests/discipline`).
- The data-access layer of this repo is the **source artwork and the raster**:
  - sheet tests decode the real committed JPEG with `jpeg-js` (grid detection,
    chroma key, connected components, registration);
  - render tests rasterise with the real pure-TS raster and assert pixel facts
    (support contact, silhouette IoU, alpha coverage, no magenta residue);
  - manifest/asset tests read the real files under `public/`.
  Mocking any of these would hide exactly the drift, fringing and duplication
  this project exists to measure.
- **Positive + negative per behaviour:** every acceptance has a counterpart
  failure test (e.g. IK rejects unreachable targets; extraction rejects a sheet
  with a wrong row count; a non-session persona id is refused).
- **Tests land with the code**, same commit; write the failing test first when
  porting a fix (fail → pass observed, then reported).

## 3. Isolation, determinism, fixtures

- Deterministic fixtures: named personas (Wei Ming, Mei Lin), fixed palettes,
  fixed phase grids (`φ = k/8`, audit `k/16`); no wall-clock, no randomness in
  asserted paths.
- Unique-per-run identifiers only for scratch evidence (`/tmp/stride-audit-<run>/`),
  never for committed artefacts (committed artefacts must be byte-reproducible).
- Test DB rules do not apply (no DB); if one appears, `CLAUDE-database.md`
  activates with a separate test DB.
- Layout by type is decided: `tests/**` mirrors `src/lib/**` domains; app-model
  tests beside models is allowed only for pure modules (`*.test.ts` co-located
  under `src/app/model/`, adopted from ce6d2a6e).

## Deferred: browser e2e (ADD-006)

Playwright config and specs are **not** committed while no browser binary is
downloadable in this sandbox; the HTTP smoke test (dev server serves `/` and the
manifest) plus model-level tests stand in, labelled as such. Exit criterion for
activation: a Chromium binary installable from an allowed registry mirror; then
video-on by default with a single `E2E_VIDEO=off` switch.

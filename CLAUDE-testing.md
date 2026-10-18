# CLAUDE-testing.md — Real Tests & Determinism (§2–§3)

Adopted from `GREENFIELD.md §2–§3`.

## 2.1 What must be tested without mocks

- **Geometry:** two-bone IK reach, clamping, and contralateral phase symmetry.
- **Foot roll:** heel→ball→toe contact ordering and ground clamping.
- **Raster:** PNG decode/encode round-trips, distance-field capsule coverage,
  alpha compositing.
- **Gates:** silhouette IoU, connected-component island counting, chroma-spill
  detection, ground-line delta, and temporal-jitter measures — each tested on
  synthetic rasters with known answers *and* on real pipeline output.
- **CLI:** the control-plate emitter and the acceptance gate run end-to-end on a
  temporary directory and write a manifest that validates against its schema.

A mocked solver proves the mock. The failure modes this project cares about —
a limb 3 px short, a foot 6 px below the ground line, a silhouette that drifts
2 px between adjacent phases — are precisely the ones a mock hides.

## 2.2 Positive and negative coverage

Every validator carries both directions:

- A reachable IK target produces the exact segment lengths; an unreachable one
  clamps at `upper + lower - epsilon` and reports `isClamped`.
- A correct silhouette passes the IoU gate; a silhouette translated by 12 px
  fails it.
- A clean cutout reports zero islands; a raster with a 2 px speck reports one.

## 2.3 Determinism

- No `Date.now()`, `Math.random()`, locale formatting, or filesystem ordering
  inside pure functions. Time and randomness enter at the CLI boundary and are
  passed in.
- Raster output is compared by pixel digest, not by eyeball, inside tests.
- Fixtures are committed and small; large regenerable artefacts live under
  `out/` and are never required by a test.

## 2.4 Test layout

Co-locate tests with the module they test (`src/rig/gait.test.ts` beside
`src/rig/gait.ts`). Integration tests that walk the whole pipeline live at
`test/pipeline.test.ts`. Do not create a parallel `__tests__` tree.

## 2.5 The gate test

`src/discipline/greenfield-gate.test.ts` mechanically enforces the rules that
are otherwise only prose:

- every source file is ≤ 800 lines;
- every named function is ≤ 50 lines;
- no file under `src/` contains banned non-deterministic calls in pure modules;
- the required specification documents exist and are non-empty.

The gate is a test, not a convention. A rule that is not executable will be
broken within a week.

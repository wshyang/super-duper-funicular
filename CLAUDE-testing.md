# CLAUDE-testing.md — real tests and test infrastructure (GREENFIELD §2–§3)

## 2. Write tests first, and keep them real

- **Same change, not a follow-up.** A feature without its test is unfinished.
- **Real inputs.** The pipeline suite decodes the committed JPEG, keys real
  magenta pixels, and measures real silhouettes. The runner suite solves the real
  IK/gait and paints through the real software rasteriser. The discipline suite
  walks the real filesystem. Nothing is mocked that could hide a defect.
- **Observed failing first.** When adding a test, run it before the code exists
  (or against the broken version) and record the failure. A test that never
  failed is unproven.
- **Positive **and** adversarial negative cases** for every capability:
  - unreachable and too-close IK targets clamp without detaching;
  - a physical phase outside `[0, 1)` normalises instead of exploding;
  - a magenta-bordered synthetic sheet is detected while JPEG noise is tolerated;
  - a missing manifest/analysis surfaces a retryable error and blocks exports;
  - a single missing part cannot produce an incomplete sheet.
- **No mocks where it counts**: decoding, chroma keying, connected-component
  measurement, inverse kinematics, gait timing and the rasteriser are exercised
  for real.

## 3. Layout and determinism

| Suite | Location | Contents |
| --- | --- | --- |
| Runner | `tests/runner/` | vec, IK, gait timing/contacts, pose invariants, scene structure, raster determinism |
| Pipeline | `tests/pipeline/` | codecs, hashes, grid detection (synthetic + real), chroma key, silhouettes, real-sheet flaw analysis |
| Discipline | `tests/discipline/` | the GREENFIELD gate: sizes, JSX purity, testids, container, inert pipeline, docs, ledger sync |

- Deterministic by construction: pure functions, seeded/none, byte-comparable
  raster output, fixed fixture phases.
- Generated artefacts (`public/sprites/**`) are reproducible; a test asserts the
  real sheet yields the same 6×8 grid and 48 frames every run.
- Browser/E2E is not claimed in this repository: the sandbox has no browser
  runtime. The in-app export path is covered by the shared painter and by the
  deterministic rasteriser, and `docs/VALIDATION.md` says exactly that.
- If Playwright is added later: video on by default with `E2E_VIDEO=off`, and the
  discipline gate extended to require it.

## Discipline gate (executed, not admired)

`tests/discipline/greenfield-gate.test.ts` fails the build when:

- a source file exceeds 800 lines (or the 400-line target);
- a function body exceeds 50 lines;
- JSX interiors contain `filter/reduce/sort/find/some/every/toFixed/parse`,
  `new Date(` or `JSON.parse`;
- a `button`, `input`, `select` or `textarea` lacks `data-testid`;
- a component imports a `node:` module;
- the Dockerfiles drift from the port/user/proxy contract;
- SHIP-HATS files lose their placeholders or the activation script stops being
  Bash 3.2 compatible;
- a documented discipline file is missing;
- a capability in the in-app parity matrix is missing from the ledger, or the
  ledger's branch list drifts from `src/generated/branch-tips.json`;
- the FDS has no turn-learning entry.

# GREENFIELD §2–§3 — tests first, real inputs, determinism

**The rule.** Every behaviour ships with a test in the same change. Where a test *can* exercise the real
thing, it does — a mocked image pipeline would hide precisely the failures this repository exists to fix
(JPEG fringing, grid drift, frames that never touch the ground).

## What is real here

| Suite | Runs against |
| --- | --- |
| `tests/pipeline.test.ts` | the actual 2528×1696 JPEG, decoded with `jpeg-js` |
| `tests/analysis.test.ts` | landmark extraction over all 48 real frames |
| `tests/rig.test.ts` | the real pose model and the real painter scene graph |
| `tests/gait.test.ts` | the real gait solver, 240 samples per cycle |
| `tests/ik.test.ts`, `tests/geometry.test.ts` | pure functions, no fixtures needed |
| `tests/app.test.ts` | the real settings store and stage model |

**No mocks of the data path.** `detectSheet`, `cutCell`, `landmarksFromSheet` are never stubbed. If the
grid detector regresses, the suite fails with the real cell count (expected 6×8).

## Determinism

- The source artwork is committed at a fixed path; hashes are stable.
- Analysis output is written to `src/generated/` and re-derived by `npm run sprites:analyse`. Running it
  twice must produce identical bytes.
- No random seeds, no timestamps, no network access in tests.

## Test layout by type

```
tests/geometry.test.ts   vectors and polygons
tests/ik.test.ts         two-bone analytic IK
tests/gait.test.ts       gait timing, contact, alternation, joint limits
tests/rig.test.ts        body metrics, parts, scene order, palettes
tests/pipeline.test.ts   sheet detection, keying, cut-outs, signatures
tests/analysis.test.ts   reference findings vs generated output
tests/app.test.ts        store immutability, clamping, trail model
```

## Video / browser e2e

Not adopted: the app has no server state and no navigation. The browser-only surface (canvas painting) is
covered by rendering the **same painter** to a real `@napi-rs/canvas` surface in
`tools/render-preview.ts`, and by asserting the scene graph in `tests/rig.test.ts`. This is a stated
substitute, not a claim that a browser test ran (see `CLAUDE-validation.md`).

## Practical impact

- Add a test next to the code it exercises, in the matching file.
- A test that needs a browser is the wrong test here; render the painter instead.
- If you add a new source image, add it under `src/images/source/` and extend the fixture path in
  `tests/pipeline.test.ts` — do not copy frames into the fixtures folder.

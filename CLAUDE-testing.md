# Testing discipline

Tests ship with the behavior they protect. Write or update the acceptance test before implementation where practical, observe the expected failure for a new behavior, then implement and rerun the complete affected gate.

## Test layers

1. **Pure domain tests:** phase math, gait constraints, IK lengths, geometry, hashes, and analysis metrics. Use deterministic inputs and no mocks.
2. **Real-asset pipeline tests:** decode the committed JPEG and actual derived images; exercise grid detection, keying/despill, deduplication, registration, manifests, alpha/bounds, and reproducible generation. Do not stub the extraction path or substitute a synthetic sheet for the only real-source regression test.
3. **Renderer tests:** use the actual render/composition code. Assert invariants numerically, then visually inspect output where pixels, seams, or contact matter.
4. **Browser end-to-end tests:** drive the real workbench and assets. Avoid mocks for the canvas, manifest, or asset-loading path under test. Cover normal controls, exports, asset failure/retry, responsive layout, and reduced-motion behavior.

Frontend tests may mock a well-defined API boundary if a backend is later introduced; they must not mock away the behavior being specified. A backend, if ever added, needs a separate real test database and valid-session wrong-resource (IDOR) negative test for every scoped route.

## Determinism and test data

- Use the exact source SHA and fixed fixture paths; record source and generated hashes.
- Seed any randomness and make dates/network access explicit; tests should not depend on the network.
- Run extraction/analysis twice and compare outputs byte-for-byte. Store large scratch images, screenshots, videos, and dumps in ignored/temp paths unless they are intentional deliverables.
- Keep tests grouped by domain and co-located or in a predictable `tests/{unit,integration,e2e}` layout.

## Browser/video policy

Record Playwright video by default because a failing interactive or visual flow must be diagnosable. Provide one documented opt-out, `E2E_VIDEO=off`. Use accessible roles/names first; stable `data-testid` selectors are a documented supplement, not a replacement for labels. A sandbox-specific browser fallback is allowed only if documented and its browser/version are recorded.

## Greenfield discipline tests

As the codebase grows, add an automated gate for stable project-wide invariants: TypeScript strictness, function/file-size limits where they can be measured reliably, `data-testid` coverage on interactive elements, lockfile/reproducibility checks, and required learning/comparison document sections. Keep the gate itself tested and avoid brittle text scans that reject harmless refactors.

## Current status

The Stage 2 package and test runner now exist. Run `npm run validate` for strict typecheck, lint, formatting, unit/real-JPEG tests, and production build. `npm run pipeline` regenerates the committed reference outputs. These checks do not replace browser flows, video capture, visual audit inspection, container smoke, or deployment; report each separately.

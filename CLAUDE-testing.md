# CLAUDE-testing.md — Real Tests & Test Infrastructure Discipline (§2–§3)

Adopted from `wshyang/greenfield` `GREENFIELD.md §2–§3`, bound to the sibling branches' Vitest 2 conventions.

## 2. Write Tests First, Keep Them Real (No Mocks Where It Counts)

- **Pipeline & biomechanics tests** run against the **real source assets** (the flawed reference sheet, generated keyframe plates, extracted PNGs) and the **real solvers** (2-bone IK, gait solver, cutters, warpers, conformance meters). Never mock image decoding, chroma-keying, connected-component labelling, or inverse kinematics.
- **Positive and negative coverage:** every validator/parser/solver suite includes positive cases (valid grid, reachable IK target, alternating gait symmetry) and negative/boundary cases (unreachable IK targets clamping, corrupt/non-magenta pixels, out-of-range phases, malformed manifests).
- **Add/update tests in the same change** as the code under test — never as a follow-up.
- **Discipline gate:** once the TS stack lands, `src/discipline/greenfield-gate.test.ts` mechanically verifies function-length (≤ 50 body lines), file-length (≤ 800 LOC), JSX-interior purity, `data-testid` coverage, and no-boolean-flag rules, mirroring the gate already running on PR `#1`/`#8`. Until then the rules are review-enforced (`CLAUDE-validation.md §8` states this honestly).

## 3. Test Infrastructure Defaults

- **Deterministic fixtures:** real committed assets with known hashes (`docs/artwork-inventory.json` pattern inherited from the siblings); no network access inside tests; no time-of-day dependence.
- **Layout by type:** `src/pipeline/` (image/sprite pipeline), `src/runner/` (biomechanics), `src/app/` (web workbench: `hooks/*.test.ts`, `components/*.test.tsx`), `src/discipline/` (gate tests). Tests live beside their modules.
- **Isolation:** every dump/audit CLI writes to caller-supplied temporary directories (`/tmp/...`), never into `src/` or `public/` silently; audit artifacts are **not committed** unless they are canonical evidence explicitly promoted by a docs change.
- **Visual output is part of the contract:** a passing suite is necessary but not sufficient — the full-cycle visual audit (`CLAUDE-validation.md §9`) is a mandatory additional gate for any rendering change.

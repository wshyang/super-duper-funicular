# CLAUDE-testing.md — Real Tests & Test Infrastructure Discipline (§2–§3)

Adopted from `wshyang/greenfield` `GREENFIELD.md §2–§3`.

## 2. Write Tests First, Keep Them Real (No Mocks Where It Counts)

- **Pipeline & Biomechanics Tests:** Run automated Vitest tests against the **real source sprite sheet** (`src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg`), the **real extracted PNG files** (`public/sprites/extracted/`), and the **real algorithmic gait & IK solver** (`src/runner/`). Never mock image decoding, chroma-keying, connected-component extraction, or inverse kinematics.
- **Positive and Negative Coverage:** Every validator, parser, and solver test suite includes both positive cases (valid grid, valid reachable IK target, alternating gait symmetry) and negative/boundary cases (unreachable IK target clamping, corrupt/non-magenta pixels, out-of-range phases).
- **Greenfield Discipline Gate Tests:** Automated tests in `src/discipline/greenfield-gate.test.ts` verify function length limits (≤ 50 lines), file length limits (≤ 800 lines), JSX interior purity, `data-testid` coverage, Dockerfile port/user contracts, and `activate-shiphats.sh` execution.

## 3. Test Layout & Determinism

- Co-located unit and integration tests alongside domain modules (`src/pipeline/*.test.ts`, `src/runner/*.test.ts`, `src/app/**/*.test.ts`, `src/discipline/*.test.ts`).
- Deterministic seeds and pure functions ensure repeatable pixel-identical outputs across test runs.

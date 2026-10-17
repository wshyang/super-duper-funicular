# CLAUDE-testing.md — Real Tests & Test Infrastructure Discipline (§2–§3)

Adopted from `wshyang/greenfield` `GREENFIELD.md §2–§3`.

## 2. Write Tests First, Keep Them Real (No Mocks Where It Counts)

**Tests catch bugs — decide the discipline before any feature ships.**

- **Real pipelines, real assets, no mocked data layer:** Run automated Vitest tests against the **real source sprite sheet** (`src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg`), **real extracted PNGs** (`public/sprites/extracted/` / `public/sprites/photo/**`), **real photorealistic plates** (`src/images/photo/**`), and **real algorithmic gait & IK solvers** (`src/runner/`, `src/lib/gait/`, `src/lib/rig/`). Never mock image decoding (`jpeg-js`, `pngjs`, `@napi-rs/canvas`), chroma-keying, grid detection, connected-component labelling, deduplication, or inverse kinematics.
- **Positive + negative + authorisation coverage:** Every route/surface/validator/solver suite includes positive cases (valid grid, reachable IK target, alternating gait symmetry, multi-profile double support) and negative/boundary cases (unreachable IK clamping, corrupt/non-magenta pixels, out-of-range phases, partial photoreal bank rejection, IDOR-style id substitution on any future API surface). A generic "no token → 401" is not enough; authorisation must prove wrong-party rejection.
- **Same-change rule:** Add/update tests **in the same change as the surface** — never as a follow-up.
- **Frontend vs E2E boundary:** Frontend unit tests may mock the `src/images/manifest.json` fetch boundary; E2E tests drive the real UI against the real backend/static host with no mocks (Playwright, video on).

## 3. Test Infrastructure Defaults (Video, Isolation, Determinism)

Merged from Branch 2's Playwright video-on + unique-per-run identifiers and Branch 1/3's discipline gates.

- **Playwright video on by default:** `playwright.config.ts` enables `video: 'on'` for every E2E suite; single env-var off-switch `E2E_VIDEO=off` disables it. Do not discover after a failure that the suite was blind.
- **Deterministic isolation:** Unique-per-run test identifiers (`{label}.{runId}@example.test`), self-contained provisioning, and a separate test artefact directory (`/tmp/gait-cycle-audit`, `reports/` gitignored except committed preview) so suites are repeatable and parallel-safe.
- **Realistic, deterministic fixtures:** Named personas (Wei Ming / Mei Lin for procedural, SG Chinese Female/Male photoreal), 6 canonical team palettes (`red`, `blue`, `green`, `yellow`, `purple`, `orange`), and fixed gait seeds so output reads naturally while remaining unique.
- **Test layout by type, decided on day one:**
  - `src/pipeline/*.test.ts` — dedupe, extraction, chroma-key, grid detection, matte, cutter
  - `src/runner/*.test.ts` + `src/lib/**` — IK, gait, foot-roll, pose, rig, persona
  - `src/app/**/*.test.ts` + `tests/frontend/unit/**` — view-model, articulation, end-cuts, audit layout
  - `tests/frontend/e2e/**` — workbench, cycle-audit, end-cutter, photo-runner (Playwright)
  - `src/discipline/greenfield-gate.test.ts` — ≤ 50 LOC fn, ≤ 800 LOC file, `data-testid`, Dockerfile, `activate-shiphats.sh`, prompt log, learning log, N-way ledger presence
- **No fuzzy-dedup deletions:** Perceptually similar poses are evidence of flaw, not candidates for deletion. Dedupe uses byte-SHA + pixel-SHA + `dHash64` and marks `status: 'deprecated'` rather than hard-deleting.

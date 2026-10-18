# Validation and evidence register

This log records work in the **current session branch only**. Peer PR claims are labelled reported, never counted as local validation. Detailed policy: [`CLAUDE-validation.md`](../CLAUDE-validation.md).

## 2026-10-17 — Stage 1 specification and discipline

### Repository and source evidence

- `git status --short --branch` — current branch was `arena/a7a66eb6-super-duper-funicular`, clean before Stage 1 edits; `HEAD` was `396ce256debcb5bdc2419cc0f3f399730b61ab36`.
- `git ls-tree` / `find` — baseline tracked only `incorrect running sprites.jpeg`; no package manifest, app source, or tests.
- `sha256sum 'incorrect running sprites.jpeg'` — `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`.
- Python standard-library JPEG SOF marker read — 2528×1696, 8-bit, 3-channel JPEG; this checks header metadata, not decoded pixels.
- Opened the local JPEG in the image viewer — the sheet visibly has six colour rows and eight labelled frames per row with magenta background. This is a visual observation, not a pixel-level metric.
- `gh pr list --state open/all`, `gh pr view 5`, and `git ls-remote --heads origin` — the final refresh at `2026-10-17T23:33:03Z` reconfirmed four open PRs (#1–#4) and PR #5 closed unmerged at `2026-10-17T23:29:23Z`, with head `b2ab5b81e07d08c8ecd4b28788cef7c8fded6cde`, retained as reference-only. The active unsubmitted candidate `arena/db7c86d4-super-duper-funicular` remains at `e69191f72d0e779b99682673e3216e316e128dbd` with no PR; `main` remains the base hash. `arena/ce6d2a6e-super-duper-funicular` is historical/reference-only.
- Fetched peer branch refs and read their tracked documentation/CLAUDE files and selected source trees. No peer application tests, builds, browser runs, or visual outputs were executed here.
- Cloned upstream `wshyang/greenfield` read-only at `8ba74027be5fad41e48cadde82cc0120d628b109`; copied `GREENFIELD.md` and verified it byte-for-byte against that snapshot.

### Stage 1 validation

- Documentation-only work; application typecheck, lint, unit tests, Playwright, build, Docker, and deployment were **not run** because this baseline has no application package or implementation.
- Peer-reported validation results are summarized in their PR descriptions/docs and are not independently verified.
- Final docs checks (rerun after the final FDS/ledger edits): an inline Python validation script checked all 14 Markdown files except the verbatim upstream `GREENFIELD.md` for trailing whitespace, broken local file/heading links, six active cohort rows plus the closed-unmerged PR #5 reference row, current row-to-SHA mapping, and completed Stage 1 status (`PASS`); `git diff --check` passed; `git cat-file -e <sha>^{commit}` resolved open PR #1–#4, closed-unmerged PR #5, and the provisional candidate tip (`PASS`). The branch remains documentation-only and peer/application tests were not run.

## 2026-10-18 — Stage 2 P1 implementation and visual fringe correction

### Clean install and local validation

- `npm ci` against the final exact pins/lockfile — succeeded; audited 198 packages; zero vulnerabilities.
- `npm run validate` — **PASS**: strict typecheck, ESLint, Prettier check, 15 Vitest tests across 4 files, and Vite production build. This includes run-flight/no-double-support, walk/brisk-walk double-support, and a renderer regression asserting that the neck is painted between the shoulder and neck joints.
- `npm audit` and `npm audit --omit=dev` — both **PASS**, zero vulnerabilities.
- `npm run pipeline` — **PASS**: 48 frames, 8×6 grid, 129 px header, 316×261 px cells, 24 near-duplicate pairs, mean quarter-cycle IoU 0.9350 (range 0.8466–0.9739), maximum baseline range 26 px, maximum height range 24 px, and zero residual strong-magenta or magenta-fringe boundary pixels. The generated report records the exact thresholds and heuristic limits in `docs/SPRITE-FLAW-ANALYSIS.md`.
- Deterministic pipeline test — byte-identical manifests, analysis and PNG outputs on repeat execution against the pinned JPEG.

### Visual and runtime evidence

- Opened the generated real-JPEG red, blue and purple frame PNGs after the edge correction. The initial bright pink/purple halo is removed; dark outlines remain and purple garment pixels are retained. A broad edge-color scan over all 48 generated frames returned zero candidate fringe pixels under the documented threshold. This is a targeted source-frame visual review.
- Generated the local 1380×4160, 16-phase × 3-panel audit via `createCycleAudit(DEFAULT_SETTINGS)` and temporarily installed `@napi-rs/canvas@1.0.11` with `--no-save --package-lock=false --legacy-peer-deps` to exercise the same `renderRunner` path outside the browser. Viewed the full sheet and magnified phase 0.25 / phase 0.5 skeleton output. The first review exposed a detached head/torso because the renderer did not paint the solved neck; added a skin-toned neck stroke beneath the torso and a recording-context renderer regression test. Re-generated and re-opened the close-up: the neck now connects; the procedural figure remains deliberately simplified/mannequin-like, so broad visual-quality acceptance is still partial. The package is extraneous only and not in `package.json`/`package-lock.json`.
- `npm run dev` — Vite `7.3.7` ready on `0.0.0.0:3000`; `curl -I http://127.0.0.1:3000/` returned HTTP 200. The preview is available for browser inspection.
- Browser/E2E acceptance was **not run**; no Chromium/Firefox executable or Playwright test runtime is present in this session branch. A first temporary Canvas install attempt failed with npm Arborist `Cannot read properties of null (reading 'edgesOut')`; retrying with `--legacy-peer-deps` succeeded. No tracked dependency or lockfile changes resulted.

### Branch-comparison snapshot

- `2026-10-18T00:45:49Z` final refresh: `gh pr list` + `git ls-remote --heads origin` reconfirmed six open PRs (#1–#4, #6, #7), closed-unmerged #5 (reference-only), candidate `db7c86d4@e4807c04cd90e00e83b5b84abdcf126e985d5387`, and `main@396ce256debcb5bdc2419cc0f3f399730b61ab36`; active provisional cohort `n = 8`. Full per-branch tips and review labels are in `docs/BRANCH-COMPARISON.md`.
- Inline documentation check — **PASS**: 16 Markdown files (excluding verbatim `GREENFIELD.md`) checked for trailing whitespace, local file/heading links, current `n = 8` marker, and PR #7/candidate SHA entries.
- PR #6 advanced to `1177a1ea47fc7ae759aafb4de5832b3777613b88` and adds SVG/calibration work. PR #7 is new at `5b72c28964f2a2b2f2bd898d3ff6f49b5d177bbb`. Candidate `db7c86d4` advanced through Stage 2/3 to `e4807c04cd90e00e83b5b84abdcf126e985d5387`. Their reported tests were **not** counted as local validation. One committed PR #7 audit PNG was visually viewed as peer evidence; it is not this branch's audit export.

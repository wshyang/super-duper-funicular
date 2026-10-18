# ADDENDA — sequential decision register (append-only)

Numbering is independent of `docs/FDS.md` sections. `ADD-` = decided here;
`CROSS-` = cross-branch adoption/deferral with a parity exit criterion.
Every entry: what / why+evidence / related FDS anchor / practical impact.

## ADD-001 · Stack bindings
**What:** TypeScript strict + `noUncheckedIndexedAccess`, Node ≥20 ESM, Vite 6,
Vitest 3, `pngjs`+`jpeg-js` exact-pinned, npm lockfile.
**Why:** greenfield §0 requires the placeholders resolved up front; siblings
proved this toolchain installs and validates inside the sandbox (PR #3 ran 177
tests on it).
**FDS:** §0, #nfr-repro. **Impact:** `CLAUDE.md` §2 table is the binding list;
new deps need an addendum.

## ADD-002 · No database, no backend
**What:** static Vite bundle + committed generated artefacts; GREENFIELD §4–§5
dormant (`CLAUDE-database.md`).
**Why:** no sibling branch has a data layer either; parity matrix row stays
dormant everywhere.
**FDS:** §4 #nfr-honesty. **Impact:** activation triggers listed in
`CLAUDE-database.md`.

## ADD-003 · Vanilla TS view/model instead of a UI framework
**What:** `src/app/views/**` (DOM wiring, canvas paint) + `src/app/model/**`
(pure decisions + co-located tests).
**Why:** PR #4 showed the greenfield component/hook rule maps to view/model
without React; keeps the runtime dependency-free while preserving the checkable
signal (views must not import `src/lib/gait` directly).
**FDS:** #surf-workbench. **Impact:** grep gate in discipline tests.

## ADD-004 · Registration contract for extracted frames
**What:** shared canvas, centroid column + ground line aligned; manifest stores
bounds/pivot/groundY.
**Why:** ce6d2a6e measured 14 px centroid drift / 25 px ground jitter on raw
cells (its `docs/sprite-analysis.md`); PR #1 measured the same FLAW-04.
**FDS:** #obj-extracted-frame, #feat-extraction. **Impact:** playback and tests
use manifest geometry, never re-derived crops.

## ADD-005 · Manifest is the single geometry source
**What:** `public/sprites/extracted/manifest.json` typed in
`src/shared/types.ts`, consumed by app, tools, tests.
**Why:** greenfield §6 typed-wire-contract rule; PR #1's wire-rename outage is
the cautionary tale.
**FDS:** #obj-manifest. **Impact:** field renames are compile errors.

## ADD-006 · Browser e2e deferred, honestly
**What:** no Playwright specs committed yet; HTTP smoke + model tests stand in;
config-free.
**Why:** sandbox cannot download a Chromium binary (only github/npm/pypi hosts
reachable); PR #2 needed `@sparticuz/chromium` (~100 MB) for the same reason.
**FDS:** #nfr-honesty. **Impact:** exit criterion = installable browser from an
allowed registry; then video-on default with `E2E_VIDEO=off`.

## ADD-007 · Pure-TS raster as the second painter
**What:** `src/lib/render/raster.ts` (scanline even-odd fill, capsules,
composite-over) shared by exports, audit sheets and tests; browser uses Canvas2D
over the same op list.
**Why:** `@napi-rs/canvas` (PR #3) is a native binary and its pixels are not
byte-reproducible across platforms; PR #4 stayed dependency-free but rendered
only analytically. Raster pixels make visual claims testable.
**FDS:** #obj-raster, #nfr-two-painters. **Impact:** render tests assert alpha
coverage/contact, not mocks.

## ADD-008 · Motion-profile defaults harmonised
**What:** run/walk/brisk-walk parameter table in FDS #obj-motion-profile.
**Why:** Stride Lab's measured table (its `docs/MOTION-PROFILES.md`) is the only
sibling profile set with per-motion duty/double-support evidence; PR #1 added
walking duty remapping late, PR #3/#4 lack walking.
**FDS:** #obj-motion-profile, #feat-gait. **Impact:** profiles are data; new
motions add a row + tests.

## ADD-009 · Inert SHIP-HATS minimal-but-complete set
**What:** `.gitlab-ci.yml.shiphats`, `.gitlab/ci/pipeline.gitlab-ci.yml.shiphats`,
`sonar-project.properties.shiphats`, `.gitlab/CODEOWNERS.shiphats`,
`.gitlab/merge_request_templates/Default.md.shiphats` + `activate-shiphats.sh`.
**Why:** greenfield §10.3 "carry the pipeline from the start, inert"; PR #1/#2
carry equivalents.
**FDS:** #nfr-honesty. **Impact:** scratch-activation test in
`tests/discipline/`; files stay in step with local gates.

## ADD-010 · Audit sheet format
**What:** 16 phases × 3 panels (light, dark, joint overlay), labelled neutral
footer, rendered by the app's own solver/painter via the raster.
**Why:** PR #2 invented the 16-phase light/dark/joint format; PR #3 ported it as
`photo:audit`; adopting the format (not their UI) keeps audits comparable across
branches.
**FDS:** #feat-export. **Impact:** `npm run runner:audit` output is the visual
review artefact cited in TURN entries.

---

## CROSS-001 · Adopted: verbatim image-prompt log (from PR #1)
Source `arena/917ef347` `CLAUDE-decisions.md §2`. Status: **active** —
`docs/FDS.md#image-prompt-log`. Exit criterion: every future `generate_image`
call in this branch has a verbatim entry.

## CROSS-002 · Adopted: sequential per-turn learning log (from PR #1, PR #2, PR #3)
`TURN-Lnn` in `#continuous-learning-log`; investigation turns included.
Status: **active**.

## CROSS-003 · Adopted: self-refreshing ledger artefacts (from PR #3, extended per PR #4)
`BRANCH-TIPS.json` snapshot + append-only `BRANCH-HISTORY.json` + marked md
region; extended to **all six rows** (main + five arena branches). Status:
**active** (`tools/compare-branches.ts`).

## CROSS-004 · Adopted: motion families (from PR #2)
run/walk/brisk-walk with per-profile remembered settings. Status: **active**
(ADD-008). Parity exit: per-motion audit sheet inspected + support-state tests
(double support present in walks, flight present in run).

## CROSS-005 · Adopted: named-constants rule (from PR #3)
No hand-tuned magic numbers; constants live with their domain module and a
test/measurement. Status: **active**.

## CROSS-006 · Adopted: manifest with pivots/bounds (from ce6d2a6e)
Status: **active** (ADD-005).

## CROSS-007 · Adopted: declared mutation exceptions (from PR #2)
Canvas contexts, pixel buffers, rAF refs at the I/O boundary. Status: **active**.

## CROSS-008 · Adopted: reusable full-cycle audit skill (from PR #1/#2)
`.claude/skills/audit-gait-cycle/SKILL.md` + `npm run runner:audit`.
Status: **active** (ADD-010).

## CROSS-009 · Adopted: adoption queue + retire-exclusivity (from PR #3)
Ledger §4 holds the queue; exclusivity claims carry an expiry review each
refresh. Status: **active**.

## CROSS-010 · Deferred: sprite-sheet extraction was PR #4's gap — **closed here**
PR #4 deferred extraction (its CROSS-05); this branch implements
#feat-extraction natively. Status: **closed by implementation** (Stage 2).

## CROSS-011 · Deferred: photographic personas / photo rig (from PR #1/#2/#3)
Separately-shot far-limb textures, rounded end-cap masks, hip-cut calibration.
**Exit criteria:** (1) `generate_image` budget approved and prompts logged
verbatim; (2) 16 near + far cutouts with manifest; (3) end-cap default proven by
app-fidelity 16-phase before/after crops; (4) photo persona selectable in the
workbench with pending/error/retry states. Status: **deferred**, queue position 1.

## CROSS-012 · Deferred: raster→SVG photo vectorizer (from PR #1)
**Exit criteria:** contour tracer + simplifier unit-tested on a synthetic disc
(known perimeter) and on one extracted part; stitched SVG frames visually
inspected. Status: **deferred**, queue position 3 (pose-native SVG stitcher ships
in Stage 2 as #feat-export).

## CROSS-013 · Deferred: browser e2e suite (from PR #2)
See ADD-006. Queue position 2.

## CROSS-014 · Rejected: copying sibling coordinate/asset models verbatim
Parity is behavioural (matrix §3), not file copying; incompatible rig units are
re-derived from our own measured constants (CROSS-005).

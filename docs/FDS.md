# Functional design specification — evidence and learning register

This is the FDS entry point and append-only learning register. **[SPEC.md](SPEC.md) remains the canonical functional contract**, with changes in [ADDENDA.md](ADDENDA.md). Do not maintain a divergent duplicate specification here. See [VALIDATION.md](VALIDATION.md) for executed gates, [PHOTOGRAPHIC-RIG.md](PHOTOGRAPHIC-RIG.md) for asset contracts and [MOTION-PROFILES.md](MOTION-PROFILES.md) for gait semantics.

## L001 · 2026-10-18 · Cross-branch review and continuous learning

### Evidence and reproducible selection

User asked to inspect the latest commit on another branch, adopt useful ideas, identify strengths here, and make learning updates mandatory each turn. Queried remote heads with `git ls-remote --heads origin`, fetched the three non-main commit objects, then compared committer timestamps:

| Remote branch | Tip | Commit time (UTC) |
|---|---|---|
| `arena/917ef347-super-duper-funicular` | `f4c31978650ede094bfc96b0a610d53efd7f9ebe` | 2026-10-17 13:54:48 |
| `arena/77ffb088-super-duper-funicular` | `5cc86135e9770c4ce9e1bb7327eebb301522106a` | 2026-10-17 11:38:03 |
| `arena/ce6d2a6e-super-duper-funicular` | `bab689cdac3ba730138bfae09dda537978d61e09` | 2026-10-17 06:27:14 |

Selected `f4c3197`, “feat(audit): add temporary full-cycle frame dumper, audit-gait-cycle agent skill & defect rectifications (ADD-020)”. Extracted its exact Git tree via `git archive <sha> | tar -x -C /home/user/reference-f4c3197`, a temporary reference directory outside this repository. This is a source snapshot rather than a branch switch or second working branch. Current branch remained `arena/263385da-super-duper-funicular`. “Latest” means latest remote-tip committer time at inspection, not a promise about future updates or branch quality. Other branch code was read, not executed; its reported test/visual results are not independently verified here.

### Comparison: strengths worth taking from the reference

| Evidence at reference commit | Learning | Decision here |
|---|---|---|
| `src/pipeline/cycle-frame-dumper.ts`, `.claude/skills/audit-gait-cycle/SKILL.md`, FDS §11 | Eight keyframes can miss defects at odd sixteenths. Light/dark views and overlays expose different problems. | **Adopted:** 16-phase, three-panel audit export through our actual Canvas renderer. Playwright generates all three motion sheets as ignored attachments; reusable review skill added. |
| `CLAUDE.md` rule 2 and FDS image-prompt log | Exact prompts, reference paths and regeneration reasons make image iteration auditable. | **Adopted prospectively:** log every future image-generation call and outcome in FDS. Historical prompts unavailable in this checkout must not be reconstructed or passed off as verbatim. No images generated this turn. |
| `src/pipeline/rounded-joint-cutter.ts` row sampling and `endCapComposite` | Source sampling/compositing can supply cap texture when a subtractive mask cannot. | **Deferred:** source/destination endpoint ranges and 160×160 resampling differ from our original-size registered cutouts. Blind copying would stretch fabric, change pixels and violate our subtractive PNG contract. Prototype as a separate opt-in reconstruction stage with provenance and tests, not a hidden mask change. |
| `src/runner/foot-roll.ts` rear-foot and toe angles | Independent forefoot deformation is a richer model than a single rigid shoe rolling at support pivots. | **Deferred:** requires a new shoe split/warp contract and seam/contact tests; heel/toe landmarks must not become arbitrary limb-cap pivots. |
| `src/pipeline/cycle-frame-dumper.ts` anomaly metrics | Machine measurements help prioritize visual review. | **Deferred:** reference magenta thresholds are not directly appropriate for our green-keyed teal imagery; disconnected-island/alpha checks need calibrated tolerances. Do not label colours or antialiasing as defects blindly. |

### What this implementation already does well (source-backed, not a universal ranking)

- **Motion breadth and contact invariants:** `src/motion/motions.ts`, `gait.ts` and `tests/frontend/unit/walking.test.ts` support run/walk/brisk walk, independent settings, no-flight walking, double support and tested contact continuity. The inspected reference gait/foot-roll path is running-focused. Preserve our mechanics rather than importing its running knots wholesale.
- **Interactive, reversible calibration:** `EndCutTool.tsx`, `end-cuts.ts`, `end-mask.ts` offer ten near/far pieces with independent endpoints, pivot-centred rotation, assembled inspection, unchanged source dimensions and subtractive alpha. The reference cutter is useful pipeline machinery but does not replace this per-part runtime UI/contract.
- **Explicit failure recovery:** our `photo/assets.ts` + `useWorkbench.ts` require complete assets, expose loading/error/retry, and gate exports. The reference `usePhotorealRigAssets.ts` resolves failed images to null, accepts a nonempty partial bank and swallows rejected loads. Preserve our all-or-nothing readiness and real-browser failure/retry test.
- **Shared rendering and regression evidence:** live scene, thumbnails, calibration, sprite export and now audits share pose/render paths. Existing real-browser tests check downloads, alpha removal/pivot preservation, comparison isolation and mobile layouts. The reference's pure raster engine offers useful headless analysis; neither approach alone establishes visual correctness.
- **Performance boundary:** bounded 32-entry end-mask and 8-entry hip-mask caches avoid reprocessing source pixels every animation frame. Do not import per-frame raster cleanup without a measured need and performance budget.

### Applied change and evidence

Added `audit-layout.ts`, `cycle-audit.ts`, a workbench action and **Export 16-phase audit · PNG** below the stage. Output is 3840×1440: sixteen phases `[0, 1)` in a 4×4 layout, each with light background, dark background and joint overlay. Footer identifies motion, phase and kinematic support count. It uses current persona, tuning and masks, suppresses overlays in the two clean panels, preserves playback, and retains the existing eight-frame sprite export unchanged. It is generated-motion diagnostics, not source-sheet analysis. No reference assets or dependency stack were imported.

Two unit tests were introduced first and failed on the absent layout module, then passed with implementation. New real-browser coverage exports all three photo motions, checks PNG dimensions/naming, populated panels and unchanged live pose. Actual gates: **39 unit tests / 14 browser tests passed**, typecheck, lint and production build passed. Preprocessing/extraction tests and the reference branch's gates were not rerun; those pipelines were not modified.

### Visual learning and remaining work

Opened the running and walking audit sheets after generation. The initial export revealed a diagnostic-layout defect: the long phase/support footer crossed onto the dark panel in dark ink. Fixed it with an explicit full-cell neutral footer, then regenerated the sheets. This is a useful example of why passing PNG-size checks is insufficient.

The rendered character still has conspicuous garment/skin transitions at the hip and knee and lighting differences between independent cutouts; a full-cycle audit makes these easier to examine but does not repair them. No claim of seamless photography or a quantitative anomaly-free score is made. Next focused work: inspect enlarged hip/knee crops and evaluate a separately named opt-in texture-reconstruction prototype against the unchanged subtractive baseline. Raw-frame metric JSON and automatic joint-crop exports remain deferred.

### Standing learning discipline

`CLAUDE.md` now requires an FDS learning update **every turn**, including no-code/investigation turns: evidence → observation → decision → validation/uncertainty → next action. If there is no new technical learning, explicitly record that and why rather than inventing findings. Specification changes still require same-change SPEC and sequential ADDENDA updates. Future reviews should preserve both adopted and rejected alternatives and never substitute another branch's claimed validation for local evidence.

Final review this turn: regenerated all three sheets after the footer fix, opened the brisk-walking sheet and confirmed phase/support text is readable across the neutral footer. Browser suite remained 14/14. Broader photographic seam limitations remain unchanged; the audit is an inspection improvement, not a claim that those defects were repaired.

## L002 · 2026-10-18 · Pull-request handoff

Request: publish the accumulated work on the current branch as a pull request. Evidence: `git status` showed the app and documentation had not yet been committed; `gh pr list --head arena/263385da-super-duper-funicular --state open` returned no open PR. No new technical learning about motion/rendering this turn; this is a delivery handoff, not a functional change. Preserve the current branch and submit the complete implementation against `main`, including the source-artwork relocation. Validation figures in the PR refer to the preceding implementation turn (39 unit / 14 browser tests, typecheck/lint/format/build), not a fresh test execution. Check staged whitespace and excluded artifacts before commit. Next action: review the PR and its checks; photographic seams and deferred texture reconstruction remain documented limitations.

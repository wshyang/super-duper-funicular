# Functional Design Specification — Funicular Runner Lab

- **Version:** 0.1 · **Status:** Stage 2 P1 implementation in progress · **Last updated:** 2026-10-18
- **Canonical contract:** this file. **Decision history:** [`ADDENDA.md`](ADDENDA.md). **Live peer evidence and parity:** [`BRANCH-COMPARISON.md`](BRANCH-COMPARISON.md).
- **Important:** requirements below are the target design, not a statement that this branch already implements them. Current implementation status is recorded in the comparison ledger.

## 1. Intent, outcome, and user

The starting repository contains a single pixel-art JPEG presenting a six-colour, eight-frame running sheet. The product is a local-first sprite/motion workbench that preserves and diagnoses this source, creates a deterministic extraction and a continuously articulated runner, and converges on the useful studio, photographic-rig, calibration, export, and quality capabilities found across the active peer branches.

**Primary user:** an artist/developer inspecting and adjusting a runner, its source sprites, motion, rig, and exports.

**First-order goal:** establish the Greenfield discipline and canonical FDS (complete), then implement and verify against them. **Current stage:** Stage 2 P1 source pipeline, diagnostic report, procedural gait core, and first workbench surfaces are implemented; extracted source frames and the procedural audit have been visually reviewed. Audit review found and fixed a detached neck; overall runner visual acceptance and browser acceptance remain open. **Second-order goal:** adopt verified strengths from active PR implementations without copying incompatible code. **Strategic goal:** feature parity across all active same-app branches, proven by behavior and acceptance evidence rather than feature counts.

The live ledger defines the cohort dynamically. At the latest refresh (`2026-10-18T00:45:49Z`) it contains this session, six open PR branches (#1–#4, #6, and #7), and one active unsubmitted same-app candidate (`arena/db7c86d4`), for a provisional `n = 8`. Closed-unmerged PR #5 remains in the reference matrix but outside the active denominator; older `ce6d2a6e` is historical.

## 2. Scope and non-goals

### In scope

- Preserve, inventory, extract, and quantitatively inspect the supplied reference sheet.
- A continuous procedural runner with a tested articulated pose/IK model, personas, motion profiles, and an interactive workbench.
- A photographic-style, explicitly fictional cutout persona with separate side-aware anatomy, readiness/retry, calibration, and truthful 2D limitations.
- Transparent sprite/part assets, manifests/settings, cycle diagnostics, and the peer branch's useful vector-SVG output.
- A living, evidence-backed parity ledger and append-only learning/decision history.

### Non-goals unless the FDS is changed

- A backend, database, account system, API, cloud image-generation runtime, real-person likeness, 3D reconstruction, clinical biomechanics, terrain/inverse dynamics, or persistent settings without an explicit import/export action.
- Copying peer source code, images, or historical prompts into this branch simply to claim parity.
- Treating a passing numeric score, image count, test count, or AI-generated appearance as proof of seamless or photoreal animation.

## 3. Actors and core objects

There is no authenticated actor model or database in the current scope. “User” below means the person using the local workbench.

| Object | Contract |
|---|---|
| **SourceAsset** | Immutable input file with path, media type, pixel dimensions, byte SHA-256, provenance state, and optional decoded-pixel hash. The current reference is `incorrect running sprites.jpeg`, 2528×1696, SHA-256 `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`. Its external origin/licence is unknown. |
| **ExtractedSprite** | RGBA image for one logical palette/frame or rig part. Carries source hash, source region, output dimensions, visible bounds, registration/pivot, keying and processing version. Similar-looking frames remain distinct; only exact duplicate bytes/pixels may alias. |
| **Persona / RigPart** | A fictional procedural or photographic appearance plus ordered parts and their coordinate/pivot/surface metadata. Near and far photo parts are independent source views, not mirrored substitutes. |
| **MotionProfile** | A named run/walk/brisk-walk parameter set with units, defaults, tested ranges, stance duty, and profile-specific pose/contact rules. Current candidate numeric defaults are drafts in §5. |
| **RunnerSettings** | Session-only persona, motion, palette, phase, playback, controls, overlays, and calibration. View changes must not silently discard unrelated settings. |
| **Pose** | Deterministic articulated state for a finite normalized phase in `[0,1)`, including skeleton joints, foot support/roll, body lean, and ordered rig-part transforms. |
| **Calibration** | Reversible, session-scoped hip/joint settings; changing one affects the intended render paths, but inspection rotation/comparison does not mutate the main pose. JSON download is explicit. |
| **CycleAudit** | Diagnostic samples and image panels tied to a source/configuration hash, motion, normalized phases, background, overlay, metric definitions, and known limitations. |
| **AssetManifest** | Typed index of logical sprites/parts, URLs, hashes, dimensions, bounds, pivots, source provenance, and export layout. Producer, consumer, and tests change together. |

Relationships: `SourceAsset → ExtractedSprite`; `Persona → RigPart[]`; `MotionProfile + RunnerSettings + phase → Pose → shared Renderer`; `Calibration` modifies the selected render configuration; `CycleAudit` samples the same pose/renderer; `AssetManifest` indexes reproducible outputs.

## 4. States and cross-feature invariants

### Playback

- States: `playing`, `paused`.
- Legal transitions: either state may toggle to the other; play advances normalized phase continuously and wraps modulo 1; pause preserves phase; step advances by one configured sample; scrubbing selects a phase and does not reset unrelated settings.
- Forbidden: a phase outside `[0,1)` reaching the pose solver, an animation wrap discontinuity, or a UI-only pose that differs from exported rendering.

### Photographic asset bank

- States: `loading → ready` or `loading → error`; `error → loading` on retry.
- The bank is all-or-nothing for the selected photographic persona. In `loading` or `error`, show clear status, disable photographic exports, and offer retry after failure. Never silently render a partial bank or fall back to a different persona.
- **Draft user-facing error:** “Photographic runner assets could not be loaded. Retry.” Final copy is to be reviewed with the UI implementation.

### Calibration

- Reset returns to the exact default render; download does not imply automatic persistence/import.
- Isolated rotation and base/rounded comparison are inspector-only. They do not alter playback, the main animation, source files, or other parts' settings.
- A subtractive mask may reveal a gap and cannot restore missing source texture. Any additive reconstruction must be a named, provenance-preserving, opt-in operation with its own acceptance tests.

### Global invariants

1. The supplied source file is never rewritten or recompressed; a path relocation is acceptable only if the byte SHA remains identical.
2. Exact duplicate detection may share output storage. Perceptual or visual similarity is a report signal, never a deletion rule.
3. Same source, code version, and settings produce deterministic manifests/derived assets. Do not use nondeterministic generated output as if it were reproducible extraction.
4. All display, preview, audit, and export surfaces share the same pose/composition/renderer and selected settings.
5. Reference artwork stays clearly distinct from a newly synthesized procedural/photo-style character.
6. No user-visible capability is complete until it has an accessible surface or a documented output/CLI contract.

## 5. Functional requirements

Each item is an acceptance contract. `DRAFT` defaults and scope are derived from the named branches and must be reconciled with new user direction or evidence before being treated as immutable.

### F-001 — Source inventory, provenance, and safe deduplication · P1

**Given** the checked-in reference and any later artwork, **when** the inventory/extraction tool runs, **then** it records file SHA-256, decoded-pixel identity where available, dimensions, role, path, and provenance; identifies exact duplicates; and preserves visually similar frames. Source files remain byte-identical.

**Acceptance:** a real-file test asserts the present source SHA and dimensions; a second run leaves source bytes unchanged; duplicate aliases are proven exact. Perceptual hash can suggest review but cannot authorize deletion. Unknown artwork origin/licence remains explicitly unknown.

### F-002 — Reference-sheet extraction · P1

**Given** the supplied 6-row × 8-column, magenta-backed JPEG, **when** the pipeline extracts it, **then** it emits all 48 logical frames as transparent RGBA assets and a typed manifest, excluding title/labels, tolerating nonuniform divider/JPEG variation, removing background spill, and preserving violet garment pixels.

Use shared registration/canvas bounds so extraction does not erase source-relative ground or baseline drift. Do not claim semantic segmentation or reconstruction of occluded anatomy. Support configurable grid/region inputs only after the supplied asset is correct.

**Acceptance:** test on the actual JPEG; assert 48 logical entries, valid alpha/bounds/hashes, retained purple pixels, no unexpected crop loss, and byte-identical outputs on a repeat run. Any color/alpha tolerance must be calibrated and documented.

### F-003 — Quantitative source diagnosis · P1

Report methods and results for half-cycle similarity, distinct poses, left/right lead alternation, foot crossover/separation, character height and baseline registration, and chroma/grid contamination. Include source hash and raw per-frame measurements so results can be reproduced.

Peer docs report (not independently re-measured on this branch) approximately 94.7% mean half-cycle silhouette IoU, only four materially distinct poses per eight-frame row, no leg crossover, 20 px height variation, and up to 25 px baseline shift. These are hypotheses/benchmarks to recalculate using a documented common metric—not hard-coded acceptance truths. A high similarity score or failed crossover measurement describes this sheet, not all running art.

### F-004 — Continuous procedural runner and pose model · P1

**Given** a valid persona, motion profile, settings, and normalized phase, **when** the pose solver runs, **then** it returns the same pose for the same input, wraps continuously, uses opposite-side gait phase, preserves segment lengths with two-bone IK over exposed control ranges, and expresses forward body balance rather than merely tilting a drawing.

For running, support a deliberate flight interval. Keep gait, IK, body metrics, rendering, and source extraction separate. Pose controls and every unit must be named. Run tests over the full UI range and cycle boundaries, not just one default pose.

### F-005 — Procedural personas, palette, and body articulation · P1

Provide the two procedural runner variants present in the peer product set and six source-sheet colorways. Persona changes update the stage, thumbnails, skeleton/onion overlays, and exports without resetting phase/playback or unrelated tuning. The source image remains an original-sheet comparison and is not relabelled as a newly created persona.

Fictional character descriptions are not universal claims about gender or ethnicity. Keep user-facing copy respectful and omit internal design rationale.

### F-006 — Motion profiles · P2

Provide **Running**, **Walking**, and **Brisk walking** as distinct profiles, not merely playback-speed multipliers. Each profile has its own named defaults, valid control ranges, phase/contact labels, and session settings; switching profiles preserves phase, playback, persona, and calibration. Switching is instantaneous unless a transition is separately specified.

| Candidate profile | Cadence (steps/min) | Foot travel (rig px) | Lift (rig px) | Lean | Stance per leg |
|---|---:|---:|---:|---:|---:|
| Running | 168 | 36 | 25 | 10° | 36% |
| Walking | 108 | 28 | 7 | 2° | 62% |
| Brisk walking | 132 | 32 | 9 | 4° | 56% |

These initial values are **[DRAFT — Stride Lab `b227e2fe`]**; verify them against the other latest implementations and preserve them only if consistent with the desired look. Walking profiles maintain support with a defined double-support interval and no flight; running may have flight. Heel-first contact, foot roll, clearance, limb lengths, and boundary continuity are tested across each profile's controls. Values are rig units, not real-world speed or clinical measurements.

### F-007 — Articulated foot and contact · P1/P2

Represent foot support from the sole/contact point, not an ankle point above the ground. Model late-stance roll about a planted toe and smooth swing recovery without sole penetration. The parity target includes a two-segment hindfoot/forefoot shoe hinged at the ball for the photographic rig; compare geometry and contact before choosing between rigid-pivot and texture-warp implementations.

Acceptance covers contact, clearance, rollover continuity, heel/toe pivot, and leg-length preservation across all motion modes. Do not assume a crop-space mask and a world-space app pose share coordinates.

### F-008 — Workbench, playback, and diagnostics UI · P1/P2

Provide a responsive studio surface with live stage, play/pause, phase scrub/step, speed, profile, persona, palette, tuning controls, source/procedural selector, and relevant support/phase labels. Include source/derived asset inspection, an asset library/atlas, skeleton/onion display, and eight-sample preview where selected.

All interactive elements have an accessible label and stable `data-testid="{component-kebab}__{element-role}"`. Reduced-motion users start paused. No modal/inspector should corrupt the main pose. Empty/loading/error states are explicit; static image-only fallbacks are labelled as such.

### F-009 — Photographic-style cutout persona · P3

Add one explicitly fictional adult photographic-style persona as an additive option; do not remove either procedural persona. The union target is a **17-part contract**: head, separate hair accessory, neck, torso, pelvis; near/far upper arms, forearms, hands, thighs, shins, and feet/shoes. Each moving part carries source hash, surface identity, source crop, endpoints/pivot, canvas dimensions, and calibration.

Use separately sourced outer/lateral near-side and inner/medial far-side surfaces; never mirror a near image to invent unseen anatomy, palm, arch, or surface detail. Target independent parts for hands, pelvis, neck, and hair because they expose distinct articulation. A one-view 2D cutout cannot reveal new views, simulate cloth/muscle, or guarantee consistent illumination. Label generated fictional imagery honestly and do not imply a real person was photographed.

**Generation provenance:** each image-generation call and regeneration is logged verbatim in §9. An original image set and its final prompts are not inferred from peer output or reconstructed from memory.

### F-010 — Reversible hip and articulated-end calibration · P3

Provide a photographic hip-cut/layer inspector and a reusable proximal/distal limb-end cutter for relevant near/far arms and legs. Radius, feather, shaft blend, endpoints, and any coordinate transforms are explicit per-part values. Preserve pivots, registered dimensions, and unaffected anatomy.

The inspector offers reset, before/after comparison, pivot guides, isolated rotation, and assembled-cycle inspection. Calibration affects the live renderer, thumbnails/onion skin, audit, and export consistently. Download registered RGBA part/PNG and calibration JSON; no silent persistence. Preserve fingers by default and do not interpret shoe heel/toe markers as limb joint endpoints.

Rounded ends require **both** numeric and app-fidelity visual acceptance. A prototype, disabled default, or partial subset is not “all joints fixed.” Additive garment-end/shorts-cuff reconstruction from the peer branch is tracked as a separate optional operation; never stretch a canonical texture or activate it without visual evidence.

### F-011 — Asset readiness and recovery · P2/P3

The photographic rig loads all required parts as one readiness bank. Pending and error states are visible, retry is available, and photographic preview/export are blocked until every required image is valid. A real missing-file test must observe failure and successful retry; a manifest with a nonempty subset is not a ready rig.

### F-012 — Full-cycle visual and numeric audit · P2

Produce a 16-phase audit over `[0,1)` with three panels per phase: clean light background, clean dark background, and joint/skeleton overlay (48 diagnostic panels per cycle). Include motion, phase, persona/config identity, and support information. Use the same actual app renderer and current controls; do not change playback state or the legacy eight-frame export.

Add defined machine metrics where useful: disconnected opaque islands, key-color spill, uncovered joint windows, frame bounds, width parity, contact/clearance, and pose symmetry. Each metric must name its algorithm, threshold, scope, and false-positive limitations. Use magnified crops for visual review. The audit is diagnostic, not automatic proof of quality.

### F-013 — Downloads and typed manifests · P1/P2

Export transparent eight-frame PNG sprite sheets for supported persona/motion combinations, with exact dimensions, cell size, origin/pivot, name, alpha, and manifest recorded at generation time. Preserve source-vs-generated labelling. Provide part atlas/source library, and downloads for calibrated PNG/settings JSON. Export selection and filenames include persona/profile; overlays are omitted from production sprite sheets unless explicitly chosen.

Photo export is disabled while its part bank is not ready. All downloads share the live renderer and current settings; output bounds/pivots and `Content-Type` are verified. Candidate pixel/photo sizes from peer branches are evidence, not yet a cross-branch standard; settle the canonical sizes before publishing a stable wire/output contract.

### F-014 — SVG part vectorizer and rig stitcher · P3

Include the unique peer capability as an alternate distribution/output path: vectorized, smoothed silhouettes with quantized color bands/texture treatment, clip masks, typed part metadata, affine rig transforms, and hierarchical stitched SVG frames including the two-segment foot. Retain raster/photo output as the reference-quality format where texture fidelity requires it.

Acceptance requires deterministic SVG, valid intrinsic bounds, transforms that preserve orientation and pivot registration, no broken references, and per-part silhouette/color fidelity checks. A silhouette-only SVG with an embedded raster is useful but must be labelled `partial` against full color-band vectors. Do not assume vector conversion improves photographic realism.

### F-015 — Error recovery, accessibility, privacy, and responsive behavior · P1

- All controls have accessible names, keyboard operation, visible focus, and meaningful disabled/loading states; mobile layout must not overlap controls.
- Respect reduced-motion preference by initially pausing animation.
- No backend, accounts, external runtime calls, or secrets in the current product. Keep public/browser asset URLs same-origin and relative.
- Asset/render/export failure is surfaced with a retry/recovery path and never downloads a blank/partial file.
- If persistence or network APIs are later added, reopen privacy, auth/session, IDOR, rate-limit, and migration requirements before implementation.

## 6. Product surfaces and primary flow

1. **Source library:** show original sheet and inventory; reveal extracted cells/parts with bounds and manifest data.
2. **Motion studio:** play, pause, step/scrub, select persona/profile/palette, tune supported parameters, show skeleton/onion and support labels.
3. **Cycle review:** run full-cycle multi-background export; open and magnify suspect joints; record observations and relevant configuration.
4. **Photo-rig inspector:** select part/end, isolate rotation, inspect assembled cycle, reset, apply calibration, download part/settings.
5. **Export:** generate selected sprite sheet, parts, manifest, and/or SVG; report failure instead of silently exporting incomplete assets.

A capability without one of these or an explicit CLI surface remains `[ORPHAN-CAPABILITY]` until added, deferred, or removed with a decision.

## 7. Non-functional requirements and validation contract

- **Determinism:** extraction, deduplication, analysis, manifest, and vector outputs reproduce from pinned sources/toolchain. Generation prompts and AI output are provenance, not deterministic build steps.
- **Correctness:** pure pose/math tests, real-JPEG pipeline tests, output/manifest tests, control/state tests, and browser tests share explicit invariants.
- **Visual quality:** inspected with the workflow in [`CLAUDE-validation.md`](../CLAUDE-validation.md) and the [`audit-gait-cycle` skill](../.claude/skills/audit-gait-cycle/SKILL.md); no test-only realism claim.
- **Performance:** target smooth interactive playback at normal browser refresh rates; establish a named frame budget and measure on a documented environment before claiming compliance. Keep per-pixel masks/cuts out of each animation tick via bounded caches or deterministic preprocessing.
- **Portability:** Node 22 LTS, npm lockfile, strict TypeScript, Vite. Dev preview binds `0.0.0.0:3000` and accepts the forwarded preview host.
- **Architecture:** React is limited to the studio shell; the core stays framework-independent TypeScript. The pipeline has one authoritative implementation. Exact dependency versions are pinned in the first package lockfile.
- **Deployment:** static hosting/container support is a later gate. SHIP-HATS, cloud tunnel, and compliance integrations are deferred until a real target exists and are never claimed without execution.

`npm run validate` is implemented and runs strict typecheck, lint/format, Vitest unit/real-asset tests, and a production build. Browser/E2E acceptance, procedural-runner audit review, container smoke, and deployment remain separately named gates with separately reported evidence. Source-frame extraction has received a visual review.

## 8. Phase plan and parity exit

- **D0 — Foundation (complete):** upstream discipline, FDS, addenda, dynamic n-way comparison, evidence and prompt logging rules. No application code was claimed during that stage.
- **P1 — Deterministic core (in progress):** the pinned-source pipeline, 48-frame manifest, quantitative report, continuous framework-independent pose/IK, two procedural personas/six palettes, initial source/studio/diagnostics surfaces, eight-phase PNG/JSON export, and a 16-phase × three-panel audit exporter are implemented. Real-JPEG, determinism, pose/contact, SSR, and export-layout tests pass. Extracted source PNGs and the 16-phase procedural audit have been visually checked. The audit exposed a missing neck stroke, now fixed and regression-tested; broader pose/style acceptance and browser-level acceptance remain open.
- **P2 — Workbench and locomotion parity (partial):** responsive initial studio, three named profiles, playback/scrubbing, asset strip, source diagnostics, skeleton/onion overlays, and export controls exist. Profile tuning ranges, richer asset recovery, Playwright tests/video, and magnified cycle review remain.
- **P3 — Photographic and advanced-output parity (not started):** 17-part side-aware photo rig, reversible hip/end calibration, generated-art prompt provenance if new art is approved, full-color SVG parts/frame stitcher, and expanded numerical/material QC remain.

Phases are sequencing, not permission to silently drop a peer feature. The comparison ledger tracks every union feature and its status. Parity is complete only when each active implementation has equivalent user-visible/output behavior and the acceptance evidence in the matrix; local branch work does not claim another branch was changed.

## 9. Image-prompt log {#image-prompt-log}

No image-generation call was made on this branch during Stage 1. The origin of the supplied JPEG's prompt/source is unknown. Peer-branch prompts are not copied or presented as this branch's history.

For every future call, append one immutable entry containing: call/date; exact verbatim prompt; exact target `file_path`; exact `images` references; selected output path/hash; visual outcome; and acceptance/rejection note. If regenerating a path, retain prior entries and add the exact new prompt plus a **Regeneration Justification** that names the observed defect and the intended correction. Never backfill a missing prompt as if verbatim.

## 10. Open draft decisions

| ID | Draft question | Current direction / evidence needed |
|---|---|---|
| D-01 | Exact profile parameter ranges and final defaults | Start from the Stride Lab table in F-006; sweep the full range and compare latest peer implementations before freeze. |
| D-02 | Canonical PNG dimensions/cell sizes and filenames | Require typed manifests and output parity; settle before the first stable export contract. |
| D-03 | Photo source plates, identity styling, and generation scope | The union has a fictional photo-style female option; confirm asset-generation specifics before spending image calls. No photo-male option is in the active union. |
| D-04 | SVG fidelity metric/threshold | Use common alpha/color definitions and compare with raster; do not treat the branch's silhouette IoU as universal. |
| D-05 | Exact dependency versions and browser matrix | Exact direct versions are pinned in `package.json`/`package-lock.json` (Node `>=22.12.0`, React `19.1.1`, Vite `7.3.7`, TypeScript `5.9.2`, Vitest `4.1.11`); production build passes. Define and exercise the supported browser matrix before marking browser acceptance complete. |

## 11. Continuous learning log {#continuous-learning-log}

Append one entry on **every turn**, including documentation-only, investigation, and delivery turns. Entries are chronological and never silently rewritten.

### TURN-L001 · 2026-10-17 · Stage 1 discipline and n-way synthesis

- **Trigger:** Adopt `wshyang/greenfield`, inspect the separate app branches and open PRs, establish a harmonised discipline/FDS, and make the comparison/learning workflow mandatory.
- **Evidence inspected:** upstream `wshyang/greenfield` at `8ba74027be5fad41e48cadde82cc0120d628b109`; baseline `main` at `396ce256debcb5bdc2419cc0f3f399730b61ab36`; open PR tips #1 `e172b0f1f8d9b640b65a4ba420f71965693adb23`, #2 `b227e2fe562be341f15f58955f539d325170729e`, #3 `43352cf3fe8cb6c486aa79a59954d5972a5e13ac`, #4 `1a815d502f87cc88c5ded7ccd41f454c72a31b38`, #5 `b2ab5b81e07d08c8ecd4b28788cef7c8fded6cde`; active unsubmitted candidate `arena/db7c86d4-super-duper-funicular` at `e69191f72d0e779b99682673e3216e316e128dbd`; historical no-PR reference `arena/ce6d2a6e-super-duper-funicular` at `bab689cdac3ba730138bfae09dda537978d61e09`. The complete live snapshot is in `docs/BRANCH-COMPARISON.md`. Read each pinned branch's tracked Markdown/CLAUDE/FDS/package/tree; peer code/tests were not executed. The local JPEG was opened and visually inspected; a Python JPEG SOF parser reported 2528×1696; local byte SHA-256 is `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`.
- **Learnings:** #1 contributes the broadest photo/17-part/SVG scope and exact prompt provenance; #2 contributes the richest browser workbench, multi-mode gait, reversible calibration, loading recovery, and Playwright evidence; #3 contributes measured material/width/shape QA, explicit failed experiments, and conservative visual claims; #4 contributes a concise Greenfield synthesis and framework-light, domain-separated core; #5 contributes a compact problem/object/BDD FDS and an early stage plan. The unsubmitted `db7c86d4` candidate contributes a comprehensive object/surface/BDD FDS and an automated tip/history refresher concept; its ledger still omits PRs #4/#5 and the current candidate, so adopt the structure/history idea, not its fixed branch list or stale hashes. The historic `ce6d` branch has useful co-located test and reproducible-artifact principles but is not active. Three-way ledgers became stale as PRs #4/#5 and the `db7` candidate appeared during this review, confirming that cohort membership must be refreshed dynamically each turn. Branch test results are **reported**, not local results.
- **Adopted / deferred:** copied upstream `GREENFIELD.md` byte-for-byte; adapted FDS Builder rather than importing chatbot-only output rules; selected a strict TypeScript, Vite/Canvas, React-shell target while preserving a framework-independent core; defined the behavioral union and phased parity. Deferred app code to Stage 2. Deferred exact numeric defaults, output sizes, and photo-generation specifics as tagged drafts. No peer assets or prompts copied.
- **Validation actually run:** local repository/branch status; GitHub open/all-PR queries; `git ls-remote` refresh; fetched and inspected the five current PR refs plus the unsubmitted `db7` candidate; verified upstream commit; SHA-256 of the local source; parsed JPEG SOF dimensions with Python stdlib; visually viewed the local JPEG; copied Greenfield byte-for-byte. Application typecheck/unit/E2E/build, peer tests, visual audits of peer outputs, Docker, and deployment were **not run**. Documentation validation is recorded separately in `docs/VALIDATION.md` after final checks.
- **Uncertainty / next:** the `db7c86d4` candidate has no open PR at the latest query; retain it as provisional active until it is merged, closed, or declared historical. Refresh PR/candidate membership and hashes every turn; settle draft parameters and output layout during implementation bootstrap; implement P1 in this branch with real-source tests, keeping photo/SVG work in the parity queue.

### TURN-L002 · 2026-10-17 · Cohort reconciliation and Stage 1 completion

- **Trigger:** Complete the living n-way comparison, include the newly discovered no-PR candidate, correct stale FDS tip/count wording, and validate the documentation handoff without starting app implementation.
- **Evidence inspected:** at `2026-10-17T23:26:36Z`, `gh pr list --repo wshyang/super-duper-funicular --state open/all` and `git ls-remote --heads origin` confirmed five open PRs (#1–#5), unchanged tips, candidate `arena/db7c86d4-super-duper-funicular` at `e69191f72d0e779b99682673e3216e316e128dbd` with no PR, `main` at `396ce256debcb5bdc2419cc0f3f399730b61ab36`, and historical `ce6d2a6e` at `bab689cdac3ba730138bfae09dda537978d61e09`. This session remains local `HEAD` `396ce256debcb5bdc2419cc0f3f399730b61ab36` with uncommitted documentation. The complete active cohort, full tips, feature matrix, adoption queue, and exact observation are in `docs/BRANCH-COMPARISON.md`.
- **Learnings:** the correct current denominator is provisional `n = 7` (this session + five open PRs + one unsubmitted same-app candidate); remote branch presence alone does not prove complete feature implementation or PR status. The candidate's fixed roster is stale, so retain its useful history/refresher concept but use one dynamic canonical ledger. Corrected the PR #1 and #3 SHA typos and replaced obsolete six-branch wording.
- **Adopted / deferred:** completed the harmonised Greenfield/Claude/FDS discipline and a single live Markdown comparison; preserved the session's current Stage 1 boundary. Deferred all app implementation to a later stage; no peer code, prompts, or assets were copied.
- **Validation actually run:** refreshed GitHub open/all PR queries and remote refs; `git cat-file -e` resolved all six peer/candidate commit SHAs; an inline Python check passed across 14 Markdown files (excluding byte-verbatim `GREENFIELD.md`) for trailing whitespace, local file/heading links, seven active cohort rows, current row-to-SHA mapping, and completed Stage 1 status; `git diff --check` passed. No app typecheck/lint/unit/E2E/build, peer tests, peer visual review, container, or deployment ran.
- **Uncertainty / next:** all remote tips were unchanged at the final refresh, but membership remains dynamic. Refresh again on the next turn. Stage 1 is complete; app implementation remains intentionally untouched in this turn.

### TURN-L003 · 2026-10-17 · Open-PR cohort shrinks after PR #5 closes

- **Trigger:** Refresh the living comparison before handoff; discover and record a newly closed, unmerged PR while preserving the user's requested branch comparison.
- **Evidence inspected:** at `2026-10-17T23:30:28Z`, `gh pr list --state open` showed PRs #1–#4; `gh pr list --state all` and `gh pr view 5` showed PR #5 closed at `2026-10-17T23:29:23Z` with `mergedAt: null`, no comments, and head `b2ab5b81e07d08c8ecd4b28788cef7c8fded6cde`. `git ls-remote --heads origin` showed the PR #5 branch still exists at that SHA, `db7c86d4` remains at `e69191f72d0e779b99682673e3216e316e128dbd` with no PR, and `main` remains `396ce256debcb5bdc2419cc0f3f399730b61ab36`. The final `gh pr list --state open/all` + `git ls-remote --heads origin` refresh at `2026-10-17T23:33:03Z` confirmed the same states and tips. The full refreshed table is `docs/BRANCH-COMPARISON.md`.
- **Learnings:** the active denominator is now `n = 6` (session + four open PRs + one provisional unsubmitted candidate). A closed PR can remain unmerged and its remote branch can still exist; do not conflate branch existence with an open review. To honor comparison of unmerged work without freezing the active count, PR #5 remains a clearly labelled closed-unmerged reference column outside `n`.
- **Adopted / deferred:** updated the cohort rule, current status, and comparison matrix to move PR #5 into reference-only; retain its useful feature/FDS evidence. No reason for closure is known from the PR's empty comment list; do not infer one. No app code or tests were started.
- **Validation actually run:** `gh pr list --state open/all`, `gh pr view 5`, and `git ls-remote --heads origin`; final documentation checks are recorded in `docs/VALIDATION.md` after this status update. No application, peer, browser, visual, container, or deployment validation ran.
- **Uncertainty / next:** if PR #5 is reopened or explicitly promoted, restore it to the active denominator; otherwise retain it as reference only. Re-query dynamic membership and refresh hashes on every next turn.

### TURN-L004 · 2026-10-18 · Stage 2 matte correction, clean validation, and cohort refresh

- **Trigger:** Continue Stage 2 after “proceed on”; fix the visually observed magenta JPEG fringe without losing the violet palette; validate the latest gait support assertions; refresh every current branch tip and record new union evidence.
- **Evidence inspected:** pinned JPEG `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`; extracted `red/frame-01.png`, `blue/frame-02.png`, and `purple/frame-03.png`; pipeline source and real-input tests. At `2026-10-18T00:33:45Z` and refreshed again at `2026-10-18T00:45:49Z`, `gh pr list` + `git ls-remote --heads origin` found unchanged open #1–#4/#6/#7, closed-unmerged #5, candidate `db7c86d4@e4807c04cd90e00e83b5b84abdcf126e985d5387`, and `main@396ce256debcb5bdc2419cc0f3f399730b61ab36`; provisional `n = 8`. Reviewed #6 `fde6702→1177a1e`, #7 head `5b72c28` plus its app-tree summary, and candidate Stage 2/3 advancement (`43aa179`, `fd026c5`) plus its `e4807c0` ledger fix. Personally viewed one committed PR #7 audit sheet as a peer artifact; no peer code/tests were executed, and test claims remain other-reported.
- **Learnings:** the original strict strong-magenta metric was too narrow: a broad tint scan of the first red extract found 431 candidate pixels while the strict counter showed zero. A bounded eight-layer, connected magenta-hue fringe peel plus local matte estimation removed the visible halo; black outlines and violet garment interior remain. The metric now counts strong-magenta pixels and magenta-hued opaque pixels still touching the cleared matte; the synthetic test places a fringe ring outside a dark outline and purple fill. The regenerated 48-frame scan reports zero residual fringe-edge pixels; red, blue, and purple output images were personally viewed. Recomputed source diagnostics after this key change: mean quarter-cycle centroid-aligned IoU `0.9350` across 24 pairs (range `0.8466–0.9739`), maximum baseline range 26 px, maximum height range 24 px; these are method-specific source metrics. Generated and magnified the local 16×3 audit: phase 0.25 showed a detached head/torso because the solver's neck was not painted. Added `drawNeck` beneath the torso, asserted the stroke endpoints in a renderer test, and re-rendered; the gap is closed while overall stylized proportions remain unaccepted.
- **Adopted / deferred:** appended ADD-008 and ADD-009; regenerated the transparent sprites and source-analysis report; refreshed the matrix to `n = 8`; documented PR #7's added full implementation and the candidate's Stage 2/3 code while keeping PR #5 reference-only. The local audit is now visually reviewed, but runner style/proportion acceptance and browser/E2E acceptance remain open.
- **Validation actually run:** final-pin `npm ci` succeeded with zero vulnerabilities; `npm run validate` passed typecheck, lint, formatting, all 15 tests across four files (including run flight/no double support, walk/brisk-walk double support, and the renderer neck-connectivity regression), and production build. Both `npm audit` and `npm audit --omit=dev` reported zero vulnerabilities. `npm run pipeline` regenerated 48 frames on the 8×6 grid (129 px header, 316×261 cells, 24 near-pairs, spill metric 0). Vite `7.3.7` on `0.0.0.0:3000` returned HTTP 200.
- **Uncertainty / next:** browser automation remains unexecuted because no browser runtime is installed. The procedural audit was rendered and inspected with a temporary `@napi-rs/canvas@1.0.11` install (not added to the lockfile); the first install attempt failed on npm Arborist peer resolution, then succeeded with `--legacy-peer-deps`. Continue visual pose polish, add browser/E2E evidence when a runtime is available, keep the preview available, and refresh PR/remote hashes every turn.

### TURN-L005 · 2026-10-18 · Stage 2 P1 delivery, commit/push, and live refresh

- **Trigger:** Finish the current Stage 2 P1 implementation turn, preserve updated source metrics, commit and push only this session branch, and refresh active branch membership/tips before delivery.
- **Evidence inspected:** at `2026-10-18T00:49:41Z`, `gh pr list --repo wshyang/super-duper-funicular --state open/all` plus `git ls-remote --heads origin` confirmed open PR #1–#4/#6/#7 at the pinned hashes in `docs/BRANCH-COMPARISON.md`, PR #5 closed-unmerged/reference-only, candidate `arena/db7c86d4-super-duper-funicular@e4807c04cd90e00e83b5b84abdcf126e985d5387` without a PR, `main@396ce256debcb5bdc2419cc0f3f399730b61ab36`, and session branch `arena/a7a66eb6-super-duper-funicular@f777541169a091f4edf74c389e1dbe0394aac4ab` on origin. The subsequent docs-only commit `6c62cab7e99940bbf3f8a30122da807edd7f6d48` was pushed and confirmed by exact-ref `git ls-remote` at `2026-10-18T00:50:43Z`. Provisional active denominator remains `n = 8`; no peer tests or apps were run.
- **Learnings:** after the eight-layer matte-edge correction, regenerated source metrics are mean quarter-cycle centroid-aligned IoU `0.9350` across 24 pairs (range `0.8466–0.9739`), maximum baseline range 26 px, and maximum height range 24 px; these heuristics describe the source sheet only. The pinned generated report and comparison matrix now agree on the recomputed values. The neck-paint correction is regression-tested and locally visually reviewed, but a connected neck does not certify proportions or gait quality.
- **Adopted / deferred:** committed the Stage 2 P1 TypeScript pipeline, procedural runner, React studio, generated 48-frame output, tests, and current FDS/branch/validation records as `f777541169a091f4edf74c389e1dbe0394aac4ab`; pushed only `arena/a7a66eb6-super-duper-funicular`. Did not open a PR. Kept the immutable source JPEG and reference sheet intact; no peer assets or implementation were imported.
- **Validation actually run:** final clean `npm ci`; `npm run validate` passed 15 tests across four files, strict typecheck, ESLint, Prettier, and production build; `npm audit` and `npm audit --omit=dev` each reported zero vulnerabilities. `npm run pipeline` produced 48 frames, 24 near-pairs, and spill 0. Inline Markdown/link/anchor/cohort check passed for 16 files; `npm run format:check` and `git diff --cached --check` passed. Vite preview remains on port 3000 and served checked assets with HTTP 200.
- **Uncertainty / next:** browser/E2E acceptance is still open; broader runner proportion/stylization review is partial. The docs-only follow-up `6c62cab7e99940bbf3f8a30122da807edd7f6d48` was pushed and confirmed at `2026-10-18T00:50:43Z`. This final verification-note update will advance the session tip once more; capture its exact hash on the next per-turn refresh. Continue the feature-parity queue and maintain the closed-PR reference outside the active denominator.

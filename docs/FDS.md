# Functional Design Specification — Photographic Running-Sprite Pipeline

- **Version:** 0.1.0
- **Date:** 2026-10-18
- **Status:** **Draft proposal — no production pipeline or authoring mode has been approved**
- **Canonical contract:** this document; decisions outside it go in [`ADDENDA.md`](ADDENDA.md)
- **Source baseline:** `incorrect running sprites.jpeg` in the repository root
- **Reference implementations:** [PR #1](https://github.com/wshyang/super-duper-funicular/pull/1), reviewed at `936f37ce07f18e38fc4f5b3880c80029ec9f55cf`; [PR #8](https://github.com/wshyang/super-duper-funicular/pull/8), reviewed at `04d5caf432ff81be0307a3ec79e894da1b60045c`

---

## 1. Purpose and current state

Define a reproducible way to create, assemble, audit, and release photographic sprite assets for running animation without repeating the source-image, cutout, alignment, and visual-quality failures documented in PR #1 and PR #8.

The current checkout is a design/review baseline, not the application implemented in either PR. It contains the supplied JPEG and project documentation added for this review. The PR worktrees are separate, detached references and have not been merged or copied into this checkout.

The proposal leaves a key product choice open: **captured full-body frames, an articulated 2D/2.5D cutout rig, or a rendered 3D character exported as sprites**. These modes optimize for different things. The next implementation should not assume that independently generated body-part plates are the only or best source of photographic motion.

## 2. Background and evidence boundaries

### 2.1 Supplied reference sheet

The supplied JPEG was visually inspected as a magenta-backed, multi-row runner sheet. PR #1's flaw-analysis report describes it as a 6-row × 8-column sheet with four poses repeated across each row, a mean half-cycle silhouette IoU of 94.7%, unilateral lead-leg lock, no leg crossover, about 20 px of character-height variation, about 25 px of baseline variation, and magenta/JPEG chroma contamination. Those numerical findings are **reported by PR #1**, not independently recalculated in this baseline checkout.

### 2.2 Lessons from the two reviewed branches

- PR #8 (FDS v4.10.0) concentrated on rebuilding photographic athletic assets and a five-persona gait audit. Its records identify a diagonal/strap-gap neck cut, pelvis stripe/skin remnants, and up to +6 px of athletic support-foot penetration.
- PR #1 (FDS v5.1.0) incorporates and expands the earlier lessons: a 17-part articulated rig, per-persona calibration, prompt provenance, source-to-rig standing comparison, Raster-to-SVG exploration, and catalogs of image-generation and pipeline/calibration failures. It reports improved athletic ground-line range versus PR #8.
- Local, pinned-commit audits for this review passed typecheck, all 47 tests, and production build on both branches. Both also completed 16-frame, five-persona dumps with zero detached islands, magenta-spill pixels, and uncovered-joint frames. These counters did not guarantee visually seamless joints: the inspected magnified crops still showed cutout/texture discontinuities and overlaps.
- A ground-line delta based on the lowest pixel of either foot is not enough to prove correct stance. The audit needs a gait contact state and the identity/sole landmark of the expected support foot. Airborne frames must remain distinct from support frames.
- Thousands of semi-transparent edge samples were present in both photographic audit sets. PR #1 treats them as a normal antialiasing baseline, not as a demonstrated halo defect. Keep the count for comparison, but calibrate it against the actual matte and visual output before using it as a blocker.

See [`BRANCH_ASSESSMENT.md`](BRANCH_ASSESSMENT.md) for exact branch metrics, commands, provenance, and caveats.

## 3. Actors and goals

- **Asset author:** chooses a persona and visual direction, supplies or creates source material, reviews candidates, and approves releases.
- **Pipeline engineer:** maintains manifests, landmark/matte data, transformations, builds, automated audits, and reproducibility.
- **Animation consumer:** loads a complete, versioned sprite bank or frame set and must never receive a partially built asset set.

### Goals

1. Preserve a coherent identity, build, costume, lighting, camera angle, and scale across the selected animation mode.
2. Produce deterministic, inspectable outputs from immutable inputs and versioned configuration.
3. Detect source, matte, geometry, gait, and visual defects before promotion.
4. Support multiple personas without silently reusing another persona's silhouette, crop, or tuning.
5. Keep accepted artifacts and their provenance traceable; keep rejected candidates from replacing approved assets.

### Non-goals for this draft

- Selecting a specific image-generation provider, model, framework, runtime, or renderer.
- Treating generated archetype prompts as measured real-world body heights.
- Requiring every product to use a 17-part rig, SVG output, 3D, or frame-by-frame capture.
- Treating automated pixel counters as a substitute for visual review.

## 4. Core objects

| Object | Required information | Purpose |
|---|---|---|
| `SourceSet` | Persona/build ID, immutable file paths and byte hashes, license/permission, view/camera, generation or capture provenance | Defines which sources belong together and may be used for one output. |
| `BuildManifest` | Schema/build revision, source hashes, tool/code revision, canvas and color settings, output mode, configuration hash | Makes a build reproducible and auditable. |
| `LandmarkSet` | Normalized named joints, sole/toe/heel, canvas bounds, baseline and expected support-foot semantics | Replaces scattered undocumented pixel constants with reviewed geometry. |
| `MatteAndPartSpec` | Alpha/key method, semantic/material masks, part IDs, source regions, pivots, overlap/underlap and Z-order (when applicable) | Defines extraction and assembly without hidden persona-specific patches. |
| `AuditReport` | Per-frame phase/contact state, expected support foot, geometry/alpha metrics, artifact paths, visual approval status | Separates machine-checkable properties from human judgment. |
| `ApprovedRelease` | Complete manifest, output hashes, audit report, reviewer/status and immutable revision | Allows consumers to load only a fully accepted build. |

## 5. Functional requirements

### `#feat-source-set` — Coherent source set

Every build must refer to an approved source set for exactly one persona/build. A source set records whether material is captured, generated, or rendered; its provenance; its view; and all source hashes. Sources from another body tier or identity may be used only as explicitly declared layout/style references—not as a hidden replacement for the current persona's anatomy.

### `#feat-preflight` — Source validation and normalized geometry

Before extraction or rendering, validate decodability, dimensions, orientation, subject bounds, background/alpha assumptions, and required landmarks. For a keyed sheet, validate the grid rather than relying on hardcoded row/column guesses. For an articulated rig, store landmarks in normalized coordinates or against a declared source canvas and reject missing/out-of-bounds pivots.

### `#feat-matte` — Foreground and part extraction

Produce transparent foregrounds or explicitly authored masks. For chroma-key material, use edge-connected background detection and a calibrated matte/defringe step; preserve foreground colors that resemble the key. Keep semantic/material masks available for diagnostics. A successful keying pass must not be treated as proof that the subject silhouette or body-part extraction is correct.

### `#feat-assemble` — Mode-specific output construction

Build the selected mode from a complete, single-persona source set:

- **Captured-frame mode:** align/crop complete frames from one coherent motion sequence; preserve frame-to-frame identity and body texture.
- **Articulated 2D/2.5D mode:** assemble reviewed parts using normalized landmarks, explicit occlusion order, and enough texture underlap at joints. Avoid arbitrary non-uniform stretching and per-persona code forks.
- **3D-to-sprite mode:** render a locked camera, lighting and scale from one rigged identity; export transparent frames and the same audit manifest.

Mode selection is open until the intended editability, fidelity, and asset-authoring cost are clarified.

### `#feat-cycle` — Cyclic animation and support contract

A running loop must alternate lead/support legs, contain the intended stance and flight behavior, and close continuously at the loop boundary. Every audit frame identifies phase, contact state, and expected support-foot ID. In support phases, measure the intended outsole/sole landmark against the ground line; do not infer contact from the lowest pixel across both feet. In flight phases, report clearance separately.

### `#feat-audit` — Automated and visual quality gates

Generate a dense cycle audit (16 phases are the current review baseline) with a contact sheet, light/dark diagnostics, magnified joint/edge views where relevant, and neutral upright/source comparison where a rig is used. Automated checks cover determinism, source bounds, complete part sets, alpha/key contamination, connected components, landmark/pivot coverage, dimensions, cycle closure, and support geometry. A named reviewer must also approve identity, anatomy, silhouette, garment/material continuity, seams, texture, and motion.

### `#feat-release` — Atomic promotion and complete-bank readiness

Build candidates in staging. Promote a complete, approved manifest atomically; do not overwrite the active release while a build or audit is incomplete. Consumers receive either the previous valid release, the new complete release, or an explicit error—not a partially loaded mix.

## 6. User flow

1. Select a source mode, target persona/build, output size/style, and rights-cleared references.
2. Create or import a source set and record exact prompt/capture/render provenance.
3. Inspect source plates; reject or refine candidates before extraction.
4. Preflight and annotate landmarks/masks; build in staging from the source hashes and versioned configuration.
5. Review static output and neutral alignment, then render a dense cycle audit.
6. Run automated gates; inspect the full-cycle and magnified artifacts; record accept/reject decisions and defects.
7. Promote only the complete approved revision and retain the audit/provenance record.

## 7. Quality attributes

- **Reproducibility:** same source hashes, build code, manifest, and settings produce the same output hashes, except for explicitly documented nondeterministic generator stages.
- **Traceability:** every approved output points to its inputs, transformation/config versions, audit, and approval.
- **Isolation:** one persona's sources and tuning cannot leak into another persona's build through positional branches or shared hardcoded radii.
- **Failure safety:** invalid or partial builds cannot replace the last approved release.
- **Performance:** set a runtime/render budget only after the consumer and target device are known; no real-time performance claim is in scope yet.
- **Privacy and rights:** use only appropriately licensed/consented source material; retain only the source and derived imagery required by the project.

## 8. Draft acceptance criteria

The pipeline proposal is ready for an implementation pilot when the user selects the authoring mode and target output contract. A candidate implementation must then demonstrate:

1. A complete and provenance-bearing manifest for one persona.
2. A reproducible build from immutable sources and explicit landmarks/configuration.
3. No unreviewed key/matte or crop defects; no subject clipping or unexpected extra subject/limb.
4. A neutral source-vs-output comparison for rigged modes, with scale and baseline aligned.
5. A dense cycle report that separates stance from flight and measures the intended support sole.
6. Automated checks plus documented human approval of the contact sheet and magnified artifact views.
7. An atomic release path that cannot serve a partial part bank.

Thresholds such as allowable landmark error, support-foot tolerance, color spill, and minimum frame count remain to be calibrated on the selected output resolution and source mode. Values cited in PR documents are evidence about those branches, not approved acceptance thresholds for this project.

## 9. Open decisions

1. Is the primary goal one fixed, high-fidelity running loop, or a tuneable rig with editable gait/persona parameters?
2. Are rights-cleared photographic capture/video sources available, or must the source be generated/rendered?
3. Which output resolution, frame count, camera orientation, background/alpha format, and playback/runtime must be supported?
4. Which personas and visual variation are required in the first release?
5. What level of joint/seam visibility is acceptable at the target display scale?
6. Which build environment and image libraries are appropriate? No PR-specific stack is binding yet.
7. What are the quantitative tolerances for the selected mode, after a visually approved pilot establishes a baseline?

## 10. Prompt log and continuous learning

### Image-generation prompt log

No image-generation calls were made in the current baseline review. Historical prompts in PR #1 and PR #8 remain in their respective worktrees and are not copied here as if they were generated for this project. Future calls must be logged verbatim with references, destination, settings/provenance, and acceptance or regeneration reason.

### Continuous learning register

#### `TURN-L01` — Comparative branch review and pipeline proposal (2026-10-18)

- **Context:** Assess PR #1 and PR #8 separately, review their FDS background, adopt applicable GREENFIELD/CLAUDE discipline, and propose a corrected photographic-sprite workflow without changing either PR worktree.
- **Evidence:** Reviewed PR #1 at `936f37ce07f18e38fc4f5b3880c80029ec9f55cf` and PR #8 at `04d5caf432ff81be0307a3ec79e894da1b60045c` in `/home/user/pr-review/pr-1` and `/home/user/pr-review/pr-8`; read both FDS documents and the shared `FDS_BUILDER.md`, `GREENFIELD.md`, and project `CLAUDE.md`; ran `npm run typecheck`, `npm test -- --run` (47 tests), and `npm run build` in each worktree; ran `npm run dump-cycle -- /tmp/review-pr1 16 all-personas red` and the equivalent `/tmp/review-pr8` command; visually inspected persona contact sheets and athletic joint-crop sheets; queried PR checks (none reported); ran `npm audit` against the identical dependency manifests (six dev-tool findings: three moderate, one high, two critical).
- **Learning:** PR #1 documents substantially more failure/recovery detail and reports improved athletic ground range, while PR #8's targeted rebuild exposes neck/pelvis/support-foot regressions. Both pass their local technical gates, but automated counters passed while magnified images still showed perceptual joint/texture discontinuities. The shared audit's `lowestFootY` does not identify the expected support foot, so contact correctness needs a support-aware metric. Semi-transparent edge counts need visual calibration rather than automatic rejection.
- **Decision / scope:** Add a project-specific FDS and proposal; keep the branch worktrees separate and unchanged; preserve GREENFIELD as an upstream template but apply only relevant engineering rules through this `CLAUDE.md`; do not copy either PR's implementation, stack assumptions, or all-branch parity obligation into the baseline.
- **Validation / next:** Both PR worktrees remained clean; all local Markdown link targets resolve; `git diff --cached --check` passed for the documentation patch. The next decision is the source mode (captured sequence, articulated 2D/2.5D, or 3D-to-sprites) and target output contract; no production implementation has been started.

## 11. Changelog

| Version | Date | Summary |
|---|---|---|
| `0.1.0` | `2026-10-18` | Established this draft contract from the PR #1/#8 reviews and added the initial learning entry. |

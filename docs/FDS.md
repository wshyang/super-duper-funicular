# Functional Design Specification — Photographic Running-Sprite Pipeline

- **Version:** 0.2.0
- **Date:** 2026-10-18
- **Status:** **Draft — concrete 3D-to-sprite pilot selected; production assets not yet approved**
- **Canonical contract:** this document; decisions outside it go in [`ADDENDA.md`](ADDENDA.md)
- **Source baseline:** `incorrect running sprites.jpeg` in the repository root
- **Reference implementations:** [PR #1](https://github.com/wshyang/super-duper-funicular/pull/1), reviewed at `936f37ce07f18e38fc4f5b3880c80029ec9f55cf`; [PR #8](https://github.com/wshyang/super-duper-funicular/pull/8), reviewed at `04d5caf432ff81be0307a3ec79e894da1b60045c`

---

## 1. Purpose and current state

Define a reproducible way to create, assemble, audit, and release photographic sprite assets for running animation without repeating the source-image, cutout, alignment, and visual-quality failures documented in PR #1 and PR #8.

The current checkout is a design/implementation baseline, not the application implemented in either PR. It contains the supplied JPEG, project documentation, and a tested Python/Pillow atlas packer; it does not yet contain a 3D model, Blender scene, run animation, or render exporter. The PR worktrees are separate, detached references and have not been merged or copied into this checkout.

For the requested first implementation, use one concrete 3D-to-sprite path: AI-generated reference art → textured Tripo image-to-3D GLB → Mixamo auto-rig/run cycle → Blender cleanup, foot-contact correction, and orthographic render → transparent PNG atlas. The pilot defaults are one fictional athletic runner, 16 frames at 24 fps, `220 × 256` per frame, a 4 × 4 atlas, and a top-origin ground line at `y = 234`. Exact steps are in [`AI_3D_TO_SPRITE_IMPLEMENTATION.md`](AI_3D_TO_SPRITE_IMPLEMENTATION.md). These are pilot settings, not yet a production contract.

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

- Treating the pilot's external tools or settings as a final production commitment before the model and rendered cycle pass review.
- Treating generated archetype prompts as measured real-world body heights.
- Requiring the eventual product to use a 17-part rig, SVG output, or the pilot's exact frame count.
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

The v1 pilot uses 3D-to-sprite as defined in [`AI_3D_TO_SPRITE_IMPLEMENTATION.md`](AI_3D_TO_SPRITE_IMPLEMENTATION.md); changing the pilot mode later requires a recorded addendum.

### `#feat-cycle` — Cyclic animation and support contract

A running loop must alternate lead/support legs, contain the intended stance and flight behavior, and close continuously at the loop boundary. Every audit frame identifies phase, contact state, and expected support-foot ID. In support phases, measure the intended outsole/sole landmark against the ground line; do not infer contact from the lowest pixel across both feet. In flight phases, report clearance separately.

### `#feat-audit` — Automated and visual quality gates

Generate a dense cycle audit (16 phases are the current review baseline) with a contact sheet, light/dark diagnostics, magnified joint/edge views where relevant, and neutral upright/source comparison where a rig is used. Automated checks cover determinism, source bounds, complete part sets, alpha/key contamination, connected components, landmark/pivot coverage, dimensions, cycle closure, and support geometry. A named reviewer must also approve identity, anatomy, silhouette, garment/material continuity, seams, texture, and motion.

### `#feat-release` — Atomic promotion and complete-bank readiness

Build candidates in staging. Promote a complete, approved manifest atomically; do not overwrite the active release while a build or audit is incomplete. Consumers receive either the previous valid release, the new complete release, or an explicit error—not a partially loaded mix.

## 6. User flow

1. Generate and approve the fictional athletic-runner reference images; record exact prompt/reference provenance.
2. Create a textured GLB from the approved reference, clean it in Blender, auto-rig/apply a run action through Mixamo, then correct support-foot contacts in Blender.
3. Render the fixed 16-frame cycle and record the expected support foot and sole marker for each frame.
4. Pack the transparent frames with the tested atlas tool and retain source/build hashes and the contact manifest.
5. Review the neutral model, full-cycle atlas, and magnified frames; reject identity, texture, deformation, contact, or loop defects.
6. Run the packer and contact checks; record technical results separately from human visual approval.
7. Promote only the complete approved revision and retain the audit/provenance record.

## 7. Quality attributes

- **Reproducibility:** same source hashes, build code, manifest, and settings produce the same output hashes, except for explicitly documented nondeterministic generator stages.
- **Traceability:** every approved output points to its inputs, transformation/config versions, audit, and approval.
- **Isolation:** one persona's sources and tuning cannot leak into another persona's build through positional branches or shared hardcoded radii.
- **Failure safety:** invalid or partial builds cannot replace the last approved release.
- **Performance:** set a runtime/render budget only after the consumer and target device are known; no real-time performance claim is in scope yet.
- **Privacy and rights:** use only appropriately licensed/consented source material; retain only the source and derived imagery required by the project.

## 8. Draft acceptance criteria

The v1 pilot path and its concrete frame-level gates are defined in [`AI_3D_TO_SPRITE_IMPLEMENTATION.md`](AI_3D_TO_SPRITE_IMPLEMENTATION.md). The first render can begin when an approved source image has been converted into a textured GLB and a Mixamo-rigged run-cycle FBX is available. A production-ready pipeline must demonstrate:

1. A complete and provenance-bearing manifest for one persona.
2. A reproducible build from immutable sources and explicit landmarks/configuration.
3. No unreviewed key/matte or crop defects; no subject clipping or unexpected extra subject/limb.
4. A neutral source-vs-output comparison for rigged modes, with scale and baseline aligned.
5. A dense cycle report that separates stance from flight and measures the intended support sole.
6. Automated checks plus documented human approval of the contact sheet and magnified artifact views.
7. An atomic release path that cannot serve a partial part bank.

The pilot starts with 16 frames and an absolute support-sole tolerance of 1 px. Other production thresholds (including color spill, cycle closure, and runtime/render budgets) must be calibrated on the actual output and target display. Values cited in PR documents are evidence about those branches, not approved thresholds for this project.

## 9. Decisions deferred until after the pilot

1. Does the fixed run-in-place sprite loop meet the product need, or is a tuneable runtime rig required for a later production release?
2. Are Tripo and Mixamo accessible under terms suitable for the intended use and distribution?
3. Before production promotion, do the pilot defaults (`220 × 256`, 16 frames, 24 fps, right-facing orthographic camera, transparent RGBA, ground line `y = 234`) match the target display/runtime? This does not block the first pilot render.
4. After inspecting the first generated reference, does it meet the approved fictional-runner direction in the implementation guide? Reject/regenerate before model generation if not.
5. What visible seam/deformation level is acceptable at native display size?
6. What additional measurable production thresholds should be set after visual approval? The pilot starts with an absolute support-sole tolerance of 1 px.

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

#### `TURN-L02` — Concrete AI-to-3D-to-sprite pilot (2026-10-18)

- **Context:** User rejected an open-ended mode proposal and asked for a concrete step-by-step implementation of the 3D-to-sprite route using AI-generated art.
- **Evidence:** Checked the base checkout: no Blender executable, `.glb`, `.fbx`, or application pipeline is present. Added `tools/sprite_pipeline/pack_atlas.py` with a pinned Pillow dependency and tests; exercised it on synthetic 16-frame RGBA inputs and inspected the `880 × 1024` atlas and manifest. No image-generation call, 3D model, or production render was made.
- **Decision:** Fix the v1 pilot path to separate AI design references → textured Tripo GLB → Blender cleanup → Mixamo rig/run action → Blender support-foot correction and locked-camera render → tested atlas packer. Use 16 frames, `220 × 256`, 24 fps, 4 × 4 atlas, ground row 234, and a 1 px support-sole tolerance as provisional pilot settings. Record the selected workflow in `ADD-003`; keep production release approval pending.
- **Learning:** A concrete export contract can be implemented and tested before a character model exists: require consecutive RGBA frames, preserve exact cell pixels, hash each source/output, record alpha bounds, and fail the support-foot gate when the expected sole marker exceeds tolerance. A rendered image still cannot be claimed until a textured GLB and rigged cycle are supplied and visually reviewed.
- **Validation / next:** Pillow 13.0.0 unit suite passed (10 tests). A synthetic 16-frame RGBA run packed to `880 × 1024`; its 16-entry contact sidecar passed and the manifest recorded the expected support foot and `0 px` sole error. The first test-discovery attempt failed because the tests folder lacked `__init__.py`; adding the package marker fixed discovery. The next external input is the approved textured GLB and corresponding run-cycle FBX; Blender rendering remains unverified in this sandbox.

## 11. Changelog

| Version | Date | Summary |
|---|---|---|
| `0.1.0` | `2026-10-18` | Established this draft contract from the PR #1/#8 reviews and added the initial learning entry. |
| `0.2.0` | `2026-10-18` | Selected the concrete AI-generated-reference → textured 3D model → auto-rig → Blender render pilot and added a tested RGBA atlas packer with per-frame provenance and support-foot sidecar checks. |

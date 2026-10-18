# Project instructions — Photographic Runner Sprite Pipeline

This is the project-specific working agreement for the current repository. It adopts the durable engineering practices represented by `GREENFIELD.md` and the reviewed PR branches, while deliberately not copying their project- or session-specific stack bindings.

## Repository state and source of truth

- The checkout began as an intake/review baseline with the supplied source asset `incorrect running sprites.jpeg`. It now also contains a tested Python/Pillow atlas packer, but no generated character, rig, Blender scene, or rendered production cycle.
- The current canonical product/design contract is [`docs/FDS.md`](docs/FDS.md). Record decisions that extend or change it in [`docs/ADDENDA.md`](docs/ADDENDA.md), in the same change.
- [`docs/AI_3D_TO_SPRITE_IMPLEMENTATION.md`](docs/AI_3D_TO_SPRITE_IMPLEMENTATION.md) is the selected v1 pilot recipe. [`docs/REVISED_PHOTOGRAPHIC_SPRITE_PIPELINE.md`](docs/REVISED_PHOTOGRAPHIC_SPRITE_PIPELINE.md) explains the failure rationale and alternatives; it does not supersede the concrete pilot steps.
- [`docs/BRANCH_ASSESSMENT.md`](docs/BRANCH_ASSESSMENT.md) records evidence for PR #1 and PR #8. Their checkouts at `/home/user/pr-review/pr-1` and `/home/user/pr-review/pr-8` are separate, detached review worktrees. Keep them separate and unchanged unless explicitly asked to work on them.
- `GREENFIELD.md` is a verbatim upstream standing-instructions template from `wshyang/greenfield` at `8ba74027be5fad41e48cadde82cc0120d628b109`. Treat it as a reference template; this file is the project-specific overlay.

The PR branches contain useful but nonbinding implementation-specific material (TypeScript/React/Vite, databases, containers, SHIP-HATS, and a multi-branch parity ledger). None of those choices is adopted for this baseline unless the FDS later selects it. In particular, do not inherit their session branch names, watchlists, scripts, or requirement to maintain parity with every repository branch.

## Core discipline

### 1. Spec first; log decisions and learnings

- Read the relevant FDS sections before changing the product or its pipeline.
- If a decision is not already required by the FDS or the user's request, add a numbered entry to `docs/ADDENDA.md` in the same change: decision, rationale, FDS anchor, and practical impact.
- Maintain the FDS learning log for substantive implementation, investigation, and visual-review turns. Each entry should distinguish evidence, interpretation, decisions, validation, and next steps. Do not invent a learning when nothing changed.
- Preserve rejected experiments and why they failed when that knowledge prevents a likely repeat.

### 2. Image-generation and asset-provenance gate

For every future image-generation call, record the exact prompt verbatim, references, destination path, model/service and settings when available, date, and the resulting asset's status. If replacing an existing candidate, include the reason and preserve the prior decision/provenance. No image-generation call has been made for this baseline so far.

Immediately inspect generated source plates and extracted/assembled outputs visually. Review the full figure as well as the individual parts; a technically valid cutout can still have the wrong identity, anatomy, silhouette, camera angle, garment, or joint texture. Keep rejected candidates out of the approved asset path. Never call a generated height or body measurement a real-world measurement unless it was actually measured.

### 3. Test real image behavior and report evidence honestly

- Add or update tests in the same change as behavior. Use real image decoding, matte/keying, segmentation, transform, compositing, and gait paths for integration coverage; do not mock away the geometry whose correctness is under test. Small synthetic fixtures are appropriate for controlled edge cases.
- Test deterministic outputs from the same source/configuration and exercise malformed, clipped, transparent, and color-contaminated inputs.
- Separate four claims in reports: source code read; visuals personally opened and inspected; commands locally executed; and findings reported by another branch. Never present branch-reported results as tests run in this checkout.
- When a toolchain is unavailable, state exactly which checks ran and what remains. Do not use “tests pass” for static inspection alone.

### 4. Visual audit is a required release gate

For any change to extraction, part masks, joints, gait, or compositing:

- Render a dense full-cycle audit (16 phases are the current review baseline) for every affected persona, plus a neutral upright/source comparison.
- Inspect the contact sheet, magnified joint crops, and relevant individual frames on both light and dark diagnostic backgrounds.
- Include explicit phase/contact state and the **expected support-foot identity** in the report. A `lowestFootY` measurement that picks either foot is not proof that the intended stance foot is grounded.
- Use automated checks for repeatability, bounds, alpha/key contamination, connected components, pivots, dimensions, and kinematics, but do not treat zero islands, zero spill, or covered pivot pixels as proof of perceptual quality. Human review of texture continuity, seams, anatomy, and identity remains mandatory.
- Promote only reviewed assets. Store source hashes, configuration/landmark revisions, build code revision, audit results, and approval status with each build.

### 5. Code design when implementation begins

Adopt the applicable GREENFIELD design rules: one concern per function/module; guard clauses; nesting depth no greater than three; three parameters maximum before introducing a typed parameter object; no boolean flag parameters; names that expose intent; pure functions for geometry/kinematics; and side effects at narrow I/O boundaries. Aim for functions under 20 lines and treat 50 as a hard target unless a well-supported exception is recorded. Keep files around 400 lines where practical and split before 800. Avoid speculative abstractions and duplicated per-persona branches; prefer a typed, data-driven persona/build manifest.

If a UI framework is later selected, keep presentation components declarative and move domain decisions into testable hooks/state modules; keep inline event handlers to wiring. Apply `data-testid` conventions only if a UI and its test strategy are adopted. Backend, ORM, database, container, deployment, and CI rules from the template are conditional on those systems actually entering scope.

### 6. Photographic-runner specifics

- Calibrate each persona from its own approved master and landmark set. Do not reuse one body tier's outline/radii as another's source of truth, or “fix” bad source anatomy by shrinking bones until proportions look stunted.
- Keep source geometry, semantic/matte masks, landmarks, rig transforms, and per-persona tuning versioned and inspectable; avoid hidden pixel-coordinate exceptions in shared code.
- Keep the original source immutable. Generate candidate outputs into staging and promote them atomically only after automated and visual gates pass.
- The selected v1 pilot uses AI-generated design references → textured 3D model → rigged run cycle → Blender-rendered sprites. Treat this as a concrete pilot, not automatic approval of production art or a permanent product-wide authoring constraint. See `docs/AI_3D_TO_SPRITE_IMPLEMENTATION.md` and record any route change in `docs/ADDENDA.md`.

## Session and branch safety

Follow the active branch supplied by the Arena session; do not switch or rename it. For comparative reviews, pin the exact commit SHA, use separate detached worktrees, and distinguish “latest observed” from “semantically reviewed.” Do not edit PR #1 or PR #8 worktrees while implementing in this baseline checkout.

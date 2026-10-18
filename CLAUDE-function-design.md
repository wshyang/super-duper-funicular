# Function, module, and UI design

Apply the useful Greenfield limits without making code golf an end in itself:

- Target function bodies at **20 lines or fewer**; **50 lines is a review hard limit** unless a clearly documented exception (for example, declarative JSX or generated code) is justified.
- Keep nesting to three levels or fewer; use guard clauses and named helpers.
- Use at most three positional parameters. Beyond that, use a typed options/parameter object. Avoid boolean flag arguments; use named options or separate operations.
- Aim for files below 400 LOC; split before 800 LOC. Group by domain (`geometry`, `gait`, `rig`, `pipeline`, `render`, `app`), not generic file type. Avoid cycles between peer domains.
- Prefer pure functions and immutable domain state. Separate queries from modifiers. Canvas contexts and pixel buffers may be mutated only at explicit rendering/I/O boundaries; never let that mutation leak into gait or settings state.
- Use descriptive names and named, tested constants for biomechanical values, thresholds, units, and image-coordinate transforms. Do not port a number without its coordinate space and derivation.

## Domain/UI boundary

The engine (phase, gait, IK, part geometry, image processing, scene composition, analysis) lives in framework-independent TypeScript modules. React components own layout, view-only state, and simple event wiring; hooks/models own validation, derived state, asset loading, and application workflows. No domain math or image-pipeline work in JSX or inline handlers. If a future view is not React, preserve the same view/model boundary.

Render the pose once and share the same scene/renderer for the live stage, thumbnails, cycle diagnostics, and exports. Do not build a separate simplified exporter that drifts from the app.

## Interactive controls and contracts

- Every interactive element has `data-testid="{component-kebab}__{element-role}"` and an accessible name/label. Repeated rows use a shared test ID and a semantic anchor to distinguish them.
- Wire/manifest contracts are typed once and validated at their boundary. Generated manifests are updated with their producer and tests in the same change.
- UI copy describes the tool to the user. Keep internal slugs, addendum IDs, and design rationale in docs/comments, not labels.
- Keep controls within explicit motion/profile ranges. Define units and clamping/rejection behavior in `docs/FDS.md`; preserve settings across view/persona changes unless the FDS says otherwise.
- Calibration inspectors must be reversible and isolated: reset restores the reference rendering, test rotation does not mutate the main pose, and downloaded settings do not silently persist.

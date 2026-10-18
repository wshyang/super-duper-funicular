# Revised Photographic-Sprite Pipeline — Proposal

- **Status:** Design proposal; not yet selected or approved for implementation.
- **Background:** [`FDS.md`](FDS.md) and [`BRANCH_ASSESSMENT.md`](BRANCH_ASSESSMENT.md).
- **Constraint:** PR #1 and PR #8 remain separate review worktrees; this proposal does not import their code.

## 1. Recommendation

Do not respond to the branch failures by adding more unstructured prompt retries or more hidden per-persona pixel-coordinate patches. Adopt a **source-first, manifest-driven pipeline** with an early authoring-mode decision, a small one-persona pilot, explicit normalized landmarks, deterministic build inputs, and two independent quality gates: automated measurements **and** human visual approval.

The branches demonstrate that a 17-part cutout rig can be animated and tested, but also that good telemetry can coexist with visible seams. If the product needs one fixed photographic run loop, complete captured/rendered frames are likely a better first comparison than cutting the body into 17 pieces. If it needs arbitrary gait tuning or reusable parts, keep a rig—but make the source set, masks, landmarks, overlap, and per-persona tuning explicit data rather than scattered extractor exceptions. A 3D-to-sprite route is a third option when long-term pose/scale control justifies the higher setup cost.

**Do not default to independently generated full-cycle diffusion frames.** They may change identity, costume, limb count, or camera between frames. Use generation as a source-creation aid, then accept a source set only after identity and pose review; prefer a controlled capture or a consistently rigged/rendered character for final motion.

## 2. Authoring-mode decision gate

| Mode | Best fit | Advantages | Main risks/costs |
|---|---|---|---|
| **Complete captured/rotoscoped frame sequence** | One or a few fixed actions; highest photographic continuity | No artificial shoulder/hip/shoe cut seams; preserves natural body texture and clothing folds | Requires a rights-cleared, consistent capture; less parametric; more frames/storage; loop cleanup and background removal still need work |
| **Articulated 2D/2.5D cutout rig** | Tuneable phase, body proportions, and gait using sprite parts | Reusable parts, low runtime cost, tunable kinematics | Hardest mode for texture continuity, hidden/far-side anatomy, joint overlap, and non-rigid shoe roll; more annotation and visual repair |
| **Rigged 3D character rendered to sprites** | Many actions, personas, and scale/pose variations | One identity and camera can render many deterministic poses; joints/contact are solved before sprite export | Higher modeling/rigging cost; photorealism and texture quality are not automatic; requires a 3D toolchain |

**Pilot rule:** compare options using the same one-persona art direction and target output size. Evaluate a neutral frame and representative contact, pass, flight, and opposite-contact frames. Select on required editability, visual continuity at display size, authoring cost, and storage/runtime constraints—not on which branch already has more code. A 16-phase cycle is the review baseline, not a settled production frame count.

## 3. Failure-to-countermeasure map

| Failure observed or reported in the reviewed work | Structural countermeasure in the proposal |
|---|---|
| The supplied sheet reportedly repeats four poses, locks the lead leg, lacks crossover, and varies in character height/baseline. | Treat animation correctness as a source/kinematics requirement. Do not try to repair a broken cycle with deduplication or extraction alone. Build a genuinely alternating cycle or use a coherent captured/rendered sequence; align frames using explicit root and sole landmarks. PR #1's numeric source-sheet findings remain branch-reported until independently rerun. |
| Generated plates drift in camera angle, chirality, anatomy, clothing, or identity. | Lock the camera and view in a source-set brief; use one canonical identity reference per persona; include explicit anatomical orientation (the PR #1 L-bend prompt was a useful chirality safeguard); reject any plate that fails a visual gate. Prompts reduce risk but do not replace review. |
| Cross-persona references lock a fuller/slimmer body to the wrong silhouette; shared extraction radii or bone scaling create unnatural proportions. | Give each persona its own approved master, normalized landmarks, and tuning record. Use other personas only as declared layout/style references. Derive rig proportions from the chosen source; never compensate for a bad source by shrinking bones into a visibly stunted pose. |
| Neck/shoulder/torso, shorts/hip, and ankle/shoe cuts leave diagonal gaps, stripes/skin slivers, seams, or overlaps. | Use a continuous full-body reference as the alignment oracle; annotate overlap/underlap and Z-order; preserve enough texture beyond each joint; inspect assembled poses at native scale and magnified. Use controlled caps/cuffs or hand-authored seam repairs only as explicit, versioned data. If the rig cannot meet visual quality, switch mode instead of extending a patch chain. |
| Extra or overlapping shoe/limb fragments and clipped source edges. | Preflight subject bounds and expected part topology; require a per-part visual approval; detect unexpected connected components and source-frame clipping; include feet and end frames in the audit. |
| Chroma-key spill, color fringe, or transparent edges are ambiguous. | Preserve alpha where available; otherwise use boundary-connected keying, matte refinement and edge decontamination. Report edge/fringe metrics by location and width; calibrate against viewed artifacts rather than treating every semi-transparent pixel as a defect. |
| Zero islands, spill, and uncovered pivots coexist with perceptible seams. | Make the visual review gate mandatory and separate from telemetry. Structural counters cannot certify texture continuity, anatomy, identity, or a clean silhouette. |
| Ground-line reports conflate the two feet or flight/contact phases. | Add explicit per-phase contact state and expected support-foot ID. Measure the selected outsole/sole landmark against the ground only during its support phase; measure flight clearance separately. |
| Cached or partially rebuilt assets can hide whether reviewed art is current. | Key outputs by source/config/code hashes, build in staging, and atomically promote only a complete approved revision. Consumers may use only one complete release. |

## 4. Proposed pipeline stages

### Stage 0 — Lock the output contract

Before producing production assets, specify persona/build, target display dimensions, facing/camera, required actions and adjustability, output format, frame count/playback expectations, intended device/runtime, rights, and acceptable visual style. For any height-based comparison, distinguish an illustrative archetype estimate from a measured fact. Keep physical display scale separate from source-image pixel height.

### Stage 1 — Create an approved source set

1. Choose the authoring mode from §2 for a one-persona pilot.
2. For generated plates, use a canonical persona master and a consistent camera/layout brief. Record exact prompts, referenced images, model/service, settings/seed when available, output path, date, hashes, and accept/reject reason. Use the same persona's approved master for anatomy; do not let another body tier become the hidden shape template.
3. For captured frames, record consent/license, capture settings, camera position, lighting, background, and frame-selection rules.
4. Keep raw sources immutable. Put experiments in a candidate area; only approved, provenance-bearing sources enter a release build.
5. Review every source for identity, facing, silhouette, complete anatomy, outfit, edges, stray limbs/shoes, shadows, and framing before any extraction begins.

### Stage 2 — Preflight and geometry annotation

Decode each input and verify its file hash, dimensions, orientation, color profile, alpha/background assumptions, subject bounds, and expected view. For a grid sheet, detect or explicitly configure the grid and render an overlay for review; do not silently reuse guessed row/column coordinates.

Store named landmarks in a versioned file relative to a declared canvas or normalized foreground bounds: root/waist, neck, shoulders, elbows, wrists, hips, knees, ankles, heel, ball, toe, and the sole contact point. Record which landmarks are estimates and which have been reviewed. Define semantic/material masks (skin, fabric, shoe, hair, background) where they help distinguish a real key spill from a foreground color.

### Stage 3 — Matte and part construction

- Prefer an existing trustworthy alpha channel. For keyed sources, use edge-connected background classification plus a calibrated matte/defringe stage; protect foreground colors that happen to be near the key color.
- Make mask generation inspectable: show the source, alpha, edge composite, and extracted parts together. Never treat a magenta-pixel count alone as sufficient.
- For a rig, declare every part's source, pivot, local coordinates, overlap allowance, and draw order in data. Use similarity/isotropic transforms by default; document and test any intentional non-uniform warp.
- Preserve enough source texture on both sides of a joint so the moving parts overlap during rotation. Treat shoulder/neck, shorts/hip, sock/ankle, and heel/forefoot as explicit high-risk seams.
- Avoid shared coordinate constants that silently crop a different persona. Keep any necessary persona-specific repair local, named, reviewable, and covered by a real-asset regression test.

### Stage 4 — Build one neutral reference before animation

For a rigged mode, assemble a neutral upright profile first. Align the source and assembled figure by foreground bounds, normalized height, and a declared sole baseline; compare the head, torso, hip, limb lengths/widths, and garment landmarks side by side. This prevents gait tuning from masking a bad source cutout or wrong proportions.

For captured-frame or 3D-rendered modes, produce the same neutral/profile diagnostic to establish scale, camera, transparency, and ground-line conventions. Do not normalize away true persona/build differences merely to make a comparison look tidy.

### Stage 5 — Generate or assemble the cycle

Use a phase model that explicitly names stance, transition, flight, and expected support foot. Enforce alternating lead legs and a continuous loop boundary. For a rig, solve kinematics separately from rendering and keep texture deformation modest; if the chosen source cannot survive the needed bends, acquire pose-specific source material or change authoring mode rather than stretching it until it breaks. Model shoe roll with a documented heel/ball/toe convention and audit its contact surface.

### Stage 6 — Run two independent quality gates

#### Automated gate

Record a machine-readable report for each persona/build and phase:

- source and output hashes; complete manifest/part-bank status; deterministic rebuild result;
- image decode, bounds, alpha/matte/key spill, unexpected connected components, and clipping;
- normalized landmark/pivot coverage and neutral source-to-output geometry;
- phase, contact state, expected support foot, selected sole-to-ground error, and separate flight clearance;
- cycle closure and duplicate-pose checks (with intentional holds explicitly declared);
- asset/cache revision and the exact tuning/configuration used.

Do **not** use only a global minimum-foot Y or raw semi-transparent pixel count as a pass/fail decision. A 16-frame `dump-cycle` should expose enough data to reproduce every reported value.

#### Human visual gate

A reviewer opens the actual source plates, extracted assets, neutral comparison, full-cycle contact sheet, magnified joint/edge crops, and representative light/dark/alpha diagnostics. Review every persona—not only the athletic default—for identity, camera, anatomy, build, proportions, garment/skin continuity, silhouette, duplicate limbs/shoes, joint seams, contact, and motion. Record an explicit accept/reject decision and defects. Do not approve a candidate simply because the automated report is green.

#### Starting threshold proposal (calibrate during pilot)

- No clipped subject, missing required landmark, unexpected subject/limb, or incomplete part bank.
- No exact duplicate pose within a cycle unless explicitly marked as an intentional hold.
- At a designated support phase, the expected sole point should start within roughly 1 px of the ground line at target resolution; allow no more than 2 px of penetration without an explicit art-direction exception. Tune this against the actual footwear/matte and make the sign convention explicit.
- Cycle closure and source-alignment tolerances should be measured at target output size and fixed after the pilot. Do not backfill thresholds from the best branch's current metrics.
- Visual approval of all required sheets/crops is always required, regardless of numeric pass/fail.

### Stage 7 — Promote atomically

Write candidate assets and reports to staging. Compute a build revision from source hashes, manifest/landmark versions, extractor/renderer revision, and tuning. Promote by updating one active manifest/pointer only after both gates pass. Keep the previous approved release intact for rollback. Reject or flag any request that would load a mixed or partial set.

## 5. Suggested manifest shape

The following is illustrative, not a finalized schema:

```json
{
  "schemaVersion": 1,
  "personaId": "photo-runner-example",
  "mode": "cutout-rig",
  "sourceSet": {
    "master": { "path": "sources/master.png", "sha256": "..." },
    "licenseOrConsent": "recorded reference"
  },
  "view": { "facing": "right", "camera": "orthographic-profile" },
  "canvas": { "width": 0, "height": 0, "groundY": 0 },
  "landmarks": { "path": "landmarks.json", "revision": "..." },
  "parts": { "path": "parts.json", "count": 0 },
  "generation": {
    "promptLog": "prompts.md",
    "provider": "recorded when applicable",
    "settings": "recorded when available"
  },
  "build": { "codeRevision": "...", "configHash": "..." },
  "audit": {
    "machineReport": "audit.json",
    "visualReview": { "status": "pending", "reviewer": null }
  },
  "release": { "status": "candidate", "revisionHash": "..." }
}
```

A real schema must validate required values, relative paths, hash formats, and mode-specific requirements. Do not copy the example's zero dimensions or placeholder strings into production data.

## 6. Rollout plan

1. **P0 — Decide requirements:** answer the open FDS questions; choose one persona and target output size; identify available rights-cleared capture/source material.
2. **P1 — Compare source modes:** produce a small neutral/contact/pass/flight/opposite-contact pilot for the viable modes. Review the outputs at the intended display scale and magnified. Avoid building UI or persona breadth before this test.
3. **P2 — Implement the selected manifest and deterministic build:** version source provenance, landmarks/masks, extraction/rendering, and machine-readable audit. Make the neutral comparison a gate.
4. **P3 — Complete one persona:** run the dense cycle, correct source or mode problems, and secure explicit visual approval. If a 2D rig still needs repeated visible seam patches, stop and reconsider full-body frames or 3D-to-sprite output.
5. **P4 — Expand personas:** add one persona at a time from an independent approved source set; compare each against its own neutral reference and its own full-cycle audit.
6. **P5 — Release integration:** add consumer/runtime behavior only after complete-bank and atomic-promotion behavior are defined and tested.

## 7. Decisions still needed

- Fixed loop versus tuneable gait/rig.
- Capture availability/rights versus generated source versus 3D avatar.
- Target resolution, production frame count, display scale, and runtime.
- Required personas and acceptable visual style.
- Maximum acceptable seam/texture discontinuity at the actual viewing size.
- Whether a 3D toolchain or frame-by-frame asset size is acceptable.

Until those are answered, this document is a concrete proposal for a pilot—not an authorization to generate or commit a new production asset set.

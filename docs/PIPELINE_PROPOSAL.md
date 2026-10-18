# Revised Photographic Sprite Pipeline — Ideation & Proposal (P2)

- **Status:** Proposal for review (`ADD-003`..`ADD-009` record the decisions underpinning it)
- **Author branch:** `arena/7f9c98b1-super-duper-funicular`
- **Inputs:** `docs/BRANCH_ASSESSMENT_PR1_PR8.md` (evidence), PR `#1` FDS v5.1.0 §8–§12, PR `#8` FDS v4.10.0 + `TURN-L01..L21`, flawed reference sheet analysis
- **Goal:** generate **photographic sprite-based elements for running animations** without the texture destruction, tone seams, joint gaps, and melted shoes that both existing branches hit.

---

## 1. Design doctrine

**D1 — A photograph is a baked rendering.** Identity × pose × light × lens are inseparably composited in one bitmap. Any pipeline that re-poses a photograph with 2-D warps inherits exactly the defects measured on PR `#1`/`#8` (`TEX-ERR`, `TONE-ERR`, `JOIN-ERR`, `SHOE-ERR`). Therefore: **change what is photographed, not how photographs are warped.**

**D2 — The rig is the oracle, not the renderer.** The 17-part IK rig and gait solver are excellent *pose ground truth* (both branches prove correct running mechanics). They should judge generated art, not synthesise it. This inverts the P1 architecture.

**D3 — Keep every photograph's pixels together.** Pixels from one photograph already agree on light, tone, and occlusion. Cut panels apart only when necessary, and when cutting, keep generous **overlap keeps** (shared pixels across a joint) so reassembly is lossless within that frame. Never mix parts *across* photographs of different moments.

**D4 — Small warps only.** Bounded differential warps (≤ half a keyframe spacing, i.e. ≈ ≤ 22° per limb between adjacent keys) preserve photographic texture; the P1 damage grows super-linearly with rotation. In-betweening is a blend problem, not a re-pose problem.

**D5 — Audit at the resolution you ship.** Sprites are consumed at ~160–220 px. Acceptance renders at `1×`/`2×`/`4×`; defects invisible at `1×` are telemetry, blockers are `2×`-visible. (This also de-risks diffusion identity drift, which is invisible at sprite scale.)

**D6 — No magic numbers.** Every constant is derived from a measured, committed persona/calibration record or is a named constant with measured provenance. The single costliest maintenance trap on both branches was pixel-window constants drifting.

## 2. Option space considered

| | Option A — **Keyframe-Anchored** (recommended) | Option B — De-baked albedo + procedural relight | Option C — Vector/gradient-mesh render |
|---|---|---|---|
| Idea | Photograph the figure **once per canonical gait keyframe** (8–12 full-body plates); in-between with small differential warps + cross-fade | Keep 1-pose plates but strip baked shading (intrinsic-image flattening), rotate albedo rigidly, re-light analytically (world-fixed key light) | Vectorise parts (upgraded multi-band vectorizer with gradient fits), animate vectors, texture via plate-derived fills |
| Solves `TEX-ERR` | ✅ by construction (each key IS a photo) | ✅ mostly (no shading resampling; foreshortening still warps albedo) | ✅ (no resampling) |
| Solves `TONE-ERR` | ✅ by construction (each frame = one photo) | ⚠️ needs global grade LUT per persona | ⚠️ banding risk |
| Solves `JOIN-ERR` | ✅ joints are real pixels per frame | ❌ caps still needed at extremes | ⚠️ vector seams |
| Solves `SHOE-ERR` | ✅ shoe photographed in its actual contact config per key | ⚠️ still 2-D bending | ⚠️ vector shoes read vector |
| Photographic realism | ✅ highest | ⚠️ relight risk (waxy) unless excellent | ❌ lowest |
| Pure-TS feasibility | ✅ extraction/blend/warp-bounded | ⚠️ intrinsic decomposition in pure TS is heavy | ✅ but large effort |
| Asset cost | 8–12 plates per persona (amortised, one-off) | 10 plates + relight LUTs | 17 vector rigs per persona |
| Risk | diffusion identity drift across keys (mitigable, D5) | engineering-heavy, unproven look | loses "photographic" charter |

**Decision (`ADD-004`):** adopt **Option A as the P2 renderer architecture**, absorbing B's relight pass later *only* for in-between frames if measured flicker demands it, and keeping C as an export tier (per-frame SVG trace), not the source of truth.

## 3. The P2 pipeline — "Keyframe-Anchored Photographic Pipeline" (KAPP)

### K0 — Persona Bible (`#obj-persona-bible`)
One committed JSON per persona: measured proportions (from the master plate), wardrobe token block, palette, identity-anchor master plate reference, rig bone lengths, per-keyframe manifest. **Every downstream constant derives from this file** (`ADD-008`). This replaces PR8's scattered `PhotorealAssetTuningSpec` pixel constants with a single measured source.

### K1 — Keyframe Plate Acquisition (`#feat-plate-acquisition`)
Generate **8–12 full-body running plates** per persona at canonical gait phases φk (e.g. 0.000 midfoot strike, 0.125 loading, 0.250 mid-stance/pass, 0.375 flight, 0.500 opposite strike, … mirroring the 8 canonical frames the biomech engine already defines):
- **Identity-locked pose transfer:** image-to-image from the persona master (K0 anchor) with pose-only delta prompts. Reuse the sibling branches' hard-won prompt rules verbatim (strict 90° sagittal profile; no frontal landmarks; single subject; flat shadowless studio light; `#FF00FF` key; the persona token block repeated verbatim in every prompt).
- **Prompt-change budgeting:** ≤ 10 `generate_image` calls per turn; the acquisition ledger (K0 manifest) queues remaining keys across turns; never partially adopt an un-audited batch (their `IMG-ERR-15` lesson).
- **Deterministic reuse:** plates are one-off per persona; regenerations append to the prompt log with justifications, exactly per `CLAUDE-decisions.md §2`.

### K2 — Biomech Conformance Gate (`#feat-conformance`, `ADD-005`)
For each keyframe plate, **the rig judges the art**:
1. Chroma-key extract the silhouette (existing magenta-key module, reused).
2. Fit the 17-part rig pose to the plate silhouette (per-limb axis fitting; the solver supplies expected joint angle windows per φk).
3. Score: per-limb angle plausibility (within solver windows), silhouette IoU vs the rig-rendered reference pose, foot phase correctness (contact/flight per `stanceDuty`), baseline height, duplicate-pose detection (the sibling flaw-analyzer's IoU/dHash methodology, now run **across the new keyframes** — proving 8 distinct poses, real crossover, no half-cycle duplication).
4. Fail → targeted regeneration with a logged justification (prompt delta names the failing limb/angle). **No plate enters the atlas without passing conformance.**

This turns both branches' biggest strength (correct biomechanics) into the acceptance gate for generated art — and mechanically prevents the flawed-sheet failure modes from ever recurring in the new asset set.

### K3 — In-Frame Part Atlas (optional utility tier, `#obj-frame-atlas`)
Per keyframe, cut parts **with overlap keeps** (generous rounded regions that retain shared pixels across each joint). Because each keyframe is a single photograph, parts reassemble **losslessly** at that keyframe — tone-continuous by construction. Uses: micro-adjustments (baseline lock, minor limb deltas), UI rig inspector, hand-editing. Cuts never cross keyframes (`ADD-006`). The P1 rounded-joint cutter survives here, simplified: caps are a cutting style, not a join-repair mechanism.

### K4 — Differential In-Betweening (`#feat-inbetween`)
For output phases between keys: select the two bracketing keys; apply a **bounded differential warp** (each limb ≤ half the key spacing; grid-based similarity-field warp, pure TS) to the nearer key; cross-fade with weight = phase distance. Texture damage stays in the small-angle regime where P1's warper was already visually clean. Optional later upgrade: K4-b relight normalisation (histogram/grade LUT) if cross-key luminance flicker is measured — that is Option B's only surviving fragment.

### K5 — Foot & Ground Lock (`#feat-ground-lock`)
- Foot roll across stance is carried by **keyframe selection** (plates at contact / mid-stance / heel-off / toe-off already show the shoe in its true configuration) — no chord-tent bending of photographed shoes (`SHOE-ERR` eliminated by construction).
- Each plate's sole baseline is measured once (K2) and pinned to the ground line during stance; in-between frames interpolate the measured baselines. Acceptance: `groundLineDeltaPx` within −9…+2 px, ≤ 2 px on support frames (the siblings' own threshold, now enforced pre-export).

### K6 — Assembly & Export (`#feat-assembly`)
Frame = selected key plate (+ optional K3 micro-deltas + K4 in-between blend). Export: 8 canonical frames, 16-phase audit strip, 6-colour variant sheets via the existing garment-tint path, and an optional per-frame SVG trace tier (vectorizing *final frames*, not parts — sidestepping the P1 part-vector seam problems).

### K7 — Continuous Audit Harness (`#feat-audit-harness`)
Extends the inherited dumper: everything it already emits, plus
- `1×` / `2×` / `4×` display-resolution contact strips (`ADD-007`);
- **texture-coherence score** (gradient-orientation coherence vs source plates — catches `TEX-ERR` numerically);
- **identity-drift score** (dHash distance of each frame vs persona master at sprite scale — catches `IDENT-ERR`);
- **tone-seam score** (per-joint-boundary hue/luminance delta);
- joint-plausibility violations (K2 windows, per output frame);
- `groundLineDeltaPx` per frame.
Numeric telemetry is always reported **alongside** (never instead of) the `read_file` visual audit — the P1 lesson that "0/0/0 telemetry, visible seams anyway" must never repeat.

## 4. Acquisition alternatives (recorded for completeness, `ADD-009`)

| Option | Verdict |
|---|---|
| Diffusion pose-transfer keyframes (K1) | **Primary.** Reuses the siblings' entire prompt engineering corpus; cost amortises (one-off per persona). |
| Stock-video roto (real runner, side-on treadmill, per-frame matte) | Highest realism; deferred: licensing review + matting pipeline out of scope now; noted as a drop-in replacement for K1 (the rest of KAPP is agnostic to where frames come from). |
| 3-D parametric render with photographic shading | Rejected for now: violates the pure-TS, no-native-binary constraint and the "photographic" charter. |
| Hybrid: keep P1 rig renderer for distant/small sprites, KAPP for hero views | Possible future tiering; KAPP output and P1 output can coexist behind the same all-or-nothing asset-bank contract. |

## 5. Key risks & counters

| Risk | Counter |
|---|---|
| Identity drift across keyframes | Master-anchored image-to-image pose transfer; verbatim persona token block; fixed lens/lighting tokens; K7 identity-drift score gated at `2×` (D5 tolerance); regeneration with justification |
| Generated pose doesn't match the requested φk | K2 conformance gate with per-limb angle windows from the solver; targeted prompt deltas |
| 10-call/turn cap slows acquisition | Acquisition ledger in K0; keys are one-off; ~1–2 turns per persona; never adopt un-audited batches |
| Cross-key luminance flicker in animation | Flat shadowless studio-light prompt rule (inherited); measured per-key grade match in K7; optional K4-b grade LUT |
| In-between popping | Bounded warp + cross-fade; frame-difference metric in K7; more keys near high-acceleration phases (that's why 8–12) |
| Metric/visual gap repeats (gates pass, eyes disagree) | Provenance rule: telemetry never replaces `read_file`; both reported together, always |

## 6. Migration plan (three increments, each shippable)

| Increment | Scope | Success signal |
|---|---|---|
| **P2.0 — Audit upgrade only** (no new art) | Add display-resolution strips + K7's new metrics; run against PR1/PR8 worktrees' existing assets to publish baseline numbers | Baseline defect metrics quantified for both branches (e.g. texture-coherence, tone-seam at knee/elbow) |
| **P2.1 — Single-persona pilot** | Persona bible for one persona; acquire 8 keys through K1+K2 (with full prompt log); compose the 16-phase strip via K4–K6; side-by-side vs the P1 renderer at `1×` | Visible joint seams at `2×`: zero; texture-coherence above baseline; ground penetration ≤ 2 px on support frames |
| **P2.2 — Full pipeline** | All personas (athletic/average/petite + procedural fallback tier retained), 6-colour variant sheets, per-frame SVG export tier, web workbench integration with all-or-nothing readiness | Complete asset banks passing K7 + visual audit; parity ledger updated |

## 7. What is explicitly preserved from the watched branches

- Biomech core (`gait`, `two-bone-ik`, `foot-roll`, standing pose) — as conformance oracle and procedural fallback tier.
- Chroma-key extraction, grid detection, dedupe, flaw analyzer — as-is, plus reuse across keyframes.
- The entire FDS/addenda/prompt-log/learning discipline — this repository already carries it.
- PR8's standing-profile calibration plate and cache-busting asset URL patterns — carried into P2.2.
- Their per-persona tuning **pattern** (typed parameter object), but re-sourced from the measured persona bible instead of accumulated pixel constants.

## 8. Open questions for review

1. Keyframe count: 8 (matches the canonical frames, cheaper) vs 12 (smoother in-betweens around high-acceleration phases)? Proposal defaults to **8 + up to 4 spare slots** for phases that fail conformance repeatedly.
2. Variant colouring: re-tint keyframes per team colour via the existing garment-tint path, or prompt-lock one colour and tint at export? Proposal: **tint at export** (photographs stay canonical).
3. Should K3 (in-frame part atlas) ship in P2.1 or be deferred to P2.2? Proposal: defer unless hand-editing proves necessary during the pilot.

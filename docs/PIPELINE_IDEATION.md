# Revised Pipeline Ideation — Photographic Sprite Elements for Running Animations

- **Date:** 2026-10-18
- **Status:** Ideation (deliverable is the design, not implementation)
- **Inputs:** [`docs/BRANCH-ASSESSMENT.md`](./BRANCH-ASSESSMENT.md); PR `#1` FDS v5.1.0 & PR `#8` FDS v4.10.0 (both read in full); the seed flaw analysis; the `IMG-ERR-01..16`, `PIPE-ERR-01..08`, `DEFECT-01..09` catalogs.
- **Problem Statement (user's words):** *"problems deriving a pipeline to generate photographic sprite based elements for our running animations."*

---

## 1. What the Two Branches Taught Us (Constraints the Revised Design Must Respect)

**Hard-won facts, established by 72+ logged generation calls across both branches:**

1. Diffusion is reliable at **whole-subject** composition (full-body side profiles, single garments) and unreliable at **isolated-part** composition (arm chirality inverts, frontal landmarks sneak in, turnaround sheets appear, ghost shoes materialize, mannequin sockets open).
2. Independent generations **cannot agree** with each other on identity, skin tone, lighting, or proportion — every cross-part seam is a fresh stochastic mismatch.
3. A flat photograph **warped around a joint** still shows its original lighting — highlights rotate with the bone instead of the light source.
4. Manual per-turn visual acceptance is the bottleneck (10-image/turn cap; `MAX_TOKENS` empty payloads), not the solver.
5. The **procedural rig + IK + gait solver is already perfect** by every telemetry gate (0 islands, 0 spill, 0 uncovered joints, correct anti-phase, crossovers, flight phases). Geometry is a *solved problem* in this repo.

**Design goals derived from these facts:**

- **G1 — Minimize stochastic surface area.** Fewer independent generations per persona; each generation should be the easiest possible prompt class.
- **G2 — Consistency by construction, not by repair.** Identity, skin tone, lighting, and proportion should be *derived* from one verified source rather than *reconciled* across ten.
- **G3 — Geometry stays procedural.** The IK rig remains the sole authority for pose, silhouette, and ground contact (this also eliminates PR #8's open `+6 px` ground-penetration item by construction).
- **G4 — Photographic content enters as appearance (albedo/texture), never as geometry.**
- **G5 — Automated acceptance gates replace manual eyeballing.** Generation becomes a manifest-driven batch job with CV checks; humans review only failures.
- **G6 — Persona variation is parameterization, not regeneration.**
- **G7 — Keep the repo's proven discipline:** verbatim prompt log, regeneration justifications, addenda register, honest validation with 4-way provenance separation.

---

## 2. Ideated Options

### Option A — One-Master Deterministic Derivation (minimal-change)

**Idea:** Generate **one** verified full-body master plate per persona (strict 90° right-facing profile, single subject, solid magenta). Derive all 17 parts from that single plate by deterministic segmentation:

- Near limbs, torso, head, neck, pelvis: segmented directly from the master.
- Far limbs: **mirrored near-side segments + deterministic medial shading** (darken/cool by a fixed factor — the same `shadeScale` idea the branches already use, but applied at derivation time rather than as repair).
- Only genuine exceptions: **medial hand (palm)** and **medial foot (arch)** — the two surfaces where medial anatomy is actually distinct *and* visible at sprite scale. Optionally generate just these 2 plates per persona with the proven 90° L-bend / single-shoe prompts.

**Effect on the defect catalogs:**

| Eliminated or reduced | Why |
|---|---|
| `IMG-ERR-03` (male arms on female personas), `IMG-ERR-04` (proportion drift), `IMG-ERR-06` (mannequin sockets), `IMG-ERR-07` (ghost shoes), `IMG-ERR-10` (turnaround sheets), `IMG-ERR-14` (second shoe) | Those plates simply stop existing; one master is far easier to prompt and verify |
| Cross-part skin-tone/lighting mismatch | All parts share one source image by construction |
| Generation cost | ~10–72 calls/persona → **1–3 calls/persona** |

**Residual weaknesses:** mirroring loses true medial texture; the master itself can still fail (though masters had the *lowest* regeneration rate in the FDS log); 2D photo-warp seams at joints remain (Option B removes these).

### Option B — Procedural Geometry Authority + Photographic Texture Tiles (structural fix)

**Idea:** Keep the flawless procedural rig as the **only** geometry. Treat "photographic" as a **texturing** problem:

- Generate a handful of flat **material swatch plates** per persona: skin gradient tile, singlet fabric tile, shorts fabric tile, sock tile, shoe tile. These are the easiest possible diffusion prompts — no anatomy, no chirality, no framing, no subject counting. A failed tile is re-rolled in seconds and is trivially CV-checkable (uniformity, no edges).
- Map tiles onto the procedural 17-part meshes with per-part UVs; compute shading **procedurally** (vertical gradient, far-limb darkening, joint AO, specular highlight that rotates correctly with the part relative to a fixed light).
- Persona variation = tint/roughness/width/length parameters (`PhotorealAssetTuningSpec` already exists) — **zero generations per new build tier**.

**Effect:** eliminates the entire "rotating a flat photo" defect class (`DEFECT-05` rotating highlights, `PIPE-ERR-01` non-isotropic stretching, wedge tears `IMG-ERR-15`, silhouette locks `IMG-ERR-08`, T-rex scaling `IMG-ERR-13` — geometry is always correct because it is always procedural). Ground contact is enforced by IK clamping, not asset calibration (fixes PR #8's `+6 px` penetration by construction). Garment boundaries (stripe crossing, waist gaps) become texture-ownership rules in code, not extraction luck.

**Residual weakness:** the silhouette is procedural, not photographed — the look is "textured 3D render" rather than "photo cutout." At 220×256 sprite scale this is arguably *more* photographic in motion, because lighting now behaves physically.

### Option C — True 3D Render Pipeline (if photographic rotation fidelity is a hard requirement)

**Idea:** Build a parameterized 3D runner (SMPL-style body or stylized character wearing the crimson outfit), texture it with the same material tiles, drive it with the **same gait solver** mapped to 3D joint angles, and render orthographic frames deterministically (headless Cycles/EEVEE, or WebGL in-browser).

**Effect:** medial/lateral views, occlusion, foot roll, and lighting are physically correct by construction; the 17-part decomposition becomes a **render-layer** problem (each part rendered to its own pass automatically). One-time 3D asset build per persona family; everything downstream is deterministic rendering.

**Residual weakness:** largest upfront lift; requires 3D modeling/texturing skill; heavier tooling than the repo's pure-TypeScript constraint (rendering would live outside the browser pipeline unless WebGL).

### Option D — Video Coherence Extraction (rejected as primary)

Generate a runner video and extract frames: temporal coherence helps identity, but 17-layer isolation still needs segmentation, and video models add temporal artifacts. **Rejected** as the architecture; noted only as a possible *source* for the Option-A master plate.

### Options Matrix

| Criterion | A: One-Master | B: Texture Rig | C: 3D Render | Status Quo (10 plates) |
|---|---|---|---|---|
| Generations per persona | 1–3 | ~5 trivial tiles | 1-time 3D build | ~10 (+ repairs: up to 72 logged) |
| Cross-part consistency | By construction | By construction | By construction | Manual repair |
| Correct joint rotation lighting | ✗ (flat photo) | ✓ (computed) | ✓ (rendered) | ✗ |
| Medial/lateral anatomy | Approx (mirror) | Approx (procedural) | ✓ (true 3D) | ✓ (2 extra plates) |
| Ground-contact correctness | Rig-level (✓) | ✓ by IK clamp | ✓ by IK clamp | Calibration-dependent |
| New persona cost | 1 generation + CV gate | parameters only | new 3D asset | full 10-plate campaign |
| Codebase fit | High (reuses extractors) | Medium (new UV/shading layer) | Low (new toolchain) | — |
| Photographic fidelity feel | High (real photo texture) | Medium-high (textured render) | Highest | High but inconsistent |

---

## 3. Recommended Revised Pipeline (Staged Hybrid)

**Stage 0 — Discipline & verification backbone (done this turn):** adopt GREENFIELD/CLAUDE discipline (`CLAUDE.md` et al. at repo root); keep the 16-phase audit dumper, telemetry, and flaw analysis as the verification backbone.

**Stage 1 — One-Master Derivation (fastest path, reuses existing code):**
Implement Option A on top of the current codebase: collapse the studio to 1 master (+ optional 2 medial-detail plates) per persona; extend `photoreal-extractor.ts` with a master-segmentation path and a mirrored+shaded far-limb derivation. Expected effect: ~5–10× reduction in generation calls and the disappearance of most `IMG-ERR` classes.

**Stage 2 — Texture-Mapped Procedural Rig (production architecture):**
Implement Option B: the procedural rig becomes the sole geometry authority; photographic content exists only as material tiles. The 10-plate photoreal mode becomes a legacy/stylized fallback. This is where "photographic" and "correct under articulation" finally stop conflicting.

**Stage 3 — (Optional) 3D Render Pass:** only if true photographic multi-view rotation is a hard product requirement.

### Cross-cutting process redesign (applies to all stages)

1. **Manifest-driven batch generation with automated CV acceptance gates** (replaces per-turn manual `read_file` auditing and side-steps the 10-image/turn cap):
   - Manifest lists every plate/swatch with its prompt template and acceptance criteria.
   - A generation script (run outside the agent turn loop) produces candidates, runs gates, and only escalates failures to a human with the regeneration justification auto-drafted.
   - **Gate set:** single-subject (connected-component count == 1), sagittal-profile check (no frontal landmarks — eye/nostril symmetry detector), background uniformity (magenta pixel std-dev), single-shoe check, chirality check (forearm × palm-normal cross product for the L-bend class), skin-tone consistency (CIEDE2000 ΔE vs master), silhouette-lock check (IoU vs master silhouette).
2. **Content-addressed asset URLs** (hash in filename) instead of `?v=` query cache-busting — deterministic by construction (`ADD-037`'s cache bug class disappears).
3. **Persona build tiers as rig parameters**, not new plate campaigns (`PhotorealAssetTuningSpec` is already 80% of the way there).
4. **Keep the prompt log + addenda discipline** for the (much smaller) number of generations that remain.

### Traceability — every documented issue and where the revised pipeline addresses it

| Issue class (source) | Revised pipeline answer |
|---|---|
| Camera twist from frontal landmarks (`IMG-ERR-01`) | One master per persona; whole-subject prompt class; CV sagittal gate |
| Chirality inversion / hanging-arm thumb paradox (`IMG-ERR-02`) | Far limbs derived by mirror + shading; chirality never prompted |
| Male arms on female personas (`IMG-ERR-03`) | Arms come from the persona's own verified master |
| Proportion drift across plates (`IMG-ERR-04`) | Single source ⇒ single proportion set |
| Turnaround sheets (`IMG-ERR-05`) | CV single-subject + profile gate rejects them automatically |
| Mannequin sockets / ghost shoes / cropped chin (`IMG-ERR-06/07/12`) | Plates that could carry these defects are no longer generated |
| Silhouette lock from reference images (`IMG-ERR-08`) | Only one reference per persona (the master itself) |
| Literal "cross-section" illustrations (`IMG-ERR-09`) | No isolated cross-section prompts remain |
| `MAX_TOKENS` / 10-per-turn cap (`IMG-ERR-10/11`) | Batch manifest job outside the turn loop; ~1–3 gens/persona |
| Capsule stretching / wedge tears (`PIPE-ERR-01/05`) | Stage 2: geometry is procedural; textures don't stretch |
| Fabric spill / width pinch (`PIPE-ERR-03/04`) | Stage 2: garment boundaries are texture-ownership rules |
| Hardcoded 2-way persona ternaries (`PIPE-ERR-06`) | Persona = parameter object (already `PhotorealAssetTuningSpec`) |
| Browser caching stale parts (`PIPE-ERR-07`) | Content-addressed filenames |
| Waist gaps / crossed stripes (`DEFECT-01`, `RECT-08`) | Stage 2: single ownership rule per texture region |
| Rotating deltoid highlight (`DEFECT-05`) | Stage 2: lighting computed per part relative to fixed light |
| Athletic `+6 px` ground penetration (PR #8 open item) | Rig-level IK end-effector clamping (G3); no asset calibration needed |
| Manual per-turn visual acceptance bottleneck | CV gates + failure-only human review (G5) |

---

## 4. What to Keep From the Branches (Do Not Rebuild)

- The **17-part procedural rig, 2-bone IK, gait solver, rolling foot** (`src/runner/`) — telemetry-perfect.
- The **audit tooling** (`cycle-frame-dumper.ts`, `connected-components.ts`, `photoreal-matte-and-qc.ts`, `audit-gait-cycle` skill) — repurposed as the automated acceptance harness.
- The **flaw analysis and mistake catalogs** — they are the acceptance-criteria source for the CV gates.
- The **discipline files** now adopted at this repo's root.
- The **pure-TypeScript raster constraint** (`jpeg-js`/`pngjs`) for everything except optional Stage-3 rendering.

## 5. Open Questions for the User (Decision Points)

1. **How photographic must it be?** If "real photograph texture" is required only as *appearance*, Option B suffices; if the *silhouette itself* must be a photographed human, Option A (or C) is needed.
2. **Is true multi-view rotation fidelity required** (camera orbits the runner), or is a fixed side profile with articulated limbs enough? Only the former needs Stage 3.
3. **Persona count target** — 5 tiers now; under Stage 2, adding tiers is free (parameters), which changes how many are worth maintaining.
4. **Acceptable look** for Stage 2: "textured 3D render" vs "photo cutout collage" — a product call, not an engineering one.
5. **Where does generation run** — inside the agent turn loop (current, capped) or as an external manifest-driven batch job (recommended)?

## 6. Implementation Status (updated `2026-10-19`, `ADD-046`..`ADD-049`)

**Stage 1 core is implemented on `arena/907ce374-super-duper-funicular`:**

- ✅ **Automated CV acceptance gates** (`src/pipeline/cv-acceptance-gates.ts`, `ADD-047`): 7 class-aware gates with per-plate-class presets; runnable via `npm run acceptance -- <folder> <report.json>`; 8 real-asset + synthetic tests.
- ✅ **Manifest-driven batch generation harness** (`src/pipeline/generation-manifest.ts`, `ADD-048`): prompt-contract verification, manifest validation, auto-drafted regeneration justifications; 6 tests.
- ✅ **One-master deterministic far-limb derivation fallback** (`src/pipeline/master-derivation-extractor.ts`, `ADD-049`): mirror + deterministic medial shading; 17-part fallback bank assembly; 5 tests.
- ✅ **Content-addressed part URLs** (`src/pipeline/part-content-manifest.ts` + `parts-manifest.json` × 3, `ADD-049`): SHA-256-16 revisions replace `Date.now()` per-load busting.
- ✅ **Converged implementation base adopted** (`ADD-046`): PR `#1` tip `96a284f` (incorporating PR `#8` pose-bank parity) ported as the repo's implementation base; full inherited pipeline (`npm run pipeline`, `harvest-phases`, `dump-cycle`) executes green locally; **80/80 Vitest tests pass**.
- ✅ **Objective validation of the ideation's central claim** (§4.1 of the assessment): phase frames 11/11 clean; isolated studio plates fail materially — the automated gates now *prove* which source class is defective.

**Not yet done (honest scope boundary):** no new studio plates were generated this turn (no image-generation tool in this sandbox), and the human visual examination gate remains unsatisfied here (no vision capability) — see `docs/VALIDATION.md §4.1`. Stage 2 (texture-mapped procedural rig) and Stage 3 (optional 3D render) remain designed-but-unimplemented.

## 7. Branch Evolution Note (`2026-10-19`)

Both assessed branches advanced after this ideation was written, independently converging toward Stage 1's core insight: **pose-bank harvesting** (`ADD-042`..`ADD-044` on PR `#1`; `pose-bank-pipeline.ts` on PR `#8`) — generating full-body phase keyframes conditioned on the one verified master and harvesting jigs from the phase of maximum chroma clearance. This replaces most isolated part plates (the defective class) with coherent full-body frames (the clean class, as the CV gates now objectively confirm). The revised pipeline adopts this convergence as its implementation base and adds what the branches still lack: **automated acceptance gates, a manifest-driven batch harness, a deterministic derivation fallback, and content-addressed assets**.

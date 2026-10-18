# Revised Photographic Sprite Pipeline — Design of Record (`#revised-pipeline`)

- **Repository:** `wshyang/super-duper-funicular`
- **Active Branch:** `arena/62955c1e-super-duper-funicular`
- **Version:** `1.1.0` (PROPOSAL — `§9` Q1 answered by user on 2026-10-18: 3D route evaluation authorised; Q2–Q5 open)
- **Date:** `2026-10-18`
- **Author:** Arena.ai agent turn `TURN-L04` (`docs/FDS.md#continuous-learning-log`)
- **Supersedes / Extends:** the converged photographic pipeline carried by PR `#1` (`arena/917ef347-super-duper-funicular` @ `936f37ce07f18e38fc4f5b3880c80029ec9f55cf`) and PR `#8` (`arena/e1300d3c-super-duper-funicular` @ `04d5caf432ff81be0307a3ec79e894da1b60045c`), assessed in [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./BRANCH_ASSESSMENT_PR1_PR8.md) (`#branch-assessment`)
- **Constraint Sources:** `docs/FDS.md §8.4` of PR `#1` (`IMG-ERR-01..16`, `PIPE-ERR-01..08`), PR `#1` `PLAN.md §4` failed-experiments register, PR `#8` `docs/VALIDATION.md §3` caveats, and this branch's own visual inspection of committed frames
- **Related Anchors:** `#feat-atlas-decomposition`, `#feat-material-ownership`, `#feat-relight`, `#feat-perceptual-gates`, `#obj-atlas-pose`, `#obj-calibration-dataset`, `#nfr-gen-budget`

---

## 1. Problem Statement & Evidence Base

### 1.1 The Pipeline As It Exists Today (PR `#1` / PR `#8`, converged)

Both branches implement, with minor divergence, the same six-step photographic pipeline:

1. **Per-part studio generation.** ~10 independent diffusion generations per persona on `#FF00FF`: a neutral standing master (`01`), head profile (`02`), ponytail (`03`), neck cylinder (`04`), armless torso (`05`), pelvis/shorts (`06`), near-arm lateral (`07`), far-arm medial L-bend (`08`), near-leg lateral (`09`), far-leg medial (`10`).
2. **Hand-windowed cutout extraction.** Per-part hardcoded crop boxes and `srcStart/srcEnd` pixel coordinates in `photoreal-extractor.ts` / `athletic-reference-extractor.ts` / `athletic-rebuilt-extractor.ts` cut each plate into a `160 × 160` RGBA canvas with pivots at `(80, 36)` / `(80, 124)`.
3. **Pivot-anchored rounding.** `rounded-joint-cutter.ts` applies semicircular caps + a 6 px internal shaft–shoulder Hermite blend; `attachEndCapComposite` grafts shorts cuffs and sock collars across pivots.
4. **17-part IK rig.** Analytical two-bone IK, contralateral phase, 14° forward fall, 2-segment plantar foot roll; per-persona `PhotorealAssetTuningSpec` length/width scales.
5. **Compositing.** Per-pixel inverse bilinear warp into a `220 × 256` raster (`photoreal-rig.ts`) and/or quantized-band vector stitch (`svg-vectorizer.ts` + `svg-rig-stitcher.ts`).
6. **Audit.** `npm run dump-cycle` 16-phase plates + `audit-report.json` telemetry (detached islands, magenta spill, fringe count, uncovered joints, ground delta) inspected multimodally; artifacts written to `/tmp` and deliberately not committed.

### 1.2 Failure Families Observed Across Both Branches

| Family | Symptom Class | Evidence (branch-local IDs) | Cost Paid |
|---|---|---|---|
| **F1 — Diffusion constraint violation on isolated anatomy** | wrong chirality, camera twist, male arms on female persona, chin in neck plate, ghost second shoe, mannequin sockets, literal bone cross-sections | `IMG-ERR-01,02,03,05,07,08,12,13,14,15,16`; PR `#1` `§9` logs 72 calls (`Pass 1..8`) for 3 photoreal personas | ~24 calls/persona, most of them regenerations; 10-call/turn cap stalled work mid-pass (`IMG-ERR-15`, `TURN-L18`) |
| **F2 — Cross-plate incoherence** | luminance step on far forearm, shoulder-cap specular mismatch, shoe scale mismatch between near/far plates, left-facing torso vs right-facing warp, width pinches | `DEFECT-03`, `DEFECT-05`, `IMG-ERR-10`, `PIPE-ERR-03`, `CROSS-09` (28.57% pinch caught by parity gate) | per-part `shadeScale` fudge factors, width clamps `[0.92, 1.12]`, mirroring hacks |
| **F3 — Reference-image silhouette lock** | fuller persona locked to slim silhouette, mannequin armhole inherited, crop-top/stance inherited | `IMG-ERR-06`, `IMG-ERR-09` | regeneration passes 5–7; body-positivity audit rules in `CLAUDE.md` |
| **F4 — Hand-tuned pixel windows & local corrective hacks** | shifted torso windows open seams; bust landmark lift; 22% anterior chest reduction; shoulder-bulb seal; stripe-suppression rects; diagonal neck axis | `PIPE-ERR-04,06,07,08`, `DEFECT-01,07,08`, PR `#8` `TURN-L18→L21` (four consecutive user-reported regressions: low chest → unchanged bust → cached art → collarbone bulb → squared shoulder) | every fix spawns a new artifact; fixes are persona-specific magic numbers that silently break the next persona (`PIPE-ERR-04`) |
| **F5 — Garments spanning two rotating parts** | double white shorts stripes scissoring in an X; sock collar step at dorsiflexion; stripe stub poking below pelvis | `DEFECT-01`, `DEFECT-06`, `DEFECT-08` | duplicate-stripe suppression rects + end-cap composites; still tier-conditional code |
| **F6 — 2D warp of baked-in lighting** | highlights do not rotate with the limb; grazing-angle bilinear specks; far forearm peeking behind torso | `DEFECT-02`, `DEFECT-04`, `DEFECT-05` | island pruning pass, rear-extension tuck in the gait solver (motion changed to hide a texture defect) |
| **F7 — Validation that measures the wrong things** | audits report `0 islands / 0 spill / 0 uncovered joints` while users still see seams, wrong proportions, and ground penetration (`-8..+6 px` on PR `#8`); fringe counts declared "baseline" | PR `#8` `docs/VALIDATION.md §1`, PR `#1` `§11.3` | defect discovery depends on user eyesight, not gates; `/tmp` evidence evaporates so findings are not reproducible |
| **F8 — Process overhead** | 5-way parity ledgers, 250 KB append-only FDS, duplicate exploration on 5 branches, per-turn learning entries of 500+ words | `docs/N_WAY_COMPARISON.md`, `TURN-L12..L24` on both branches | majority of commits on both branches are documentation/ledger refreshes, not pipeline progress |

### 1.3 Root-Cause Synthesis

The current pipeline asks a **stochastic** generator to satisfy ~10 hard geometric constraints **per isolated part** (exact sagittal angle, chirality, occlusion-free framing, pivot-friendly orientation, matching lighting, single subject, correct gender/build, no second shoe…), then spends **deterministic** code repairing the violations through hand-tuned pixel windows. The repair surface is exactly where new defects are born (F4 → F5 → F6 chain). Diffusion is simultaneously *over-constrained* (isolated anatomy it has no prior for) and *under-constrained* (nothing ties plate `07`'s lighting to plate `05`'s).

**Inversion principle of this proposal:** give diffusion only the constraints it is demonstrably good at — *a coherent whole human figure in a prescribed pose, garment and palette* — and move every geometric constraint into deterministic, testable code that fails loudly instead of silently.

---

## 2. Design Principles (`P-R1`..`P-R8`)

| ID | Principle | Kills |
|---|---|---|
| **`P-R1`** | **Single-source coherence.** Every part of a persona derives from photographs of one rendered character instance under one camera and one lighting setup. | F2 |
| **`P-R2`** | **Whole-body priors only.** Diffusion is prompted with complete figures in explicit poses; isolated anatomical fragments are banned except with logged justification. | F1 |
| **`P-R3`** | **Deterministic decomposition from data.** Part boundaries, pivots and source angles come from a versioned calibration dataset (landmarks + material masks), never from inline pixel rects. Magic numbers live in reviewed JSON, not code. | F4 |
| **`P-R4`** | **Material ownership.** Every texel of garment/skin is owned by exactly one articulated part, decided once at decomposition time by anatomical span, not by suppression rects. | F5 |
| **`P-R5`** | **Albedo/shading separation.** Store albedo + a pose-conditioned shade model; never rotate baked highlights as if they were albedo. | F6 |
| **`P-R6`** | **Measured calibration.** Bone lengths, limb widths and persona scale are measured from landmarks of the persona's own master; persona-relative size comes from estimated heights. | F2, F4 |
| **`P-R7`** | **Evidence that survives and metrics that correlate.** Committed downscaled evidence packs; perceptual gate metrics (seam contrast, joint gap/overlap, silhouette DTW) alongside the existing island/spill telemetry. | F7 |
| **`P-R8`** | **Bounded stochastic budget.** ≤ 8 generation calls per persona per rebuild, accept/reject gates per call, overruns require a logged `Regeneration Justification`. | F1, F8 |

---

## 3. Revised Pipeline Architecture (Stages 0–7)

```
Stage 0  CHARACTER LOCK            1 generation / persona
         full-body 90° sagittal standing master on #FF00FF,
         arms abducted ~15° (alpha gap arm↔torso), legs parallel
                   │
Stage 1  POSE ATLAS                3–5 generations / persona (image-to-image from master)
         same character, same camera/lights, poses A1..A4 chosen
         from the occlusion-coverage table (§3.2)
                   │
Stage 2  LANDMARK & SKELETON SOLVE deterministic (pose estimate or authored
         calibration JSON, visually verified once per pose)
                   │
Stage 3  CANONICAL PART EXTRACTION min-occlusion source pose per part →
         similarity-rotate to canonical vertical → chroma matte →
         rounded pivot caps → MATERIAL OWNERSHIP assignment
                   │
Stage 4  ALBEDO / SHADING SPLIT    per-part luminance-histogram normalisation (MVP)
         → directional shade model + joint AO (full)
                   │
Stage 5  RIG, IK & RENDER          unchanged 17-part rig, 2-bone IK, foot roll;
         raster warp + SVG stitch downstream unchanged
                   │
Stage 6  MOTION REALISM (optional) gait curves fitted to tracked reference running data
                   │
Stage 7  EVIDENCE & PERCEPTUAL GATES  seam contrast, joint gap/overlap, silhouette DTW,
         ground delta + legacy telemetry; committed evidence pack
```

### 3.1 Stage 0 — Character Lock

One text-to-image generation per persona: full-body, strict `90°` sagittal (`3 o'clock`) standing profile, flat shadowless studio light, `#FF00FF` field, **arms held ~15° away from the torso with a visible magenta gap between arm and ribcage**, legs parallel and directly aligned. The arm gap is what makes the near arm separable by alpha alone; it also gives a clean lateral arm texture without inventing an isolated arm plate. This is the only call that defines identity, garment and palette (`P-R1`, `P-R8`). Personas never reference another persona's plates (`IMG-ERR-06`, `IMG-ERR-09`).

### 3.2 Stage 1 — Pose Atlas (`#obj-atlas-pose`)

Three to five further generations of **the same character** (image-to-image from the Stage-0 master; identity lock enforced by reference, garment re-stated verbatim), identical camera and lighting, each in a pose selected so that every one of the 17 parts is unoccluded in at least one atlas pose:

| Atlas pose | Prescription (whole-body, running vocabulary) | Parts it exposes unoccluded |
|---|---|---|
| **A1 contact-right** | Right (near) leg vertical in support under the hip; left (far) leg extended forward, knee near straight; right arm swung forward ~70°; left arm swung back ~40° | `farThigh`, `farShin`, `farFoot` (forward, clear of torso and near leg), `nearUpperArm` (forward, clear of chest), `torso`, `pelvis` |
| **A2 flight-pass** | Both feet off ground; right (near) leg folding forward with heel kick; left (far) leg trailing extended; left forearm swung forward across/in front of the chest line; right arm back | `nearThigh`, `nearShin`, `nearFoot`, `farForearm` + `farHand` (anterior to chest silhouette), `farUpperArm` (posterior to back silhouette) |
| **A3 recovery-high** | Right (near) knee driven up/forward; left (far) leg in heel-kick fold; right arm back with forearm clear behind the lumbar line; left arm forward | `nearUpperArm`/`nearForearm` posterior clearance, `farShin` fold texture, `hairAccessory` swing |
| **A4 (optional) mirrored contact** | Mirror of A1 (left leg support) to double-cover far/near limb textures under opposite occlusion | redundancy for any part failing the coverage gate |

**Coverage gate (deterministic):** for each of the 17 parts, at least one atlas pose must show ≥ 95% of the part's silhouette against magenta (occlusion score from the Stage-2 segmentation). A pose that fails its coverage row is rejected and re-rolled **once** inside the budget (`P-R8`).

**Why this inverts F1:** diffusion models draw complete running humans reliably — the defective reference sheet on `main` is itself proof that whole-figure running poses are inside the prior. The failure modes catalogued as `IMG-ERR-*` are almost all *isolation* artifacts (chirality of a disembodied arm, "cross-section" of a shoulder stump, second ghost shoe copied from a full-body reference). Whole-body prompts keep the model inside its prior; the geometry we need (which limb is clear of what) is then a *selection* problem solved deterministically in Stage 3, not a *generation* problem.

**Why this inverts F2:** all atlas plates share one rendered character, one light rig and one camera, so luminance, colour temperature, shoe scale and limb width are consistent by construction. The `shadeScale = 1.08`-class fudge factors and width clamps become unnecessary (they remain only as *detectors*, see §3.4).

### 3.3 Stage 2 — Landmark & Skeleton Solve (`#obj-calibration-dataset`)

For each accepted atlas pose, produce 2D joint landmarks (hip, knee, ankle, ball, shoulder, elbow, wrist, neck base, skull base, waist, collar) plus a whole-figure alpha silhouette. Two acceptable sources, in preference order:

1. **Offline 2D pose estimation** if a pure-TS/ONNX estimator can be vendored without native lock-in (to be evaluated in Sprint 1; a rejection is logged, not silent).
2. **Authored calibration JSON** — `src/calibration/<personaId>/<poseId>.json` — landmarks placed once by an agent/human on a magnified verification plate, committed, SHA-hashed, and re-verified by a gate that re-projects the skeleton over the plate and renders a check-plate for eyes.

Either way the output is **data, not code** (`P-R3`): per-part source bone vectors, source joint angles, occlusion scores, and measured limb widths. The hand-tuned `cropBox`/`srcStart/srcEnd` tables in `photoreal-extractor.ts` are deleted and replaced by this dataset; every number in it has a provenance field (who/what placed it, on which plate, at which SHA).

### 3.4 Stage 3 — Canonical Part Extraction (`#feat-atlas-decomposition`, `#feat-material-ownership`)

For each part: pick its min-occlusion atlas pose from the coverage table; crop a padded window around the source bone; **similarity-rotate** the window about the proximal landmark so the bone becomes vertical (isotropic only — `PIPE-ERR-01`); matte by magenta flood-fill + silhouette intersection (chroma key stays: it is exact and free); apply the existing semicircular pivot caps with the 6 px internal shaft–shoulder blend (`CROSS-01` retained); normalise width from the **measured** limb width of that persona (parity clamps demoted to warnings).

**Material ownership rule (`P-R4`):** garment texels are assigned to the part whose bone owns the anatomical span, computed from landmark distances along the limb axis:
- shorts fabric from waist to mid-thigh sleeve → owned by `nearThigh`/`farThigh` (the cuff is part of the thigh texture, cut perpendicular to the femur at a landmark-derived y, not at `y = 66`);
- `pelvis` keeps only the hip/glute/waistband saddle above the femoral cut, so no stripe exists twice anywhere (`DEFECT-01/08` impossible by construction, no suppression rect);
- sock collar texels within `r` px of the ankle landmark are split by distance to ankle vs ball pivot between `shin` and `foot` (`DEFECT-06` impossible by construction).

A unit test asserts **global single-ownership**: the union of part material masks equals the figure mask and pairwise intersections are empty.

### 3.5 Stage 4 — Albedo / Shading Split (`#feat-relight`)

- **MVP (Sprint 2, no new generations):** per-part luminance/histogram normalisation against the Stage-0 master's corresponding region, plus cap-boundary gradient matching (fit a 1-D gradient across each cap seam and ease it). This alone removes the `DEFECT-03`/`DEFECT-05` *classes* on existing assets.
- **Full:** fit a low-order directional illumination model per part from the master (known studio-top light), store `albedo + shadeParams`; at render time shade per pose (gradient along bone normal + joint ambient-occlusion term at cap overlaps). Rotating a limb then rotates its form, not its frozen highlight (`P-R5`).

### 3.6 Stage 5 — Rig, IK & Render

Retained verbatim from the converged branches (they are not the problem): 17-part Z-order, two-bone IK with contralateral phase, 14° forward fall, 2-segment plantar roll (raster chord warp and hinged SVG sub-groups), `PhotorealAssetTuningSpec` keyed by persona. Parts gain fields: `{ albedo, alpha, proximalPivot, distalPivot, restAngle, shadeParams, materialMask }`.

### 3.7 Stage 6 — Motion Realism (optional, addresses the "walk-like stride" observation)

The hand-authored gait curves produce stiff, wide-scissored strides at mid-stance (visually confirmed on PR `#1` `frame-04`, `#branch-assessment §4`). Replace amplitude/phase constants with curves fitted to a tracked reference run cycle (published gait-analysis joint-angle curves, or landmarks tracked from a licensed/CC running video), parameterised by cadence and persona height; validate by DTW distance to the reference curves (`§8`).

### 3.8 Stage 7 — Evidence & Perceptual Gates (`#feat-perceptual-gates`)

Extend `cycle-frame-dumper` telemetry with metrics that correlate with what users actually see:

| Metric | Definition | Threshold (initial, to be baselined in Sprint 2) |
|---|---|---|
| `seamContrast` | mean \|ΔL\| along each joint cap circle between adjacent parts | ≤ baseline measured on PR `#1` assets − 30% |
| `jointGapArea` / `jointOverlapArea` | alpha boolean gap/overlap between adjacent part masks at the pivot | gap = 0 px²; overlap ≤ cap area |
| `stripeDuplication` | material-ownership invariant (Stage 3 test) | 0 duplicated garment regions |
| `proportionError` | \|rig landmark − master landmark\| / standing height | ≤ 3% |
| `groundContactDelta` | sole y − groundY on support frames | within ±2 px |
| `strideDtw` | DTW distance of hip/knee angle curves vs reference | ≤ fitted tolerance |
| legacy `detachedIslands`, `magentaSpill`, `uncoveredJoints` | unchanged | 0 |

Every audit run whose findings drive a decision commits a downscaled evidence pack (`docs/evidence/<run-id>/`: contact sheet ≤ 1024 px, `audit-report.json`, `SHA256SUMS`) capped ~2 MB (`P-R7`, `CLAUDE.md` Rule 6).

---

## 4. Retained From PR `#1` / PR `#8` (Do Not Reinvent)

1. The 17-part decomposition, Z-order, and medial-vs-lateral optical reasoning (PR `#1` `FDS §8.1`) — anatomically correct and independent of the asset source.
2. Magenta chroma key + border flood-fill + despill; connected-components island telemetry.
3. `rounded-joint-cutter.ts` semicircular pivot caps + internal shaft–shoulder blend (`CROSS-01`).
4. Two-bone IK, contralateral phase solver, 2-segment plantar foot roll (raster chord warp + hinged SVG groups), SVG affine stitch math (`FDS §10.3`).
5. `dump-cycle` 16-phase audit workflow and the `audit-gait-cycle` agent skill.
6. All-or-nothing photoreal bank readiness (`idle`/`loaded`/`error`).
7. The `IMG-ERR-*` / `PIPE-ERR-*` catalogs as binding constraints on prompts and code (`§7`).
8. Four-way provenance vocabulary and the verbatim image-prompt log rule.

## 5. Discarded or Replaced

| Discarded | Replaced By |
|---|---|
| Isolated-part plates `02`–`10` as separate inventions | Stage 0 master + Stage 1 atlas (`P-R2`) |
| Inline `cropBox` / `srcStart/srcEnd` / `y`-window magic numbers | `src/calibration/*` dataset with provenance (`P-R3`) |
| Stripe-suppression rects, bust lift, chest reduction, shoulder seal | Material ownership + landmark cuts (`P-R4`) |
| Width-parity clamps as a correctness mechanism | Measured widths (clamps demoted to warnings) |
| Per-part `shadeScale` fudge factors | Histogram normalisation → pose-conditioned shading (`P-R5`) |
| `/tmp`-only audit evidence | Committed evidence packs (`P-R7`) |
| N-way parity ledger as an integration mechanism | Single pipeline of record; sibling branches read-only references |

## 6. Migration & MVP Sequencing

| Sprint | Scope | Exit Criteria |
|---|---|---|
| **S1 — Ground-truth harness** | Build the decomposition math against the *procedural* renderer: synthesise atlas poses with known landmarks/ownership, then assert Stage 3 recovers parts, pivots and masks exactly. Calibration-schema + gate tooling. No image generations. | Unit tests green on synthetic ground truth; schema frozen |
| **S2 — Relight MVP on existing assets** | Histogram normalisation + cap gradient easing on PR `#1`'s committed parts; baseline all `§3.8` metrics on PR `#1` and PR `#8` assets | Metrics baselined; visible seam reduction confirmed by eyes + numbers |
| **S3 — One persona end-to-end** | Generate Stage 0 + atlas for ONE persona inside the 8-call budget; run Stages 2–5; A/B against PR `#1` frames with `§3.8` metrics and human review | New persona beats PR `#1` on seamContrast/proportionError with ≤ 8 calls |
| **S3B — Route B textured-mesh persona** | Template mesh + UV atlas + skin weights authored; T0–T7 implemented on the PoC renderer (`src/render/`); one persona baked & rendered | Route B persona renders 16 phases with §11.9 gates green |
| **S4 — A/B decision + motion + CI evidence** | Sprint-3 A/B gate (§11.12); Stage 6 gait fit; evidence packs and perceptual gates in `npm test` | Winning route selected with metrics + blind review; all `§8` acceptance criteria green in CI |

**PoC already executed (Sprint 0 evidence):** `src/render/software-renderer.ts` + `mesh-factory.ts` + `software-renderer.test.ts` render an 8-pose skinned UV-textured capsule chain deterministically at 1.7–19.6 ms/frame with single-component silhouettes; evidence pack committed at `docs/evidence/poc-software-render/` (`ADD-006`).

**Risk register:** identity drift across atlas poses (mitigation: master-reference lock + head-crop dHash reject gate); atlas pose not obeying prescription (pose-estimate check before acceptance, one re-roll inside budget); segmentation/occlusion mis-scoring (chroma field makes matte exact — occlusion is the only error source, and it is measured, not assumed); 10-image/turn platform cap (budget ≤ 8/persona/turn by design, `IMG-ERR-15`).

## 7. Dead-Ends & Constraint Register (Do Not Retry As-Is)

Distilled from PR `#1` `PLAN.md §4`, `FDS §8.4`, PR `#8` turn register; status in the revised pipeline:

| ID (source) | Dead end | Status here |
|---|---|---|
| `PLAN §4 #1` | Tapered capsule resampling (corduroy streaks) | Avoided — isotropic similarity only |
| `PLAN §4 #2` | Split half-plane foot warp (wedge tear) | Avoided — continuous chord warp retained |
| `PLAN §4 #4`, `IMG-ERR-02` | Straight vertical medial left arm prompts | Avoided by design — no isolated arm prompts (`P-R2`) |
| `PLAN §4 #5`, `PIPE-ERR-02` | Horizontal shadow smoothing across L-bent plates | Avoided — no L-bent plates exist |
| `PLAN §4 #6`, `PIPE-ERR-03` | Span-ratio pinch at elbow corners; loose red-channel purge | Retained-with-guard — width parity as warning; material-class purge kept |
| `PLAN §4 #7` | Small pivot-centered ellipse cuts on off-axis anatomy | Avoided — half-plane pivot-arc cuts + separate ponytail layer |
| `IMG-ERR-01` | Frontal landmark names in side-profile prompts | Binding prompt constraint |
| `IMG-ERR-03/04` | Male arms; T-rex bone shrinking | Binding prompt + calibration constraint (`P-R6`) |
| `IMG-ERR-05/06/09` | Turnaround sheets; cross-build reference lock | Binding: single-subject clause; personas reference only their own master |
| `IMG-ERR-10` | Left-facing torso vs right-facing warp | Avoided — orientation verified per atlas pose at Stage 2 |
| `IMG-ERR-13` | The word "cross-section" | Banned vocabulary |
| `IMG-ERR-15` | Un-audited partial batches; limit-blocked retries | Binding accept/reject gate; no same-turn retries |
| `PIPE-ERR-04` | 2-way persona ternaries | Keyed maps by persona id only |
| `PIPE-ERR-06` | Shifting torso source windows; cached part URLs | Avoided — landmark cuts; cache-busting retained |
| `PIPE-ERR-07` | Anterior belly hem tuck | Avoided — waist alignment by lean-lead from landmarks |
| `PIPE-ERR-08` | Neck cut across singlet strap; uncalibrated ankle pivot | Neck from atlas pose with strap-free visibility row; ankle pivot from calibration |

## 8. Acceptance Criteria (Quantitative, Sprint 4 gate)

1. Generation budget: ≤ 8 calls per persona rebuild (observed today: ~24); every call logged verbatim with accept/reject rationale.
2. `stripeDuplication = 0` by construction; `jointGapArea = 0`.
3. `seamContrast` ≤ 70% of the PR `#1` baseline on the same 16 phases.
4. `proportionError` ≤ 3% against the persona master landmarks.
5. `groundContactDelta` within ±2 px on support frames (PR `#8` shipped `-8..+6 px`).
6. `strideDtw` within fitted tolerance; hip/knee ROM inside published running ranges.
7. Legacy telemetry unchanged: `detachedIslands = 0`, `magentaSpill = 0`, `uncoveredJoints = 0`.
8. Every decision-driving audit has a committed evidence pack (`docs/evidence/`).
9. Route B additional: reprojection silhouette IoU ≥ 0.93; UV coverage reported; chart-border seam contrast ≤ τ; material-slot bleed = 0; render determinism hash-stable across runs.

## 9. Open Questions for the User

1. **Strategic route:** ~~open~~ **ANSWERED 2026-10-18:** the 3D route may be evaluated; its full design incl. AI-assisted skin generation is `§11` (`#route-3d`), to be A/B-tested against Route A in Sprint 3/4 (§11.12). Remaining: whether SVG stays a first-class output (`§9.3`) and whether the template mesh may later be replaced by a fitted parametric body (SMPL-class) — deferred until Route B proves out.
2. **Identity tolerance:** how much face/garment drift across atlas poses is acceptable before a pose is rejected?
3. **Delivery targets:** 8/16/24-frame loops, target resolution and whether SVG output remains a requirement.
4. **Reference motion provenance:** may we fit gait curves to tracked video / published gait data, and under which licence?
5. **Sibling branches:** should PR `#1` and PR `#8` be frozen as read-only references while this pipeline is built (this branch's recommendation), or kept live?

## 10. Alternatives Considered

| Option | Sketch | Strengths | Weaknesses | Verdict |
|---|---|---|---|---|
| **A — Atlas decomposition (this proposal)** | Whole-body plates → deterministic decomposition | Uses existing rig/render/code; small generation budget; every failure family addressed incrementally; testable ground truth in S1 | Still 2D cutouts: extreme-flexion texture limits remain (mitigated by `P-R5`) | **Recommended now** |
| **B — Textured 3D render pipeline** | Fixed-topology textured humanoid; AI supplies whole-body multi-view plates + masked UV inpaint only; pure-TS orthographic renderer | F1–F6 vanish by construction; one texture per character; garments deform continuously; exact ground contact; infinite frames | Template/UV/skin-weight authoring upfront; multi-view drift gates needed | **Fully designed in `§11`; A/B-tested vs Route A in Sprint 3/4** |
| **C — Video-to-sprites** | Image-to-video run cycle from the master; track + matte frames | Natural motion, coherent lighting | No loop guarantee, identity drift over time, whole-body sprites only (no articulable parts, no recolor/retime/persona tuning) | Rejected as primary; usable only as a motion reference for Stage 6 |
| **D — Procedural geometry + photographic albedo swatches** | Limbs as procedural capsules textured by fabric/skin swatches, analytic shading | Total control, tiny asset set | Loses the "photographic sprite" character the product asks for | Rejected as primary; its shading model is reused in Stage 4 |

---

## 11. The 3D Route, Evaluated: AI-Assisted Skin Generation for a Textured-Mesh Pipeline (`#route-3d`)

User decision `2026-10-18`: *"You may evaluate the 3d route, but you need to ideate in your pipeline how we do AI assisted generation of image assets (ie: your 3d skins)."* This section is that evaluation and that ideation. It does not replace Route A; it defines Route B completely enough to be A/B-tested in Sprint 3 (`§11.12`).

### 11.1 Verdict

**Feasible in this sandbox, and strictly better on failure families F1–F6 — conditional on bounding what AI is allowed to generate.** The decisive derisking evidence is committed at `docs/evidence/poc-software-render/` (`ADD-006`): a pure-TypeScript orthographic software rasteriser skinned a UV-textured two-bone capsule chain through 8 sagittal poses at **1.7–19.6 ms/frame** (676 tris, 160×200), byte-identical across repeated renders, with a **single connected silhouette at every flexion angle** (the 3D analogue of the 2D pivot-cap continuity gate). A full 17-part body at ~10–20 k tris and 220×256 is therefore seconds per 16-frame cycle in pure TS — no GPU, no WebGL, no native lock-in (`#nfr-purity` holds).

The reason Route B kills F1–F6 is structural, not incremental: there are **no isolated parts to prompt for** (F1), **one texture for the whole character** (F2, F3), **no pixel windows** (F4), **garments are mesh material slots that deform continuously** (F5), and **albedo is stored separately from pose shading** (F6).

### 11.2 Architecture (Stages T0–T7)

```
T0 CHARACTER LOCK        1 call   sagittal master plate (identity, garment, palette)
T1 GEOMETRY (no AI)      code     fixed-topology template mesh + canonical skeleton
                                  (same 17-joint hierarchy as Route A), per-persona
                                  bone scale vector fitted to master landmarks;
                                  deterministic UV atlas shipped with the template
T2 MULTI-VIEW PLATES     4 calls  same character, orthographic R-side / L-side /
                                  front / back, A-pose, flat shadowless light, #FF00FF
T3 PROJECTION BAKE +     code+AI  visibility-weighted multi-view bake into UV;
    MASKED UV COMPLETION 1–2 calls diffusion INPAINTS ONLY the code-computed
                                  missing-texel mask (medial surfaces, armpits,
                                  inner thighs, under-bust)
T4 DELIGHT & MAP DERIVE  code     albedo = baked colour − fitted low-order light;
                                  normals/AO procedural or baked from mesh
T5 SKIN & MOTION         code     linear blend skinning (weights authored once on
                                  the fixed topology); gait curves per Stage 6
T6 RENDER                code     pure-TS orthographic rasteriser (PoC-proven);
                                  8/16/24/48-frame loops; audit plates unchanged
T7 GATES & EVIDENCE      code     Route A §3.8 metrics + 3D-specific gates (§11.9)
```

### 11.3 The AI-Assist Matrix — what AI generates vs what code guarantees

This is the core ideation answer: **AI never free-generates a skin; AI supplies whole-body photographs and masked completions, and code owns every pixel-to-texel registration.**

| Asset | AI role (stochastic, gated) | Code role (deterministic, tested) | Accept / reject gate |
|---|---|---|---|
| Sagittal master plate (T0) | whole-body figure in its strong prior: one person, prescribed stance, garment, palette | camera/prompt prescription; filing + hash | single-subject, orientation, identity descriptors |
| R/L/F/B view plates (T2) | same character re-posed by image-to-image from the master (identity lock by reference) | orthographic camera model per view; silhouette sanity vs T1 mesh | head-crop dHash across views ≤ τ; garment colour histogram ΔE ≤ τ; limb-gap check |
| Missing-texel completion (T3) | **masked inpaint only**: fill the visibility-mask holes in the partially baked UV image, conditioned on the partial UV + master as style ref | visibility bake produces the partial UV and the exact hole mask; post-blend chart-border easing | seam contrast across chart borders; per-material histogram continuity; 1 retry in budget |
| Tileable micro-swatches (optional) | fabric weave / skin micro-detail as tileable swatches | tiling validation (wrap ΔE), placement by material slot at fixed UV scale | wrap-seam ΔE ≤ τ |
| Detail normals (optional, later) | photo-to-normal on a swatch only | mip + strength clamp; never on identity regions | — |
| Mesh, UV atlas, skeleton, skin weights, bake, delight, AO, render, gates | **none** | everything | unit tests + synthetic ground truth (Sprint 1 harness reused) |

Why this decomposition is the safe one: every historically catalogued diffusion failure (`IMG-ERR-01..16`) is a failure of *unbounded* generation (isolated anatomy, chirality, second shoes, cross-sections). In Route B the generation tasks are (a) complete humans — the model's strongest prior — and (b) hole-filling inside an existing texture — a local continuity task with the surrounding pixels as hard context. The geometrically dangerous work (registration, pivots, ownership, proportions) never touches the stochastic layer.

### 11.4 Multi-view bake mathematics & the visibility mask

Template topology is fixed, so the UV atlas is fixed; let `P(t)` be the 3D position of texel `t` and `N(t)` its surface normal. For view camera `k` with orthographic direction `d_k` and plate `I_k`:

- visibility `w_k(t) = max(0, N(t)·(−d_k))` if `t`'s projection passes a depth test against the mesh in view `k`, else `0`;
- baked colour `C(t) = Σ_k w_k(t)·I_k(proj_k(P(t))) / Σ_k w_k(t)` over views with `w_k > τ_v`;
- hole mask `M = { t : Σ_k w_k(t) ≤ τ_v }` — exactly the surfaces no external camera sees (medial limbs, armpits, inner thighs, under-bust, crotch, sole-adjacent shoe walls).

`M` is the prompt-free, code-computed specification of what the inpaint call may touch. The right-side master is the **hero view**: the runtime sprite camera is right-orthographic, so texels visible to it get the highest-quality source; bake order weights R-side first on ties.

### 11.5 UV atlas design rule

Charts are cut **along garment seams and hidden surfaces** (singlet neckline/armhole, shorts waistband/leg hem, sock collar, shoe topline, inner-limb lines), so any residual chart-border seam lands where a real seam or a self-occluded region already exists. One chart per (body region × material slot); chart layout is data in the template, versioned, and asserted stable by a gate (UV drift would silently re-bake every persona).

### 11.6 View consistency & identity gates

Image-to-image re-posing drifts (hair, logo placement, stripe width). Gates before bake: head-crop dHash across the 4 views ≤ τ_identity; per-material colour histogram ΔE ≤ τ_palette; stripe/garment-boundary positions measured on front/back vs master within 3% of height. A failing view is re-rolled once inside budget; if it still fails, the bake degrades gracefully — the failing view is dropped and its surface area joins mask `M` for inpaint completion (documented in the run report).

### 11.7 Delighting, normals, AO

Plates are prompted flat/shadowless; residual shading is removed by fitting a per-material low-order (linear + quadratic) gradient over the baked albedo and dividing it out (`P-R5`), validated by albedo variance within each material region. Normals: procedural per material slot (fabric weave, shoe leather grain); AO baked deterministically from the mesh (vertex-centred hemisphere sampling at build time, stored per texel). No AI in this stage in MVP.

### 11.8 Garments as material slots

Singlet/shorts/socks/shoes are face sets on the one mesh with their own UV charts and albedo regions. Because the mesh deforms, the white shorts stripe is **one continuous texture region** — scissoring (F5) cannot be expressed, let alone occur. Persona variants = same topology + different bone-scale vector + different baked texture; cross-persona silhouette lock (F3) cannot occur because no persona's texture is ever used as another's template.

### 11.9 Renderer choice, SVG question, and 3D-specific gates

- **Renderer:** the PoC's pure-TS rasteriser grows into production: z-buffer, bilinear UV sampling (mips optional at sprite scale), Lambert + baked AO + optional rim, deterministic byte-identical output, 16/24/48-frame loops trivially cheap. Rejected: three.js/WebGL (headless GL needs native libs/GPU in-sandbox; `headless-gl`/`node-canvas` violate `#nfr-purity`), Python rasterisers (same lock-in rule).
- **SVG:** becomes a *derived* artifact — the existing `svg-vectorizer` traces rendered frames (quantized-band look), or is dropped per user answer (`§9.3`). Vector-native stitching of a deforming mesh is not attempted.
- **New gates (`#feat-perceptual-gates` extension):** reprojection silhouette IoU (rendered R-side vs master plate) ≥ 0.93; UV coverage % (non-hole texels) reported per persona; chart-border seam contrast ≤ τ; albedo variance per material ≤ τ after delight; texture bleed (texel colour crossing a material slot boundary) = 0; plus all Route A §3.8 metrics on rendered frames.

### 11.10 Risk register (Route B specific)

| Risk | Mitigation |
|---|---|
| Multi-view identity/garment drift | §11.6 gates; graceful view-drop into mask `M`; inpaint reconciles minor drift because the base is projected, not invented |
| Diffusion refuses truly flat light | delighting stage absorbs residual; reject plates with cast shadows on the backdrop (magenta makes shadows detectable) |
| Inpaint seams at chart borders | chart cuts along real seams (§11.5); border easing; seam-contrast gate |
| Template topology too crude for face/hands | sprite scale is 220×256 (head ≈ 20 px): validate visually at delivery scale, not at mesh scale; optional head detail card as a decal later |
| Software renderer correctness | synthetic ground-truth rasterisation tests (Sprint 1 harness); determinism hash gate; cross-check vs Route A frames |
| Upfront cost (mesh + UV + skinning authoring) | one-time template asset, versioned in-repo; reused by every persona forever |

### 11.11 Generation budget ledger (per persona, `P-R8` respected)

| Call | Purpose |
|---|---|
| 1 | T0 sagittal master |
| 2–5 | T2 L-side, front, back (+ R-side re-roll reserve) |
| 6–7 | T3 masked UV inpaint (1 + 1 retry) |
| 8 | reserve (swatch or view re-roll) |

Observed today: ~24 calls/persona on PR `#1`. Route B target: ≤ 8, same ceiling as Route A.

### 11.12 Route A vs Route B decision gate (Sprint 3)

Build both personas from the same persona spec: Route A (atlas decomposition, `§3`) and Route B (textured mesh, `§11`). Compare on: §3.8 + §11.9 metric tables, generation calls consumed, engineering hours to first acceptable persona, and blind human review of 16-phase contact sheets. The winner becomes production; the loser is retained as fallback renderer/asset path (Route A's cutouts remain a valid low-cost tier for illustrated personas). Either outcome retires the PR `#1`/PR `#8` extraction magic numbers.

## 12. Changelog

| Version | Date | Addendum | Change |
|---|---|---|---|
| `1.0.0` | `2026-10-18` | `ADD-003` | Initial design of record after assessment of PR `#1` @ `936f37c` and PR `#8` @ `04d5caf` |
| `1.1.0` | `2026-10-18` | `ADD-006` | 3D route evaluated and fully designed (`§11`, `#route-3d`): AI-assist matrix for skin/texture generation, multi-view bake + masked UV inpaint, UV-atlas seam rule, pure-TS renderer derisked by committed PoC evidence, Sprint-3 A/B decision gate |

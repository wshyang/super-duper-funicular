# Pipeline Rev-2 — Revised Photographic Sprite Pipeline for Running Animation (Ideation & Design)

- **Repository / Branch:** `wshyang/super-duper-funicular` · `arena/5ae6f17a-super-duper-funicular`
- **Status:** `[DESIGN — ideation complete, awaiting user decision gate]` per `FDS_BUILDER.md` D1
- **Inputs:** PR `#1` @ `936f37c` and PR `#8` @ `04d5caf` (inspected in `/home/user/review-pr1`, `/home/user/review-pr8`); their FDS corpora (`docs/FDS.md` §8–§12), `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `docs/RECTIFICATION_PLAN.md`, `docs/VALIDATION.md`, `.claude/skills/audit-gait-cycle/SKILL.md`; the flawed reference sheet `incorrect running sprites.jpeg` (SHA-256 `f9911423…`).
- **Related:** `docs/BRANCH_ASSESSMENT.md` (evidence base), `docs/ADDENDA.md` (`ADD-003`), `docs/FDS.md` (`#feat-rev2-*`).

---

## 1. Problem Statement

We must derive **photographic, sprite-based articulated elements** that animate a biomechanically correct running cycle for multiple personas. Two full implementation attempts (PR `#1`, PR `#8`) reached "47/47 tests green, zero islands/spill/uncovered joints" yet both still carry residual visual defects and both report that *most engineering effort went into repairing stochastic image output*, not into animating. The original 8-frame sheet fails even more fundamentally (`FLAW-01..05`: 4 poses doubled into 8 columns, unilateral peg-leg hop, zero leg crossover, 20–25 px jitter).

**Observed cost distribution across both branches (qualitative, from commit subjects and the `IMG-ERR`/`PIPE-ERR`/`RECT-*` registers):**
1. ~40% — regenerating/re-auditing stochastic studio plates (72+ logged `generate_image` calls for 3 photoreal personas);
2. ~30% — deterministic reconciliation of inter-plate disagreement (orientation mirrors, stripe dedup, shoulder sealing, lighting calibration, neck re-cuts);
3. ~20% — joint/seam/assembly polish (rounded caps, end-cap composites, shaft blends, sock collars);
4. ~10% — animation mathematics itself (IK, gait phase, foot roll), which has been *solved and stable* since early commits.

Conclusion: **the animation engine is not the problem. The photographic part-supply chain is.** Rev-2 re-architects the supply chain and keeps the engine.

---

## 2. Root-Cause Taxonomy (Why Rev-1 Kept Failing)

Every defect in the inherited catalogs maps to one of four failure planes. Rev-2 places a contract + gate at each plane.

| Plane | Failure mode (evidence IDs) | Rev-1 mitigation (repair path) | Rev-2 structural answer |
|---|---|---|---|
| **G — Generation** (diffusion output vs intent) | camera twist `IMG-ERR-01`; chirality inversion `IMG-ERR-02`; male anatomy `IMG-ERR-03`; turnaround sheets `IMG-ERR-05`; silhouette/reference lock `IMG-ERR-06,09`; ghost shoes `IMG-ERR-14`; phrase literalism `IMG-ERR-13`; stochastic empties & caps `IMG-ERR-15` | 10 mandatory care rules (FDS §8.3), verbatim prompt log, per-turn visual rejection, regeneration justifications | **Minimise the number of stochastic events** (1 master + ≤2 supplemental plates per persona, §3 Stage 1) and **reject at the door** with a machine-checkable Part Contract (§4) before any plate is filed |
| **X — Extraction** (plate → part cutouts) | orientation reversal `IMG-ERR-10`; throat crop `IMG-ERR-11`; stripe duplication `DEFECT-01/08`; width pinch `PIPE-ERR-03`; sock patches `IMG-ERR-08`; per-persona hardcoded windows `PIPE-ERR-04,06` | per-persona extractor forks + deterministic plate surgery (`mirror…`, `seal…`, `clean…`) | **One landmark-driven decomposer + calibration-as-data** (§3 Stage 2, §5): pivots/crop-windows/widths live in a versioned JSON persona record; surgery functions become rare, logged exceptions |
| **A — Assembly** (parts → posed frame) | cap corners & lighting steps `DEFECT-03,05`; garment continuity `DEFECT-01,06`; far-forearm peek `DEFECT-04`; ground penetration `PIPE-ERR-08`; fringe baseline | rounded-joint cutter, end-cap composites, Hermite shaft blend, Jacobi ball fill, width-parity gate | **Keep Rev-1 engine verbatim** (it works) but bind it to a **Registration Contract** (fixed canvas, ground line, ankle-pivot convention, luminance band) so plates arrive pre-registered (§4 PC-6..PC-9) |
| **V — Verification** (defect discovery latency) | defects visible only at intermediate φ; `/tmp` audits not persisted; `+6 px` penetration shipped | 16-phase dump + multimodal vision per turn | **Golden-frame regression + persisted audit artifacts** (§6): committed small golden sheets per persona; CI-style diff gates; vision reserved for *new* aesthetics, not re-certifying unchanged poses |

**Cross-cutting root cause:** Rev-1 treats each of ~10 plates as an *independent* stochastic sample, then pays to make them agree (lighting, scale, orientation, garment stripes, skin tone). Agreement between independent samples is unbounded work. **Rev-2 makes agreement free by sampling pixels from one photograph per persona wherever anatomy allows.**

---

## 3. Revised Pipeline — Stage Design

```
Stage 0  Persona Definition        (data, no generation)
Stage 1  Constrained Master Gen    (1 stochastic event + ≤2 supplemental)
Stage 2  Landmark Calibration      (semi-auto, reviewed, versioned JSON)
Stage 3  Deterministic Decompose   (pure TS: cut, cap, cuff — from ONE master)
Stage 4  Medial/Far-Side Synthesis  (geometry mirror + appearance transfer)
Stage 5  Part Contract Gate         (machine checks + vision; reject at door)
Stage 6  Assembly & Bake            (Rev-1 IK/rig/SVG engine; sheet + rig outputs)
Stage 7  Regression Audit           (golden-frame diff + telemetry + targeted vision)
```

### Stage 0 — Persona Definition (data)
A persona = `{ bodyPlanId, heightCm, proportionTable, paletteId, garmentSpecId }`. Body plans (`athletic | average | petite | male | female`) are shared geometry archetypes; personas instantiate them. No image generation here. *Kills the per-persona code fork pattern (`PIPE-ERR-04`, PR `#8` dual athletic extractors).*

### Stage 1 — Constrained Master Generation (the only big stochastic event)
Generate **one** master plate per persona with the Rev-1 care rules *plus* Rev-2 additions:
- strict `90°` sagittal profile, **neutral A-stance** (legs parallel, arms relaxed at ~20° abduction — see §7 Q2), full body, flat shadowless light, pure `#FF00FF` field;
- **fiducial scale bar** (known-px cm ruler rendered into the plate margin) so Stage 2 derives absolute px↔cm scale without assumptions;
- garment spec stated once (`garmentSpecId`: singlet colour, shorts stripe geometry, sock height) so every garment pixel in every part comes from this one statement;
- supplemental plates (≤2, justified in `#image-prompt-log`): (a) **medial far-arm L-bend plate** only if Stage 4 transfer fails its contract (§7 Q1), (b) **shoe lateral plate** only if master resolution at foot is below contract.
Budget: **1–3 generations per persona** vs Rev-1's 10–24. Every call still logged verbatim with justification (Rule 2).

### Stage 2 — Landmark Calibration (semi-automatic, versioned)
Auto-detect (alpha bbox, chroma boundary, garment colour masks) then human/agent-review a **Persona Calibration Record** (`src/shared/personas/{personaId}.json`, schema-versioned):
`{ landmarks: { headTop, occiput, C7, shoulder, elbow, wrist, hip, knee, ankle, heel, ball, toe } px, boneLengthsPx, widthsPx, cropWindows, luminanceBand, groundY, revision }`.
This record is the *single source of geometric truth* for Stages 3–6. Rev-1 already proved the value of measured proportions (`ADD-034`); Rev-2 promotes it from prose to schema. Editing calibration never requires touching extractor code.

### Stage 3 — Deterministic Decomposition (pure functions, one master in)
Cut all **lateral-view parts** (`head`, `neck`, `torso`, `pelvis`, near arm ×3, near leg ×3) from the master with:
- similarity-aligned isotropic extraction + semicircular pivot caps (Rev-1 `rounded-joint-cutter.ts`, unchanged);
- **garment cuffs grafted from the same master** (end-cap composite source = master's own shorts/sock rows) — stripe continuity and lighting continuity hold *by construction*, retiring `DEFECT-01/08`, `RECT-01/06` as recurring work;
- orientation canonicalisation (facing `+x`) applied at cut time from the calibration record, with the mirror recorded in the record (`IMG-ERR-10` becomes data, not a bug).
Because all pixels share one lighting environment, `DEFECT-03`-class luminance steps cannot occur between lateral parts.

### Stage 4 — Medial / Far-Side Synthesis (the hard part, made explicit)
The master shows only lateral surfaces; far limbs need **medial** appearance (`FDS §8.1.2`). Rev-2 orders the options by risk:
1. **Geometry mirror + appearance transfer (default):** mirror the lateral limb geometry, then transfer medial shading with a deterministic model: per-row luminance offset curve measured once per body plan from a single reference medial plate (shared across personas of the same plan), plus palette remap. No per-persona generation. Chirality is *structurally* correct because medial-far = mirrored-lateral-near with shaded interior — the thumb/palm detail is painted by rule (palm inward, thumb up at L-bend), not hoped for.
2. **One shared medial reference plate per body plan (fallback):** if transfer fails PC-5/PC-7 on a plan, generate **one** medial L-bend plate for the *plan* (not the persona) and colour-transfer per persona (Rev-1 `Call #21` technique, amortised).
3. **Per-persona medial plate (last resort, logged justification).**
This collapses the single most regeneration-hungry plate class (`08-far-left-arm`, regenerated 3× for athletic alone) to ≤1 per body plan.

### Stage 5 — Part Contract Gate (reject at the door)
Every candidate part (generated or extracted) must pass machine checks **before filing** (§4). Failures produce a structured `part-rejection.json` entry (which PC-* failed, measured values) appended to `docs/FDS.md#image-prompt-log` as regeneration justification — replacing prose-only justifications with measurable ones. Vision inspection (`read_file`) remains mandatory but is now *confirmatory against printed measurements*, which is faster and less drift-prone.

### Stage 6 — Assembly & Bake (Rev-1 engine, unchanged mathematics)
Rev-1's IK/gait/foot-roll/rounded-cap/SVG-stitcher code is adopted as the assembly backend (it is the stable 10%). Additions:
- **Registration Contract** inputs enforced from the calibration record (canvas, `groundY`, ankle pivot, dst bone lengths = record values);
- outputs: (a) per-part PNG bank (runtime rig), (b) stitched SVG frames, (c) **baked N-frame cycle sheets** (8/16/24-frame, magenta-free RGBA, centroid- and baseline-registered) for sprite-sheet consumers — the artifact the original request actually wanted, now derived *from* the rig instead of generated *as* a sheet;
- sheet baker asserts `FLAW-01..04` negatives on its own output (half-cycle IoU < threshold, lead-leg swap present, foot separation crosses 0 twice, baseline jitter ≤ 1 px) — the flaw analyzer becomes a *self-test of the baker*.

### Stage 7 — Regression Audit (persisted, differential)
- Commit **golden artifacts per persona** (small: 16-frame thumb contact sheet ~`440×512`, standing-profile plate, `audit-report.json`) under `docs/audit-golden/{persona}/`;
- CI/`npm test` re-dumps and diffs: telemetry equality (islands/spill/uncovered/ground delta within band), frame IoU vs golden ≥ 0.98 unless the change declares `--rebaseline` with an addendum;
- the 16-phase multimodal vision skill runs on **changed personas only**, plus full-batch at persona add/release;
- `/tmp` stays for scratch, but the *evidence that matters* persists in-repo (fixes assessment §4.3).

---

## 4. The Part Contract (machine-checkable acceptance, `PC-01..PC-12`)

| ID | Check | Threshold / rule | Kills (evidence) |
|---|---|---|---|
| PC-01 | Single connected subject | exactly 1 component ≥ 500 px after keying | `IMG-ERR-05,14` |
| PC-02 | Backdrop purity | keyed field == `#FF00FF` ± 0; spill px == 0 inside bbox | `FLAW-05` |
| PC-03 | Orientation | opaque-mass centroid of anterior landmarks on `+x` side per record | `IMG-ERR-10` |
| PC-04 | Framing margin | opaque bbox inset ≥ 4% of plate on all sides (no contour crop) | `IMG-ERR-11` |
| PC-05 | Contralateral width parity | medial vs lateral shaft width Δ < 15% (Rev-1 gate, promoted to door) | `PIPE-ERR-03` |
| PC-06 | Luminance band | part median L within persona record band ± 8 | `DEFECT-03` |
| PC-07 | Chirality marker | L-bend plates: palm-region hue/side test matches stated hand | `IMG-ERR-02,12` |
| PC-08 | Garment stripe singularity | stripe-colour px present in exactly one of {pelvis, thigh} per record | `DEFECT-01/08` |
| PC-09 | Ground/pivot registration | sole row == record `groundY` ± 1 px at stated ankle pivot | `PIPE-ERR-08` |
| PC-10 | Anatomy class | limb-width/length ratios within body-plan table ± 10% (no male vascular arms, no T-rex shrink) | `IMG-ERR-03,04` |
| PC-11 | No mannequin topology | zero enclosed transparent holes > 3 px inside torso alpha | `IMG-ERR-06` |
| PC-12 | Determinism | re-extract from same master+record ⇒ byte-identical part (hash) | whole X-plane |

Gate implementation: pure TS over `pngjs` buffers, unit-tested with fixture parts that deliberately fail each PC (negative tests, per `GREENFIELD.md §2`).

---

## 5. Calibration-as-Data vs Calibration-as-Code

Rev-1/Rev-8 pattern: `if (tier !== 'average') …`, `cx = 64..102, cy = 82..159`, `shadeScale = 1.08` embedded in extractors ⇒ every persona or plate rebuild forks code (`PIPE-ERR-04`, dual athletic extractors). Rev-2 pattern:

- `src/shared/personas/{personaId}.json` (schema `persona-calibration.v1`): landmarks, crop windows, widths, shade offsets, stripe rects, ground/pivot conventions, `revision`, `provenance: { masterSha256, promptLogRefs }`;
- extractors take `(master, record)` and contain **no persona literals**; the greenfield gate gains a test: `grep` extractor sources for persona ids ⇒ must be zero;
- recalibration = new record revision + addendum entry, diffable and reviewable like any data change.

---

## 6. Audit & Continuous-Learning Integration

- Keep: 16-phase 3-panel dump, 2× joint crops, standing-profile plate, `audit-report.json`, `audit-gait-cycle` skill, per-turn `TURN-L*` register, verbatim prompt log.
- Add: golden-frame regression (§3 Stage 7), `part-rejection.json` structured justifications, per-PC telemetry in `audit-report.json`, and a **cost dashboard** per persona: generations used, rejections per PC, recalibration count — the metric Rev-2 is accountable to (target: ≤3 generations & ≤1 recalibration per new persona).
- Failed-experiment register continues (`docs/RECTIFICATION_PLAN.md §4` pattern): Rev-2 rejects listed in §8 below.

---

## 7. Open Questions (decision gate for the user, `FDS_BUILDER.md` D2/D7)

- **Q1 (medial synthesis):** approve appearance-transfer-first (Stage 4.1) with plan-level fallback, or keep per-persona medial plates (Rev-1 style) for maximum fidelity at ~3× generation cost?
- **Q2 (master pose):** neutral A-stance (best cut geometry, slight arm-torso occlusion at adduction) vs strict anatomical T-stance (zero occlusion, unnatural garment drape) vs Rev-1's relaxed standing pose? Recommend **A-stance at ~20° abduction**.
- **Q3 (sheet consumers):** is the baked cycle sheet (Stage 6c) the primary deliverable format (game-engine sprites), with the rig/SVG as studio formats — or vice versa?
- **Q4 (scope of Rev-2 implementation on this branch):** design-only handoff to PR `#1`/`#8`, or implement Stages 2–5 prototype for one persona here?

## 8. Alternatives Considered & Rejected (do-not-retry register seed)

| Option | Why rejected |
|---|---|
| **R2 — one-shot full-cycle sheet generation + optical registration** | diffusion cannot hold bone lengths/identity constant across phases; that is precisely `FLAW-01..04` of the source sheet; registration cannot repair topology changes between frames |
| **R3 — full 3D human model + orthographic renders** | eliminates G-plane entirely and is the correct *long-term* answer if persona count grows past ~10, but upstream cost (model licence/build, texture bake, render farm contract) is out of scope now; revisit trigger defined in §9 |
| **R4 — vector-first rotoscope as source** | their own trade-off matrix (FDS §10.4): tonal-band quantization loses photographic continuity; keep SVG as *output*, not source |
| **R5 — patch Rev-1 in place (more RECT-*)** | repairs stay downstream of the stochastic supply chain; cost per persona stays ~10 generations + ~9 rectifications; measured trend across Waves 5–9 shows no convergence |

## 9. Phased Rollout & Success Metrics

| Phase | Content | Exit criteria |
|---|---|---|
| P0 (this turn) | Discipline adoption, assessment, Rev-2 design, gate skeleton | `npm test` green on docs/code-invariant gate |
| P1 | Part Contract suite (PC-01..12) + negative fixtures; calibration record schema + loader | all PCs unit-tested; record validates for 1 existing persona back-filled from PR `#8` measurements |
| P2 | Single-master decomposer (Stage 3) for `photo-sg-chinese-female`; golden artifacts committed | parts byte-deterministic (PC-12); 16-phase audit ≤ Rev-1 defect counts; ≤2 generations used |
| P3 | Stage 4 transfer model + plan-level medial fallback; persona #2 via **data only** | new persona cost: 1 master gen + 1 record; zero extractor code changes |
| P4 | Sheet baker with FLAW self-tests + regression diff gate in CI | baked 8/16-frame sheets pass `FLAW-01..04` negatives; golden diff gate blocks un-declared pose drift |
| Revisit R3 trigger | — | persona count > 10 *or* per-persona cost fails target two phases running |

**Headline metrics:** generations/persona ≤ 3 (was 10–24); reconciliation code paths/persona = 0 (was ≥ 4 surgery functions); visual-defect discovery latency = same-turn automated (was per-turn vision luck); ground-line delta on support frames ≤ +2 px (contract PC-09).

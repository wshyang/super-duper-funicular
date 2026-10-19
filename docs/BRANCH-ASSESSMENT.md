# Branch Assessment — PR `#1` (Sprite Motion Lab) & PR `#8` (Athletic Rebuild)

- **Assessment Date:** 2026-10-18 (updated 2026-10-19 for branch advancement + implementation kickoff)
- **Assessed On Branch:** `arena/907ce374-super-duper-funicular` (this repository's active session branch)
- **Working Checkouts (detached, outside the session repo):**
  - PR `#1` → `/home/user/pr1-sprite-motion-lab` (`origin/arena/917ef347-super-duper-funicular` @ `96a284f` — *"docs(branches): update N-way branch tips ledger"*; advanced from `936f37c` with the pose-bank harvesting era: `ADD-042`..`ADD-045`, `TURN-L25`..`TURN-L28`, `IMG-ERR-17..20`, `PIPE-ERR-09..14`)
  - PR `#8` → `/home/user/pr8-athletic-rebuild` (`origin/arena/e1300d3c-super-duper-funicular` @ `9d448fe` — *"Explore camera-far forearm pose diversity"*; advanced from `04d5caf` with the pose-bank regeneration pipeline: `3e6ad93` strategy, `60ca653` pipeline + guide renderer, `a9ca795` pose inserts, `dcbb9eb` X04 retry, `5330a64` head-neck fix)
- **Update (`2026-10-19`, implementation kickoff):** both branches have since advanced to a **pose-bank harvesting** architecture — full-body running phase keyframes conditioned on the verified master, with jigs harvested from the phase of maximum chroma clearance (`phase-frame-harvester.ts`, `PHASE_VARIANT_JIG_SPECS`, 35 jigs at `averageCoreCoverageRatio = 0.991`). This independently converges on the revised pipeline's Stage-1 insight (minimize stochastic surface area; derive parts from coherent full-body frames), and is adopted as this repo's implementation base (`ADD-046`). See `docs/PIPELINE_IDEATION.md §7`.
- **Related Documents:** [`docs/PIPELINE_IDEATION.md`](./PIPELINE_IDEATION.md) (revised pipeline ideation), [`docs/ADDENDA.md`](./ADDENDA.md) (`ADD-001`..`ADD-049`), `CLAUDE.md` (adopted discipline), [`docs/VALIDATION.md`](./VALIDATION.md) §4 (this session's validation record).

---

## 1. Provenance Statement (4-Way Separation, per adopted `CLAUDE-validation.md §8.1`)

| Category | What Was Done This Turn |
|---|---|
| **Read source code** | Full read of both branches' `docs/FDS.md` (v5.1.0 @ 1,097 lines; v4.10.0 @ 1,032 lines), `docs/SPEC.md`, `docs/ADDENDA.md` (`ADD-001`..`ADD-041`), `docs/RECTIFICATION_PLAN.md`, `docs/VALIDATION.md`, `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, all `CLAUDE*.md` + `GREENFIELD.md` + `FDS_BUILDER.md`, `.claude/skills/audit-gait-cycle/SKILL.md`, `src/runner/gait.ts`, `src/runner/photoreal-rig.ts`, and the file inventories of both trees. |
| **Personally viewed visual output** | **None.** This assessment environment has no image-vision capability; every visual claim below is attributed to the branches' own FDS logs or to numeric measurements I computed myself (see §4). |
| **Locally executed validation gates** | `npm install` + `npm run typecheck` + `npm test` executed in **both** working checkouts: PR `#1` @ `936f37c` → typecheck clean, **47/47 Vitest tests passed** (7 suites); PR `#8` @ `04d5caf` → typecheck clean, **47/47 Vitest tests passed** (7 suites). Independent Python re-analysis of the root flawed spritesheet (`incorrect running sprites.jpeg`, JPEG SOF0 `2528×1696`, 3 components). After the `2026-10-19` branch advancement, the ported PR `#1` tip `96a284f` base re-verified in this repo: typecheck clean, **80/80 tests** (55 inherited + 25 new), plus `pipeline`, `harvest-phases`, `dump-cycle`, `acceptance`, and `parts:manifest` gates (see `docs/VALIDATION.md §4`). |
| **Other branches' reported results** | All test counts, audit telemetry (`detachedIslands = 0`, `magentaSpill = 0`, …), and generation-call histories quoted from the branches' own docs are labelled as such and are **not** claimed as locally executed beyond the gates above. |

---

## 2. What the Two Branches Are Attempting to Do

Both branches attack the same root problem: the repository's seed asset (`incorrect running sprites.jpeg`) is a **6-color × 8-frame AI-generated running spritesheet that fails biomechanically**, and the goal is a pipeline that produces **photographic, individually articulated running-sprite elements** for running animations.

### 2.1 Shared Diagnosis (verified independently this turn)

Both branches begin from the same quantitative flaw analysis of the seed sheet, which I **reproduced independently in Python** this turn:

| Flaw | Branch Claim (`docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`) | My Independent Measurement |
|---|---|---|
| Half-cycle duplication (`FLAW-01`) | Frames 5–8 duplicate 1–4; mean centroid-aligned silhouette IoU `94.7%` | Centroid-aligned IoU frame *k* vs *k*+4: **0.86–0.98 per row, mean ≈ 0.93–0.95** across all 6 color rows ✅ consistent |
| Height inconsistency (`FLAW-04`) | `20 px` character-height variation | Measured tight-bbox height spread **20–25 px** across all 6 rows ✅ |
| Baseline jitter (`FLAW-04`) | `25 px` ground-line shift | Measured bottom-y spread **25–26 px** per row ✅ |
| Two-tone magenta (`FLAW-05`) | Cell bg `#FD49FD` vs divider `#FF00FF` | Pixel samples: cell interior `RGB(252,73,252)` ≈ `#FD49FD`, divider `RGB(251,1,248)` ≈ `#FF00FF` ✅ |

(`FLAW-02` unilateral lead-leg lock and `FLAW-03` zero leg crossover are consistent with the frame-to-frame IoU structure I measured — adjacent-frame IoU ≈ 0.34–0.49 vs half-cycle IoU ≈ 0.94 — but precise foot-separation measurements require vision inspection I cannot perform in this environment; I accept the branches' measurements as reported.)

### 2.2 Converged Architecture (both branches)

1. **Dedupe & filing** — byte SHA-256 / RGBA-pixel SHA-256 / 64-bit dHash cataloguing under `src/images/` (`#feat-dedupe`).
2. **Chroma-key extraction & flaw analysis** — pure-TypeScript (`jpeg-js`/`pngjs`) border-seeded flood-fill magenta keying of the seed sheet into 48 registered `220×256` cutouts + quantitative flaw report (`#feat-extract`, `#feat-analyze`).
3. **Photographic studio plate generation** — per persona, ~10 diffusion-generated `#FF00FF` studio plates (full-body master, head, ponytail, neck cylinder, torso, pelvis/shorts, near arm lateral, far arm medial 90° L-bend, near leg lateral, far leg medial).
4. **Deterministic part extraction** — `photoreal-extractor.ts` (+ persona-tier variants) segments the plates into **17 standardized `160×160` RGBA cutouts** with semicircular rounded joint ends (`rounded-joint-cutter.ts`), end-cap composites (shorts cuffs, sock collars), matte purges, Jacobi joint-ball relaxation, and width-parity gates.
5. **Procedural rig authority** — 17-part articulated rig, analytical 2-bone IK, contralateral anti-phase gait solver (`gait.ts`), 2-segment plantar rolling foot (`foot-roll.ts`), cervical neck, forward-fall lean, 3 locomotion modes (`run`/`walk`/`brisk-walk`).
6. **Compositing** — per-pixel inverse-warp of photographic cutouts onto solved pose quads (`photoreal-warp.ts` → `photoreal-rig.ts`), back-to-front painter's Z-order.
7. **Vectorization** — raster→SVG vectorizer (Chaikin-smoothed Bézier clip paths + quantized tonal bands) + hierarchical 6-parameter affine SVG rig stitcher.
8. **Audit** — 16-phase full-cycle dumper (`dump-cycle`), 3-panel diagnostic plates, 2× joint-crop sheets, standing-profile calibration plate, island/spill/uncovered-joint telemetry; interactive web studio (React 18 + Vite 6).

### 2.3 Where They Differ

| Dimension | PR `#1` — Sprite Motion Lab (`917ef37c`) | PR `#8` — Athletic Rebuild (`e1300d3c`) |
|---|---|---|
| **Posture** | Originating implementation; broadest scope (758 files) | Calibration-focused continuation (710 files) |
| **Headline work** | 17-part engine, rounded joint cutter, SVG vectorizer/stitcher, 21-call prompt audit log, flaw analysis | Athletic studio-plate rebuild (`c5df4e7`), bust/landmark/cache/collarbone rectifications (`ADD-036`..`038`), five-persona batch gait audit (`04d5caf`) |
| **Mistake catalogs** | Distilled `IMG-ERR-01..16` + `PIPE-ERR-01..08` into FDS §8.4 (incorporating PR #8's learnings) | Originated the later-wave learnings (`TURN-L13`..`L21`): body-positive personas, bust landmark lift, cache-busting, collarbone bulb |
| **Persona set** | 5 personas (2 procedural + 3 photoreal tiers: petite/athletic/average) | Same 5, with `all-personas` batch audit mode |
| **Known open issue** | Athletic ground-line delta `-9..+2 px` (within tolerance) | **Athletic support-foot penetration up to `+6 px`** below the `y=234` ground line — explicitly logged as the next calibration item |
| **Local gates (this turn)** | typecheck ✅ clean; **55/55 tests ✅** at tip `96a284f` (47/47 verified at earlier tip `936f37c`); **1 inherited red discipline-gate assertion** (stale ledger SHA — see §4.1) | typecheck ✅ clean; **47/47 tests ✅** at `04d5caf`; tip `9d448fe` not separately gate-verified (read-source only) |

Both branches have been **harmonised into near-parity** (PR #1's FDS v5.1.0 explicitly incorporates PR #8's learnings as `ADD-039`/`ADD-041`); they are two points on one convergent design trajectory, not competing designs.

---

## 3. Assessment: What Each Branch Does Well

**Both branches (shared strengths):**
- **Discipline is real and mechanically enforced** — `greenfield-gate.test.ts` gates function/file length, JSX purity, `data-testid` coverage, documentation invariants; the addendum register (`ADD-001..041`) and verbatim prompt log (`Calls #01..#72`) are exemplary provenance practice.
- **The procedural rig and gait solver are demonstrably correct** — 0 detached islands, 0 magenta spill, 0 uncovered-joint frames across all 5 personas and 16 phases; true contralateral anti-phase, two leg crossovers, two flight phases per cycle. This is the strongest, most reliable component either branch has.
- **The audit tooling is genuinely good engineering** — 16-phase dumps, pose-adaptive joint crops, standing-profile calibration, telemetry JSON, batch modes. It turns "does it look right?" into measurable signals.
- **The flaw analysis of the seed sheet is quantitatively honest** and independently reproducible (§2.1).

**PR `#1` specifically:** the SVG vectorizer + hierarchical stitcher is a real differentiator (resolution-independent output with exact affine bone matrices); the `IMG-ERR`/`PIPE-ERR` catalogs are the most valuable institutional knowledge in the repo.

**PR `#8` specifically:** the body-positive 3-tier persona spectrum with source-calibrated tuning defaults, the neutral upright standing calibration stage, and the cache-busting fix are well-founded responses to real user-reported defects.

## 4. Assessment: Structural Issues Both Branches Share (the "problems encountered")

Reading the FDS catalogs end-to-end, the 16 `IMG-ERR` classes, 8 `PIPE-ERR` classes, and 9 `DEFECT` classes reduce to **five structural root causes** — these are what a revised pipeline must fix:

1. **Stochastic source-of-truth.** Every persona's photographic truth is ~10 *independent* diffusion generations. Independent samples cannot agree on identity, skin tone, lighting, or proportion, so the pipeline accumulates a growing library of deterministic *repair* code for the inconsistencies (`purgeSkinPartFabricSpill`, `cleanSockAnkleSpot`, `shadeScale = 1.08`, `sealAthleticTorsoShoulderBulge`, `raiseAthleticBustLandmark`, Jacobi relaxation, …). Each fix is a patch on noise, and each new persona re-rolls the dice (72 logged generation calls for one persona family; `MAX_TOKENS` empty payloads; a hard 10-image-per-turn platform cap that throttles repair loops).
2. **2D cutout warping cannot rotate a photograph.** Flat studio plates rotated around joint pivots carry their lighting with them (the deltoid highlight that rotates with the bone — `DEFECT-05`), produce resampling islands at grazing angles (`DEFECT-02`), and cannot represent medial *and* lateral surfaces without twice as many plates (the lateral/medial asymmetry problem that forced the 10-plate studio in the first place).
3. **Chirality and view prompts fight diffusion priors.** The 90° L-bend trick for left-arm chirality (`IMG-ERR-02`) is clever but is itself evidence that isolated-part prompting is unreliable; the same class of prior fights produced camera twist (`IMG-ERR-01`), turnaround sheets (`IMG-ERR-05`), ghost second shoes (`IMG-ERR-14`), and mannequin sockets (`IMG-ERR-06`).
4. **Verification is manual and per-turn.** Acceptance is "agent eyeballs via `read_file`" — non-deterministic, expensive, non-reproducible, and throttled by the same per-turn image cap. There is no automated *acceptance gate* on generated plates before they enter the pipeline.
5. **Per-persona branching instead of parameterization.** Body-build tiers (petite/athletic/average) each require a full new 10-plate generation campaign, even though the *geometry* differences are exactly what the procedural rig's tuning spec already parameterizes.

**Net verdict:** both branches are disciplined, honest, and mechanically green — but they are optimizing *within* an architecture whose root cost (stochastic per-part plate generation + manual visual acceptance + 2D photo warping) keeps recurring every time a persona, pose, or garment changes. The revised pipeline should change *where the photographic content enters the system*, not just how it is repaired downstream. See [`docs/PIPELINE_IDEATION.md`](./PIPELINE_IDEATION.md).

### 4.1 New Findings from the Automated CV Acceptance Gates (`2026-10-19`, `ADD-047`)

Implementing the revised pipeline's automated gates (`scripts/plate-acceptance.ts`) over the inherited real asset base produced objective, previously-unmeasured evidence:

- **All 11 full-body phase frames pass every gate** — the pose-bank source material is clean.
- **Isolated studio plates fail materially:** athletic 4/10, average 2/10, petite 7/10 pass.
- **The entire average-persona studio set sits on a non-canonical violet-magenta backdrop** (dominant border `RGB(209,48,169)`-class, ΔRGB ≈ 90 from canonical `#FF00FF`) that breaks the canonical magenta keyer — the root cause the branches had papered over with persona-specific `isAvg` extractor branches and `extractSimilarityAlignedPart` similarity alignment. This was never flagged by the branches' manual audits.
- **Athletic `07-near-right-arm` fails the single-subject gate** (2 opaque components ≥ 500 px) — a detached fragment the manual audits never caught.
- **Inherited red gate:** PR `#1` tip `96a284f` fails its own `greenfield-gate.test.ts` ledger assertion (stale `docs/N_WAY_COMPARISON.md` missing PR `#8` pose-bank SHA `60ca653`); fixed in this repo via the `CROSS-22` ledger refresh.

Full per-plate, per-gate measurements: `docs/plate-acceptance-{photoreal-female,photoreal-female-average,photoreal-female-petite,photoreal-female-phases}.json`.

---

## 5. Recommendation Summary

- **Keep:** the procedural 17-part IK rig + gait solver (make it the sole geometry authority), the audit/telemetry tooling, the flaw analysis, the FDS/addendum/prompt-log discipline, the pure-TypeScript raster constraint.
- **Change:** collapse the 10-plate stochastic studio into (a) **one verified master plate per persona** with deterministic derivation of all parts (Stage 1), then (b) **photographic texture tiles mapped onto procedural geometry** (Stage 2), optionally (c) a true 3D render pass if photographic rotation fidelity is a hard requirement (Stage 3).
- **Automate acceptance:** replace per-turn manual `read_file` auditing with manifest-driven batch generation behind CV acceptance gates (single-subject, sagittal-profile, background-uniformity, single-shoe, chirality, skin-tone-consistency, silhouette-lock checks).
- **Full rationale, options matrix, and traceability to every documented defect class:** [`docs/PIPELINE_IDEATION.md`](./PIPELINE_IDEATION.md).

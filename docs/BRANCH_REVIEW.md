# Branch Review — PR #1 and PR #8

Evidence-based assessment of the two branches that attempted the photographic
running-sprite pipeline. Both were extracted to working directories and executed
locally before being assessed.

| | PR #1 | PR #8 |
|---|---|---|
| Branch | `arena/917ef347-super-duper-funicular` | `arena/e1300d3c-super-duper-funicular` |
| Tip reviewed | `936f37c` | `04d5caf` |
| Working copy | `/home/user/review/pr1` | `/home/user/review/pr8` |
| Commits after base | 14 | 15 |
| Tracked files | 758 | 710 |
| TypeScript LOC (`src/`) | 13 507 | 13 603 |
| Test LOC | 1 223 | 1 202 |
| Docs LOC (`docs/` + root `*.md`) | 4 327 | 4 143 |
| Source photographs | 30 (3 personas × 10 plates) | 30 |
| `FDS.md` | 1 097 lines | 1 032 lines |
| Prompt-log calls | 72 | 72 |
| `npm run typecheck` | **pass** | **pass** |
| `npm test` | **47/47 pass** | **47/47 pass** |
| `npm run dump-cycle` (5 personas) | exit 0, islands 0, spill 0 | exit 0, islands 0, spill 0 |
| Provenance | executed locally, this review | executed locally, this review |

Both branches are technically healthy: they build, they type-check, their tests
pass, and their diagnostic dumper runs to completion. The problems are
architectural, not operational, and that is why they kept recurring after each
individual fix.

---

## 1. What the two branches were trying to do

Both branches implement the same idea, refined over roughly seventy image
generation calls:

1. Take a photographic **master** lateral profile of a runner.
2. Decompose the body into **seventeen articulated parts** (`head`, `hairAccessory`,
   `neck`, `torso`, `pelvis`, near/far × upper arm, forearm, hand, thigh, shin,
   foot).
3. Use **ten studio plates** per persona, one per body region, each photographed
   against `#FF00FF` and each meant to show a specific *surface* of a specific
   *side* (near-limb lateral, far-limb medial, far arm inside-palm).
4. Cut each part out with **semicircular rounded joint ends** centred on a pivot
   so that rotation about the pivot cannot open a corner.
5. Pose the parts with a **17-part gait solver** (two-bone IK, two-segment foot
   roll, contralateral phase, cervical-neck counter-rotation).
6. Composite back-to-front, then **warp** each cutout into its posed quad.
7. Audit the result with a 16-phase frame dumper and repair defects.

The ambition is sound. The decomposition into seventeen parts is anatomically
motivated and the reasoning in `docs/FDS.md §8.1` is genuinely good work. The
error is the assumption that **independently photographed parts can be
reassembled into a coherent whole.**

---

## 2. What the branches achieved

Credit where it is due — several components are worth keeping and are carried
into this repository's design:

| Component | PR #1 | PR #8 | Verdict |
|---|---|---|---|
| Two-bone analytical IK, contralateral phase, foot roll | ✔ | ✔ | Keep. Correct and testable. |
| Sixteen-phase diagnostic dumper + joint-crop sheet | ✔ | ✔ | **Keep and extend.** This is the single most valuable artefact either branch produced: it turns "looks wrong" into a numbered defect. |
| Per-frame telemetry (`islands`, `spill`, `groundDelta`) | ✔ | ✔ | Keep. Necessary, not sufficient. |
| Additive end-cap composite (shorts cuff grafted onto thigh) | ✔ | — | Keep the *idea*; superseded by continuous skinning. |
| Neutral upright calibration stage (source vs. rig side by side) | ✔ | ✔ | Keep. Comparing the rig against its own source is the right instinct. |
| Prompt/regeneration audit log | ✔ (72 calls) | ✔ (72 calls) | **Keep the discipline**, reduce the volume. |
| Side-profile arm extractor (deterministic, from the master) | ✔ | ✔ | Keep the principle: prefer deterministic extraction over a new generation. |
| Five-persona batch audit | ✔ | ✔ | Keep. |
| Raster→SVG vectorizer | ✔ | — | Out of scope for the core problem; harmless. |

---

## 3. What went wrong, measured

The following are not opinions. Each is a defect the branches themselves logged,
or that this review reproduced from their committed output.

### 3.1 The seam problem is structural, not a tuning problem

Both branches cut each limb with a semicircular cap about a pivot and rotate it.
Two independently photographed limbs, rotated about a shared point, can be made
to *cover* the joint — but they cannot be made to *match* at the joint. Skintone,
studio falloff, and garment edges were photographed under different framing on
different plates. PR #1 logs this repeatedly:

- `DEFECT-05`: "the circular deltoid cap of `nearUpperArm` had slightly brighter
  studio specular highlights than the surrounding shoulder-socket skin of
  `torso.png`."
- `DEFECT-03`: far forearm "noticeably darker/browner" than the far upper arm.
- `PIPE-ERR-03`: a 28.57 % mid-shaft width pinch introduced by the cutter itself.

The mitigation — a 6 px Hermite blend and calibrated `shadeScale` per part — is a
per-part, per-persona fudge that must be re-derived for every new persona. That
is the signature of a structural defect wearing a parameter's clothes.

### 3.2 Occlusion is approximated by painter's order and keeps failing

A strict lateral runner has a genuinely three-dimensional occlusion pattern:
the far arm passes behind the torso and re-emerges, the far leg crosses behind
the near leg twice per stride, the near hand crosses the waist. A fixed
`zOrder = 1..17` cannot express this, so the branches patched it with pose
conditions:

- `DEFECT-04`: at φ = 0.50 a 3 px strip of the far forearm "peeked out behind
  the posterior edge of the crimson singlet", fixed by adding a `farRearTuck`
  term to the arm solver.
- `IMG-ERR-14`: a second shoe rendered behind the support shoe on three separate
  personas.
- `RECT-04`, `RECT-07`, `RECT-08`: further per-phase, per-persona patches.

Each patch is correct locally and adds a branch that a future persona can fall
outside of.

### 3.3 Proportions were tuned to the artwork instead of the artwork to the anatomy

This is the most damaging failure and both branches document it:

- PR #8 `ADD-026` shrank `upperArmLength 30 → 21` and `forearmLength 27 → 18`
  because the generated arm plates were oversized. Result: "T-rex arms"
  (`IMG-ERR-04`), arm/leg ratio 0.43.
- `ADD-029` reversed it to 24.5 / 21.5 (ratio 0.535) and added an algorithmic
  side-profile arm extractor.
- PR #8 then introduced `torsoLengthScale: 1.25 / 1.35 / 1.28` per persona and
  `shoulderOffsetY`, `hipOffsetY` offsets, because the cutouts did not sit on the
  generic skeleton.

Tuning bone lengths to compensate for a bad cutout inverts the dependency. The
skeleton is the objective truth about a human; the cutout is a noisy
observation of one photograph. When they disagree, the cutout is wrong.

### 3.4 Per-persona magic constants exploded

Measured in the extracted working copies:

| Metric | PR #1 | PR #8 |
|---|---:|---:|
| Crop boxes / pivots / warp endpoints in `photoreal-extractor.ts` | 50 | 49 |
| Persona conditionals (`isAvg`, `isPetite`, `=== 'photo-…'`) in that file | 80 | 79 |
| Distinct literal integers in that file | 191 | — |
| Extractors | 3 (`photoreal`, `athletic-reference`, `side-profile-arm`) | 4 (+ `athletic-rebuilt`) |
| `photoreal-extractor.ts` length | 773 LOC | 798 LOC |

Adding a fourth persona means editing every one of those ternaries. PR #1's own
`PIPE-ERR-04` is exactly this bug: "`personaId === '…-average' ? … : …`
silently routed `petite` to `athletic` defaults."

The file is also at 798 lines against an 800-line gate, which means the gate is
about to fail and the file cannot grow at all.

### 3.5 The asset pipeline requires ten generations per persona

Ten plates × three personas = 30 photographs, each needing a prompt, a review,
and often a regeneration. The prompt log records **72 calls**, of which at least
8 were rejected outright and 3 superseded — and the same defects recur across
personas (`IMG-ERR-14` second shoe, `IMG-ERR-06` cross-build lock, `IMG-ERR-03`
male arms on a female persona).

The ten-plate requirement exists *only because* the renderer needs isolated limb
textures. It is a consequence of the architecture, not a property of the subject.

### 3.6 Gates measure cleanliness, not correctness

Both branches report, for all five personas, `detachedIslands = 0`,
`magentaSpill = 0`, `uncoveredJointFrames = 0` — and then, in the same document,
report up to **+6 px of support-foot penetration** on the athletic persona,
thousands of semi-transparent fringe pixels, and a torso that had to be mirrored
because it was facing the wrong way.

Nothing measured that the far forearm was 28.57 % too narrow until a human
looked. There is no gate for *anatomical plausibility*; there is only a gate for
*drawing hygiene*.

### 3.7 The documentation outgrew the thing it documents

4 327 lines of documentation against 13 507 lines of code, and within those
4 327 lines:

- the same five-way comparison table is committed **four times**
  (`N_WAY_COMPARISON.md`, `docs/N_WAY_COMPARISON.md`, `THREE_WAY_COMPARISON.md`,
  `docs/THREE_WAY_BRANCH_COMPARISON.md` — byte-identical, verified by md5);
- `GREENFIELD.md` is committed twice (root and `docs/greenfield/`);
- every turn appends a `TURN-LNN` entry whose purpose is to record that the turn
  happened.

PR #1 devotes four consecutive commits to refreshing branch tips and no commit
to the pipeline. That is a documentation process that has become the product.

### 3.8 The prompt log conflates "recorded" with "learned"

`IMG-ERR-01..16` and `PIPE-ERR-01..08` are genuinely useful, and this
repository's design inherits them. But they are also a record of *the same
architecture failing twenty-four different ways*. A catalogue of 24 failure modes
for one subsystem is evidence that the subsystem's shape is wrong.

---

## 4. The judgement

PR #1 and PR #8 are **high-quality implementations of an approach that cannot
meet its own quality bar.** Every individual defect was correctly diagnosed and
locally fixed; the fixes did not converge, because the residual error is
inherent in (a) rigid part rotation with hard caps, (b) fixed-layer occlusion,
and (c) deriving skeletal proportions from art.

Continuing to patch them will produce a twenty-fifth `IMG-ERR` entry. The
revision in [`docs/PIPELINE.md`](./PIPELINE.md) changes the load-bearing
assumption — parts become derived artefacts of a continuous surface — while
keeping everything that worked.

The reference implementation of that revision lives in this repository. Where it
succeeded and where it did not is recorded in
[`docs/VALIDATION.md`](./VALIDATION.md); the decisions that had to change once
the code disagreed with this document are in
[`docs/ADDENDA.md`](./ADDENDA.md). In particular, three of the eight defect
families below appeared again during implementation in a new form — porous
keying, occlusion without depth, and optimising a metric that does not measure
what a viewer sees — and are documented there rather than being assumed solved.

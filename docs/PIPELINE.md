# Revised Pipeline Design

- **Status:** proposal for review; the control-plate and gate stages are
  implemented in `src/`, the appearance stage is specified and partially
  implemented (see `docs/VALIDATION.md`).
- **Inputs:** [`docs/BRANCH_REVIEW.md`](./BRANCH_REVIEW.md) — the measured
  failure record of PR #1 and PR #8.
- **Decision register:** `ADD-007` … `ADD-014`.

---

## 1. The question worth answering

> How do we produce photographic running sprites that are *photographic*
> (skin, fabric, shoes, drapery read as a photograph), *correct* (the pose is
> the pose we asked for, the anatomy is an adult human's, the feet touch the
> ground), and *repeatable* (a new persona costs hours, not a day of
> regeneration roulette)?

The previous branches optimised for "photographic" with a paper-doll of
independently photographed parts, and lost "correct" and "repeatable". The
opposite extreme — a procedurally drawn flat-shaded puppet — is always correct
and repeatable and never photographic.

The design below is built on one claim:

> **Geometry and appearance must come from different sources, and the boundary
> between them must be a single explicit interface.**

The rig owns geometry. The photograph owns appearance. The interface is a
**texture atlas in bone-local coordinates**. Nothing else may cross.

---

## 2. Why the previous architecture could not converge

Five load-bearing assumptions, each of which is falsifiable and was falsified:

| # | Assumption | Observed failure |
|---|---|---|
| A1 | Independently photographed parts can be recombined seamlessly | Skintone/highlight mismatch at every joint (`DEFECT-03`, `DEFECT-05`) |
| A2 | A fixed z-order can express runner occlusion | Far forearm peeking behind the back; ghost second shoe (`DEFECT-04`, `IMG-ERR-14`) |
| A3 | Bone lengths may be tuned to match the cut art | T-rex arms; three per-persona length scales (`IMG-ERR-04`, `ADD-026/029`) |
| A4 | Each persona needs its own ten studio plates | 72 generations, repeated cross-build contamination (`IMG-ERR-06`) |
| A5 | Rounded caps make a joint rotation-invariant | Rotation-invariant, but not *appearance*-invariant — the cap is still a cut |

Every one of those follows from the same root: **the part boundary is a
photograph boundary.** Once you cut a photograph, you have committed to a seam,
a z-order, and an independent lighting sample.

The fix is to stop cutting. Deform a continuous surface instead.

---

## 3. Options considered

### Option A — Whole-frame generative animation (image model per frame)

Generate each of the 16 frames directly, conditioned on the previous frame for
temporal coherence, guided by a pose skeleton.

- **Strengths:** best possible photographic quality; occlusion, hands, shoes and
  drapery are all internally consistent because a single render produced them.
- **Weaknesses:** 16 generations per cycle *per persona*; frame-to-frame
  identity drift (hands and shoes change shape between phases); no way to
  guarantee the pose matches the rig; failures are silent and expensive. This is
  the classic video-consistency problem and it is not solved by more prompts.
- **Verdict:** rejected as the backbone. Retained as an optional *finishing* pass
  on a single reference image (§5.6).

### Option B — Paper-doll with rounded caps (PR #1 / PR #8)

- **Strengths:** deterministic; per-frame cost ~0; art is photographic because
  someone photographed it.
- **Weaknesses:** §2. Non-convergent.
- **Verdict:** rejected.

### Option C — Skinned 2.5D puppet with a bone-local texture atlas

Build **one** continuous surface per occlusion layer, texture it from **one**
photograph, and deform it with smooth skinning.

- **Strengths:** no seams by construction (the surface is continuous); occlusion
  expressed by a small number of *layers*, not by 17 independent cards; joints
  stretch smoothly instead of rotating hard caps; one persona = one plate; the
  pose is exactly the rig's.
- **Weaknesses:** the atlas needs texture for regions occluded in the source
  plate (the torso under the hanging arm, the far limb behind the near one).
  Mitigation in §5.4.
- **Verdict:** **recommended**, with Option D as its deterministic fallback.

### Option D — Flat-shaded procedural puppet (no photograph at all)

- **Strengths:** trivially correct, trivially repeatable, no generation budget,
  ships today.
- **Weaknesses:** not photographic. This is the baseline the project exists to
  beat.
- **Verdict:** kept as the **always-available fallback** (P.7). If the atlas is
  missing or fails its gates, the pipeline still emits an animating sprite.

### Option E — 3D model, render to sprites

Model once, rig, animate, render 16 frames from an orthographic side camera.

- **Strengths:** perfect occlusion and proportion; arbitrary camera angles later.
- **Weaknesses:** requires a 3D asset pipeline (authoring time, a renderer, a
  GPU or an offline renderer, a licence) that this repository deliberately does
  not have, and the "photographic" quality then depends on a texture artist.
  It also quietly discards the existing photographic evidence.
- **Verdict:** rejected for now; noted as the natural successor if the deliverable
  ever needs more than a side view.

### Summary

| | Seam-free | Correct occlusion | Pose exact | Photographic | Cost per persona | Verdict |
|---|---|---|---|---|---|---|
| A Whole-frame gen | ✔ | ✔ | ✘ | ✔✔ | 16 gen + curation | finishing pass only |
| B Paper-doll (status quo) | ✘ | ✘ | ✔ | ✔ | 10 gen + curation | rejected |
| **C Skinned 2.5D atlas** | **✔** | **✔** | **✔** | **✔** | **1 plate + atlas build** | **recommended** |
| D Flat procedural | ✔ | ✔ | ✔ | ✘ | 0 | fallback |
| E 3D | ✔ | ✔ | ✔ | ✔ | model authoring | later |

---

## 4. The proposed pipeline

```
                    ONE photograph per persona
                              │
                    ┌─────────▼──────────┐
   S0  INGEST       │ key · landmarks    │  measured, not hand-tuned
                    │ palette · bands    │──► persona.json
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
   S1  ATLAS        │ skeletal partition │  pixels → (bone, u, v)
                    │ unfold to bone-    │  occluded regions filled
                    │ local atlas        │  and flagged
                    └─────────┬──────────┘
                              │
                              │        ┌───────────────────────────┐
   S2  RIG SOLVE   phase ─────┼───────►│ 2-bone IK · foot roll ·   │──► skeleton.json
      (per frame)             │        │ trunk · neck · hair       │──► control plate (PNG)
                              │        └───────────────────────────┘
                    ┌─────────▼──────────┐
   S3  DEFORM      │ per-pixel bone-    │  atlas sampling,
      (per frame)  │ frame sampling     │  2 layers, fixed order
                    └─────────┬──────────┘
                    ┌─────────▼──────────┐
   S4  GATES       │ pop · drift ·      │  per frame AND per persona
                    │ ground · coverage  │  machine-readable report
                    └─────────┬──────────┘
                    ┌─────────▼──────────┐
   S5  DELIVER     │ frames · atlas ·   │  manifest: pivots, trim,
                    │ manifest · SVG     │  foot anchors, gate scores
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
   S6  OPTIONAL    │ atlas completion   │  ≤ 3 generations, per persona,
      (rare)       │ by image model     │  never per frame
                    └────────────────────┘
```

### S0 — Ingest: measure the plate, do not annotate it

Input: one lateral standing photograph on a flat chroma backdrop, subject
facing `+x`.

The profiler (`src/profile/master-profile.ts`) produces `persona.json`:

- `detectedKey`: the backdrop colour, sampled from the image border median — so a
  plate that is `#DD4AA4` rather than `#FF00FF` still keys correctly. (Both prior
  branches hard-coded `#FF00FF` and both shipped plates that were not.)
- `landmarks`: **measured** — `headTop`, `sole`, garment boundaries
  (`shoulder` = first row where singlet pixels exceed half their peak count,
  `waist` = last singlet row, `hip`/`shortsHem` = first/last dark shorts row,
  `sockTop` = first white row near the ankle).
- `landmarks`: **derived** — joint centres (`knee`, `ankle`, `hip`, `shoulder`
  joint) from anthropometric fractions of the measured stature. A silhouette
  cannot locate a joint centre; pretending otherwise is how crop constants are
  born. Derived values carry their ratio and provenance in the JSON.
- `bands`: mean silhouette width per body band, in pixels and as a fraction of
  height — the measured basis for limb radii.
- `palette`: median colour per material region.

Nothing in `persona.json` is a crop window. This is the direct answer to
`PIPE-ERR-04` and to the 191 literal integers in the old extractor.

### S1 — Atlas: turn the photograph into a texture, once

The atlas is the only place where photograph pixels are interpreted.

1. **Correspondence.** The rest skeleton is mapped onto the plate by six
   numbers, derived from four measured rows (crown, chin, shoulder, sole) and two
   anthropometric ratios for the joints a photograph cannot see (hip, ankle).
   Each number is a *stretch* with a physical meaning — head, neck, torso,
   thigh, shin — so a long-torsoed persona is two numbers, not two hand-authored
   crop boxes. The silhouette IoU achieved by that mapping is computed and
   printed, but it is a **reported metric, never an objective** (§4.7).
2. **Skeletal partition.** Every subject pixel is assigned to a bone by a
   three-stage rule:
   - *material*: hair cannot bind to the face bone, singlet fabric cannot bind to
     the arm bone;
   - *occlusion*: among the bones whose capsule contains the pixel, the most
     forward one wins — in a lateral view the near arm is in front of the near
     thigh, and no amount of colour or distance can establish that, because a
     single photograph contains no depth;
   - *distance*: only for pixels outside every capsule.

   The projection yields `u` (along the bone) and `v` (signed perpendicular
   offset normalised by the local half-width). This is a cylindrical unwrap, not
   a crop box.
3. **Coverage before invention.** A bone that the first pass starved may claim
   unclaimed pixels strictly inside its own capsule (this is how the neck gets its
   own texture instead of a copy of the jaw); then a low-weight *fringe* pass
   claims the remaining subject pixels within 2.5 capsule radii (the shoe sole,
   the fingertips, the outside of a bent knee).
4. **Synthesis, counted, and split by risk.** Only then is anything invented,
   and the two kinds are counted apart because they are not equally safe:
   - *interpolation* fills a hole **between** two observations along `v`, and is
     refused when the gap exceeds 8 rows — a 38-row ramp anchored on two distant
     rows is a guess wearing interpolation's clothes;
   - *mirroring* fills the unseen half of a one-sided column by reflecting the
     observed half across the bone axis. A lateral plate photographs the near
     half of every limb and nothing else, so this is the honest completion: a
     limb is approximately a cylinder, and the result is measured on one side
     rather than extrapolated from an edge.

   Far limbs — absent from the plate entirely — are mirrored from the near side
   and darkened in the same way. Every invented cell is tagged.
5. **Never texture from the keying boundary.** Only pixels inside an eroded
   subject mask contribute colour. The outer few pixels of a soft-lit plate are
   a physical blend of subject and backdrop; they pass the chromatic key test and
   used to paint violet fringe wherever the sampler reached an edge.
6. **Evidence.** `atlas-report.json` records per-bone coverage, the observed /
   interpolated / mirrored cell counts separately, the longest interpolated run,
   and the subject pixels that no capsule reached.

The invariant that matters: **a tile contains only pixels of the thing it
textures, and every cell in it is either photographed or counted as invented,
with the kind of invention recorded.**

### S2 — Rig solve: geometry first, always

Unchanged in spirit from the prior branches, because it worked: law-of-cosines
two-bone IK, contralateral anti-phase, two-segment foot roll, trunk lean with
cervical counter-rotation, hair lag.

Two new rules:

- The solver emits a **skeleton document** (bone transforms + root) that the
  rasterizer and any future consumer read. The skeleton is the contract.
- The solver also emits the **control plate** (S2 → PNG): the flat-shaded,
  correctly-posed reference used for gates and for optional generation.

The rig's segment lengths come from anthropometry scaled to the persona's
measured stature — **never** from the art. Rule A3 is dead.

### S3 — Deform: sample a surface, do not rotate cards

The implementation resolves the appearance question differently from the first
draft of this document, and more simply.

The first draft proposed a triangle mesh per layer with linear blend skinning.
The shipped renderer does not build a mesh at all. For each bone it iterates the
destination pixels it can influence, projects each pixel back into the *posed*
bone frame to obtain `(u, v)`, and samples the atlas there, with 2×2
supersampling and a narrow feather. Painting is two passes — `back`, then
`front` — and inside a pass, bones paint in a fixed anatomical order (hair
before head, torso before arm, arm before hand).

Why this is better than the mesh for this problem:

- **No mesh topology to author or maintain.** The unwrap and the sampler share
  one parameterisation, so there is no separate vertex-weighting problem that can
  disagree with the texture.
- **A joint is an interior point of both bones.** The knee is `u ≈ 1` of the
  thigh and `u ≈ 0` of the shin, sampling the same rows of the same photograph.
  A seam would require the two ends of a bone to disagree with themselves.
- **Sampling has no undefined answers.** A sample is a triple and an alpha. In
  range, in range after per-column clamping, borrowed from the nearest filled
  column, or "nothing here" — never a black cell. Every one of those branches
  exists because an undefined answer shipped as visible damage (A15).
- **Painting composites.** A bone's feathered edge is drawn *over* what is
  already there. Replacing a pixel instead lets a later bone's edge erase a
  neighbour's alpha, and a one-pixel translucent seam at a joint reads as a
  detached limb once thresholded (A18).
- **Joints are filled, not just overlapped.** Capsules that share an endpoint
  overlap by construction — except the foot, whose capsule runs along the sole
  while the shin ends at the ankle, `ankleHeight` above it. The foot therefore
  carries an explicit `jointFill` point it must physically reach, textured from
  its own heel. This is a geometry repair, stated as such, not a texture trick.

The cost is that overlapping bones are resolved by paint order rather than by
depth buffering. Two layers plus an anatomical order inside each layer is enough
for a lateral figure; it would not be enough for a 3/4 view, which is out of
scope for this pipeline and stated as such in §8.

### S4 — Gates: measure the things that were wrong

A gate that only counts islands certifies hygiene, not correctness. Two levels,
both machine-readable, both implemented:

**Per frame** (`npm run plates`, `src/analysis/gates.ts`)

| Gate | Measures | Budget |
|---|---|---|
| `adjacentPop` | largest *change* in adjacent-frame silhouette IoU | ≤ 0.15 |
| `centroidJitterPx` | head-centre horizontal drift between phases | ≤ 1.5 px |
| `contactGroundSpreadPx` | spread of the lowest opaque row across stance frames | ≤ 2 px |

**Per persona** (`npm run audit`, `out/audit/<id>/`)

| Check | Measures | Budget |
|---|---|---|
| `atlas.interpolatedFraction` | share of cells filled by interpolating between two observations | ≤ 0.25 |
| `atlas.longestInterpolatedRun` | longest unbroken invented span, in tile rows | ≤ 10 |
| `atlas.mirroredFraction` | share of cells invented by mirroring the near half | ≤ 0.55 |
| `atlas.emptyTiles` | bones with no cells to paint | 0 |
| `atlas.unassignedFraction` | photographed surface no capsule reached | ≤ 0.12 |
| `correspondence.silhouetteIou` | rig vs. plate after measured placement | ≥ 0.35 |
| `keying.holesInsideSubject` | subject pixels 4-surrounded by backdrop | ≤ 0.002 |
| `frames.maxIslands` | detached opaque components per frame | 0 |
| `frames.spillPixels` | backdrop-coloured pixels in the output | 0 |
| `frames.crownReached` | frames that lose the crown | 0 |
| `discipline.violations` | file/function size, determinism | 0 |

Two rules keep these honest, and both were learned the hard way in this build:

- **A gate that cannot fail is a bug** (`ADDENDA` A12).
- **A metric that rewards the wrong thing is worse than no metric**
  (§4.7.3, and `BRANCH_REVIEW` §3.6 from the other direction).

Gates proposed in the first draft and *not* implemented are listed here so they
are not mistaken for delivered work: `controlIoU` (generated vs. control plate —
the control plate exists, the comparison is not wired), `maxStretch` (the sampler
has no triangles to measure), `limbRatio` (geometry is derived from the rig, so
the check would compare a value to itself), and `groundDeltaPx` (subsumed by
`contactGroundSpreadPx`).

### S5 — Delivery

- `frame-NN-phase-XXX.png` (transparent, `220 × 256`), plus the atlas and the
  skeleton.
- `manifest.json` per frame: `pivot`, `trimBox`, `footAnchor`, `phase`,
  `gateReport`, `sourceHashes`.
- Optional SVG: trace the *posed silhouette* per frame and embed the atlas as a
  raster image, or export the skeleton as vector groups for a consumer that
  renders its own art.
- **All-or-nothing**: a persona's frame bank is usable only if every frame and
  the manifest pass their gates. This is the one good idea from the old branches
  that must survive (`CROSS-05`).

### S6 — Optional atlas completion

If and only if `mirroredFraction` or `longestInterpolatedRun` exceeds its budget,
the invented cells can be completed by an image model — **once per persona**, not
per frame. The repair set is addressable precisely because the atlas counts
invention by kind: mirrored cells, and columns whose interpolated run broke the
bound. That is a small enough set for the three-call budget to be credible:

- the prompt receives the atlas as the structure reference and the persona master
  as the identity reference;
- exactly the occluded regions are re-composited; everything else is untouched;
- the result is gated, logged verbatim, and if rejected the pipeline falls back
  to the interpolated fill.

Budget: ≤ 3 calls per persona. Compare with 72 across three personas before.

---

### 4.7 What building stage 2 changed in the design

Four decisions in this document were wrong until the code disagreed with them.
They are recorded here rather than quietly corrected, because they are the kind
of mistake this pipeline is supposed to make *cheap*.

**1. The backdrop test must be chromatic, not metric.** The first keyer compared
each pixel to the detected key colour by Manhattan distance. It matted the plate
and punched 3 000 holes *inside* the figure: a bright skin highlight at
`(200,150,140)` is only 120 away from the magenta backdrop `(220,74,164)`. The
holes were invisible in a corner probe and became speckled shoes and empty limb
tiles downstream. The rule is now "red and blue high, green much lower than
either" — a property of the backdrop, not of one sample of it. Evidence:
`keying.holesInsideSubject` in `out/audit/<persona>/audit-report.txt`.

**2. Occlusion cannot be measured from one photograph; it has to be declared.**
The hand rests on the thigh in the master plate. Same material, same lighting,
and the thigh's axis is nearer, so every distance metric gives the thigh the
hand's pixels — the hand tile came out empty (`nearHand hw=0.0`). The fix is not
a better metric. It is an explicit anatomical order: among the bones that contain
a pixel, the most forward one wins, and the hidden part of the thigh is a hole
that is *reported*, not stolen. This is the same class of error as the branches'
painter's-order bugs, and it is fixed the same way — with a declared order — but
now the order is anatomy (17 constant entries) instead of a per-frame z-index.

**3. Silhouette IoU is a metric, not an objective.** Fitting the correspondence
by coordinate descent on silhouette IoU looked principled and failed: the head is
about 4 % of the silhouette, so the gradient through the head is weaker than the
noise from the torso, and the optimiser left the skull 50 px below the
photographed head while reporting a better score. The correspondence is now
*measured* (four landmark rows, two anatomical ratios) and IoU is only printed.
A metric that rewards the wrong thing is worse than no metric — which is also the
lesson of §3.6 of `docs/BRANCH_REVIEW.md`, arriving from the opposite direction.

**4. Measured widths need a prior.** The medial-axis radius of the photographed
limb is the right width measurement where a limb is isolated, and it is exactly
wrong where two limbs touch: the hand on the thigh inflates both to the radius of
the union. Measured widths are therefore clamped to ±25 % of the rig's own
anatomical width. The measurement is allowed to say "this person's calves are
bigger than the model's"; it is not allowed to say "this forearm is 57 px wide".

These four are also why the reference implementation keeps a *flat-shaded
control plate* next to every skinned frame: the geometry can be judged with the
appearance question entirely removed.

## 5. What this changes in practice

### 5.1 A new persona costs one photograph

| | Old | New |
|---|---|---|
| Photographs to generate | 10 | 1 |
| Prompts to write and review | 10–24 | 1 (+ ≤ 3 optional atlas calls) |
| Crop windows to calibrate by hand | ~50 | 0 |
| Persona ternaries in code | 80 | 0 |
| Extractor modules | 3–4 | 1 |

### 5.2 The anatomy cannot drift

Bone lengths are a function of measured stature and published anthropometric
ratios, and the `limbRatio` gate fails the build if they do. Adding a persona
cannot produce T-rex arms because nothing in the persona's art is consulted when
setting a bone length.

### 5.3 The failure modes move up to where they are cheap

Old failures were pixel-level and discovered by eye, sixteen frames at a time:
a seam, a speck, a wrong-facing torso. New failures are parameter-level and
discovered by the gates before an image exists: a bad atlas coverage number, a
wrong measured landmark, a stretch violation. A parameter failure costs a
re-run; a pixel failure costs a generation budget.

### 5.4 The honest weakness

The atlas has no texture for regions the photograph never showed. This is real
and it is bounded:

- the fill is deterministic and its extent is measured, *and split by kind*
  (`ADDENDA` A20): on the reference persona 6.5 % of cells are interpolated
  between two observations, 33.7 % are mirrored from the observed half, and the
  longest unbroken interpolated run is 7 rows of 44;
- the fill is confined almost entirely to the *back* layer, which is drawn first
  and is partly occluded in most frames; the only front-layer synthesis is the
  interpolation of small holes *between* two observations;
- if the fill is unacceptable, one image-model call per persona fixes it.

The old architecture had the same problem (that is precisely why it demanded ten
plates with explicit *medial* and *lateral* surfaces) but paid ten generations to
solve it and still inherited cross-plate lighting mismatch.

### 5.5 What happens to the existing assets

The 30 committed plates are not wasted:

- each persona's `01-master-lateral.png` becomes that persona's source plate;
- plates `07`/`08` (arm, lateral and medial) supply the far-arm atlas coverage
  that the master occludes — a *legitimate* use of a second photograph, because
  the atlas is unwrapped in bone-local coordinates and a second sample for the
  same `(bone, u, v)` is a resampling, not a stitch;
- plates `02`–`06`, `09`, `10` are retired.

That is the key difference: the old pipeline **stitched** plates at silhouette
boundaries; the new one **resamples** plates in a coordinate system where the
boundary is interior. Resampling is safe; stitching is not.

### 5.6 Where a generative pass still belongs

Whole-frame generation is an excellent *finishing* tool and a poor *animation*
tool. It may be applied to:

- a single canonical reference image per persona (identity + lighting), and
- atlas gap completion (§S6),

but never to a frame in the cycle. Frame-to-frame identity must be owned by
geometry.

---

## 6. Staged implementation plan

| Stage | Deliverable | Status here |
|---|---|---|
| **1** | Profiler (`S0`), rig (`S2`), control plate, gates (`S4`) | implemented, tested, runnable |
| **2** | Atlas unwrap (`S1`) + skinned sampler (`S3`) | implemented; two layers, three-stage assignment, all gates green on **two** personas; `docs/REVIEW.md` §S1 lists the five defects the second persona found and `docs/VALIDATION.md` §6 records what is still visibly wrong |
| **3** | Atlas gap completion (`S6`) with prompt log | specified, not invoked (no generation budget spent in this change) |
| **4** | Delivery manifest + SVG, all-or-nothing bank | manifest implemented |
| **5** | Second and third persona, to prove "one photograph per persona" | requires one master plate each |

Stage 1 and 2 deliberately ship **before** any new image generation, so that the
geometry can be judged on its own and the generation budget is spent only on
appearance.

---

## 7. Risks and how each is retired early

| Risk | Retire by |
|---|---|
| Texture stretches visibly at extreme knee flexion | `|v| ≤ 1` clamp plus a viewed joint crop at φ = 0.375 and 0.75 before any persona is added |
| Atlas fill looks smeared on the far arm | `interpolatedFraction` + `longestInterpolatedRun` + a viewed contact sheet per persona |
| A defect that only one persona shows | run the second persona before believing any green audit: four of the five renderer defects found in this build were invisible on persona 01 |
| Measured landmarks are wrong on an unusual build | profiler emits an overlay PNG; landmark rows are drawn on the plate and must be viewed before the persona is accepted |
| Rig produces an unattractive run | isolate geometry from appearance: judge the control plate alone, at 16 phases |
| New architecture becomes a rewrite that never lands | Stage 1 is independently useful (control plates + gates ship today) |

---

## 8. What "done" looks like

1. `npm run profile` writes a `profile.json` with measured and derived
   landmarks, and a landmark overlay that a human has looked at.
2. `npm run plates` writes 16 frames, an atlas, and a manifest.
3. `npm run audit` writes a contact sheet, a joint-crop sheet, and a gate report
   in which every gate passes or has an explained failure.
4. A new persona is added by dropping one PNG into
   `assets/personas/<id>/01-master-lateral.png` and re-running — no code change.
5. The only per-persona numbers in the repository are measurements in
   `persona.json`.

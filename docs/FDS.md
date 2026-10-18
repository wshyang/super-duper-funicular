# FDS — Sprite Anchor Pipeline

**Status:** implemented through stage 2, validated on one persona.
**Supersedes:** the FDS documents in PR #1 (v5.1.0, 1 098 lines) and PR #8
(v4.10.0, 1 032 lines). The differences that matter are in §9.

---

## 1. Purpose

Turn **one lateral standing photograph** of a person into a **running sprite
cycle** whose anatomy is correct, whose appearance comes from that photograph,
and whose failures are measurable before anyone looks at a frame.

The product is not the two branches' product. They produced a *paper doll whose
parts were separately photographed*; this produces a *continuous surface whose
texture was photographed once*. That is the whole design.

---

## 2. Goals

| # | Goal | Acceptance |
|---|---|---|
| G1 | One photograph per persona | `assets/personas/<id>/01-master-lateral.png` is the only required input |
| G2 | Anatomy from anthropometry, never from art | arm/leg ratio within 1 % of `ARM_LEG_RATIO`; `rig.test.ts` |
| G3 | No seams at joints | joints are interior to a bone's `u` range; `frames.maxIslands = 0` |
| G4 | Deterministic output | byte-identical renders for identical input; `unwrap.test.ts` |
| G5 | Failures measured, not guessed | every frame gated; every persona audited; `npm run validate` |
| G6 | Appearance failures separable from geometry failures | flat-shaded control plate emitted for every frame |
| G7 | Generation budget optional and bounded | zero calls in the default path; ≤ 3 per persona if §S6 is ever used |

## 3. Non-goals

- 3/4, frontal, or multi-camera views. The occlusion order is a lateral statement.
- Cloth and hair simulation. One capsule each.
- Facial animation, lip sync, expression.
- Real-time rendering. This is an offline sprite baker.
- Photorealistic faces at high zoom. Stated and measured in `VALIDATION.md` §7.

---

## 4. Terminology

| Term | Meaning |
|---|---|
| **plate** | the single source photograph, keyed |
| **master space** | pixel coordinates of that plate |
| **sprite space** | the 220 × 256 output canvas |
| **bone** | a capsule with a layer, a paint order, and two half-widths |
| **atlas** | `Record<BoneId, tile>`; a tile is `u × v` samples, 96 × 44 |
| **control plate** | flat-shaded deterministic render of the same pose; no photograph |
| **synthetic** | atlas content not present in the photograph (interpolated or mirrored) |

---

## 5. Functional requirements

### FR-1 Ingest
The profiler must measure, from the plate alone: backdrop colour, subject bounds,
four landmark rows (crown, chin, shoulder, sole), garment boundaries, material
palette, and the hanging-arm axis. It must emit an overlay image with the
landmark rows drawn, for human inspection.

**It must not** contain a crop window, a per-persona integer, or a hard-coded
colour.

### FR-2 Correspondence
The rig must be placed on the plate by six numbers: `scale`, `originX`,
`originY`, and stretches for head, neck, torso, thigh, shin (arms inherit the
trunk stretch unless measured otherwise). Every number must be printed in
`persona.json` with its derivation.

### FR-3 Atlas
Every subject pixel must be assigned to exactly one bone, with an address
`(u, v)`; assignment must be material-gated and occlusion-ordered; a bone starved
by the first pass must be able to recover pixels from its own capsule; remaining
subject pixels within 2.5 capsule radii must be claimed at low weight. Synthesis
must occur only after all three passes and must be counted.

### FR-4 Rig solve
Per frame: contralateral anti-phase gait, two-bone IK with clamping, two-segment
foot roll whose stance contact is solved **from** the contact point, trunk lean
with cervical counter-rotation, hair lag. No IK target may exceed limb reach; no
stance foot may penetrate the ground.

### FR-5 Render
Per frame: paint `back`, then `front`; inside each, paint in `paintOrder`;
project each destination pixel into the posed bone frame, sample the atlas
bilinearly with 2×2 supersampling, feather the edge by at most one pixel. Never
read `|v| > 1`.

### FR-6 Gates
Every frame must be measured for adjacent-frame discontinuity, head drift, and
ground contact; every persona for atlas coverage, correspondence quality, key
porosity, islands, spill, and discipline. A gate that cannot fail is a defect.

### FR-7 Delivery
`manifest.json` written **after** the frames it names; every frame's pivot, foot
anchor, phase and gate result recorded.

---

## 6. Data flow

```
plate ──► S0 profiler ──► profile.json, persona.json, overlay.png
                              │
                              ▼
                    S1 atlas builder ──► atlas-report.json, tiles
                              │
phase ──► S2 rig solve ──► skeleton + control plate
                              │
                              ▼
                         S3 sampler ──► frame-NN.png
                              │
                              ▼
                    S4 gates + audit ──► manifest.json, audit-report.json
```

Every arrow is a file or a typed value; no stage reaches back into another.

---

## 7. Key invariants

Restated from `docs/SPEC.md`, because they are the acceptance criteria that can
be checked by a reader:

1. A tile contains only pixels of the thing it textures.
2. Every cell is either photographed or counted as invented.
3. `layer` and `paintOrder` are constants of anatomy, not of a persona or a pose.
4. The sampler never reads outside `|v| ≤ 1`.
5. Renders are byte-identical for identical input.
6. A manifest never names a file that does not exist.

---

## 8. Acceptance

`npm run validate` must pass. It runs, in order: TypeScript strict typecheck,
18 tests, the profiler, the 16-frame bake, and the nine-check audit.

The **human** acceptance step cannot be automated and is not pretended to be:
`docs/assets/cycle-contact.png` and `docs/assets/control-contact.png` must be
viewed side by side. A defect in both sheets is geometry; a defect in only the
skinned sheet is appearance. That split is the first thing to check when
something looks wrong, and it is the main practical advantage of emitting both.

---

## 9. What is different from the superseded FDS

| Superseded | Here | Why |
|---|---|---|
| 10 plates per persona, each a body part | 1 plate | 72 generations became 0 |
| ~50 crop/pivot constants, 80 persona ternaries | 6 measured numbers, 0 ternaries | constants were compensating for rigid-part rotation |
| Parts stitched at silhouette boundaries | one continuous surface, resampled | stitching cannot be made seamless |
| z-index / painter's order per frame | 2 layers + fixed anatomical order | ordering bugs disappear by construction |
| Proportions tuned to the art | anthropometry, art measured *to* it | T-rex arms were a tuning symptom |
| "0 islands, 0 spill" as the quality signal | 9 checks, each able to fail | telemetry is not validation |
| 1 098-line FDS | this document + `SPEC` + `VALIDATION` | documentation outgrew the artefact |

---

## 10. Open work

1. **Second persona** — the only claim in this document with a sample size of
   one (stage 5).
2. **Atlas completion (§S6)** — specified, not invoked; no generation spent.
3. **Hair as a rigid decal on the skull** rather than a capsule chain.
4. **Face quality** — the current head capsule is the weakest element at 3×.
5. **`adjacentPop` budget** — revisit once a second cycle exists to compare
   against (`VALIDATION.md` §7.7).

# Pose-Material Programme — Objective, Work Items, Criteria, Risks and Remedies

Status: **normative working document**. Companion to
[`POSE_MATERIAL_ACCEPTANCE.md`](./POSE_MATERIAL_ACCEPTANCE.md) (thresholds) and
[`POSE_PILOT_FLAW_ANALYSIS.md`](./POSE_PILOT_FLAW_ANALYSIS.md) (evidence).

This document is ordered so that each item is **opened, worked and closed** before the
next one begins. No item inherits an unresolved question from the one above it; the
"Closed when" line at the end of each section is the gate that permits the next
section to open.

---

## 0. Examination: what the two branches and this exercise actually established

### 0.1 The two founder branches

| | PR #8 (`e1300d3c`, `9d448fe`) | PR #1 (`917ef347`, `96a284f`) |
|---|---|---|
| Mechanism | 18 generated pose-bank candidates + solved-pose guides + per-frame visibility matrix | 11 generated phase plates + per-part segment specs + 17 canonical part jigs and 18 variant copies |
| Artefacts produced | 6 conditional / 3 needs-regeneration candidates, **0 cutouts**, 0 jigs, 0 instances | 35 `160×160` jigs marked "harvested" |
| Verdict basis | prose review of prompts and renders | prose review of prompts and renders |
| Measured outcome today | 5 of 18 candidates accepted, 12 conditional, 1 rejected; **0 verified materials** (this exercise harvested 6) | 7 of 11 plates pass PR #1's own review; our audit gets 8 conditional / 3 rejected and rejects phase-03 as well; **0 of 35 jigs carried a verification record** |
| What it proved | A solved-pose guide does steer the image generator toward a target silhouette | A single generated phase plate contains a full, mostly coherent figure |
| What it never proved | That any crop is the anatomy it is named after | That a named jig is that limb, at that angle, from that person |

### 0.2 This exercise

We stopped treating both PRs as competing implementations and treated them as a
corpus plus two hypotheses. Measuring the corpus produced four findings that reframe
the problem:

1. **Diversity was never the bottleneck.** The 30 plates form 30 distinct silhouette
   clusters with **0 duplicate pairs** and a mean pairwise IoU of **0.442**. The
   original `incorrect running sprites.jpeg` scores **0.947** half-cycle IoU — its
   two halves are the same art. So the generation work *did* fix the original defect
   at the level of pose.
2. **Pose *truth* was the bottleneck.** Normalised against the rig's own achievable
   match, the plates range from 0.53 to 0.82. Two plates advertised as "mid-stance"
   are plainly high-knee sprints.
3. **Harvestability, not pose, is the scarce resource.** Of 128 part × phase slots,
   **106 are gaps**. In a single right-facing profile the near upper arm sits behind
   the torso, the near thigh top behind the shorts, and the far-side limbs behind the
   near ones. No prompt wording recovers occluded pixels.
4. **Unverified cutouts are worse than no cutouts.** Early iterations harvested the
   crimson singlet as "upper arm" (skin fraction 0.00) and produced limbs that
   rendered as skin blobs covering the shorts. A wrong crop looks fine in a contact
   sheet of crops and fails only when assembled.

### 0.3 The core objective

> **Build a reproducible pipeline that turns a fixed photographic corpus into an
> 8-phase / 16-frame running cycle in which every frame is a genuinely different,
> biomechanically correct pose, assembled from material that provably came from the
> named body part of a named real plate — with every one of those claims expressed as
> a number produced by a command.**

Six necessary conditions follow, and the rest of this document is organised around them:

- **C1 Pose truth** — a frame's pose is the phase it claims, measured against solved gait geometry.
- **C2 Material truth** — every pixel of harvested anatomy is traceable to a part of a plate, verified in both directions (source → cutout → render → source).
- **C3 Identity continuity** — same person, wardrobe, scale, lighting and colour across all frames.
- **C4 Assembly integrity** — no islands, no seams, no ground penetration, joints continuous.
- **C5 Coverage** — enough measured angles per part to serve all eight phases, with gaps named rather than silently filled.
- **C6 Reproducibility** — any claim re-derivable from a command; hashes stable; rejections retained.

### 0.4 Item register

| ID | Item | Serves | State |
|---|---|---|---|
| I-1 | Source corpus and provenance ledger | C2, C3, C6 | **closed** |
| I-2 | Photographic intake quality | C3 | **closed** |
| I-3 | Pose truth (registration + phase compliance) | C1 | **closed** |
| I-4 | Part visibility and eligibility | C2, C5 | **closed** |
| I-5 | Appearance fidelity (skin vs garment) | C2, C3 | **closed** |
| I-6 | Cutout contract and round-trip verification | C2, C4 | **closed** |
| I-7 | Angle-bucketed material bank and selection | C5 | **open** (coverage) |
| I-8 | Assembly integrity and seam continuity | C4 | **closed** for material, 1 residual |
| I-9 | Cycle composition and diversity measurement | C1, C3, C4 | **closed** |
| I-10 | Gap-driven acquisition | C5 | **open** |
| I-11 | Reproducibility, regression and documentation discipline | C6 | **closed** |

---

## I-1 — Source corpus and provenance ledger

**What it contributes.** Nothing downstream can be trusted if we do not know exactly
which bytes we measured. This item fixes the universe of inputs, gives every plate a
stable identity, and records the two facts that are properties of the *plate* rather
than of any algorithm: what role it plays (identity anchor, pose donor, phase donor)
and what the subject is wearing.

**Acceptance criteria and how they are measured.**

- Every source appears once in `src/images/pose-material/sources.json` with
  `sourceId`, `group` (`repo|pr1`), `relativePath`, `role`
  (`master|pose-bank|phase-harvest`), `wardrobe` (`clothed|anatomy-study`) and
  `declaredPhase`.
- 100 % of declared paths resolve, and each resolves to a file whose SHA-256 is
  recorded and re-checked on every run.
- Zero duplicate hashes inside the corpus.
- Counts reconcile: 1 master + 18 pose-bank + 11 phase plates = **30**.
- Measurement: `npm run pose-material:audit` (fails loudly on an unreadable path);
  the integration test `ingests every available source and records a hash for each`
  asserts the hash shape and the count, and asserts **30** when the PR #1 worktree is
  mounted.

**Challenges.**

- The PR #1 plates live on a sibling branch that is not an ancestor of this one, so
  the corpus is split across two roots and can silently shrink to 19 sources.
- Generated plates are re-rolled by the image model: two files can carry the same
  name and different pixels, or the same pixels and different names.
- Wardrobe is not cosmetic — three plates are an anatomy study in a two-piece
  swimsuit, and using them in a clothed cycle breaks identity (see I-5).

**How we address them.**

- `rootByGroup` resolves each group against its own root (`repo`, `pr1`), supplied by
  `--pr1-root` or `POSE_MATERIAL_PR1_ROOT`, default `/tmp/pr1`.
- Identity is content-addressed, never path-addressed. The audit reports the hash,
  and the bank stores `sourceSha256` alongside each material so a re-roll invalidates
  the material explicitly rather than silently.
- Missing groups are tolerated (the repo's own 19 sources still audit), but the
  integration test escalates to the full 30 the moment the worktree exists, so a
  silently truncated corpus cannot pass CI.
- `wardrobe` is a first-class field, not a note; `anatomy-study` is a tag that later
  gates consult, not a comment someone can forget.

**Closed when.** 30 sources audited, every hash present, no duplicates, and the
corpus can be reconstructed from a clean clone plus one documented command.

---

## I-2 — Photographic intake quality

**What it contributes.** A plate that keys badly poisons every downstream number:
a matte that eats the ankle makes the foot disappear from the silhouette; a shadow
counted as subject inflates the figure; a leaked background patch becomes a false
limb. Intake quality converts a pretty render into a measurable object.

**Acceptance criteria and how they are measured.**

- Backdrop keyed on **hue and value**, not on an RGB triplet distance, so cast shadow
  (which is a darker backdrop, not a different colour) keys out as background.
- `fringeRatio < 0.02`; `interiorLeakRatio = 0` (no background pixels enclosed by
  subject); `magentaLeakPixels = 0`.
- Silhouette is a single connected component ≥ 99 % of foreground; islands smaller
  than 32 px are removed and counted.
- Figure height 183–195 px and face width 59–70 px at normalised scale; a plate
  outside the band is flagged, not silently rescaled.
- Measurement: `photo-matte.ts` statistics in `public/sprites/material/audit.json`
  (`backgroundNoise`, `fringeRatio`, `interiorLeakRatio`, `magentaLeakPixels`,
  `shadowFraction`), plus the matte unit tests (`keys the studio magenta backdrop but
  keeps skin and garment`, `keys darkened backdrop (cast shadow)…`).

**Challenges.**

- The studio backdrop is not flat: it has a vertical gradient and a floor-bounce
  brightening near the feet, so a global colour threshold either eats shoes or keeps
  floor.
- The subject casts a coloured shadow onto the backdrop that is hue-preserving.
- Skin, tan shoes and the crimson singlet all sit within naive "warm colour" ranges;
  magenta keying must not be turned into "remove anything reddish".
- Specular highlights on the jersey approach the backdrop in value.

**How we address them.**

- Row-wise backdrop modelling (`estimateBackdropModel`, `backdropRow`,
  `backdropMembership`) with per-row tolerance derived from measured noise instead of
  a constant.
- The matte was rewritten once already after the chroma-triplet version mis-keyed
  shadows; that failure is recorded in the dead-end register so it is not retried.
- The successful test is behavioural: a synthetic shadowed plate must key the shadow,
  and a synthetic skin-and-garment plate must keep both.

**Closed when.** Every plate in the corpus keys to a single-component silhouette with
zero interior leak, and the matte tests prove both the shadow and the skin cases.

---

## I-3 — Pose truth: registration and phase compliance

**What it contributes.** This is the item both PRs lacked. Without it, "this is a
contact pose" is an opinion, and a high-knee sprint can be filed as mid-stance
indefinitely. Registration puts the plate into rig space; phase compliance says how
close the plate's silhouette is to the solved pose for the phase it claims — and
normalises that against what the renderer itself can achieve, so the score means
"fraction of attainable agreement", not "arbitrary number above zero".

**Acceptance criteria and how they are measured.**

- Registration recovers scale, translation and rotation, then refines locally; a
  head-anchored fit alone is explicitly rejected as insufficient (±30–40 px bias
  measured).
- Pose F1 is computed against a rig-rendered target, and reported as
  `poseMatchRatio = poseF1 / ceilingF1`, where `ceilingF1` is the best achievable F1
  for that phase (0.850–0.908 measured across the 16 phases).
- A plate is only allowed to contribute material if `poseMatchRatio ≥ 0.80`
  (`POSE_GATE_RATIO`); below that, every part is demoted with `pose-unverified:<ratio>`.
- `declared-phase-mismatch` fires when the best-matching phase differs from the
  declared phase by more than 7 % of the cycle.
- Measurement: `registration` and `poseMatchRatio` per source in the audit JSON;
  integration test `measures pose compliance as a fraction of the renderer ceiling,
  not as prose`; `refuses to call a drift-heavy plate a phase match`.

**Challenges.**

- Registration is easy to get *plausible* and hard to get *right*: two earlier
  formulations were mathematically inverted and produced believable but wrong fits.
- The figure's silhouette changes shape across phases, so "best scale" depends on the
  pose you assume — a chicken-and-egg problem.
- A generated plate may show a pose that is between two canonical phases, or a
  physically impossible one (both feet in flight in the wrong half).
- The ceiling is a property of the rig, not of the photograph; without it, F1 ≈ 0.6
  reads as "bad" when 0.66 may be the maximum attainable.

**How we address them.**

- `refineRegistration` searches locally after the global fit; every downstream
  measurement uses the refined transform.
- The ceiling is calibrated per phase by rendering the solved pose and scoring the
  renderer against itself (`pose-calibration.ts`), so the denominator is measured,
  not assumed.
- Phase mismatch is a *soft* signal (demotion) rather than a hard deletion, because a
  plate can still be a valid donor for one limb while being wrong for the frame as a
  whole — see I-4.

**Closed when.** Every source carries a registration, a measured F1, a measured
ceiling and a ratio, and the ratio gates eligibility.

---

## I-4 — Part visibility and eligibility

**What it contributes.** Converts "this plate is good/bad" into "**this part of this
plate at this angle** is or is not harvestable". This is the item that unlocks a
corpus in which no single image is fully usable. It also makes occlusion a measured
fact: in a profile, the near upper arm is *behind the torso*, and that is a property
of the camera, not of the prompt.

**Acceptance criteria and how they are measured.**

- Every rig-driven part of every source gets a verdict with reason codes, not a
  boolean: `low-fill`, `weak-walls`, `width-mismatch`, `merged-with-neighbour`,
  `wrong-material`, `pose-unverified`, `part-not-visible`.
- Limb measurements come from the **same tube probe the harvester uses**, so audit
  and export cannot disagree about the same pixels.
- Thresholds: `fill ≥ 0.72`, `wallContrast ≥ 0.42`, `widthAgreement ≥ 0.35`,
  `isolation ≥ 0.20`.
- The report publishes, per part, the measured angle, the bucket, and the count of
  sources that can serve it.
- Measurement: `npm run pose-material:audit`; per-part table in
  `docs/POSE_MATERIAL_AUDIT.md`; integration test `derives per-part eligibility with
  measured angles and reason codes`.

**Challenges.**

- Silhouette coverage alone is seductive: a capsule can be 95 % "filled" by the
  singlet and 0 % limb.
- Two adjacent limbs merge into one silhouette region; the probe happily spans both.
- Near/far identity is not provable from a single profile. Both PRs treated this as a
  veto; done that way, the programme can never converge.
- The pool is unbalanced: `nearShin` never becomes eligible, `nearUpperArm` only once,
  and near/far pairs in strictly profile plates are byte-identical (so "two materials"
  is one material used twice).

**How we address them.**

- The probe scores fill **and** two-sided wall gradient **and** width agreement, so a
  garment region with a soft interior fails even when it is fully opaque.
- `measureIsolation` penalises tubes that share a boundary with a neighbouring limb.
- Near/far ambiguity is **declared, not gated**: `sideProvenance: 'guide-derived'` is
  recorded on every material, so the claim is explicit and falsifiable later, instead
  of blocking output forever.
- Identical near/far pairs are retained (they are genuinely the same pixels) but are
  reported as one bucket contribution, so coverage numbers are not inflated.

**Closed when.** Each part of each source has a measured angle, a bucket and reason
codes, and the same functions produce those numbers in the audit and in the bank.

---

## I-5 — Appearance fidelity: skin versus garment

**What it contributes.** Guarantees the material is the *right tissue*. This is the
difference between a pipeline that produces a sprite sheet and one that produces a
runner wearing her singlet as an arm. It also carries identity: the same persona's
skin tone and lighting must persist frame to frame.

**Acceptance criteria and how they are measured.**

- A limb region must be **skin-dominant**: `skinFraction ≥ 0.45`
  (`SKIN_DOMINANT_MIN`), measured on the **source plate inside the probe tube**, not
  on the finished cutout.
- Skin classification is hue/value based and lives in one exported predicate
  (`isSkinPixel`), used by both the audit and the harvester.
- Wardrobe provenance travels with the material; `anatomy-study` material is never
  selectable for a clothed persona.
- Colour continuity: a material's mean colour must survive the round trip within
  `meanColorDelta ≤ 24`.
- Measurement: `skinFractionInCapsule` in the audit and harvest rejection logs
  (`wrong-material:skin=0.16` etc.), plus the class table produced during the earlier
  diagnostic run.

**Challenges.**

- Measured on the *cutout*, the appearance test is nearly useless: a jersey interior
  is solid, saturated and edge-rich, and a histogram cannot say "not a limb".
- Skin tone overlaps tan shoes, the leather hand-grip, and the crimson fabric's
  highlights under warm studio light.
- Occlusion means the anatomical region named `nearUpperArm` may legitimately contain
  **zero** skin in a profile plate; the correct answer is "not harvestable", not
  "harvest the sleeve".
- Anatomy-study plates are the best source of shoulder/arm skin and the worst source
  of identity continuity.

**How we address them.**

- Move the test upstream: classify the **source** region, then cut. A region that is
  84 % singlet never becomes a cutout at all.
- Share one predicate and one function between audit and bank so the two cannot
  disagree (this was a real, observed defect: the audit called the arm eligible while
  the harvester refused it).
- Tag anatomy-study material and refuse it for clothed personas; keep it as an
  angle study, which is what its provenance actually supports.

**Closed when.** Every limb material in the bank has a measured skin fraction above
threshold on its source, and no garment-classified region can enter the bank.

---

## I-6 — Cutout contract and round-trip verification

**What it contributes.** Defines what a cutout *is*, so the renderer can consume it
without surprises. This is where three real defects lived: anisotropic lateral
scaling, a mirrored lateral axis, and oversized ends. Each produced material that
looked acceptable in isolation and rendered as a blob once assembled.

**Acceptance criteria and how they are measured.**

- **Isotropy:** lateral extent is derived from bone length —
  `isotropicLateralExtent(len) = 80 · len / 88` — and the same value is passed to the
  verifier, so rectifier and verifier cannot diverge.
- **Handedness:** the rectifier mirrors the renderer's mapping (`x = 80 − uOff`),
  proven by an asymmetric synthetic fixture (a bar with a notch on one edge) in
  vertical, horizontal and diagonal orientations.
- **Proximal hygiene:** trim 0.28 of the bone for upper arm and thigh (occluded by
  torso/shorts), 0.08 elsewhere; per-row contiguous span through the axis
  (`trimCutoutToAxis`) so the tube never merges with a neighbour.
- **Cap discipline:** proximal cap 3 px; distal cap `clamp(0.28·halfWidth, 6, 12)` —
  because the renderer magnifies beyond-bone-end material by `80 / dstHalfWidthPx`.
- **Round trip:** re-warp the cutout with `warpPhotorealSegmentToQuad` and compare
  against the source **inside the tube footprint only**, shaft only (caps excluded):
  `alphaIou ≥ 0.85 && meanColorDelta ≤ 24`.
- Measurement: `npm run pose-material:harvest` rejection log; unit test `round-trips
  an asymmetric limb without mirroring`; synthetic fixtures at α-IoU 0.965–0.985.

**Challenges.**

- The verifier itself can be wrong: an early version compared against *all* foreground
  in a padded box, scoring correct tubes at 0.49–0.63 and rejecting everything.
- A verifier bug and a correct-but-mirrored cutout are indistinguishable by score —
  both fail. The synthetic asymmetric fixture was needed to separate the two.
- Renderer magnification at the ends means a 20 px overshoot in the cutout becomes a
  large blob in the frame.
- Sub-pixel sampling: cutouts are 160 × 160 and the warp is bilinear, so edge pixels
  legitimately differ; thresholds must tolerate resampling but not stretching.
- **A latent engine bug:** `computeSegmentBounds` clamped warp bounds to a hard-coded
  220 × 256 canvas, silently truncating every warp on a larger plate — meaning the
  benchmark could never have validated a full-resolution cutout.

**How we address them.**

- One shared helper (`isotropicLateralExtent`) used by both sides.
- Two-sided verification against a synthetic ground truth with known asymmetry, so a
  handedness error cannot hide.
- Restrict the comparison domain to the tube footprint and exclude caps; this is the
  semantic fix that turned α-IoU from 0.49 to 0.98.
- Fix the engine clamp and keep the regression: warps must respect the target canvas.

**Closed when.** Every banked cutout passes the round trip, and the synthetic
asymmetric fixtures pass in all three orientations.

---

## I-7 — Angle-bucketed material bank and selection

**What it contributes.** Turns harvested cutouts into a **supply curve**: for each
part, which measured angles are available, and at what quality. Selection then becomes
deterministic — the rig supplies geometry, the bank supplies appearance, and the
choice is made by measured angle rather than by filename order.

**Acceptance criteria and how they are measured.**

- Bank entries store `partId`, `sourceId`, `sourceSha256`, measured angle, bucket,
  half-width, visibility, side provenance and a **repo-relative** cutout path.
- Buckets are 15° on the limb-axis angle; selection tolerance is
  `ANGLE_TOLERANCE_DEG = 18`.
- Selection is deterministic given `(partId, targetAngle)`, never depends on file
  iteration order, and prefers higher visibility at comparable angle.
- A missing bucket yields an explicit `material-gap` selection, never a silent
  fallback to the standing cutout.
- Every selection is logged per phase with target angle and chosen material.
- Measurement: `bank.json` + demo report `selections[]`; demo summary counts
  `Material applied per part` and `Uncovered selections (gaps)`.

**Challenges.**

- Current supply is **7 buckets** for **128 slots** — 106 gaps. The bank is a correct
  answer to a corpus that does not contain the angles.
- Near/far identity means one physical crop may fill two slots; counting it twice
  inflates apparent coverage.
- A single material reused across a wide angle range reintroduces the original defect
  ("same sausage at every angle") in a subtler form.
- Two thresholds coexist: AC-8 asks for ≤ 12° residual; selection tolerates 18°. The
  demo is therefore honest about *coverage* but looser than the acceptance document
  about *fit*.

**How we address them.**

- Report coverage and residual deltas separately, so a 18° match is never presented as
  a 12° match.
- Count bucket contributions by **source hash**, so near/far twins do not double-count.
- Log every gap with its target angle, producing the work order for I-10.
- Reconcile the 12°/18° divergence explicitly: either tighten selection to 12° or
  amend AC-8 with a measured justification — and record which, rather than leaving two
  numbers in force.

**Closed when.** Every phase's selection is within one stated tolerance, the residual
distribution is published, and gaps are enumerated with concrete target angles.

---

## I-8 — Assembly integrity and seam continuity

**What it contributes.** A correct part in the wrong place still fails. This item
covers what the frame looks like once everything is composited: continuous joints,
no floating islands, no ground penetration, and — the subtle one — no visible
discontinuity where a harvested limb meets a studio torso, sock or shoe.

**Acceptance criteria and how they are measured.**

- Detached islands (≥ 32 px components) = **0** per frame.
- No alpha crack longer than 6 px at any joint; alpha continuity across every
  parent/child pair.
- **Material-induced ground delta ≤ 2 px**, measured causally: render the same pose
  with the studio bank only and compare silhouettes. Absolute sole height is reported
  separately as `stanceSoleSpreadPx`, because in a run both feet leave the ground
  legitimately and the heel lifts at toe-off.
- No skin band visible above a shorts hem; no sock gap at the ankle.
- Measurement: `npm run pose-material:demo` (`detachedIslands`,
  `groundDeltaMaxPx`, `stanceSoleSpreadPx`) and `npm run dump-cycle` for the full
  persona matrix.

**Challenges.**

- AC-9 as originally written ("ground-line delta ≤ 2 px in every frame") was
  **physically wrong** for a run: it scored correct flight as a defect. It was
  rewritten to a causal comparison.
- Harvested thigh material is cut 28 % below the hip, so the shorts cuff must be
  supplied by the pelvis layer — two frames still show a thin skin band.
- A limb cut at a slightly different angle than the rig's bone produces a wedge gap
  at the joint that no island metric detects.
- The shoe is not a tube: it is mapped through a two-segment heel/ball/toe warp with
  its own source coordinates, so limb techniques do not transfer.

**How we address them.**

- Measure causality, not absolutes: compare against the same pose rendered without
  harvested material. Current result: **0 px** material-induced ground delta.
- Report rig-owned residuals explicitly (`stance sole spread 8 px`) instead of
  pretending they are zero.
- Keep the pelvis/shorts layer authoritative for the hip; trim material below it.
- Treat the shoe as a separate item (not yet harvested) rather than pretending a tube
  cutout can serve it.

**Closed when.** 0 islands, 0 px material-induced ground delta, no alpha crack at any
joint, and the residual hip band either eliminated or documented per frame.

---

## I-9 — Cycle composition and diversity measurement

**What it contributes.** This is the acceptance test for the whole objective, and the
direct answer to the original complaint. It measures the *assembled* cycle, not the
prompts: 16 frames, pairwise silhouette IoU, half-cycle separation, and joint-angle
spread. A cycle can pass part-level checks and still be the same pose sixteen times;
only this item catches that.

**Acceptance criteria and how they are measured.**

- 16 frames at the eight canonical phases × 2 (near/far emphasis), phase names
  resolved through `normalizePhase`.
- Mean pairwise IoU **≤ 0.85**; worst pair **≤ 0.95**; half-cycle (frame *i* vs *i+8*)
  **≤ 0.90**. The source spritesheet failed the last one at **0.947**.
- Joint-angle spread over the cycle: hip ≥ 55°, knee ≥ 70°, ankle ≥ 35°,
  shoulder ≥ 45°, elbow ≥ 60°.
- Measurement: `npm run pose-material:demo` → `meanPairIou`, `maxPairIou`,
  `halfCycleIou` in `material-demo-report.json`; contact sheet inspected visually.

**Challenges.**

- Diversity metrics can be satisfied by a *worse* cycle: noise and detached blobs
  raise IoU distance while looking wrong. Metrics must be paired with visual review.
- The cycle is dominated by rig geometry; harvested material affects appearance, not
  silhouette, so AC-10 mostly grades the gait solver rather than the harvest.
- Half-cycle symmetry is a property of the gait model; a correct run *should* have
  similar left/right halves, which is in tension with a naive "make everything
  different" reading.

**How we address them.**

- Report all three IoU statistics plus islands and ground delta together, so a
  diversity win cannot hide an assembly loss.
- State plainly that AC-10 grades the gait model; the harvest is graded by I-6/I-7.
- Treat half-cycle ≤ 0.90 as "the two halves are not identical art", not "left and
  right must differ" — the original defect was literal art reuse at 0.947.

**Closed when.** A 16-frame cycle is published with all five statistics, passes all
three IoU bounds, and has been visually reviewed frame by frame.

---

## I-10 — Gap-driven acquisition

**What it contributes.** The only legitimate way to close C5. The corpus cannot
supply occluded angles by construction; new plates must be acquired, and they must be
acquired **against a named gap with a solved guide**, not against an adjective.
This item is where PR #1 and PR #8 spent their effort and where the programme now
must spend its next effort.

**Acceptance criteria and how they are measured.**

- A generation request cites a specific gap from the AC-8 list: part, phase, target
  angle, current best residual.
- The request ships a solved-pose guide at the plate resolution (1408 × 768) with the
  target limb isolated and the rest of the body held constant.
- The returned plate is scored on arrival by the same audit, before any crop is
  attempted; it is `rejected` if it fails AC-4/AC-5 for its target.
- A successful acquisition reduces the gap count by a measurable amount, and the new
  bucket is visible in the coverage table.
- No generation may be justified by "more variety".
- Measurement: gap count from the audit before/after; per-plate `poseMatchRatio` and
  eligibility in the audit JSON; provenance logged in `docs/FDS.md#image-prompt-log`.

**Challenges.**

- Text-only angle steering demonstrably fails: PR #8's Calls #83–#90 produced
  repeated long strides despite explicit angular instructions.
- A single profile camera makes several gaps **unreachable regardless of pose**:
  the near upper arm is behind the torso, the near thigh top behind the shorts.
  Generating more profiles cannot fix a geometry problem.
- Wardrobe continuity forbids solving arm coverage with anatomy-study plates.
- Generated hands and feet are the least reliable anatomy, and they are exactly where
  the corpus is thinnest.
- Each generation is irreversible and must be audited individually; unbounded
  regeneration is an explicit anti-pattern.

**How we address them.**

- Guide-first: change the *guide geometry*, not the adjectives (AC-12).
- Differentiate the gap types: **pose gaps** (fixable by a new pose from the same
  camera) versus **camera gaps** (require a new viewpoint or an isolated limb study).
  Only pose gaps enter the prompt queue; camera gaps change the shoot plan.
- For camera gaps, specify three concrete acquisitions: a three-quarter view, an
  opposite-facing profile (to make the other side's near limb the near limb), and an
  isolated limb study in the same wardrobe and lighting.
- Any new plate is scored before use, and a failed plate is retained with its
  measurements rather than deleted (AC-11).

**Closed when.** Every remaining gap is classified pose-gap or camera-gap, each
pose-gap has a guide-ready request, and the camera-gap set has a named acquisition
plan with wardrobe and lighting constraints.

---

## I-11 — Reproducibility, regression and documentation discipline

**What it contributes.** Makes the objective *maintainable*. Without it, every
conclusion above is a one-off observation; with it, a future change either keeps the
numbers or fails a test. It also enforces the project's own engineering gates
(file and function size), which is what keeps the measurement code reviewable.

**Acceptance criteria and how they are measured.**

- Three commands reproduce everything: `npm run pose-material:audit`,
  `:harvest`, `:demo`; outputs are byte-stable given the same inputs (hashes recorded).
- Unit + integration coverage for matte, registration, probe, rectifier, verifier,
  bucket selection, corpus ingestion and the frozen audit artefact.
- `npm run typecheck` clean; `npm test -- --run` green; greenfield gate satisfied
  (files ≤ 800 LOC, named functions ≤ 50 LOC).
- Every design decision has an `ADD-NNN` record and every working turn a `TURN-LNN`
  entry; failed approaches are recorded as dead ends rather than silently dropped.
- Measurement: the commands themselves, plus `src/discipline/greenfield-gate.test.ts`
  and `src/pipeline/pose-material*.test.ts`.

**Challenges.**

- `node_modules` and `/tmp` do not survive environment restarts: a test that depends
  on a sibling worktree will fail for reasons unrelated to the code.
- Measurement code grows fast and trips the 50-line function rule, which is exactly
  when it becomes unreviewable.
- Scratch scripts left in the repository break the repo-wide typecheck.
- Metrics can drift from the prose: documentation says "≤ 2 px" while the code measures
  something else (this happened with AC-9).

**How we address them.**

- Tests tolerate a missing sibling worktree (19 sources) and escalate to the full 30
  when it is present, so CI is honest in both environments.
- Functions are split by responsibility (`analyseSource` / `scoreSource`,
  `measureFrame` / `finalizeDemo`) rather than by suppressing the gate.
- Scratch files are deleted before commit; the dead-end register carries the lesson.
- Acceptance text and code are changed together; AC-9's causal reformulation is the
  worked example.

**Closed when.** A clean clone plus documented commands reproduces the audit, the
bank and the demo, and the full suite is green.

---

## 12. Where the objective stands

| Condition | Evidence | Verdict |
|---|---|---|
| C1 Pose truth | registration + F1/ceiling for 30 sources; PR1-phase-03 rejected at 0.53 | **met** |
| C2 Material truth | 6 materials pass appearance + round trip; 26 rejections recorded | **met for the material that exists** |
| C3 Identity continuity | one persona, one wardrobe set, scale bands enforced, anatomy-study excluded | **met** |
| C4 Assembly integrity | 0 islands, 0 px material-induced ground delta, 8 px rig-owned sole spread | **met, 1 residual (hip skin band)** |
| C5 Coverage | 7 buckets vs 128 slots, 106 gaps | **not met — the open problem** |
| C6 Reproducibility | 3 commands, 74 tests, hashes, FDS records | **met** |

**Measured end state.** 30 sources → 6 accepted, 20 conditional, 4 rejected → 7 angle
buckets → 6 verified materials → a 16-frame cycle with 6 part families covered,
86 explicit gap selections, 0 detached islands, 0 px material-induced ground delta,
mean pairwise IoU 0.515, worst 0.845, half-cycle 0.819 (source sheet: 0.947).

**The remaining work is I-10, and only I-10.** Every other item is closed. The
programme cannot reach full coverage by measuring harder: the single right-facing
profile physically hides the near upper arm, the near thigh top and the far-side
limbs. Closing C5 requires acquiring plates from additional viewpoints — which is a
shoot decision, not a prompt decision — and the audit now produces the exact work
order for it.

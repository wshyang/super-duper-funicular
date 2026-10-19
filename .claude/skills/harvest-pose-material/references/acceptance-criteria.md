# Acceptance Criteria (AC-1 … AC-12)

Working copy of the normative thresholds for
`docs/POSE_MATERIAL_ACCEPTANCE.md`. Numbering matches that document exactly; do not
renumber locally.

Verdict vocabulary is exact: `accepted` | `conditional` | `rejected` |
`material-gap`. There is no "probably fine".

---

## AC-1 Provenance and identity lock (gate, per source)

- Every source is content-addressed: `sourceId`, path, SHA-256, role
  (`master|pose-bank|phase-harvest`) and wardrobe.
- Counts reconcile: 1 master + 18 pose-bank + 11 phase = 30. Zero duplicate hashes.
- Identity drift is measured, not eyeballed: figure height 183–195 px, face width
  59–70 px, `faceScaleRatio` within ±10 %.
- Static parts (`head`, `neck`, `torso`, `pelvis`) come from the studio extractor
  unchanged and are never re-harvested by bounding box.
- Measured by: `pose-material:audit` (`sha256`, `figureHeightPx`, `faceWidthPx`,
  `faceScaleRatio`); `verify-run.ts` G1/G3; bank contains no static `partId`.

## AC-2 Wardrobe continuity (gate, per source and material)

- Every source is tagged `clothed` or `anatomy-study`.
- `anatomy-study` plates are angle evidence only: they may never supply material
  for a clothed persona. Enforced at harvest (`wardrobe:anatomy-study` rejection),
  not merely documented.
- Measured by: `wardrobe` on source and lineage; `verify-run.ts` G5 fails if any
  banked material descends from a study plate.

## AC-3 Backdrop and matte purity (per source)

- Hue/value keying, not RGB triplet distance: cast shadow is a darker backdrop, so
  a triplet-distance matte keys the shadow as subject.
- `fringeRatio < 0.08`; `interiorLeakRatio ≤ 0.014`; key residue ≤ 0.3 % of plate
  pixels; silhouette is one connected component with islands < 32 px removed.
- *Calibrated 2026-10-19 from the 30-plate corpus: fringe 0.044–0.059, leak
  0.002–0.003, residue 0.07–0.16 %. The pre-measurement `< 0.02` and zero-residue
  targets are unattainable at 1408 × 768 with antialiased edges.*
- Measured by: audit `fringeRatio`, `interiorLeakRatio`, `magentaLeakPixels`,
  `backgroundNoise`, `shadowFraction`; `verify-run.ts` G2.

## AC-4 Registration, scale and ground (gate, per source)

- Silhouette is single-component; registration solves scale, translation and
  rotation, then refines locally (a head-anchored fit alone is biased 30–40 px).
- Registered ground lands within ±3 px of the rig ground line; figure height
  within ±6 % of the master (X04 at 578 px vs 708 px is a hard fail).
- Measured by: audit `registration.scale`, `.figureHeightPx`, `.poseF1`.

## AC-5 Measured pose compliance (per part)

- Silhouette F1 against the rig-rendered target for the declared phase, normalised
  by the renderer's own ceiling for that phase (measured 0.850–0.908):
  `poseMatchRatio = poseF1 / ceilingF1`.
- Gate: `poseMatchRatio ≥ 0.80`. Below it the **source** is demoted with
  `pose-unverified:<ratio>`; its parts are kept, because whole-silhouette F1 is
  dominated by torso and legs and a plate at 0.76 can still hold a correctly
  measured forearm. Demoting every part is the pilot's whole-image flaw (F-3).
- `declared-phase-mismatch` when the best phase differs by > 7 % of the cycle.
- Measured by: audit `poseMatchRatio`, `reasonCodes`.

## AC-6 Near/far determinacy (per part, recorded)

- A single lateral profile cannot prove which limb is nearer.
- Materials record `sideProvenance: 'guide-derived'`; no pixel-level chirality
  claim is made, and chirality is never used as an acceptance veto.
- Measured by: `sideProvenance` on every material.

## AC-7 Part integrity (per part, per crop)

- Eligibility, per part, with reason codes: `low-fill`, `weak-walls`,
  `width-mismatch`, `merged-with-neighbour`, `wrong-material`,
  `pose-unverified`, `part-not-visible`.
- Limb parts are measured by the **same probe the harvester uses**.
- Thresholds: fill ≥ 0.72, wallContrast ≥ 0.42, widthAgreement ≥ 0.35,
  isolation ≥ 0.20; limb skin dominance ≥ 0.45 measured **on the source inside the
  tube**, before cutting.
- Cutout convention: 160 × 160, bone vertical at `x = 80`, `y ∈ [36, 124]`,
  lateral half extent `isotropicLateralExtent(len) = 80·len/88`.
- Measured by: audit `parts[*]`; harvest rejection log; `verify-run.ts` G6.

## AC-8 Bucket coverage (per part, per cycle)

- Buckets are 15° on the limb-axis angle. The eight canonical phases must each
  resolve material within 12°.
- Missing buckets are published as a gap list with part, phase and target angle,
  and classified **pose gap** vs **camera gap** (see `objective-register.md`).
- A phase without eligible material is `material-gap`; silent fallback to the
  standing cutout is forbidden.
- Measured by: audit `buckets`, `gaps`; current 34 buckets / 74 gaps.

## AC-9 Assembly integrity (per rendered frame)

- Detached islands (≥ 32 px) = 0; no alpha crack longer than 6 px at any joint.
- **Material-induced** ground delta ≤ 2 px: the same pose rendered with the studio
  bank only is the baseline. Absolute sole height is reported separately as
  `stanceSoleSpreadPx` and is rig-owned foot-roll behaviour, not a material defect.
- Measured by: demo `detachedIslands`, `groundDeltaMaxPx`, `stanceSoleSpreadPx`;
  `verify-run.ts` G7.

## AC-10 Cycle diversity (per cycle)

- 16 frames, pairwise silhouette IoU on height-normalised masks.
- Mean ≤ 0.85, worst pair ≤ 0.95, half-cycle (i vs i+8) ≤ 0.90.
- Failure precedent: the original sheet's 0.947 half-cycle duplication.
- Measured by: demo `meanPairIou`, `maxPairIou`, `halfCycleIou`.

## AC-11 Reproducibility and rejection hygiene

- Three commands reproduce audit, bank and cycle; hashes stable across runs.
- Every rejection keeps its reason; nothing is deleted to improve a summary.
- Assets are immutable: a new attempt gets a new path and a new hash.
- Measured by: re-running and diffing `bank.json`; `verify-run.ts` G4/G8.

## AC-12 Generation discipline

- A generation call is justified only by a named AC-8 gap or an AC-9/AC-10 failure.
- The request ships a solved-pose guide; the reply is scored on arrival before any
  crop is attempted.
- A plate failing AC-4/AC-5 for its target is `rejected`, and the next attempt
  changes guide geometry, not adjectives.
- Measured by: gap-list diff, `poseMatchRatio` of new plates, prompt log.

---

## Objective conditions

| ID | Condition | Served by |
|---|---|---|
| C1 | Pose truth: the frame is the phase it claims | AC-4, AC-5 |
| C2 | Material truth: every pixel traceable and verified both ways | AC-1, AC-6, AC-7, AC-11 |
| C3 | Identity continuity: person, wardrobe, scale, light, colour | AC-2, AC-3, AC-4 |
| C4 | Assembly integrity: no islands, seams, penetration | AC-9 |
| C5 | Coverage: enough measured angles; gaps named | AC-8 |
| C6 | Reproducibility: claims re-derivable from commands | AC-11, AC-12 |

Current standing: ten of eleven work items closed; **C5 is the single open
condition**, and it is a camera-geometry limit, not a prompting failure. See
`objective-register.md`.

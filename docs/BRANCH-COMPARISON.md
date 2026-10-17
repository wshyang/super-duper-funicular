# Branch Comparison: `arena/917ef347` (Sprite Motion Lab) vs this branch

**Compared:** `arena/917ef347-super-duper-funicular` @ `f4c3197` (2026-10-17 13:54 UTC, PR #1
"Sprite Motion Lab — 17-Part Biomechanical & Photorealistic Running Engine, Rounded Joint Cutter,
SVG Vectorizer & FDS Prompt Audit Log"), checked out at `/tmp/other-branch` (git worktree, 28 MB)
and read file by file. A third branch `arena/ce6d2a6e` @ `bab689c` is an earlier, smaller effort
(procedural runner + sprite extraction) and is not the subject here.

Both branches start from `396ce25` ("Add files via upload", the flawed spritesheet jpeg) and answer
the same brief; they diverge in architecture. This document lists what the sibling branch does
well, what was taken from it this round, and what this branch does better — with the measurements
behind each claim.

---

## 1. What the sibling branch does well

### 1.1 Measured flaw audit of the original sheet
`docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` + `src/pipeline/flaw-analyzer.ts` quantify the original
art: half-cycle frame duplication (**94.7 % mean centroid-aligned silhouette IoU**, `dHash`
distance 0–4 bits — only 4 unique poses in 48 cells), a permanently extended far leg ("peg-leg
hop", `frontFootOffsetX > +53 px` in all frames), zero leg crossover (min foot separation
**147 px**), unregistered scale (height jitter **20 px**, baseline shift **25 px**), and two-tone
magenta grid spill. The numbers made the diagnosis unarguable.

### 1.2 Rounded joint-end cutter (`src/pipeline/rounded-joint-cutter.ts`, ADD-016..019)
The most relevant work to this branch's open defects. `cutArticulatedLimbWithRoundedEnds` rebuilds
each limb on a canonical `160 x 160` canvas with **semicircular ends centred on the proximal
`(80, 36)` and distal `(80, 124)` rotation pivots**, `mapLongitudinalWithIsotropicCaps` maps the
caps isotropically onto the shared joint, and `applyPivotArcRoundedCut` trims a half-plane outside
an elliptical arc about a pivot. Their stated principle: a disc centred on the pivot is the only
boundary a rotation leaves unchanged, so the topmost z-order element seals the axis concentrically
at every gait angle. `EndCapCompositeSpec` (ADD-019) grafts a rounded-top, straight-bottom shorts
cuff onto each thigh, so the hip rounds without the shorts looking like a skirt.

### 1.3 Tightly-scoped per-element studio plates (`src/images/photoreal-female/01..10`)
One master profile plus nine single-element references: head, ponytail, **cervical neck cylinder**,
**armless torso in a racerback singlet**, pelvis/shorts, near arm (lateral), **far arm (medial,
palm to camera)**, near leg, far leg. Each is a separate generation with a logged prompt, a strict
90° sagittal contract, and magenta keying. ADD-016/017 document a full regeneration after their
first pass drifted to 45° camera twists.

### 1.4 FDS prompt log (`docs/FDS.md`, ADD-018)
Every `generate_image` call logged with the verbatim prompt, reference images, and a regeneration
justification. Their rule: a diffusion regression must never be re-litigated from memory.

### 1.5 Two-bone IK and contralateral gait (`src/runner/two-bone-ik.ts`, `gait.ts`)
Law-of-Cosines IK with a knee-forward constraint; far side at anti-phase `φL = (φR + 0.5) mod 1`.
Limbs are positioned by solved joint coordinates rather than pure angle sets — correct joint
chaining under large excursions.

### 1.6 Granular 17-part rig
Separate `nearHand`/`farHand`, `hairAccessory` (ponytail as secondary motion lagging with vertical
COM velocity), and `pelvis` bridging trunk to legs.

### 1.7 Raster→SVG vectoriser and stitcher (`svg-vectorizer.ts`, `svg-rig-stitcher.ts`)
Chaikin-smoothed quadratic Bézier `<clipPath>` masks, **quantised colour-band `<path>` vectors**
(full-colour vector reconstruction, not silhouette-only), exact 6-parameter SVG affine matrices,
and 2-segment hinged rearfoot/forefoot groups in the stitched frames.

### 1.8 Discipline and QA automation
`src/discipline/greenfield-gate.test.ts` enforces ≤50 LOC per function, ≤800 LOC per file,
`data-testid` coverage, and the Dockerfile contract automatically. ADD-020 adds a full-cycle frame
dumper (`npm run dump-cycle`) and a multimodal `audit-gait-cycle` agent skill. Pre-baked
8-frame × colourway sheets (`blue/green/orange`) ship as assets; stadium backdrops are generated.

---

## 2. Taken into this branch this round

| Their practice | What landed here |
| --- | --- |
| Per-element armless torso plate (ADD-016, call `#05`) | Generated `sg-chinese-female__torso-only__chroma-green__source.png` (chroma green, arms-free) and multi-source extraction: `src/lib/photo/patch.ts` registers it by measured anchors and composites it into the base plate (`patches` in `tools/photo-rig-spec.ts`) |
| Rounded ends about rotation axes (ADD-016) | `src/lib/photo/arc-cap.ts` + `caps` in the plate spec; applied to the neck's two ends (see addendum for the measured reasons the other ends cannot take a pivot-centred arc in plate space) |
| FDS prompt log (ADD-018) | `docs/PHOTO-PROMPTS.md` — verbatim prompts + regeneration justification, adopted as standing practice |
| End-cap composite for the shorts cuff (ADD-019) | Recorded as the plan for the male plate's hip end; not needed here (the new torso plate's shorts carry a real hem) |

Not taken, and why: canonical-canvas resampling (this branch keeps original plate pixels and
plate-space coordinates throughout; a canonical rebuild is a re-architecture, noted as the path to
full rounded ends at every end); colour-band vector tracing (this branch's silhouette trace is
gated by measured IoU and embeds the true texture; colour-band tracing is better for pure-SVG
distribution); React app shell (this branch's vanilla TS bundle is 53.3 kB js, built in ~590 ms);
pre-baked frame sheets (this branch composes every frame procedurally at runtime).

---

## 3. What this branch does well

1. **One coherent photograph.** Every near-side part is cut from a single studio plate: one skin
   tone, one lighting, one fabric. The sibling's photoreal rig stitches ten separately diffused
   plates, which can disagree at every seam. This branch's cuts are gated by measured silhouette
   IoU per part (0.981–0.998 after tracing).
2. **Colour mattes as a hard invariant.** `isSkin`-class floods, then `purgeMatte` +
   `refillMatted` (`src/lib/photo/matte.ts`) make it total: after the purge the skin-matted upper
   arm carries **0** opaque bright-red pixels (measured; the pre-matte cut carried stray strap
   texture), and the fabric torso carries **0** skin-classified pixels. The sibling branch has no
   equivalent class invariant.
3. **Ball-and-socket joints with membrane-filled balls** (`src/lib/photo/round-cut.ts`): the ball
   face is solved as a smooth membrane pinned to real texture around it, so the joint face is never
   a hole and never a pasted disc — the failure mode that a naive ball seal produces (this branch
   tested and rejected that in round 6).
4. **Far-side medial textures shot separately** and fitted with a CI width gate (<15 % delta;
   current far/near deltas: upperArm 6.0 %, forearm 0 %, thigh 0 %, shin 0 %).
5. **Runtime procedural composition.** The photo rig solves and paints any phase and pose live —
   including the rolling foot (hindfoot/forefoot hinge at the ball) and the permanent forward lean —
   instead of distributing eight baked frames. Both skinnable vector personas and the photo persona
   run in one lab with an atlas viewer.
6. **Numeric QA artefacts.** `reports/photo-parts-*.png`, `reports/photo-atlas-*.png`, seam probes
   at magnification, and the ownership probe (unowned-pixel counts per window) back every claim.
7. **The rolling foot and the two-segment shoe** (hindfoot + forefoot split at the ball with a
   grounded sole rule) — the sibling keeps the foot as two hinged groups in SVG only.

## 4. Honest gaps in this branch (vs the sibling)

- No separate hands: the forearm crop carries the hand, so the wrist cannot articulate.
- No ponytail secondary motion; the hair rides with the head.
- No pelvis part: the shorts live in the torso crop (the sibling's pelvis + end-cap composite is
  cleaner at the hip).
- SVG output is silhouette + embedded texture, not pure colour-band vectors.
- No automated discipline gate test and no shareable baked sprite sheets.
- Rounded ends are complete at knee and elbow (balls) and at the neck's two ends (arc caps); the
  jaw, shoulder, hip, ankle, and toe-hinge ends are sealed by z-order overlap, not by arcs — measured
  this round (a pivot-centred cap small enough to round the jaw cut also erased 1,788 px of
  ponytail; the deltoid, forefoot, and sole all carry mass far off their pivots). The sibling's
  canonical-canvas resampling is the proven route to close this; it is a re-architecture.

## 5. Follow-up: Stride Lab and refreshed Sprite Motion Lab (2026-10-18)

Exact references (code read; their gates not independently executed):
- Stride Lab `arena/263385da-super-duper-funicular` at
  `b227e2fe562be341f15f58955f539d325170729e`, detached `/tmp/stride-lab`.
- Refreshed `arena/917ef347-super-duper-funicular` at
  `ea3c37c6a8b946cf38e136cc183aa84edb012373`, detached
  `/tmp/sprite-lab-ea3c37c`; latest other-branch commit inspected this turn.

| Source-backed good practice | Adoption/status here |
| --- | --- |
| Stride Lab `end-cuts.ts`: bone-local radial end, transverse inner boundary, smooth shaft blend | Ported as `end-cap.ts`, 15 tests, optional extractor `endCuts`. Defaults disabled after inconclusive/gapped magnified knee probe. |
| Stride Lab `FDS.md`: append-only evidence/decision/validation learning register | Adopted in `docs/FDS.md`; mandatory each turn in `CLAUDE.md`. |
| Stride Lab `cycle-audit.ts` / `end-mask.ts`: 16-phase multi-background audit, interactive reversible masks, bounded cache | Planned P-2; no UI port claimed. Offline baking here avoids per-frame mask work. |
| Stride Lab real-browser asset failure/retry tests and walk/brisk-walk contracts | Stronger coverage/breadth than here; readiness failure-path investigation P-3. Do not import running-incompatible contact knots. |
| Sprite Motion Lab `ea3c37c`: internal cap shoulder blend, ankle-sock reconstruction, joint inspector/audit exports | Reinforces local blending and provenance-backed texture repair. Reconstruction/UI deferred pending app-fidelity acceptance and coordinate-contract adaptation. |

Our advantages are specific, not universal: coherent original near-side texture,
colour-class matte invariant, explicitly measured medial width parity, runtime
phase composition and additive vector personas. Stride Lab has more interactive
calibration and browser regression evidence; Sprite Motion Lab has finer part
articulation and pure colour-band SVG. All three still document photographic seam
limitations. Neither a zero-island score nor our high trace IoU establishes realism.

The cap trial is a useful failed acceptance, not a shipped visual improvement:
0/50/178/33 alpha reductions at shoulder/elbow/knee/toe were measured before ball
resealing; the shoulder is a no-op and the magnified knee has a crescent gap.
Baseline assets restored by full near/far extraction. See FDS L001 and plan §4.

# Photo-rig quality plan — investigative findings and proposed fixes

Living plan for the photographic rig. Findings are measured, not impressions: every number below
comes from a probe that can be re-run (paths given). Proposed fixes are ranked by evidence and
risk. Status is updated as work lands; see `docs/FDS.md` for the per-turn learning register and
`docs/ADDENDA.md` for decision entries.

Last updated: 2026-10-18. See the execution update below; proposals are not completion claims.

---

## 1. Findings from the investigative runs

### 1.1 What is measurably good now

| Finding | Evidence |
| --- | --- |
| The torso is arm-free and fabric-pure | Generated torso-only plate composited by measured anchors (scale 0.5975); torso matte overlap 0.998; skin-matted arm carries **0** opaque bright-red pixels (`.scratch/red-check.ts`) |
| Colour mattes are a hard invariant | `purgeMatte` + `refillMatted`; shoulder-window unowned pixels fell 1,788 → **68** (`.scratch/ownership.ts`) |
| Head/neck seam is clean at rest and at +0.35 rad | `reports/rig-head-0.png`, `reports/rig-head-0.35.png` — no step, no tear, no disc |
| Knee and elbow are true ball joints | `round-cut.ts` membrane-filled balls (knee r39, elbow r26) |
| Far limbs match near limb widths | far/near deltas upperArm 6.0 %, forearm 0 %, thigh 0 %, shin 0 % (CI gate <15 %) |
| Vector trace fidelity | silhouette IoU 0.985–0.998 per part |

### 1.2 Measured defects still open

**D-1 · Rounded ends are only partial (requirement: every articulated end rounded about its
rotation axis).**
Done: knee/elbow (balls), neck both ends (elliptical arc caps, ADD-032). Not done: jaw, shoulder,
hip, ankle, toe hinge. Investigated with pivot-centred elliptical caps (`.scratch/ownership.ts`):
a cap small enough to round the jaw cut erased **1,788 px** of ponytail (the ponytail hangs ~130 px
below `headBase`); the deltoid mass sits ~70 px off the shoulder pivot; the forefoot 46 px off the
ball; the shin's cut end 81 px off the ankle. A pivot-centred ellipse either eats anatomy or is a
no-op for these ends. **Root cause of the failure:** my cap acts on a half-plane beyond the pivot
only, so it cannot round corners *inside* the joint plane without erasing everything sideways.
Stride Lab's `capAlpha` addresses local corners, but cannot restore missing texture or preserve all off-axis anatomy (see fix P-1).

**D-2 · 68 px unowned sliver at the front armhole rim** (`.scratch/ownership.ts`, window
x300–470 y250–370). Fabric-classified pixels isolated in a skin sea: `refillMatted` cannot cross
colour classes, so they belong to no sprite. Visible as a hairline seam at magnification.

**D-3 · Neck sprite in isolation carries red remnants.** 54 opaque warm pixels that the shared
`isSkin` classifier cannot separate from shadowed skin (dark red ≈ skin in RGB), plus the
deliberate colour margin `cutPart` keeps for canvas filtering. At runtime the collar covers them;
the atlas cell still looks impure.

**D-4 · Head jaw feather hairline at large turns.** At +0.35 rad a faint light hairline remains
along the jaw (feathered rim of the head crop reading against the neck's skin). At rest and at
normal run angles it is invisible.

**D-5 · Photographic texture seams at hips/knees remain** (also true of every branch reviewed).
Garment/skin transitions and per-plate lighting differences are inherent to 2D photo cutouts; full-
cycle audits make them easier to inspect but do not repair them.

**D-6 · Male photo persona is void.** `MALE_PHOTO` joints were measured on a superseded plate and
are marked draft in `tools/photo-rig-spec.ts`; `tools/extract-photo-far.ts` is female-hardcoded.

**D-7 · No separate hands, pelvis, or ponytail part.** The hand rides on the forearm crop, the
shorts live in the torso crop, the ponytail rides on the head. Each blocks one articulation
(wrist, hip hem, secondary hair motion).

**D-8 · Asset loading is permissive.** The app tolerates partial sprite banks; a failed load is not
surfaced as a hard state (the same weakness Stride Lab criticises in the other branch's
`usePhotorealRigAssets.ts`). Users can watch a silently incomplete rig.

**D-9 · Historical image prompts before `docs/PHOTO-PROMPTS.md` are not recoverable verbatim.**
Prompt provenance starts at the torso plate (2026-10-18). Earlier generations must not be
reconstructed from memory and passed off as logged.

### 1.3 Failed experiments (do not retry as-is)

1. **Naive ball seals at headBase/shoulder** — filled a circular neck disc into the head sprite;
   a giant disc showed at turns. Balls work at knee/elbow because the ball fits inside the limb
   width; they fail where the "limb" is a head or a deltoid.
2. **Hard `matteScope: "shape"` on the neck** — split the neck into islands, punched holes.
3. **Jaw barrier removal / low collar line** — thinned the neck to a 15 px sliver carrying strap.
4. **Feathered jaw seam (`featherSeam`)** — did not remove the hairline; reverted.
5. **Elliptical caps at every end (this round)** — measured destruction (ponytail 1,788 px,
   forefoot 2,560 px unowned) before the neck-only scope was settled. The ellipse is the wrong
   primitive for ends whose mass lies sideways of the pivot; P-1 replaces it.

---

## 2. Proposed fixes (ranked)

### P-1 · Bone-local end-cap alpha (from Stride Lab `end-cuts.ts`) — **implements D-1**
Their `capAlpha`: in bone-local coordinates (x transverse, y from the joint plane along the bone),
distance is `hypot(x, y)` beyond the plane but `|x|` inside it, blended over `blend` px into the
shaft. Corners are removed both beyond *and immediately inside* the joint plane while anything
further than `blend` along the shaft is untouched — but it still removes off-axis anatomy beyond the plane. It must not be assumed safe for the
ponytail, deltoid, forefoot or sole without per-part visual acceptance. Multiply the crop's alpha by the product of the two end caps;
bake it at extract time (deterministic, no runtime cost).
*Scope:* `src/lib/photo/end-cap.ts` (pure maths + tests), `endCaps` per part in
`tools/photo-rig-spec.ts` (radius/blend/feather per end, plate pixels), wired after `cutPart`.
Verify with `.scratch/ownership.ts`, `rig-qc` magnified probes at 0 / ±0.35 / ±0.6 rad, and the
existing matte/trace gates.

### P-2 · 16-phase full-cycle audit sheet — **implements D-5 inspection**
Stride Lab's `cycle-audit`/`audit-layout`: one PNG, 4×4 phases in `[0, 1)`, each with light, dark
and joint-overlay panels. Port as `tools/render-photo-audit.ts` over `composePhotoRunner` +
`paintPhotoRunner`; commit the sheet to `reports/`. Visual review at magnification of hip/knee/neck
crops is the acceptance test.

### P-3 · Asset readiness as a hard state — **implements D-8**
All-or-nothing sprite bank with pending/error/retry in `src/app/model/photo-runtime.ts`; export
gated on readiness. Test the failure path with a missing-file fixture.

### P-4 · Male photo persona, re-measured — **implements D-6**
Shoot/plate-check a current male plate, re-measure joints on the keyed silhouette (the documented
method in `tools/photo-rig-spec.ts`), parameterise `tools/extract-photo-far.ts` by rig. Female
first discipline is already satisfied; male is the stated next persona.

### P-5 · Part decomposition: hands, pelvis, ponytail — **implements D-7**
Needs dedicated tightly-scoped plates (hand pairs with medial palm for the far side; pelvis/shorts;
ponytail). Pelvis + Stride Lab's `hipMaskAlpha` (a lower half-ellipse keeping the waist, removing
the hanging hem) fixes the static-hem-over-rotating-thigh artefact. Budget: 10 generated images/turn
max; log every prompt in `docs/PHOTO-PROMPTS.md` (P-9 applies).

### P-6 · Dedicated head-and-neck plate — **implements D-3, D-4**
A tightly-scoped head+neck reference (no torso, no strap) would let the jaw cut end at anatomy
instead of a barrier, and the neck carry pure skin. Until then, P-1's jaw cap may retire the
hairline; the 54 ambiguous red pixels need either a second classifier pass (fabric-hue exclusion)
or acceptance.

### P-7 · Opt-in texture reconstruction (canonical capsules) — long-term D-1/D-5
The Sprite Motion Lab `rounded-joint-cutter` rebuilds limbs on a 160×160 canonical canvas with
semicircular ends and isotropic cap mapping, and its `EndCapCompositeSpec` grafts a straight-hem
shorts cuff onto each thigh. Stride Lab read it and **deferred** it (stretch/distortion risk to
registered cutouts); this plan agrees: prototype as a named, opt-in stage with provenance and
tests, never as a hidden mask change.

### P-8 · Artwork inventory with hashes
Port Stride Lab's `docs/artwork-inventory.json`: SHA-256 + decoded-pixel hashes of every source
plate and generated image, so provenance and regeneration are auditable.

### P-9 · Prompt-log completeness (D-9)
Prospective only: every future `generate_image` call logged verbatim in `docs/PHOTO-PROMPTS.md`
with references and regeneration justification. Historical prompts stay marked unrecoverable.

### P-10 · Colour-band SVG vectors
Silhouette traces (IoU-gated) keep true texture embedded; pure-SVG distribution wants quantised
colour-band paths (Sprite Motion Lab `svg-vectorizer.ts`). Deferred until a distribution need
exists; the silhouette+texture contract stays the default.

---

## 3. Standing acceptance for any fix

1. Tests land first and fail before the implementation (GREENFIELD).
2. Numeric gates stay green: `npx tsc --noEmit`, `npx vitest run`, `npm run validate`; extraction
   QC values (matte overlap, width deltas, unowned windows) are re-measured and reported.
3. Visual QC at magnification (zoom ≥ 2 crops, multiple angles), never thumbnails.
4. Honest residual reporting: whatever remains is named with its measurement.

## 4. Execution update — 2026-10-18

- Reviewed Stride Lab `b227e2f` at `/tmp/stride-lab`, then refreshed remote heads and
  reviewed Sprite Motion Lab `ea3c37c6a8b946cf38e136cc183aa84edb012373` at
  `/tmp/sprite-lab-ea3c37c` (latest other-branch tip by inspected commit timestamp).
- **P-1: prototype landed, default activation deferred.** `end-cap.ts` has 15 tests;
  extractor supports optional per-part `endCuts`. Trial alpha reductions: shoulder 0
  (no-op), forearm 50, shin 178, toe 33 pixels. These are reduced-alpha counts,
  not pixels proven defective or repaired. Ball sealing after the mask may overwrite
  some of these reductions. Far-side extraction does not yet apply this prototype.
- Viewed the 3× knee probe: a crescent background gap remains. This probe uses
  plate-space pivots without solver translations; it cannot certify live gait joins.
  Disabled trial defaults and regenerated the baseline with `npm run photo:extract`.
  Next: app-fidelity before/after joint crops over 16 phases; test mask/ball ordering
  and far-side parity before enabling any defaults. Requirement for every rounded
  end remains **PARTIAL**.
- P-2..P-10 remain proposals, not delivered features. D-8 is an investigation item:
  readiness/failure behaviour needs a direct local failure-path test before asserting
  its exact user-facing consequences.
- Validation: `npm run validate` passed: strict typecheck, 177 tests across 13 files,
  production build. Other branches were read, not built or tested locally.

## 5. Three-way parity update — 2026-10-18

`docs/THREE-WAY-COMPARISON.md` is now the live cross-branch parity contract.
P-2 inspection progressed: `npm run photo:audit` produces 16 phases with light,
dark and skeleton panels through the actual app solver/painter. Browser/settings
export remains pending. Viewed sheet shows ankle/foot separation across several
phases; prioritise enlarged app-fidelity ankle/ball-hinge coverage probes next.
Do not enable experimental end cuts to hide an unmeasured placement failure.

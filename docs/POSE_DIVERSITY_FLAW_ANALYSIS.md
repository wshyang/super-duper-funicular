# Pose-Diversity Attempt Flaw Analysis (PR #1 + PR #8, scored vs SC-AC v1.0)

Evidence: PR #8 tip `9d448fe` (Calls #73–#90, 18 candidates),
PR #1 tip `96a284f` (phases 01–11 + synced pose-bank pipeline).
Criteria: `docs/SPRITE_CAPTURE_ACCEPTANCE_CRITERIA.md`.

## Scoreboard (current state vs “working”)

| SC-AC goal | Athletic pilot status | Verdict |
|------------|----------------------|---------|
| SC-AC-08 phase spine (8/8 POSE-pass, no duplicates) | 0 `pass`; 5 `conditional` (≈`deviated`), 3 `needs-regeneration` (`rejected`); H05≈H01 duplicate pair | ❌ FAIL |
| SC-AC-07 coverage (17/17 parts ≥1 source; 12/12 × 2 angle bins) | 0 CROP-accepted sources (`canonicalJigSources: []`); per-part visibility never recorded on PR #8 | ❌ FAIL |
| ≥50% Tier A/B side-specific | 0% — chirality explicitly “unverifiable” on all 18 attempts | ❌ FAIL |
| SC-AC-09 end-to-end proof | Never executed (nothing to integrate) | ❌ FAIL |
| **Crop yield after 18 generations** | **0 harvestable cutouts** | ❌ **process not working** |

PR #1’s phase-harvest track scores better on *machinery* (per-part ledger,
clearance metrics, 12 jig variants specified) but shares the yield problem:
optimistic all-`3` visibility rows, no diversity metric, no key metric, and the
bare-limb inserts that produce the cleanest contours break wardrobe continuity.

*The table above is the PR #8 baseline (0/4). For this branch's current state
after Calls #91–#100, see “Scoreboard after #100” below.*

## Per-attempt verdicts (PR #8 pose bank)

| Call | Frame | POSE (SC-AC-01/02/03) | CROP (SC-AC-04/05/06) | Primary defect |
|------|-------|----------------------|----------------------|----------------|
| #73 | H01 | rejected (`key-shadow` adjacency aside, pose ok → `deviated`) | not-harvestable (`key-shadow`) | Floor shadow; kept as evidence |
| #74 | H01r | `deviated` (pose coverage, broader than guide) | not-harvestable (`key-edge` pending) | Contact-shoe edge unvalidated |
| #75 | H02 | `deviated` (subtly lower, not loaded-cushion) | not-harvestable (`key-shadow`) | Loaded-knee landmark missing; shadow |
| #76 | H03 | **rejected** (`wrong-phase`: generic high-knee sprint; 3/4 torso turn ⇒ SC-AC-01#5 fail) | not-harvestable | Model prior overpowered guide |
| #82 | H03r | **rejected** (`wrong-phase`: same collapse with hi-res skeleton guide) | not-harvestable | Proves guide-resolution ≠ compliance |
| #77 | H04 | `deviated` (airborne ✓, stride over-extended) | not-harvestable (`chirality-c` + unmeasured) | Exact-angle use disallowed (correctly) |
| #78 | H05 | `deviated` + **`duplicate` of H01** (SC-AC-03 fail) | not-harvestable (`chirality-c`) | No depth cue distinguishes far-support |
| #79 | H06 | **rejected** (`wrong-phase` + `duplicate`: straight-knee generic contact) | not-harvestable | Loaded-cushion never rendered |
| #80 | H07 | **rejected** (`wrong-contact`: airborne instead of toe-off) | not-harvestable | Contact-state mismatch (exact-match rule) |
| #81 | H08 | `deviated` (airborne ✓, over-extended) | not-harvestable (`chirality-c`) | Same as H04 |
| #83 | X01 | `deviated` (near-arm-forward ✓, shoulder attached not socket) | not-harvestable (`key-shadow`, `chirality-c`) | Best arm-diversity evidence so far |
| #84 | X02 | `deviated` (opposite angle ✓) + SC-AC-01#3 fail (black wristband) | not-harvestable (`costume-drift`) | Costume drift ⇒ correct rejection |
| #87 | X02r | `deviated` (bands fixed ✓) | not-harvestable (`touching`: hand meets hip) | 0-px silhouette gap kills harvest |
| #85 | X04 | **rejected** (`duplicate`: same elongated sprint) | not-harvestable | Text adjectives ≠ geometry |
| #86 | X04r | `deviated` (distinct silhouette, missed tuck depth) | not-harvestable (`key-shadow`, `chirality-c`) | Partial: geometry words helped a little |
| #88 | X04c | `deviated` (custom guide ⇒ genuinely opposed shins ✓) | not-harvestable (`chirality-c`, bg shading) | **Validates guide-geometry > prose** |
| #89 | X05 | `deviated` (far-forearm exposed ✓, open palm ⇒ hand-anatomy drift) | not-harvestable (`chirality-c`, `key-shadow`) | Open palm vs running fist |
| #90 | X06 | `deviated` (rear/down forearm + gap ✓ — best far-arm evidence) | not-harvestable (`chirality-c`, `key-shadow`) | Cleanest insert; still Tier C |

Pattern: **POSE track is converging** (custom guides #88–#90 work);
**CROP track is stuck at zero** (shadows + Tier-C chirality on every frame).

## Root-cause analysis (5 flaws)

### FLAW-1 — Guide signal is tiny and depth-blind
- V1 guides center a ~300 px figure in a 1408×768 canvas (≈15% of pixels carry
  pose information). The image model demonstrably downweights it (#76→#82: same
  failure with a “better” guide).
- Sticks encode no body volume, no foot-contact glyph, no depth ordering the
  model can render (blue/orange is explained in prose the model must map back
  onto pixels).
- **Fix:** V2 guides — fill-frame figure (≥70% canvas height, master-matched
  framing), capsule-volume limbs, filled/hollow foot glyphs for contact state,
  thick-solid-near vs thin-halo-far styling, baked phase + contact label.
  (`src/pipeline/pose-guide-renderer.ts` → `renderPoseGuideRasterV2`.)

### FLAW-2 — Prompts bury geometry between identity boilerplate and ban-lists
- ~250-word prompts spend the first 60% on identity/wardrobe (already locked by
  image 1) and the last 30% on forbidden artifacts; the 2–3 sentences of joint
  geometry sit in the middle where conditioning is weakest.
- Abstract depth language (“the far/background leg is the support leg”) names a
  3D fact with **no 2D-observable consequence** the model can draw. Result: H05,
  H06 collapse onto H01/H02 silhouettes.
- **Fix:** geometry-first prompts (pose sentences first, locks compressed to
  one line each), plus 2D-observable depth discriminators (“support shoe
  slightly smaller and lower-contrast, its shin passes *behind* the near shin
  at the crossing; a sliver of magenta separates the calves”).

### FLAW-3 — Review conflated pose-coverage with crop-readiness, then scored neither
- Statuses (`conditional`, `rejected`) mix “wrong phase” with “dirty
  background” with “unverifiable side”, so 18 attempts produced no sortable
  signal on *what to fix next*.
- PR #8 visibility used aggregate buckets (`arms: 2`) that hide which arm fails;
  PR #1’s per-part ledger is the right schema but its all-`3` rows are
  uncorroborated by the clearance metrics the harvester already computes.
- **Fix:** SC-AC two-track verdicts + per-`BodyPartId` visibility +
  `npm run score-pose-bank` recomputing SC-AC-02..07 from annotations + pixels.
  Review prose must agree with scorer output.

### FLAW-4 — Binary “no shadow” gate vs studio-contact physics ⇒ 0% yield
- All 10 contact-state generations (#73–75, #78–79, #83–85, #87, #89–90) show
  floor shadow/gradient despite identical bans. A gate the generator physically
  cannot pass is not a quality bar, it is a yield cap of zero.
- **Fix:** SC-AC-05 budgets a small contact patch and gates on the *sole-edge
  contrast* (the quantity keying actually needs); flight frames stay strict.
  Measure, don’t incant.

### FLAW-5 — No duplicate detection ⇒ model-prior collapse went unmeasured
- H05≈H01, H06≈H01/H02, X04#85≈X02 were caught by eye and described
  qualitatively (“near-identical generic contact pose”). Nothing prevented the
  next call from repeating it.
- **Fix:** SC-AC-03 + `poseAngularDistance()` — every new candidate is measured
  against all accepted annotations; `duplicate` is a rejection reason with a
  number attached. Annotations live in
  `src/images/photoreal-female-pose-bank/annotations/*.json`.

## What PR #1 got right (adopt, don’t redo)
- Per-part `0..3` visibility ledger (`phase-variant-specs.ts`) → adopted as the
  SC-AC-04 schema for the pose bank.
- `coreCoverageRatio` / `chromaBoundarySeparationRatio` clearance metrics
  (`phase-frame-harvester.ts`) → adopted as corroboration for visibility ≥2.
- Opportunistic harvest philosophy (secondary-use acceptance, IMG-ERR ledger) →
  adopted as SC-AC CROP-track `shape-only` tier.
- Bare-limb orthogonal inserts (phase-09/11) → best contour isolation in either
  PR; retained as **shape-layer** sources under a two-layer harvest strategy
  (shape layer from bare/orthogonal, apparel layer from clothed masters —
  never mixed silently).

## Iteration plan (this branch)
1. ✅ SC-AC v1.0 + this analysis (goal + baseline).
2. ✅ Scoring machinery landed + annotations for all candidates.
3. ✅/🔶 Regeneration campaign Calls #91–#100 (see below): spine 2/8 → 6/8;
   H02/H06 blocked on solver (F-06), not on prompting.
4. ✅ SC-AC-09 proof-01 (H01-100 farFoot cutout, gates pass, 1× clean).
5. ✅ Full-bank rescore after every call; all four “working” numbers moved
   except side-specific share (see scoreboard).

## Scorer reconciliation (qualitative table vs `score-pose-bank`)
The per-attempt table above was written from qualitative review before the
scorer existed. Where they differ, the scorer + annotations govern (SC-AC-10):
- H04 #77, H08 #81: table says `deviated` — scorer says **pass** (all joints
  within ±20°; key fails foot-region-only, upper parts harvestable).
- H03 #76/#82: table says `rejected` — scorer says **deviated** (3 outs,
  maxΔ 33°; recognizable phase, drifted joints).
- X02 #87: table says `deviated` — scorer says **pass (supersedes #84)**
  (same-pose costume-fixed resubmission per the supersede rule).
- X04 #85: table says duplicate-of-X02 — scorer says **rejected (duplicate of
  H04-77)** (Δ15° < 25°, same contact + quadrants; legs-only insert).
- H01 #73/#74: table hedges — scorer says **deviated** (nearElbow Δ30.6°).

## This-branch campaign: Calls #91–#100 (V2/V3 guides, PR1-lineage master)
Branch master is PR #1-lineage (`5fabff33…`), NOT PR #8's rebuilt master
(`143b4521…`): legs visibly separated, lighter wristbands. All pilots anchor
on the branch master. Verbatim prompts + hashes: `docs/POSE_HARVEST_LOG.md`.

| Call | Frame | Guide | Verdict | Decisive lesson |
|------|-------|-------|---------|-----------------|
| #91 | H03 | V2 | **pass** (glyph artifact) | Fill-frame capsules achieve the first compact toe-off |
| #92 | H06 | V2 | rejected (Δ107°) | 3rd fold-collapse; depth discriminators not drawn |
| #93 | H03 | V3 | rejected (phase mush) | Sampling noise (resolved by #96, not a V3 defect) |
| #94 | H06 | V3 | rejected (4 outs, maxΔ 52°) | First fold-under; support/phase-lag outs remain |
| #95 | H05 | V3 | **pass** | Strike-ahead + tucked-trail prompt works verbatim |
| #96 | H07 | V3 | **pass** | Toe-off transmits without glyphs (TOE-OFF-ANCHOR resolved) |
| #97 | H01 | V3 | rejected (contact inverted) | LEG-SWAP: arms perfect, legs swapped |
| #98 | H01 | V3 | deviated (2 outs) | Deictic fix works; BUTT-KICK overshoot on trail fold |
| #99 | H01 | V3 | deviated (1 out) | NEGATION-BACKFIRE: “not a butt-kick” unfolded the leg |
| #100 | H01 | V3 | **pass** | TRANSPLANT-WINS: #95 wording verbatim → compact fold |

### Scoreboard after #100 (scorer output)
- Spine POSE-pass (SC-AC-08): **6/8** (H01, H03, H04, H05, H07, H08; missing
  H02, H06 — the loading-crouch pair, solver-blocked per F-06).
- Parts ≥1 harvestable source (SC-AC-07): **17/17**; articulation ×2 bins:
  **9/12** (all Tier-C shape-only).
- Side-specific share: **0/130** — the largest remaining gap; needs
  occlusion-order inserts (none attempted yet).
- SC-AC-09 proofs: **1** (proof-01, H01-100 farFoot).

### F-06 — Solver stance knees exceed literature flexion (root cause)
Contact-phase solver knees read 138.8° (strike, H01/H05) and 120.6°
(loading, H02/H06) interior = 41°/59° flexion. Running literature puts
initial contact at ~10–20° and loading response at ~20–30° flexion
(interior ~150–165°). The image model systematically “corrects” toward the
biomechanical values (renders ~150–165°), which the scorer correctly flags
as deviation — so H02/H06 cannot converge under the current solver no
matter the prompt. Evidence: all contact frames deviated/rejected while
both flight frames passed; #94's support leg matches biomechanics, not the
solver. **Fix (out of session scope):** recalibrate stance-phase ankle
targets / pelvis trajectory in `src/runner/gait.ts` + `foot-roll.ts`, then
re-render guides, re-derive targets, rescore. Deliberately NOT worked
around with crouch-embracing prompts (would bake Groucho-running into the
spine) or tolerance-widening (goalpost-moving).

### Generation lessons (prompt/guide engineering)
- **GLYPH-COPY:** guide marks overlapping the figure are reproduced as scene
  objects (#91/#92 green discs + rings). V3 removes foot glyphs; legend and
  phase dots (in empty margins) are proven safe. Contact style must be
  encoded as *anatomy* (foot orientation), never as symbols.
- **TOE-OFF-ANCHOR (resolved):** #93's flat-foot regression looked like V3
  lost the toe-off — but #96's mirror held it. Verdict: sampling noise; V3
  + anatomical prompt transmits contact style.
- **ROLE-MATCH annotation rule:** rendered limbs are assigned to near/far by
  matching the guide's roles (folded→near, support→far, …), which is what
  the prompt asked the model to draw. Removes assignment gaming.
- **TRANSPLANT-WINS / NEGATION-BACKFIRE:** proven-winning phrasing transfers
  verbatim across mirror frames (#95→#100); negations (“not a butt-kick”)
  push the model away from the whole feature (#99).
- **COMPACT-ADJACENCY:** rectangular ankle-anchored harvest boxes cannot
  isolate compact-pose feet (H07-96 swing shoe vs support ankle). Box
  harvesting is valid only for isolated parts; compact feet need
  mask/shape-aware cutouts (SC-AC-09 proof-01 negative lesson).

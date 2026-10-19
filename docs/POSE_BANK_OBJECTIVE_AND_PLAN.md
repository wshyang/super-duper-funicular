# Pose Bank: Core Objective, Items, Criteria, Challenges, Plan

Process: five sections, each CLOSED before the next is OPENED.
Status: ALL FIVE SECTIONS CLOSED.

---

## Section 1 — Core objective (distilled from PR #1, PR #8, and this exercise)

### What the two branches each attempted

- **PR #1 (Sprite Motion Lab track)** built the harvesting *machinery*: 12
  phase frames, a per-part visibility ledger, clearance metrics
  (`coreCoverageRatio`, `chromaBoundarySeparationRatio`), jig-variant specs,
  and bare-limb inserts for clean contours. Strong on structure; weak on
  wardrobe continuity (bare limbs break the clothed-character lock) and on
  scored yield (all-`3` visibility rows, no diversity or key metrics).
- **PR #8 (photoreal pose-bank track)** built the photographic *material*:
  18 prompt-first logged generation calls — H01–H08 full gait cycle plus
  X01–X06 targeted inserts — of one locked character on studio magenta.
  Strong on prompt discipline and identity lock; yielded **0 harvestable
  cutouts**, with the phase spine stalled at 2/8 and all verdicts by eye.

### What our exercise added

- Made "working" explicit and measurable (SC-AC v1.0), replacing eye-judgment
  with a deterministic scorer (`npm run score-pose-bank`: annotations + pixels).
- Diagnosed root causes (tiny depth-blind guides, buried geometry, shadow
  physics vs binary gates, unmeasured duplicates, solver stance-bias) instead
  of re-rolling prompts against the same flaws.
- Iterated guides (V2/V3 capsules) and prompts through 10 scored calls
  (#91–#100): spine 2/8 → 6/8, plus the first end-to-end harvest proof.

### The distilled core objective

> **Build a photographic pose bank: a set of identity-, wardrobe-, and
> camera-locked side-profile runner images spanning the gait cycle and
> joint-angle extremes, from which cleanly-keyable body-part sprites can be
> harvested and filed as rig-ready pose variants — so the sprite rig can
> render photoreal pose variation that a single master reference cannot
> supply, without breaking seams, identity, or continuity.**

Unpacking (one line per clause):

- *Photographic pose bank* — the asset under construction is photos, not
  procedural drawings; photorealism comes from the generator, correctness
  comes from the locks and gates.
- *Identity / wardrobe / camera locked* — the same woman, same outfit, same
  90° orthographic side view in every frame; this triple lock is what makes
  parts harvested from different images interchangeable.
- *Spanning the gait cycle and joint-angle extremes* — the 8-phase spine
  (H01–H08) for timing plus targeted inserts (X-series) for tucked, raised,
  and opposed configurations the cycle frames never show.
- *Harvested and filed as rig-ready pose variants* — the output interface is
  a keyed cutout + pivot + provenance sidecar, filed in the bank manifest;
  an image the rig cannot consume is evidence, not product.
- *The "so that"* — one neutral master cannot supply bent knees, swung arms,
  or tucked feet; hand-drawing them breaks photorealism, and generating them
  without locks breaks interchangeability. The bank exists to close exactly
  that gap.

Non-objectives (explicitly out): building or changing the rig/renderer
itself; adding characters, wardrobes, or camera angles (that is scaling
*after* the locked pilot works); matching the solver where the solver
contradicts biomechanics (F-06 — the solver gets recalibrated, not obeyed).

*Section 1 state: CLOSED.*

---

## Section 2 — Items required to achieve the objective

Eleven items. Each is necessary: dropping any one re-opens a failure mode
already observed in PR #1, PR #8, or Calls #91–#100.

### Item 1 — Triple-lock specification + master references
A written lock (exact identity, every wardrobe item + color, 90°
orthographic side profile, framing, background) plus the master reference
images that embody it. **Contribution:** interchangeability. Parts harvested
from different images can only mix if every image shows the same woman in
the same outfit from the same camera; the lock is what makes the bank one
asset instead of N unrelated pictures.

### Item 2 — Biomechanically-true pose targets
Joint-angle + contact-state targets per phase from the gait solver,
recalibrated where the solver contradicts running biomechanics (F-06 stance
knees). **Contribution:** correctness of convergence. Every prompt, guide,
and annotation aims at these numbers; if the targets are wrong, the whole
bank converges on Groucho-running and the scorer enforces the error.

### Item 3 — Pose guides the image model actually follows
Fill-frame capsule-volume guides with near/far depth styling, phase
identity, and contact state encoded as anatomy — never as copyable symbols
(GLYPH-COPY). **Contribution:** conditioning signal. The guide is the only
dense geometric input the generator receives; V1 sticks were downweighted
and the model prior took over, while V2/V3 capsules demonstrably move joint
angles into tolerance.

### Item 4 — Prompt + provenance discipline
Geometry-first prompts (pose sentences first, locks compressed), logged
*before* generation with verbatim text, master hash, guide hash, and
candidate hash after. **Contribution:** reproducibility and lesson transfer.
Prompt-first logging is what lets a winning sentence transplant across
mirror frames (#95→#100) and what makes every failure a reusable data point
instead of a lost roll.

### Item 5 — Deterministic scoring machinery
By-eye joint annotations + pixel key metrics, recomputed end-to-end by
`npm run score-pose-bank` (POSE compliance, duplicates, key gate,
region-aware CROP, coverage roll-ups). **Contribution:** sortable signal.
It replaces "looks close" with verdicts + numbers, so each iteration is
provably progress or provably not, and review prose can never silently
contradict the bank state.

### Item 6 — Accepted image bank (spine + inserts)
The POSE-pass images themselves: the 8-phase spine for gait timing plus
X-series inserts covering tucked/raised/opposed angle bins the cycle never
shows. **Contribution:** raw material. Everything downstream (harvest,
manifest, rig) consumes these pixels; an empty spine slot is a pose family
the bank cannot supply, and a missing bin is a joint angle the rig cannot
render photorealistically.

### Item 7 — Harvest pipeline (cutout + telemetry + pivot)
Keying, shoe/part extent location, keyed cutout extraction, telemetry gates
(`magentaSpill = 0`, `detachedIslands = 0`), pivot estimates, and
provenance sidecars. **Contribution:** the image→sprite conversion. It is
the step that turns "a good picture" into "a rig-consumable part with a
known anchor and known cleanliness" — without it the bank is a gallery, not
a parts library.

### Item 8 — Chirality program (side-specific evidence)
Occlusion-order inserts and depth-evidence review that promote parts from
Tier-C shape-only to Tier-A/B side-specific (provably near vs far limb).
**Contribution:** rig correctness. A shape-only shin can dress either leg;
only side-specific parts let the rig assemble anatomically-correct
near/far layering. At 0/130 side-specific, this is the bank's largest known
gap and the main thing standing between "parts" and "correct assemblies."

### Item 9 — Bank manifest + filing rules
A registry of every accepted source (bins, tiers, hashes, proofs) plus
filing rules: tier separation, shape-vs-apparel layer discipline, and the
supersede rule for resubmissions. **Contribution:** the rig's contract. The
manifest is what downstream reads instead of a folder of PNGs; the rules
prevent silent mixing (bare-limb shape with clothed apparel, Tier-C filed
as side-specific) that would corrupt renders far from the cause.

### Item 10 — End-to-end rig integration proof
SC-AC-09 executed in full: cutout → temp-rig cycle render with telemetry
(`detachedIslands = 0`, `magentaSpill = 0`, `uncoveredJoints = 0`) → 1×/2×
seam check → flicker check for pose variants. **Contribution:** proof of
consumability. Harvest gates verify the part in isolation; only the rig
render proves the part survives assembly — pivot correct, seams continuous,
no flicker across frames. No pixel ships without it.

### Item 11 — Iteration + regression discipline
Rescore the full bank after every call, review prose must match scorer
output (fix the annotation, not the scorer), fixed verdict vocabulary, no
tolerance-widening or target-softening mid-campaign. **Contribution:**
truthfulness over time. The bank grows across dozens of calls; without this
discipline early passes silently rot (stale annotations, drifted criteria)
and the scoreboard detaches from reality. It is what keeps 6/8 meaning 6/8.

*Section 2 state: CLOSED.*

---

## Section 3 — Acceptance criteria + measurement per item

Each item gets falsifiable criteria plus the measurement that decides them.
Where SC-AC v1.0 already defines the rule, it is cited, not restated.

### Item 1 — Triple-lock specification + master references
- **Criteria:** a written lock covers identity (face, skin, hair, build),
  every wardrobe item + color, camera (right-facing 90° orthographic side
  profile, full hair-to-sole in 1408×768), and background (flat matte
  magenta, no floor/shadow); master reference image(s) embodying the lock
  are hash-pinned in `profile.json`.
- **Measurement:** per-candidate SC-AC-01 checklist (identity/wardrobe/
  profile/facing); `costumeClean` boolean in annotations gates CROP
  (costume drift = automatic rejection, X02-84 precedent); log audit that
  every call cites the pinned master hash.

### Item 2 — Biomechanically-true pose targets
- **Criteria:** all 8 phase targets fall inside literature running ROM
  (contact ~10–20° flexion, loading ~20–30°, stance peak ~40–45°,
  recovery folds per phase); the solver reproduces them deterministically;
  F-06 recalibration lands with cited sources and a versioned criterion bump.
- **Measurement:** `scripts/print-targets.ts` output tabulated against the
  literature table in the flaw doc; unit tests pinning every target value;
  rescore shows deviations no longer systematic by phase family (contact
  frames convergable like flight frames).

### Item 3 — Pose guides the image model actually follows
- **Criteria:** figure ≥70% canvas height; capsule volumes; near limbs wide
  and on top, far limbs narrow and haloed; phase dots + legend confined to
  empty margins; zero symbols overlapping the figure (GLYPH-COPY rule);
  every guide hash-pinned in its manifest.
- **Measurement:** renderer unit tests (required colors present; V3 asserts
  zero contact-green pixels); measured figure-height fraction per guide;
  campaign pass rate per guide version; output audit for copied glyphs.

### Item 4 — Prompt + provenance discipline
- **Criteria:** every call logged *before* generation with verbatim prompt,
  master hash, and guide hash; candidate hash, verdict, and annotation
  logged after; geometry-first structure (pose sentences first, locks one
  line each, positive phrasing only); no imageless log entries, no logless
  images.
- **Measurement:** 1:1 audit of candidates vs log entries; prompt→image
  correspondence spot-checks; transplant record (winning sentences reused
  across frames with outcome noted, #95→#100 precedent).

### Item 5 — Deterministic scoring machinery
- **Criteria:** `npm run score-pose-bank` recomputes every verdict from
  annotations + pixels — zero hand-entered verdicts; compliance/dup/key/
  CROP rules covered by unit tests; review prose matches scorer output
  (SC-AC-10: fix the annotation, not the scorer); fixed verdict vocabulary.
- **Measurement:** test suite green (`pose-diversity`, `pose-key-metrics`,
  renderer tests); independent re-annotation of a sample agrees with
  verdicts; prose-vs-scorer audit on every campaign write-up.

### Item 6 — Accepted image bank (spine + inserts)
- **Criteria:** 8/8 spine POSE-pass with no duplicates; 17/17 parts with ≥1
  harvestable source; 12/12 articulation parts × 2 angle bins; every
  accepted candidate key-dispositioned (feet under full gate, upper parts
  under bg-uniformity rule).
- **Measurement:** the scorer's four roll-up lines (spine, coverage,
  side-specific share, proofs); duplicate reasons carry joint-Δ numbers;
  per-part bin counts printed in the coverage table.

### Item 7 — Harvest pipeline (cutout + telemetry + pivot)
- **Criteria:** every harvested part ships a keyed cutout + pivot estimate +
  sidecar (source hash, box, telemetry, cleanup notes, reviewer seam check);
  telemetry gates `magentaSpill = 0`, `detachedIslands = 0`; box harvester
  restricted to isolated parts (COMPACT-ADJACENCY rule); compact parts take
  the mask-aware path only.
- **Measurement:** `proofs.json` registry (each proof `gatesPass` + reviewer
  `visualSeamCheck` pass); script re-run reproduces byte-identical cutouts
  (determinism); archived 1×/2× seam-check inspection notes.

### Item 8 — Chirality program (side-specific evidence)
- **Criteria:** ≥50% of harvestable sources side-specific (Tier A/B), each
  with recorded evidence (occlusion order at a crossing, size/contrast
  gradient, attachment continuity) — evidence, never assertion; Tier-C parts
  explicitly labeled shape-only and never filed as side-specific.
- **Measurement:** scorer side-specific share line; per-part tier ledger;
  evidence audit on a sample (quoted evidence traceable to visible pixels).

### Item 9 — Bank manifest + filing rules
- **Criteria:** the manifest lists every accepted source (bins, tiers,
  hashes, linked proofs); filing rules written and schema-enforced (tier
  separation, shape-vs-apparel layer discipline, supersede rule for
  resubmissions); downstream reads the manifest, never a raw PNG folder.
- **Measurement:** manifest completeness audit (accepted candidates ⊆
  manifest; proofs linked); automated rule-violation scan (tier/field
  mismatches = failures); downstream-import test against manifest only.

### Item 10 — End-to-end rig integration proof
- **Criteria:** SC-AC-09 in full before any production filing: temp-rig
  cycle render with `detachedIslands = 0`, `magentaSpill = 0`,
  `uncoveredJoints = 0`; 1×/2× seam check pass; flicker check pass for
  pose variants. No exceptions.
- **Measurement:** proof records bundling render telemetry JSON +
  reviewer seam sign-off + flicker metric (max frame-to-frame seam
  displacement within tolerance) for variants.

### Item 11 — Iteration + regression discipline
- **Criteria:** full-bank rescore after every call; no mid-campaign
  tolerance/target changes except via versioned criterion bump + full
  rescore + changelog entry; review prose matches scorer; scoreboard
  regressions explained in the log (e.g. recalibration flips).
- **Measurement:** log shows a scorer run per call; history audit shows no
  unversioned threshold edits; periodic re-annotation agreement sample;
  monotonic scoreboard accounting across the campaign.

*Section 3 state: CLOSED.*
## Section 4 — Challenges per item

Grounded in observed failures (PR #1, PR #8, Calls #91–#100), not hypotheticals.

### Item 1 — Triple-lock specification + master references
- Generator drift per call: wristband color (X02-84 black bands), hand
  anatomy (X05 open palm vs running fist), subtle face/skin shifts.
- Master lineage split: PR #1 and PR #8 masters diverged (`5fabff33…` vs
  `143b4521…`) — no canonical master has been declared, so "identity" is
  currently branch-relative.
- "Same outfit / same woman" is judged by eye; no automated identity metric
  exists in the pipeline.

### Item 2 — Biomechanically-true pose targets
- The solver is shared, tested pipeline code: recalibrating stance knees
  risks moving the flight targets that currently pass (H04/H08) and breaking
  golden tests.
- Knee angles are emergent from two-bone IK (pelvis trajectory + ankle
  targets), so a phase-selective fix is surgery, not a constant tweak.
- Literature gives ranges, not exact targets; converting ranges to the 8
  exact phase values requires judgment calls that must then be frozen.
- Rescoring flips banked verdicts (H01-73/74 match the crouched strike and
  would correctly deviate) — honest but scoreboard-negative in the short term.

### Item 3 — Pose guides the image model actually follows
- The model downweights abstract marks (V1 sticks ignored, prior took over
  in H03/H06 collapses) yet reproduces figure-overlapping marks as content
  (GLYPH-COPY) — the safe design band between "ignored" and "copied" is narrow.
- Contact *existence* transmits via foot placement, but contact *style*
  (toe-off vs flat) is fragile without glyph anchors (#93 vs #96).
- Diminishing returns: V1→V2 was a step change, V2→V3 lateral for geometry;
  the next guide version needs a new encoding idea (anatomical feet), not
  more ink.
- Where guide and prior conflict (120° crouch), the model overrides the
  guide — guides cannot fix solver-level errors.

### Item 4 — Prompt + provenance discipline
- ~250-word prompts bury geometry between identity boilerplate and
  ban-lists; abstract depth language ("far leg supports") has no
  2D-observable consequence the model can draw.
- Near/far color language confuses leg assignment (LEG-SWAP #97); negations
  backfire (NEGATION-BACKFIRE #99); sampling noise means n=1 per call (#93
  vs #96 identical setup, opposite outcomes).
- Winning wording is frame-specific; transplants work across mirrors
  (#95→#100) but each new frame family needs its own proven sentences.

### Item 5 — Deterministic scoring machinery
- By-eye annotation error is ±10–15° on occluded/overlapping joints —
  most of the ±20° tolerance budget — and occlusion is worst exactly where
  precision matters (compact folds, crossings).
- Thresholds (±20°, 25° duplicate, dip budgets) are judgment calls; they
  hold only if versioned and never tuned mid-campaign to rescue a slot.
- Key metrics need per-frame-type calibration and region-aware application;
  a single global gate either blocks clean upper parts or passes dirty feet.
- The scorer is now load-bearing infrastructure: every rule change needs
  tests, and the test suite must be maintained as the bank grows.

### Item 6 — Accepted image bank (spine + inserts)
- Contact frames fight strong model priors: straight-strike knees,
  flat-foot contact, forward-swing defaults (H01 took 4 attempts, 3 distinct
  miss modes: swap, butt-kick, loose trail).
- Some targets are narrow conjunctions (H01 trail fold: thigh vertical AND
  knee tight simultaneously) with sampling noise on every attempt.
- H02/H06 are solver-blocked, not prompt-blocked — unreachable until Item 2
  lands; further calls there burn budget for documented failures.
- Each attempt costs a full cycle (prompt → generate → inspect → annotate →
  rescore → log); throughput is bounded by reviewer bandwidth.

### Item 7 — Harvest pipeline (cutout + telemetry + pivot)
- COMPACT-ADJACENCY: rectangular boxes cannot isolate compact-pose feet
  (H07-96 swing shoe vs support ankle — flood crossed legs, FAIL); the
  current harvester only serves isolated parts.
- Frame-specific finders (white-fragment seed + color flood) don't
  generalize; there is no per-part locator specification yet.
- Keyer fringe on hair/fine edges, micro-specks needing island cleanup,
  and pivot estimates are by-eye with unrecorded uncertainty.
- Sock-vs-shin and sleeve-vs-arm boundaries are judgment calls that affect
  rig overlap quality downstream.

### Item 8 — Chirality program (side-specific evidence)
- Strict side profile is inherently depth-poor: near/far limbs overlap with
  minimal perspective gradient, so Tier-A evidence is rare in natural poses.
- The generator does not reliably draw deliberate depth cues (size/contrast
  gradients, occlusion crossings) — #92/#94 ignored all three discriminators.
- No occlusion insert has ever been attempted, so the technique is unproven
  and the prompt vocabulary for crossings doesn't exist yet.
- Depth-evidence review is the most subjective judgment in the pipeline;
  "occlusion visible" needs a checklist, not an impression.

### Item 9 — Bank manifest + filing rules
- A hand-maintained registry drifts from reality (observed: the harvest
  script overwrote reviewer sign-off fields on re-run — the schema doesn't
  separate machine-written from reviewer-written fields).
- Layer discipline (shape vs apparel) is currently prose, not enforcement;
  the temptation to file clean bare-limb contours as clothed parts persists.
- The supersede-vs-duplicate boundary needs consistent judgment as
  resubmissions accumulate.
- No downstream consumer exists yet to validate the manifest contract, so
  schema mistakes surface late.

### Item 10 — End-to-end rig integration proof
- Proof-01 covered only an isolated-part cutout; the temp-rig cycle render
  path is unbuilt — tooling must be inventoried (`dump-cycle-frames`,
  `photo:audit`) or built.
- Rig-stage telemetry is undefined: `uncoveredJoints` has no measurement
  procedure yet, and rig-render `magentaSpill` thresholds may differ from
  cutout-stage ones.
- Seam checks are manual reviewer work at 1×/2×; flicker checks need
  multi-frame renders that don't exist yet.
- Bandwidth: each proof is a mini-project (render + measure + inspect +
  record), competing with generation calls for reviewer time.

### Item 11 — Iteration + regression discipline
- Sustained across dozens of calls, discipline fatigues: skipped rescores,
  prose drifting from scorer output, "just this once" tolerance talk when a
  slot stalls (H02/H06 are the live temptation).
- No criterion-versioning process exists (what bumps SC-AC v1.0 → v1.1, who
  approves, what gets rescored) — the F-06 recalibration will be its first test.
- Prose-vs-scorer audits and re-annotation samples are manual and
  unscheduled; without a cadence they won't happen.
- Scoreboard monotonicity needs active accounting: legitimate regressions
  (recalibration flips) must be distinguishable from rot.

*Section 4 state: CLOSED.*
## Section 5 — How each challenge is addressed

Sequenced: earlier subsections unblock later ones. Honest scope notes where
work is deferred rather than solved.

### Item 1 — Triple-lock specification + master references
- Declare the canonical master explicitly (recommend the PR #1-lineage
  `5fabff33…` this campaign banked on) and pin it by hash in `profile.json`;
  record the PR #8 lineage split as a decided ADRs-style note so no future
  call anchors on the wrong master.
- Replace the single `costumeClean` flag with a per-item wardrobe checklist
  in the annotation schema (stripe, shorts, bands×2, socks, shoes, hair);
  the scorer already gates CROP on it — finer flags localize drift.
- Add a face-identity spot-check to the per-call routine: side-by-side vs
  master before annotation; drifted faces reject before scoring time is spent.
- Defer automated identity metrics (face-embedding distance) until the bank
  exceeds ~50 candidates — by-eye review scales that far.

### Item 2 — Biomechanically-true pose targets
- Time-boxed spike first: literature ROM table → proposed ankle-target /
  pelvis-trajectory adjustments → golden-test impact report. No code changes
  until the impact on flight goldens is quantified.
- Land the recalibration behind a gait-config flag (e.g. `stanceRealism`),
  keeping default goldens green; bank targets switch to the flagged solver
  in one versioned step (SC-AC v1.1): re-render guides, re-derive targets,
  full rescore, changelog entry.
- Accept retroactive flips openly: H01-73/74 will correctly deviate under
  true targets; the log records this as recalibration accounting, not
  regression (Item 11's monotonicity rule covers it).
- Freeze the 8 new targets with unit tests the same commit they land.

### Item 3 — Pose guides the image model actually follows
- V4 change is exactly one idea: anatomically-drawn feet (toe-off forefoot
  rotation vs flat sole, from solver foot points, rendered legibly) — the
  smallest encoding that closes the contact-style gap without symbols.
- Freeze V3 for the 6 filled slots (no churn on passing frames); V4 must
  beat V3's pass rate on retry frames in an A/B before adoption.
- Codify the GLYPH-COPY rule in the renderer docs: no ink may overlap the
  figure unless it IS anatomy; legend/dots stay in empty margins.
- Accept the limit: guides condition the prior, they don't override physics
  errors — solver-contradicting targets get fixed in the solver (Item 2),
  never fought in the guide.

### Item 4 — Prompt + provenance discipline
- Promote the #95/#100 contact-frame template (deictic legs + one-shoe-down
  + compact-fold sentences) to the starting prompt for all contact retries;
  H07's #96 template likewise for toe-off frames. New frames start from
  winners, not from blank pages.
- Positive-only phrasing rule (no negations — NEGATION-BACKFIRE); after two
  same-mode misses on a slot, stop re-rolling and change exactly one
  variable (deictic switch, transplant, or guide bump).
- Keep prompt-first logging absolute: the existing 1:1 candidates↔entries
  audit becomes a pre-commit checklist item (Item 11).

### Item 5 — Deterministic scoring machinery
- Dual-annotation protocol for borderline joints: two independent reads,
  >10° disagreement flags the joint for a third read; ROLE-MATCH assignment
  + occlusion notes mandatory in every annotation.
- Threshold changes only via criterion version bump (Item 11) — the ±20° /
  25° / dip budgets stay frozen for the whole v1.x campaign regardless of
  which slots stall.
- Extend the key-metrics and diversity test suites with every new rule
  (established pattern: GLYPH-COPY got a zero-green test the same commit);
  keep the greenfield LOC/file gates green (mains already split).

### Item 6 — Accepted image bank (spine + inserts)
- Fill order: H02/H06 attempts resume ONLY after the Item-2 recalibration
  (explicitly blocked until then — no budget burned on documented failures).
- Next generation budget goes to Item-8 occlusion inserts, which add
  coverage AND side-specific tiers simultaneously (highest marginal value).
- Per-slot stop rules: 3 calls with 3 distinct miss modes ⇒ diagnose
  (guide/prompt/target), don't roll a 4th blindly; narrow conjunctions get
  transplant-first retries (proven wording before novel wording).
- All retries reuse V3 guides (proven) until V4 passes its A/B (Item 3).

### Item 7 — Harvest pipeline (cutout + telemetry + pivot)
- Two-path strategy, no conflation: the box harvester (proven on isolated
  parts) keeps serving isolated parts; compact feet get a separate
  mask-aware cutout spike (flood/segment constrained by a rig-projected
  limb mask), adopted only after it matches proof-01's gate record.
- Write per-part locator specs (region + color + connectivity rules,
  documented per part like the tucked-shoe finder) instead of growing one
  frame-specific script — each spec carries its own determinism check
  (re-run ⇒ identical hash).
- Record pivot uncertainty alongside the estimate (e.g. "ankle ±8px,
  refine at rig time") so downstream knows what is measured vs guessed.
- Fix the sign-off overwrite properly: reviewer fields move to a separate
  sign-off file the harvest script never writes (see Item 9).

### Item 8 — Chirality program (side-specific evidence)
- Design the first occlusion-insert series (X09+): poses engineered for
  visible crossing order — mid-swing forearm crossing the torso edge, trail
  shin crossing the support shin — with prompts demanding the crossing +
  size/contrast gradient explicitly.
- Tier-A review checklist with evidence quotes ("far shin passes behind
  near shin at (x,y); support shoe smaller + lower-contrast"): no quote, no
  Tier A.
- Promote in rig-value order: the 6 spine supports' shins/feet first (parts
  the rig needs layered correctly every cycle), then arms, then midline.
- Success bar for the pilot series: ≥4 side-specific sources from ≤6 calls,
  else the crossing-prompt vocabulary needs a rethink before scaling.

### Item 9 — Bank manifest + filing rules
- Split the registry: machine-written telemetry/manifest (harvest script
  owned) vs reviewer-written sign-offs (reviewer owned, script never
  touches) — closes the proof-01 overwrite bug by construction.
- Encode filing rules in the manifest schema (required tier/evidence/layer
  fields; Tier-C cannot validate as side-specific; layer field mandatory) so
  discipline is enforced by validation, not by prose memory.
- Add a manifest audit to the scorer run (accepted ⊆ manifest, proofs
  linked, no tier/field violations) — one command verifies bank integrity.
- Draft the downstream-import contract now (manifest → rig part query by
  part+bin+tier) even before the rig exists, so schema mistakes surface in
  review instead of at integration.

### Item 10 — End-to-end rig integration proof
- Inventory before building: assess `dump-cycle-frames` / `photo:audit`
  for the shortest path to a temp-rig cycle render; adapt, don't build,
  unless the gap analysis says otherwise.
- Define `uncoveredJoints` measurement on the render (joint landmark vs
  part-mask coverage per frame) and set rig-stage spill thresholds before
  the first assembly proof — gates before pixels.
- Proof-02 (first assembly) protocol: render + telemetry JSON + archived
  1×/2× seam crops + flicker metric, bundled exactly like proof-01's
  sidecar; no part files as production until its proof-02 exists.
- Schedule proofs as their own work items with reviewer bandwidth reserved
  — proofs compete with generation calls, so they get explicit slots, not
  leftover time.

### Item 11 — Iteration + regression discipline
- Criterion versioning rule, written down: SC-AC vX.Y; any threshold/target
  change bumps minor, triggers full rescore + changelog + scoreboard
  re-baseline in the same commit. F-06 recalibration is the first exercise
  of this rule.
- Pre-commit checklist (documented, run by the agent every commit):
  scorer re-run? prose matches scorer? hashes logged? manifest audit green?
  Turns discipline into a procedure instead of a virtue.
- Cadence: re-annotation agreement sample every 10 calls; scoreboard review
  with monotonic accounting each campaign batch — regressions labeled
  "recalibration" (legitimate) vs "rot" (must-fix).
- Keep the gated-section habit (this document) for future structural claims:
  objective → items → criteria → challenges → plan, each closed before the
  next opens.

*Section 5 state: CLOSED. All five sections CLOSED.*

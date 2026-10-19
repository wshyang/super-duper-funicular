# Objective Roadmap — Distilled from PR #1, PR #8 and the Current Iteration

Derived from: PR #1 (`arena/917ef347`, Sprite Motion Lab: flaw diagnosis of the original
sheet, 17-part engine, extraction pipeline), PR #8 (`arena/e1300d3c`, Athletic rebuild,
five-persona gait audit, pose-bank pilot Calls #73–#90), and this branch's convergence
work (acceptance criteria, automated audit, delta-edit regeneration Calls #91–#95).

---

## Section 1 — The Core Objective

**Produce a complete, verifiably correct runner sprite set — photorealistic,
identity-consistent personas animated through a biomechanically correct alternating
8-phase gait cycle — by generating pose-varied studio plates, harvesting articulated
part assets from them, and driving the 17-part rig, with every step gated by
measurable, logged audits.**

The whole programme exists because the original source material
(`runner-8frame-6color-flawed-sheet.jpeg`) was proven unusable: FLAW-01 half-cycle
duplication (94.7 % mean IoU), FLAW-02 unilateral "peg-leg" gait, FLAW-03 zero leg
crossover, FLAW-04 baseline/pivot jitter, FLAW-05 chroma spill. Everything since —
the articulated engine (PR #1), persona asset rebuilds and gait audits (PR #8), and
the pose bank — is a supply chain whose end product is *usable sprite material that
provably does not reproduce those five flaws*. The immediate campaign within that
objective is: **turn one accepted identity master into a full bank of extraction-ready,
phase-correct pose plates** ("more usable material for sprite capture").

---

## Section 2 — Items Required, and How Each Contributes

- **Item A — Locked identity master per persona (H00).**
  One immutable, accepted full-body lateral-profile plate per character, with hashed
  provenance and a profile JSON (identity lock + wardrobe lock).
  *Contribution:* every generated pose conditions on this single anchor, which is what
  keeps face, build, wardrobe and camera consistent across all harvested material —
  without it, parts cut from different frames would not belong to the same character.

- **Item B — Rig-derived pose targets (solved guides for H01–H08, plus insert guides).**
  Machine-rendered solved-joint diagrams from `solveArticulatedPose(φ)` for the eight
  canonical phases, and custom guides for targeted inserts (X-series).
  *Contribution:* defines *what each frame must show* (support side, contact state,
  joint angles, near/far order) from the same math that will animate the rig — so
  harvested poses are, by construction, poses the engine will actually ask for.

- **Item C — Measurable acceptance gates + automated audit tooling.**
  `docs/POSE_BANK_ACCEPTANCE.md` (gates G1–G6) and `scripts/audit_pose_bank.py`
  (key recoverability, phase foot/ground landmarks, framing, silhouette-IoU diversity,
  flat-key normalization). **Status: delivered this iteration.**
  *Contribution:* converts "usable" from a vibe into a finish line. This is what let a
  pilot stuck at 0/8 accepted frames converge to 8/8; it also makes regressions
  detectable instead of debatable.

- **Item D — A convergent candidate-generation process (the delta-edit loop).**
  Base = nearest already-reviewed photo candidate; request 2–3 named joint
  corrections; audit; repaint-only follow-up for spill defects; derive counterpart
  phases from accepted plates. **Status: proven this iteration (Calls #91–#95).**
  *Contribution:* this is the engine of supply. From-scratch diagram re-poses failed
  4/4 times on compact phases; the delta loop went 3/3. Without a convergent process,
  Items E–G never fill.

- **Item E — The complete accepted pose bank (H01–H08 + X-series visibility inserts).**
  Eight phase-correct full-body plates (**status: all `accepted-for-pose`**) plus
  targeted inserts that expose otherwise-hidden parts at diverse angles (far forearm
  forward/up and back/down, opposed-arm, tucked-flight — X01–X06, currently
  pose-evidence only).
  *Contribution:* this *is* the "usable material for sprite capture" — the raw frames
  from which every limb segment, at multiple angles, can be cropped.

- **Item F — Extraction-ready key-normalized plates.**
  Flat-key copies of accepted frames (`normalized/`, residual shadow ≤ 53 px halo,
  islands ≤ 150 px). **Status: delivered for all 8 canonical frames.**
  *Contribution:* part cutting is a chroma-key operation; shadows, gradients and spill
  on the source plate become haloes and holes on every downstream sprite (FLAW-05
  class). Normalization makes the key deterministic before any crop exists.

- **Item G — Part harvest & crop approval stage.**
  Per-part visibility scoring (0–3), pivot placement, cleanup notes, and
  `canonicalJigSources` entries selecting which accepted frame supplies each of the
  17 parts; includes near/far limb identity verification. **Status: open — gated,
  deliberately not yet executed.**
  *Contribution:* converts whole-body plates into the actual rig inventory
  (`parts/*.png`). This is the step the pose bank exists to feed; crop approval is
  where "pose-accepted" becomes "production asset".

- **Item H — Rig integration & animation-level regression validation.**
  Skin the 17-part engine with harvested parts; run the five-persona dump-cycle audit
  (16 frames, contact sheets, joint crops, standing plates) and an explicit
  FLAW-01..05 regression check on the assembled cycle. **Status: tooling exists
  (PR #1/#8); re-run pending new parts.**
  *Contribution:* the objective is judged at animation level, not frame level — only
  here do we prove alternating gait, leg crossover, stable baseline and flicker-free
  phase switching with the *new* material.

- **Item I — Provenance & audit discipline.**
  Verbatim prompt logging (FDS `#image-prompt-log` / `POSE_HARVEST_LOG`), SHA-256
  hashes for every reference/base/output, machine-readable manifests
  (`pose-bank.json`, audit JSON), immutable rejected evidence. **Status: maintained
  continuously.**
  *Contribution:* makes every asset reproducible and every decision reviewable; it is
  why this iteration could calibrate its audit against 18 previously-reviewed
  candidates instead of starting blind.

---

## Section 3 — Acceptance Criteria per Item, and How Each Is Measured

- **Item A (identity master):** Exactly one accepted H00 per persona; SHA-256 recorded
  and unchanged across the campaign; profile JSON contains explicit identity and
  wardrobe locks. *Measured by:* hash comparison in `pose-bank.json` /
  `POSE_HARVEST_LOG.md` against the file on disk; manifest review showing H00 status
  `accepted` and never regenerated.

- **Item B (pose targets):** One guide per canonical phase rendered from the same rig
  math as the runtime animation (`render-pose-guides`), at reference resolution
  (1408 × 768), with color-coded near/far limbs and ground line; insert guides carry
  explicit target joint angles. *Measured by:* guide manifest completeness (8/8 +
  named inserts), reproducibility (re-render yields identical joints for the same
  rig/gait JSON), and each guide's SHA-256 being cited by at least one generation call.

- **Item C (gates + audit):** The audit reproduces the human verdicts of the calibration
  set (Calls #73–#90) with zero disagreement on pass/fail frames; every gate threshold
  is documented; one command audits any set of plates. *Measured by:* calibration run
  (achieved: H01/H02/H04/H05/H08 PASS, H03/#76-#82, H06/#79, H07/#80 FAIL for the same
  reasons humans gave); CI-style re-run on the accepted bank returning 8/8 PASS.

- **Item D (convergent process):** A `needs-regeneration` phase reaches all-gates PASS
  in ≤ 3 generation calls, without breaking identity/wardrobe gates. *Measured by:*
  calls-to-acceptance per frame in the harvest log (achieved: H03 in 2, H06 in 2,
  H07 in 1; historical from-scratch baseline: 0-for-4).

- **Item E (pose bank):** All eight canonical frames at status `accepted-for-pose` or
  better: automated gates G2/G3/G4/G6 PASS, visual gates G1/G5 reviewed on pixels and
  logged; within-half-cycle IoU ≤ 0.84; no cross-bank pair ≥ 0.90. Inserts: each
  targeted part visibly isolated with background gap. *Measured by:*
  `docs/pose-bank-audit.json` (current: 8/8 PASS; max within-half-cycle IoU 0.69;
  max cross-bank 0.893) plus logged visual verdicts per frame.

- **Item F (normalized plates):** For every accepted frame: background is one flat key
  color; residual shade 0 px (≤ 1-px antialias halo tolerated, currently ≤ 53 px);
  no non-key island > 150 px; subject pixels untouched (no eaten fabric/hair).
  *Measured by:* re-running the auditor on `normalized/` (shade_px, island_blob_max
  columns) and visual diff of subject regions against the source candidate.

- **Item G (part harvest):** Each of the 17 rig parts has a `canonicalJigSource` from a
  frame with status `accepted`; per-part visibility score ≥ 2 (full segment, readable
  pivots), with ≥ 3 preferred for primary sources; pivots within the part crop; near/far
  side identity recorded with its verification method; zero spill pixels inside part
  alpha. *Measured by:* manifest completeness check (17/17), per-crop audit (island/
  spill counters on the cutout), and `selectManifestHarvestFrame` returning a source
  for every part without falling back.

- **Item H (rig integration):** Five-persona, 16-frame dump-cycle reports
  `detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0`; FLAW regression:
  opposite half-cycle frames IoU well below the 0.947 duplication signature, left/right
  support alternates (FLAW-02), swing foot crosses the support leg during pass phases
  (FLAW-03), baseline variance within the ±6 px calibration bound noted in PR #8
  (FLAW-04). *Measured by:* existing `npm run dump-cycle -- … all-personas` telemetry
  plus the pairwise-IoU section of the auditor applied to rendered cycle frames.

- **Item I (provenance):** 100 % of generation calls carry verbatim prompt, base/guide/
  output hashes, and an accept/reject verdict; regenerations carry justifications;
  manifest statuses match the logs. *Measured by:* cross-checking call numbering
  continuity (#01–#95 with no gaps), hash spot-checks against disk, and FDS version/
  ADDENDA entries per turn (currently v4.18.0 / ADD-047).

---

## Section 4 — Challenges per Item

- **Item A:** A single master under-specifies the character (one arm pose, one leg
  visible side); identity is only defined laterally; any accidental regeneration or
  edit of H00 silently re-anchors the whole bank; medial (far-side) surfaces are never
  seen in the master at all.

- **Item B:** Guides are proposals, not constraints — the generator demonstrably
  ignores them when the target pose is far from its prior (Calls #76, #79, #80, #82);
  guide proportions come from the rig, which may disagree with the photo persona's
  real proportions; small raster guides (220 × 256) carried even less signal.

- **Item C:** Threshold brittleness (scale drift moved "grounded" feet 18 px off
  baseline; sock+shoe merge broke height-based tilt detection); silhouette metrics
  cannot see inside the outline (knee height of a dangling shin, torso turn, near/far
  depth); over-fitting the auditor to past verdicts risks passing new failure modes it
  has never seen (e.g. G4 passed #82, which humans rejected on G5).

- **Item D:** Every edit is a fresh diffusion sample — it can introduce new defects
  while fixing named ones (both #91 and #93 ghosted the newly airborne shoe; #91 lost
  ground contact); copy-of-copy chains risk identity drift; wardrobe details flip
  under edits (the X02 wristband went black); the model's pose prior keeps pulling
  toward generic strides at every step.

- **Item E:** Counterpart phases (φ vs φ+0.5) are near-mirrors in strict profile, so
  diversity vs duplication is a knife-edge (H03~H07 IoU 0.893 against a 0.90 cap);
  near/far support chirality is pixel-unverifiable in lateral view; insert poses that
  expose hidden parts (far forearm, tucked legs) are exactly the poses the generator
  resists; X-series inserts still fail background-gap/key gates.

- **Item F:** Chroma classification is genuinely ambiguous at boundaries: spilled white
  fabric vs light magenta background share hue; naive repaint ate crimson singlet
  sheen (observed); flood fill leaks through 1–2 px antialias channels (observed);
  over-tight masks leave shadow rims, over-loose masks erode hair wisps and sole edges.

- **Item G:** Occlusion — many of the 17 parts never appear fully isolated in any
  full-body frame (far thigh behind near thigh, torso behind arms); near/far side
  attribution of a cropped limb cannot be proven from pixels (standing limitation
  recorded across PR #8); pivot placement on soft photographic joints is subjective;
  per-part lighting differs between source frames, risking seams when mixed on one rig.

- **Item H:** Part-based reassembly can recreate the original flaws in new form —
  phase-switch flicker when adjacent frames source different plates, joint gaps at
  extreme angles (`uncoveredJointFrames`), baseline penetration (the known Athletic
  +6 px issue); photographic parts warped by the rig can look rubbery at rotation
  extremes; five personas multiply every check.

- **Item I:** Discipline is the first casualty of iteration speed — logging every
  verbatim prompt/hash is laborious; logs, manifest and disk can drift apart; the
  call-numbering sequence spans documents (FDS §9 + harvest log), making continuity
  easy to break; large binary evidence accumulates in git.

---

## Section 5 — How Each Challenge Will Be Addressed

- **Item A:** Keep H00 immutable and hash-pinned (already enforced via manifest +
  logs); never use generated frames as identity references more than one edit deep —
  re-anchor visual identity review against H00 at every acceptance; cover the master's
  blind spots not by touching H00 but via targeted inserts (Item E) and, where PR #1
  did so, dedicated medial-view plates (e.g. the 90° L-bend far-arm technique).

- **Item B:** Treat guides as *references inside a delta prompt*, not as the base
  (proven fix); keep guides full-resolution with color-coded near/far limbs and
  explicit angle callouts for inserts; when a persona's proportions diverge, override
  rig/gait JSON per character (`--rig-json`/`--gait-json`) so targets match the body
  being generated; when a guide is repeatedly ignored, change the guide geometry
  rather than adding prompt adjectives (logged learning from #85/#86/#88).

- **Item C:** Keep thresholds per-image-relative where drift exists (ground band
  relative to silhouette bottom; contact-width instead of cluster height — both already
  implemented); keep G1/G5 explicitly human/visual so the auditor is a necessary-not-
  sufficient gate and silhouette-blind failures still get caught; re-calibrate against
  every new human verdict (the auditor is versioned in-repo so its evolution is
  reviewable); add new named checks only when a new failure mode is observed twice.

- **Item D:** Constrain each call to few, named, local corrections ("do not move any
  limb" on repaint calls — worked 2/2); always re-audit the full gate set after every
  edit so fix-one-break-another is caught immediately (caught #91's float and ghost
  shoe); cap edit-chain depth and verify identity/wardrobe against H00 (not the base)
  at acceptance; enumerate flip-prone wardrobe details (both sky-blue wristbands)
  verbatim in every prompt; expect and budget a repaint follow-up for newly airborne
  footwear (known defect signature).

- **Item E:** Encode half-cycle identity in *visible* cues — swapped arm counter-swing
  and near-leg occlusion order — by deriving counterparts from accepted plates (proven
  with #95), and monitor the IoU margin against the 0.90 cap per pair; where chirality
  stays unprovable, record it as a scoped caveat and resolve it at part level (Item G)
  via cross-frame consistency rather than pretending a pixel proof exists; for
  resistant insert poses, build custom solved-joint guides encoding the exact angles
  (the #88 lesson) and run them through the same delta loop and gates as canonical
  frames before any crop use.

- **Item F:** Keep the implemented leak-guarded normalizer (border-connected flood,
  2 px erode/re-dilate) and verify *both* directions after every run: residual
  background contamination (auditor columns) *and* subject integrity (visual diff —
  this is how the eaten-singlet bug was caught); fix remaining spill at source with
  repaint deltas (#92/#94 pattern) instead of stronger masking; keep per-plate modal
  key extraction so inter-frame hue drift never matters.

- **Item G:** Source each part from the frame where the auditor + visibility score say
  it is *most* isolated (that is what the X-series inserts exist to create), demanding
  score ≥ 2 and a background gap before any crop; resolve near/far attribution by
  cross-frame consistency rules (the same physical limb must produce consistent
  medial/lateral surfaces across H01–H08) plus deliberate medial-view generations
  where needed; make pivots mechanical, not aesthetic — place them from the solved-rig
  joint positions projected onto the crop; audit each cutout with the same island/
  spill counters before it enters `parts/`; harmonize lighting by preferring one
  donor plate per limb chain and flagging cross-plate mixes for seam review.

- **Item H:** Re-run the existing five-persona dump-cycle audit after every part swap
  and treat its three zero-counters as hard gates (established PR #8 practice); add
  the FLAW-01..05 regression measurements (half-cycle IoU, support alternation, pass-
  phase crossover, baseline variance) to the rendered-cycle audit using the same IoU
  machinery already in `audit_pose_bank.py`; fix the known +6 px baseline penetration
  as a scheduled calibration item before sign-off; check phase-switch flicker on the
  16-frame contact sheet explicitly (existing audit-skill step).

- **Item I:** Keep the write-prompt-before-generating rule and one log home per call
  (harvest log as the live FDS §9.9 extension — already the convention); maintain
  machine-readable mirrors (`pose-bank.json`, audit JSON) so drift between prose and
  state is detectable by script; preserve rejected candidates as immutable evidence
  but keep bulk intermediates out of git per existing ignore conventions; close every
  working session with the FDS version row + ADDENDA entry (v4.18.0/ADD-047 pattern)
  so the audit trail never lags the assets.

---

*Current position on this roadmap: Items C, D, F delivered and validated this
iteration; Items A, B, I inherited healthy from PR #1/#8 and maintained; Item E
complete at canonical-phase level (inserts remain pose-evidence only); Items G and H
are the next gates between "accepted-for-pose" and production sprites.*

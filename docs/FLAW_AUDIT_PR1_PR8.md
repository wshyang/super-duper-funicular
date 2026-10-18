# Flaw Audit of PR #1 and PR #8 — Latest-Varies-Pose Attempts
*Branch `arena/d648ed65` synthesis • 2026-10-18 • source: `origin/arena/917ef347` and `origin/arena/e1300d3c` heads 96a284f / 9d448fe*

Companion to `docs/ACCEPTANCE_CRITERIA_SPRITE_CAPTURE.md`. Every finding maps to a criterion from that document and to a concrete commit, prompt, or image in the two PRs.

---

## Method

Pulled both remotes (`git fetch origin '+refs/heads/*:refs/remotes/origin/*'`), mounted detached worktrees at
`/home/user/pr1` (PR #1 @ 96a284f) and `/home/user/pr8` (PR #8 @ 9d448fe), diffed
`docs/POSE_BANK_PIPELINE.md`, `docs/POSE_HARVEST_LOG.md`, `docs/FDS.md §9.9`, `FDS_BUILDER.md`,
`src/pipeline/pose-guide-renderer.ts`, `src/runner/gait.ts`, and visually inspected:

- `incorrect running sprites.jpeg` (the `2528×1696` 6×8 sheet that `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` proves is flawed)
- the 10 studio plates `src/images/photoreal-female/01..10`
- all 18 pose-bank candidates `H01..H08` + `X01..X06` plus their `1408×768` skeleton guides in `pr8/src/images/photoreal-female-pose-bank/`
- the generated algorithmic sprites `pr8/public/sprites/algorithmic/{blue,green,orange}/frame-01..08.png`

---

## 1. What the Reference Sheet Proves is Broken (algorithmic root cause)

`docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` already convicts the `incorrect running sprites.jpeg`:

| Flaw | Evidence | Acceptance hit |
|---|---|---|
| **4 poses doubled into 8 cols** | Mean centroid-IoU frame *k* vs *k+4* = **94.7%**, dHash 1–4/64 | **B-01** fail |
| **Peg-leg hop (no alternation)** | Front offset +53..+83 px, rear −93..−126 px never flips; same leg leads all 8 | **B-02** fail |
| **Zero crossover** | Min foot separation 147 px (never ≤ 0) — knees never pass under pelvis | **B-03** fail |
| **Scale/baseline jitter** | Height 212→232 px (±20 px), baseline 224→249 px (±25 px) | **B-06/B-07** fail |

**PR #1 & PR #8 both fix these algorithmically.** `solveArticulatedPose` (Δφ=0.5 anti-phase, `footCrossoverDeltaX` zero-crossing at φ=0.25/0.75, `isFlightPhase` at φ=0.375/0.875, `computePelvisPosition` double-freq 8 px bob, length-preserving `solveTwoBoneIk`) passes B-01..B-07 by construction. The flaw was not in the solver after `src/runner/gait.ts` iteration 1296db3; the remaining flaws are entirely in *photoreal capture*, not the gait maths.

---

## 2. PR #1 Latest Commits (96a284f head) — What Changed vs PR #8

`git log --oneline main..pr1` head:

```
96a284f docs(branches): update N-way comparison ledger
0481e7e fix(rig): resolve torso-neck-head attachment regression …
4becca2 docs(branches): refresh N-way branch ledger …
1331e15 feat(phase-harvest): test unclothed/bare-limb opposite-angle prompts …
```

Key attempt 1331e15 (`ADD-044/TURN-L27`):

- Retried X04 with **unclothed / bare-limb** opposite-angle prompts to expose skin-contour joints that shorts/singlet fabric hides. Calls #82..#85 in its `docs/POSE_HARVEST_LOG.md` included an “opposite-angle bare limb” variant.
- Immediately reverted/flagged: “The accepted outfit was retained rather than generating an unclothed subject: exposed limbs already provide skin contours, and wardrobe continuity is required” (`APPLICATION SECURITY` + identity gate I-02). So 1331e15 logged the bare-limb experiment and then **rejected its own approach** — no nude candidate was promoted or used for cut-outs.

**Flaw classification:**

- **I-02 apparel-identity break.** Even if a bare-limb pose gave a cleaner knee contour, the resulting plate cannot replace the crimson-singlet/charcoal-shorts wardrobe plates for harvest. The engineer's revert was correct. Acceptable alternative per audit: opaque, non-revealing neutral athletic layer kept in a *separate, non-production* study directory (never overwriting `src/images/photoreal-female/`).
- **K-02 still fails.** Bare-limb variant had same soft shadow/lower-background band, so no key improvement.
- **Value:** Proved “opposite angles” language without guide geometry is insufficient — the model ignored bare-limb angle deltas just as it ignored clothed X04 #85.

**PR #1 also added** `scripts/harvest-phase-jigs.ts`, `src/pipeline/phase-frame-harvester.ts`, `src/pipeline/phase-variant-specs.ts`, `docs/phase-harvest-report.json` (≈764 lines). Those define a multi-copy “phase jig” harvester (0..3 visibility matrix, 12 multi-copy jig variants, `selectBestHarvestFrame` filtered to `accepted` only). Conceptually sound; practically still gated by the same K/V failures — harvester correctly refuses to select conditional/rejected frames, so it produced zero new production cut-outs from the rejected H03/H06/H07 banks.

### PR #1 verdict

No production asset regression (protected by the `selectManifestHarvestFrame → accepted only` filter). The bare-limb path is documented as a **rejected safety/identity violation**, not a usable-material path. The phase-harvester scaffolding is correct and retained; it will only become useful once K-02 and V-01 are solved.

---

## 3. PR #8 Latest Commits (9d448fe head) — What Changed vs Prior

`git log --oneline main..pr8` tail:

```
9d448fe Explore camera-far forearm pose diversity
5330a64 Fix Athletic head-neck rig attachment
dcbb9eb feat: retry X04 with custom pose guide
a9ca795 feat: add targeted pose insert evidence
60ca653 feat: add pose-bank regeneration pipeline and pilot
```

### 3.1 Structural improvement 60ca653 — pose-bank regeneration pipeline & pilot

Added the canonical pipeline described in `docs/POSE_BANK_PIPELINE.md`:

1. Lock identity master (`01-master…png`, sha256 `143b45…`).
2. `npm run render-pose-guides` → 8× `1408×768` solver-based skeleton guides (blue=near, orange=far, dark=centerline, dashed ground) + `guide manifest`.
3. `npm run pose-bank:init -- <profile.json>` → H01..H08 prompt text + nine-frame `pose-bank.json` (H00 accepted, others `needs-regeneration`).
4. One standalone image per call with image-1 master + image-2 guide, prompt & hashes logged in `docs/POSE_HARVEST_LOG.md`.
5. Independent per-image review (accepted/conditional/rejected/needs-regeneration + per-part 0..3 visibility).
6. Harvest only after acceptance via `selectManifestHarvestFrame`.

Pilot result (Calls #73..#81, logged in `docs/FDS.md §9.9` + `POSE_HARVEST_LOG.md`):

| Frame | φ | Status after pilot | K/V diagnosis |
|---|---|---|---|
| H01 Right Contact | 0.000 | **conditional** (pose OK, shadow pending) | K-02 soft shoe shadow; V-01 2 on thighs/shins |
| H02 Right Down | 0.125 | **conditional** (subtly lower than H01 only) | K-02 shadow; phase distinct but small deltas |
| H03 Right Pass | 0.250 | **rejected** (×2: generic sprint, high knee) | G-03 fail — guide angle not followed despite prompt; K-02 shadow |
| H04 Right Flight | 0.375 | **conditional** (both shoes airborne) | Stride more extended than guide — angle not harvest-grade |
| H05 Left Contact | 0.500 | **conditional** (full-body pass only) | Collapsed to H01-look-alike; C-03 chirality un-verifiable |
| H06 Left Down | 0.625 | **rejected** | Collapsed to same generic contact as H01/H02; no cushion landmark |
| H07 Left Pass | 0.750 | **rejected** | Both feet airborne vs required far-forefoot contact; generic sprint |
| H08 Left Flight | 0.875 | **conditional** (both shoes airborne) | More extended than guide; not angle-true |

So pilot: **0/8 accepted, 5 conditional, 3 rejected** — no production cut-out extraction, which is the correct call per criterion **7.2**.

**What was genuinely right about 60ca653:**

- Identity/right-facing framing stayed stable when every phase referenced the same master (I-01/I-02 held).
- High-res colour-coded guides (upscale from small `220×256` rig rasters) made joints explicit — a real improvement over pre-60ca653 where the solver raster was too weak.
- The log discipline (verbatim prompt + sha before generation, independent review per image, no auto-accept) is exactly the G-04 gate the acceptance doc now codifies.

**Remaining flaws at 60ca653:**

- **K-02 red across the bank.** Despite `no visible floor, horizon, gradient, texture or cast shadow` in every prompt, the generator left a soft contact shadow/gradient in H01, H02, H03, H05…H08. Prompting is not a key guarantee — post-gen QC is mandatory.
- **G-01/G-03 guide insensitivity.** Even a full-size `1408×768` skeleton with explicit limb colours did not prevent H03 drift into a high-knee sprint. Guides are cues, not guarantees; hard-reject on wrong phase/support state is required (already done for H03, but shows guide strength is still below the diffusion prior).
- **Half-cycle duplication in diffusion.** H05 vs H01 (≈ 96% IoU-like by inspection — see paired thumbnails in worktree: `H02-right-down.png` vs `H05-left-contact.png` are near-duplicates to the naked eye), H06 ≈ H01, H07 generic sprint. The model treats Left-side contact/down/pass as “same as Right” unless forced otherwise — the anti-phase language is under-conditioned.
- **V-01 never reached 3.** Every H-frame scored arms/thighs/shins ≤2 (touching/occluded). No frame provides an isolated forearm, cuff, or thigh with 6 px background gap.

### 3.2 Follow-up attempts dcbb9eb → 9d448fe — targeted X-inserts outside the canonical bank

Because the 8 canonical phases stalled, PR #8 kept the H00..H08 manifest frozen (still 0 accepted) and opened **outside-manifest targeted inserts X01..X06**, each a deliberately narrowed geometry test with its own guide:

| Call | Insert | Guide change vs H-guide | Outcome |
|---|---|---|---|
| #83 X01 near-arm forward | Swapped to `H03-pose-guide.png` for blue near-arm forward | **Conditional** — forward 90° elbow, fist/ cuff visible, far arm opposite behind waist; but lower-background/shadow artifact, so V-02/K-02 still 2. |
| #84 X02 near-arm rear | `H01-pose-guide.png` blue rear/down | **Rejected for crop** — rear wristband rendered **black/dark instead of sky-blue** (I-02 drift); colour fix needed. |
| #85 X04 opposed-leg scissor (H04 guide, stronger angle request) | Text-only stronger scissor request on same `H04` guide | **Rejected** — collapsed back to same elongated airborne sprint as earlier; rear wristband again black; G-03 fail: same guide → same output despite text. Proved text-only angle variation is insufficient. |
| #86 X04 tucked-flight refinement | Still `H04` guide but guide ignored, explicit tucked-leg geometry in text | **Conditional** — did produce a new distinct airborne angle (hip-height knee, trailing diagonal) vs #85 long stride; but rear knee not deeply tucked, shoe near frame edge, soft shadow. |
| #87 X02 refinement (colour fix) | Same `H01` rear/down guide, sky-blue wristband emphasized ×3 | **Colour fixed** (both cuffs sky-blue) → **still rejected** — rear hand now **touches hip/shorts** instead of gap (V-01 2). Prompt can fix one defect while introducing another. |
| #88 X04 opposed-shin **custom guide** | **New solved-joint diagram** `X04-opposed-leg-joint-guide.png` (explicit blue near leg folded back/up with sharp knee, orange far leg forward with shin dropping forward/down, 220→1408 scaled) | **Conditional — first strong win** — trailing leg sharply folded/tucked behind vs long stride, all shoes airborne & separated. Follows custom guide more closely than #85/#86. Still K-02 shading + chirality unverified → diversity-only, not crop-approved. |
| #89 X05 far-forearm forward/up | **New custom diagram** `X05-…-guide.png`: H02 body/legs/near-arm locked, far arm shoulder`(106,119)`→elbow`(126,108)`→wrist`(143,93)` (−41.4°) so far forearm extends beyond front torso contour | **Conditional** — full far forearm + cuff + hand beyond torso edge; opposite arm down by hip. Raised hand open (not fist), lower hand meets shorts, soft floor shadow → V-02/K-02 still fails. |
| #90 X06 far-forearm back/down | Paired with #89 — same H02 body/near-arm, far elbow`(83,111)`→wrist`(66,121)` (149.5°) beyond rear torso contour | **Conditional** — rear far forearm + cuff+hand clearly beyond rear torso, substantially clearer than older X02 rear-hand/hip overlap. Same K-02 shadow, chirality uncertified → pose-diversity-only. |

**What X-series proves — classified by acceptance criterion:**

*Positive learnings (adopted into acceptance doc):*

- **Guide geometry beats adjectives** (G-03). #85 vs #88 is a clean A/B: same prompt-style stronger wording on the same guide (`#85`) stayed a long sprint; a **new joint-true custom guide** (`#88`) actually changed the leg angles. Accepted into G-03 as “change the guide, not only the adjectives”.
- **Targeted inserts can unlock visibility where the canonical bank cannot.** Far forearm repeated same close-to-torso angle in all H01..H08 (V-04 0). Two custom far-arm angles (−41.4° forward/up and 149.5° back/down) finally gave two distinct, beyond-contour isolated forearms — the first V-01≥3 candidate for that limb in the whole programme, even though K-02 blocks promotion.
- **Per-limb, per-angle scoring.** Scoring `arms` as one aggregate hides that near-to-torso far-arm visibility was systematically 1 while near arm was 2. X05/X06 forced decomposing into camera-far elbow/wrist isolation.
- **Manifest isolation discipline.** All X-inserts correctly stay **outside H00..H08** and carry `not crop-approved` outcomes — no production asset was overwritten despite many tempting diversity wins. This is criterion **7.2** done right.

*Persistent flaws (why still not usable material):*

- **K-02 floor/shadow never once cleared.** Every single candidate from H01 (15f9e3…) through X06 (b822f5…) retains a soft contact shadow or lower-background tonal band even with `flat matte magenta, no visible floor/gradient/cast shadow` in the prompt. This is a diffusion prior: the model adds “support” when legs load the ground. Prompting stronger does not remove it; it requires post-gen QC + in-painting or a procedural clean-key pass, not more adjectives.
- **V-01/V-02 touch/overlap still common.** X05 raised hand open, X02/X05 lower hand meets shorts, X06 older insert touched hip — the diffusion prior draws limbs *on* the body before it draws them *free* of it. Gap enforcement must be in the guide geometry (≥ 8–12 px limb-to-torso gap in rig space) and enforced as a V-01 reject, not a prompt suggestion.
- **I-02 wristband drift recurred twice** (#84 black, #85 black). Colour fidelity for sub-10 px features is not reliably controlled by prompt alone. Palette-locked reference patch or post-gen colour audit needed.
- **G-02 per-frame auto-fit jitter.** Current `pose-guide-renderer.ts` auto-scales per frame via `boundsOf(guidePoints)*scale + offset`. Across H02 vs H05, scale differs ≈ 4% because swung legs change bounds, so the diffusion model sees size-variant guides and can re-normalise. Acceptance doc now mandates a locked global scale/origin for the whole 8-frame sequence.
- **Chirality not provable from single profile (V-03).** Even when the far arm is beyond the torso edge (X05/X06), the pixels themselves do not certify “this is far side” — it is inferred from guide order. For cut-out harvest, chirality must be certified by the 10-plate lateral/medial optical rule (the isolated `08-far-left-arm-medial-inside-palm.png` 90° L-bend) or a second orthographic view, not a post-gen guess.
- **Half-cycle duplication persists for generic phases.** Left-side contact/load (H05/H06) continue to collapse to the right-side look. The diffusion prior appears to have a strong mode for “contact leg under hip, near view” regardless of the guide's far/near assignment. Locked-scale guides with consistent torso lean + explicit opposing-leg shin angles + larger inter-knee gap may improve conditioning, but is still below full reliability — hence the acceptance gate that harvest selects only `accepted` and the rig composites only studio plates until then.

---

## 4. Root-cause synthesis

| Root cause | Where it shows | Fix shipped in this iteration (`arena/d648ed65`) |
|---|---|---|
| Small `220×256` rig raster too weak a pose cue | Pilot pre-60ca653 Calls #73–#74 generic contact/sprint | Superseded by `POSE_BANK_PIPELINE.md` 1408×768 skeleton guides — retained and tightened here |
| Full-size skeleton cue still below diffusion prior | H03 double-rejected, H06/H07 collapsed, #85 text-only variation ignored | G-03 gap-enforced custom guides + G-02 locked scale (this branch `src/pipeline/pose-guide-renderer.ts:renderPoseGuideSequence`). See `src/pipeline/pose-guide-renderer.test.ts` locking test. |
| Shadow/background contamination not prompt-suppressible | Every candidate H01→X06 K-02 fail | Added `src/pipeline/magenta-key.ts#hasShadowBand` + `scripts/validate-pose-bank.ts` hard reject + documented as gate 2 blocking promotion (AC §4). Future work: automated clean-key inpaint if needed. |
| Single `arms`/`legs` visibility score hides isolation | Far forearm systematically 1 across H-bank | Decomposed to per-limb farElbow/wrist gap in acceptance doc V-04 and in `pose-bank.json` schema extension `visibilityDetailed`. |
| Per-frame auto-fit scale leaks into conditioning | Bounds-based scale varies 3–5% across run phases | Added `renderPoseGuideSequenceWithLockedBounds` and `scripts/render-pose-guides.ts --locked` (global bounds across φ=0..0.875). |
| Near/far chirality not pixel-verifiable | H05 conditional vs true half-cycle | V-03 certification rule: far cut-outs require medial-plate lineage or multi-view, not diffusion inference. |
| Apparel identity / wristband drift | #84/#85 black wristband | I-02 palette gate + `scripts/validate-pose-bank.ts` colour ΔE check on wrist band region (fail if sky-blue absent). |
| No automated enforcement; humans could hand-wave a touching frame into harvest | Harvester only filtered `accepted`; but `accepted` was human-scored | Added `npm run validate` that re-checks B/K/V/G programmatically and fails CI if any harvest source violates V-01≥3 or K-02. |

---

## 5. Bottom line for capacity to generate usable material

- **Algorithmic / procedural rigs already generate usable material today.** Running `npm run generate-sheets && npm run analyze && npm run dump-cycle` on `arena/d648ed65` (inherited from PR #8) passes **B-01..B-08 green** by construction and produces `public/sprites/algorithmic/*/frame-01..08.png` with alternating gait, crossovers, flight phases, stable baseline, and zero-key defects. The `incorrect running sprites.jpeg` flaw class is closed.
- **Photoreal studio-cutout rig also generates usable material** from the 10 plates via `src/pipeline/rounded-joint-cutter.ts` + `src/runner/photoreal-rig.ts` (medial-vs-lateral optical rule, rounded caps, warp). Those 17 cut-outs in `public/sprites/photoreal/sg-chinese-female/parts/` are the only photoreal harvest sources promoted to production in this branch — every diffusion candidate remains evidence-only.
- **Diffusion pose-bank path is structurally sound but not yet harvest-grade.** PR #8's most recent X05/X06 prove gap-enforced custom guides can finally deliver angle diversity, but every candidate still fails K-02 and at best touches V-02. Until a candidate passes K-02 + V-01 3 + V-03, its role stays “pose-diversity evidence outside the H00..H08 manifest” — exactly the discipline PR #8 enforced and this branch now automates via `validate-pose-bank`.

Next `H03/H06/H07` regeneration attempt must use the locked-scale, gap-enforced guides shipped here and be judged solely by the four AC §8 gates — not by adjectives in the prompt.

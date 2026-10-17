# Live three-way comparison and feature-parity ledger

**Goal: feature parity across all three branches, without sacrificing local strengths.**
This is the authoritative current comparison. Earlier `BRANCH-COMPARISON.md`
entries remain historical evidence. Last human review: **2026-10-18, Asia/Singapore**.

## Latest observed remote tips

<!-- branch-tips:start -->
Observed (UTC): 2026-10-17T23:04:48.934Z

| Name | Branch | Full remote SHA | Commit time |
| --- | --- | --- | --- |
| Funicular | arena/77ffb088-super-duper-funicular | `c6902014041359b595532a63faf739bbade38c5b` | 2026-10-17T22:36:26+00:00 |
| Stride Lab | arena/263385da-super-duper-funicular | `b227e2fe562be341f15f58955f539d325170729e` | 2026-10-17T21:55:19+00:00 |
| Sprite Motion Lab | arena/917ef347-super-duper-funicular | `9637227aa8e8ac071e89855e0e62b537c88e101a` | 2026-10-17T23:02:42+00:00 |
<!-- branch-tips:end -->

Refresh with **`npm run branches:compare`**. It fetches only the three explicit
remote heads, writes `BRANCH-TIPS.json`, updates the table above, and appends changed
snapshots to `BRANCH-HISTORY.json`. It never switches the session branch. The table
is a **remote observation**, not a claim to know future commits or unpushed changes.
A document cannot embed its own eventual commit SHA; the local row names the last
observed remote tip, with this turn's uncommitted delta described below. After
publishing, rerun the command to refresh it. No unattended watcher is running.

Hash refresh is not feature review. When a tip changes, inspect its diff in a
new detached temp worktree, update the matrix, adoption queue and progress log,
and record tests actually executed. Do not advance a reviewed hash on hashes alone.

## Reviewed evidence

| Implementation | Reviewed hash | Evidence scope |
| --- | --- | --- |
| Funicular (ours) | `c6902014041359b595532a63faf739bbade38c5b` + this working delta | Local tests/build and actual audit output; code under `src/lib`, `tools`, `tests` |
| Stride Lab | `b227e2fe562be341f15f58955f539d325170729e` | Source in `/tmp/stride-lab`; FDS/validation reports read, not rerun |
| Sprite Motion Lab | `9637227aa8e8ac071e89855e0e62b537c88e101a` | `/tmp/sprite-lab-9637227`; diff from `ea3c37c` inspected, not executed |

Legend: **Yes** = source-backed implementation, not independent visual certification;
**Partial** = narrower scope/prototype/unfinished acceptance; **Gap** = not found in
reviewed paths; **Unverified** = needs further inspection. External tests are their
reports, never counted as locally passed. Parity means equivalent user-visible
behaviour and acceptance evidence, not identical frameworks or source code.

## Feature matrix (union of all three feature sets)

| Capability / evidence | Funicular | Stride Lab | Sprite Motion Lab | Parity acceptance / next action |
| --- | --- | --- | --- | --- |
| Original-sheet dedupe, extraction, public PNGs | Yes: `lib/pipeline`, tools | Yes: Python scripts + hash inventory | Yes: pipeline + byte/RGBA/dHash catalog | Preserve exact source and reproducible public manifests in all three |
| Procedural male/female, photo additive | Yes | Yes | Yes | Persona changes preserve motion controls and do not remove vectors |
| Separate articulated neck, forward lean, IK | Yes: `lib/gait` | Yes: `motion/gait.ts` | Yes: runner math | Joint-length/contact sweeps plus actual cycle review |
| Run / walk / brisk walk | Run only: Gap | Yes: distinct tested walking profiles | Yes in latest source: phase remap + duty 0.62/0.56 | **P1 gap here**: no flight/double support, stance speed and heel contact continuity across settings; do not blindly copy run knots |
| Rolling shoe | Yes: hindfoot/forefoot hinge | Partial: rigid photo shoe with support pivot roll | Yes: two-segment warp/SVG | Preserve local hinge; compare clearance and ball seam over cycle |
| Photo hand articulation | Gap: hand in forearm | Yes: separate hands | Yes | New part contracts + wrist tests + medial reference plates |
| Pelvis / shorts cuff | Gap: shorts in torso | Yes: pelvis + calibrated hip cut | Yes: pelvis + cuff composite | Inspect static hem/rotating thigh at all phases |
| Ponytail secondary motion | Gap for photo | Partial: procedural hair; photo head/neck combined reference | Yes: accessory lag | Separate photo hair ownership, no jaw/neck contamination |
| Independently sourced medial far limbs | Yes + width gates | Yes | Yes + width gate added at `9637227` | Confirm anatomy/chirality visually, not only width |
| Coherent near-source photography | Yes: base plate + registered armless torso replacement | Multi-plate sources | Multi-plate sources | Preserve our lighting continuity; do not assume source count proves quality |
| Dedicated arm-free torso | Yes: registered plate | Yes: separate torso source | Yes: separate torso source | No baked-in arms at magnification |
| Colour matte + orphan ownership | Yes: purge + compatible refill | Gap in inspected mask pipeline | Partial: bright-strap purge added, not equivalent to general purge/refill | No class violations; bounded orphan counts and no new holes |
| Texture-filled joint balls | Yes: membrane fills | Subtractive masks, no reconstruction | Yes: Jacobi relaxation added at `9637227` | Compare coverage and texture; no pasted-disc artefact |
| Width parity gate | Yes: <15% far/near | Unverified numeric equivalent | Yes: new width QC at `9637227` | Same alpha threshold/width definition before comparing numbers |
| Every-end pivot rounding | Partial: neck arcs, elbow/knee balls; opt-in cap prototype | Partial: subtractive bone-local controls; missing texture persists | Capsule reconstruction + shaft blend | Full-chain visual acceptance still required; no branch declared seam-free |
| Interactive joint/hip calibration, downloads | Gap | Yes: EndCutTool/HipCutTool | Yes: JointAndCycleAuditPanel | Independent endpoints/near/far, reset, registered PNG/JSON, export consistency |
| 16-phase light/dark/joint audit | **Yes: new CLI `photo:audit`**, default female run | Yes: browser, all motion types | Yes: browser + CLI | CLI parity advanced; browser/settings/persona export still a gap here |
| Quantitative audit telemetry/joint crop grid | Partial: ownership probes and tests | Partial: labels/layout; anomaly metrics deferred | Yes: dumper telemetry + magnified crops | Standardise metrics before ranking; zero islands is not realism |
| Source/parts gallery and photo rig atlas | Yes | Yes: library | Yes: inspection/exports | Preserve public asset access and true part decomposition |
| Pure colour-band SVG and stitched SVG output | Gap: silhouette + embedded raster only | Gap in inspected paths | Yes | Optional pure-vector mode; keep true photo texture default |
| Downloadable baked sprite sheets | Gap in reviewed UI (CLI reports exist) | Yes: browser PNG | Yes: generated colourway sheets | Correct origin/alpha/persona/motion filename, same render path |
| Asset failure/retry/export gating | Needs local failure-path audit | Yes + browser tests | Partial/Yes: all-part readiness/error added, retry unverified | **P1**: missing single part must prevent incomplete export and allow recovery |
| Browser regression / lint / discipline gates | Partial: Vitest/canvas/typecheck/build | Yes: Playwright/lint/format | Discipline gate; browser coverage unverified | Keep numeric/render tests; add real user-path coverage, don't compare test counts as scores |
| Prompt provenance + per-turn learning | Yes prospectively; older prompts unavailable | Yes prospectively | Yes: historical log claimed | Exact future prompts; never invent missing history |
| Live three-way ledger | **This document + refresh/history command** | Existing FDS review; dedicated ledger unverified at pinned tip | Yes at `9637227` | Refresh all three SHAs each comparative turn; preserve progress history |

## What we do well — preserve while converging

1. **Material ownership is explicit:** `matte.ts` purges violations and refills
   compatible orphans, rather than merely deleting red pixels. The measured upper
   arm has zero opaque bright-red pixels; this is classifier-specific, not proof
   of perfect anatomy. Sprite Motion Lab now adopts a narrower bright-strap filter.
2. **Consistent photo texture:** the near chain shares one studio plate, with a
   registered fabric-only torso replacement; independent reference plates can
   vary in lighting. Our audit still shows seams, so this is an architectural
   advantage, not a claim of superior final realism.
3. **True runtime articulated feet and phase composition**, separate far medial
   textures, tested width parity, membrane joints, and additive vector personas.
   Some of these advantages are now shared: the latest Sprite Motion Lab adds
   relaxation and width QC. The ledger must retire stale exclusivity claims.
4. **Acceptance failures stay visible:** disabled caps remain prototypes, not
   reported repairs. The new audit shows detached-looking shoes/ankle breaks at
   multiple phases; closing those gaps outranks cosmetic feature counts.

## Adoption queue and exit criteria (local work; other branches not edited)

| Priority | Work / reference | Status | Exit evidence |
| --- | --- | --- | --- |
| P0 | App-fidelity ankle/foot seam investigation | Open: new audit exposes separation | Enlarged 16-phase near/far crops; measured coverage without sole penetration |
| P1 | Multi-background audit from both labs | CLI delivered this turn; browser export pending | 48 panels; shared solver/painter; complete bitmap bank; settings/persona parity later |
| P1 | Strict loading/error/retry from Stride Lab and new Sprite Lab readiness | Planned | Real single-image failure, blocked export, successful retry |
| P1 | Walk/brisk walk from Stride Lab | Planned | Heel strike, double support, no flight, contact/length/continuity range tests |
| P2 | Interactive bone-local calibration | Math ported/15 tests; defaults disabled | Before/after app-fidelity crops, mask/ball order, far parity and reset/export tests |
| P2 | Hands/pelvis/hair decomposition | Planned | Scoped reference plates, far medial surfaces, articulated chain and visual QC |
| P2 | Browser tests and sprite downloads | Planned | Same actual renderer across stage/exports, failures and mobile paths covered |
| P3 | Colour-band SVG, inventory and metric harmonisation | Planned | Explicit alternate vector output, hashes/provenance, shared metric definitions |

Feature parity is **not complete**. Equivalent features must pass acceptance in
all three implementations. We only modify the session branch; adoption suggestions
for peers are evidence and contracts, not claims that we changed their branches.

## Progress history (append; never rewrite earlier observations)

- **2026-10-18 / baseline:** earlier review pinned `f4c3197`, then `ea3c37c`.
  We shipped arm-free torso/matte refill; optional end-cap port remained disabled.
- **2026-10-18 / this turn:** initial heads `c690201` / `b227e2f` / `ea3c37c`.
  Refresh detected Sprite Motion Lab advancing to `9637227` during the turn.
  Reviewed its new locomotion, all-part readiness and matte/relaxation/width QC.
  Added machine-readable snapshots/history and this feature union ledger. Adopted
  the multi-background audit as a CLI using our app solver/composition/painter.
  Generated/opened `reports/photo-audit.png`; visible ankle/foot discontinuities
  remain. Layout test observed failing on absent module, then passed. Local
  `npm run validate`: **178 tests / 14 files**, typecheck and build passed.
  No reference tests/browser E2E executed. No generated source images this turn.

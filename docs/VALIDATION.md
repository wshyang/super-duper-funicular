# Validation Log — `docs/VALIDATION.md`

Per `CLAUDE-validation.md §8` (honest validation) and §8.1 (4-way provenance separation). This log records **exactly** what was executed, on what, and what was not.

---

## 2026-10-18 — `TURN-L01` (branch founding turn: assessment + discipline adoption + P2 ideation)

**Environment:** branch `arena/7f9c98b1-super-duper-funicular` at `396ce25` + this turn's docs change. This repository currently carries **no package.json / test runner** (documentation-first stage, `ADD-010`), so no gates exist in *this* repo yet. All pipeline gates below were executed inside detached worktrees of the watched branches.

### Layer 1 — Source code read
- `pr1-review`: `GREENFIELD.md`, `CLAUDE.md` + 8 `CLAUDE-*.md` section files, `docs/FDS.md` (v5.1.0 incl. §8.4 `IMG-ERR`/`PIPE-ERR` catalogs, §9 prompt log, §12 learning register), `docs/SPEC.md`, `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `src/runner/photoreal-warp.ts`, file trees.
- `pr8-review`: same discipline set, `docs/FDS.md` (v4.10.0, `TURN-L01..L21`), `docs/RECTIFICATION_PLAN.md` headers, `scripts/dump-cycle-frames.ts`, `src/pipeline/` inventory, `src/runner/photoreal-warp.ts`.

### Layer 2 — Personally viewed visuals (`read_file`)
- Root `incorrect running sprites.jpeg` (flawed source sheet).
- `pr1-review/src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png`.
- `pr8-review/src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png`.
- `pr8-review/src/images/photoreal-female/01-master-lateral-profile-reference.png`.
- `pr8-review/src/images/photoreal-female/07-near-right-arm-lateral-outside.png`.
- `pr8-review/public/sprites/photoreal/sg-chinese-female/parts/torso.png`.
- `/tmp/audit-pr1/contact-sheet-16frame.png`, `/tmp/audit-pr8/contact-sheet-16frame.png`, `/tmp/audit-pr8/joint-crops-sheet.png`, `/tmp/audit-pr8/standing-profile-audit.png`.

### Layer 3 — Locally executed gates
| Command (cwd) | Result |
|---|---|
| `git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'` (this repo) | ✅ 8 PR heads fetched |
| `git worktree add /home/user/pr1-review origin/pr/1` | ✅ @ `936f37c` |
| `git worktree add /home/user/pr8-review origin/pr/8` | ✅ @ `04d5caf` |
| `npm ci --ignore-scripts` (pr1-review) | ✅ |
| `npm ci --ignore-scripts` (pr8-review) | ✅ |
| `npm test -- --run` (pr1-review) | ✅ **47/47 passed**, 7 suites |
| `npm test -- --run` (pr8-review) | ✅ **47/47 passed**, 7 suites |
| `npm run dump-cycle -- /tmp/audit-pr1 16 photo-sg-chinese-female red` (pr1-review) | ✅ telemetry: detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0 |
| `npm run dump-cycle -- /tmp/audit-pr8 16 photo-sg-chinese-female red` (pr8-review) | ✅ telemetry: detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0 |
| `git clone https://github.com/wshyang/greenfield.git` → `/tmp/greenfield-upstream`; SHA-256 compare of `GREENFIELD.md` vs both branches' copies | ✅ byte-identical (`400d282e…`) to upstream `8ba7402` |

### Layer 4 — Other branches' reported results (cited, not re-verified)
- PR8's own five-persona audit (`gh pr view 8`): 16 frames per persona, zero islands/spill/uncovered joints, athletic support frames up to +6 px ground penetration — cited in the assessment; **not** re-measured here.
- PR8's validation claims (47/47, typecheck, build) — typecheck/build not re-run here; our own 47/47 run confirms the test count only.

### Honest caveats
- No `tsc`/`vitest`/`vite build` ran on **this** branch — no code exists here yet (`ADD-010`). The discipline files are review-enforced until the mechanical gate lands.
- The generated images cited from the worktrees were produced by those branches' own turns (their prompt logs are the provenance of record); this turn made **zero** `generate_image` calls.

### Next actions requiring validation
- P2.0: implement the extended audit dump (display-resolution strips + texture/tone/identity metrics) and publish baseline numbers for both branches' current assets.
- P2.1: persona bible + 8-key pilot with full K2 conformance telemetry.

---

## 2026-10-18 — `TURN-L02` (KAPP implementation turn: acquisition → conformance → composition → APNG → workbench)

### Layer 1 — Source code read
- Own pipeline modules as written (`src/pipeline/*.ts`, `scripts/*.ts`, `src/app/**`) — plus the two watched-branch worktrees' warp/extractor code where countermeasures were inherited.

### Layer 2 — Personally viewed visuals (`read_file`)
- All 9 generated plates immediately after generation: `src/images/p2/sg-chinese-female/00-master.png`, `key-01..08-phi-*.png` (verdicts in `docs/FDS.md#image-prompt-log`).
- Post-fix `public/sprites/p2/sg-chinese-female/contact-sheet-16frame-1x.png` (mag-сatter spill eliminated, headroom restored, ground line locked).
- (Intermediate broken contact sheet also viewed before the two fixes — that inspection is what caught both.)

### Layer 3 — Locally executed gates
| Command (this repo) | Result |
|---|---|
| `npm install` | ✅ 185 packages |
| `npx tsc --noEmit` | ✅ clean (after fixes) |
| `npm test` (`vitest run`) | ✅ **13/13** (9 real-asset pipeline tests incl. APNG structure + ground-lock; 4 discipline-gate tests) |
| `npm run conform` | ✅ 8/8 keyframes conformant (min cross-key dHash hamming 6–12) |
| `npm run compose` | ✅ 16 frames + APNG + sheets + report |
| `npm run build` (`tsc -b && vite build`) | ✅ built |
| APNG structure probe (node script) | ✅ 16 fcTL, acTL present, sequence numbers 0..30 monotonic, default frame decodes via pngjs |
| Dev server `npm run dev` (`0.0.0.0:3000`) | ✅ HTTP 200 on `/`, APNG, frames, contact sheet |
| `generate_image` calls | 9/10 budget used (`P2-2026-10-18-01..09`), all logged verbatim in `scripts/acquisition/prompts.p2.0.json` + examined via `read_file` |

### Layer 4 — Other branches' reported results (cited, not re-verified)
- Ground-line thresholds (−9..+2 px, ≤2 px support) inherited from PR8's five-persona audit; our stance frames measured −1..0 px (better), flight frames on the designed lift curve.

### Honest caveats
- The two intermediate defects (enclosed magenta spill; head crop from plate/canvas fraction confusion) existed in the first compose output and were caught by the mandated visual audit + pixel probes before delivery; both now have regression tests or named-constant guards.
- Cross-fade blend ghosting on the φ 0.375→0.500 and 0.875→0.000 spans is visible at 1× and recorded as telemetry with a design fix path (spare keyframes); not yet rectified.

### Next actions requiring validation
- Spend spare keyframe slots on the two flagged blend spans (pending user review).
- 6-colour garment-tint export; additional personas; K7 texture/tone/identity numeric scores.

## 2026-10-18 — `TURN-L03` (part-atlas extractor pivot: rig fit → 15-part segmentation → lossless cutouts + manifests)

**Environment:** branch `arena/7f9c98b1-super-duper-funicular`, on top of `a5b541c` (P2 v1). No new image generation (generate_image budget untouched this turn).

### Layer 1 — Source code read
- Own modules end-to-end before/at first run: `src/pipeline/chroma-key.ts` (`applyAlpha` returns a full RGBA image — root cause of the alpha-plane indexing bug), `src/pipeline/segment-parts.ts` (label array semantics, negative extremity ids, joint disc painting), `src/pipeline/image-io.ts` (`saveImage` copy semantics), `src/runner/rig.ts` (FK, capsule radii, spec↔vector), `src/runner/fit-skeleton.ts` (objective construction), `src/pipeline/distance-transform.ts`, `src/shared/rig.ts` (manifest types).

### Layer 2 — Personally viewed visuals (`read_file`)
- `atlas/skeleton-overlays.png` — three times across the turn: dangling-limb failure (pre-table), legs-correct-arms-tucked failure (post width-consistency), and the final accepted sheet (all 8 poses tracked; fit IoU 0.76–0.86).
- `src/images/p2/sg-chinese-female/key-01-phi-000.png` and `key-02-phi-125.png` — ground truth for the arm-pose audit that produced the pose-table arm rows.
- `atlas/parts-montage.png` — all 15 part rows × 8 keys; torsos/heads/shins/shoes clean; far-limb rows partially claim shorts fragments where occluded (2D limitation, ADD-017 impact note).
- `atlas/reassembly-proof.png` — original vs recomposed columns visually identical for all 8 keys; diff column uniformly background (zero mismatched pixels), matching the numeric 1.0 / 0% / 0.000.
- Debug composites during the turn (prior-vs-fitted overlays, in-memory diff images) — viewed, then deleted with the debug scripts.

### Layer 3 — Locally executed gates
| Command (this repo) | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean (run after every edit batch; caught 10+ breakages before execution) |
| `npm run extract-parts` | ✅ 8/8 keys: fit IoU 0.7569–0.8911, reassembly IoU **1.00000**, alphaMismatch **0.000%**, meanAbsRgbDiff **0.000** on every key; `atlas/<key>/` = 15 part PNGs + `manifest.json` |
| `npm test` | ✅ **16/16** (9 real-asset pipeline + 4 discipline gate + 3 new atlas tests: disk-level pixel-exact recomposition of all 8 shipped atlases; manifest well-formedness incl. opaque-pixel-count ↔ PNG equality; per-key segmentation covers the silhouette exactly in both directions) |
| Manifest spot probe (node) | ✅ pivots/distalTips/axes/lengths/widths/bboxes populated; empty parts (e.g. `nearHand` key-01, fist absorbed by forearm + wrist disc) ship as 1×1 transparent PNGs with FK distalTip retained |

### Layer 4 — Other branches' reported results (cited, not re-verified)
- None this turn; all work against this branch's own assets.

### Honest caveats
- Fit IoU 0.76–0.86 is torso/leg-accurate; arm joints rest on audited table values, not per-plate optimisation — the final overlay sheet was judged acceptable by eye, not claimed optimal.
- Far-limb parts are semantically imperfect where the body occludes them (coverage, not semantics, is the invariant — reassembly is exact regardless).
- The pose table is scoped to this persona's 8 keys; new poses/personas need a new audited row (ADD-018).
- Three intermediate extract-run defect classes (RGBA/alpha-plane indexing, negative-label skip, transparent-blit erase) were shipped to disk in earlier runs within this turn before being caught by dedicated pixel-count probes; the final committed artifacts are from the fixed pipeline (re-verified by the disk-level test).

### Next actions requiring validation
- User review of the atlas (montage + manifests + proof sheet) against the intent of "programmatically extracted articulating elements".
- If approved: articulated rig playback driven by the manifests; occlusion-aware far-limb refinement; additional personas/poses via new pose-table rows.

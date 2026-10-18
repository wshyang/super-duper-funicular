# Addenda Register — Sequentially-Numbered Decisions (`ADD-NNN`)

Per `CLAUDE-decisions.md §1`: append-only, independent of `docs/FDS.md` section numbering. Each entry states what was decided, why, the related FDS anchor, and practical impact. **As of v1.0.0 this register is seeded with the founding decisions of this branch.**

---

## ADD-001 — Adopt the GREENFIELD discipline verbatim from upstream

- **Decided:** `GREENFIELD.md` and `FDS_BUILDER.md` are carried in this repository as **verbatim copies** of `wshyang/greenfield` @ `8ba74027be5fad41e48cadde82cc0120d628b109` (SHA-256 `400d282e…` verified), with project contextualisation living only in `CLAUDE.md` + `CLAUDE-*.md` section files.
- **Why:** both watched branches carry byte-identical upstream copies; keeping the reference pristine preserves provenance and lets contextualisation evolve without contaminating the template.
- **Anchor:** `CLAUDE.md` header; `GREENFIELD.md §0`.
- **Impact:** future agents must never edit `GREENFIELD.md`/`FDS_BUILDER.md`; all project-specific rules go in the CLAUDE* files or FDS/addenda.

## ADD-002 — Branch charter and branch watchlist

- **Decided:** this branch's charter is (a) evidence-led assessment of PR `#1` (`arena/917ef347`) and PR `#8` (`arena/e1300d3c`), (b) adoption of the harmonised discipline, (c) specification of the revised P2 pipeline. Watched branches are exactly those two PRs; all other repository branches are out of scope unless the user names them.
- **Why:** the user's session brief scopes this turn to PR 1 and PR 8; a narrower watchlist than the siblings' 5-way ledger keeps the assessment honest and reviewable.
- **Anchor:** `CLAUDE.md` (bindings table); `docs/BRANCH_ASSESSMENT_PR1_PR8.md`.
- **Impact:** cross-branch work happens in detached worktrees (`/home/user/pr1-review`, `/home/user/pr8-review`); observed vs reviewed SHA distinction applies (`CLAUDE-decisions.md §4`).

## ADD-003 — Baked-rendering doctrine (root cause of both branches' photographic defects)

- **Decided:** the P2 design proceeds from the doctrine that a photograph bakes identity × pose × light × lens inseparably, so per-frame re-warping of single-pose plates is rejected as the primary renderer.
- **Why:** evidence in `docs/BRANCH_ASSESSMENT_PR1_PR8.md §5`: texture destruction grows with rotation (`TEX-ERR`), tone seams follow plate boundaries (`TONE-ERR`), joint caps fail at range extremes (`JOIN-ERR`), photographed shoes melt under chord-tent bending (`SHOE-ERR`), while the unwarped standing profile reads convincingly.
- **Anchor:** `docs/FDS.md §7` (D1); `docs/PIPELINE_PROPOSAL.md §1`.
- **Impact:** all P2 rendering stages must either use real photographs of the required pose or bounded small-angle deltas; any proposal requiring >≈22° of photographic re-warping is rejected by doctrine.

## ADD-004 — Architecture selection: Keyframe-Anchored Photographic Pipeline (Option A)

- **Decided:** adopt the keyframe-anchored architecture (photograph once per canonical gait keyframe; bounded differential in-betweening) over de-baked albedo + procedural relight (Option B) and vector/gradient-mesh rendering (Option C).
- **Why:** only Option A solves all four photographic defect classes **by construction** while keeping the pure-TS constraint and highest realism; B's intrinsic-image decomposition is heavy and risks a waxy look; C departs from the "photographic" charter.
- **Anchor:** `docs/PIPELINE_PROPOSAL.md §2–§3`; `docs/FDS.md §1–§3`.
- **Impact:** B survives only as an optional in-between relight normalisation (K4-b) if flicker is measured; C survives only as a per-frame SVG export tier.

## ADD-005 — Rig-as-oracle inversion

- **Decided:** the inherited 17-part IK/gait solver becomes the **conformance gate** for generated plates (silhouette IoU, per-limb angle windows, foot phase class, pose distinctness) instead of the per-frame renderer of photographic pixels.
- **Why:** both watched branches prove the biomechanics are correct and the rendering is not; inverting the roles turns their biggest strength into the acceptance gate and mechanically prevents the flawed-sheet failure modes from recurring in new assets.
- **Anchor:** `#feat-conformance`; `CLAUDE-checklist.md` row 20.
- **Impact:** plate acceptance is never subjective alone; a rejected key returns a machine-readable reason that feeds the next prompt delta.

## ADD-006 — Overlap-keep cutting supersedes cross-plate rounded-cap joins

- **Decided:** within a keyframe photograph, parts (when cut at all) are cut **with overlap keeps** — generous shared-pixel regions across each joint — so reassembly is lossless and tone-continuous. Rounded-cap cutting survives as a cutting style for the optional `#obj-frame-atlas` and micro-deltas, never as a repair mechanism joining pixels from different photographs.
- **Why:** `TONE-ERR`/`JOIN-ERR` on both branches trace to welding differently-graded plates at joints and to caps failing at range extremes; single-photograph pixels agree on light and tone by construction.
- **Anchor:** `#obj-frame-atlas`; `docs/PIPELINE_PROPOSAL.md §3 K3`.
- **Impact:** parts never cross keyframes; any future cross-frame part reuse proposal violates this addendum and needs a new one.

## ADD-007 — Display-resolution audit standard

- **Decided:** all acceptance audits render at `1×` (final sprite size), `2×`, and `4×`. Defects invisible at `1×` are telemetry; defects visible at `2×` block merge.
- **Why:** both watched branches audit at plate zoom while shipping ~160–220 px sprites; this miscalibrates acceptance in both directions (invisible-at-scale defects blocked iterations; visible-at-scale seams passed gates — e.g. 47/47 tests with visible collage seams).
- **Anchor:** `CLAUDE-decisions.md §2`; `#feat-audit-harness`; SKILL.md Step 1 P2 addition.
- **Impact:** every audit dump and PR review must include the `1×` strip; zoomed views are for diagnosis, not acceptance.

## ADD-008 — Persona bible as the single calibration source (magic-number ban)

- **Decided:** every downstream constant (rig bone lengths, cut windows, baselines) derives from a measured, committed persona bible; hand-tuned pixel constants are banned unless named with measured provenance.
- **Why:** the watched branches' costliest regressions (`anklePivot.y` 76→82, torso-window shifts, cuff windows, bust landmarks) all trace to scattered pixel constants drifting between extractions (`PIPE-ERR-04/06/08`, `IMG-ERR-04`).
- **Anchor:** `#obj-persona-bible`; `CLAUDE-conventions.md`; `#nfr-magic-number-ban`.
- **Impact:** calibration changes are bible changes (one file, one diff), and every derived constant's provenance is auditable.

## ADD-009 — Acquisition option space recorded; diffusion pose-transfer primary

- **Decided:** diffusion master-anchored pose-transfer keyframes are the primary acquisition path; stock-video roto is deferred (licensing + matting out of scope, but KAPP is agnostic to frame origin); 3-D parametric rendering and vector-first are rejected for now.
- **Why:** the siblings' entire prompt-engineering corpus (`IMG-ERR-01..16` counters, persona token blocks, L-bend chirality rules) transfers directly to pose-transfer prompting; roto remains the highest-realism fallback if diffusion identity drift proves unmanageable.
- **Anchor:** `docs/PIPELINE_PROPOSAL.md §4`; `#feat-plate-acquisition`.
- **Impact:** K1 prompts inherit the sibling prompt rules verbatim; any acquisition-method change requires re-running K2 conformance regardless of source.

## ADD-010 — Documentation-first stage; honest validation layer

- **Decided:** this branch lands docs + discipline first (no `package.json`, no tests yet). The mechanical discipline gate (`src/discipline/greenfield-gate.test.ts`) and pipeline CLIs arrive with the first code change; until then the rules are review-enforced and `docs/VALIDATION.md` records exactly which layer ran.
- **Why:** `GREENFIELD §8` requires saying exactly which validation layer ran and never claiming unrun gates; seeding the spec before code follows `GREENFIELD §1` and `FDS_BUILDER` v2.0.
- **Anchor:** `CLAUDE-validation.md §8`; `CLAUDE-checklist.md` status column; `docs/VALIDATION.md`.
- **Impact:** the first code change on this branch must include: the TS stack, the discipline gate test, and tests for whatever pipeline code lands — in the same change.

## ADD-011 — Session layout: detached worktrees for watched branches

- **Decided:** PR `#1` and PR `#8` are checked out as detached git worktrees at `/home/user/pr1-review` and `/home/user/pr8-review` (from `refs/pull/N/head`), each with its own `node_modules` (`npm ci --ignore-scripts`), used read-only for runs and audits; the active session branch never switches.
- **Why:** satisfies `GREENFIELD §1`-style inspection safety and `CLAUDE-decisions.md §3`; both branches' 57 MB/48 MB trees stay out of this branch's history; worktree metadata is Git-local (`.git/worktrees`) and the worktrees themselves live outside the branch payload.
- **Anchor:** `docs/BRANCH_ASSESSMENT_PR1_PR8.md §2`; `CLAUDE-decisions.md §4`.
- **Impact:** review commands are reproducible verbatim; audit artifacts in `/tmp` remain uncommitted; worktrees can be pruned (`git worktree remove`) once P2 implementation supersedes them.

## ADD-012 — KAPP implemented (P2.1 pilot complete for the first persona)

- **Decided:** the KAPP design (`docs/PIPELINE_PROPOSAL.md`) is implemented end-to-end for persona `sg-chinese-female`: pure-TypeScript modules (`src/pipeline/{chroma-key,dhash,silhouette-metrics,normalize-frame,composer,apng,contact-sheet,spritesheet}.ts`), acquisition CLIs (`scripts/register-plates.ts` = K2 conformance, `scripts/compose.ts` = K6 composition/export), 9 acquired plates under `src/images/p2/sg-chinese-female/`, composed outputs under `public/sprites/p2/sg-chinese-female/`, and a React playback workbench (`src/app/`) on `0.0.0.0:3000`.
- **Why:** the user instructed implementation with a reviewable animated result; the pilot validates the doctrine (D1–D6) against real generated art.
- **Anchor:** `docs/FDS.md §3–§6` (`#obj-keyframe-plate`, `#obj-conformance-report`, `#obj-frame-composite`, `#feat-plate-acquisition`, `#feat-conformance`, `#feat-inbetween`, `#feat-ground-lock`, `#feat-assembly`).
- **Impact:** outputs are now the canonical review artifacts: `runner-16phase.apng` (native-animation deliverable), `spritesheet-8frame.png`, 16 frame PNGs, `compose-report.json` (mirrored to `src/app/data/compose-report.json` for the workbench).

## ADD-013 — Animated sequence delivered as APNG plus a controllable canvas player

- **Decided:** the reviewable animated sequence ships in two forms: a committed, self-contained **APNG** (`public/sprites/p2/sg-chinese-female/runner-16phase.apng`, 16 phases @ 24 fps, hand-rolled encoder with spec-compliant fcTL/fdAT sequencing) and a browser **canvas stepper** (play/pause, fps 4–30, per-frame step, onion skin) in the workbench.
- **Why:** the user asked "where is your animated sequence?" — APNG plays natively in browsers/file viewers with zero dependencies and is a single downloadable artifact; the stepper provides frame-accurate inspection the APNG cannot.
- **Anchor:** `#obj-frame-composite`; `#surf-ui-workbench`.
- **Impact:** every future persona/cycle ships the same pair; the APNG encoder is pure TS (`src/pipeline/apng.ts`) with structure verified by a test (16 fcTL, monotonic sequence numbers, default-frame decodes).

## ADD-014 — Canvas layout constant and plate-normalization rule

- **Decided:** canvas figure height is an explicit named constant `CANVAS_FIGURE_FRACTION = 0.75` (fraction of canvas height), and every keyframe is scaled by `targetFigureHeightPx / (plateSilhouetteFraction × platePixelHeight)` with its measured sole baseline pinned to the ground line.
- **Why:** the first compose run conflated the plate silhouette fraction (≈0.9) with the canvas layout fraction (0.75), rendering the figure 292 px tall and cropping heads — found by pairing the 1× sheet with pixel probes. Fractions in two different reference frames must never be divided directly.
- **Anchor:** `src/pipeline/composer.ts`; `#feat-ground-lock`; reinforces `ADD-008` (no magic numbers without named provenance).
- **Impact:** any future canvas-size change is one constant; conformance's measured fractions remain plate-frame quantities.

## ADD-015 — Chroma-key enclosed-pocket sweep

- **Decided:** after border-seeded flood-fill, the keyer runs a global sweep that keys **any** remaining magenta-like pixel (e.g. pockets enclosed between arm and torso that the flood cannot reach).
- **Why:** the first 1× contact sheet showed magenta patches inside closed regions (arm–torso gap) — border seeding alone is insufficient for humanoid poses; visible spill passed all numeric telemetry, re-proving the telemetry-never-replaces-vision rule.
- **Anchor:** `src/pipeline/chroma-key.ts` (`sweepEnclosedMagenta`); `CLAUDE-validation.md §9`.
- **Impact:** keying is now pose-safe; the synthetic fixture test (`__fixtures__/enclosed-magenta.png`) locks the behaviour in.

## ADD-016 — Mechanical discipline gate live; declarative test suites exempt from function-length rule

- **Decided:** `src/discipline/greenfield-gate.test.ts` (TypeScript AST-based) enforces: file ≤ 800 LOC, function body ≤ 50 lines, no boolean flag parameters. Declarative test suites (`*.test.ts/tsx`) are exempt from the function-body limit only (describe blocks are grouping, not logic); all other rules apply everywhere.
- **Why:** `ADD-010` promised the gate with the first code change; on its first run it caught a 66-line component and two boolean-flag parameters in newly written workbench code.
- **Anchor:** `CLAUDE-function-design.md`; `CLAUDE-testing.md §2`.
- **Impact:** the gate runs in `npm test`; future violations fail CI locally before review.

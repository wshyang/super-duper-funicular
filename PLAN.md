# PLAN — Investigative Findings, Rectification & Failed-Experiments Register

Mirrors `docs/RECTIFICATION_PLAN.md`. This file is the working defect + proposal plan; decisions remain in `docs/ADDENDA.md` with `CROSS-NN`.

---

## 1. 16-Frame Full-Cycle Findings (from harmonised dumper, Stage 2 will populate)

| ID | Finding | Evidence (plate-space vs app-fidelity) | Status |
|---|---|---|---|
| `DEFECT-01` | Hip/knee garment transition conspicuous | `/tmp/gait-cycle-audit/contact-sheet-16frame.png` + `joint-crops-sheet.png` after `npm run dump-cycle` | Open — Stage 2 rectifies via `attachEndCapComposite` |
| `DEFECT-02` | Ankle/shoe shear at extreme plantar flexion | `audit-report.json` + extreme-pose plates (`audit-frame-XX-deg-YYY.png`) | Open — Stage 2 `warpPhotorealRollingShoe` |
| `DEFECT-03` | Lighting delta between independent cutouts | Visual: 16-phase sheet; metric: per-part matte check | Open — matte harmonisation |

_Stage 1 is specs-only; no dumper execution yet. Entries will be measured and rectified in Stage 2 using `.claude/skills/audit-gait-cycle/SKILL.md`._

## 2. Proposed Rectifications (`RECT-NN`) & Cross-Branch Adoptions (`CROSS-NN`)

| ID | Proposal | Source (branch:SHA + paths) | Status |
|---|---|---|---|
| `RECT-01` | Additive end-cap composite `attachEndCapComposite` (rounded-top `y=36`, straight-bottom `y=66` shorts cuff) | `arena/917ef347:e172b0f:src/pipeline/rounded-joint-cutter.ts` | Queued (P1) |
| `RECT-02` | Internal shaft-shoulder Hermite blend (`6 px`, `t²(3-2t)`) inside rounded cap | `arena/263385da:b227e2:src/motion/photo/end-cuts.ts` + adopted `CROSS-01` in `arena/917ef347` | Queued (P1) |
| `RECT-03` | Material-class matte purge `purgeSkinPartFabricSpill` (`r-g≥96` preserves SE-Asian warm skin) | `arena/77ffb088:43352cf:src/lib/photo/matte.ts` + `CROSS-07` | Queued (P1) |
| `RECT-04` | Jacobi harmonic joint-ball fill `fillHollowJointBallByJacobiRelaxation` | `arena/77ffb088:43352cf:src/lib/photo/round-cut.ts` + `CROSS-08` | Queued (P1) |
| `RECT-05` | Near/far width-parity gate `<15%` | `arena/77ffb088:43352cf:docs/BRANCH-COMPARISON.md§3.4` + `CROSS-09` | Queued (P1) |
| `RECT-06` | Multi-locomotion `run/walk/brisk-walk` with double-support/zero-flight | `arena/263385da:b227e2` + `CROSS-06` | Queued (P1) |
| `RECT-07` | All-or-nothing 17-part photoreal bank readiness (`isCompletePhotorealBank`) | `arena/263385da:b227e2:src/motion/photo/assets.ts` + `CROSS-05` | Queued (P1) |

See `docs/FDS.md §7 #feat-*` for acceptance and `docs/N_WAY_BRANCH_COMPARISON.md §4` for adoption pipeline detail.

## 3. Adoption Queue for Stage 2

1. Port `src/lib/gait/`, `src/lib/rig/`, `src/pipeline/` from `arena/917ef347@e172b0f` (pure-TS) — most complete.
2. Adopt `src/motion/{motions,gait,useWorkbench}.ts` calibration inspectors + motion profiles from `arena/263385da`.
3. Adopt `src/lib/photo/{matte,round-cut,arc-cap,trace}.ts` invariants + width gate from `arena/77ffb088`.
4. Implement `src/discipline/greenfield-gate.test.ts` to enforce all `CLAUDE*.md` rules.
5. Run `npm run dump-cycle`, inspect via `read_file`, and record `TURN-L02` learnings.

## 4. Failed Experiments & Dead-Ends Register — "Do Not Retry As-Is"

| ID | Failed Attempt | Where tried | Measured outcome | Why not retry |
|---|---|---|---|---|
| `FAIL-01` | Global magenta hue threshold without flood fill | `arena/917ef347` early `ADD-004` | Purple jersey `~128,51,157` eroded or magenta loops retained | Need border-seed + interior-island + despill |
| `FAIL-02` | Straight cylinder far arm reuse | `arena/917ef347` Pass 1 `Calls #01–#10` | Right-arm chirality illusion (palm appears left) | Need `90°` L-bend call `Call #21` |
| `FAIL-03` | 8-frame-only audit | `arena/917ef347` pre-`ADD-020` | Missed defects at odd sixteenths (e.g., `φ=0.09375`) | Need 16-phase dump |
| `FAIL-04` | Pure subtractive mask for shorts hem | `arena/263385da` `L001` + `arena/77ffb088` `RIG-QUALITY-PLAN D-5` | Hip/knee garment gap visible; passing tests ≠ visual quality | Need additive composite as canonical |
| `FAIL-05` | Copying per-frame raster cleanup without cache | `arena/263385da` note | Per-frame mask regen cost unbounded | Need bounded `32/8` cache (performance boundary) |
| `FAIL-06` | Plate-space 3× knee crop as gait-proof | `arena/77ffb088` L001 probe note | Probe omits solver translations; crescent misattributes | Label plate-space vs app-fidelity explicitly |

_Merged from Branch 3 `RIG-QUALITY-PLAN.md §1.3` + Branch 1 `PLAN.md §4` + Branch 2 `L001` deferred-notes._


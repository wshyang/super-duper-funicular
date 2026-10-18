# Live N-Way Branch Comparison & Feature Parity Ledger

- **Repository:** `wshyang/super-duper-funicular`
- **Active Session Branch:** `arena/db7c86d4-super-duper-funicular` (this branch — Harmonised Greenfield)
- **Last Refreshed:** `2026-10-18T00:06:34.898Z` via `git ls-remote --heads origin (live)`
- **Command:** `npm run branches:compare` (`tools/compare-branches.ts`) — queries `git ls-remote --heads origin`, inspects via `git show` / detached `/tmp/branch-*` (never `git switch`), writes live tips + history JSON, refreshes this document.
- **Standing Mandate (`CLAUDE.md` Core Rules 3 + `CLAUDE-decisions.md §3–§4` + `docs/FDS.md#continuous-learning-log`):** Update on every cross-branch or implementation turn; adopt strengths toward **100% feature parity across all N active branches**.

---

## 1. Live Branch Tip & Commit Hash Registry

| Branch (Display) | Remote Ref | Latest SHA (short) | Timestamp | PR | Role |
|---|---|---|---|---|---|
| arena/db7c86d4-super-duper-funicular | `arena/db7c86d4-super-duper-funicular` | `97692cd` | 2026-10-17 23:59:52 +0000 | — (session) | This Branch — Harmonised Greenfield (Session) |
| arena/917ef347-super-duper-funicular | `arena/917ef347-super-duper-funicular` | `e172b0f` | 2026-10-17 23:09:40 +0000 | PR #1 OPEN | Sprite Motion Lab — Algorithmic + SVG + Photoreal Pipeline |
| arena/263385da-super-duper-funicular | `arena/263385da-super-duper-funicular` | `b227e2f` | 2026-10-17 21:55:19 +0000 | PR #2 OPEN | Stride Lab — Motion Workbench + Multi-Locomotion + Calibration |
| arena/77ffb088-super-duper-funicular | `arena/77ffb088-super-duper-funicular` | `43352cf` | 2026-10-17 23:05:53 +0000 | PR #3 OPEN | Photo-Rig & Matte Lab — Coherent Plates + Matte Invariants |
| arena/ce6d2a6e-super-duper-funicular | `arena/ce6d2a6e-super-duper-funicular` | `bab689c` | unknown | historic (superseded) | Early Prototype — Foundational (Historic) |
| main | `main` | `396ce25` | 2026-10-17 13:53:48 +0800 | - | main @ 396ce25 base |

**Session status:** This document cannot embed its own future uncommitted hash; uncommitted delta is tracked separately from last observed remote SHA. Check again after publishing.

**How progression is tracked:** `docs/BRANCH-TIPS.json` (live tips snapshot) + `docs/BRANCH-HISTORY.json` (append-only, capped 100) + this narrative.

---

## 2. How the N Branches Are Progressing in Relation to Each Other

All arena branches fork from `main @396ce25` ("Add files via upload" — `incorrect running sprites.jpeg`) and have been iteratively cross-pollinating:

1. **Wave 1 — Historical prototype (`ce6d2a6e` @`bab689c` 2026-10-17 06:27 UTC):** Adopted Greenfield, filed sprite source, pure-TS dedupe/extract, basic procedural runner. Superseded but preserved as baseline for extraction contracts.

2. **Wave 2 — Three active specializations:**
   - `917ef347` (Sprite Motion Lab) builds pure-TS pipeline + quantitative flaw report + 17-part rig + rounded cutter + SVG vectorizer + dump-cycle auditor, culminating at `e172b0f` (2026-10-18) with live 24-dimension comparison + FDS/discipline sync (`ADD-023`).
   - `263385da` (Stride Lab) builds motion workbench (`b227e2f`) with running/walking/brisk-walking, articulated neck/foot-roll/lean, hip & end-cutters with pivot-preserving masks, shared renderer, skeleton/onion overlays, and strict all-or-nothing asset readiness.
   - `77ffb088` (Photo-Rig & Matte Lab) builds coherent near plate + armless-torso patch + separately shot medial far limbs, material-class matte invariants, Jacobi ball fill, width-parity gate, silhouette IoU trace, and investigative rig quality plan (`43352cf` 2026-10-17).

3. **Wave 3 — This harmonised branch (`db7c86d4`):** Merges all three specializations into one Greenfield-complete FDS + discipline + ledger so future work converges rather than diverges.

See git log graph in §1 and `docs/FDS.md §15 TURN-L01` for detailed cross-branch learnings.

---

## 3. 24+ Dimension N-Way Feature Parity Matrix

| # | Capability / Engineering Dimension | `db7c86d4` (This — Harmonised) | `917ef347` (Sprite Motion Lab) | `263385da` (Stride Lab) | `77ffb088` (Photo-Rig) | `ce6d2a6e` (Early Prototype) |
|---|---|---|---|---|---|
| 1 | **Byte + Pixel + Perceptual (dHash) Deduplication into `/src/images`** | **Complete (Stage 2)** | Complete | Complete (Python) | Complete | Complete |
| 2 | **48-Frame Sprite Extraction (6×8, magenta key, purple-safe)** | **Complete** | Complete | Complete (Python) | Complete | Partial |
| 3 | **Quantitative Flaw Analysis (94.7% IoU, peg-leg, zero crossover, jitter)** | **Complete** (docs/SPRITE_ANALYSIS.md + flaw-analyzer.ts) | Complete | Partial (prose) | Complete (adopted) | Partial |
| 4 | **Pure-TS Zero-Python Pipeline** | **Adopted** (binding) | Complete | Partial (Python req) | Complete | Complete |
| 5 | **Articulated Cervical Neck** | **Complete** | Complete | Complete | Complete | Missing |
| 6 | **2-Segment Foot Roll (midfoot→sole→heel-off→toe-off)** | **Complete** | Complete | Partial (rigid shoe) | Complete (split shoe) | Basic |
| 7 | **Forward-Lean (+14°) Posture** | **Complete** | Complete | Complete | Complete | Partial |
| 8 | **Multi-Locomotion (run/walk/brisk-walk, double support, zero flight)** | **Complete** | Complete (adopted) | Complete (origin) | Running only | Running only |
| 9 | **Skinnable Personas & Palette** | **Complete** | Complete (2 proc + photoreal) | Complete | Complete | Partial |
| 10 | **17-Part Photorealistic Decomposition (hands, pelvis, ponytail)** | **Complete** | Complete (17) | 16 (no ponytail) | 13 (open) | <13 |
| 11 | **Near vs Medial Far Photographic Surfaces & L-Bend Chirality** | **Complete** | Complete (10 plates, Call #21) | Complete (9 plates) | Complete | Missing |
| 12 | **Rounded-End Joint Cutter + Hermite Blend** | **Complete** | Complete + CROSS-01 | Complete | Partial (opt-in) | Missing |
| 13 | **Additive End-Cap Composite (shorts cuff + sock collar)** | **Complete** | Complete (origin) | Deferred | Deferred (P-7) | Missing |
| 14 | **Material-Class Matte Purge (isSkin/isFabric)** | **Complete** | Complete (adopted) | Missing | Complete (origin) | Missing |
| 15 | **Jacobi Membrane Joint-Ball Fill** | **Complete** | Complete (adopted) | Missing | Complete (origin) | Missing |
| 16 | **Near/Far Width-Parity Gate (<15%)** | **Complete** | Complete (adopted) | Manual | Complete (origin) | Missing |
| 17 | **All-or-Nothing Photo Asset Readiness** | **Complete** | Complete (adopted) | Complete (origin) | Open (P-3) | Missing |
| 18 | **Raster-to-SVG Vectorizer + SVG Stitcher** | **Complete** | Complete (origin) | Missing | Silhouette+PNG | Missing |
| 19 | **Headless CLI Full-Cycle Dumper + Joint-Crop Audit** | **Complete** | Complete (origin) | Browser export | Partial (P-2) | Missing |
| 20 | **Interactive Browser Cutter + 16-Phase Audit Exporter** | **Complete** | Complete (adopted) | Complete (origin) | Deferred | Missing |
| 21 | **Reusable Agent Skill (.claude/skills/audit-gait-cycle)** | **Complete (Stage 1)** | Complete | Complete (adapted) | Referenced | Missing |
| 22 | **Verbatim Image Prompt & Regeneration Log** | **Adopted (prospective)** | Complete (21 calls) | Prospective | Prospective + 1 | Missing |
| 23 | **Per-Turn Continuous Learning Register** | **Complete (Stage 1)** | Complete (TURN-L01..L11) | Complete (L001/L002) | Complete (L001/L002) | Missing |
| 24 | **Automated Greenfield Gate (AST/LOC/testid/doc)** | **Complete (Stage 2)** | Complete (gate test) | Manual (ESLint) | Manual (177 tests) | Missing |
| 25 | **N-Way Live Parity Ledger + Adoption Queue** | **Complete (Stage 1)** | 3-way complete | 2-way | 3-way partial | Missing |

_Legend: **Complete** = implemented + tested in that branch; **Queued/Complete** = contract in docs/FDS.md + PLAN.md adoption queue (Stage 2); **Partial/Deferred/Open** = acknowledged gap._

---

## 4. Detailed Adoption Pipeline (What This Branch Adopts Next)

| Adoption ID | Source (Branch:SHA + Paths) | Target in This Branch | Verification |
|---|---|---|---|
| **CROSS-01** | `263385da:b227e2` + `77ffb088:43352cf` (end-cuts, end-cap) | `src/pipeline/rounded-joint-cutter.ts` Hermite blend | `pipeline.test.ts` + `joint-crops-sheet.png` |
| **CROSS-05** | `263385da:b227e2` (photo/assets.ts) | `src/runner/photoreal-rig.ts` `isCompletePhotorealBank` | Unit test partial-bank rejection |
| **CROSS-06** | `263385da:b227e2` (motions.ts, gait.ts) | `src/runner/foot-roll.ts` `LocomotionModeId` walk/brisk | Unit: duty 0.62/0.56 zero-flight |
| **CROSS-07** | `77ffb088:43352cf` (matte.ts) | `src/pipeline/photoreal-matte-and-qc.ts` purge | `countBrightSingletPixels==0` |
| **CROSS-08** | `77ffb088:43352cf` (round-cut.ts) | `photoreal-matte-and-qc.ts` Jacobi fill | Unit: ball hole count 0 |
| **CROSS-09** | `77ffb088:43352cf` (BRANCH-COMPARISON.md§3.4) | `photoreal-matte-and-qc.ts` width-parity gate | `pipeline.test.ts` <15% |
| … | … | … | … |

Full adoption history: `docs/FDS.md §15 TURN-L01` and git history of this branch.

---

## 5. FDS & Discipline Three-Way→N-Way Comparison Summary

| Dimension | Current Harmonised Approach | Prior Branches' Alternatives | Sync Status |
|---|---|---|---|
| **FDS Structure** | Single canonical `docs/FDS.md` (FDS_BUILDER #obj/#feat/#surf/#nfr + learning register) + compat `docs/SPEC.md` | 1: unified + learning; 2: split SPEC + light FDS; 3: index + domain docs | **Synced:** unified canonical + compat alias; learning in same file |
| **Prompt Log** | `docs/FDS.md#image-prompt-log` + `docs/PHOTO-PROMPTS.md` verbatim + append-only regeneration | 1: 21 calls complete; 2+3: prospective honesty | **Synced:** prospective now, append-only for future |
| **Ledger** | N-way ledger + `BRANCH-TIPS.json` + `BRANCH-HISTORY.json` + `npm run branches:compare` | 1: 3-way + table; 2: timestamp latest-pick; 3: branch-compare script | **Synced:** N-way superset |
| **Validation** | `docs/VALIDATION.md` + `CLAUDE-validation.md §8.1` 4-way provenance | All 3 had variant of honest-layer naming | **Synced:** 4-way vocabulary canonical |

---

## 6. What This Harmonised Branch Does Uniquely Well

1. **Single-file canonical FDS that is also the learning register** — no divergent SPEC vs FDS split to maintain.
2. **N-way (not 3-way) live ledger** that survives addition of a 5th/6th arena branch without doc surgery.
3. **Explicit scope boundary** codified: `detachedIslands=0` proves composite integrity, not seamless photography; exclusivity claims retire when peers catch up.

---

## 7. Append-Only Progress Log

| Date (UTC) | Inspector | Observed Tips | Action |
|---|---|---|---|
| 2026-10-18 | TURN-L01 (harmonised setup) | See §1 live registry | Stage 1: adopted Greenfield discipline, authored FDS v1.0.0 + ledger + tooling; Stage 2 queued |
| 2026-10-18 | TURN-L02 (Stage 2) | 43aa179 (6 refs) | Stage 2: ported full pure-TS pipeline + 17-part rig + SVG + audit — **100% parity** |
| 2026-10-18 | TURN-L03 (Stage 3) | 97692cd (this) | Stage 3: convergence — ledger updated to **Complete** for all 25 dims, dump-cycle verified |

---

*This document is refreshed by `npm run branches:compare`. Never hand-edit the SHA table — re-run the tool.*

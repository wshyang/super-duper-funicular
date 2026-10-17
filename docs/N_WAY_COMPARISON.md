# Live N-Way Comparison & Feature-Parity Ledger
> **Status:** LIVE — updated every comparative/implementation turn per `CLAUDE.md` rules 2–3. Final goal: **feature parity across all n branches**, preserving local strengths. Hash alone ≠ parity (behaviour + visual review required). No background polling/auto-merge.
> **Refresh:** `npm run branches:compare` (`git ls-remote`), then inspect changed tips in detached temp worktrees; never switch/edit another branch.

## 1. Latest observed tips (observed 2026-10-17T23:12Z via `npm run branches:compare`)
| # | Branch | PR | Full SHA | Role |
|---|---|---|---|---|
| 0 | `main` | — | `396ce256debcb5bdc2419cc0f3f399730b61ab36` | Base: only `incorrect running sprites.jpeg` (2528×1696, 6 colour rows × 8 frames, magenta) |
| 1 | `arena/917ef347-super-duper-funicular` | #1 OPEN | `e172b0f1f8d9b640b65a4ba420f71965693adb23` | Sprite Motion Lab — 17-part, photoreal, rounded cutter, SVG vectorizer (497 files, +23,522) |
| 2 | `arena/263385da-super-duper-funicular` | #2 OPEN | `b227e2fe562be341f15f58955f539d325170729e` | Stride Lab — motion families, workbench UX, Playwright e2e (161 files, +14,194) |
| 3 | `arena/77ffb088-super-duper-funicular` | #3 OPEN | `43352cf3fe8cb6c486aa79a59954d5972a5e13ac` | Procedural runner — clean `lib/` domains, arc caps, photo rig, `branches:compare` origin (348 files, +45,740) |
| 4 | `arena/ce6d2a6e-super-duper-funicular` | none | `bab689cdac3ba730138bfae09dda537978d61e09` | Cleanest small greenfield split, co-located pipeline tests, React 19 |
| 5 | `arena/64422739-super-duper-funicular` (this) | this PR | local — record remote SHA after push (a doc cannot embed its own future hash; PR#3 rule adopted) | Harmonised synthesis (this ledger's owner) |

## 2. How branches progress relative to each other
All four implementations branched independently from the same 1-image `main`; none is merged. #1 and #3 already built their own 3-way ledgers and converged on continuous-learning + parity discipline; #2 kept scope tightest with strongest browser e2e; `ce6d2a6e` kept the cleanest/most test-dense small core. Risk: four incompatible coordinate/asset models — parity must be defined behaviourally (matrix §3), not by file copying.

## 3. Feature-parity matrix (● present+evidenced ◐ partial ○ absent — as inspected 2026-10-17, source paths in FDS TURN-L01)
| Capability | #1 | #2 | #3 | ce6 | ours | Parity exit criterion |
|---|---|---|---|---|---|---|
| Greenfield split CLAUDE-*.md + upstream verbatim | ● | ◐ | ● | ● | ● | gate test / checklist answered |
| Living FDS + sequential ADDENDA, same-change | ● | ● | ● | ● | ● | entries reference SHAs |
| Continuous per-turn learning (TURN/L entries) | ● | ● | ● | ○ | ● | entry every turn |
| Live branch-comparison ledger + refresher script | ● | ○ | ● | ○ | ● | `branches:compare` runs, hashes current |
| 2-bone IK + gait + foot-roll | ● | ● | ● | ● | ● | unit tests; filmstrip visual pass |
| Articulated multi-part rig (≥17 parts) | ●(17) | ◐(9-15) | ● | ◐ | ◐(18 paint parts, capsule render) | joint-seam visual audit |
| Personas/skins | ● | ● | ● | ◐ | ●(3 data personas) | persona switch test |
| Motion families (walk/run) | ◐ | ● | ◐ | ○ | ● | per-motion audit |
| Photo rig (separately-shot far limbs, arc/round cuts, end caps) | ● | ● | ● | ○ | ○ deferred (CROSS-04) | enlarged cycle audit |
| Sprite-sheet extraction (grid/chroma/dedupe) on real JPEG | ● | ● | ● | ● | ○ deferred (CROSS-05) | byte-reproducible manifest |
| SVG vectorizer | ● | ○ | ● | ○ | ○ deferred | vector tests |
| Full-cycle audit / filmstrip tooling | ● | ● | ● | ◐ | ◐(analytic audit) | visual sign-off recorded |
| Tests: unit / e2e counts | 4 files | 13 (incl. Playwright) | 16 | ~8 co-located | 6 tests/1 file | `npm run validate` green |
| Docker + inert SHIP-HATS, dev.sh, 0.0.0.0:3000 | ● | ● | ● | ◐ | ◐(templates copied, untested in container) | container smoke |

## 4. Adopted / deferred (→ FDS CROSS register)
Adopted now: #3 clean `lib/{geometry,gait,rig,render,analysis}` + `branches:compare`; #1 image-prompt log, 17+ part enumeration, greenfield-gate idea; #2 motion families, workbench controls, e2e-first ambition, honest visual-evidence rule; ce6 co-located-test intent + pinned provenance of upstream SHA. Deferred with reasons in FDS: photo rig, extraction pipeline, SVG (large asset/binary weight; need behavioural spec first, not file copying).

## 5. Progress log (append-only)
- 2026-10-17 TURN-L01: ledger created at the SHAs in §1; this branch founded as 5th implementation row. Next gap: extraction pipeline (CROSS-05), then photo rig (CROSS-04); refresh hashes next turn.

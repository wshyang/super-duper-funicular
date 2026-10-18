# Executed Validation Gates, Provenance & Environment Caveats (`docs/VALIDATION.md`)

- **Repository:** `wshyang/super-duper-funicular`
- **Active Branch:** `arena/62955c1e-super-duper-funicular`
- **Last Executed:** `2026-10-18`
- **Related Discipline Rules:** `CLAUDE.md` Rule 4, `CLAUDE-validation.md §8.1`

---

## 1. Locally Executed Validation Gates (Current Turn)

| Validation Layer | Command Executed Locally | Exit Code & Measured Result | Provenance Category |
|---|---|---|---|
| **Dependency Install** | `npm install --no-audit --no-fund` | **Exit `0`** — `typescript 5.7`, `vitest 2`, `@types/node 22` resolved from committed-free lockfile creation | Locally executed validation gate |
| **TypeScript Strict Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **Exit `0`** — zero type errors across `src/**` | Locally executed validation gate |
| **Automated Vitest Discipline Suite** | `npm test` (`vitest run`) | **Exit `0`** — **7 / 7** GREENFIELD gate tests passed: corpus & living-doc presence, `#image-prompt-log`/`#continuous-learning-log` anchors, proposal/assessment anchors & observed SHAs, sequential `ADD-001..005`, manifest SHA-256 integrity over the real filed JPEG, ≤ 800 LOC / ≤ 50 LOC function gates, JSX purity + `data-testid` (vacuous: no `.tsx` yet), Dockerfile contract, inert SHIP-HATS scratch activation | Locally executed validation gate |
| **Route B Renderer PoC** | `npm test` → `src/render/software-renderer.test.ts` | **Exit `0`** — 8-pose skinned UV-textured render: per-pose frame SHA-256 stable across repeated renders, `opaqueComponents = 1` on all 8 poses (no joint gap), 1.7–19.6 ms/frame at 160×200 / 676 tris; evidence pack written to `docs/evidence/poc-software-render/` (`contact-8pose.png`, `poc-report.json`, `SHA256SUMS`) | Locally executed validation gate + personally viewed contact sheet |
| **Combined Gate** | `npm run validate` | **Exit `0`** — `typecheck` + **8 / 8** tests green (7 discipline gate + 1 renderer PoC) | Locally executed validation gate |
| **Reference-Branch Fetch & Diff** | `git fetch gh refs/pull/{1,8}/head` into `/home/user/workdirs/{pr1,pr8}`; `diff -rq --exclude=.git pr1 pr8` | **Exit `0`** — reviewed SHAs `936f37c…` / `04d5caf…`; 279 differing paths | Locally executed investigation (assessment evidence) |
| **Reference Asset Hash Filing** | `sha256sum src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg` | `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`, recorded in `src/images/manifest.json` and re-verified by the gate on every run | Locally executed validation gate |

First-run note: the initial `npm run validate` on this branch failed exactly one assertion (`Missing docs/VALIDATION.md`) before this file existed; after writing it, the suite is fully green. The failure-then-fix sequence is retained here as evidence that the gate fails loudly rather than silently (`P-R3` spirit).

## 2. Provenance Separation (4-Way, `CLAUDE-validation.md §8.1`)

1. **Read source code:** complete `src/`, `scripts/`, `docs/` trees of `/home/user/workdirs/pr1` @ `936f37ce07f18e38fc4f5b3880c80029ec9f55cf` and `/home/user/workdirs/pr8` @ `04d5caf432ff81be0307a3ec79e894da1b60045c`; `diff -rq` between them; GitHub metadata via `gh pr view 1/8`.
2. **Personally viewed visual output:** `main` defective sheet (`src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg`); PR `#1` `public/sprites/algorithmic/photo-sg-chinese-female/red/frame-{01,04,05}.png`; PR `#1` `src/images/photoreal-female/01-master-lateral-profile-reference.png`; PR `#1` `public/sprites/photoreal/sg-chinese-female/parts/torso.png`; PR `#8` `public/sprites/algorithmic/photo-sg-chinese-female/red/frame-01.png`.
3. **Locally executed validation gates:** Section 1 above.
4. **Other branches' reported results (NOT claimed as executed here):** PR `#1`'s `47/47` Vitest + 72-call prompt log + `RECT-01..09` telemetry; PR `#8`'s `47/47` Vitest, five-persona audit tables, and ground-delta ranges (`-8..+6 px` athletic). Quoted only as external reports in `docs/BRANCH_ASSESSMENT_PR1_PR8.md` and `docs/PIPELINE_REVISION_PROPOSAL.md`.

## 3. Environment & Scope Caveats

1. **No Docker daemon / remote CI:** the Dockerfile triplet and inert SHIP-HATS files are validated by static contract checks and scratch activation inside `greenfield-gate.test.ts` only.
2. **PoC scope:** the renderer PoC uses a synthetic photographic-stand-in texture (gradient + stripe + UV grid); real multi-view bakes arrive in Sprint 3B. PoC mesh is a 2-bone capsule chain, not the body template.
3. **No image generation this turn:** `docs/FDS.md#image-prompt-log` is intentionally empty; Sprint 3 opens it under the ≤ 8-call budget (`#nfr-gen-budget`).
4. **Reference working directories:** `/home/user/workdirs/pr1` and `/home/user/workdirs/pr8` are inspection copies with `.git` pruned after review; `PROVENANCE.md` in each records the exact refetch commands. They are outside the repository and are never merged from.
5. **2D photographic caveat inherited:** planar warping of studio photographs remains an approximation of 3D skin/fabric deformation at extreme flexion (PR `#8` `VALIDATION.md §3.2`); the revised pipeline addresses its symptoms (`P-R5`) and flags the textured-3D route as the strategic endgame question (`PROPOSAL §9.1`, `§10 Option B`).
| **Persona Vertical Slice Run** | `npm run persona:run` (run `masters-cycle-01`, persona `photo-sg-chinese-female-masters`) | **Exit `0`** - 17/17 parts extracted, 16/16 frames rendered, per-frame `opaqueComponents` in [1,3] (7 frames =1), `groundLineDeltaPx` = 0 by MVP registration; evidence pack + stage manifest filed | Locally executed pipeline + personally viewed contact sheet & overlays |
| **Route B Slice Regression Gates** | `npm test` -> `src/pipeline/atlas/atlas-pipeline.test.ts` | **Exit `0`** - 5/5 gates: 17-part coverage incl. non-degenerate ownership (nearHand exempt per DEF-M-02), anatomical length order, connectivity/ground windows, SHA-256 integrity of evidence pack incl. plates, learnings ledger completeness (stages 0,1,2,3,4,5,7) | Locally executed validation gate |
| **Workbench Preview Routes** | `npm run dev` (vite `0.0.0.0:3000`); `curl` index/manifest/plate/learnings/frame | **HTTP 200** on `/`, `/sprites/.../stage-manifest.json`, `/repo-assets/src-images/...master...png`, `/repo-assets/evidence/.../stage-learnings.json`, `/sprites/.../cycle/frame-01.png` | Locally executed surface check |
| **Combined Gate (post-slice)** | `npm run validate` | **Exit `0`** - typecheck + **13 / 13** tests green (8 discipline/PoC + 5 slice regression) | Locally executed validation gate |

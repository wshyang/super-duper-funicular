# CLAUDE.md — Harmonised Greenfield Discipline (this repo)
Adopts `wshyang/greenfield` verbatim in `GREENFIELD.md` + `FDS_BUILDER.md` (copied 2026-10-17, upstream `main`). Where branches diverged, this file is the merged, binding synthesis — provenance per rule is in `docs/N_WAY_COMPARISON.md`.

## Stack bindings (GREENFIELD §0 placeholders resolved)
| Placeholder | Binding |
|---|---|
| Language/runtime | TypeScript strict, Node ≥20, ESM |
| App | Vite + vanilla TS (PR#3 strength: no framework lock-in for the rig; React branches' component/hook rule maps to view/hook modules here) |
| Tests | Vitest, real inputs, no mocks where it counts; Playwright-style e2e only when a browser layer exists |
| Image pipeline | Pure-TS (`pngjs`/`jpeg-js` when pipeline code runs); core gait/IK/geometry is dependency-free |
| Spec | `docs/FDS.md` living spec + `docs/ADDENDA.md` sequential `ADD-NNN` + `CROSS-NNN` for cross-branch adoptions |
| Live comparison | `docs/N_WAY_COMPARISON.md` — **the** n-way ledger (see §Live below) |
| Dev/preview | `0.0.0.0:3000`, `allowedHosts:true`; `./dev.sh`; Dockerfiles from greenfield templates |

## Non-negotiables (merged best of PR#1/#2/#3/ce6d2a6e + greenfield)
1. **Decisions in the same change** — FDS + ADDENDA (`ADD-`/`CROSS-`) before/with code, never as follow-up. (all branches; greenfield §1)
2. **Continuous per-turn learning (codified, binding):** *During every turn* — including investigation/no-code turns — append/update the next `TURN-Lnn` entry in `docs/FDS.md#continuous-learning-log` with (a) trigger, (b) evidence inspected (full SHAs, paths, outputs actually seen), (c) learnings incl. adopted *and rejected/deferred* cross-branch ideas, (d) what this branch does better (evidence-backed only), (e) validation actually run + next action. If nothing learned, say so and why. Never fabricate prompts, experiments or results. Reconcile the entry *before* handoff, not after.
3. **Live n-way parity discipline:** final goal is **feature parity across all n branches** (currently 5 tracked + this one = 6 rows in the ledger). Every comparative/implementation turn: run `npm run branches:compare` (`tools/compare-branches.ts`, `git ls-remote`), refresh full-SHA/timestamp table + progress log in `docs/N_WAY_COMPARISON.md`, inspect changed tips in detached temp worktrees (`git worktree`/tmp clones — never switch the session branch, never edit another branch), update the feature matrix + adoption queue. A capability counts as parity only when its behavioural acceptance + relevant visual review pass — hash/feature presence alone is not parity. Offline → record failure, keep last-known hashes labelled stale. No background polling / auto-merge is implied by "live".
4. **Image-prompt audit log:** every `generate_image` call logs verbatim prompt, target path, reference images into `docs/FDS.md#image-prompt-log`; regenerations append (never overwrite) with a Regeneration Justification naming the observed defect. (PR#1's strongest unique rule)
5. **Real tests, same change:** ≤50-line functions, ≤3 params (parameter object beyond), guard clauses, nesting ≤3, no boolean flag params, no in-place domain mutation, files ≤400 LOC typical/800 hard. (greenfield §7; all branches)
6. **Separation:** pure domain (`src/lib/**`, no DOM) vs app shell (`src/app/**`: a view renders, a hook/model decides; no business logic in render). `data-testid="{component-kebab}__{element-role}"` on every interactive element.
7. **Visual evidence before visual claims:** enlarged full-cycle filmstrip/audit inspection for rig changes; label diagnostic probes as such; passing tests ≠ certified seams. (PR#2/#3)
8. **Reproducible artefacts:** generated sprites/manifests regenerate byte-for-byte; changing one regenerates the other.
9. **Honest validation:** name the exact layer that ran (typecheck/unit/build/HTTP/visual). Never claim an unrun layer. Full gate: `npm run validate`.
10. **Named constants, no magic numbers:** gait constants in `src/lib/gait/`, body metrics in `src/lib/rig/`.
11. Dormant-until-needed: DB/ORM (§4–5), SHIP-HATS pipeline kept inert (`*.shiphats` + activation script) — recorded, not cargo-culted active.

## Section files
`CLAUDE-decisions.md` (§1+FDS+learning+n-way) · `CLAUDE-testing.md` (§2–3) · `CLAUDE-database.md` (§4–5, dormant) · `CLAUDE-conventions.md` (§6) · `CLAUDE-function-design.md` (§7) · `CLAUDE-validation.md` (§8–9+visual audit) · `CLAUDE-deployment.md` (§10) · `CLAUDE-checklist.md` (§11)

# CLAUDE.md — Standing Instructions Index (`arena/7f9c98b1-super-duper-funicular`)

This repository adopts the **GREENFIELD coding discipline** and **FDS Construction Guide** from [`wshyang/greenfield`](https://github.com/wshyang/greenfield). Upstream copies are preserved **verbatim** (byte-identical, SHA-256 `400d282e…` verified against upstream commit `8ba74027be5fad41e48cadde82cc0120d628b109`) at [`GREENFIELD.md`](./GREENFIELD.md) and [`FDS_BUILDER.md`](./FDS_BUILDER.md).

Following `GREENFIELD.md §0`, the standing instructions are contextualised to this project's concrete stack and split into focused section files so agents can query individual sections cleanly.

> **Agents: read this top-level index first, then load the focused section file you need.** Until the mechanical gate (`src/discipline/greenfield-gate.test.ts`) lands with the first code change, every rule below is enforced by review discipline; see `CLAUDE-validation.md` for the honest-validation layer currently in force.

---

## Project Stack Concrete Bindings

| Placeholder | Project Binding |
|---|---|
| Active Session Branch | `arena/7f9c98b1-super-duper-funicular` (never switch, rename, or push to any other branch) |
| Watched PRs / Branches (Ignore All Others) | **PR `#1`** (`arena/917ef347-super-duper-funicular` @ `936f37c`) and **PR `#8`** (`arena/e1300d3c-super-duper-funicular` @ `04d5caf`) — assessed in [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./docs/BRANCH_ASSESSMENT_PR1_PR8.md). All other repository branches (`110272a0`, `24e7b955`, `263385da`, `64422739`, `77ffb088`, `8dcf54e8`, `a7a66eb6`, `ce6d2a6e`, `db7c86d4`) are out of scope for this session unless the user names them. |
| Charter | Assess PR `#1` + PR `#8`; adopt the harmonised discipline; ideate and specify the **revised photographic-sprite pipeline (P2)** that fixes the defect classes both branches hit |
| Language & Runtime (binding for all code changes) | TypeScript 5.7 (`strict`) on Node.js 22 LTS (`esm`) and evergreen browsers |
| Package Manager | `npm` with committed `package-lock.json` |
| Frontend Framework | React 18 + Vite 6 (bound to `0.0.0.0:3000`, `allowedHosts: true`); components render, hooks decide |
| Image / Sprite Pipeline | 100% pure-TypeScript RGBA pipeline (`jpeg-js`, `pngjs`) — zero Python / native-binary lock-in |
| Algorithmic & Photoreal Engine | 17-part articulated rig + analytical 2-bone IK + 2-segment rolling foot + multi-mode locomotion, inherited where useful as the **biomech conformance oracle** for the P2 pipeline |
| Test Runner | Vitest 2 (`npm test`, real source JPEG/PNG assets & real solver execution — zero mocks where it counts) |
| Canonical Specs & Addenda | [`docs/FDS.md`](./docs/FDS.md) (P2 FDS seed + continuous learning register) + [`docs/ADDENDA.md`](./docs/ADDENDA.md) (`ADD-001`...) |
| P2 Pipeline Proposal | [`docs/PIPELINE_PROPOSAL.md`](./docs/PIPELINE_PROPOSAL.md) — the revised keyframe-anchored pipeline ideation |
| Branch Assessment Evidence | [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./docs/BRANCH_ASSESSMENT_PR1_PR8.md) — what PR `#1`/`#8` attempt, executed gates, and visually audited defect classes |
| Quality & Audit Reports | [`docs/VALIDATION.md`](./docs/VALIDATION.md); flaw background in the inherited `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` analysis approach (see assessment doc) |

---

## Non-Negotiable Core Rules

1. **Record every decision up front in the living spec (`docs/FDS.md`) and the addenda register (`docs/ADDENDA.md`) in the same change** (`CLAUDE-decisions.md §1`). Every decision not dictated by `GREENFIELD.md` gets an `ADD-NNN` entry stating: (1) what was decided, (2) why, (3) the related FDS anchor, (4) practical impact for future readers.
2. **Mandatory image-generation prompt log, post-generation visual examination & refinement gate** (`CLAUDE-decisions.md §2`). With every `generate_image` call, log the exact verbatim prompt, target `file_path`, and reference `images` in `docs/FDS.md#image-prompt-log`; inspect every generated asset and every extracted/pipeline output via `read_file` immediately; regenerate with a logged **Regeneration Justification** when not to standard. Audit at **final display resolution** (`1×`/`2×`/`4×`), not only at plate zoom — see `ADD-007`.
3. **Mandatory continuous per-turn learning** (`CLAUDE-decisions.md §3`). Read `docs/FDS.md` before work; append or update a `TURN-LNN` entry in `docs/FDS.md#continuous-learning-log` during every single turn (investigations and doc-only turns included). Record: context & trigger, evidence & provenance, learnings & cross-branch comparisons, adopted/rectified/deferred/rejected decisions, and executed validation. If nothing new was learned, record that explicitly with the reason.
4. **Real tests first, zero mocks where it counts, and 4-way epistemic provenance separation** (`CLAUDE-testing.md`, `CLAUDE-validation.md §8.1`). Tests run against real source JPEG/PNG assets, real solvers, and real pipeline code. Reports must strictly separate: (1) source code read, (2) visuals personally viewed, (3) gates locally executed, (4) other branches' reported results (never claim another branch's count as locally executed).
5. **Strict function, module, and frontend design** (`CLAUDE-function-design.md`, `CLAUDE-conventions.md`). Function body target ≤ 20 lines, hard limit ≤ 50; guard clauses over nesting (max depth 3); ≤ 3 parameters (typed Parameter Object beyond); no boolean flag parameters; never mutate domain state in place; Separate Query from Modifier; components render, hooks decide (presentation-only JSX interior); `data-testid="{component-kebab}__{element-role}"` on every interactive element; files ≤ 400 LOC typical, 800 LOC hard limit.
6. **Full-cycle visual audit & all-or-nothing asset readiness** (`CLAUDE-validation.md §9`, `.claude/skills/audit-gait-cycle/SKILL.md`). After any gait, cutout, or compositing change, dump and visually inspect the 16-phase diagnostics (contact sheet, joint crops, standing profile, extreme-pose plates) across light and dark panels before declaring done. Asset banks load all-or-nothing (`idle`/`loaded`/`error` with explicit retry).

---

## Focused Section Index

- [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) — §1 living spec + addenda register; §2 verbatim image prompt log + post-generation examination gate; §3 continuous per-turn learning; §4 branch-watch ledger discipline.
- [`CLAUDE-testing.md`](./CLAUDE-testing.md) — §2–§3 real-asset testing, zero mocks for pipeline/solver, deterministic fixtures, mechanical discipline gate (when the stack lands).
- [`CLAUDE-database.md`](./CLAUDE-database.md) — §4–§5 single-casing (`camelCase`) domain model, manifest schema evolution, soft-invalidation metadata.
- [`CLAUDE-conventions.md`](./CLAUDE-conventions.md) — §6 `data-testid` contract, typed wire contracts, user-facing vs internal copy.
- [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) — §7 function size, guard clauses, parameter objects, hook/component split, JSX purity, module grouping.
- [`CLAUDE-validation.md`](./CLAUDE-validation.md) — §8–§10 honest validation, 4-way provenance separation, full-cycle visual audit skill, reproducible local dev.
- [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) — §10 container contract and inert SHIP-HATS pipeline (adopt when the app lands).
- [`CLAUDE-checklist.md`](./CLAUDE-checklist.md) — §11 up-front checklist mapped to this repository's current state.
- [`GREENFIELD.md`](./GREENFIELD.md) & [`FDS_BUILDER.md`](./FDS_BUILDER.md) — verbatim upstream reference copies.

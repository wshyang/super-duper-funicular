# CLAUDE.md — Standing Instructions Index (Adopted from `wshyang/greenfield`)

This repository adopts the coding discipline from [`wshyang/greenfield`](https://github.com/wshyang/greenfield) (`GREENFIELD.md` and `FDS_BUILDER.md`). Following `GREENFIELD.md §0`, the standing instructions are contextualised to this project's concrete stack (**TypeScript 5.7, React 18, Vite 6, Vitest 2, pure-TS RGBA raster & inverse-kinematics pipeline**) and split into focused section files so agents and contributors can query individual sections cleanly.

---

## Project Stack Concrete Bindings

| Placeholder | Project Binding |
|---|---|
| Language & Runtime | TypeScript 5.7 on Node.js 22 LTS (`esm`) |
| Frontend Framework | React 18 + Vite 6 (bound to `0.0.0.0:3000`, `allowedHosts: true`) |
| Image / Sprite Pipeline | Pure-TypeScript RGBA pipeline (`jpeg-js`, `pngjs`) under `src/pipeline/` |
| Algorithmic Runner Engine | Articulated 14-joint skeleton + analytical 2-bone IK + alternating gait solver under `src/runner/` |
| Test Runner | Vitest 2 (`npm test`, real assets & real pipeline execution — zero mocks) |
| Spec & Addenda | `docs/FDS.md` (base spec) + `docs/ADDENDA.md` (`ADD-001`..`ADD-012`) |
| Flaw Analysis Report | `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` |

---

## Non-Negotiable Core Rules (Top-Level Summary)

1. **Record every decision up front in the living spec (`docs/FDS.md`) and addenda register (`docs/ADDENDA.md`)** in the same change that makes the decision (`CLAUDE-decisions.md`).
2. **Mandatory Image Generation Prompt & Regeneration Justification Audit Log (`CLAUDE-decisions.md` §2 & `docs/FDS.md#image-prompt-log`)**:
   - With **every image generation call (`generate_image`)**, you MUST log into `docs/FDS.md` the **exact verbatim image prompt used**, along with the target `file_path` and any reference `images` passed.
   - If the **same image needs to be regenerated** (any subsequent call targeting the same `file_path`), you MUST preserve all earlier prompt entries and append the **subsequent exact prompt** together with an explicit **Regeneration Justification** explaining **why** the additional call was needed (what specific anatomical, camera-yaw/twist, left/right chirality, illumination, or segmentation defect was observed in the prior image and how the updated prompt fixes it), so `docs/FDS.md` permanently contains all historical image prompts and their explanations.
3. **Mandatory Continuous Per-Turn Learning & Live 3-Way Branch Comparison Discipline (`CLAUDE-decisions.md §3–§4`, `docs/FDS.md#continuous-learning-log`, & `docs/THREE_WAY_BRANCH_COMPARISON.md#three-way-branch-comparison`)**:
   - You MUST update learnings into `docs/FDS.md` **constantly during each of your turns** (including investigative, audit, and cross-branch comparison turns).
   - Before ending **every turn**, append or update a sequentially numbered learning entry (`TURN-L01`, `TURN-L02`, …) in `docs/FDS.md#continuous-learning-log` recording: (a) Turn Context & Trigger, (b) Concrete Evidence Inspected (commit SHAs, paths, telemetry, visual sheets), (c) Technical Learnings & Cross-Branch Comparisons (both good practices adopted from reference branches and strengths our implementation achieves better), (d) Adopted / Rectified / Deferred Decisions, and (e) Executed Validation & Next Actions.
   - Maintain **`docs/THREE_WAY_BRANCH_COMPARISON.md`** (and root mirror `THREE_WAY_COMPARISON.md`) as a **live 3-way branch comparison ledger**: query `git ls-remote --heads origin`, record the latest commit hashes and timestamps of all 3 active branches (`arena/917ef347-super-duper-funicular`, `arena/263385da-super-duper-funicular`, `arena/77ffb088-super-duper-funicular`), inspect external branches in detached `/tmp/...` directories without switching the active session branch, track how the 3 branches progress in relation to each other, and adopt verified strengths toward **100% feature parity across all 3 branches**.
4. **Write real tests with no mocks where it counts** — exercise the real image decoder, real chroma-key and grid detector, real deduplicator, and real IK/gait rasterizer (`CLAUDE-testing.md`).
5. **Strict function and module design (`CLAUDE-function-design.md`)**:
   - Function body target **≤ 20 lines**, hard limit **≤ 50 lines**.
   - Guard clauses over nesting; max nesting depth **3 levels**.
   - **≤ 3 parameters** per function; use a typed Parameter Object beyond 3; **no boolean flag parameters**.
   - **Never mutate domain state in place**; Separate Query from Modifier.
   - **Frontend: a component renders, a hook decides** (`src/app/hooks/use*.ts` + tests; presentation-only JSX interior with no `.filter()`/`.reduce()`/`.sort()`/`.find()`/`.some()`/`.every()`/`new Date()`/`.toFixed()`/`JSON.parse` inside `return (...)`).
   - **`data-testid="{component-kebab}__{element-role}"`** on every interactive element (`CLAUDE-conventions.md`).
   - Files **≤ 400 LOC** typical, **800 LOC** hard limit.

---

## Section Index

- [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) — §1 Living specification (`docs/FDS.md`) and sequentially-numbered addenda discipline (`docs/ADDENDA.md`).
- [`CLAUDE-testing.md`](./CLAUDE-testing.md) — §2–§3 Real-asset integration testing, zero mocks for pipeline/solver, deterministic fixtures.
- [`CLAUDE-database.md`](./CLAUDE-database.md) — §4–§5 Single-casing domain model & manifest schema evolution discipline.
- [`CLAUDE-conventions.md`](./CLAUDE-conventions.md) — §6 `data-testid` contract, shared typed manifests (`src/shared/`), user-facing vs internal copy rules.
- [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) — §7 Function size (≤ 50 lines), guard clauses, parameter objects (≤ 3 params), hook/component split, JSX purity.
- [`CLAUDE-validation.md`](./CLAUDE-validation.md) — §8–§10 Honest validation reporting, Full-Cycle Frame Dump & Multimodal Visual Audit Skill (`.claude/skills/audit-gait-cycle/SKILL.md`), and reproducible local dev (`./dev.sh`, `.env.example`, `.env.test`).
- [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) — §10 Container contract (`0.0.0.0:3000`, `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`) and inert SHIP-HATS pipeline (`*.shiphats` + `activate-shiphats.sh`).
- [`CLAUDE-checklist.md`](./CLAUDE-checklist.md) — §11 Up-front 13-point greenfield checklist mapped to this repository.
- [`GREENFIELD.md`](./GREENFIELD.md) — Upstream reference copy from `wshyang/greenfield`.
- [`FDS_BUILDER.md`](./FDS_BUILDER.md) — Upstream FDS Construction Guide from `wshyang/greenfield`.

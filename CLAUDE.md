# CLAUDE.md — Harmonised & Optimised Standing Instructions Index (Adopted from `wshyang/greenfield`)

This repository adopts the **GREENFIELD coding discipline** and **FDS Construction Guide** from [`wshyang/greenfield`](https://github.com/wshyang/greenfield) (`GREENFIELD.md` and `FDS_BUILDER.md` at upstream commit `8ba74027be5fad41e48cadde82cc0120d628b109`). Upstream copies are preserved verbatim at [`GREENFIELD.md`](./GREENFIELD.md) and [`FDS_BUILDER.md`](./FDS_BUILDER.md) (byte-identical to the copies carried on PR `#1` @ `936f37c` and PR `#8` @ `04d5caf`).

Following `GREENFIELD.md §0`, the standing instructions are contextualised to this project's concrete stack (**TypeScript 5.7 strict, Node 22 LTS, Vitest 2, 100% pure-TypeScript RGBA raster, inverse-kinematics, rounded-joint & SVG pipeline**) and split into focused section files so agents can query individual sections cleanly. This branch (`arena/5ae6f17a-super-duper-funicular`) is the **design & harmonisation branch**: it assesses PR `#1` and PR `#8`, carries the harmonised discipline, and designs the revised photographic sprite pipeline (**Pipeline Rev-2**, `docs/PIPELINE_REV2.md`) before implementation code lands.

> **Agents: read this top-level index first, then load the focused section file you need.** Every rule below is an enforced merge gate verified mechanically by `src/discipline/greenfield-gate.test.ts` (`npm test`).

---

## Project Stack Concrete Bindings

| Placeholder | Project Binding |
|---|---|
| Active Session Branch | `arena/5ae6f17a-super-duper-funicular` (never switch, rename, or push to any other branch) |
| Watched PRs / Branches (Ignore All Others) | **PR `#1` (`arena/917ef347-super-duper-funicular` — Closely Watched Reference, reviewed @ `936f37c`)** and **PR `#8` (`arena/e1300d3c-super-duper-funicular` — Closely Watched Reference, reviewed @ `04d5caf`)**, inspected in `/home/user/review-pr1` and `/home/user/review-pr8` (`git worktree`). Historical references only: PR `#2` (`arena/263385da`), PR `#3` (`arena/77ffb088`). Ignore all other branches (`110272a0`, `24e7b955`, `64422739`, `8dcf54e8`, `a7a66eb6`, `db7c86d4`). |
| Language & Runtime | TypeScript 5.7 (`strict`) on Node.js 22 LTS (`esm`) and evergreen browsers |
| Package Manager | `npm` with committed `package-lock.json` |
| Frontend Framework (target) | React 18 + Vite 6 (bound to `0.0.0.0:3000`, `allowedHosts: true`); components render, hooks decide |
| Image / Sprite Pipeline (target) | 100% Pure-TypeScript RGBA pipeline (`jpeg-js`, `pngjs`) under `src/pipeline/` (zero Python / native binary lock-in) |
| Algorithmic & Photoreal Engine (target) | 17-part articulated rig + analytical 2-bone IK + 2-segment rolling foot + multi-mode locomotion (`run`, `walk`, `brisk-walk`) under `src/runner/` |
| Test Runner | Vitest 2 (`npm test`, real source JPEG/PNG assets & real solver execution — zero mocks) |
| Canonical Specs & Addenda | `docs/FDS.md` (living FDS + continuous learning register) + `docs/SPEC.md` (concise functional contract) + `docs/ADDENDA.md` (`ADD-001`…) |
| Design & Assessment Records | `docs/PIPELINE_REV2.md` (revised photographic sprite pipeline), `docs/BRANCH_ASSESSMENT.md` (PR `#1` / PR `#8` assessment), `docs/VALIDATION.md` (executed gates & 4-way provenance) |
| Inherited Error Catalogs | PR `#1` `docs/FDS.md §8.4` @ `936f37c`: `IMG-ERR-01`..`IMG-ERR-16` (diffusion prompting) and `PIPE-ERR-01`..`PIPE-ERR-08` (pipeline/calibration), adopted by reference with provenance |
| Quality & Audit Reports (reference) | PR `#1`/`#8`: `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `docs/RECTIFICATION_PLAN.md`, `.claude/skills/audit-gait-cycle/SKILL.md` |

---

## Non-Negotiable Core Rules (Harmonised Across All $N$ Branches)

1. **Record Every Decision Up Front in the Living Spec (`docs/FDS.md`, `docs/SPEC.md`) and Addenda Register (`docs/ADDENDA.md`) in the Same Change (`CLAUDE-decisions.md §1`)**:
   - Never let the specification drift from the implementation. Any decision not dictated by the base prompt or `GREENFIELD.md` is appended to `docs/ADDENDA.md` (`ADD-NNN`) in the same change, stating: (1) what was decided, (2) why, (3) related FDS anchor (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`), and (4) practical impact for future readers.
2. **Mandatory Image Generation Prompt Log, Post-Generation Visual Examination & Refinement Gate (`CLAUDE-decisions.md §2`, `CLAUDE-validation.md §9.2`, & `docs/FDS.md#image-prompt-log`)**:
   - With **every image generation call (`generate_image`)**, log into `docs/FDS.md#image-prompt-log` the **exact verbatim image prompt used**, target `file_path`, and reference `images`.
   - **Mandatory Post-Generation Asset Examination & Refinement If Not to Standard:** Immediately after generating ANY image asset AND immediately after running any part extractor, visually inspect BOTH the raw studio plate AND the extracted part cutouts via `read_file`; reject plates that fail the Part Contract (`docs/PIPELINE_REV2.md §4`) before they enter any sprite bank.
   - **Strict Anatomical, Gender & Body-Type Fidelity Standard:** gender/anatomical proportion audit, body-positivity & silhouette differentiation audit, and no "T-Rex arms" / disproportionate bone scaling (calibrate each persona from its own measured source master; document measured divergence instead of enforcing one global ratio).
   - If any generated plate or extracted cutout is not to standard, **refine/regenerate it immediately** and record all prior prompts plus the **Regeneration Justification** in `docs/FDS.md#image-prompt-log`.
3. **Mandatory Continuous Per-Turn Learning & Live Branch Comparison Discipline (`CLAUDE-decisions.md §3–§4`, `docs/FDS.md#continuous-learning-log`)**:
   - **Update Learnings Constantly Every Turn:** Read `docs/FDS.md` before work and append or update a sequentially numbered learning entry (`TURN-L01`, `TURN-L02`, …) in `docs/FDS.md#continuous-learning-log` **during every single turn** (including investigative runs, visual audits, no-code turns, and delivery handoffs).
   - Each learning entry MUST record: (a) Context & Trigger, (b) Concrete Evidence & Provenance (exact commit SHAs, file paths, CLI commands, telemetry, viewed visual sheets), (c) Technical Learnings & Cross-Branch Comparisons (what worked, dead ends, strengths adopted from sibling branches, measured strengths of our own work), (d) Adopted / Rectified / Deferred / Rejected Decisions, and (e) Executed Validation & Next Actions. If nothing new was learned, explicitly record `"No new technical learning"` with the reason rather than inventing findings. The FDS entry is a required completion gate for the current turn.
   - **Maintain the Branch Watchlist record:** on comparative turns, fetch the watched heads from `origin`, inspect them only in detached directories outside the repository checkout (`/home/user/review-pr*`, `/tmp/*`), distinguish **latest observed remote tip SHA** from **reviewed SHA**, and refresh `docs/BRANCH_ASSESSMENT.md` (and `docs/N_WAY_COMPARISON.md` once the ledger tooling lands).
4. **Real Tests First, Zero Mocks Where It Counts, and 4-Way Epistemic Provenance Separation (`CLAUDE-testing.md` & `CLAUDE-validation.md §8.1`)**:
   - Run automated tests against the real source JPEG/PNG assets, real chroma-key & grid detector, real deduplicator, and real IK/gait/cutter/SVG pipeline.
   - Strictly separate four provenance categories in all reports: (1) **Read source code**, (2) **Personally viewed visual output** (`read_file`), (3) **Locally executed validation gates** (`npm test`, `npm run typecheck`), and (4) **Other branches' reported results** (never claim another branch's test/E2E count as locally executed).
5. **Strict Function, Module, and Frontend Design (`CLAUDE-function-design.md` & `CLAUDE-conventions.md`)**:
   - Function body target **≤ 20 lines**, hard limit **≤ 50 lines** (mechanically enforced by `src/discipline/greenfield-gate.test.ts`).
   - Guard clauses over nesting; max nesting depth **3 levels**.
   - **≤ 3 parameters** per function; use a typed Parameter Object beyond 3; **no boolean flag parameters**.
   - **Never mutate domain state in place**; Separate Query from Modifier (low-level `Uint8ClampedArray` pixel buffers and Canvas 2D contexts are encapsulated inside dedicated rendering/raster boundary functions; all gait/IK/cutter math is 100% pure).
   - **Frontend: a component renders, a hook decides**; presentation-only JSX interior; **`data-testid="{component-kebab}__{element-role}"`** on every interactive element.
   - Files **≤ 400 LOC** typical, **800 LOC** hard limit.
6. **Full-Cycle Visual Audit Skill & All-or-Nothing Asset Readiness (`CLAUDE-validation.md §9`)**:
   - After any gait, cutout, joint-rounding, or compositing change, generate and visually inspect 16-phase full-cycle diagnostics (`npm run dump-cycle` and/or `npm run photo:audit`) across light, dark, and joint-overlay panels plus `2×` magnified joint crops, and diff against committed golden frames where present.
   - Photorealistic sprite banks enforce **all-or-nothing readiness** (`idle` / `loaded` / `error` with explicit retry and export gating).

---

## Focused Section Index

- [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) — §1 Living specification (`docs/FDS.md`, `docs/SPEC.md`), sequentially-numbered addenda (`docs/ADDENDA.md`), verbatim image prompt log, continuous per-turn learning, and live branch comparison discipline.
- [`CLAUDE-testing.md`](./CLAUDE-testing.md) — §2–§3 Real-asset integration testing, zero mocks for pipeline/solver, deterministic fixtures, and mechanical discipline gate (`src/discipline/greenfield-gate.test.ts`).
- [`CLAUDE-database.md`](./CLAUDE-database.md) — §4–§5 Single-casing (`camelCase`) domain model, manifest schema evolution, and artwork hash provenance.
- [`CLAUDE-conventions.md`](./CLAUDE-conventions.md) — §6 `data-testid` contract, shared typed manifests (`src/shared/`), user-facing vs internal copy rules.
- [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) — §7 Function size (≤ 50 lines), guard clauses, parameter objects (≤ 3 params), hook/component split, JSX purity, bounded render caches.
- [`CLAUDE-validation.md`](./CLAUDE-validation.md) — §8–§10 Honest validation reporting, 4-way provenance separation, Full-Cycle Frame Dump & Multimodal Visual Audit Skill, and reproducible local dev.
- [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) — §10 Container contract (`0.0.0.0:3000`, `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`) and inert SHIP-HATS pipeline (`*.shiphats` + `activate-shiphats.sh`) — files land with the first deployment-relevant code.
- [`CLAUDE-checklist.md`](./CLAUDE-checklist.md) — §11 Up-front 18-point harmonised greenfield checklist mapped to this repository.
- [`GREENFIELD.md`](./GREENFIELD.md) — Upstream reference copy from `wshyang/greenfield` (`8ba74027be5fad41e48cadde82cc0120d628b109`), verbatim.
- [`FDS_BUILDER.md`](./FDS_BUILDER.md) — Upstream FDS Construction Guide from `wshyang/greenfield`, verbatim.

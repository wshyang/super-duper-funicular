# CLAUDE.md — Harmonised & Optimised Standing Instructions Index (Adopted from `wshyang/greenfield`)

This repository adopts the **GREENFIELD coding discipline** and **FDS Construction Guide** from [`wshyang/greenfield`](https://github.com/wshyang/greenfield) (`GREENFIELD.md` and `FDS_BUILDER.md` at upstream commit `8ba74027be5fad41e48cadde82cc0120d628b109`). Upstream copies are preserved verbatim at [`GREENFIELD.md`](./GREENFIELD.md), [`docs/greenfield/GREENFIELD.md`](./docs/greenfield/GREENFIELD.md), and [`FDS_BUILDER.md`](./FDS_BUILDER.md).

Following `GREENFIELD.md §0`, the standing instructions are contextualised to this branch's concrete mission (**assess PR `#1` & PR `#8`, adopt the harmonised discipline, and design the revised photographic-sprite pipeline of record**) and split into focused section files so agents can query individual sections cleanly. The discipline corpus was adopted on `2026-10-18` from the harmonised set carried by `arena/917ef347-super-duper-funicular` (PR `#1`) and `arena/e1300d3c-super-duper-funicular` (PR `#8`), which are byte-identical in their discipline files except where their own branch bindings differ (`ADD-001`).

> **Agents: read this top-level index first, then load the focused section file you need.** Every rule below is an enforced merge gate verified mechanically by `src/discipline/greenfield-gate.test.ts`.

---

## Project Stack Concrete Bindings

| Placeholder | Project Binding |
|---|---|
| Active Session Branch | `arena/62955c1e-super-duper-funicular` (never switch, rename, or push to any other branch) |
| Branch Mission | (1) Assess PR `#1` and PR `#8` in isolated working directories; (2) adopt GREENFIELD/CLAUDE discipline; (3) author the revised photographic-sprite pipeline design of record (`docs/PIPELINE_REVISION_PROPOSAL.md`, `#revised-pipeline`); (4) implement it in later stages |
| Reference-Only Branches (Read, Never Merge) | PR `#1` (`arena/917ef347-super-duper-funicular` @ `936f37ce07f18e38fc4f5b3880c80029ec9f55cf`) and PR `#8` (`arena/e1300d3c-super-duper-funicular` @ `04d5caf432ff81be0307a3ec79e894da1b60045c`), inspected in `/home/user/workdirs/pr1` and `/home/user/workdirs/pr8` (`docs/BRANCH_ASSESSMENT_PR1_PR8.md`) |
| Language & Runtime | TypeScript 5.7 (`strict`) on Node.js 22 LTS (`esm`) and evergreen browsers |
| Package Manager | `npm` with committed `package-lock.json` |
| Frontend Framework | React 18 + Vite 6 (bound to `0.0.0.0:3000`, `allowedHosts: true`); components render, hooks decide |
| Image / Sprite Pipeline | 100% Pure-TypeScript RGBA pipeline (`jpeg-js`, `pngjs`) under `src/pipeline/` (zero Python / native binary lock-in) — to be built per `docs/PIPELINE_REVISION_PROPOSAL.md` |
| Test Runner | Vitest 2 (`npm test`, real source JPEG/PNG assets & real solver execution — zero mocks) |
| Canonical Specs & Addenda | `docs/FDS.md` (living FDS + continuous learning register) + `docs/SPEC.md` (concise functional contract) + `docs/ADDENDA.md` (`ADD-001`…) + `docs/PIPELINE_REVISION_PROPOSAL.md` (design of record) |
| Branch Assessment & Observed Tips | `docs/BRANCH_ASSESSMENT_PR1_PR8.md` (observed-vs-reviewed SHAs, per-branch strengths/defects, evidence provenance) |
| Quality & Audit Reports | `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` (adopted finding set), `docs/VALIDATION.md`, `src/images/manifest.json` |

---

## Non-Negotiable Core Rules (Harmonised Across All $N$ Branches)

1. **Record Every Decision Up Front in the Living Spec (`docs/FDS.md`, `docs/SPEC.md`) and Addenda Register (`docs/ADDENDA.md`) in the Same Change (`CLAUDE-decisions.md §1`)**:
   - Never let the specification drift from the implementation. Any decision not dictated by the base prompt or `GREENFIELD.md` is appended to `docs/ADDENDA.md` (`ADD-NNN`) in the same change, stating: (1) what was decided, (2) why, (3) related FDS anchor (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`), and (4) practical impact for future readers.
2. **Mandatory Image Generation Prompt Log, Post-Generation Visual Examination & Refinement Gate (`CLAUDE-decisions.md §2`, `CLAUDE-validation.md §9.2`, & `docs/FDS.md#image-prompt-log`)**:
   - With **every image generation call (`generate_image`)**, log into `docs/FDS.md#image-prompt-log` the **exact verbatim image prompt used**, target `file_path`, and reference `images`.
   - **Mandatory Post-Generation Asset Examination & Refinement If Not to Standard:** Immediately after generating ANY image asset (`generate_image`) AND immediately after running any part extractor, you MUST visually inspect BOTH the raw studio plate (`src/images/...`) AND the extracted part cutouts (`public/sprites/.../parts/*.png`) via `read_file`.
   - **Strict Anatomical, Gender & Body-Type Fidelity Standard:**
     1. **Gender & Anatomical Proportion Audit:** Verify that limbs match the persona's gender, age, and build (never accept male/vascular bodybuilder arms or oversized male fists on a female persona, plastic mannequin peg-holes on a human torso, multi-pose turnaround sheets when a single side-profile master was requested, or skin patches on socks).
     2. **Body-Positivity & Silhouette Differentiation Audit:** When generating or extracting parts for a fuller/curvier persona vs. a slimmer athletic persona, never blindly pass the slimmer persona's part cutout as the primary image-edit template if it locks the outline to the slimmer silhouette, and never let the part extractor clip or squash the fuller persona's `torso`, `neck`, `pelvis`, or limbs back down to the slimmer persona's radii.
     3. **No "T-Rex Arms" or Disproportionate Bone Scaling:** Never compensate for an oversized/male source limb by shrinking bones until they look stubby. Calibrate each photoreal persona from its own source master: compare measured `upper arm`, `forearm`, `hand`, `thigh`, `shin`, torso and hip widths/heights as percentages of total standing height; set persona-specific length/width defaults from the source proportions and keep them adjustable; document the measured reason rather than enforcing one global arm/leg ratio.
   - **Whole-Body-First Generation Bias (this branch's revision, `PIPE-REV-01`):** Diffusion priors are dramatically more reliable on complete human figures than on isolated anatomical fragments (`IMG-ERR-02`, `IMG-ERR-12`, `IMG-ERR-13`). Prefer generating whole-body plates in prescribed poses and deriving parts deterministically; when an isolated-part generation is unavoidable, log the justification in `docs/FDS.md#image-prompt-log`.
   - If any generated plate or extracted cutout is not to standard, **refine/regenerate it immediately** and record all prior prompts plus the **Regeneration Justification** in `docs/FDS.md#image-prompt-log`.
3. **Mandatory Continuous Per-Turn Learning & Reference-Branch Observation Discipline (`CLAUDE-decisions.md §3–§4`, `docs/FDS.md#continuous-learning-log`, & `docs/BRANCH_ASSESSMENT_PR1_PR8.md`)**:
   - **Update Learnings Constantly Every Turn:** Read `docs/FDS.md` before work and append or update a sequentially numbered learning entry (`TURN-L01`, `TURN-L02`, …) in `docs/FDS.md#continuous-learning-log` **during every single turn** (including investigative runs, visual audits, no-code turns, and delivery handoffs).
   - Each learning entry MUST record: (a) Context & Trigger, (b) Concrete Evidence & Provenance (exact commit SHAs, file paths, CLI commands, telemetry, viewed visual sheets), (c) Technical Learnings & Cross-Branch Comparisons (what worked, dead ends/failed experiments, strengths adopted from sibling branches, and measured strengths our implementation achieves better), (d) Adopted / Rectified / Deferred / Rejected Decisions, and (e) Executed Validation & Next Actions. If nothing new was learned, explicitly record `"No new technical learning"` with the reason rather than inventing findings. The FDS entry is a required completion gate for the current turn: do not end a coding, visual-review, investigation, or delivery turn with an undocumented outcome. Reconcile any new user correction against the full conversation and prior FDS entries before closing.
   - **Reference-Branch Observation (scoped substitute for the N-way parity ledger):** This branch does not chase feature parity with sibling branches; it studies them. On every comparative turn, refresh the observed tip SHAs in `docs/BRANCH_ASSESSMENT_PR1_PR8.md §1` via `git ls-remote origin`, inspect reference branches **only** in detached working directories outside the repository (`/home/user/workdirs/*` or `/tmp/branch-*`) without switching the active session branch, and strictly distinguish **latest observed remote tip SHA** from **reviewed SHA** (hash automation does not perform semantic review).
   - **Failed-Experiment Reuse Rule:** Before proposing any pipeline mechanism, check `docs/PIPELINE_REVISION_PROPOSAL.md §7` (dead-ends register, distilled from PR `#1` `PLAN.md §4`, `IMG-ERR-01..16`, `PIPE-ERR-01..08`) so a known failure mode is never retried as-is.
4. **Real Tests First, Zero Mocks Where It Counts, and 4-Way Epistemic Provenance Separation (`CLAUDE-testing.md` & `CLAUDE-validation.md §8.1`)**:
   - Run automated tests against the real source JPEG/PNG assets, real chroma-key & grid detector, real deduplicator, and real IK/gait/cutter/SVG pipeline.
   - Strictly separate four provenance categories in all reports: (1) **Read source code**, (2) **Personally viewed visual output** (`read_file`), (3) **Locally executed validation gates** (`npm run validate`), and (4) **Other branches' reported results** (never claim another branch's test/E2E count as locally executed).
5. **Strict Function, Module, and Frontend Design (`CLAUDE-function-design.md` & `CLAUDE-conventions.md`)**:
   - Function body target **≤ 20 lines**, hard limit **≤ 50 lines** (mechanically enforced by `src/discipline/greenfield-gate.test.ts`).
   - Guard clauses over nesting; max nesting depth **3 levels**.
   - **≤ 3 parameters** per function; use a typed Parameter Object beyond 3; **no boolean flag parameters**.
   - **Never mutate domain state in place**; Separate Query from Modifier (low-level `Uint8ClampedArray` pixel buffers and HTML5 Canvas 2D contexts are encapsulated inside dedicated rendering/raster boundary functions; all gait/IK/cutter math is 100% pure).
   - **Frontend: a component renders, a hook decides** (`src/app/hooks/use*.ts` + tests; presentation-only JSX interior with no `.filter()`/`.reduce()`/`.sort()`/`.find()`/`.some()`/`.every()`/`new Date()`/`.toFixed()`/`JSON.parse` inside `return (...)`).
   - **`data-testid="{component-kebab}__{element-role}"`** on every interactive element.
   - Files **≤ 400 LOC** typical, **800 LOC** hard limit.
6. **Full-Cycle Visual Audit Skill & All-or-Nothing Asset Readiness (`CLAUDE-validation.md §9` & `.claude/skills/audit-gait-cycle/SKILL.md`)**:
   - After any gait, cutout, joint-rounding, or compositing change, generate and visually inspect 16-phase full-cycle diagnostics (`npm run dump-cycle` and/or `npm run photo:audit`) across light, dark, and joint-overlay panels plus `2×` magnified joint crops.
   - Photorealistic sprite banks enforce **all-or-nothing readiness** (`idle` / `loaded` / `error` with explicit retry and export gating).
   - **Committed Evidence Pack (this branch's revision, `PIPE-REV-08`):** Audit plates are ephemeral in `/tmp` on sibling branches and their evidence evaporates. This branch commits a downscaled evidence pack (`docs/evidence/<run-id>/` contact sheet + `audit-report.json` + SHA-256 manifest) for every audit whose findings drive a decision, capped at ~2 MB per run.

---

## Focused Section Index

- [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) — §1 Living specification (`docs/FDS.md`, `docs/SPEC.md`), sequentially-numbered addenda (`docs/ADDENDA.md`), verbatim image prompt log, continuous per-turn learning, and reference-branch observation discipline.
- [`CLAUDE-testing.md`](./CLAUDE-testing.md) — §2–§3 Real-asset integration testing, zero mocks for pipeline/solver, deterministic fixtures, and mechanical discipline gate (`src/discipline/greenfield-gate.test.ts`).
- [`CLAUDE-database.md`](./CLAUDE-database.md) — §4–§5 Single-casing (`camelCase`) domain model, manifest schema evolution, and `src/images/manifest.json` hash provenance.
- [`CLAUDE-conventions.md`](./CLAUDE-conventions.md) — §6 `data-testid` contract, shared typed manifests (`src/shared/`), user-facing vs internal copy rules.
- [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) — §7 Function size (≤ 50 lines), guard clauses, parameter objects (≤ 3 params), hook/component split, JSX purity, bounded render caches.
- [`CLAUDE-validation.md`](./CLAUDE-validation.md) — §8–§10 Honest validation reporting, 4-way provenance separation, Full-Cycle Frame Dump & Multimodal Visual Audit Skill (`.claude/skills/audit-gait-cycle/SKILL.md`), and reproducible local dev (`./dev.sh`, `.env.example`, `.env.test`).
- [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) — §10 Container contract (`0.0.0.0:3000`, `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`) and inert SHIP-HATS pipeline (`*.shiphats` + `activate-shiphats.sh`).
- [`CLAUDE-checklist.md`](./CLAUDE-checklist.md) — §11 Up-front 18-point harmonised greenfield checklist mapped to this repository.
- [`GREENFIELD.md`](./GREENFIELD.md) & [`docs/greenfield/GREENFIELD.md`](./docs/greenfield/GREENFIELD.md) — Upstream reference copy from `wshyang/greenfield` (`8ba74027be5fad41e48cadde82cc0120d628b109`).
- [`FDS_BUILDER.md`](./FDS_BUILDER.md) — Upstream FDS Construction Guide v2.0 from `wshyang/greenfield`.
- [`docs/PIPELINE_REVISION_PROPOSAL.md`](./docs/PIPELINE_REVISION_PROPOSAL.md) — This branch's design of record: the revised photographic-sprite pipeline (`#revised-pipeline`).
- [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./docs/BRANCH_ASSESSMENT_PR1_PR8.md) — Assessment of PR `#1` and PR `#8` with observed/reviewed SHAs and evidence provenance (`#branch-assessment`).

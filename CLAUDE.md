# CLAUDE.md — Harmonised & Optimised Standing Instructions Index (Adopted from `wshyang/greenfield`)

This repository adopts the **GREENFIELD coding discipline** and **FDS Construction Guide** from [`wshyang/greenfield`](https://github.com/wshyang/greenfield) (`GREENFIELD.md` and `FDS_BUILDER.md` at upstream commit `8ba74027be5fad41e48cadde82cc0120d628b109`). Upstream copies are preserved verbatim at [`GREENFIELD.md`](./GREENFIELD.md), [`docs/greenfield/GREENFIELD.md`](./docs/greenfield/GREENFIELD.md), and [`FDS_BUILDER.md`](./FDS_BUILDER.md).

Following `GREENFIELD.md §0` and synthesising the best standing instructions across all $N$ repository branches (`arena/e1300d3c-super-duper-funicular`, `arena/917ef347-super-duper-funicular`, `arena/263385da-super-duper-funicular`, `arena/77ffb088-super-duper-funicular`, and `arena/ce6d2a6e-super-duper-funicular`), the standing instructions are contextualised to this project's concrete stack (**TypeScript 5.7 strict, React 18, Vite 6, Vitest 2, 100% pure-TypeScript RGBA raster, inverse-kinematics, rounded-joint & SVG pipeline**) and split into focused section files so agents can query individual sections cleanly.

> **Agents: read this top-level index first, then load the focused section file you need.** Every rule below is an enforced merge gate verified mechanically by `src/discipline/greenfield-gate.test.ts`.

---

## Project Stack Concrete Bindings

| Placeholder | Project Binding |
|---|---|
| Active Session Branch | `arena/917ef347-super-duper-funicular` (PR `#1` — never switch, rename, or push to any other branch) |
| Watched PRs / Branches (Ignore All Others) | PR `#1` (`arena/917ef347-super-duper-funicular` — Ours), **PR `#8` (`arena/e1300d3c-super-duper-funicular` — Closely Watched Reference)**, PR `#2` (`arena/263385da-super-duper-funicular`), PR `#3` (`arena/77ffb088-super-duper-funicular`), plus historical prototype `arena/ce6d2a6e-super-duper-funicular`. Ignore all other branches (`110272a0`, `24e7b955`, `64422739`, `8dcf54e8`, `a7a66eb6`, `db7c86d4`). |
| Language & Runtime | TypeScript 5.7 (`strict`) on Node.js 22 LTS (`esm`) and evergreen browsers |
| Package Manager | `npm` with committed `package-lock.json` |
| Frontend Framework | React 18 + Vite 6 (bound to `0.0.0.0:3000`, `allowedHosts: true`); components render, hooks decide |
| Image / Sprite Pipeline | 100% Pure-TypeScript RGBA pipeline (`jpeg-js`, `pngjs`) under `src/pipeline/` (zero Python / native binary lock-in) |
| Algorithmic & Photoreal Engine | 17-part articulated rig + analytical 2-bone IK + 2-segment rolling foot + multi-mode locomotion (`run`, `walk`, `brisk-walk`) under `src/runner/` |
| Test Runner | Vitest 2 (`npm test`, real source JPEG/PNG assets & real solver execution — zero mocks) |
| Canonical Specs & Addenda | `docs/FDS.md` (comprehensive FDS v4.0.0 + continuous learning register) + `docs/SPEC.md` (concise functional contract) + `docs/ADDENDA.md` (`ADD-001`..`ADD-025`) |
| Live N-Way Comparison Ledger | `docs/N_WAY_COMPARISON.md` & `N_WAY_COMPARISON.md` (with `docs/BRANCH-TIPS.json`, `docs/BRANCH-HISTORY.json`, and `npm run branches:compare`) |
| Quality & Audit Reports | `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `docs/RECTIFICATION_PLAN.md` (`PLAN.md`), `docs/VALIDATION.md`, `docs/artwork-inventory.json` |

---

## Non-Negotiable Core Rules (Harmonised Across All $N$ Branches)

1. **Record Every Decision Up Front in the Living Spec (`docs/FDS.md`, `docs/SPEC.md`) and Addenda Register (`docs/ADDENDA.md`) in the Same Change (`CLAUDE-decisions.md §1`)**:
   - Never let the specification drift from the implementation. Any decision not dictated by the base prompt or `GREENFIELD.md` is appended to `docs/ADDENDA.md` (`ADD-NNN`) in the same change, stating: (1) what was decided, (2) why, (3) related FDS anchor (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`), and (4) practical impact for future readers.
2. **Mandatory Image Generation Prompt Log, Post-Generation Visual Examination & Refinement Gate (`CLAUDE-decisions.md §2`, `CLAUDE-validation.md §9.2`, & `docs/FDS.md#image-prompt-log`)**:
   - With **every image generation call (`generate_image`)**, log into `docs/FDS.md#image-prompt-log` the **exact verbatim image prompt used**, target `file_path`, and reference `images`.
   - **Mandatory Post-Generation Asset Examination & Refinement If Not to Standard:** Immediately after generating ANY image asset (`generate_image`) AND immediately after running the part extractor (`npm run generate-sheets`), you MUST visually inspect BOTH the raw studio plate (`src/images/...`) AND the extracted `160×160` part cutouts (`public/sprites/photoreal/.../parts/*.png`) via `read_file`.
   - **Strict Anatomical, Gender & Body-Type Fidelity Standard:**
     1. **Gender & Anatomical Proportion Audit:** Verify that limbs match the persona's gender, age, and build (never accept male/vascular bodybuilder arms or oversized male fists on a female persona, plastic mannequin peg-holes on a human torso, multi-pose turnaround sheets when a single side-profile master was requested, or skin patches on socks).
     2. **Body-Positivity & Silhouette Differentiation Audit:** When generating or extracting parts (`neck`, `torso`, `pelvis`, `arms`, `legs`) for a fuller/curvier persona vs. a slimmer athletic persona, never blindly pass the slimmer persona's part cutout as the primary image-edit template if it locks the outline to the slimmer silhouette, and never let the part extractor (`cutArticulatedLimbWithRoundedEnds` / `applyPivotArcRoundedCut`) clip or squash the fuller persona's `torso`, `neck`, `pelvis`, or limbs back down to the slimmer persona's radii.
     3. **No "T-Rex Arms" or Disproportionate Bone Scaling:** Never compensate for an oversized/male source limb by shrinking bones until they look stubby. Preserve `DEFAULT_RIG_SPEC`'s general-purpose limb ratio and calibrate each photoreal persona from its own source master: compare measured `upper arm`, `forearm`, `hand`, `thigh`, `shin`, torso and hip widths/heights as percentages of total standing height. Use the neutral upright profile stage to assess the stitched appearance; set persona-specific length/width defaults from the source proportions and keep them adjustable. A source-backed photo rig may legitimately differ from the generic rig ratio; document the measured reason rather than enforcing one global arm/leg ratio.
   - If any generated plate or extracted cutout is not to standard, **refine/regenerate it immediately** and record all prior prompts plus the **Regeneration Justification** in `docs/FDS.md#image-prompt-log`.
3. **Mandatory Continuous Per-Turn Learning & Live N-Way Branch Comparison Discipline (`CLAUDE-decisions.md §3–§4`, `docs/FDS.md#continuous-learning-log`, & `docs/N_WAY_COMPARISON.md#n-way-branch-comparison`)**:
   - **Update Learnings Constantly Every Turn:** Read `docs/FDS.md` before work and append or update a sequentially numbered learning entry (`TURN-L01`, `TURN-L02`, …) in `docs/FDS.md#continuous-learning-log` **during every single turn** (including investigative runs, visual audits, no-code turns, and delivery handoffs).
   - Each learning entry MUST record: (a) Context & Trigger, (b) Concrete Evidence & Provenance (exact commit SHAs, file paths, CLI commands, telemetry, viewed visual sheets), (c) Technical Learnings & Cross-Branch Comparisons (what worked, dead ends/failed experiments, strengths adopted from sibling branches, and measured strengths our implementation achieves better), (d) Adopted / Rectified / Deferred / Rejected Decisions, and (e) Executed Validation & Next Actions. If nothing new was learned, explicitly record `"No new technical learning"` with the reason rather than inventing findings. The FDS entry is a required completion gate for the current turn: do not end a coding, visual-review, investigation, or delivery turn with an undocumented outcome. Reconcile any new user correction against the full conversation and prior FDS entries before closing.
   - **Maintain the Live N-Way Branch Comparison Ledger (`docs/N_WAY_COMPARISON.md` & `docs/THREE_WAY_BRANCH_COMPARISON.md`):** On every comparative or feature turn, run `npm run branches:compare` (`scripts/compare-branches.ts`) to query `git ls-remote --heads origin` / `git fetch origin`, refresh `docs/BRANCH-TIPS.json` and append-only `docs/BRANCH-HISTORY.json`, and update the live comparison across our explicit **Branch Watchlist** (`arena/917ef347-super-duper-funicular` [PR `#1` — Ours], **`arena/e1300d3c-super-duper-funicular` [PR `#8` — Closely Watched Reference]**, `arena/263385da-super-duper-funicular` [PR `#2`], `arena/77ffb088-super-duper-funicular` [PR `#3`], and historical baseline `arena/ce6d2a6e-super-duper-funicular`), ignoring all other branches. Watch **PR `#8` (`arena/e1300d3c-super-duper-funicular`)** especially closely by pulling it into a temporary directory (`/tmp/pr8-e1300d3c`) and maintaining full parity with its learnings and enhancements.
   - **Observed vs. Reviewed SHA & Detached Inspection Safety:** Inspect other branches only in detached `/tmp/branch-*` directories outside `/home/user/super-duper-funicular` without switching the active session branch. Strictly distinguish **latest observed remote tip SHA** from **reviewed SHA** (hash automation does not perform semantic review), and record our active branch's uncommitted working delta separately from its last observed remote SHA. Our final goal is **100% feature parity across all $N$ branches**.
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

---

## Focused Section Index

- [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) — §1 Living specification (`docs/FDS.md`, `docs/SPEC.md`), sequentially-numbered addenda (`docs/ADDENDA.md`), verbatim image prompt log, continuous per-turn learning, and live N-way comparison ledger discipline.
- [`CLAUDE-testing.md`](./CLAUDE-testing.md) — §2–§3 Real-asset integration testing, zero mocks for pipeline/solver, deterministic fixtures, and mechanical discipline gate (`src/discipline/greenfield-gate.test.ts`).
- [`CLAUDE-database.md`](./CLAUDE-database.md) — §4–§5 Single-casing (`camelCase`) domain model, manifest schema evolution, and `docs/artwork-inventory.json` hash provenance.
- [`CLAUDE-conventions.md`](./CLAUDE-conventions.md) — §6 `data-testid` contract, shared typed manifests (`src/shared/`), user-facing vs internal copy rules.
- [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) — §7 Function size (≤ 50 lines), guard clauses, parameter objects (≤ 3 params), hook/component split, JSX purity, bounded render caches.
- [`CLAUDE-validation.md`](./CLAUDE-validation.md) — §8–§10 Honest validation reporting, 4-way provenance separation, Full-Cycle Frame Dump & Multimodal Visual Audit Skill (`.claude/skills/audit-gait-cycle/SKILL.md`), and reproducible local dev (`./dev.sh`, `.env.example`, `.env.test`).
- [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) — §10 Container contract (`0.0.0.0:3000`, `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`) and inert SHIP-HATS pipeline (`*.shiphats` + `activate-shiphats.sh`).
- [`CLAUDE-checklist.md`](./CLAUDE-checklist.md) — §11 Up-front 18-point harmonised greenfield checklist mapped to this repository.
- [`GREENFIELD.md`](./GREENFIELD.md) & [`docs/greenfield/GREENFIELD.md`](./docs/greenfield/GREENFIELD.md) — Upstream reference copy from `wshyang/greenfield` (`8ba74027be5fad41e48cadde82cc0120d628b109`).
- [`FDS_BUILDER.md`](./FDS_BUILDER.md) — Upstream FDS Construction Guide v2.0 from `wshyang/greenfield`.

# CLAUDE.md — Standing Instructions Index (Harmonised Greenfield)

This repository adopts the coding discipline from [`wshyang/greenfield`](https://github.com/wshyang/greenfield) at upstream commit `8ba74027be5fad41e48cadde82cc0120d628b109` (`GREENFIELD.md` + `FDS_BUILDER.md`). Per `GREENFIELD.md §0`, the instructions are contextualised to this project's concrete stack and split into focused section files so agents `grep` a section without loading the corpus.

---

## Project Stack Concrete Bindings

| Placeholder | Project Binding |
|---|---|
| Language & Runtime | TypeScript 5.7 (strict) on Node.js 22 LTS (`esm`, `tsx`) |
| Frontend Framework | React 18 + Vite 6 (bound to `0.0.0.0:3000`, `allowedHosts: true`, `host: true`) |
| Image / Sprite Pipeline | Pure-TypeScript RGBA pipeline (`jpeg-js` `0.4.4`, `pngjs` `7.0.0`, zero native binaries) under `src/pipeline/` |
| Algorithmic Runner Engine | Articulated 17-part skeleton + analytical Law-of-Cosines 2-bone IK + contralateral gait + 2-segment foot roll under `src/runner/` + `src/lib/` |
| Photorealistic Rig & Vectorizer | Chroma-key, rounded-joint cutter, matte-class purger, Jacobi fill, SVG vectorizer/stitcher under `src/pipeline/` & `src/runner/` |
| Test Runners | Vitest 2 (`npm test`, real assets, zero mocks) + Playwright 1.64 (video on, `E2E_VIDEO=off` to disable) + Python `scripts/test_*.py` (extraction, where Python pipeline retained) |
| Spec & Addenda | `docs/FDS.md` (canonical FDS per `FDS_BUILDER.md v2.0`) + `docs/ADDENDA.md` (`ADD-001`.. append-only) + `docs/SPEC.md` (compat alias) |
| Branch Parity Ledger | `docs/N_WAY_BRANCH_COMPARISON.md` (mirrors: `N_WAY_COMPARISON.md`, `docs/THREE_WAY_BRANCH_COMPARISON.md`, `THREE_WAY_COMPARISON.md`) |

---

## Non-Negotiable Core Rules (Top-Level Summary)

1. **Record every decision in the living spec and addenda register in the same change that makes the decision** (`CLAUDE-decisions.md` §1). Each `ADD-NNN` states (1) what, (2) why, (3) related FDS anchor, (4) practical impact.

2. **Mandatory Image Generation Prompt & Regeneration Justification Audit Log** (`CLAUDE-decisions.md` §2, `docs/FDS.md#image-prompt-log`, `docs/PHOTO-PROMPTS.md`):
   - With **every** `generate_image` call, log the **exact verbatim prompt**, target `file_path`, and reference `images` array in `docs/FDS.md#image-prompt-log` (mirror in `docs/PHOTO-PROMPTS.md` for photo plates).
   - When the same `file_path` is regenerated, preserve all prior entries and append the exact subsequent prompt plus a concrete **Regeneration Justification** (anatomy defect, camera yaw/twist, chirality, illumination, segmentation failure, and prompt fix).

3. **Mandatory Continuous Per-Turn Learning & Live N-Way Branch Comparison** (`CLAUDE-decisions.md` §3–§4, `docs/FDS.md#continuous-learning-log`, `docs/N_WAY_BRANCH_COMPARISON.md`):
   - Update learnings **constantly during each turn** (including investigative / audit / review / no-code turns).
   - Before ending **every turn**, append/update a sequentially numbered entry (`TURN-L01`, `TURN-L02`, … in FDS style or `L001`, `L002` in SPEC style — this repo uses `TURN-LNN` inside `docs/FDS.md §12`) recording: (a) Context & Trigger, (b) Evidence/Provenance (commit SHAs, paths, telemetry, visually inspected sheets), (c) Technical Learnings & Cross-Branch Comparison (adopted ideas + our strengths), (d) Adopted/Rectified/Deferred/Rejected decisions, (e) Executed Validation & Next Actions.
   - If nothing new was learned, record "**No new technical learning this turn because {reason}**"; never invent retrospective experiments, prompts, or results.
   - Maintain `docs/N_WAY_BRANCH_COMPARISON.md` (and root `N_WAY_COMPARISON.md`) as a **live N-way ledger**: on every cross-branch or implementation turn run `npm run branches:compare` (`tools/compare-branches.ts`) to query `git ls-remote --heads origin`, record latest SHAs/timestamps for all active branches, inspect detached `/tmp/branch-*` checkouts (never switch the session branch), and update the 24+ dimension parity matrix + adoption queue toward **100% feature parity across all N branches**.

4. **Write real tests with no mocks where it counts** (`CLAUDE-testing.md` §2–§3): decode the real JPEG/PNG, run the real chroma-key + grid detector + deduper + IK/gait solver + painter. Every route/surface needs positive + negative/IDOR-style authorisation tests.

5. **Strict function and module design** (`CLAUDE-function-design.md` §7):
   - Function body target **≤ 20 lines**, hard limit **≤ 50 lines** (enforced by `src/discipline/greenfield-gate.test.ts`).
   - Guard clauses over nesting; max nesting depth **3**.
   - **≤ 3 parameters** per function; beyond 3 use a typed Parameter Object; **no boolean flag params** (use options object or two named functions).
   - **Never mutate in place**; Separate Query from Modifier; files **≤ 400 LOC** typical, **800 LOC** hard limit.
   - **Frontend: a component renders, a hook decides** (`src/app/hooks/use*.ts` + tests; presentation-only JSX: no `.filter/.reduce/.sort/.find/.some/.every/new Date/.toFixed/JSON.parse` inside `return (...)`; wiring-only inline handlers).

6. **`data-testid` on every interactive element** (`CLAUDE-conventions.md` §6): `{component-kebab}__{element-role}`; typed wire/manifest contracts in `src/shared/types.ts`.

7. **Validate honestly and separate provenance** (`CLAUDE-validation.md` §8–§9):
   - Run and name the exact layers that ran: `npm run typecheck`, `npm run pipeline`, `npm test`, `npm run build`, `npm run dump-cycle`, `start_process (npm run dev)`.
   - Never claim another branch's reported counts as locally executed. Use the 4-way vocabulary: (1) read source code, (2) personally viewed visual output, (3) locally executed validation, (4) other branches' reported results.

8. **Reproducible artefacts & one-command dev** (`CLAUDE-validation.md` §9): `npm run dedupe && npm run extract && npm run analyse && npm run generate-sheets` must reproduce `src/images/manifest.json` + `public/sprites/**` byte-for-byte; `./dev.sh` (Bash 3.2) is the single entrypoint.

9. **Container & proxy contract** (`CLAUDE-deployment.md` §10): `Dockerfile` on pinned `node:22.12.0-alpine3.20`, `0.0.0.0:3000`, numeric `UID 1001`, `HEALTHCHECK`; trust `X-Forwarded-*` by private/loopback address, not hop count.

10. **SHIP-HATS inert from day one** (`CLAUDE-deployment.md` §10.3): `*.shiphats` inert templates + `activate-shiphats.sh` (Bash 3.2, `--non-interactive`, placeholder validation, scratch-test enforcement).

---

## Section Index

- [`CLAUDE-decisions.md`](./CLAUDE-decisions.md) — §1 Living spec + addenda discipline, §2 Image prompt audit rule, §3 Continuous learning, §4 N-way ledger.
- [`CLAUDE-testing.md`](./CLAUDE-testing.md) — §2–§3 Real tests, test DB (none here; manifests are file-system DB), video, isolation, fixtures.
- [`CLAUDE-database.md`](./CLAUDE-database.md) — §4–§5 One-casing (`camelCase`), no hand-written mappers, soft-invalidation (`status`), manifest/migration twin-file (snapshot + versioned migration conceptual).
- [`CLAUDE-conventions.md`](./CLAUDE-conventions.md) — §6 `data-testid`, typed manifests, copy rules, external-contract preservation.
- [`CLAUDE-function-design.md`](./CLAUDE-function-design.md) — §7 Function size, guard clauses, parameter objects, component/hook split, module grouping.
- [`CLAUDE-validation.md`](./CLAUDE-validation.md) — §8 Honest validation + provenance separation, §9 Full-cycle dump + audit skill, §10 Reproducible env.
- [`CLAUDE-deployment.md`](./CLAUDE-deployment.md) — §10 Container contract, Cloudflared, trust-by-address, SHIP-HATS inert pipeline.
- [`CLAUDE-checklist.md`](./CLAUDE-checklist.md) — §11 Thirteen greenfield decisions + harmonised parity extensions (prompt log, audit skill, learning log, N-way ledger, failure register, gate automation).
- [`GREENFIELD.md`](./GREENFIELD.md) — Upstream standing-instructions template (verbatim).
- [`FDS_BUILDER.md`](./FDS_BUILDER.md) — Upstream FDS Construction Guide (verbatim, v2.0 activation protocol).

---

## Continuous Learning — Mandatory Every Turn

Update [`docs/FDS.md`](./docs/FDS.md) **during every turn**, including investigation, no-code, and PR-handoff turns, and refresh [`docs/N_WAY_BRANCH_COMPARISON.md`](./docs/N_WAY_BRANCH_COMPARISON.md) on every cross-branch or implementation turn:

- Evidence → Observation → Adopted/Rejected → Validation → Next. Distinguish read code, viewed output, executed validation, and other-reported results.
- If no new learning, say so with reason; never fabricate prompts, images, or test outcomes.
- Pin cross-branch inspections to full SHAs in detached `/tmp/branch-*` worktrees; never switch the session branch (`arena/db7c86d4-super-duper-funicular`).

## Live N-Way Parity Discipline

Goal: **feature parity across all active branches**, preserving local strengths rather than copying frameworks or incompatible coordinate math. This branch tracks `arena/917ef347` (Sprite Motion Lab), `arena/263385da` (Stride Lab), `arena/77ffb088` (Photo-Rig & Matte Lab), `arena/ce6d2a6e` (early prototype, historic), and itself (`arena/db7c86d4`). See `docs/N_WAY_BRANCH_COMPARISON.md` for the comparison command, hash registry, 24-dimension matrix, adoption pipeline, and append-only progress log.


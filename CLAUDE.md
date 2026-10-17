# CLAUDE.md — standing instructions for this repository

This repository adopts the **GREENFIELD coding discipline** from
[`wshyang/greenfield`](https://github.com/wshyang/greenfield). The upstream file is copied verbatim to
[`docs/greenfield/GREENFIELD.md`](docs/greenfield/GREENFIELD.md) at upstream commit
`8ba74027be5fad41e48cadde82cc0120d628b109` (2026-10-13). That copy is the authority; this file is the
project-specific index that says how each section applies here.

> **Agents: read this file first, then the section file you need.** Do not load the whole corpus into
> context. Every rule below that says "must" is a merge gate, not a preference.

## Project stack (see ADD-001)

| Area | Decision |
| --- | --- |
| Language | TypeScript, `strict`, `noUncheckedIndexedAccess`, ESM with explicit `.ts` extensions |
| Runtime | Node 22 (scripts), evergreen browsers (app) |
| Package manager | npm, committed `package-lock.json`, dependencies pinned to exact versions |
| Web app | Vite 7 + vanilla TypeScript DOM components (no UI framework, no runtime dependency) |
| Tests | Vitest, co-located suites under `tests/`; image tests run against the real artwork |
| Image I/O | `pngjs` + `jpeg-js` (pure JS) and `@napi-rs/canvas` for real render assertions |
| Database | none. GREENFIELD §4–§5 are dormant until a data layer exists (see CLAUDE-database.md) |
| Deployment | `Dockerfile`, `Dockerfile.dev`, `.dockerignore` at the root; SHIP-HATS inert files (ADD-008) |

## Layout — grouped by domain, not by type

```
src/images/source/     the source artwork, with a descriptive filename
src/lib/geometry/      Vec2, polygons, capsules, smoothing
src/lib/rig/           body metrics, the nine parts, palettes, personas/skins
src/lib/gait/          gait parameters, foot trajectories + foot roll, two-bone IK, the pose model
src/lib/render/        scene graph (grouped polygons) and the canvas painter
src/lib/pipeline/      sheet detection, chroma keying, cut-out, registration, PNG output
src/lib/analysis/      cycle metrics used by both the tests and the app
src/app/               store, loop, components, views, styles
src/generated/         JSON produced by `npm run sprites:analyse` (committed, reproducible)
public/sprites/        cut-out PNGs + manifest, served at /sprites/...
tools/                 command-line entry points
tests/                 all suites
docs/                  addenda register, flaw analysis, greenfield provenance
reports/               generated previews and raw analysis (gitignored except the preview)
```

## Standing rules for every agent

1. **Record decisions as you make them.** Any decision not dictated by the request or by GREENFIELD goes
   into [`docs/ADDENDA.md`](docs/ADDENDA.md) with the next sequence number, in the same change. Each entry
   states what was decided, why, the spec area, and the impact on future readers.
2. **Tests land with the code.** No feature without its test in the same commit.
3. **Validate honestly** (GREENFIELD §8): name the layer that ran. The full gate is
   `npm run validate` — typecheck, all suites, production build. Never claim a layer that did not run.
4. **Real inputs, no mocks where it counts.** The sheet tests decode the real JPEG; the render tests
   rasterise with a real canvas. A mocked sheet would hide the very drift and fringing this repo studies.
5. **Reproducible artefacts.** `npm run sprites:extract` and `npm run sprites:analyse` must reproduce
   `public/sprites/` and `src/generated/` byte-for-byte. If you change one, regenerate the other.
6. **Commit to the session branch only.** Never rename it, never push elsewhere.
7. **No hand-tuned magic numbers without a named constant and a test.** Gait constants live in
   `src/lib/gait/gait.ts`; body metrics live in `src/lib/rig/body.ts`.

## Section index

| File | GREENFIELD section | Applies here as |
| --- | --- | --- |
| [CLAUDE-decisions.md](CLAUDE-decisions.md) | §1 | Living spec (`README.md` + `docs/`) plus the addenda register |
| [CLAUDE-testing.md](CLAUDE-testing.md) | §2, §3 | Vitest suites, real artwork, deterministic fixtures |
| [CLAUDE-database.md](CLAUDE-database.md) | §4, §5 | Dormant: there is no database. Rules recorded for when one appears |
| [CLAUDE-conventions.md](CLAUDE-conventions.md) | §6 | `data-testid`, typed boundaries, user-facing copy |
| [CLAUDE-function-design.md](CLAUDE-function-design.md) | §7 | ≤ 50-line functions, ≤ 3 parameters, component/hook split adapted to DOM |
| [CLAUDE-validation.md](CLAUDE-validation.md) | §8, §9 | Which layer ran, one-command dev, honest caveats |
| [CLAUDE-deployment.md](CLAUDE-deployment.md) | §10 | Container contract, port 3000, proxy trust, SHIP-HATS inert |
| [CLAUDE-checklist.md](CLAUDE-checklist.md) | §11 | The thirteen up-front decisions, answered for this repo |

## Quick reference

```bash
npm install            # pinned deps
npm run dev            # Vite on 0.0.0.0:3000, all hosts allowed (preview proxy)
npm run validate       # typecheck + tests + production build  (the real gate)
npm run sprites:extract   # cut the sheet, write public/sprites + manifest
npm run sprites:analyse   # measure both cycles, write src/generated + reports
npm run images:dedupe     # byte + silhouette duplicate report
npm run runner:preview -- red   # 8-phase contact sheet to reports/
```

## Continuous learning — every turn

Update [`docs/FDS.md`](docs/FDS.md) during **every turn**, including investigation,
no-code work and delivery handoffs. Record evidence → observation → decision →
validation/uncertainty → next action. If nothing new was learned, say so with the
reason; never invent retrospective experiments, prompts or results.

- Record findings as they arise, and reconcile the entry before handing off.
- Keep proposed fixes/status in `docs/RIG-QUALITY-PLAN.md`; decisions still require
  sequential `docs/ADDENDA.md` entries. FDS indexes evidence, not a duplicate spec.
- Pin cross-branch reviews to full SHAs and temporary detached checkouts. Separate
  read code, personally viewed output, executed tests and others' reported results.
- Record adopted **and rejected/deferred** ideas, plus evidence-backed strengths
  here. More features or more tests is not proof of better visual quality.
- Log future image prompts verbatim in `docs/PHOTO-PROMPTS.md`, including reference
  paths and regeneration reasons. Do not fabricate unavailable historical prompts.
- For rig/render changes, inspect enlarged app-fidelity output over the cycle;
  label plate-space diagnostic probes as such. Passing tests do not certify seams.

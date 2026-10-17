# CLAUDE.md — standing instructions for this repository

This repository adopts the **GREENFIELD** coding discipline from
[`wshyang/greenfield`](https://github.com/wshyang/greenfield)
(`GREENFIELD.md` at upstream commit `8ba74027be5fad41e48cadde82cc0120d628b109`).
The upstream file was split by `##` section into the focused files below so that
agents can read only the section they need. The section text is copied verbatim;
project-specific choices live in this index and in `docs/ADDENDA.md`.

## Project stack (decided, see ADD-001)

- **Language / runtime:** TypeScript (strict) on Node 22; the browser app is also TypeScript.
- **Package manager:** npm with a committed `package-lock.json`; dependencies are pinned to exact versions.
- **Web app:** Vite + React. Components render; hooks decide (see `CLAUDE-function-design.md`).
- **Tests:** Vitest. Unit tests are co-located with source (`foo.ts` + `foo.test.ts`).
  Image tests run against the real source artwork in `src/images/`, never against mocks.
- **Image pipeline:** pure-JavaScript codecs (`pngjs`, `jpeg-js`); no native binaries.
- **No database, no backend service:** the greenfield §4/§5 rules are adopted for any future data
  layer, but are not active yet (see `CLAUDE-database.md`).
- **Deployment / SHIP-HATS:** deferred (see ADD-007 and `CLAUDE-deployment.md`).

## Layout (group by domain, not by type)

| Path | Purpose |
| --- | --- |
| `src/images/` | Source artwork, filed with meaningful names. Source of truth for every image. |
| `src/pipeline/` | Sprite-sheet extraction, background keying, dedupe. Node-only. |
| `src/runner/` | Procedural running-sprite generator: rig, gait, IK, drawing ops, palettes. Pure TypeScript. |
| `src/app/` | React UI for the running demo. |
| `scripts/` | Command-line entry points (`extract-sprites`, `dedupe-images`). |
| `public/sprites/` | Generated cut-out frames and their manifest, served at `/sprites/...`. |
| `docs/` | `ADDENDA.md` (decision register), `sprite-analysis.md` (flaw assessment), `greenfield/` provenance. |

## Standing rules for every agent

1. **Record decisions as you make them.** Any decision not dictated by the user's request
   or by GREENFIELD goes into `docs/ADDENDA.md` in the same change, with the next sequence number.
   Each entry states what was decided, why, related spec area, and practical impact.
2. **Tests in the same change as the code.** No feature lands without its test.
3. **Validate honestly.** Name exactly which validation layer ran (typecheck, unit tests,
   real-image pipeline run, build, HTTP smoke). Never claim a layer that did not run.
4. **Commit to the working branch only.** Commit and push to the session branch; never rename it.
5. **Keep generated binaries reproducible.** Re-running `npm run sprites:extract` must reproduce
   `public/sprites/` byte-for-byte.

## Section index

| File | Upstream section | Content |
| --- | --- | --- |
| `CLAUDE-decisions.md` | §1 | Living spec and addendum discipline |
| `CLAUDE-testing.md` | §2, §3 | Tests first, no mocks where it counts, video, isolation |
| `CLAUDE-database.md` | §4, §5 | ORM, soft delete, IDs, migrations (inactive: no database in this repo) |
| `CLAUDE-conventions.md` | §6 | `data-testid`, typed wire contracts, copy rules |
| `CLAUDE-function-design.md` | §7 | Function size, guard clauses, parameter objects, component/hook split |
| `CLAUDE-validation.md` | §8, §9 | Validation honesty, reproducible local environment |
| `CLAUDE-deployment.md` | §10 | Container contract and SHIP-HATS (deferred, see ADD-007) |
| `CLAUDE-checklist.md` | §11 | Thirteen up-front decisions and their status in this repo |

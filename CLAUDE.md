# CLAUDE.md — standing instructions index

This repository adopts the **harmonised GREENFIELD discipline** in
[`GREENFIELD.md`](./GREENFIELD.md) (see §13 there for which sibling branch each
rule came from). Upstream copies are preserved byte-for-byte at
[`docs/greenfield/GREENFIELD.md`](docs/greenfield/GREENFIELD.md)
(sha256 `400d282e…4dac6c`, commit `8ba7402`) and
[`docs/greenfield/FDS_BUILDER.md`](docs/greenfield/FDS_BUILDER.md). The upstream
copies are provenance, not authority; the harmonised file is the authority.

**Read this file first, then only the section file you need.** Every rule marked
"must" is a merge gate, and most of them are enforced by
`tests/discipline/greenfield-gate.test.ts` so they are executed, not admired.

## Project stack (ADD-001)

| Area | Decision |
| --- | --- |
| Language | TypeScript 5.9, `strict`, `noUncheckedIndexedAccess`, ESM, explicit `.ts` extensions |
| Runtime | Node 22 (tools, pipeline, tests); evergreen browsers (app) |
| Package manager | npm, committed `package-lock.json`, exact pinned versions |
| App | React 19 + Vite 7, Canvas 2D, no backend, no database |
| Tests | Vitest 3 — real JPEG decoded, real solver executed, deterministic software rasteriser |
| Image I/O | `jpeg-js` + `pngjs` (pure JS), zero native binaries |
| Generated assets | `public/sprites/**` and `src/generated/**` committed and reproducible |
| Deployment | `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`; SHIP-HATS inert |

## Layout — grouped by domain, not by type

```
src/images/source/        the single source artwork, descriptive filename
src/pipeline/             sheet detection, chroma key, extraction, dedupe, analysis
src/runner/               pure gait, IK, pose, scene graph, painters
src/app/                  React shell, hooks (decisions), components (rendering)
src/shared/               single-source contracts, palettes, parity matrix
src/generated/            JSON written by `npm run branches:compare`
public/sprites/           extracted PNGs + manifests, served at /sprites/...
tools/                    command-line entry points
tests/                    runner, pipeline and discipline suites
docs/                     FDS, addenda, ledger, validation, plan, provenance
```

## Standing rules for every agent

1. **Decide in writing, in the same change.** Any decision not dictated by the
   request or by `GREENFIELD.md` gets the next sequential entry in
   [`docs/ADDENDA.md`](docs/ADDENDA.md) — what, why, spec area, impact
   ([`CLAUDE-decisions.md`](CLAUDE-decisions.md)).
2. **Tests land with the code**, on real inputs, with the negative case, and
   observed failing first ([`CLAUDE-testing.md`](CLAUDE-testing.md)).
3. **Function and module limits are gates**, not style advice: ≤ 50-line
   functions, ≤ 3 parameters, no flag arguments, presentation-only JSX, ≤ 800-line
   files ([`CLAUDE-function-design.md`](CLAUDE-function-design.md)).
4. **Every interactive element carries `data-testid="{component-kebab}__{element-role}"`**
   and every boundary is typed once ([`CLAUDE-conventions.md`](CLAUDE-conventions.md)).
5. **Name the validation layer** using the five provenance categories; never
   upgrade a weaker claim into a stronger one ([`CLAUDE-validation.md`](CLAUDE-validation.md)).
6. **Commit and push only to the session branch.** Never rename it, never edit a
   sibling branch, never switch branches to inspect another one — use a detached
   checkout under `/tmp`.
7. **Container contract and inert pipeline stay true** (`0.0.0.0:3000`, numeric
   user, `*.shiphats`, Bash 3.2 activation) — [`CLAUDE-deployment.md`](CLAUDE-deployment.md).
8. **No database today.** `CLAUDE-database.md` records the dormant rules so the
   day a data layer appears it starts correct.

## Session-spanning disciplines (must run every turn)

### A. Continuous learning register (`docs/FDS.md`)
Before ending **any** turn — investigation, audit, documentation or handoff —
append or complete one dated `TURN-Lnn` entry containing: request/context,
evidence (full SHAs, paths, commands), observation, adopted/deferred/rejected
decision with reason, validation actually executed, uncertainty, next action.
If nothing was learned, write that and why. Never invent a retrospective
experiment and never report a stale run as fresh.

### B. Live n-way comparison ledger (`docs/N_WAY_COMPARISON.md`)
Every comparative or implementation turn: run `npm run branches:compare` (or
record why it could not run and keep the last-known hashes, clearly labelled
stale), then inspect any new tip in a detached `/tmp` checkout **before**
advancing a reviewed hash. Update the capability matrix, the adoption queue and
the append-only progress history. The in-app matrix in `src/shared/parity.ts`
must change in the same commit, and the gate test enforces that every capability
name appears in the ledger.

The goal is **feature parity across all sibling branches**, judged by
behavioural and visual acceptance — not by test counts, not by copying another
branch's framework, and never by editing a peer branch.

### C. Image-generation provenance
Log the exact prompt, target path, references and outcome for every image
generation call in [`docs/PHOTO-PROMPTS.md`](docs/PHOTO-PROMPTS.md). On
regeneration, keep the earlier prompt and append the new one with a written
justification naming the defect it fixes. Never fabricate a missing historical
prompt.

### D. Visual audit after any art change
Follow [`.claude/skills/audit-gait-cycle/SKILL.md`](.claude/skills/audit-gait-cycle/SKILL.md):
render sixteen phases on light, dark and skeleton panels, open the output, and
record what was actually seen. Automation checks panel presence and dimensions;
it does not certify seams, anatomy or chroma correctness.

## Section index

| File | GREENFIELD section | Content |
| --- | --- | --- |
| [`CLAUDE-decisions.md`](CLAUDE-decisions.md) | §1 | Living FDS, addenda, per-turn learning, ledger workflow |
| [`CLAUDE-testing.md`](CLAUDE-testing.md) | §2–§3 | Real inputs, negative cases, fail-first, layout, discipline gate |
| [`CLAUDE-database.md`](CLAUDE-database.md) | §4–§5 | Dormant data-layer rules |
| [`CLAUDE-conventions.md`](CLAUDE-conventions.md) | §6 | Testids, typed contracts, reproducible artefacts, copy |
| [`CLAUDE-function-design.md`](CLAUDE-function-design.md) | §7 | Size, control flow, parameters, hooks, module structure |
| [`CLAUDE-validation.md`](CLAUDE-validation.md) | §8–§9 | Provenance vocabulary, gate list, local environment |
| [`CLAUDE-deployment.md`](CLAUDE-deployment.md) | §10 | Container contract, proxies, SHIP-HATS, Bash 3.2 |
| [`CLAUDE-checklist.md`](CLAUDE-checklist.md) | §11 | The seventeen up-front answers for this repo |
| [`CLAUDE-branches.md`](CLAUDE-branches.md) | §12 | n-way convergence discipline in operational detail |

## Quick reference

```bash
npm ci                     # pinned dependencies
npm run dev                # Vite on 0.0.0.0:3000, all hosts allowed (preview proxy)
npm run validate           # typecheck + tests + production build — the real gate
npm run pipeline           # dedupe + extract + analyse the real artwork
npm run dump-cycle         # 16-phase light/dark/skeleton audit sheet into /tmp
npm run branches:compare   # refresh sibling-branch tips + history + ledger table
npm run lint               # eslint
npm run format:check       # prettier
```

## Timeboxed expectations for the agent

- Do not claim a gate ran unless it ran here, this turn.
- Do not "fix" a peer branch's results inside our summary; peers are evidence,
  not our build.
- When a visual defect is found, record it even if it cannot be fixed in the
  same turn — an unrecorded known defect becomes an unknown one.
- Prefer a smaller, verified change with an honest gap over a larger change whose
  verification is invented.

# CLAUDE.md — Standing Instructions Index

This repository adopts [`wshyang/greenfield`](https://github.com/wshyang/greenfield) (`GREENFIELD.md`, `FDS_BUILDER.md`) at upstream snapshot `8ba74027be5fad41e48cadde82cc0120d628b109`. This file is the project binding. Agents: read this index, then the one section file you need.

## Stack

| Area | Binding |
| --- | --- |
| Language | TypeScript 5.7, `strict`, `noUncheckedIndexedAccess` |
| App | React 18 + Vite 6, host `0.0.0.0:3000`, `allowedHosts: true` |
| Pipeline | Pure TS RGBA (`jpeg-js`, `pngjs`) under `src/lib/pipeline/` |
| Motion | 17-part intent, 2-bone IK, midfoot-to-toe roll, dual persona skins |
| Tests | Vitest, real math and real chroma — no mocks of gait or I/O |
| Spec | `docs/FDS.md` + sequential `docs/ADDENDA.md` |
| Parity ledger | `docs/NWAY-COMPARISON.md` + `docs/BRANCH-HISTORY.json` |

## Non-negotiable rules

1. Record every decision in `docs/FDS.md` / `docs/ADDENDA.md` in the **same change**.
2. **Every turn** append a learning entry in `docs/FDS.md#continuous-learning-log` (context, evidence, learning, decision, validation, next). If nothing new, write that explicitly.
3. **Image prompts:** log verbatim prompt, `file_path`, references in `docs/PHOTO-PROMPTS.md` and FDS `#image-prompt-log`. Regeneration keeps prior entries and adds a justification. Never invent historical prompts.
4. Maintain `docs/NWAY-COMPARISON.md` as a live n-way ledger. Pin full SHAs from `git ls-remote`. Inspect other branches in detached `/tmp` worktrees. Never switch this session branch. Goal: feature parity across n branches without copying incompatible math blindly.
5. Real tests with the code. Function body ≤ 50 lines, ≤ 3 params (else parameter object), no boolean flags, components render / hooks decide, `data-testid="{component-kebab}__{element-role}"`.
6. Honest validation: name the layer that ran. Gate is `npm run validate`.
7. Commit only to `arena/24e7b955-super-duper-funicular`.

## Section index

- `CLAUDE-decisions.md` — living spec, addenda, learning, image log, n-way parity
- `CLAUDE-testing.md` — real tests, no mocks where it counts
- `CLAUDE-database.md` — dormant until a data layer exists
- `CLAUDE-conventions.md` — testids, copy, typed boundaries
- `CLAUDE-function-design.md` — size, params, JSX purity
- `CLAUDE-validation.md` — honest gates, gait-cycle visual skill
- `CLAUDE-deployment.md` — containers, port 3000, SHIP-HATS inert
- `CLAUDE-checklist.md` — 13 up-front answers
- `GREENFIELD.md` / `FDS_BUILDER.md` — upstream copies

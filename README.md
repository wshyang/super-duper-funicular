# super-duper-funicular — Photographic Running-Sprite Pipeline (P2)

This repository specifies and will implement the **Keyframe-Anchored Photographic Pipeline (KAPP / "P2")**: a pipeline for generating photographic sprite elements for running animations that avoids the defect classes measured in the two predecessor branches.

## Layout

| Path | Purpose |
|---|---|
| [`docs/BRANCH_ASSESSMENT_PR1_PR8.md`](./docs/BRANCH_ASSESSMENT_PR1_PR8.md) | Evidence-led assessment of PR `#1` (`arena/917ef347` @ `936f37c`) and PR `#8` (`arena/e1300d3c` @ `04d5caf`): what they attempt, locally executed gates, personally audited defect classes, root-cause synthesis |
| [`docs/PIPELINE_PROPOSAL.md`](./docs/PIPELINE_PROPOSAL.md) | The revised-pipeline ideation: design doctrine (D1–D6), option space, the K0–K7 stage design, risks, migration increments |
| [`docs/FDS.md`](./docs/FDS.md) | Canonical FDS seed for P2 (objects, surfaces, features, NFRs) + image-prompt log + continuous learning register |
| [`docs/ADDENDA.md`](./docs/ADDENDA.md) | Append-only decision register (`ADD-001`…) |
| [`docs/VALIDATION.md`](./docs/VALIDATION.md) | Honest validation log (which layer ran, what didn't) |
| `GREENFIELD.md`, `FDS_BUILDER.md` | Verbatim upstream discipline template (`wshyang/greenfield` @ `8ba7402`) |
| `CLAUDE.md` + `CLAUDE-*.md` | Project contextualisation of the discipline (read `CLAUDE.md` first) |
| `.claude/skills/audit-gait-cycle/SKILL.md` | Full-cycle gait audit playbook (dump → `read_file` inspection → defect taxonomy → rectification) |
| `incorrect running sprites.jpeg` | The flawed 6×8 reference sheet that started the project (4 poses doubled, peg-leg gait) — retained as evidence |

## Branch / review context

- Active branch: `arena/7f9c98b1-super-duper-funicular` (never switched).
- Watched PRs: **#1** and **#8**, checked out read-only as detached worktrees at `/home/user/pr1-review` and `/home/user/pr8-review` for runs and audits (`ADD-011`).

## Status

Documentation-first stage (`ADD-010`): discipline + assessment + P2 specification are in; the TypeScript stack, mechanical discipline gate, and pipeline CLIs land with the first code change (P2.0 audit upgrade is the planned first increment — see `docs/PIPELINE_PROPOSAL.md §6`).

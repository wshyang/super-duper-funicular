# CLAUDE.md — repository standing instructions

This repository began a new, harmonised implementation from the one-image baseline. **Stage 1 (discipline, FDS, and comparison ledger) is complete. Stage 2 P1 implementation is now underway:** the deterministic source pipeline, procedural Canvas 2D runner, and initial React studio exist and have local validation. Do not claim full parity, P2/P3 completion, browser/E2E acceptance, or visual quality without the corresponding evidence.

## Read first

1. [`docs/FDS.md`](docs/FDS.md) — canonical functional contract and append-only learning log.
2. [`docs/ADDENDA.md`](docs/ADDENDA.md) — decisions, adaptations, and superseding history.
3. [`docs/BRANCH-COMPARISON.md`](docs/BRANCH-COMPARISON.md) — active cohort (open PRs plus provisional same-app candidates), hashes, feature matrix, and adoption queue.
4. The relevant `CLAUDE-*.md` section below and the implementation's own tests/docs.
5. [`GREENFIELD.md`](GREENFIELD.md) — verbatim upstream template from `wshyang/greenfield` commit `8ba74027be5fad41e48cadde82cc0120d628b109`; [`FDS_BUILDER.md`](FDS_BUILDER.md) is this repository's FDS-authoring adaptation.

## Project bindings

| Area | Binding |
|---|---|
| Source of truth | `docs/FDS.md`; decisions that extend/change it go to `docs/ADDENDA.md` in the same change |
| Implementation target | Strict TypeScript core; Vite + browser Canvas 2D; React for the interaction-heavy workbench shell; exact versions pinned in the first package lockfile |
| Image pipeline | One deterministic TypeScript pipeline is preferred; port useful Python-extractor behavior rather than maintaining two authoritative paths |
| Tests | Vitest for deterministic domain/pipeline tests; Playwright for real browser flows; real source artwork where it matters |
| Persistence/backend | None in the current scope. Settings are session-only unless the FDS is revised; JSON downloads are explicit exports, not implicit persistence |
| Cross-branch goal | Behavioural feature parity across this session branch, all open same-app PRs, and provisional active candidates; cohort membership is dynamic |

The stack choice is recorded in `docs/ADDENDA.md`. A framework choice is not a license to move gait, image, or coordinate logic into UI components. Keep the core framework-independent.

## Non-negotiable operating rules

1. **Stay on the Arena session branch.** Do not switch, rename, amend, cherry-pick into, or push another branch. Never edit peer branches. Do not merge PRs unless the user explicitly asks.
2. **Update learning on every turn.** Before handoff, append the next `TURN-Lnnn` entry in `docs/FDS.md#continuous-learning-log`, including investigation/no-code turns. Record request/context, exact evidence (full SHAs and paths/commands), findings, adopted/rejected/deferred ideas, strengths preserved here when evidence supports them, validation actually run, uncertainty, and next action. If there was no new technical learning, say so and why. Do not fabricate experiments, historical prompts, outputs, or test results.
3. **Refresh the living n-way ledger every turn.** Query current open/all PRs (`gh pr list`) and remote heads (`git ls-remote --heads origin`); update the full-SHA observation table and append progress in `docs/BRANCH-COMPARISON.md`. Compare this branch, every open same-app PR, and any recent unsubmitted same-app candidate; keep candidates provisional, retain closed-unmerged PR refs as reference-only outside the denominator unless explicitly promoted, and keep superseded refs historical. Do not hard-code “three-way.” Keep **latest observed SHA** separate from **reviewed SHA**. When a tip changes, inspect the changed source at that exact commit in a detached temporary checkout and update the feature/adoption matrix. A hash refresh is not semantic review. If remote access fails, retain last-known hashes but label them stale and record the failure. No watcher or auto-merge is implied.
4. **Keep prompts auditable.** For each future `generate_image` call, append the exact verbatim prompt, target path, reference image paths, outcome, and review note to the image-prompt log in `docs/FDS.md`. A regeneration appends the new prompt and a concrete defect-based justification; never overwrite or reconstruct a missing historical prompt. No generated artwork has been introduced: Stage 1 was documentation-only, and the current Stage 2 runner is Canvas 2D code over the original source asset.
5. **Write tests with the behavior.** Use real image/pipeline inputs where possible; do not mock the path whose correctness is under test. Browser tests drive the real UI/assets. Default to recording Playwright video, with a documented `E2E_VIDEO=off` opt-out. Add failure/retry tests for all-or-nothing photographic asset loading.
6. **Inspect visual work.** After gait, mask, cut-out, or compositing changes, render at least 16 evenly spaced phases through the same renderer used by the app, against light/dark and joint-overlay backgrounds. Enlarge suspect joints (hip, shoulder/elbow, knee, ankle/foot), inspect odd intermediate phases and relevant control extremes, and log defects/limits. Automated metrics aid review; they do not certify realism or seamlessness.
7. **Report validation honestly.** Distinguish source read, output personally viewed, command locally executed, and another branch's reported result. Name exact commands, counts, environment, and any gate not run. Never imply that reference-branch tests ran locally.
8. **Preserve provenance and useful differences.** Keep original bytes and hashes; deduplicate only exact byte/pixel duplicates, not visually similar poses. Port behavior with tests, not incompatible code/coordinates. Document failed experiments and why they failed.
9. **Keep spec and code in the same change.** Update affected FDS requirements, acceptance criteria, and sequential addenda when behavior/architecture changes. Generated assets must be reproducible and their manifests regenerated with them.

## Section index

- [`CLAUDE-decisions.md`](CLAUDE-decisions.md) — spec/addenda, every-turn learning, exact image prompts, dynamic n-way review.
- [`CLAUDE-testing.md`](CLAUDE-testing.md) — real inputs, test layers, isolation, browser/video.
- [`CLAUDE-function-design.md`](CLAUDE-function-design.md) — modules, function/file limits, UI/domain split, test IDs.
- [`CLAUDE-validation.md`](CLAUDE-validation.md) — evidence vocabulary and full-cycle visual acceptance.
- [`CLAUDE-infrastructure.md`](CLAUDE-infrastructure.md) — static-app boundary, preview/container contract, dormant database/SHIP-HATS rules.
- [`CLAUDE-checklist.md`](CLAUDE-checklist.md) — Greenfield day-zero decisions bound to this repo.
- [`FDS_BUILDER.md`](FDS_BUILDER.md) — project-specific FDS authoring rules.
- [`.claude/skills/audit-gait-cycle/SKILL.md`](.claude/skills/audit-gait-cycle/SKILL.md) — reusable visual-review workflow.

## Current implementation boundary

Stage 1 is complete. Stage 2 currently implements the TypeScript image pipeline, measured source report, continuous procedural gait model, first React studio/source/diagnostics views, and renderer-backed PNG/JSON exports. `npm run pipeline` and `npm run validate` have been run locally; `npm audit` currently reports zero advisories. No Playwright/browser automation, in-app visual review of the 16-phase audit, photo rig/calibration, SVG vectorizer, container, or deployment has been completed. Refresh these claims and the feature ledger with actual evidence every turn.

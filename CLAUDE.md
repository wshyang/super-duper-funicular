# Coding discipline

Read `GREENFIELD.md` (upstream verbatim) and this project binding before changes.
1. Record decisions in `docs/SPEC.md` and sequential `docs/ADDENDA.md` **in the same change**.
2. Write real tests first. Pure gait tests live in `tests/frontend/unit`, browser tests in `tests/frontend/e2e`, extraction tests in `scripts/test_extract.py`. No mocked UI/data pipeline.
3. Stack: TypeScript strict, React, Canvas 2D, Vite, npm lockfile, Vitest, Playwright; Python 3.11 + pinned Pillow/NumPy/SciPy for offline artwork tooling.
4. Follow Greenfield function/module limits, guard clauses, parameter objects and descriptive naming. Canvas drawing, animation refs, and local pixel buffers are explicit mutation exceptions at the rendering/I/O boundary; gait math remains pure.
5. Every interactive element uses `{component-kebab}__{element-role}` test IDs. Components render; domain modules calculate. No network/backend needed beyond serving static assets.
6. Run typecheck, lint, unit/extraction tests, build and real browser tests. Report unavailable gates honestly. Playwright video defaults on; `E2E_VIDEO=off` disables it.
7. No database, auth, sessions or API routes: Greenfield ORM/migration/IDOR requirements are not applicable. Reassess if adding a backend. Public artwork must contain no secrets.
8. Read `docs/ADDENDA.md` for deployment adaptations; never claim unrun deployment/compliance checks passed.

## Continuous learning — mandatory every turn

9. Read `docs/FDS.md` before work. Before ending **every turn**, append a dated learning entry (or complete that turn's entry) with: request/context, evidence (paths/commit IDs or commands), observation, adopted/deferred/rejected decision and reason, validation actually run, uncertainty and next action. This includes investigation and no-code turns. If nothing new was learned, record “No new technical learning” with the reason; never invent lessons or repeat stale test results as freshly run.
10. `docs/FDS.md` is the learning register and FDS entry point; `docs/SPEC.md` is the canonical functional contract. Keep changed contracts and sequential addenda in sync in the same change. Preserve prior findings; date corrections rather than silently rewriting history. Record strengths of the current approach as well as incoming ideas, with concrete evidence and trade-offs.
11. For external/other-branch comparisons, pin source commit and inspected paths, keep reference snapshots outside this repo, keep this session's branch unchanged, distinguish source inspection from executed validation, and adapt with regression tests rather than blindly replacing working contracts.
12. After gait, cutout, mask or compositing changes, follow `.claude/skills/audit-gait-cycle/SKILL.md`: generate and visually inspect full-cycle diagnostics, not only eight thumbnails or numeric checks. Keep generated evidence in ignored/temp directories; document findings and limitations in FDS.
13. For each future image-generation call, record exact prompt, target file, reference images and outcome in FDS. Append regeneration reasons and preserve prior prompts. Never reconstruct missing historical prompts as verbatim. Respect the user's per-turn generation limit.

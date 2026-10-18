# FDS Addenda Register

Addenda capture decisions outside the base contract. New entries are appended with sequential IDs; do not renumber earlier entries.

## ADD-001 — Treat PR branches as evidence, not as the baseline implementation

- **Status:** Adopted for this review.
- **Decision:** Keep PR #1 and PR #8 in their separate detached worktrees and use the exact reviewed commits as evidence. Do not merge, cherry-pick, or copy their code into the original checkout as part of this assessment.
- **Rationale:** The branches share a base but diverge substantially, and their documentation records both improvements and unresolved visual failures. The original checkout contains only the supplied source sheet, so silently adopting either branch would also silently select a large application architecture.
- **FDS anchor:** [`FDS.md` §1–§2](FDS.md#1-purpose-and-current-state).
- **Practical impact:** The review artifacts are `docs/BRANCH_ASSESSMENT.md`; the two review worktrees remain separate and unchanged. The photographic pipeline in [`REVISED_PHOTOGRAPHIC_SPRITE_PIPELINE.md`](REVISED_PHOTOGRAPHIC_SPRITE_PIPELINE.md) remains a draft until an authoring mode and output contract are selected.

## ADD-002 — Scope the adopted GREENFIELD discipline to this repository

- **Status:** Adopted.
- **Decision:** Preserve the reviewed upstream `GREENFIELD.md` template verbatim and provide project-specific standing instructions in the root `CLAUDE.md`. Adopt the durable rules for living specifications, same-change addenda, real tests, honest validation provenance, small/pure code boundaries, prompt provenance, visual review, and full-cycle audits. Treat database, ORM, React/Vite, container, SHIP-HATS, and live multi-branch comparison requirements as conditional or inapplicable until the FDS selects those systems.
- **Rationale:** The upstream template is explicitly a template, and the PR-specific `CLAUDE.md` files bind a different branch, stack, application, and watchlist. Copying those bindings literally would create false requirements in this asset-first baseline.
- **FDS anchor:** [`FDS.md` §10](FDS.md#10-prompt-log-and-continuous-learning).
- **Practical impact:** `CLAUDE.md` is the binding overlay. No framework, database, deployment pipeline, or branch-comparison script is implied by adopting the template.

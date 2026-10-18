# FDS Addenda Register

Addenda capture decisions outside the base contract. New entries are appended with sequential IDs; do not renumber earlier entries.

## ADD-001 — Treat PR branches as evidence, not as the baseline implementation

- **Status:** Adopted for this review.
- **Decision:** Keep PR #1 and PR #8 in their separate detached worktrees and use the exact reviewed commits as evidence. Do not merge, cherry-pick, or copy their code into the original checkout as part of this assessment.
- **Rationale:** The branches share a base but diverge substantially, and their documentation records both improvements and unresolved visual failures. The original checkout contains only the supplied source sheet, so silently adopting either branch would also silently select a large application architecture.
- **FDS anchor:** [`FDS.md` §1–§2](FDS.md#1-purpose-and-current-state).
- **Practical impact:** The review artifacts are `docs/BRANCH_ASSESSMENT.md`; the two review worktrees remain separate and unchanged. The concrete 3D-to-sprite pilot recipe lives in [`AI_3D_TO_SPRITE_IMPLEMENTATION.md`](AI_3D_TO_SPRITE_IMPLEMENTATION.md); no PR implementation was copied.

## ADD-002 — Scope the adopted GREENFIELD discipline to this repository

- **Status:** Adopted.
- **Decision:** Preserve the reviewed upstream `GREENFIELD.md` template verbatim and provide project-specific standing instructions in the root `CLAUDE.md`. Adopt the durable rules for living specifications, same-change addenda, real tests, honest validation provenance, small/pure code boundaries, prompt provenance, visual review, and full-cycle audits. Treat database, ORM, React/Vite, container, SHIP-HATS, and live multi-branch comparison requirements as conditional or inapplicable until the FDS selects those systems.
- **Rationale:** The upstream template is explicitly a template, and the PR-specific `CLAUDE.md` files bind a different branch, stack, application, and watchlist. Copying those bindings literally would create false requirements in this asset-first baseline.
- **FDS anchor:** [`FDS.md` §10](FDS.md#10-prompt-log-and-continuous-learning).
- **Practical impact:** `CLAUDE.md` is the binding overlay. No framework, database, deployment pipeline, or branch-comparison script is implied by adopting the template.

## ADD-003 — Use a concrete AI-to-3D-to-sprite pilot

- **Status:** Selected as the v1 pilot path; not a production-art approval.
- **Decision:** Use separate AI-generated design references, Tripo image-to-3D for a textured GLB, Blender cleanup, Mixamo auto-rig plus a run action, Blender foot-contact correction and fixed-camera rendering, then the repository's tested Python/Pillow atlas packer. Pilot output defaults to 16 RGBA frames at `220 × 256`, 24 fps, 4 × 4 layout, with top-origin ground line `y = 234` and a 1 px starting support-sole tolerance.
- **Rationale:** The user asked for a concrete implementation rather than an open-ended comparison. One default route makes the next required inputs and review gates explicit. The pilot defaults borrow the reviewed branches' frame dimensions/ground line for comparability; they remain adjustable if the actual display target requires it.
- **FDS anchor:** [`FDS.md` §1, §5–§9](FDS.md#1-purpose-and-current-state).
- **Practical impact:** The exact steps and prompt template are in [`AI_3D_TO_SPRITE_IMPLEMENTATION.md`](AI_3D_TO_SPRITE_IMPLEMENTATION.md). The atlas packer is implemented at `tools/sprite_pipeline/pack_atlas.py`. A textured GLB, Mixamo-rigged FBX, Blender installation, and human visual approval are still required before a sprite render can be claimed.

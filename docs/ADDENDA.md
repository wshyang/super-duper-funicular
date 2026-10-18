# Sequentially-Numbered Addenda Register (`GREENFIELD.md §1`)

Append-only. Each entry: what was decided, why, related FDS anchor, practical impact. Independent of FDS section numbering.

## `ADD-001` — Adoption of the Harmonised GREENFIELD / CLAUDE Discipline Corpus (Verbatim Upstream, Harmonised Sections)

- **Decided:** Copy `GREENFIELD.md` and `FDS_BUILDER.md` verbatim from upstream `wshyang/greenfield` (as carried byte-identical on PR `#1` @ `936f37c` and PR `#8` @ `04d5caf`), and adopt the harmonised section files `CLAUDE-checklist.md`, `CLAUDE-conventions.md`, `CLAUDE-database.md`, `CLAUDE-decisions.md`, `CLAUDE-deployment.md`, `CLAUDE-function-design.md`, `CLAUDE-testing.md`, `CLAUDE-validation.md` plus a branch-contextualised `CLAUDE.md` index on this branch.
- **Why:** The user directed adoption of the same coding discipline as GREENFIELD.md/CLAUDE.md; both watched branches carry byte-identical upstream copies, so verbatim adoption preserves a single upstream source of truth. Section files are the harmonised N-way synthesis already proven on PR `#1`/`#8`.
- **FDS anchor:** `#nfr-provenance`; `CLAUDE.md` index.
- **Impact:** Branch-specific bindings were contextualised only where factual: active session branch (`arena/5ae6f17a-super-duper-funicular`), watchlist framing (PR `#1`/`#8` as closely watched references inspected in `/home/user/review-pr1` & `/home/user/review-pr8`), and the parity clause replaced by "adopt verified learnings by addendum; converge on Pipeline Rev-2 design" (`CLAUDE-decisions.md §4`). Deployment/SHIP-HATS files land with the first deployment-relevant code (documented in `CLAUDE.md` index).

## `ADD-002` — Dual-Worktree Branch Assessment Method (`/home/user/review-pr1`, `/home/user/review-pr8`)

- **Decided:** Fetch `refs/pull/{1,8}/head` and materialise each PR head as a detached `git worktree` inside the workspace but outside the repository checkout; perform all reading and gate execution there; never switch the active branch.
- **Why:** The user asked for the two PR branches' contents in two separate working directories; worktrees give exact head checkouts sharing one object store (cheap, reproducible) while satisfying cross-branch inspection safety (`CLAUDE-decisions.md §4`).
- **FDS anchor:** `#nfr-provenance`; `docs/BRANCH_ASSESSMENT.md`.
- **Impact:** `review-pr1/` and `review-pr8/` are untracked review scratch (gitignored); assessed SHAs (`936f37c`, `04d5caf`) are recorded as *reviewed* SHAs; gates executed there are reported as locally executed with paths.

## `ADD-003` — Inheritance of PR `#1`/`#8` Error & Rectification Catalogs by Reference

- **Decided:** Do not restate `IMG-ERR-01..16`, `PIPE-ERR-01..08`, `DEFECT/RECT-01..09`, `CROSS-01..16` in this branch's FDS; reference them with provenance (PR `#1` `docs/FDS.md` §8.4, `docs/RECTIFICATION_PLAN.md` @ `936f37c`) and map them to Rev-2 failure planes in `docs/PIPELINE_REV2.md` §2.
- **Why:** `GREENFIELD.md`/`FDS_BUILDER.md` P12 (single source of truth): restating creates a second copy that drifts; the catalogs are already append-only and hash-provenanced upstream.
- **FDS anchor:** `#thought-process` (FDS §8).
- **Impact:** Rev-2 design tables cite catalog IDs as evidence; any *new* failure observed on this branch gets a new ID in this branch's own register, cross-linked upstream.

## `ADD-004` — Canonical Reference Sheet Provenance (Root JPEG Retained In Place)

- **Decided:** Keep the user-uploaded `incorrect running sprites.jpeg` at the repository root (do not move/delete) and record its SHA-256 (`f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`) as the canonical problem-statement artifact; PR `#1`'s filed copy under `src/images/spritesheets/` remains that branch's manifest entry.
- **Why:** The file is the user's original upload and the shared flaw-analysis input (`FLAW-01..05`); moving it on a design-only branch would create gratuitous diff noise against main.
- **FDS anchor:** `#obj-image-asset`.
- **Impact:** Any Rev-2 baker/flaw self-test on this branch reads the root path; hash equality with PR `#1`'s filed copy is the dedupe key.

## `ADD-005` — Pipeline Rev-2 Design as the Branch's Primary Deliverable

- **Decided:** Author `docs/PIPELINE_REV2.md`: failure-plane taxonomy (G/X/A/V), 8-stage revised pipeline (constrained master → calibration record → deterministic decomposition → medial synthesis → Part Contract gate → Rev-1 assembly/bake → golden regression audit), Part Contract `PC-01..PC-12`, calibration-as-data rule, rejected alternatives register, phased rollout P0–P4 with success metrics.
- **Why:** Both watched branches demonstrate that downstream repair of stochastic plates does not converge (assessment §4); the design makes inter-plate agreement free (single master), rejects bad plates at the door (contract), and makes regressions machine-visible (goldens).
- **FDS anchor:** `#feat-rev2-*`, `#feat-part-contract`, `#feat-rev2-regression-audit`, `#feat-rev2-sheet-baker`, `#surf-*`.
- **Impact:** Implementation phases are gated on user decisions Q1–Q4 (`docs/PIPELINE_REV2.md` §7); until then this branch remains docs+gate-only and the P0 gate (`src/discipline/greenfield-gate.test.ts`) enforces the documentation invariants.

## `ADD-006` — Documentation-Level Mechanical Gate for the Docs-Only Phase

- **Decided:** Ship a minimal Vitest gate (`src/discipline/greenfield-gate.test.ts`) that mechanically enforces, on every `npm test`: presence and verbatim markers of `GREENFIELD.md`/`FDS_BUILDER.md`; `CLAUDE.md` index carrying the six core rules and the active session branch; `docs/FDS.md` carrying `#image-prompt-log` and a non-empty `#continuous-learning-log`; sequential gap-free `ADD-NNN` numbering in `docs/ADDENDA.md`; ≤800 LOC and ≤50-line named functions for every `src/**/*.ts` file; existence of the Rev-2 design and assessment records.
- **Why:** `GREENFIELD.md §2` and harmonised Rule 4 require rules to be enforced mechanically, not aspirationally; the full asset-level gate from PR `#1` cannot run before pipeline code lands, so the gate starts at the documentation/code-invariant layer and grows with the codebase.
- **FDS anchor:** `#nfr-provenance`; `CLAUDE-testing.md`.
- **Impact:** Documentation drift (missing learning entry, broken addenda sequence, deleted discipline file) fails CI-equivalent local gate immediately.

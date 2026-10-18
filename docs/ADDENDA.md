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

## `ADD-007` — Decision-Gate Resolutions (Q1–Q4) & Pipeline Rev-2 P1–P2 Prototype Implementation

- **Decided (user decision gate, TURN-L02 → resolved 2026-10-18):** Q1=A (medial synthesis deterministic-first, plan-level plate fallback), Q2=A (A-stance ~20° abduction for future masters), Q3=A (baked cycle sheets are the primary contract-tested deliverable), Q4=B (implement P1–P2 on this branch: Part Contract suite, calibration schema/loader, single-master decomposer for one persona with committed goldens).
- **Implemented:** `src/pipeline/part-contract.ts` (`PC-01..PC-12` with negative-fixture tests), `src/shared/persona-calibration.ts` + `src/shared/personas/photo-sg-chinese-female.json` (`persona-calibration.v1`, revision 6, backfilled from telemetry + vision review), `src/pipeline/{chroma-key,rounded-caps,material-matte,decomposer,golden-baker}.ts`, `scripts/decompose-and-bake.ts` (`npm run decompose`), committed goldens under `docs/audit-golden/photo-sg-chinese-female/` (contact sheet, golden manifest, contract report) and parts under `public/sprites/rev2/…`. Zero new `generate_image` calls: the master is PR #1's filed plate copied verbatim (SHA-256 `5fabff33…`), provenance logged by reference.
- **Why / measured evidence:** the bake gate caught 11 distinct defect classes during bring-up (point-sampling gaps at scale≠1; occluder contamination both directions; head cap over-trim; ponytail canvas overflow; stripe theft by arm masks; pelvis occluder split; socket-scale vs designed holes), each fixed by record data or a deterministic pipeline rule — validating the reject-at-the-door design.
- **Architectural rules adopted:** (1) **Occluder-subtraction layered decomposition** — parts are cut in painter front-to-back order (record `parts` order, validated) and subtract explicit `subtractOccluders` silhouette masks; this is Rev-1 care rule #6 ("armless mannequin torso") achieved deterministically from one photograph. (2) **Material-class purges** (`material-matte.ts`: crimson/black/white fabric, cyan band) give arms/hands/neck their true silhouettes so masks are silhouettes, not window rectangles (Rev-1 `CROSS-07` generalised). (3) **Calibration-as-data**: extractors contain no persona literals; six record revisions landed as data changes only.
- **Contract recalibrations (evidence-led, superseding the §4 table wording where noted):** `PC-01` splits by stage (plate = exactly 1 subject; cutout = ≤2 components when `subtractOccluders` non-empty, since splits are deterministic occluder gaps); `PC-04` thresholds by stage (plate ≥4% inset; cutout ≥2 px); `PC-11` counts only socket-scale enclosed holes (>60 px) whose pixels are <50% covered by the part's designed-transparency canvas (occluder subtraction + material purge pockets are by design and covered at assembly).
- **Known prototype limitations (production fixes scheduled):** `K-1` similarity transform without per-part rotation (A-stance masters of P2+ carry `rotationRad`); `K-2` pelvis does not subtract the near thigh (same-garment chain) — Rev-1 end-cap cuff graft (`attachEndCapComposite`) remains the production answer; `K-3` mixed crimson/skin edge pixels survive class purges as ≤2 px specks (Rev-1 Jacobi fill / feathering at P2.5); `K-4` residual sub-threshold magenta fringe on head/foot contours.
- **FDS anchor:** `#feat-rev2-decompose`, `#feat-part-contract`, `#feat-rev2-regression-audit`, `#surf-decompose-run`, `#surf-part-rejections`.
- **Impact:** `npm test` 27/27 (contract negatives, real-asset decomposer incl. PC-12 byte-determinism and golden-manifest equality, calibration schema negatives, discipline gate); `npm run typecheck` clean; `npm run decompose` exit 0 with 0 contract failures; contact sheets visually examined twice per `CLAUDE.md` Rule 2.

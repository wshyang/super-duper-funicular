# Sequentially-Numbered Addenda Register (`GREENFIELD.md §1`)

Every architectural, algorithmic, or tooling decision not fixed by a single literal reading of the prompt is recorded here in the same change that implements it.

---

## `ADD-001` — Adoption and Section-Split of `wshyang/greenfield` (`8ba74027`) into Harmonised Discipline
- **What was decided:** Copy `GREENFIELD.md` + `FDS_BUILDER.md` from `wshyang/greenfield` at `8ba74027` into repo root, create contextualised `CLAUDE.md` index, and split each `##` into 8 focused files `CLAUDE-{decisions,testing,database,conventions,function-design,validation,deployment,checklist}.md` per `GREENFIELD.md §0`. Bind placeholders to concrete stack (TS 5.7, React 18, Vite 6, Vitest, pure-TS RGBA pipeline).
- **Why:** `GREENFIELD.md §0` mandates documentation architecture on day one so agents `grep` focused sections without loading whole corpus; cross-branch review shows modular split (Branches 1+3) is strictly better than consolidated `CLAUDE.md` for agent efficiency.
- **Related Spec Section:** `docs/FDS.md#exec-summary`, `docs/FDS.md#continuous-learning-log`
- **Practical Impact:** Every module/test follows the merged standing rules; discipline split is checked by `greenfield-gate.test.ts`.

## `ADD-002` — Harmonised Greenfield Standing Rules (10 Non-Negotiables + 10 Extensions)
- **What was decided:** Promote the strongest rules from all 4 arena branches into one canonical `CLAUDE.md` "Non-Negotiable Core Rules (1–10)" plus 10 harmonised extensions (prompt log, audit skill, learning register, N-way ledger, failure register, gate automation, provenance honesty).
- **Why:** Branch 1 had the most complete prompt + audit + gate contracts, Branch 2 had the strongest calibration asset-readiness + multi-locomotion invariants + provenance honesty phrasing, Branch 3 had measured matte/width/membrane invariants + failed-experiment discipline. No single branch held all. Merging avoids repeating sibling mistakes.
- **Related Spec Section:** `CLAUDE.md`, `CLAUDE-decisions.md`, `docs/FDS.md#continuous-learning-log`
- **Practical Impact:** Future contributors obey 10 core rules + extensions; PRs that omit the learning update or provenance separation fail the gate.

## `ADD-003` — Canonical `docs/FDS.md v1.0.0` under `FDS_BUILDER.md v2.0` (Unified Canonical + Learning Register)
- **What was decided:** Author `docs/FDS.md` with FDS_BUILDER sections `§1–§10` (executive, phase, `#obj-*`, relationship map R1, surface inventory R2/R5 parity, `#feat-*`, flows, day-zero R4) + thought process (§8), prompt log (§9), SVG assessment (§10), audit workflow (§11), continuous learning (`TURN-L01..`, R7 session continuity, R8 auth-propagation, R6 path-collision where relevant), NFR (P1–P15), changelog (D12/D13), and mirror it with `docs/SPEC.md`.
- **Why:** Branch 1 demonstrated that a unified FDS with both rigorous `#obj/#feat` contracts and append-only learning lives in one canonical file is more maintainable than Branch 2's split SPEC+light-FDS or Branch 3's index+domain-docs — while Branch 2's split taught the value of preserving prior SPEC as a compat alias to avoid divergence.
- **Related Spec Section:** `docs/FDS.md`
- **Practical Impact:** All object/feature/surface IDs are canonical; new surfaces must declare phase and relationship coverage or create `[ORPHAN-CAPABILITY]` (R5).

## `ADD-004` — Mandatory Continuous Per-Turn Learning Discipline (`TURN-LNN`) + `TURN-LNN` Provenance Vocabulary
- **What was decided:** Codify in `CLAUDE.md` Core Rule 3 + `CLAUDE-decisions.md §3` that every turn (including audit/review/no-code) appends/updates a structured entry (`Context` → `Evidence/Provenance` → `Learnings & Comparison` → `Decisions` → `Validation & Next`) in `docs/FDS.md#continuous-learning-log`, using the 4-way provenance split (read code / viewed output / executed gates / other-reported). If nothing new learned, explicitly say so.
- **Why:** All three active branches invented this independently (`TURN-L01..L11`, `L001/L002`, `RIG-QUALITY-PLAN`) — the single strongest convergence. Making it mandatory prevents silent drift and invented retrospection.
- **Related Spec Section:** `docs/FDS.md#continuous-learning-log`, `CLAUDE-validation.md §8.1`
- **Practical Impact:** Every commit that touches behaviour also touches the learning register; `greenfield-gate.test.ts` asserts presence of the latest `TURN-L*`.

## `ADD-005` — Mandatory Image-Prompt & Regeneration Justification Log (`#image-prompt-log`)
- **What was decided:** Enforce `CLAUDE-decisions.md §2`: every `generate_image` logs exact verbatim prompt + `file_path` + `images[]` in `docs/FDS.md#image-prompt-log` and mirrors into `docs/PHOTO-PROMPTS.md`; same-file regenerations are append-only with explicit technical justification (chirality, yaw/twist, illumination, matte spill). Missing historical prompts are marked `[HISTORICAL — branch:SHA]` or `[DRAFT — unknown]`, never fabricated.
- **Why:** Branch 1 invented and documented all 21 calls with regeneration reasons (Call #21 L-bend fixes chirality). Branch 2 added prospective-only honesty (never reconstruct as verbatim). Branch 3 added `PHOTO-PROMPTS.md` per-plate traceability. Combined they give 100% auditability without falsification.
- **Related Spec Section:** `docs/FDS.md#image-prompt-log`, `docs/PHOTO-PROMPTS.md`
- **Practical Impact:** `greenfield-gate.test.ts` enforces that every `generate_image` invocation in code has a log entry; reviewers inspect prompts for anatomical correctness.

## `ADD-006` — Live N-Way Branch Parity Ledger with `npm run branches:compare` Automation
- **What was decided:** Replace the 3-way-only ledger with an **N-way** ledger (`docs/N_WAY_BRANCH_COMPARISON.md` + root `N_WAY_COMPARISON.md` + legacy `THREE_WAY_BRANCH_COMPARISON.md` mirrors) that tracks all 5 `arena/*` branches (4 active + 1 historic) + `main` + itself, via `tools/compare-branches.ts` (`git ls-remote --heads origin` + detached `/tmp/branch-*` inspection, never `git switch`). Persist live tips (`docs/BRANCH-TIPS.json`) + append-only history (`docs/BRANCH-HISTORY.json`). Include 24-dimension parity matrix, FDS (§5) + discipline (§6) three-way comparisons, `CROSS-NN` adoption queue, and progress log.
- **Why:** Branches progress in parallel; manually copied SHA tables go stale mid-turn (observed: `arena/917ef347` advanced `ea3c37c→9637227` + `9637227→e172b0f` while ledger turns were in flight). Automation prevents stale claims; N-way (not 3-way) accommodates `arena/db7c86d4` itself and the historic `arena/ce6d2a6e` + any future arena branch without doc surgery.
- **Related Spec Section:** `docs/FDS.md#n-way-summary`, `docs/N_WAY_BRANCH_COMPARISON.md`
- **Practical Impact:** Every cross-branch or implementation turn must run `npm run branches:compare` and refresh the SHA table; `greenfield-gate.test.ts` asserts ledger + JSON presence and mirrors consistency.


# CLAUDE-decisions.md — Living Specification & Addendum Discipline (§1)

Adopted from `wshyang/greenfield` `GREENFIELD.md §1` and `FDS_BUILDER.md`.

## 1. Source of Truth & Addenda Register

- **Base Functional Design Specification:** `docs/FDS.md` is the canonical contract for object models, pipeline stages, biomechanical gait rules, and UI surfaces.
- **Sequentially-Numbered Addenda Register:** `docs/ADDENDA.md` records every architectural, algorithmic, or tooling decision (`ADD-001`, `ADD-002`, …) that fills a gap, refines an algorithm, or adapts a template rule.
- **Same-Change Rule:** Every decision must be recorded in `docs/ADDENDA.md` in the same change that implements the code. Each entry states:
  1. **What was decided**
  2. **Why (rationale & evidence)**
  3. **Related FDS section anchor** (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`)
  4. **Practical impact & invariants for future readers**
- **Independent Numbering:** Addenda numbers (`ADD-NNN`) are append-only and independent of `docs/FDS.md` section numbers.

## 2. Mandatory Image Generation Prompt & Regeneration Justification Log (`#image-prompt-log`)

- **Log Every Prompt Verbatim in `docs/FDS.md`:** With every `generate_image` call, you MUST record the **exact image prompt string** used, the target `file_path`, and any reference `images` array inside `docs/FDS.md` (`#image-prompt-log`).
- **Append-Only Regeneration Audit Trail:** When the same image (`file_path`) must be regenerated, never overwrite or delete the prior prompt entry. Append a new chronological entry containing:
  1. **The exact subsequent prompt** used for the regeneration call.
  2. **Regeneration Justification:** A concrete technical explanation of why the additional call was required (e.g., `45°` three-quarter camera twist instead of `90°` sagittal profile, right-arm chirality illusion instead of medial left arm with inner palm facing viewer, arm occluding torso side panel, or harsh side-shadow grooves) and what prompt constraints were added to solve it.
- **Historical Completeness:** `docs/FDS.md` must maintain the complete history of all image generation prompts and explanations across the entire project conversation.

## 3. Mandatory Continuous Per-Turn Learning Register (`#continuous-learning-log`)

- **Update Learnings Constantly Every Turn:** Read `docs/FDS.md` before starting work and update `docs/FDS.md` (`#continuous-learning-log`) **during every single turn** (including investigative runs, visual audits, and cross-branch reviews).
- **Structured Turn-by-Turn Learning Entries (`TURN-L01`, `TURN-L02`, …):** Every turn must record:
  1. **Context & Trigger:** The user request, audit trigger, or architectural question addressed in that turn.
  2. **Evidence & Provenance:** Exact file paths, CLI commands, telemetry (`audit-report.json`), visual sheets inspected via `read_file`, or external branch commit SHAs and timestamps inspected in `/tmp/...`.
  3. **Learnings & Comparative Analysis:** What worked, what failed and why (dead ends), what good ideas were learned from other branches, and what our own implementation does better with concrete measurements.
  4. **Decisions (`Adopted` / `Rectified` / `Deferred` / `Rejected`):** How findings were translated into code, plan files (`PLAN.md`), and specification updates.
  5. **Executed Validation & Next Actions:** Exact test/build/audit gates executed in that turn (never claim unrun gates passed) and remaining open items.
- **Cross-Branch Inspection Safety:** When referencing another branch of the repository, always clone or extract into `/tmp/...` outside `/home/user/super-duper-funicular` so the active working branch is never switched or polluted.

## 4. Live 3-Way Branch Comparison & Feature Parity Ledger (`docs/THREE_WAY_BRANCH_COMPARISON.md`, `#three-way-branch-comparison`)

- **Constantly Track All 3 Branches:** On every cross-branch or feature turn, query `git ls-remote --heads origin` and update `docs/THREE_WAY_BRANCH_COMPARISON.md` (and `THREE_WAY_COMPARISON.md`) with the latest commit SHA, timestamp, commit progression, and comparative status of:
  1. `arena/917ef347-super-duper-funicular` (*Sprite Motion Lab* — this branch)
  2. `arena/263385da-super-duper-funicular` (*Stride Lab* — motion workbench)
  3. `arena/77ffb088-super-duper-funicular` (*Photo-Rig & Matte Lab* — coherent plate & matte rig)
- **Feature Parity Goal:** Continuously adopt verified engineering strengths from the sibling branches while documenting our own implementation's unique advantages so all 3 branches converge toward full feature parity.




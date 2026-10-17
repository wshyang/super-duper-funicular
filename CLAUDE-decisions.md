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


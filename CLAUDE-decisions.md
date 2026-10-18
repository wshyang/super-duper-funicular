# CLAUDE-decisions.md — Living Spec, Addenda, Prompt Log, Continuous Learning & Branch-Watch Discipline (§1–§4)

Adopted from `wshyang/greenfield` `GREENFIELD.md §1` and `FDS_BUILDER.md`, and harmonised with the discipline already running on PR `#1` (`arena/917ef347-super-duper-funicular`) and PR `#8` (`arena/e1300d3c-super-duper-funicular`).

## 1. Source of Truth & Addenda Register

- **Base Functional Design Specification:** [`docs/FDS.md`](./docs/FDS.md) defines the object model, pipeline stages, and surfaces for this branch's charter (the revised P2 photographic-sprite pipeline). It inherits, by reference, the biomechanics and flaw-analysis background specified in the PR `#1`/`#8` FDS documents.
- **Sequentially-Numbered Addenda Register:** [`docs/ADDENDA.md`](./docs/ADDENDA.md) records every architectural, algorithmic, or tooling decision (`ADD-001`, `ADD-002`, …) that fills a gap, refines an approach, or adapts a template rule.
- **Same-Change Rule:** every decision is recorded in `docs/ADDENDA.md` in the same change that makes it, stating: (1) what was decided, (2) why (rationale & measured evidence), (3) the related FDS anchor (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`), (4) practical impact and invariants for future readers.
- **Independent, append-only numbering:** `ADD-NNN` numbers are independent of `docs/FDS.md` section numbers. Never rewrite history — supersede with a new addendum that cites its predecessor.

## 2. Mandatory Image-Generation Prompt Log, Post-Generation Visual Examination & Refinement Gate (`#image-prompt-log`)

- **Log every prompt verbatim.** With every `generate_image` call, record in `docs/FDS.md#image-prompt-log`: the **exact prompt string**, the target `file_path`, and the reference `images` array.
- **Inspect every result immediately via `read_file`:** never accept a generated plate, cutout, sheet, or composite unseen. Verify (a) persona gender/anatomy fidelity, (b) persona build differentiation (never pass a slimmer persona's plate as the primary shape reference for a fuller persona), (c) single-subject framing on a clean `#FF00FF` magenta key, (d) clean anatomical surfaces, (e) chirality (the `90°` sagittal L-bend rule for isolated medial far limbs).
- **Audit at final display resolution** (`1×`, `2×`, `4×` contact sheets), not only at plate zoom: defects invisible at sprite scale are telemetry, not blockers; defects visible at `2×` are blockers. (`ADD-007`.)
- **Refine or regenerate immediately** when an asset fails inspection; when regenerating an existing `file_path`, append (never overwrite) the new verbatim prompt plus a **Regeneration Justification** explaining what defect triggered the call and what prompt constraints address it.
- **Historical honesty:** never reconstruct or fabricate unavailable historical prompts from memory.

## 3. Mandatory Continuous Per-Turn Learning Register (`#continuous-learning-log`)

- **Update every turn:** read `docs/FDS.md` before starting work and append/update a `TURN-LNN` entry in `docs/FDS.md#continuous-learning-log` during **every** turn — including investigative runs, visual audits, and doc-only turns. This turn's entry is a completion gate: do not end the turn with an undocumented outcome.
- Each entry records: (a) Context & Trigger; (b) Evidence & Provenance (exact paths, commands, telemetry, images viewed, commit SHAs); (c) Learnings & cross-branch comparisons (what worked, dead ends, strengths adopted from siblings); (d) Decisions (`Adopted`/`Rectified`/`Deferred`/`Rejected`); (e) Executed validation & next actions. If nothing new was learned, record `"No new technical learning"` with the reason.
- **Cross-branch inspection safety:** inspect sibling branches in detached worktrees outside this repository's primary working copy (e.g. `/home/user/pr1-review`, `/home/user/pr8-review`, or `/tmp/branch-*`), never by switching the active session branch.

## 4. Branch-Watch Ledger (`#branch-watch`)

- **Watched branches this session:** PR `#1` (`arena/917ef347-super-duper-funicular`) and PR `#8` (`arena/e1300d3c-super-duper-funicular`). On any comparative turn, `git fetch origin` and record latest tip SHAs in the assessment/learning docs **distinguishing latest observed SHA from reviewed SHA** — hash automation never performs semantic review.
- **Inheritance rule:** strengths from the watched branches (biomech core, audit harness design, prompt-log discipline, `IMG-ERR`/`PIPE-ERR` failure catalogs) are adopted via explicit addenda entries; their known failure modes are carried as counters in the P2 design rather than re-learned.
- Goal: the P2 pipeline specified here must be implementable **on top of** either branch's codebase without discarding their verified components.

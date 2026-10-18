# CLAUDE-decisions.md — Living Specification, Addendum, Continuous Learning & Live N-Way Comparison Discipline (§1)

Adopted from `wshyang/greenfield` `GREENFIELD.md §1` and `FDS_BUILDER.md`, and harmonised across all $N$ branches of `wshyang/super-duper-funicular`.

## 1. Source of Truth & Addenda Register

- **Base Functional Design Specification:** `docs/FDS.md` (comprehensive FDS v4.0.0 following `FDS_BUILDER.md` v2.0) and `docs/SPEC.md` (concise functional contract) define object models, pipeline stages, biomechanical gait rules, and UI/CLI surfaces.
- **Sequentially-Numbered Addenda Register:** `docs/ADDENDA.md` records every architectural, algorithmic, or tooling decision (`ADD-001`, `ADD-002`, …) that fills a gap, refines an algorithm, or adapts a template rule.
- **Same-Change Rule:** Every decision must be recorded in `docs/ADDENDA.md` in the same change that implements the code. Each entry states:
  1. **What was decided**
  2. **Why (rationale & measured evidence)**
  3. **Related FDS section anchor** (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`)
  4. **Practical impact & invariants for future readers**
- **Independent Numbering:** Addenda numbers (`ADD-NNN`) are append-only and independent of `docs/FDS.md` section numbers. Preserve prior findings; date corrections or supersede with a new addendum rather than silently rewriting history.

## 2. Mandatory Image Generation Prompt Log, Post-Generation Visual Examination & Refinement Gate (`#image-prompt-log`)

- **Log Every Prompt Verbatim in `docs/FDS.md`:** With every `generate_image` call, you MUST record the **exact image prompt string** used, the target `file_path`, and any reference `images` array inside `docs/FDS.md` (`#image-prompt-log`).
- **Mandatory Post-Generation Visual Examination & Refinement If Not to Standard:**
  1. **Inspect Every Generated Plate Immediately via `read_file`:** Never accept a `generate_image` result unseen. Immediately call `read_file` on the generated PNG (`src/images/...`) and verify:
     - **Gender & Anatomical Fidelity:** Female personas must have genuinely feminine limb and hand anatomy (smooth skin, slender/soft wrists, natural fingers — never hypertrophied/vascular male bodybuilder biceps/forearms or bulky male fists).
     - **Body-Type & Silhouette Differentiation:** Each persona's plates (`01` master profile, `04` cervical neck, `05` torso, `06` pelvis/shorts, `07`/`08` arms, `09`/`10` legs) must visibly match that persona's physique (e.g., fuller bust, wider waist/hips, fuller neck and limbs for `photo-sg-chinese-female-average` vs. lean athletic sprinter for `photo-sg-chinese-female`). Never pass a slimmer persona's part cutout as a primary reference image (`images: [...]`) when generating a fuller persona's part if doing so causes the image model to copy the slimmer outline or a plastic mannequin socket hole.
     - **Single-Subject & Clean-Surface Rules:** Reject multi-pose turnaround sheets when a single `90°` sagittal profile was requested; reject recessed mannequin arm-socket holes on torsos; reject skin patches on socks orcropped chin/lips on neck cylinders.
  2. **Inspect Extracted `160×160` Part Cutouts, 16-Phase Gait Sheets, and Neutral Upright Staging (`read_file`):** After `npm run generate-sheets` and `npm run dump-cycle`, inspect extracted parts and full-cycle sheets, then compare the stitched neutral upright persona with its keyed source master. Record estimated height as an estimate (never present it as subject metadata), and compare arm/leg/torso/hip lengths and widths as percentages of total standing height. Set per-persona tunable defaults from this evidence. Do not force source-backed photo rigs into the generic rig's arm/leg ratio; avoid unnatural stubby arms and document any divergence.
  3. **Refine or Regenerate Immediately:** If any generated studio plate or extracted part cutout fails visual examination, refine the prompt and regenerate (`generate_image`), or refine the algorithmic side-profile/part extractor (`side-profile-arm-extractor.ts` / `photoreal-extractor.ts`), and re-verify via `read_file` before proceeding.
- **Append-Only Regeneration Audit Trail:** When the same image (`file_path`) must be regenerated, never overwrite or delete the prior prompt entry. Append a new chronological entry containing:
  1. **The exact subsequent prompt** used for the regeneration call.
  2. **Regeneration Justification:** A concrete technical explanation of why the additional call was required (e.g., male muscular/vascular arm anatomy on a female persona, slim mannequin torso/neck copied from a slimmer reference plate, cropped mouth/chin on neck plate, or multi-figure turnaround sheet) and what prompt constraints were added to solve it.
- **Historical Honesty:** Never reconstruct or fabricate unavailable historical prompts from memory.

## 3. Mandatory Continuous Per-Turn Learning Register (`#continuous-learning-log`)

- **Update Learnings Constantly Every Turn:** Read `docs/FDS.md` before starting work and update `docs/FDS.md` (`#continuous-learning-log`) **during every single turn** (including investigative runs, visual audits, no-code turns, cross-branch reviews, and PR handoffs).
- **Structured Turn-by-Turn Learning Entries (`TURN-L01`, `TURN-L02`, …):** Every turn must record:
  1. **Context & Trigger:** The user request, audit trigger, or architectural question addressed in that turn.
  2. **Evidence & Provenance:** Exact file paths, CLI commands, telemetry (`audit-report.json`), visual sheets inspected via `read_file`, or external branch commit SHAs and timestamps inspected in detached `/tmp/branch-*` directories.
  3. **Learnings & Comparative Analysis:** What worked, what failed and why (dead ends recorded in `docs/RECTIFICATION_PLAN.md`), what good ideas were learned from sibling branches, and what our own implementation does better with concrete measurements.
  4. **Decisions (`Adopted` / `Rectified` / `Deferred` / `Rejected`):** How findings were translated into code, plan files (`PLAN.md`), and specification updates.
  5. **Executed Validation & Next Actions:** Exact test/build/audit gates executed in that turn (never claim unrun gates passed) and remaining open items. If nothing new was learned in a turn, explicitly record `"No new technical learning"` with the reason.

## 4. Live N-Way Branch Comparison & Feature Parity Ledger (`docs/N_WAY_COMPARISON.md`, `#n-way-branch-comparison`)

- **Constantly Track All $N$ Repository Branches:** On every comparative or implementation turn, run `npm run branches:compare` (`scripts/compare-branches.ts`) to fetch explicit branch heads from `origin`, update `docs/BRANCH-TIPS.json` and append-only `docs/BRANCH-HISTORY.json`, and refresh `docs/N_WAY_COMPARISON.md` (and root `N_WAY_COMPARISON.md`, plus synced `docs/THREE_WAY_BRANCH_COMPARISON.md` / `THREE_WAY_COMPARISON.md`) across all repository branches:
  1. `arena/e1300d3c-super-duper-funicular` (*Harmonised N-Way Greenfield Studio* — **this active branch**)
  2. `arena/917ef347-super-duper-funicular` (*Sprite Motion Lab* — PR `#1`)
  3. `arena/263385da-super-duper-funicular` (*Stride Lab* — PR `#2`)
  4. `arena/77ffb088-super-duper-funicular` (*Funicular / Photo-Rig & Matte Lab* — PR `#3`)
  5. `arena/ce6d2a6e-super-duper-funicular` (*Initial Greenfield Prototype* — historical baseline)
- **Observed Remote Tip SHA vs. Reviewed SHA:** Never advance a "Reviewed SHA" based on hash automation alone; inspect changed code in detached `/tmp/branch-*` directories before advancing reviewed hashes. Record this branch's uncommitted working delta separately from its last observed remote SHA.
- **Cross-Branch Inspection Safety:** Always inspect sibling branches in `/tmp/branch-*` outside `/home/user/super-duper-funicular` so the active session branch (`arena/e1300d3c-super-duper-funicular`) is never switched, renamed, or polluted.
- **Feature Parity Goal:** Continuously adopt verified engineering strengths from all sibling branches while preserving our implementation's architectural advantages so all active branches converge toward 100% feature parity.

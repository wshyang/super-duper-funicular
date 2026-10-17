# CLAUDE-decisions.md — Living Specification & Addendum Discipline (§1) + Image Prompt Log + Continuous Learning + N-Way Ledger

Adopted from `wshyang/greenfield` `GREENFIELD.md §1` and `FDS_BUILDER.md` D3, D9, D12, D13.

## 1. Source of Truth & Addenda Register

- **Base Functional Design Specification:** `docs/FDS.md` is the canonical contract (FDS_BUILDER.md v2.0: `#obj-*` objects, `#feat-*` features, `#surf-*` surfaces, `#nfr-*` requirements, D1–D21, R1–R8). `docs/SPEC.md` mirrors the functional contract for Stride-Lab compatibility where present.
- **Sequentially-Numbered Addenda Register:** `docs/ADDENDA.md` records every architectural, algorithmic, or tooling decision (`ADD-001`, `ADD-002`, … append-only) that fills a spec gap, adds an object/field/surface, or deviates from the base spec.
- **Same-Change Rule:** Proactively write each addendum **in the same change that makes the decision** — never as a follow-up. Each entry states:
  1. **What was decided**
  2. **Why (rationale & evidence, including rejected alternatives)**
  3. **Related FDS section anchor** (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`, or `docs/FDS.md §N`)
  4. **Practical impact & invariants for future readers** (what must stay in sync)
- **Independent Numbering:** `ADD-NNN` is append-only and independent of `docs/FDS.md` section numbers; the base spec stays stable while addenda grow forever.
- **Addenda + FDS Twin Sync:** Whenever a contract surface changes, update both `docs/FDS.md` and `docs/ADDENDA.md` in the same commit (harmonising Sprite Motion Lab's unified-FDS model with Stride Lab's split SPEC/FDS model).

## 2. Mandatory Image Generation Prompt & Regeneration Justification Log (`#image-prompt-log`)

Synthesised from Branch 1 `ADD-018` (21-call verbatim log), Branch 2 `CLAUDE.md` Rule 13 (prospective logging + failure to reconstruct historical prompts), and Branch 3 `PHOTO-PROMPTS.md` + `D-9` honesty.

- **Log Every Prompt Verbatim in `docs/FDS.md#image-prompt-log` (mirror in `docs/PHOTO-PROMPTS.md`):** With every `generate_image` call, record:
  - **Exact verbatim prompt string** (copy-paste, no paraphrase)
  - Target `file_path`
  - Reference `images` array (if provided)
  - Call index (`Call #01`, `Call #02`, …) and timestamp
- **Append-Only Regeneration Audit Trail:** When the same `file_path` is regenerated, never overwrite or delete prior entries. Append a new entry with:
  1. **Exact subsequent prompt** for the regeneration call.
  2. **Regeneration Justification:** Concrete defect observed in the prior image (e.g., `45°` three-quarter twist vs `90°` sagittal, right-arm chirality illusion, arm occluding torso panel, harsh side-shadow groove, missing `isSkin` purge) and exact prompt constraints added to fix it.
- **Historical Completeness & Honesty:** `docs/FDS.md#image-prompt-log` must contain the complete history across the entire conversation. If historical prompts are unavailable in the checkout, state "unrecoverable — marked `[DRAFT — unknown]`" (per FDS_BUILDER D1) and never fabricate them as verbatim.
- **Gate Enforcement:** `src/discipline/greenfield-gate.test.ts` asserts that every `generate_image` in code has a corresponding `#image-prompt-log` entry.

## 3. Mandatory Continuous Per-Turn Learning Register (`#continuous-learning-log`)

Merged best practice: Branch 1 `TURN-L01..L11` depth, Branch 2 `CLAUDE.md` Rules 9–13 append-only evidence register, Branch 3 `docs/FDS.md L001/L002` evidence→observation→decision→validation chain.

- **Update Learnings Constantly Every Turn:** Read `docs/FDS.md` before work and update `docs/FDS.md#continuous-learning-log` **during every turn** (including investigative runs, visual audits, cross-branch reviews, delivery handoffs, and **no-code turns**).
- **Structured Entries:** This repo uses `TURN-LNN` (Sprite-Motion style) with `LNNN` alias accepted. Each entry records:
  1. **Context & Trigger:** User request, audit trigger, or architectural question.
  2. **Evidence & Provenance:** Exact file paths, CLI commands, telemetry (`/tmp/gait-cycle-audit/audit-report.json`), `read_file`-inspected visual sheets, or external branch SHAs/timestamps from detached `/tmp/branch-*`.
  3. **Learnings & Comparison:** What worked, what failed and why (dead ends), which good ideas were adopted from sibling branches, and which strengths our implementation retains better (with measurements, not taste).
  4. **Decisions:** `Adopted` / `Rectified` / `Deferred` / `Rejected` and rationale.
  5. **Executed Validation & Next Actions:** Exact gates run (never claim unrun gates), sandbox caveats, and open items.
- **No Fabrication Rule:** If nothing new was learned, record "No new technical learning this turn because {reason}" rather than inventing findings, prompts, images, or test outcomes.
- **Cross-Branch Safety:** Clone/extract reference branches into `/tmp/branch-*` outside this repo; never `git switch` the active session branch.

## 4. Live N-Way Branch Comparison & Feature Parity Ledger (`#three-way-branch-comparison` / `#n-way-comparison`)

Merged discipline: Branch 1's 24-dimension matrix + `CROSS-01..CROSS-12` adoption pipeline, Branch 2's timestamp-based latest-selection + detached-archive inspection, Branch 3's `BRANCH-TIPS.json` + `BRANCH-HISTORY.json` + `npm run branches:compare` automation.

- **Constantly Track All N Branches:** On every cross-branch or implementation turn, run `npm run branches:compare` (`tools/compare-branches.ts`) which executes `git ls-remote --heads origin`, fetches all `arena/*` heads, and refreshes:
  - Live tip registry: `docs/BRANCH-TIPS.json` (SHA + timestamp + PR status per branch)
  - Full SHA history: `docs/BRANCH-HISTORY.json` + `docs/N_WAY_BRANCH_COMPARISON.md §1`
  - 24+ dimension parity matrix (§3), FDS (§5) and discipline (§6) comparisons
- **Branches Tracked:**
  1. `arena/db7c86d4-super-duper-funicular` (*This Branch — Harmonised Greenfield*)
  2. `arena/917ef347-super-duper-funicular` (*Sprite Motion Lab — Algorithmic + SVG + photoreal pipeline*)
  3. `arena/263385da-super-duper-funicular` (*Stride Lab — Motion workbench + multi-locomotion + calibration*)
  4. `arena/77ffb088-super-duper-funicular` (*Photo-Rig & Matte Lab — coherent plates + matte invariants*)
  5. `arena/ce6d2a6e-super-duper-funicular` (*Early prototype — historic, superseded*)
- **Feature Parity Goal:** Continuously adopt verified engineering strengths from siblings while documenting unique local advantages so all active branches converge toward **100% feature parity**. A capability is not "complete" until its behavioural acceptance and relevant visual-review pass. Never alter another branch to claim parity; never count passing tests as visual correctness.
- **Document Locations:** Canonical `docs/N_WAY_BRANCH_COMPARISON.md`; root mirrors `N_WAY_COMPARISON.md`, `THREE_WAY_BRANCH_COMPARISON.md`, `docs/THREE_WAY_BRANCH_COMPARISON.md` for backward compatibility.

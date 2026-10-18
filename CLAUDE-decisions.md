# CLAUDE-decisions.md — living spec, addenda, learning & prompt logs (§1)

Authority: `GREENFIELD.md §1` (verbatim upstream copy at repo root).

## 1. Source of truth

- **Base spec:** [`docs/FDS.md`](docs/FDS.md) — the product contract for the
  artwork inventory, extraction pipeline, gait model, render contract, UI
  surfaces and non-functional requirements, with stable anchors
  (`#obj-*` objects, `#feat-*` features, `#surf-*` surfaces, `#nfr-*` NFRs).
- **Addenda register:** [`docs/ADDENDA.md`](docs/ADDENDA.md) — append-only,
  sequentially numbered, independent of FDS section numbers:
  - `ADD-NNN` — decisions made in this branch;
  - `CROSS-NNN` — capabilities adopted from / deferred against a sibling branch,
    each naming the source branch+SHA, the behavioural parity exit criterion,
    and the current status.
- **Same-change rule:** the addendum entry lands in the same commit as the code
  that embodies it. Each entry states what / why+evidence / related FDS anchor /
  practical impact.
- **Evidence vs contract split** (adopted from Stride Lab PR #2): `docs/FDS.md`
  holds the contract *and* the learning register; proposed fixes with open
  measurements live in the ledger's adoption queue (`docs/N_WAY_COMPARISON.md`
  §4) until an `ADD-`/`CROSS-` entry promotes them.

## 2. Image generation prompt & regeneration justification log

- Every `generate_image` call: record the **exact verbatim prompt**, the target
  `file_path`, and every reference image path, in
  `docs/FDS.md#image-prompt-log`, chronologically (`Call #01`, …).
- Regenerating an existing path: **append** the new prompt with a *Regeneration
  Justification* — the concrete observed defect (chirality, camera yaw, seam,
  lighting, segmentation) and the prompt constraint added to fix it.
- Never overwrite or delete earlier entries; never reconstruct missing
  historical prompts as verbatim (label reconstructions as reconstructions).
- Respect the user's per-turn generation budget; plan prompts before spending them.

## 3. Continuous per-turn learning log (`#continuous-learning-log`)

- Read `docs/FDS.md` before work. Before ending **every** turn, append or
  complete entry `TURN-Lnn` (sequential, never reused) with:
  1. **Context & trigger** — the request/audit/comparison that drove the turn;
  2. **Evidence & provenance** — full SHAs, paths, commands, outputs and images
     actually inspected; which of the four provenance categories each item is;
  3. **Learnings** — what worked, what failed and why, cross-branch ideas
     adopted *and* rejected/deferred, plus this branch's evidence-backed
     strengths (retire exclusivity claims once a peer matches);
  4. **Decisions** — `Adopted` / `Rectified` / `Deferred` / `Rejected`, each with
     its `ADD-`/`CROSS-` number;
  5. **Executed validation & next action** — exact gates run this turn (never an
     unrun gate), open items, next parity gap.
- Investigation and no-code turns count. If nothing was learned, record that and
  why. Never invent lessons or re-report stale results as freshly run.
- Corrections are dated, not silent rewrites: preserve prior findings.

## 4. Live n-way ledger coupling

- `docs/N_WAY_COMPARISON.md` is the live parity ledger; §2/§3/§4/§5 are updated
  whenever evidence changes and §1 whenever `npm run branches:compare` runs.
- FDS `TURN-Lnn` entries cite the ledger SHAs they were based on, so every
  learning is traceable to a pinned tip.

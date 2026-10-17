# CLAUDE-branches.md — n-way convergence, operationally (GREENFIELD §12)

## The branches

| Name | Branch | Role |
| --- | --- | --- |
| Sprite Motion Lab | `arena/917ef347-super-duper-funicular` | 17-part algorithmic + photographic rig, SVG vectoriser, historical prompt log |
| Stride Lab | `arena/263385da-super-duper-funicular` | Python extraction, browser workbench, walking profiles, interactive cut calibration |
| Funicular | `arena/77ffb088-super-duper-funicular` | Coherent single-photo rig, matte invariant, machine-readable branch ledger |
| Procedural Runner | `arena/ce6d2a6e-super-duper-funicular` | Smallest React procedural engine, full GREENFIELD split |
| Ours | `arena/110272a0-super-duper-funicular` | Harmonised greenfield: this repository |

## Per-turn procedure

1. `npm run branches:compare` — fetches each explicit head, writes
   `src/generated/branch-tips.json`, appends to `branch-history.json`, and
   rewrites the hash table in `docs/N_WAY_COMPARISON.md`. It never switches
   branch, never touches a peer, never runs in the background.
2. If a tip changed: `git -C /tmp/peer clone …` (or `git worktree add
   /tmp/peer-<sha> <sha>`), read the diff, and only then update a **reviewed**
   hash in the ledger.
3. Update the capability matrix, adoption queue and progress history. Change
   `src/shared/parity.ts` in the same commit if a status changed.
4. Append the turn's `TURN-Lnn` entry with the evidence and the decision.
5. If the fetch fails (offline), keep the previous hashes, label them stale with
   the observation timestamp, and say so in the turn entry.

## What counts as parity

A capability is at parity when the **user-visible behaviour** exists and its
**acceptance evidence** holds in that implementation:

- numbers with a stated method (IoU, width parity, coverage, spill count, jitter);
- a visual review of the actual output, recorded as "viewed";
- a negative case proving the failure path.

Test counts, file counts and commit counts are not evidence of parity. A branch
with 178 tests and a visible ankle gap has not solved the ankle.

## Adoption rules

- Port mechanisms, adapt contracts, land local tests. Never transplant a
  coordinate model and assume the numbers survive.
- One capability per commit where possible, so adoption can be reverted alone.
- When a peer is stronger, say so and adopt. When we are stronger, say so with
  evidence and keep it — parity is not uniformity.
- Never edit a peer branch, never merge one into ours without review, never claim
  their results as ours.

## The exit condition

Feature parity is complete when every row of the union matrix reads **Yes** or a
deliberate, documented **Gap** with a rationale that a reviewer accepts. A row
cannot be closed by deleting it from the matrix.

# Decisions, FDS, learning, prompts, and branch parity

## Canonical documents

- `docs/FDS.md` is the single living product specification and the append-only `TURN-Lnnn` learning log. Do not create a competing `SPEC.md` that duplicates it.
- `docs/ADDENDA.md` is an append-only, sequential `ADD-nnn` register for choices not stated by the user or already specified. Each entry states what, why, related FDS section, status/evidence, and practical impact. Add it in the same change as the decision or implementation.
- `docs/BRANCH-COMPARISON.md` is the only live n-way branch ledger. Peer specs and PR bodies are evidence, not binding requirements by themselves.
- `docs/VALIDATION.md` records what was actually run in this checkout; reference claims remain labelled as reported.

## Continuous learning — every turn

During the turn, note evidence as it is gathered. Before ending any turn, append the next `TURN-Lnnn` entry to the FDS with:

1. Trigger and scope (including “no-code” or delivery-only when appropriate).
2. Evidence actually inspected: full commit SHA, source/doc path, image/output, and commands.
3. What was learned and what remains uncertain.
4. Adopted, rejected, or deferred decisions and why; preserve evidence-backed strengths rather than assuming the newest branch is best.
5. Validation actually run and validation not run.
6. Next action / parity gap.

If nothing new was learned, explicitly record that and why. Never label another branch's test count as local validation. Correct earlier log entries with a dated follow-up; do not erase them.

## Dynamic n-way comparison protocol

At the beginning of every turn:

1. Query `gh pr list --repo wshyang/super-duper-funicular --state open` and `git ls-remote --heads origin`.
2. Define the active parity cohort as this session branch, every open PR branch targeting the same app, and any recent unsubmitted remote branch with clear active same-app implementation/spec work. Keep no-PR candidates explicitly provisional; closed-unmerged PRs remain reference-only and outside the denominator unless explicitly promoted. Keep superseded refs historical and track `main` separately as the base. At the latest refresh, five open PRs (#1–#4 and #6) plus this branch and one candidate make a provisional `n = 7`; membership is dynamic.
3. Record full remote SHAs, observation time, PR number/state, and commit timestamps. The session branch's local/unpushed delta cannot be represented by a future self-hash; identify the local HEAD and uncommitted delta separately.
4. Keep `latest observed` distinct from `reviewed`. A changed tip requires exact-SHA source inspection (prefer `git show` or a detached temporary worktree), review of the diff and affected tests/docs, then a feature-matrix and adoption-queue update. Never advance the reviewed SHA based on a hash alone.
5. Record whether reference code was merely read, output was personally viewed, or tests were actually executed. Do not run or claim another branch's tests unless they were independently executed in its isolated checkout.
6. Append progress to the ledger. If a branch is unchanged, say so; if remote access fails, preserve the last-known SHA and mark it stale. “Live” means refreshed on each turn, not background polling.
7. Work only on this session branch. Parity is behavioral and evidence-based; it does not require identical frameworks or coordinates. Never modify, merge, or cherry-pick another branch without explicit user direction.

## Image-generation provenance

For every image-generation call, the FDS prompt log stores the exact prompt, requested output path, reference image paths, selected output, date, and a short review of the outcome. If the same path is regenerated, keep every prior entry and add a regeneration justification naming the observed defect and intended correction. Do not invent older prompts from final artwork or prose. Prompts and results from peer branches may be cited by branch/SHA, but are not this branch's history.

## Decision corrections

When a correction affects dependent requirements, identify the related feature IDs, update their contracts and acceptance criteria together, and add a superseding `ADD-nnn` entry. Mark gaps and failed experiments explicitly; do not silently skip coupled consequences.

# CLAUDE-validation.md — Honest Validation, Provenance, Visual Audit & Local Dev (§8–§10)

Adopted from `wshyang/greenfield` `GREENFIELD.md §8–§9` and the siblings' 4-way provenance vocabulary.

## 8. Validate Early and Honestly

- **Static checking is not a substitute for real tests.** When the real toolchain is unavailable (e.g. this documentation-first stage, before the TS stack lands), run what is runnable (per-file syntax checks, pure-module execution, pipeline CLIs inside checked-out worktrees, structural greps) — but **say exactly which layer ran** and never claim "tests pass" for gates that did not run.
- The real merge gate, always: full type-check, full lint, full test suites, and the visual audit below.
- Append the validation caveat to commits made under constrained tooling so reviewers know what still must run.

### 8.1 Four-Way Epistemic Provenance Separation

All reports and learning entries strictly separate:
1. **Read source code** (paths + what was verified by reading).
2. **Personally viewed visual output** (`read_file` on specific PNG paths).
3. **Locally executed validation gates** (exact commands + exit status, e.g. `npm test` → 47/47).
4. **Other branches' reported results** (cite branch + SHA; never restate as locally executed).

## 9. Full-Cycle Visual Audit & All-or-Nothing Asset Readiness

- **After any gait, cutout, joint-rounding, or compositing change:** dump the 16-phase diagnostics (contact sheet, `2×` joint crops, standing-profile plate, extreme-pose three-panel plates) to a temp directory and inspect them via `read_file` — across light and dark panels — before declaring done. `.claude/skills/audit-gait-cycle/SKILL.md` is the operative playbook; until this repo carries its own dumper CLI, run the watched branches' `npm run dump-cycle` inside their worktrees and record that provenance.
- **Display-resolution audit standard (`ADD-007`):** acceptance renders at `1×` (final sprite size), `2×`, and `4×`. Defects invisible at `1×` are recorded as telemetry; defects visible at `2×` block merge.
- **All-or-nothing readiness:** any photoreal asset bank loads `idle` → `loaded` only when **every** required asset decodes cleanly; otherwise `error` with explicit retry. Export/preview gates until `loaded`.
- **Numeric telemetry never replaces vision:** zero detached islands and zero magenta spill can coexist with visible collage seams. Both facts are always reported together.

## 10. Reproducible Local Dev & Environment Story

- One-command setup lands with the stack (`./dev.sh`, Bash 3.2-compatible; `.env.example` committed, real `.env` uncommitted, `.env.test` isolated). Until then, any investigative run must record: worktree path, exact commands, and dependency state (`npm ci --ignore-scripts`) so the run is reproducible.
- Audit dumps go to caller-supplied temp dirs and are intentionally not committed.

# Validation Log — `docs/VALIDATION.md`

Per `CLAUDE-validation.md §8` (honest validation) and §8.1 (4-way provenance separation). This log records **exactly** what was executed, on what, and what was not.

---

## 2026-10-18 — `TURN-L01` (branch founding turn: assessment + discipline adoption + P2 ideation)

**Environment:** branch `arena/7f9c98b1-super-duper-funicular` at `396ce25` + this turn's docs change. This repository currently carries **no package.json / test runner** (documentation-first stage, `ADD-010`), so no gates exist in *this* repo yet. All pipeline gates below were executed inside detached worktrees of the watched branches.

### Layer 1 — Source code read
- `pr1-review`: `GREENFIELD.md`, `CLAUDE.md` + 8 `CLAUDE-*.md` section files, `docs/FDS.md` (v5.1.0 incl. §8.4 `IMG-ERR`/`PIPE-ERR` catalogs, §9 prompt log, §12 learning register), `docs/SPEC.md`, `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`, `src/runner/photoreal-warp.ts`, file trees.
- `pr8-review`: same discipline set, `docs/FDS.md` (v4.10.0, `TURN-L01..L21`), `docs/RECTIFICATION_PLAN.md` headers, `scripts/dump-cycle-frames.ts`, `src/pipeline/` inventory, `src/runner/photoreal-warp.ts`.

### Layer 2 — Personally viewed visuals (`read_file`)
- Root `incorrect running sprites.jpeg` (flawed source sheet).
- `pr1-review/src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png`.
- `pr8-review/src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png`.
- `pr8-review/src/images/photoreal-female/01-master-lateral-profile-reference.png`.
- `pr8-review/src/images/photoreal-female/07-near-right-arm-lateral-outside.png`.
- `pr8-review/public/sprites/photoreal/sg-chinese-female/parts/torso.png`.
- `/tmp/audit-pr1/contact-sheet-16frame.png`, `/tmp/audit-pr8/contact-sheet-16frame.png`, `/tmp/audit-pr8/joint-crops-sheet.png`, `/tmp/audit-pr8/standing-profile-audit.png`.

### Layer 3 — Locally executed gates
| Command (cwd) | Result |
|---|---|
| `git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'` (this repo) | ✅ 8 PR heads fetched |
| `git worktree add /home/user/pr1-review origin/pr/1` | ✅ @ `936f37c` |
| `git worktree add /home/user/pr8-review origin/pr/8` | ✅ @ `04d5caf` |
| `npm ci --ignore-scripts` (pr1-review) | ✅ |
| `npm ci --ignore-scripts` (pr8-review) | ✅ |
| `npm test -- --run` (pr1-review) | ✅ **47/47 passed**, 7 suites |
| `npm test -- --run` (pr8-review) | ✅ **47/47 passed**, 7 suites |
| `npm run dump-cycle -- /tmp/audit-pr1 16 photo-sg-chinese-female red` (pr1-review) | ✅ telemetry: detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0 |
| `npm run dump-cycle -- /tmp/audit-pr8 16 photo-sg-chinese-female red` (pr8-review) | ✅ telemetry: detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0 |
| `git clone https://github.com/wshyang/greenfield.git` → `/tmp/greenfield-upstream`; SHA-256 compare of `GREENFIELD.md` vs both branches' copies | ✅ byte-identical (`400d282e…`) to upstream `8ba7402` |

### Layer 4 — Other branches' reported results (cited, not re-verified)
- PR8's own five-persona audit (`gh pr view 8`): 16 frames per persona, zero islands/spill/uncovered joints, athletic support frames up to +6 px ground penetration — cited in the assessment; **not** re-measured here.
- PR8's validation claims (47/47, typecheck, build) — typecheck/build not re-run here; our own 47/47 run confirms the test count only.

### Honest caveats
- No `tsc`/`vitest`/`vite build` ran on **this** branch — no code exists here yet (`ADD-010`). The discipline files are review-enforced until the mechanical gate lands.
- The generated images cited from the worktrees were produced by those branches' own turns (their prompt logs are the provenance of record); this turn made **zero** `generate_image` calls.

### Next actions requiring validation
- P2.0: implement the extended audit dump (display-resolution strips + texture/tone/identity metrics) and publish baseline numbers for both branches' current assets.
- P2.1: persona bible + 8-key pilot with full K2 conformance telemetry.

# CLAUDE-validation.md — Honest Validation, Visual Audit & Reproducible Environment (§8–§9)

Adopted from `wshyang/greenfield` `GREENFIELD.md §8–§9` + Branch 1/2/3 audit & provenance refinements.

## 8. Validate Early and Honestly

Always run and report **exactly** the validation layers executed:

1. `npm run typecheck` (`tsc --noEmit` / `tsc -b`)
2. `npm run pipeline` (`dedupe` → `extract` → `analyse` → `generate-sheets`, real JPEG/PNG decode)
3. `npm run lint` / `npm run format:check` (ESLint + Prettier)
4. `npm test` (`vitest run` — real image assets, real solver, discipline gate)
5. `npm test:e2e` (`playwright test` — video on, `E2E_VIDEO=off` to disable)
6. `npm run build` (`vite build` → `dist/`)
7. `npm run dump-cycle` / `npm run photo:audit` / `npm run branches:compare` (audit & ledger generators)
8. Live server verification on `0.0.0.0:3000` (`npm run dev`, `curl http://127.0.0.1:3000/healthz`).

Document any sandbox/network caveats explicitly in `docs/VALIDATION.md` and `docs/ADDENDA.md`.

### 8.1 Naming the Validation Layer & Provenance Separation (Synced Across All N Branches)

Say **exactly** what ran and strictly separate **four provenance categories**:

| # | Provenance | How to phrase it | Example |
|---|---|---|---|
| 1 | **Read source code** | "inspected `<path>` in detached `/tmp/branch-*` @ `SHA`" | `git archive <sha> \| tar -x -C /tmp/...` — never `git switch` |
| 2 | **Personally viewed visual output** | "opened `/tmp/.../contact-sheet-16frame.png` via `read_file` and observed {defect}" | `/tmp/gait-cycle-audit/joint-crops-sheet.png` showed 6 detached islands |
| 3 | **Locally executed validation gates** | "`npm test` (N/N) / `npm run typecheck` / `npm run build` passed in this workspace this turn" | `vitest run 29/29` on `arena/db7c86d4` |
| 4 | **Other branches' reported results** | "Branch X reported {count} in its PR — not re-executed here" | PR #1 states `26/26` — distinct from a local run |

Never upgrade "unit tests pass" into "the app works", or a sibling's reported count into a local verification.

| Common claim | Exact meaning in this repo |
|---|---|
| `typecheck clean` | `npm run typecheck` exited 0 in this workspace |
| `N/N Vitest tests pass` | `npm test` (`vitest run`) exited 0 across all suites here |
| `pipeline & dedupe clean` | `npm run dedupe && npm run extract` decoded real sheet bytes → `public/sprites/` |
| `16-phase cycle dump & visual audit inspected` | `npm run dump-cycle` wrote 16 frames + 3-panel plates + `contact-sheet-16frame.png` + `joint-crops-sheet.png` + `audit-report.json` into `/tmp/gait-cycle-audit`, and sheets were visually inspected via `read_file` |
| `production build clean` | `npm run build` produced `dist/` |
| `live dev server listening` | `start_process (npm run dev)` bound `0.0.0.0:3000` |
| `container / CI starter verified` | Static contract verified in `greenfield-gate.test.ts` + `activate-shiphats.sh --non-interactive` scratch test; Docker daemon build, Cloudflared tunnel, and SHIP-HATS GitLab runners are *not* executed in the sandbox |

## 9. Full-Cycle Temporary Frame Dump & Agent Visual Audit Skill (`audit-gait-cycle`)

Whenever articulated cutouts, rounded-joint cutters, bone warpers, or gait foot-roll are changed, execute the **audit-gait-cycle Agent Skill** (`.claude/skills/audit-gait-cycle/SKILL.md`):

1. Run `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red` to dump 16 raw frames (`frame-XX-deg-YYY.png`), 16 three-panel diagnostic plates (`audit-frame-XX-deg-YYY.png` = Light + Dark + Joint Overlay), `contact-sheet-16frame.png` (`4×4`), `joint-crops-sheet.png` (`2×` magnified joint crops), and `audit-report.json` (`{ detachedIslands, magentaSpill, uncoveredJoints }`) into `/tmp/gait-cycle-audit` (gitignored / ignored temp).
2. Visually inspect the sheets and extreme-pose frames with `read_file` to identify joint-step notches, garment-boundary gaps, ankle/shoe shear, or chroma spill; record findings + rectification proposals in `PLAN.md` + `docs/FDS.md #gait-cycle-visual-audit`.
3. Keep generated evidence in ignored/temp; document findings and limitations in FDS. Do not label antialiasing or dark-background ink as defects.

The skill complements (not replaces) the browser `JointAndCycleAuditPanel` 16-phase PNG exporter (light/dark/overlay per phase, footer with motion/phase/support).

## 10. Reproducible Local Dev & Environment Story

- `./dev.sh` (Bash 3.2) verifies `node_modules`, runs `npm run pipeline`, optionally `--check-only` (`typecheck` + `test`), else `exec npm run dev` on `0.0.0.0:3000`.
- `.env.example` + `.env.test` document defaults (`HOST`, `PORT`, `VITE_APP_TITLE`); uncommitted `.env` never shipped. No secrets in manifests; public artwork contains no PII.
- Generated artefacts (`public/sprites/**`, `src/images/manifest.json`, `src/generated/*.json`, `reports/*.png`) are committed *and* reproducible via `npm run pipeline` / `npm run sprites:analyse`.
- Static validation gates (Dockerfile contract, SHIP-HATS placeholder check, `data-testid` presence) are enforced in `src/discipline/greenfield-gate.test.ts` on every `npm test`.


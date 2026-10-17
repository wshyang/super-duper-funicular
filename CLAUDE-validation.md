# CLAUDE-validation.md — Honest Validation & Reproducible Local Dev (§8–§9)

Adopted from `wshyang/greenfield` `GREENFIELD.md §8–§9`.

## 8. Validate Early and Honestly

- Always run and report the exact validation layers executed:
  1. `npm run typecheck` (`tsc --noEmit`)
  2. `npm run pipeline` (`dedupe`, `extract`, `analyze`, `generate-sheets`)
  3. `npm test` (`vitest run` — real image assets, real solver, real discipline gates)
  4. `npm run build` (`tsc -b && vite build`)
  5. `npm run dump-cycle` (Full-Cycle 16-Frame Temporary Screenshot Dumper & Multimodal Visual Defect Audit Skill — `.claude/skills/audit-gait-cycle/SKILL.md`)
  6. Live server verification on `0.0.0.0:3000`.
- Document any sandbox environment caveats (such as external network restrictions) explicitly in commit messages, `docs/VALIDATION.md`, and `docs/ADDENDA.md`.

### 8.1 Naming the Validation Layer & Provenance Separation (Synced Across All 3 Branches)

Say **exactly** what ran, and strictly separate **four provenance categories**:
1. **Read source code** (e.g., detached `/tmp/branch-*` reference checkouts).
2. **Personally viewed visual output** (e.g., `/tmp/gait-cycle-audit/contact-sheet-16frame.png` and `joint-crops-sheet.png` opened via `read_file`).
3. **Locally executed validation gates** (commands actually run in `/home/user/super-duper-funicular` during the turn).
4. **Other branches' reported results** (never claim another branch's test or E2E count as locally executed unless run here).

| Validation Claim | Exact Meaning in This Repository |
|---|---|
| `"typecheck clean"` | `npm run typecheck` (`tsc --noEmit`) exited `0` |
| `"N/N Vitest tests pass"` | `npm test` (`vitest run`) exited `0` across all 4 suites (`pipeline`, `runner`, `greenfield-gate`, `studio-view-model`) |
| `"pipeline & dedupe clean"` | `npm run dedupe && npm run generate-sheets` decoded real JPEG/PNGs and regenerated `/public/sprites/**` |
| `"16-phase cycle dump & visual audit inspected"` | `npm run dump-cycle` wrote 16 frames + 3-panel plates + `contact-sheet-16frame.png` + `joint-crops-sheet.png` + `audit-report.json`, and sheets were visually inspected via `read_file` |
| `"production build clean"` | `npm run build` (`tsc -b && vite build`) produced `dist/` |
| `"live dev server listening"` | `start_process` (`npm run dev`) bound `0.0.0.0:3000` |
| `"container / CI starter verified"` | Static contract verified in `greenfield-gate.test.ts` and `activate-shiphats.sh` scratch test; Docker daemon build, `cloudflared` tunnel, and remote SHIP-HATS GitLab runners are **not** executed in the sandbox |


## 9. Full-Cycle Temporary Frame Dump & Agent Visual Audit Skill (`audit-gait-cycle`)

- Whenever articulated cutouts, rounded-joint cutters, or bone/foot warpers are changed, execute the **`audit-gait-cycle` Agent Skill** (`.claude/skills/audit-gait-cycle/SKILL.md`):
  1. Run `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red` to dump 16 full-cycle raw frames, 16 three-panel diagnostic plates (`frames/audit-frame-XX-deg-YYY.png`), `contact-sheet-16frame.png`, `joint-crops-sheet.png`, and `audit-report.json` into `/tmp/gait-cycle-audit`.
  2. Visually inspect the generated sheets and extreme-pose frames with `read_file` to identify joint-step notches, garment-boundary gaps, ankle/shoe shear, or chroma spill, and record findings + rectification proposals in `docs/FDS.md` (`#gait-cycle-visual-audit`).

## 10. Reproducible Local Dev & Environment Story

- `./dev.sh` provides a single Bash 3.2-compatible command to verify dependencies, run the sprite extraction & algorithmic generation pipeline, execute the test suite, and start the development server on `0.0.0.0:3000`.
- `.env.example` and `.env.test` document configuration defaults cleanly separated from uncommitted `.env` files.

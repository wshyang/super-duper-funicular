# CLAUDE-checklist.md — 18-Point Harmonised Greenfield Checklist (§11)

Adopted from `wshyang/greenfield` `GREENFIELD.md §11` and harmonised across all $N$ branches of `wshyang/super-duper-funicular`.

| # | Greenfield Requirement | Repository Implementation |
|---|---|---|
| 1 | Source-of-truth spec + addenda numbering | `docs/FDS.md` (`v4.0.0`) + `docs/SPEC.md` + `docs/ADDENDA.md` (`ADD-001`..`ADD-025`) |
| 2 | Real tests, no mocks where it counts | `src/pipeline/*.test.ts`, `src/runner/*.test.ts` run on real JPEG/PNG buffers |
| 3 | One-casing policy (`camelCase`) | Enforced across `src/shared/types.ts` and all JSON manifests |
| 4 | Soft-invalidation metadata & hash inventory | Asset catalog entries track `status` & `supersededBy`; `docs/artwork-inventory.json` records byte/pixel/dHash digests |
| 5 | Deterministic manifest regeneration | `npm run pipeline` updates `/src/images`, `/public/sprites`, and `docs/artwork-inventory.json` |
| 6 | `data-testid` convention + typed contracts | `{component-kebab}__{element-role}` on all interactive controls |
| 7 | Co-located test layout by domain | `src/pipeline/`, `src/runner/`, `src/app/`, `src/discipline/` |
| 8 | Deterministic fixtures & palettes | 6 canonical team palettes (`red`, `blue`, `green`, `yellow`, `purple`, `orange`) + 3 locomotion modes (`run`, `walk`, `brisk-walk`) |
| 9 | Honest validation reporting & 4-way provenance | Verified via `src/discipline/greenfield-gate.test.ts` and `docs/VALIDATION.md` |
| 10 | One-command setup + `.env.example`/`.env.test` | `./dev.sh`, `.env.example`, `.env.test` |
| 11 | Function design rules (≤50 LOC, ≤3 params, pure JSX) | Enforced by automated AST/line gate in `src/discipline/greenfield-gate.test.ts` |
| 12 | Container contract (`0.0.0.0:3000`, non-root `1001`) | `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore` |
| 13 | Inert SHIP-HATS pipeline + Bash 3.2 `activate-shiphats.sh` | `*.shiphats` + `activate-shiphats.sh` tested in scratch dir |
| 14 | Mandatory Image Generation Prompt & Regeneration Justification Log | Every `generate_image` exact prompt + regeneration rationale logged in `docs/FDS.md#image-prompt-log` (`CLAUDE-decisions.md §2`) |
| 15 | Full-Cycle Temporary Frame Dump & Agent Visual Audit Skill | `npm run dump-cycle` (`src/pipeline/cycle-frame-dumper.ts`) + `.claude/skills/audit-gait-cycle/SKILL.md` (`CLAUDE-validation.md §9`) |
| 16 | Mandatory Continuous Per-Turn Learning Register | Append/update `TURN-L01..LNN` learnings in `docs/FDS.md#continuous-learning-log` during every turn (`CLAUDE.md` Rule 3, `CLAUDE-decisions.md §3`) |
| 17 | Live N-Way Branch Comparison & Feature Parity Ledger | Track latest commit hashes & 28-dimension feature parity across all $N=5$ branches in `docs/N_WAY_COMPARISON.md` & `N_WAY_COMPARISON.md` (`CLAUDE-decisions.md §4`) |
| 18 | Automated Branch Hash Refresh & History CLI (`npm run branches:compare`) | `scripts/compare-branches.ts` refreshes `docs/BRANCH-TIPS.json`, `docs/BRANCH-HISTORY.json`, and `<!-- branch-tips:start -->` tables |
| 19 | Mandatory Post-Generation Asset Examination & Refinement Gate | Visually inspect every generated studio plate (`src/images/...`) and extracted part cutout (`public/sprites/photoreal/.../parts/*.png`) via `read_file` against gender, silhouette, and anthropometric standards (no male arms on female personas, no slim mannequin torso/neck on fuller personas, no T-rex arms) and refine/regenerate immediately (`CLAUDE.md` Rule 2, `CLAUDE-validation.md §9.2`) |
| 20 | Per-Persona Height & Proportion Calibration | Record an explicitly estimated height and source-profile segment/width ratios; compare keyed source profile with the stitched neutral upright rig at a shared baseline/normalized height; set and visually inspect resettable default width/length tunables (`TURN-L17`, `ADD-034`) |

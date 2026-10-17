# CLAUDE-checklist.md — 13-Point Greenfield Checklist (§11)

Adopted from `wshyang/greenfield` `GREENFIELD.md §11`.

| # | Greenfield Requirement | Repository Implementation |
|---|---|---|
| 1 | Source-of-truth spec + addenda numbering | `docs/FDS.md` + `docs/ADDENDA.md` (`ADD-001`..`ADD-012`) |
| 2 | Real tests, no mocks where it counts | `src/pipeline/*.test.ts`, `src/runner/*.test.ts` run on real JPEG/PNG buffers |
| 3 | One-casing policy (`camelCase`) | Enforced across `src/shared/types.ts` and all JSON manifests |
| 4 | Soft-invalidation metadata | Asset catalog entries track `status` and `supersededBy` |
| 5 | Deterministic manifest regeneration | `npm run pipeline` updates `/src/images` & `/public/sprites` manifests |
| 6 | `data-testid` convention + typed contracts | `{component-kebab}__{element-role}` on all interactive controls |
| 7 | Co-located test layout by domain | `src/pipeline/`, `src/runner/`, `src/app/`, `src/discipline/` |
| 8 | Deterministic fixtures & palettes | 6 canonical team palettes (`red`, `blue`, `green`, `yellow`, `purple`, `orange`) |
| 9 | Honest validation reporting | Verified via `src/discipline/greenfield-gate.test.ts` |
| 10 | One-command setup + `.env.example`/`.env.test` | `./dev.sh`, `.env.example`, `.env.test` |
| 11 | Function design rules (≤50 LOC, ≤3 params, pure JSX) | Enforced by automated AST/line gate in `src/discipline/greenfield-gate.test.ts` |
| 12 | Container contract (`0.0.0.0:3000`, non-root `1001`) | `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore` |
| 13 | Inert SHIP-HATS pipeline + Bash 3.2 `activate-shiphats.sh` | `*.shiphats` + `activate-shiphats.sh` tested in scratch dir |
| 14 | Mandatory Image Generation Prompt & Regeneration Justification Log | Every `generate_image` exact prompt + regeneration rationale logged in `docs/FDS.md#image-prompt-log` (`CLAUDE-decisions.md §2`) |
| 15 | Full-Cycle Temporary Frame Dump & Agent Visual Audit Skill | `npm run dump-cycle` (`src/pipeline/cycle-frame-dumper.ts`) + `.claude/skills/audit-gait-cycle/SKILL.md` (`CLAUDE-validation.md §9`) |
| 16 | Mandatory Continuous Per-Turn Learning Register | Append/update `TURN-L01..LNN` learnings in `docs/FDS.md#continuous-learning-log` during every turn (`CLAUDE.md` Rule 3, `CLAUDE-decisions.md §3`) |


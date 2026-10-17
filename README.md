# Super-Duper-Funicular — Harmonised Greenfield Sprite Motion Lab

This branch (`arena/db7c86d4-super-duper-funicular`) is a **harmonised Greenfield rebuild** that unifies the best engineering from all unmerged PRs on `wshyang/super-duper-funicular` toward **feature parity across N branches**.

- **Upstream discipline:** [`wshyang/greenfield`](https://github.com/wshyang/greenfield) at `8ba74027be5fad41e48cadde82cc0120d628b109` — `GREENFIELD.md` + `FDS_BUILDER.md` adopted verbatim at repo root.
- **Standing instructions:** [`CLAUDE.md`](./CLAUDE.md) + 8 focused `CLAUDE-*.md` files (`GREENFIELD.md §0` split).
- **Functional spec:** [`docs/FDS.md`](./docs/FDS.md) (`FDS_BUILDER.md v2.0` canonical, with `#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`, D1–D21, R1–R8).
- **Decision register:** [`docs/ADDENDA.md`](./docs/ADDENDA.md) sequential `ADD-NNN`.
- **Live parity ledger:** [`docs/N_WAY_BRANCH_COMPARISON.md`](./docs/N_WAY_BRANCH_COMPARISON.md) (root mirrors: `N_WAY_COMPARISON.md`, `THREE_WAY_BRANCH_COMPARISON.md`, `THREE_WAY_COMPARISON.md` compat).
- **Validation ledger:** [`docs/VALIDATION.md`](./docs/VALIDATION.md) with 4-way provenance separation.
- **Rectification & learning:** [`PLAN.md`](./PLAN.md) + `docs/RECTIFICATION_PLAN.md` + `docs/FDS.md#continuous-learning-log`.

## Quick Start

```bash
npm install               # pinned deps (pure-TS, no native binaries)
npm run pipeline          # dedupe → extract → analyse → generate sheets
npm run typecheck         # tsc --noEmit
npm test                  # vitest run (real assets, real solver, greenfield gate)
npm run build             # vite build → dist/
npm run dump-cycle        # 16-phase full-cycle audit → /tmp/gait-cycle-audit
npm run dev               # vite on 0.0.0.0:3000 (allowedHosts: true)
./dev.sh                  # one-command: pipeline + typecheck + test + dev
```

## Branch lineage

All branches fork from `main` @ `396ce25` ("Add files via upload" — `incorrect running sprites.jpeg`).

| Role | Branch | PR | Tip at last ledger refresh |
|---|---|---|---|
| **This branch** | `arena/db7c86d4` | — (session) | `396ce25` + uncommitted harmonised specs |
| Sprite Motion Lab | `arena/917ef347` | #1 OPEN | `e172b0f` (2026-10-18) |
| Stride Lab | `arena/263385da` | #2 OPEN | `b227e2f` (2026-10-17) |
| Photo-Rig & Matte Lab | `arena/77ffb088` | #3 OPEN | `43352cf` (2026-10-17) |
| Early prototype | `arena/ce6d2a6e` | — historic | `bab689c` (2026-10-17) |

See [`docs/N_WAY_BRANCH_COMPARISON.md`](./docs/N_WAY_BRANCH_COMPARISON.md) for the live 24-dimension parity matrix, adopted/deferred decisions, and next parity gaps.

## Stage map

1. **Stage 1 — Harmonised specs (this commit):** Greenfield discipline + `CLAUDE*.md` + `docs/FDS.md` v1.0.0 + live N-way ledger + `PLAN.md`.
2. **Stage 2 — Implementation:** Full pure-TS pipeline, 17-part rig, photographic + SVG + multi-locomotion + workbench toward 100% parity.
3. **Stage 3 — Convergence:** Automated audit, branch-compare CI, and parity verification.

## Provenance vocabulary (honest limits)

Every turn, each claim is tagged:
- **read source code** — detached `/tmp/branch-*` checkout, commit SHA pinned
- **personally viewed visual output** — `read_file` on generated sheets in `/tmp/...`
- **locally executed validation gates** — commands run in this workspace this turn
- **other branches' reported results** — PR descriptions / their CI (not re-executed here)

No claim without evidence. See [`CLAUDE-validation.md`](./CLAUDE-validation.md) §8.1 and [`docs/VALIDATION.md`](./docs/VALIDATION.md).

## Deliverable roadmap (from flaw to engine)

1. **Dedupe & file** `incorrect running sprites.jpeg` → `src/images/` via `npm run dedupe`
2. **Extract** 48 sprites (`6 × 8` grid, magenta key, purple-safe) → `public/sprites/` via `npm run extract`
3. **Analyse** flaws (94.7% IoU duplication, peg-leg, zero crossover, jitter) → `docs/SPRITE_ANALYSIS.md`
4. **Generate** algorithmic 17-part IK + gait solver → `public/sprites/algorithmic/`
5. **Generate** photorealistic & SVG rigs, multi-locomotion, workbench auditors


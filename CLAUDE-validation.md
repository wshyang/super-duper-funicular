# CLAUDE-validation.md — honest gates, audit skill, local env (§8–§9)

Authority: `GREENFIELD.md §8–§9` (verbatim upstream copy at repo root).

## 8. Validation vocabulary (exact meanings here)

| Claim | Exact meaning |
|---|---|
| `typecheck clean` | `npm run typecheck` (`tsc --noEmit`) exited 0 |
| `N/N tests pass` | `npm test` (`vitest run`) exited 0, suite count named |
| `pipeline clean` | `npm run pipeline` decoded the real JPEG and regenerated `public/**` byte-identically on a second run |
| `audit sheet inspected` | `npm run runner:audit` wrote the 16-phase sheet and it was opened with `read_file` this turn |
| `production build clean` | `npm run build` produced `dist/` |
| `live server` | dev/preview server bound `0.0.0.0:3000` and answered HTTP |
| `ledger refreshed` | `npm run branches:compare` exited 0 and `docs/BRANCH-TIPS.json` timestamp is this turn |

Never claim a row that did not run. Separate the four provenance categories
(read code / viewed output / executed gates / others' reported results).

## 9. Full-cycle visual audit skill (adopted from PR #1/#2)

After any gait, rig, cutout, mask or compositing change:

1. `npm run runner:audit` → `/tmp or reports/` 16-phase sheet: per phase a light
   panel, a dark panel and a joint-overlay panel, rendered by the **same solver
   and painter as the app** (diagnostic adoption, not a separate renderer).
2. `npm run runner:filmstrip` → 8-phase filmstrips per persona.
3. Open the sheets with `read_file`; look for joint steps, sole/ground gaps,
   ankle shear, silhouette pops, label contrast; record findings + limitations in
   `docs/FDS.md#gait-cycle-visual-audit`.
4. Keep scratch evidence out of git (`reports/` is ignored except committed
   renders under `public/renders/`).

Passing tests do not certify seams; label probes as probes.

## 10. One-command environment

`./dev.sh` (Bash 3.2 compatible: no associative arrays, no `mapfile`, no
`${var,,}`, empty arrays as `${a[@]+"${a[@]}"}`) installs, regenerates artefacts,
runs the gate and serves on `0.0.0.0:3000`. `.env.example` documents optional
variables; no secrets ever committed.

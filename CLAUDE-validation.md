# CLAUDE-validation.md — honest validation (GREENFIELD §8–§9)

## The gate

```bash
npm run validate    # tsc --noEmit && vitest run && vite build
```

Extra gates for artwork or assets:

```bash
npm run pipeline         # decode + key + extract + analyse the real sheet
npm run dump-cycle       # 16-phase light/dark/skeleton audit sheet
npm run branches:compare # refresh sibling tips, history and ledger table
```

## Five provenance categories

Every sentence about evidence names one of these:

1. **Read** — source or docs inspected in a detached checkout.
2. **Viewed** — rendered output opened and actually looked at.
3. **Executed** — a command run in this repository, this turn.
4. **Peer-reported** — another branch's claim; never counted as ours.
5. **Unverified** — unknown, and said so.

Claim vocabulary in this repository:

| Claim | Means exactly |
| --- | --- |
| "typecheck clean" | `tsc --noEmit` exited 0 |
| "N tests pass" | `vitest run` exited 0, all suites, this turn |
| "build clean" | `vite build` produced `dist/` |
| "pipeline ran on the real sheet" | `npm run pipeline` decoded the committed JPEG and wrote the PNGs |
| "raster verified" | the deterministic software rasteriser produced the inspected image |
| "browser-verified" | **not claimed** — no browser runtime in this sandbox |
| "viewed" | the named PNG was opened with an image tool and the observation is written down |
| "peer says…" | quoted from a sibling branch's docs, not executed here |

Never upgrade a weaker claim into a stronger one. "Tests pass" is not "the app
works"; "the panel is non-empty" is not "the joint is seamless".

## Local environment
- One command: `./dev.sh` (install → pipeline → tests → dev server on
  `0.0.0.0:3000`).
- `.env.example` documents configuration; `.env` is uncommitted; there is no
  database, so there is no `.env.test` — say that rather than inventing one.
- Generated evidence (audit sheets, crops) goes to `/tmp` or ignored
  directories; never commit it unless it is a deliberate report.

## Visual audit
`npm run dump-cycle` writes sixteen phases × three panels plus a contact sheet.
The automation asserts panel count, dimensions and non-empty coverage; it does
**not** certify anatomy, seams, chroma or realism. Those require the human look
described in `.claude/skills/audit-gait-cycle/SKILL.md`.

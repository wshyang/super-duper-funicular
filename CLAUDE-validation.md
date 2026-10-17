# CLAUDE-validation.md — Honest Validation & Reproducible Local Dev (§8–§9)

Adopted from `wshyang/greenfield` `GREENFIELD.md §8–§9`.

## 8. Validate Early and Honestly

- Always run and report the exact validation layers executed:
  1. `npm run typecheck` (`tsc --noEmit`)
  2. `npm run pipeline` (`dedupe`, `extract`, `analyze`, `generate-sheets`)
  3. `npm test` (`vitest run` — real image assets, real solver, real discipline gates)
  4. `npm run build` (`tsc -b && vite build`)
  5. Live server verification on `0.0.0.0:3000`.
- Document any sandbox environment caveats (such as external network restrictions) explicitly in commit messages and `docs/ADDENDA.md`.

## 9. Reproducible Local Dev & Environment Story

- `./dev.sh` provides a single Bash 3.2-compatible command to verify dependencies, run the sprite extraction & algorithmic generation pipeline, execute the test suite, and start the development server on `0.0.0.0:3000`.
- `.env.example` and `.env.test` document configuration defaults cleanly separated from uncommitted `.env` files.

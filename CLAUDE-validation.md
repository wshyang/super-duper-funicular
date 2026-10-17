# GREENFIELD §8–§9 — validate honestly, and make the environment reproducible

## The real gate

```bash
npm run validate     # tsc --noEmit && vitest run && vite build
```

Nothing merges without that finishing clean. Additional gates for image work:

```bash
npm run sprites:extract  # rewrites public/sprites; must stay byte-identical
npm run sprites:analyse  # rewrites src/generated + reports
npm run images:dedupe    # must report 0 byte-identical files
```

## Naming the layer (mandatory in commit messages and PR notes)

Say exactly what ran. The vocabulary for this repo:

| Claim | Means |
| --- | --- |
| "typecheck clean" | `tsc --noEmit` exited 0 |
| "87 unit tests pass" | `vitest run` exited 0, all suites |
| "build clean" | `vite build` produced `dist/` |
| "pipeline ran on the real sheet" | `sprites:extract` decoded the committed JPEG and wrote PNGs |
| "rendered with a real canvas" | `@napi-rs/canvas` rasterised the painter, not a mock |
| "browser-verified" | **not claimed in this repo** — no browser is available in the build sandbox |

If the toolchain is constrained, append the caveat to the commit. Never upgrade "unit tests pass" into
"the app works".

## Local environment

- One command stands up everything: `npm install && npm run dev` (Vite on `0.0.0.0:3000`).
- There is no database, so there is no `.env.test`. The only environment inputs are `HOST` and `PORT`,
  both defaulted in `vite.config.ts` and in `Dockerfile`.
- Generated artefacts are committed and reproducible: `public/sprites/**`, `src/generated/*.json`,
  `reports/*.png`. `reports/raw/` is gitignored.

## Known limitation of this change

The UI was validated by **typecheck, 87 unit tests, a production build, a real-canvas render of every
part and of the 16-phase cycle, and an HTTP smoke test against the dev server**. It was **not** opened in
a browser: the sandbox has no Chrome and cannot install `libnss3`. A reviewer should open the preview once
and confirm layout before shipping.

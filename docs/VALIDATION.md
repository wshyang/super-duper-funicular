# Validation record

Provenance vocabulary: **read** · **viewed** · **executed** · **peer-reported** · **unverified**.
Nothing here is carried forward from another turn; each row names when it last actually ran.

## Gate vocabulary

| Claim | Means exactly |
| --- | --- |
| "typecheck clean" | `npm run typecheck` (`tsc --noEmit`) exited 0 |
| "N tests pass" | `npm test` (`vitest run`) exited 0, all suites, this turn |
| "build clean" | `npm run build` produced `dist/` |
| "pipeline ran on the real sheet" | `npm run pipeline` decoded the committed JPEG and rewrote `public/sprites/**` |
| "raster verified" | the deterministic software rasteriser produced the inspected image |
| "viewed" | the named PNG was opened and the observation written down |
| "browser-verified" | **not claimed** — no browser runtime in this sandbox |
| "container verified" | **not claimed** — the Dockerfiles are statically gate-checked, never built here |
| "peer says…" | quoted from a sibling branch's docs, not executed here |

## 2026-10-17 — T01 (bootstrap)

| Gate | Result | Provenance |
| --- | --- | --- |
| `npm ci` | 215 packages installed | executed |
| `npx tsc --noEmit` | clean | executed |
| `npx vitest run` | 44/44 passing — runner, pipeline, app SSR smoke and the 10-test discipline gate | executed 2026-10-17 |
| `npm run build` | `dist/` produced, 232.9 kB JS / 73.8 kB gzip | executed |
| `npm run pipeline` | `grid 8x6 header=129px cell=316x262 · frames=48 duplicates=18 magentaSpill=0` | executed |
| `npm run branches:compare` | five tips refreshed; history + ledger table rewritten | executed |
| `npm run dump-cycle` | 16 phases × 2 backgrounds at 520×680; contact sheet opened | executed + viewed |
| Docker build | not run | unverified |
| SHIP-HATS activation against a real GitLab | not run | unverified |
| Browser E2E | no browser runtime | unverified |
| Sibling test suites | not executed | peer-reported only |

### Visual findings (viewed, not fixed in T01)

1. At φ≈0.55–0.75 the **far upper arm crosses the torso silhouette** and reads as a grey slab
   behind the trunk instead of a limb behind the body.
2. At maximum dorsiflexion the **shoe overlaps the near shin** and the ankle collar sits on top of
   the shoe rather than inside it.
3. The **ponytail reads as a single blob** at high cadence because the three capsules overlap
   completely at the smallest lag.

These are recorded against the P0 row of the adoption queue. Tests pass; the art is not claimed
clean.

## What would raise a claim to a higher category

| Current | To raise it |
| --- | --- |
| "build clean" | run the built bundle in a browser and interact with it |
| "container gate-checked" | `docker build` + run the image + reach `/healthz` on port 3000 |
| "peer-reported" | run that branch's suite here and record the actual output |
| "16 panels non-empty" | view the sheet at magnification and record joint-level findings |

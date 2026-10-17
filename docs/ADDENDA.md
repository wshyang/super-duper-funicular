# Addenda register

Decisions that are not dictated by the base request or by GREENFIELD. Numbered sequentially and
never renumbered. Each entry states: what was decided, why, the related area, and the impact a
future reader must know. Base area names refer to the user's five deliverables:
D1 dedupe, D2 filing, D3 extraction, D4 flaw analysis, D5 procedural generation, D6 web app.

## ADD-001: Adopt GREENFIELD as the coding discipline (split CLAUDE.md)
- **Decided:** GREENFIELD.md from `wshyang/greenfield` (commit `8ba74027be5fad41e48cadde82cc0120d628b109`)
  is adopted. It is split verbatim by `##` section into `CLAUDE.md` (index) and `CLAUDE-*.md`.
  Stack: TypeScript strict, npm with exact-pinned dependencies, Vite and React, Vitest, pure-JS codecs.
- **Why:** The user asked to adopt it. The source is about 480 lines, past the split threshold in §0.
- **Spec area:** GREENFIELD §0, §7, §9.
- **Impact:** Read `CLAUDE.md` first. Sections §4 and §5 (database) are inactive; there is no database.

## ADD-002: The repository contained one image, and it is treated as the source of truth
- **Decided:** `main` holds a single file, `incorrect running sprites.jpeg`. It was moved to
  `src/images/reference/running-cycle-8frame-6variants.jpeg`. It is the only source artwork.
- **Why:** D1 asked for dedupe across "various bits of art". There was nothing to dedupe at file level.
  The dedupe tool therefore checks decoded pixels across `src/images` and `public/sprites`, and it
  reports 49 unique images (1 source + 48 frames). D2 "file them into /src/images" is read as: the
  source artwork lives in `src/images` under a meaningful name. Derived cut-outs go to `public/`
  (D3), because they are served over a URL.
- **Impact:** If more art arrives, add it under `src/images/<domain>/`, then run `npm run images:dedupe`.

## ADD-003: Background keying is a global magenta chroma key, not a border flood fill
- **Decided:** Pixels are background when `R > 185 && B > 185 && G < 115 && |R−B| < 45`, applied to
  every pixel in a cell.
- **Why:** A border-connected flood fill left magenta slivers in frames 2 and 6 (pockets between arm
  and torso that do not touch the border). The chroma key removes them. No sprite colour matches the
  key: skin, shirts and shorts all fail at least one test.
- **Impact:** The thin purple outline of the artwork is kept as-is. The cut-outs have no magenta-like
  opaque pixels (verified: 0 in 48 frames).

## ADD-004: Registration on a shared canvas, aligned by centroid x and ground line
- **Decided:** All 48 cut-outs are placed on one canvas (213×232). Each frame's centroid column and
  its bottom edge (ground line) are aligned to the same pivot. Pixels are not scaled.
- **Why:** The original cells drift: centroid x varies by 14 px and bottom y by 25 px (see
  `docs/sprite-analysis.md`). Registration removes the drift from in-place animation. Flight is kept:
  the bottom edge is the ground line only for planted frames, so the bounce is still visible in
  the registered output.
- **Impact:** `manifest.json` records the pivot (x = centroid column, y = ground line) for the consumer.

## ADD-005: The procedural gait model
- **Decided:** One cycle, two legs offset by half a cycle.
  - Each leg is in stance for 40% of its cycle. The foot travels from +s to −s along the ground.
    `s = 10` body units.
  - Swing lifts the foot by up to 14 units along a sine arc.
  - Hip height is a parabola in stance: lowest at mid-stance (0.94 leg length), 0.97 leg length at
    touchdown and toe-off. Flight adds a 4-unit bounce.
  - Legs use analytic two-bone IK with the knee bulging forward.
  - Each arm swings against its same-side leg, with an amplitude of 0.95 rad and a fixed elbow flex.
  - Torso leans 0.22 rad forward.
- **Why:** Planted feet and a stance that moves steadily backwards are what the reference sheet
  lacks. Deriving hip height from leg reach means the bob is produced by the planting, not by an
  arbitrary sine.
- **Spec area:** D5.
- **Impact and known limitation:** Tuned by eye on contact sheets. The figure reads as a running
  gait, but the mid-stance knee is still fairly flexed (about 40°), so the pose is lower-hipped than a
  sprinter's. Tune via `DEFAULT_GAIT` and `DEFAULT_BODY` (`src/runner/`). The tests lock the
  invariants (planting, reach, symmetry, flight), not the exact look.

## ADD-006: Procedural renderer is a pure software rasterizer; the browser only blits pixels
- **Decided:** Body parts are primitives (capsule, circle, polygon) painted in order onto a 128×144
  RGBA buffer, with a 1-px outline pass. The browser puts the buffer on a canvas and CSS scales it
  3× with `image-rendering: pixelated`.
- **Why:** The same pixels can be tested and previewed in Node, with no browser or native canvas
  dependency. The app and `docs/runner-preview.png` therefore show identical frames.
- **Impact:** Rendering rules live in TypeScript, not in the canvas API.

## ADD-007: Deployment (Docker, SHIP-HATS) is deferred
- **Decided:** The `initial-templates/` Dockerfiles and the inert `*.shiphats` pipeline are not added
  in this change.
- **Why:** There is no backend or service to deploy, and SHIP-HATS needs GitLab and SEED access that
  this sandbox does not have. The container contract (port 3000 on `0.0.0.0`) is partly met already:
  the dev server binds `0.0.0.0:3000`.
- **Spec area:** GREENFIELD §10. This is the one place the discipline is not yet applied.
- **Impact:** Add the container files before any deployment. Record that step as a new addendum.

## ADD-008: Dev server host allowlist
- **Decided:** `vite.config.ts` lists `.e2b.app` and `localhost` in `allowedHosts`, with the server
  bound to `0.0.0.0:3000`.
- **Why:** The preview is proxied under the sandbox domain (GREENFIELD §10.1, host allowlist). Other
  Host headers are rejected with 403, which was verified.
- **Impact:** Any other public host needs a new entry here.

## ADD-009: Testing layers, and no browser end-to-end suite yet
- **Decided:** Real-file unit and integration tests run on the actual reference sheet, with no
  mocks: grid detection, keying, cutting, hashing, dedupe, manifest. The runner has tests for
  invariants. Vitest runs under Node.
- **Why:** GREENFIELD §2 asks for end-to-end tests with video. Playwright needs a browser download
  from a CDN that is not on the sandbox allowlist, so no browser test could run here.
- **Impact:** Validation done: typecheck, 56 unit and integration tests, production build, dev-server
  HTTP smoke, and visual inspection of the rendered contact sheets. A browser e2e suite is still
  missing and should be added where a browser is available.

## ADD-010: Dependency pinning and TypeScript version
- **Decided:** Exact versions in `package.json`. TypeScript is 7.0.2 (`tsc` as installed).
- **Why:** GREENFIELD pins versions. TypeScript 7 was the current release at install time.
- **Impact:** `allowImportingTsExtensions` is on, because the code imports `.ts` paths. The project is
  `noEmit` and bundled by Vite, so this has no build effect.

## ADD-011: Layout by domain, function size and component/hook split
- **Decided:** `src/pipeline` (image work, Node), `src/runner` (pure procedural model),
  `src/app` (React). Functions are kept under 50 lines and take at most three parameters. Components
  render; hooks drive the animation loop and fetches. JSX has no derivations (they live in
  `stage-model.ts`). Interactive elements carry `data-testid` in the `{component}__{role}` form.
- **Impact:** The `*.tsx` components do not import from `pipeline/`, so the browser bundle has no
  Node-only code.

## ADD-012: Generated frames are regenerable and checked for uniqueness
- **Decided:** `npm run sprites:extract` clears `public/sprites/running-cycle-8frame/` and rewrites
  it. It fails if any two frames share pixels. `npm run images:dedupe` removes redundant copies only
  under `src/images` (with `--apply`).
- **Impact:** Committed generated output must match a fresh run byte for byte.

# Stride Lab

A TypeScript motion workbench that compares a supplied runner sprite sheet with a continuously articulated, algorithmic running character.

## Run

Node 22.22+ and npm:

```sh
./dev.sh                 # npm ci + Vite on 0.0.0.0:3000
```

Or `npm ci && npm run dev`. Build with `npm run build`. Deploy `dist/` to a static host at its origin root, or build the provided Dockerfile (port 3000). The active Arena preview serves the app and sprite URLs; a permanent public URL requires deployment.

### Workbench

- **Motion studio:** Wei Ming / Mei Lin persona selection, procedural / original-sheet playback, cadence, stride, foot lift, lean, six palettes, skeleton, onion skin, ground, pause, step, speed, phase scrub and eight phase buttons.
- **Asset library:** original sheet, all 48 transparent PNGs grouped by palette, downloads and JSON manifest.
- **Motion notes:** source diagnosis and algorithm explanation.
- **Export sprite sheet:** downloads a transparent 1280×160 PNG with eight 160×160 procedural frames. Each frame has an origin at (75,138); the skeleton overlay is omitted. This always exports the procedural rig, even while comparing the original.

Cadence changes playback for both modes. Shape, colour and rig overlays affect only the procedural runner. Reduced-motion users start with playback paused.

## Artwork deliverables

Only **one artwork file** existed at the starting commit. No backdrops or separate object sheets were present.

| Item | Location |
|---|---|
| Original JPEG, renamed without recompression | `src/images/runner-six-palette-eight-frame-sheet.jpeg` |
| File and decoded-pixel hashes | `docs/artwork-inventory.json` |
| Extracted RGBA PNGs | `public/sprites/runner-{palette}-{01..08}.png` |
| Public URL example | `/sprites/runner-violet-01.png` |
| Full frame mapping, hashes, bounds, pivots | `/sprites/manifest.json` |
| Assessment | `docs/MOTION-ASSESSMENT.md` |

**Dedup result:** 1 unique source; 48 unique extracted pixel images; 0 exact duplicates. Frames 5–8 are visually repetitive but not byte-/pixel-identical, so they are intentionally retained. The extractor aliases exact duplicate logical frames to a single PNG URL.

## Reproduce extraction

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/test_extract.py
.venv/bin/python scripts/extract_sprites.py
```

The default sheet uses automatic magenta-divider detection (nonuniform rows). The title and column labels are excluded. JPEG-tolerant background flood-fill preserves purple clothing highlights; very small noise components are removed. Frames use a shared 308×258 transparent canvas, not individually centered tight crops. Source-cell bounds and visible bounds are recorded separately; ground/pose drift is not hidden by per-frame realignment.

For other grid sheets, use `--source path --rows N --columns N --region LEFT TOP RIGHT BOTTOM`. For loose disconnected pieces: `--mode components --source path`. These are connected-component cutouts, **not semantic segmentation**: touching objects remain joined, disconnected accessories can become separate pieces, magenta foreground remains ambiguous, and occluded anatomy cannot be recovered. Review any new artwork before use. Keep intentional magenta/backdrops out of the chroma-key pipeline. The default inventory classifies only the supplied file; review additions manually.

## Quality gates

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
.venv/bin/python scripts/test_extract.py
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright records video by default (`E2E_VIDEO=off` disables it). For restricted Linux sandboxes where the browser CDN is inaccessible, `npm run test:e2e:sandbox` prepares npm-distributed Chromium and ffmpeg; it is test tooling, not a runtime dependency. See `docs/VALIDATION.md` for actual checks performed.

## Coding discipline

`GREENFIELD.md` is upstream's unmodified template; `CLAUDE.md` adopts it for this stack. Read `docs/SPEC.md` and the numbered `docs/ADDENDA.md` before making changes. Pure gait math lives in `src/motion/gait.ts`; rendering is separate. Source art is not baked into the new character: the head, articulated neck, torso, upper/lower arms, thighs, shins and rolling shoes are drawn and articulated algorithmically.

The inert `.gitlab-ci.yml.shiphats` mirrors local quality gates. `activate-shiphats.sh` activates that **starter only**, refusing overwrite by default. Full agency CI/CD, compliance, signing and deployment integration are explicitly deferred, not represented as implemented or certified.

The procedural runner uses a midfoot-style landing and toe-pivot push-off. Its neck counter-rotates relative to the torso, while the forward-lean control shifts both hips and chest. Use 0.25× speed and the skeleton overlay to inspect these details.

### Runner personas

Choose **Wei Ming · Male runner** or **Mei Lin · Female runner** under Character. These fictional adult Singaporean Chinese characters have separate procedural styling profiles in `src/motion/personas.ts`. Both retain articulated head/neck, limb IK, rolling feet and forward balance; Mei Lin also has an independently animated ponytail. The selection updates all previews and exports (`stride-lab-{persona-id}-running-cycle.png`) without resetting gait settings. Selecting a persona while comparing source art returns to Procedural mode.

### Photographic female persona (additional option)

Select **Mei Lin · Photo** under Character. This uses newly generated photographic image textures, not a pixel reskin. Nine AI source images produce **16 transparent articulated parts**, including independently generated near/outer and far/inner arms, hands, legs and shoes. Both earlier pixel runners remain available. The photographic male persona is not included yet.

**Asset library → Photographic character kit** exposes every cutout plus all nine sources. Public cutouts and calibration metadata are under `/photo-runner/` and `/photo-runner/manifest.json`. Regenerate from the saved sources using `.venv/bin/python scripts/prepare_photo_parts.py`; test with `.venv/bin/python scripts/test_photo_parts.py`. Image generation itself is not repeated by that script.

The photographic option exports a **5120×640** transparent PNG sheet with eight 640×640 cells, while pixel personas retain their original dimensions. Palette controls are disabled for the fixed photographic kit. Loading failures are explicit and retryable. See `docs/PHOTOGRAPHIC-RIG.md` for source coverage, calibration and the limitations of this **2D cutout prototype**; it is not a 3D reconstruction or footage of a real person.

### Photographic hip cut tool

The photographic runner now uses a rounded pelvis socket, with the near thigh in front and far thigh behind. Under its preview, **Hip cut & layer tool** provides a magnified original/rounded comparison and width, depth, offset and feather controls. Scrub the running cycle to inspect the rotating joint. Adjustments apply to live motion and exported sheets; guides/comparison stay inside the inspector. Download the masked pelvis PNG or calibration JSON; settings otherwise last only for the current session. Original assets are untouched.

### Walking and brisk walking

Use **Running / Walking / Brisk walking** above the stage. Walking has heel-first contact, double support, lower clearance and relaxed arms—not just slower running playback. Brisk walking uses a quicker rhythm and stronger swing without a flight phase. Every current persona and the photographic hip-cut tool work with these profiles.

Settings are remembered independently per motion during the session; Reset affects the active motion. Exports are named for the motion (`…-walking-cycle.png`, `…-brisk-walking-cycle.png`); dimensions remain unchanged. The original JPEG is still a run-only comparison. See `docs/MOTION-PROFILES.md` for mechanics and limitations.

### Rotating element end cuts

**Element end cutter**, below the photographic hip tool, lets you round the ends of each near/far thigh, shin, upper arm, forearm and wrist. It now rounds the rotating pieces too—not only the pelvis socket. Tune each end's radius, shaft blend and feather while inspecting rotation around the actual pivot or the assembled animated joint. Cuts propagate to previews and exported sheets. Download the selected rounded PNG or all settings as JSON. Raw images stay unchanged; this subtractive tool cannot restore missing source texture.

### Full-cycle review and learnings
Use **Export 16-phase audit · PNG** below the stage for a light/dark/joint-overlay inspection sheet of the generated character with current settings. It supplements—not replaces—the eight-frame sprite export. Browser tests save audit sheets for all three motions under ignored `test-results/`. Follow `.claude/skills/audit-gait-cycle/SKILL.md` for visual review. Cross-branch findings and per-turn learning records live in [docs/FDS.md](docs/FDS.md); [docs/SPEC.md](docs/SPEC.md) remains the canonical functional specification.

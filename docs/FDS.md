# FDS — Functional Design Specification & continuous learning register

- **Document version:** 1.0.0
- **Status:** Active canonical specification (`[INTENT_ALIGNED]`)
- **Construction standard:** `docs/greenfield/FDS_BUILDER.md` (upstream, v2.0) + `GREENFIELD.md` §12
- **Anchors:** `#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`, `#turn-*`
- **Register convention:** this file is the *contract plus the evidence register*. Decisions that
  change the contract live in `docs/ADDENDA.md`; this file cites them.

---

## 1. Executive summary {#exec-summary}

**Product.** Funicular Motion Lab is a browser workbench that does three things to the same artwork:

1. **Forensics** — measures *why* the supplied eight-frame running sheet fails as an animation:
   duplicated pose columns, unilateral lead-leg lock, zero foot crossover, scale and baseline drift.
2. **Synthesis** — solves a 17-part articulated runner at any continuous gait phase with analytical
   two-bone IK, an independently articulated cervical neck, a two-segment rolling shoe, and three
   locomotion profiles (run, brisk walk, walk) over two procedural personas and six colourways.
3. **Convergence** — maintains a live n-way comparison ledger against four sibling branches that
   implement the same product, with an in-app parity matrix and a per-turn learning register.

**Actors.** `role:engineer` (runs the pipeline and exports) and `role:viewer` (inspects, compares,
downloads). Both are local-only; there is no account, session or server.

**What this spec deliberately does not claim.** No photographic cut-out rig, no raster→SVG
vectoriser, no interactive joint calibration, no browser E2E suite, no Docker build. Those are
recorded as **Gap** rows in `docs/N_WAY_COMPARISON.md`, not as features.

---

## 2. Phase scope {#phase-scope}

| Phase | Scope | Surfaces |
|---|---|---|
| `P1-Core` | Pipeline (dedupe, extract, analyse), articulated engine, studio UI, inspector, gallery, parity ledger, container + inert CI | `#surf-cli-*`, `#surf-ui-*` |
| `P2-Art` | Photographic persona, rounded-end joint cutter, raster→SVG vectoriser | not started |
| `P3-Calibration` | Interactive joint/hip calibration with registrable PNG/JSON export | not started |

Everything in this document is `P1-Core`.

---

## 3. Core objects {#core-objects}

### 3.1 `#obj-image-asset` — filed source image

| Attribute | Type | Constraints | Validation | Error |
|---|---|---|---|---|
| `path` | `string` | required, unique, relative to repo root | must sit under `src/images/` and end `.png`/`.jpeg`/`.jpg` | "Asset path must reside inside src/images/ with a .png, .jpeg or .jpg extension." |
| `byteSha256` | `string(64)` | required, lowercase hex | SHA-256 of the file bytes | "Invalid byte SHA-256 digest." |
| `pixelSha256` | `string(64)` | required, lowercase hex | SHA-256 of `width×height:` + decoded RGBA | "Invalid pixel buffer SHA-256 digest." |
| `dHash64` | `string(16)` | required, lowercase hex | 64-bit gradient difference hash over a 9×8 luma grid | "Invalid 64-bit perceptual difference hash." |
| `status` | `enum('active','deprecated')` | required | first occurrence of a `pixelSha256` is `active`; later ones are `deprecated` with `duplicateOf` | "Asset status must be active or deprecated." |

**States.** `active → deprecated` when a later file decodes to an identical pixel digest. Hard
deletion is never performed by the pipeline (`ADD-004`).

**Edge and failure modes.**
- *Boundary*: a 1×1 image decodes; `alphaBounds` returns a zero rect rather than throwing.
- *Invalid input*: non-image bytes are rejected by `jpeg-js`/`pngjs` and surface as a tool error.
- *Adversarial*: traversal is impossible by construction — the walker only reads under `src/images/`.
- *Race*: the manifest is written once, after all files are measured.
- *Dependency*: pure-JS decoders, no native binaries, so the pipeline runs in any Node 22 sandbox.
- *Authorization change*: not applicable (no auth); the manifest is public read-only data.

### 3.2 `#obj-extracted-frame` — one cut-out reference frame

| Attribute | Type | Constraints | Validation | Error |
|---|---|---|---|---|
| `palette` | `enum('red','blue','green','yellow','purple','orange')` | required | row index maps to the documented colourway order | "Unknown runner colourway." |
| `column` | `integer(0..7)` | required | `0 <= column < columns` detected from pixels | "Frame column must be inside the detected grid." |
| `url` | `string` | required | must start `/sprites/reference/` and resolve in `public/` | "Extracted frame URL must begin with /sprites/reference/." |
| `bounds` | `[minX,minY,maxX,maxY]` | required | alpha > 127 within the cell | "Silhouette bounds require a non-empty alpha mask." |
| `pivot` | `[x,y]` | required | rounded silhouette centroid; **no per-frame re-centring of stored pixels** | "Frame pivot requires a non-empty silhouette." |
| `duplicateOf` | `string \| null` | required | id of an earlier **same-row** frame with centroid-aligned IoU ≥ 0.9 | "Duplicate classification requires a silhouette comparison." |

**States.** Purely derived; the sheet is the source of truth and the frames are regenerated.
**Edge cases.** A cell with no subject produces `duplicateOf: null`, `bounds: [0,0,0,0]` and is
reported by the analysis rather than silently dropped.

### 3.3 `#obj-articulated-pose` — solved 17-part pose

| Attribute | Type | Constraints | Validation | Error |
|---|---|---|---|---|
| `phase` | `number[0,1)` | required | normalized via `((φ % 1) + 1) % 1`; non-finite → 0 | "Gait phase must be a finite number normalized to [0, 1)." |
| `canonicalIndex` | `integer(0..7)` | derived | `floor(((φ + 0.0625) % 1) × 8) % 8` | "Canonical frame index must be in 0..7." |
| `nearLeg` / `farLeg` | `LimbChain` | required | knee solved by circle intersection with a **forward (+x) bend bias**; both segment lengths preserved to 1e-6 | "Limb kinematics failed joint-length preservation." |
| `nearArm` / `farArm` | `ArmChain` | required | swing is `±amp·cos(2πφ)` with the near side opposite the far side | "Arm chain failed contralateral swing validation." |
| `foot` | `FootState` | required | heel/ball/toe in shoe-local space rotated by the roll pitch; stance sole touches the ground line exactly | "Stance sole must contact the ground line." |
| `neck` | `{neckBase, neckTop}` | required | counter-pitches at `0.45 × torsoLean`, so the head stays level while the trunk falls forward | "Cervical counter-pitch missing." |
| `ponytail` | `Vec2[4]` | required for `mei-lin` | lags the head by `sin(2πφ − 0.6)`; absent for `wei-ming` | "Hair accessory requires a ponytail-capable persona." |

**States.**
- **Flight** (`run` only): both legs past duty → `isFlight`.
- **Double support** (`walk`, `brisk-walk`): both legs inside duty → `isDoubleSupport`.
- **Single support**: exactly one leg inside duty (the only state `run` can also occupy).

**Forbidden transitions.**
- `flight` in a walking profile — rejected by `resolveGait` duty values (0.56/0.62 > 0.5), asserted
  in `tests/runner/gait.test.ts`.
- A stance sole below `groundY` — geometrically impossible because the ankle is placed from the
  rotated sole's lowest point; asserted over 64 phases.
- An IK joint whose segment lengths drift — asserted over 64 phases.

### 3.4 `#obj-scene` — painted scene graph

| Attribute | Type | Constraints |
|---|---|---|
| `parts` | `ScenePart[17]` | exactly the `PART_ORDER` sequence; far chain first, near chain last, pelvis/neck/hair/torso/head in the documented middle order |
| `primitives` | `Primitive[]` | `polygon \| circle \| capsule`, each with fill, optional outline + width, optional alpha |
| `skeleton` | `Vec2[][]` | six polylines (spine, two legs, two arms, ground) for the overlay only |

**Invariants.** Every primitive coordinate is finite and inside the canvas ± 40 px
(`tests/runner/scene.test.ts`). Scene order is the painter's order; there is exactly one
definition of it (`PART_ORDER`), consumed by the painter, the inspector and the export.

### 3.5 `#obj-flaw-analysis` — measured source verdict

Every number is produced from the real extracted silhouettes; none is hard-coded.

| Field | Meaning | Method |
|---|---|---|
| `meanDuplicateIou` / `maxDuplicateIou` | repetition of poses | centroid-aligned silhouette IoU within a colourway |
| `duplicatePairs` / `nearDuplicates` | which frames repeat | ≥ 0.90 / ≥ 0.78 IoU |
| `scaleJitterPx` | size instability | mean per-row range of silhouette heights |
| `baselineJitterPx` | ground drift | mean per-row range of silhouette `maxY` |
| `minFootSeparationPx` / `maxFootSeparationPx` | whether the feet ever cross | lowest-16% band column clustering |
| `leadLegLockRatio` | unilateral lead leg | share of resolved frames whose lower foot is on the same side |
| `crossoverFrames` | merged / crossed feet | single cluster or separation < 12 px |

**Limits, stated in the UI and the generated report.** IoU proves repetition, not pose identity.
The foot proxy cannot see through an overlap and is not limb tracking.

### 3.6 `#obj-branch-tip` — n-way comparison entry

| Attribute | Type | Constraints |
|---|---|---|
| `branch` | `string` | exact remote branch name |
| `hash` | `string(40)` | full SHA, never abbreviated in storage |
| `committedAt` | ISO-8601 | committer date |
| `subject` | `string` | commit subject, for humans |
| `observedAt` | ISO-8601 | when the fetch happened (file level) |

**Invariant.** `src/generated/branch-tips.json` and `docs/N_WAY_COMPARISON.md` are written by the
same command in the same run; the discipline gate fails if they disagree.

---

## 4. Central relationship map {#relationship-map}

| Object A | Cardinality | Object B | Relationship | Constraints | Data-carrying | Surface coverage |
|---|---|---|---|---|---|---|
| `#obj-image-asset` | 1 : N | `#obj-extracted-frame` | `yields` | one 2528×1696 sheet → 48 frames (6 × 8) | no | Create `#surf-cli-extract`; List `#surf-ui-gallery` |
| `#obj-image-asset` | 1 : 1 | `#obj-flaw-analysis` | `is-measured-by` | six colourways measured together | no | Create `#surf-cli-analyse`; Read `#surf-ui-diagnostics` |
| `#obj-extracted-frame` | N : 1 | `#obj-articulated-pose` | `is-compared-with` | comparison is by canonical phase index, not by pixel correspondence | no | Read `#surf-ui-stage`, `#surf-ui-filmstrip` |
| `#obj-articulated-pose` | 1 : 17 | `ScenePart` | `articulates` | painter order is fixed by `PART_ORDER` | no | Create `#surf-cli-render`, `#surf-ui-export`; List `#surf-ui-inspector` |
| `#obj-articulated-pose` | 1 : 1 | `#obj-scene` | `paints` | the scene is a pure function of settings + phase | no | Read `#surf-ui-stage` |
| `#obj-branch-tip` | N : 1 | `#obj-branch-tip` (self, ordered) | `observed-sequence` | append-only history snapshots | yes (`observedAt`) | Read `#surf-ui-parity` |

**R1 junction surface pass.** No N:M data-carrying relationship exists in `P1-Core`; the only
junction-like object, `#obj-extracted-frame ↔ #obj-articulated-pose`, is a *view-time comparison*
with no stored join. Deliberately no create/list/remove surfaces are specified for it — recorded as
`[CUSTOM: comparison is derived at render time because there is no persistence layer]`.

**R2 authorization derivation.** `role:viewer` and `role:engineer` are the same local identity in
`P1-Core`; every surface is reachable by both. There is no per-resource gate to derive, and none is
claimed. When a backend exists this row must be rewritten, not inherited.

**R5 backend/surface parity audit.** Every model operation maps to a surface:

| Operation | Surface |
|---|---|
| dedupe + measure assets | `#surf-cli-dedupe` |
| extract frames | `#surf-cli-extract` |
| measure flaws | `#surf-cli-analyse` |
| solve pose | `#surf-cli-render`, `#surf-ui-stage` (live), `#surf-ui-export` |
| list parts | `#surf-ui-inspector` |
| export sheet | `#surf-ui-export` |
| observe branch tips | `#surf-cli-compare`, `#surf-ui-parity` |

Zero `[ORPHAN-CAPABILITY]` rows remain in `P1-Core`.

---

## 5. Surface inventory {#surface-inventory}

| # | Surface | Anchor | Role | Object | Operations | Phase |
|---|---|---|---|---|---|---|
| 1 | Pipeline: dedupe | `#surf-cli-dedupe` | engineer | `#obj-image-asset` | Create/Update | P1 |
| 2 | Pipeline: extract | `#surf-cli-extract` | engineer | `#obj-extracted-frame` | Create | P1 |
| 3 | Pipeline: analyse | `#surf-cli-analyse` | engineer | `#obj-flaw-analysis` | Create | P1 |
| 4 | Render/audit dump | `#surf-cli-render` | engineer | `#obj-scene` | Create | P1 |
| 5 | Branch compare | `#surf-cli-compare` | engineer | `#obj-branch-tip` | Create/Update | P1 |
| 6 | Live stage | `#surf-ui-stage` | viewer | `#obj-articulated-pose` | Read/Interactive | P1 |
| 7 | Filmstrip comparison | `#surf-ui-filmstrip` | viewer | `#obj-extracted-frame` × pose | Read/Interactive | P1 |
| 8 | Rig inspector | `#surf-ui-inspector` | viewer | `ScenePart` | Read/Interactive | P1 |
| 9 | Source diagnostics | `#surf-ui-diagnostics` | viewer | `#obj-flaw-analysis` | Read | P1 |
| 10 | Asset library | `#surf-ui-gallery` | viewer | `#obj-extracted-frame` | Read + preview | P1 |
| 11 | Parity ledger | `#surf-ui-parity` | viewer | `#obj-branch-tip` | Read | P1 |
| 12 | Exports | `#surf-ui-export` | viewer | `#obj-scene` | Create (download) | P1 |

**Empty states (D20).**

| Surface | Loaded | Zero-data | Zero-permission | Loading | Error |
|---|---|---|---|---|---|
| Stage | rig rendered | never empty by construction | n/a | n/a (pure) | n/a |
| Diagnostics | metrics + findings | "no pairs" wording, list still renders | n/a | "Loading manifest and flaw analysis…" | error panel + **Retry** (`diagnostics__retry`) |
| Gallery | 8 frames per colourway | "0 frames" badge, grid empty | n/a | lazy per-image | broken-image alt text |
| Parity | 5 tips + 23 rows | never empty | n/a | static import | n/a |
| Exports | two buttons | disabled while rendering (`busy`) | n/a | "Rendering…" | inline error panel |

**Day-zero bootstrap (R4).**

| Step | Actor | Surface | Populates | Unlock |
|---|---|---|---|---|
| 1 | `[SEED]` | `src/images/source/runner-8frame-6-colorways-source.jpeg` (sha256 `f9911423…`) | `#obj-image-asset` | the only committed artwork |
| 2 | engineer | `npm run pipeline` | `#obj-extracted-frame`, `#obj-flaw-analysis`, `public/sprites/**` | studio has reference frames and diagnostics |
| 3 | engineer | `npm run branches:compare` | `#obj-branch-tip` | parity tab has real hashes |
| 4 | viewer | `npm run dev` → `0.0.0.0:3000` | session | full workbench |

No step depends on a network call beyond static asset serving; no preseed beyond the one JPEG.

---

## 6. Features {#features}

### 6.1 `#feat-dedupe` — reproducible asset filing
**Given** images under `src/images/`, **when** `npm run images:dedupe` runs, **then** every file is
measured (bytes, pixels, dHash), duplicates are soft-tagged `deprecated` with `duplicateOf`, and
`src/images/manifest.json` is written deterministically.

### 6.2 `#feat-extract` — pixel-detected grid + border-seeded chroma key
**Given** the committed JPEG, **when** `npm run sprites:extract` runs, **then** the six row bands and
eight column clusters are detected from magenta separators (no hard-coded 8×6, no hard-coded header
height), each cell is keyed by a **border-seeded flood fill** plus an interior strong-magenta sweep,
despilled, and written as RGBA PNG with silhouette bounds, pivot and duplicate flag.

*Why border seeding:* an interior-only magenta threshold erodes the purple jersey. The measured
result is `magentaSpill = 0` across all 48 frames (`ADD-006`).

### 6.3 `#feat-analyse` — quantitative source verdict
**Given** the extracted silhouettes, **when** `npm run sprites:analyse` runs, **then** it computes
the IoU pair matrix within each colourway, the four-column duplicate pattern, scale/baseline jitter,
foot separation and stance-side lock, writes `public/sprites/analysis.json` and
`docs/SPRITE_FLAW_ANALYSIS.md`.

*Measured on the real sheet* (see `docs/VALIDATION.md`): 18 duplicate pairs at a 0.90 threshold,
mean IoU 0.958, 18/18 exactly four columns apart, stance-side lock 100 %, foot separation
92.5–177 px, mean row height range 22.2 px.

### 6.4 `#feat-engine` — 17-part articulated runner
**Given** persona, colourway, motion and phase, **when** the scene is solved, **then** it yields the
17 parts in painter order with:
- analytical two-bone IK (circle intersection, preserved segment lengths, forward knee bias);
- an independently articulated **neck** at `0.45 ×` the trunk pitch;
- a **two-segment rolling shoe** whose stance roll goes heel-strike → flat → heel-off → toe-off and
  whose lowest sole point is placed exactly on the ground line;
- contralateral arm/leg swing with a per-motion elbow flex;
- three motion profiles with distinct duty cycles (0.38 / 0.56 / 0.62);
- a ponytail whose lag follows the cycle for `mei-lin` and is absent for `wei-ming`.

### 6.5 `#feat-studio` — live workbench
Stage with reference comparison, playback (play/pause/step/scrub/8 phase buttons/0.25–2×),
persona/colourway/motion switching that preserves phase, four gait sliders, skeleton/ground/onion
overlays, and two exports from the **same painter** as the stage.

### 6.6 `#feat-inspector` — rig isolation
Select any of the 17 parts to isolate it on the same stage, in painter order, grouped far chain /
centre mass / near chain.

### 6.7 `#feat-parity` — live n-way ledger
In-app matrix (23 capabilities × 5 implementations × acceptance note) plus the observed branch tips,
backed by `docs/N_WAY_COMPARISON.md` and refreshed by `npm run branches:compare`.

### 6.8 `#feat-audit` — 16-phase visual audit
`npm run dump-cycle` writes 16 phases × light/dark panels, a contact sheet and telemetry
(flight/double-support flags, alpha coverage, sole heights, ankle separation). The in-app export
produces the same 48-panel format including the skeleton column.

---

## 7. User flows {#user-flows}

1. **Engineer, cold clone.** `npm ci → npm run pipeline → npm run validate → npm run dev`.
   `dev.sh` chains exactly this.
2. **Viewer, compare.** Open the stage → scrub or play → toggle *Reference compare* → the source
   frame for the current canonical phase appears beside the live rig.
3. **Viewer, inspect.** Inspector tab → pick `nearShin` → only that primitive renders; pick *All 17*
   to restore.
4. **Viewer, export.** *Download 8-frame sheet* → transparent 8-cell PNG named with persona, motion
   and colourway → *16-phase audit PNG* for the review sheet.
5. **Engineer, converge.** `npm run branches:compare` → read the diff of a new tip in `/tmp` →
   update the matrix → append a `TURN-Lnn` entry.

---

## 8. Design rationale {#rationale}

- **Why a procedural rig at all.** The source sheet repeats four poses (measured), so it cannot be
  repaired by extraction. A solver produces any phase, any persona, any colourway from one artwork.
- **Why the neck is a part.** A rigid head-on-trunk block makes a forward lean read as a statue
  falling over. Counter-pitch keeps the gaze level while the trunk accelerates forward.
- **Why a two-segment shoe.** A single rigid foot cannot show heel-strike → roll → toe-off; the
  contact phase is where running reads as running.
- **Why the software rasteriser.** It makes the artwork testable in Node: the same scene graph the
  browser paints can be asserted for coverage, determinism and phase difference without a browser.
- **Why the exact numbers are in the ledger.** "Looks better" cannot be reviewed, reverted or
  compared across branches. IoU, spill counts, sole heights and coverage can.

---

## 9. Cross-branch synthesis {#cross-branch}

The full ledger is `docs/N_WAY_COMPARISON.md`. This section records **what was adopted and why**, so
the reasoning survives even if the ledger is reorganised.

| Adopted | From | Into this repo |
|---|---|---|
| Addenda + living-spec discipline | upstream GREENFIELD | `docs/ADDENDA.md`, this file |
| FDS anchors, states, R1/R2/R4/R5 audits | upstream `FDS_BUILDER.md` | §3–§6 of this file |
| Per-turn learning register | all three siblings converged independently | §11 + `CLAUDE.md` |
| Machine-readable tip snapshot + history | Funicular `tools/compare-branches.ts` | `tools/compare-branches.ts`, `src/generated/branch-*.json` |
| Observed vs reviewed hash separation | Sprite Motion Lab | ledger §2 |
| Five provenance categories | Sprite Motion Lab (four) extended | `CLAUDE-validation.md` |
| Walk / brisk-walk duty profiles and double support | Stride Lab | `resolveGait` profiles |
| 16-phase multi-background audit | Stride Lab + Funicular `photo:audit` + Sprite Motion Lab | `tools/dump-cycle.ts` + in-app audit export |
| All-or-nothing asset readiness + retry | Sprite Motion Lab / Stride Lab | `useSpriteData` error state + Retry |
| `data-testid` contract + discipline gate | Sprite Motion Lab gate, GREENFIELD §6 | `tests/discipline/` |
| Prompt provenance with regeneration justification | Sprite Motion Lab + Funicular | `docs/PHOTO-PROMPTS.md` |
| Failed-experiment register | Funicular plan + Sprite Motion Lab plan | `PLAN.md` §4 |
| Measured-art stance (no test-count scoring) | Funicular ledger | §8 + ledger §4 |

**Deliberately not adopted (yet).** Photographic multi-plate rigs, Python extraction toolchain,
raster→SVG colour-band vectoriser, interactive joint calibration, Playwright browser suite, monorepo
Docker variants. Each is a **Gap** row with an explicit acceptance criterion; none is silently
dropped.

---

## 10. Non-functional requirements {#nfr}

| Id | Requirement | How it is met |
|---|---|---|
| `#nfr-perf` | Live playback stays smooth on a laptop | pure functions, one canvas per panel, memoised pose info, 60 fps rAF clock |
| `#nfr-size` | No runtime network beyond static assets | single bundle (~233 kB raw / ~74 kB gzip), assets served from `/sprites` |
| `#nfr-sec` | No secrets, no backend, unprivileged container | numeric `USER 1001:1001`, `.env.example` only, no API |
| `#nfr-a11y` | Keyboard-operable, labelled controls | native buttons/inputs, `aria-label`/`aria-pressed`, visible focus ring, reduced-motion starts paused |
| `#nfr-det` | Byte-identical regeneration | deterministic pipelines; raster output compared in tests |
| `#nfr-honest` | No unproven claim | five provenance categories; gaps stated in the ledger |

---

## 11. Continuous learning register {#learning-log}

Convention: one entry per turn, appended. `TURN-L01`…`TURN-Lnn`. An entry is not a changelog; it is
*evidence → observation → decision → validation → next*.

### TURN-L01 · 2026-10-17 · Bootstrap, sibling review and harmonisation

**Context.** User asked to (1) adopt `wshyang/greenfield` as the coding discipline for this repo,
(2) review the four unmerged sibling branches of the same app and fold their good practice into our
own FDS/discipline, (3) maintain a live n-way comparison ledger tracking each branch's latest hash
and progress, (4) build our own harmonised greenfield, CLAUDE.md and FDS, then (5) implement.

**Evidence.**
- Upstream `wshyang/greenfield` @ `8ba74027be5fad41e48cadde82cc0120d628b109`: read `GREENFIELD.md`
  (479 lines, sha256 `400d282e…`), `FDS_BUILDER.md` (728 lines), `initial-templates/`.
- Sibling tips observed by `git ls-remote` / `gh api`:
  Sprite Motion Lab `e172b0f1f8d9b640b65a4ba420f71965693adb23`, Stride Lab
  `b227e2fe562be341f15f58955f539d325170729e`, Funicular
  `43352cf3fe8cb6c486aa79a59954d5972a5e13ac`, Procedural Runner
  `bab689cdac3ba730138bfae09dda537978d61e09`.
- Extracted all four to `/tmp/branches/<sha-prefix>` with `git archive`; read their
  `CLAUDE*.md`, `docs/{FDS,SPEC,ADDENDA,VALIDATION,THREE-WAY-*,BRANCH-*}.md`, `package.json`,
  `Dockerfile*`, `.claude/skills/audit-gait-cycle/SKILL.md`. **Not executed**: none of the sibling
  test suites or builds.
- Verified the repo's single artwork (`incorrect running sprites.jpeg`) is byte-identical to the
  sheets used by all four siblings: sha256 `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`.
- Measured the sheet directly with a throwaway decoder: 2528×1696, 82.2 % magenta, six row bands
  (`166–364`, `431–618`, `694–882`, `954–1142`, `1212–1400`, `1469–1658`), eight column clusters.

**Observation.** The four siblings are four genuinely different implementations of the same
product: raster photo rig with plate-space caps (Funicular), Python extraction + browser workbench
with walking profiles (Stride Lab), 10-plate photographic rig + SVG vectoriser + exhaustive prompt
log (Sprite Motion Lab), and the smallest React procedural engine (Procedural Runner). Their
**disciplines** had already converged independently on four ideas: per-turn learning registers,
live cross-branch ledgers, prompt provenance, and 16-phase visual audits — but each implemented a
different subset with different bookkeeping, and none of them included the fourth branch
(Procedural Runner) in its ledger.

**Decision (adopted).**
- Harmonised `GREENFIELD.md` = upstream §§0–11 + a new §12 that unifies the four converged
  practices (per-turn learning, n-way ledger with observed/reviewed hash separation, prompt
  provenance, full-cycle audit) + §13 provenance table.
- **n-way, not 3-way**: the ledger includes all five branch names including ours.
- Capability union of 23 rows, each with an explicit acceptance criterion, rendered in-app from
  `src/shared/parity.ts` and gate-checked against the markdown ledger so the two cannot drift.
- Generated our own extraction instead of copying a sibling's: pixel-detected grid, border-seeded
  chroma key, 48 frames, measured `magentaSpill = 0`.
- Chose the procedural engine as **our** implementation (rather than the photo rig): it is the only
  one that is fully testable in Node without a browser or native image stack, which keeps the
  "real inputs, no mocks" gate honest in this sandbox.

**Validation (executed this turn).**
- `npx tsc --noEmit` clean.
- `npx vitest run tests/runner tests/pipeline` → 32/32 passing.
- `npm run build` → `dist/` produced (233 kB JS, 74 kB gzip).
- `npx tsx tools/run-pipeline.ts` → `grid 8x6 header=129px cell=316x262 · frames=48
  duplicates=18 magentaSpill=0`.
- `npx tsx tools/dump-cycle.ts` → 16 phases × 2 backgrounds; contact sheet **opened and viewed**.
- `npx tsx tools/compare-branches.ts` → five tips refreshed, history written, ledger table rewritten.
- **Not executed**: Docker build, SHIP-HATS activation against a real GitLab, browser E2E, any
  sibling's suite.

**Uncertainty and next action.** The procedural figure reads clearly at mid-stance but the far arm
still crosses the torso silhouette at some phases, and the shoe overlaps the shin at max
dorsiflexion — both visible in the audit sheet, neither fixed. Photographic persona, SVG output and
joint calibration remain **Gap** rows. Next: fix the far-arm occlusion at φ≈0.55–0.75, then re-run
the audit before touching the parity rows that depend on it.

### TURN-L02 · 2026-10-17 · Discipline gate made executable, panels split, shoe/sock pass

**What changed.** The discipline gate stopped being a regex heuristic and became a TypeScript
AST walk over `src/**/*.ts(x)`: function bodies are measured from their real declaration nodes,
JSX interiors are inspected only inside JSX, and interactive elements are found by tag name with
brace-balanced attribute parsing. This removed four false positives (a `return (` early exit, a
`find` inside a `.map` callback in a component body, `toFixed` inside a handler) and one false
negative (the gate never saw `Controls.tsx` because it only looked at `sourceFiles` of `.tsx` with
a naive scan). With the gate honest, the code was refactored to satisfy it rather than the other way
round:

- `scene.ts` 404 → 304 lines by moving primitive builders to `scene-shapes.ts`.
- `GalleryPanel` → `PaletteStrip` + `FrameGrid`; `InspectorPanel` → `PartList` + `isolatedLabelFor`;
  `App.TabContent` → `InspectorTab` / `DiagnosticsTab` / `GalleryTab` / `ParityTab` + `TAB_VIEWS`;
  `StudioWorkspace` → `Sidebar` + `RightRail`; `useWorkspace` → `useSelection` + composition.
- `analyseExtraction` 55 → 45 lines via `duplicateStatistics`, `stanceStatistics`, `summarizeFlaws`
  and five named finding builders.
- `runAnalysis` now `mkdirSync`s `docs/` so a fresh clone cannot fail with ENOENT.

**Art pass (measured, not asserted).**
- Far arm: swing damped to 0.72× on the far side, far shoulder moved from `(-5, drop+1)` to
  `(-8, drop+1)`, far elbow flex 0.88×. This reduces how far the far forearm leaves the torso
  silhouette; it does **not** eliminate the crossing.
- Foot clearance: run `liftPx` 34 → 46 so the passing foot clears the stance shoe instead of
  stacking on it. A 0.985 hip-height trial was reverted after the gait test caught the shin chain
  overshooting its joint length by 0.45 px — the test is doing its job.
- Ear: moved from `local(-1, 2.6)` (which read as a ring on the cheek) to
  `local(-headRx × 0.58, 2.2)` with radius 3.6.
- Shoes: body radii 8.4/6.8 → 6.7/5.5, sole 2.6 → 2.1, shoe colour off-white → dark navy
  `#2e3644`, sole light `#e8e5dc`. This removes the "white slab" read and matches the source.
- Socks: added a 26 px sock capsule above the ankle in the jersey colour, merged into the same
  `nearShin`/`farShin` part (a second part with the same id was silently dropped by
  `PART_ORDER.map(...).find(...)` — a real bug this pass surfaced).

**Validation executed.**
- `npx vitest run` → **44/44** passing: runner, pipeline, a `renderToStaticMarkup` app smoke test
  (studio shell and all five tab testids) and the 10-test discipline gate.
- `npm run validate` (typecheck + tests + build) → OK; bundle 234.63 kB / 74.66 kB gzip.
- `npx eslint .` → clean. `npx prettier --check src tests tools` → clean.
- `npx tsx tools/_armcheck.ts` (temporary) → five 3× frames at φ 0.15–0.40 rendered and viewed.
- Source re-read: `/tmp/refsheet.png` (red frames 1–4); source shows bent elbows, red socks,
  dark shoes with light soles, and a compact torso — the shoe/sock changes follow what it shows.

**Open, honestly.** The figure still reads more "articulated mannequin" than the source illustration
(thick uniform limb capsules, circular joint discs, both knees visibly bent at mid-stance). The
parity ledger still marks browser E2E, Docker-build verification, SVG vectorisation, photographic
persona and joint calibration as `Gap`. Nothing in this entry claims those.

**Continuous learning register.** This entry is the second; TURN-L01 holds the bootstrap review.
The rule stands: every turn that changes code or docs appends a dated entry here before the turn
ends, and the n-way ledger is refreshed from `npm run branches:compare` rather than hand-edited.

### TURN-L03 · 2026-10-18 · Pure-SVG vector output

**Why.** `Pure-SVG vector output` was a `Gap` row: the scene primitives were serialisable, but no
frame had ever been traced from pixels to paths. The capability only counts when it is measured
against real input, so the requirement was set as *re-rasterise the emitted paths and report IoU*.

**What shipped.**
- `src/pipeline/quantise.ts` — deterministic median-cut palette (14 colours) over 5-bit RGB buckets,
  nearest-colour labelling weighted 0.3/0.59/0.11, transparent pixels labelled `-1`.
- `src/pipeline/trace.ts` — marching-squares contours over a one-pixel-padded mask, segment
  stitching by endpoint key, Ramer–Douglas–Peucker simplification (0.30 px), signed-area filter.
  Outer edges and holes are emitted alike and filled with `fill-rule="evenodd"`, so no orientation
  bookkeeping is needed.
- `src/pipeline/vectorise.ts` — one `<path>` per colour band, `viewBox` in source pixels, no
  embedded raster, bands sorted by pixel count.
- `src/pipeline/vector-eval.ts` — an independent even-odd scanline rasteriser plus
  `measureFidelity` (mask IoU and colour agreement).
- `npm run vectors:build` → 48 SVGs in `public/vectors/<palette>/frame-NN.svg` and a manifest with
  per-frame metrics; the new **Vector output** tab lists them by colourway with IoU and download.

**Measured.**
- 48/48 frames traced; mean mask IoU **0.926**, mean colour agreement **0.890** (14 colours,
  tolerance 0.30, minimum area 2 px).
- 2.84 MB of SVG for 48 frames; one frame ≈ 47 KB, ≈ 4 200 points.
- Visual check: source frame vs re-rasterised SVG side by side at 2× — silhouette, socks, shoes and
  jersey stripe survive; the pixel-art dithering becomes small speckle bands.

**Bug found by the tests.** The first stitcher always continued from a segment's `b` endpoint, so
every loop fragmented after one cell and the rasterised output was mostly empty (mask IoU 0.22 on
the first real frame). Segments are undirected; the fix continues from whichever endpoint was not
entered. The square-mask unit test pins this: one loop, area 99.5 px².

**Rejected in this turn.** `minArea` 6 and tolerance 0.5 produce cleaner-looking SVGs but drop thin
parts (socks, fingers) and cost ~0.04 IoU — recorded rather than quietly tuned for looks.

**Continuous learning register.** TURN-L01 bootstrap, TURN-L02 gate/refactor/shoe-sock, TURN-L03
vectorisation. The rule stands: evidence in the same turn, ledger refreshed by tool, never by hand.

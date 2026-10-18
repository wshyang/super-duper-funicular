# Addenda register

Append-only. Every decision not dictated by the request or by `GREENFIELD.md` gets the next
sequential id, **in the same change that makes the decision**. Never renumber; date a correction
instead of rewriting.

Each entry: **Decided · Why · Area · Impact.**

---

## ADD-001: Stack and no-backend decision

- **Decided:** TypeScript 5.9 + React 19 + Vite 7, Canvas 2D, Vitest 3, `jpeg-js`/`pngjs`, no
  server, no database, no auth. Exact-pinned dependencies with a committed lockfile.
- **Why:** the product is a static workbench over committed artwork. A backend would add an
  environment story, a data layer and an authorization model that no capability needs; every
  sibling that added one added it for the same non-reason.
- **Area:** whole product.
- **Impact:** GREENFIELD §4–§5 (ORM, soft delete, migrations, IDOR tests) stay **dormant** and are
  recorded in `CLAUDE-database.md`. If a data layer appears, that file is the starting contract and
  the §4/§5 dormancy must be removed from `CLAUDE.md` in the same change.

## ADD-002: The source artwork is relocated, not recompressed

- **Decided:** `incorrect running sprites.jpeg` moves to
  `src/images/source/runner-8frame-6-colorways-source.jpeg` with `git mv`, byte-identical
  (sha256 `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`).
- **Why:** the filename describes a defect, not the asset, and a space in a path breaks shell
  tooling. All four siblings use the same bytes under four different names; keeping the bytes lets
  our measurements be compared with theirs.
- **Area:** `#obj-image-asset`.
- **Impact:** the manifest records this path and digest; moving the file invalidates every committed
  frame until `npm run pipeline` is re-run.

## ADD-003: The grid is detected from pixels, never hard-coded

- **Decided:** rows and columns come from magenta-separator profiling (`src/pipeline/grid-detect.ts`),
  with the header band derived from the row pitch. A minimum-content-height filter keeps the title
  text from being mistaken for a row.
- **Why:** a hard-coded 6×8 silently extracts 32×6 cells from a differently authored sheet, and the
  failure looks like "bad artwork" rather than a code bug. During development the naive version did
  exactly that.
- **Area:** `#feat-extract`.
- **Impact:** a new sheet with a different grid works without code changes; a sheet without magenta
  separators fails loudly ("Unable to detect sprite-sheet rows…") instead of producing garbage.

## ADD-004: Duplicates are soft-tagged

- **Decided:** `status: 'active' | 'deprecated'` plus `duplicateOf` in the image manifest. Nothing is
  deleted.
- **Why:** GREENFIELD §4's soft-delete principle applies to build artefacts too: deleting a source
  loses the evidence that it was considered.
- **Area:** `#obj-image-asset`.
- **Impact:** the manifest is a record of decisions, not just a file list.

## ADD-005: Extraction uses a border-seeded flood fill

- **Decided:** chroma keying seeds a flood fill from the cell border with a loose magenta predicate,
  then sweeps interior _strong_ magenta, then despills magenta fringes.
- **Why:** a global threshold erodes the purple jersey — magenta and violet are neighbours in RGB.
  Seeding from the border only removes the connected background, which is the definition of "keyed".
- **Area:** `#feat-extract`.
- **Impact:** measured `magentaSpill = 0` over 48 frames. A future asset with a magenta garment would
  need a different key and a new addendum; the current one is only valid for this palette set.

## ADD-006: The analysis measures four specific defects, not "quality"

- **Decided:** the analysis reports duplicate pairs (IoU), four-column repetition, scale and baseline
  jitter, foot separation, foot crossing and stance-side lock. Nothing else.
- **Why:** each of these is a claim a reviewer can check and a sibling can compare. "Looks stiff" is
  not a measurement and cannot be regressed against.
- **Area:** `#feat-analyse`.
- **Impact:** the generated report states its own limits; a test asserts the four-column pattern so a
  regression in the metric is caught, not just a change in the artwork.

## ADD-007: The procedural engine is our implementation of the product

- **Decided:** our implementation solves a 17-part rig procedurally instead of shipping a
  photographic cut-out pipeline.
- **Why:** it is the only approach that can be fully verified **in this sandbox** — the software
  rasteriser lets tests assert coverage, determinism and per-phase difference with no browser, no
  native canvas and no generated photographs. The siblings' photographic pipelines are stronger art
  and remain an explicit Gap for us.
- **Area:** `#feat-engine`, §3.3.
- **Impact:** the acceptance bar for our rows is behavioural; the art rows stay `Gap` until a
  photographic pipeline exists. Do not claim photographic parity.

## ADD-008: Canvas is 260×340 with a fixed ground line at y=318

- **Decided:** the canonical canvas grew from 240×300 to fit a fully drawn figure, with the ground
  line at 318.
- **Why:** at 240×300 the head and feet were clipped at full extension; the figure was drawn at 78 %
  of the available height to compensate, which read as a crouch. Measured by viewing the audit sheet.
- **Area:** `#obj-scene`.
- **Impact:** exports, thumbnails and the CSS aspect ratio all derive from `CANVAS`; a test asserts no
  primitive escapes the canvas by more than 40 px.

## ADD-009: Hip height comes from standing reach, not from maximum extension

- **Decided:** `hipCenterY = groundY − ankleHeight − (thigh + shin) × 0.97`, per persona scale.
- **Why:** placing the hip at full leg extension locks both knees straight for the whole stance and
  makes the figure read as a mannequin on stilts. The 0.97 factor keeps a natural bend while still
  reaching the ground.
- **Area:** `#obj-articulated-pose`.
- **Impact:** gait parameters no longer change hip height; a future "crouch" control must move the
  hip explicitly rather than being implied by stride.

## ADD-010: The stance sole is placed from the ground, not the ankle

- **Decided:** the foot is solved in shoe-local space, rotated by the roll pitch, and the ankle is set
  so the **lowest** sole point is exactly on the ground line while in stance.
- **Why:** placing the ankle and letting the shoe rotate drives the toe through the floor at toe-off
  (30°). This is the classic "detached foot" failure in all three siblings' audits.
- **Area:** `#obj-articulated-pose`.
- **Impact:** asserted over 64 phases: stance sole equals `groundY` within 1e-6; swing sole never
  rises more than `lift + 4` px. Any new foot shape must preserve that invariant.

## ADD-011: Motion profiles are duty-cycle definitions, not presets

- **Decided:** `run` duty 0.38 (flight permitted), `brisk-walk` 0.56, `walk` 0.62 (double support
  required); flight and double support are _derived_ from the duty values plus contralateral phase.
- **Why:** the siblings' walking implementations prove the concept, but importing their contact knots
  into a different coordinate model would have produced plausible-looking wrong motion. Deriving the
  support state from duty makes the invariant testable: a walking profile cannot contain flight.
- **Area:** `#feat-engine`.
- **Impact:** `tests/runner/gait.test.ts` asserts flight-only-for-run and double-support-only-for-walk
  over 64 phases. Adding a new profile means choosing a duty and proving its support state.

## ADD-012: One scene contract, two painters

- **Decided:** `buildScene` returns primitives; `paint-raster` (Node, deterministic, used in tests
  and the CLI) and `paint-canvas` (browser, gradients, used by the studio and exports) both consume
  it. No drawing code exists anywhere else.
- **Why:** the siblings' export paths diverged from their stage renderers, which is how a downloaded
  sheet stops matching the preview. Sharing the scene makes that class of bug impossible and makes
  the art testable without a browser.
- **Area:** `#obj-scene`.
- **Impact:** a visual change must be made in the scene, not the painter; the gate test forbids
  `node:` imports in components so the shared scene stays isomorphic.

## ADD-013: The parity matrix lives in code and is gate-checked

- **Decided:** the capability union is `src/shared/parity.ts`; the markdown ledger must mention every
  capability name, and `branch-tips.json` must agree with the ledger's branch list.
- **Why:** Funicular and Sprite Motion Lab both keep ledgers, and both had already drifted from their
  own docs by one revision. A document that only humans read rots between turns.
- **Area:** `#feat-parity`, GREENFIELD §12.2.
- **Impact:** adding a capability means editing both files in one commit; the gate fails otherwise.

## ADD-014: **n-way**, not 3-way — and our own row is untrustworthy by construction

- **Decided:** the ledger tracks all five branch names, including ours. Our row is refreshed from the
  remote when published and otherwise shows the last known commit with the working delta described
  in prose.
- **Why:** the three sibling ledgers each tracked "the other two" and excluded the fourth branch and
  themselves; two of them also embedded a stale hash of their own branch, which is structurally
  impossible to keep correct. Naming the limitation is more useful than a wrong number.
- **Area:** `#feat-parity`, `tools/compare-branches.ts`.
- **Impact:** `compare-branches` falls back to local `HEAD` **only** for the current branch and
  labels it "unpublished working delta"; it never fabricates a remote tip.

## ADD-015: Five provenance categories

- **Decided:** read / viewed / executed / peer-reported / unverified, used in every claim.
- **Why:** Sprite Motion Lab's four-way split was the best existing vocabulary but had no word for
  "unknown"; the siblings' reports repeatedly blurred "their tests pass" with "we ran tests".
- **Area:** `CLAUDE-validation.md`, this register, every commit message.
- **Impact:** `docs/VALIDATION.md` tracks the categories per gate.

## ADD-016: The audit is 16 phases × 3 panels with telemetry, and it is not a proof

- **Decided:** `npm run dump-cycle` writes 16 phases on light and dark backgrounds with per-panel
  telemetry, and prints a reminder that presence is not seamlessness. The in-app export adds the
  skeleton column.
- **Why:** all three siblings converged on 16 phases; eight keyframes hide the phase where the joint
  fails. The telemetry makes the review reproducible without pretending it is automated judgement.
- **Area:** `#feat-audit`.
- **Impact:** a visual change without a viewed audit sheet is unverified, even if all tests pass.

## ADD-017: Discipline is executed, not documented

- **Decided:** `tests/discipline/greenfield-gate.test.ts` enforces file/function size, JSX purity,
  testid coverage, the container contract, inert-pipeline placeholders, presence of the discipline
  files, ledger/parity sync and the existence of turn entries.
- **Why:** Sprite Motion Lab is the only sibling with such a gate, and it is also the only one whose
  documented limits matched its code at review time.
- **Area:** GREENFIELD §2, §11.
- **Impact:** violating a rule fails `npm test`, i.e. `npm run validate`. The gate is deliberately
  crude (regex-based) and this is stated in the file.

## ADD-018: Generated evidence never enters Git

- **Decided:** audit sheets, crops and telemetry go to `/tmp` or ignored directories;
  `public/sprites/**` and `src/generated/**` are committed because they are reproducible product
  artefacts.
- **Why:** Funicular commits a 760 kB audit PNG and Sprite Motion Lab commits large contact sheets;
  both inflate history without adding reviewable value once the finding is written down.
- **Area:** build artefacts.
- **Impact:** a reviewer reproduces the evidence with a command instead of reading a binary from Git.

# Addenda — project decisions

Append new `ADD-nnn` records. Do not renumber or rewrite earlier decisions; supersede them with a dated entry. Every entry belongs in the same change as the decision or implementation it governs.

## ADD-001 · Adopt upstream Greenfield as the coding discipline

**Decision:** Copy `wshyang/greenfield/GREENFIELD.md` byte-for-byte into this repository at the root. Pin provenance to upstream commit `8ba74027be5fad41e48cadde82cc0120d628b109` (2026-10-13). Keep `CLAUDE.md` as a project binding/index and split focused working rules into `CLAUDE-*.md` files. Adapt the upstream FDS Builder in `FDS_BUILDER.md` rather than treating its chatbot-only response protocol as a repository rule.

**Why:** The upstream gives durable decision, test, function/module, validation, reproducibility, and deployment principles. Branches #1/#2/#3/#4/#5 and the historical `ce6d` implementation show the value of a compact index, focused modules, continuous learning, real-asset testing, and explicit validation limits.

**Related sections:** `GREENFIELD.md` §§0–11; `FDS_BUILDER.md`; root `CLAUDE.md`.

**Impact/status:** The Greenfield source is unmodified. Database/migration rules are dormant because the product has no backend. Container rules are contextualized to the static preview. SHIP-HATS is deferred until there is an actual configured GitLab destination. These applicability choices do not claim that containers or compliance were tested.

## ADD-002 · Treat the input image as immutable evidence

**Decision:** Preserve the baseline asset's bytes. Current `incorrect running sprites.jpeg` is 2,793,356 bytes, 2528×1696, SHA-256 `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`. A future move/rename must prove the same byte hash. Keep visually similar frames; only exact file/pixel duplicates may share generated storage.

**Why:** This is the only tracked file on the base commit. It is the evidence needed for extraction and flaw analysis; lossy edits or fuzzy deduplication could erase the defect being studied.

**Related sections:** FDS §3 `SourceAsset`; F-001–F-003.

**Impact/status:** Provenance outside this Git history and any licence are unknown. The dimensions were read from its JPEG SOF marker, and the displayed sheet was viewed; no decoded-pixel or local gait metrics have yet been computed.

## ADD-003 · Define a dynamic n-way parity cohort

**Decision:** The active cohort is this session branch plus every open PR targeting `main` that implements the same app, and any recent unsubmitted remote branch that clearly contains active same-app implementation/spec work. Track such a no-PR branch as a provisional candidate until it opens a PR, is merged/closed, or becomes historical. Closed-unmerged PR branches leave the active denominator but stay in the reference table/matrix with their full SHA; explicitly promote one only if it is still actively advancing. Track `main` separately as baseline; retain older superseded branches in a historical/reference section.

**Why:** The user asked for a dynamic n-way comparison and feature parity. The open-PR count grew from three to five during review, then PR #5 closed without merging while a no-PR candidate remained active. A fixed cohort or PR-only ledger silently becomes stale; preserving a closed PR as reference prevents losing useful evidence without masking the cohort shrink.

**Related sections:** FDS §§1, 8; `docs/BRANCH-COMPARISON.md`; `CLAUDE-decisions.md`.

**Impact/status:** At the latest refresh there are four open PRs (#1–#4), this session, and one active unsubmitted candidate (`n = 6`). PR #5 closed unmerged at `2026-10-17T23:29:23Z` and remains reference-only; `arena/ce6d2a6e-super-duper-funicular` is historical. Refresh membership and hashes every turn. Feature parity means equivalent behavior and acceptance evidence, not identical frameworks or code. This branch never modifies peer branches.

## ADD-004 · Use one canonical FDS and keep learning append-only

**Decision:** `docs/FDS.md` is the canonical functional contract and continuous-learning ledger. `docs/ADDENDA.md` is the decision history; `docs/BRANCH-COMPARISON.md` is live branch evidence. Do not create a duplicate `SPEC.md` or duplicate comparison ledger.

**Why:** Peers use three different FDS architectures (full canonical spec, split spec-plus-learning register, and index-plus-domain plans); one canonical entry point avoids drift while the addenda and comparison retain specialized histories.

**Related sections:** FDS §11; `FDS_BUILDER.md`; `CLAUDE.md`.

**Impact/status:** Every assistant/agent turn gets a sequential `TURN-Lnnn` entry, including no-code turns. Every non-user-directed architectural/behavioral choice receives an addendum in the same change. A finding is labelled draft if evidence or user confirmation is missing.

## ADD-005 · Target the feature union, not an architecture winner

**Decision:** Use the union of useful product, asset, output, and engineering capabilities in all active same-app PR heads and provisional candidates as the parity target. Preserve local strengths and list acceptance evidence; do not choose a branch based on file count, implementation size, or test count. Architecture details are not parity requirements by themselves.

**Why:** PR #1 has unique photo/SVG/prompt-audit work, #2 the richest browser studio and walking/calibration behavior, #3 measured matte/width/shape quality and conservative visual analysis, #4 a framework-light domain core, and #5 a compact FDS/studio baseline. Each offers distinct value and each has gaps.

**Related sections:** FDS §§5–8; `docs/BRANCH-COMPARISON.md`.

**Impact/status:** The union is sequenced across P1–P3. Features involving generated assets, exact numerical defaults, or export formats remain draft until validated. Code from another branch must be adapted and re-tested against this branch's coordinate/asset contracts.

## ADD-006 · Bind the implementation stack and keep its core portable

**Decision:** Use strict TypeScript on Node 22 LTS with npm; Vite and Canvas 2D for the browser app; React for the interaction-heavy studio shell; Vitest and Playwright for tests. Keep gait, geometry, rig, image processing, and renderer modules framework-independent. Prefer one TypeScript asset pipeline and port proven Python behavior rather than keeping two authoritative extractors. Pin exact versions in the first package lockfile. No backend or database is in the current product scope.

**Why:** Five active PRs contain three React workbenches and two framework-light implementations. The target union includes interactive calibration, asset recovery, multi-profile controls, and an audit studio; React suits that surface, while the pure-TS core retains the clean separation and low-level portability of #3/#4. The no-backend static model is common to the reviewed implementations and fits the product's local workflow.

**Related sections:** FDS §§2, 7; `CLAUDE.md`; `CLAUDE-function-design.md`; `CLAUDE-infrastructure.md`.

**Impact/status:** This selects framework boundaries, not exact dependency patch versions or a final export contract. Exact versions are pinned before implementation; revisions require a superseding addendum before changing the stack. Session-only settings and JSON downloads remain the only persistence mechanism.

## ADD-007 · Begin Stage 2 with an immutable local pipeline and shared Canvas renderer

**Decision:** After Stage 1 completion and the user's authorization to proceed, implement the P1 source path as one local TypeScript pipeline (`jpeg-js` decode, `pngjs` output, SHA-256 pin, grid detection, border-connected magenta key, frame extraction, analysis, and generated report). Keep the source JPEG byte-identical. Use a framework-independent phase/IK/pose/render core, with React for the workbench; live stage, transparent sprite PNGs, and the 16-phase × three-panel audit share the same `renderRunner` path. Browser assets are same-origin; no backend, remote fonts, or generated artwork were introduced.

**Why:** The FDS puts the real source and reproducible analysis first. Early real-input runs showed that a high-magenta row projection inverted the intended bands, and a loose border-key threshold classified a synthetic violet garment pixel as background. The corrected detector projects non-background content; the stricter connected background classifier preserves violet while the actual JPEG regression still reports zero strong-magenta spill. Grounding the rendered shoe from its own heel/toe geometry keeps tests and pixels on the same contact contract.

**Related sections:** FDS F-001–F-008, F-012–F-015; `src/pipeline/`; `src/runner/`; `src/app/exporters.ts`.

**Impact/status:** Current measured source output is 48 frames, detected 8×6 grid, header 129 px, 316×261 px cells, 24 near-duplicate pairs, mean centroid-aligned quarter-cycle IoU 0.9361, maximum baseline range 26 px, maximum height range 25 px, zero exact duplicates, and zero measured strong-magenta spill. These values are specific to the documented thresholds/methods; they do not certify the procedural runner's visual quality. `npm run validate` passes 14 local tests and production build. The audit exporter exists, but its image has not yet been opened or visually accepted; photo rig, calibration, SVG, Playwright and deployment remain incomplete.

**Dependency correction:** `npm audit` found Vite/Vitest advisories in the initial exact pins. Upgraded the direct development pins to Vite `7.3.7` and Vitest `4.1.11`, regenerated the lockfile, re-ran validation, and confirmed `npm audit` and `npm audit --omit=dev` report zero vulnerabilities. This supersedes dependency versions only, not the stack decision in ADD-006.

## ADD-008 · Iteratively remove magenta JPEG fringe without stripping the violet palette

**Decision:** Extend the connected-magenta key with a bounded edge cleanup. After clearing border-connected background and isolated strong-magenta pixels, peel at most eight 8-neighbour-connected layers matching the measured magenta-fringe hue from the cleared matte; preserve non-fringe outlines and apply local matte estimation to remaining compatible edge pixels. `magentaSpill` now counts opaque strong-magenta pixels plus magenta-hued pixels still adjacent to cleared matte. The source JPEG remains immutable.

**Why:** Visual inspection of the first extracted red and purple frames revealed a conspicuous pink/purple halo that the original “strong-magenta” counter missed (a broad tint heuristic found 431 candidate pixels in the red frame while the strict counter reported zero). Visual inspection of the actual JPEG showed dark outlines with JPEG chroma contamination at their boundaries. The bounded cleanup removes that halo while preserving interior violet fabric and dark outline structure.

**Related sections:** FDS F-002/F-003; `src/pipeline/chroma-key.ts`; `src/pipeline/analysis.ts`; `tests/pipeline/image-pipeline.test.ts`; generated `public/sprites/analysis.json` and `docs/SPRITE-FLAW-ANALYSIS.md`.

**Impact/status:** Synthetic tests now include a magenta-hued fringe ring, a dark outline, and a violet interior; they assert that fringe is cleared while outline and violet remain opaque. The real-JPEG regression reports zero strong-magenta or residual fringe-edge pixels across all 48 frames. Visual review of the extracted red, blue, and purple frames shows the conspicuous halo removed with violet fabric retained. These color thresholds and eight-layer bound remain a heuristic; this is not semantic segmentation. Browser acceptance and visual review of the procedural runner audit export remain open.

## ADD-009 · Paint the solver's neck segment in the shared renderer

**Decision:** Draw a skin-toned rounded neck stroke from `RunnerPose.shoulder` to `RunnerPose.neck` before the torso, so the shirt occludes the neck base and the head covers its upper endpoint. Add a renderer-level test that verifies the shared paint path connects the solver's exact endpoints.

**Why:** Magnified review of the local 16-phase audit showed a visibly detached head and torso. The pose solver already provided a neck segment, but `renderRunner` never painted it; the skeleton overlay therefore looked more anatomically connected than the clean light/dark panels.

**Related sections:** FDS F-004/F-005/F-012; `src/runner/render.ts`; `tests/app/render.test.tsx`; local runner audit export.

**Impact/status:** The shared live-stage/sprite/audit renderer now paints the neck beneath the shirt. The magnified phase-0.25 audit shows the gap closed; a recording-context test asserts the skin stroke endpoints. This fixes a specific defect, not the mannequin-like overall style; contact, proportion, and browser acceptance remain separate gates.

# PR #1 and PR #8 — Branch Assessment

**Review date:** 2026-10-18 UTC

**Base checkout:** `396ce256debcb5bdc2419cc0f3f399730b61ab36`
**Review worktrees:** `/home/user/pr-review/pr-1` and `/home/user/pr-review/pr-8` (detached, clean)

- [PR #1 — Sprite Motion Lab](https://github.com/wshyang/super-duper-funicular/pull/1), reviewed commit `936f37ce07f18e38fc4f5b3880c80029ec9f55cf`, branch `arena/917ef347-super-duper-funicular`.
- [PR #8 — Rebuild Athletic assets and add five-persona gait audit](https://github.com/wshyang/super-duper-funicular/pull/8), reviewed commit `04d5caf432ff81be0307a3ec79e894da1b60045c`, branch `arena/e1300d3c-super-duper-funicular`.

## Executive assessment

**PR #1 is the stronger reference for the failure analysis and the development/visual-audit discipline; PR #8 is useful as a focused rebuild experiment, but its rebuild introduced or exposed regressions. Neither branch should be copied or merged wholesale into this baseline.** The central problem is not that either branch lacks tests: both pass their local technical gates. It is that code-level and pixel-level counters can pass while the photographic assembly still has perceptible seams, texture discontinuities, or ambiguous foot contact.

The recommended next step is to choose the asset-authoring mode (a coherent captured frame sequence, a 2D/2.5D rig, or a rendered 3D character exported as sprites) before implementing a replacement. The revised proposal is in [`REVISED_PHOTOGRAPHIC_SPRITE_PIPELINE.md`](REVISED_PHOTOGRAPHIC_SPRITE_PIPELINE.md).

## Branch relationship and scope

| | PR #1 | PR #8 |
|---|---|---|
| Reviewed head | `936f37ce07f18e38fc4f5b3880c80029ec9f55cf` | `04d5caf432ff81be0307a3ec79e894da1b60045c` |
| FDS version at that head | v5.1.0 | v4.10.0 |
| PR-reported change size | 758 paths; 33,978 additions | 710 paths; 30,675 additions |
| Emphasis | Full sprite-analysis/animation studio, 17-part algorithmic and photoreal rig, cutout/SVG work, extensive prompt and audit records | Athletic photographic-asset rebuild and five-persona gait audit |
| Local review directory | `/home/user/pr-review/pr-1` | `/home/user/pr-review/pr-8` |

Both branches share base `396ce256` but neither is a simple descendant of the other. PR #1 incorporates much of PR #8's learning and adds a failure catalog, a rebuild audit, and a newer multi-persona audit, while the extraction code diverges. The comparison of PR #8 to PR #1 spans 325 changed paths (approximately 5,350 insertions and 2,047 deletions). Treat the two heads as distinct snapshots, not as interchangeable patches.

## Evidence and validation provenance

### Read and compared

- Read PR #1's `FDS_BUILDER.md` and `docs/FDS.md` v5.1.0 end to end.
- Read PR #8's `docs/FDS.md` v4.10.0 end to end, then reconciled it against the newer PR #1 FDS. PR #1 §8.4 adds 16 image-generation and 8 pipeline/calibration failure classes; §9.9 documents the PR #8 rebuild; §11.3 records a later five-persona audit.
- Read the shared upstream `GREENFIELD.md` template and both PRs' project `CLAUDE.md` indexes. The PR `CLAUDE.md` files include branch-, stack-, and application-specific rules; this checkout adopts only applicable discipline in its own root `CLAUDE.md`.
- Inspected the extraction/photoreal modules and branch-specific athletic extractors. PR #1 uses `athletic-reference-extractor.ts`; PR #8 also has `athletic-rebuilt-extractor.ts`.

### Locally executed in each PR worktree

```text
npm ci
npm run typecheck
npm test -- --run       # 47 tests across 7 files
npm run build
npm run dump-cycle -- /tmp/review-pr1 16 all-personas red  # PR #1
npm run dump-cycle -- /tmp/review-pr8 16 all-personas red  # PR #8
```

Typecheck, all 47 tests, and production build passed on both pinned heads. Both 16-frame, five-persona audits reported zero detached islands, zero magenta-spill pixels, and zero uncovered-joint frames. The five-persona contact sheets were visually inspected for both branches; the athletic joint-crop sheet was also inspected for each. The cycles are readable at contact-sheet scale, but magnified crops still show visible cutout/texture discontinuities and overlaps at joints. The structural counters therefore are not adequate as the only release gate.

`gh pr checks 1` and `gh pr checks 8` both reported **no checks reported**. That is not evidence of a failing CI run; it means GitHub did not report checks for those branch tips at review time.

The package manifests and lockfiles are identical across the two refs. `npm audit` reported six findings in the development-tool dependency tree (3 moderate, 1 high, 2 critical), including the pinned Vitest 2.1.9 toolchain. No dependency remediation was attempted in these review worktrees; this should be addressed if either implementation is selected for production.

### Visually inspected versus inferred

I personally viewed the supplied JPEG, all five persona contact sheets in each branch, and the athletic joint-crop sheets in both branches. The numeric gait and matte results below come from the generated JSON audit reports. Branch FDS claims are marked as such; they are not promoted to independent measurements unless rerun here.

## PR #1 — strengths and concerns

### Strengths

- Stronger, more complete learning record: prompt histories, accepted/rejected image candidates, implementation changes, and a detailed failure catalog.
- Combines a quantitative diagnosis of the supplied sheet with alternative procedural and photographic approaches; develops a 17-part rig, articulated neck, rolling foot, persona-specific tuning, standing-profile comparison, and SVG exploration.
- FDS v5.1.0 incorporates the PR #8 rebuild audit and later five-persona audit rather than treating successful compilation as proof of asset quality.
- The newer athletic source/extraction path and documented vertical neck extraction improve on specific PR #8 rebuild problems.
- The branch emphasizes prompt provenance, visual checks after generation/extraction, and 16-phase cycle diagnostics—good practices to retain.

### Concerns

- Scope is very large (758 changed paths) and combines product/UI, analysis, extraction, rigging, vectorization, and audit infrastructure. A new baseline should choose the minimum pilot rather than inherit this architecture wholesale.
- Photographic quality remains a system-level risk. Magnified crops show that opaque pivots and zero disconnected islands do not guarantee seamless skin, fabric, shoes, or joints.
- The audit needs more precise contact semantics: a lowest-foot-pixel value can be produced by either foot and does not identify the intended support sole.
- Thousands of semi-transparent samples are reported as expected antialiasing, but the metric is not a visually calibrated halo detector.
- The PR `CLAUDE.md` hard-codes PR branch names, a React/Vite/TypeScript application stack, specific scripts, and an all-branches parity obligation. Those are not appropriate bindings for this sparse intake baseline; keep the engineering discipline, not those bindings.

## PR #8 — strengths and concerns

### Strengths

- Useful focused experiment in regenerating/rebuilding an athletic persona and auditing five personas rather than a single happy path.
- Its FDS documents concrete source defects and rejected/replaced experiments, including camera twist, a diagonal neck/strap gap, pelvis stripe/skin remnants, and overlapping shoe candidates.
- Provides comparative evidence that local tests and automated geometry checks can coexist with remaining photographic defects.

### Concerns

- The athletic rebuild has documented regressions: a diagonal/strap-gap neck cut, pelvis stripe/skin remnants, and up to +6 px support-foot penetration. PR #1's later implementation reports a smaller worst positive athletic ground delta, though its shared lowest-foot metric still deserves replacement with a support-foot-specific measurement.
- A dedicated rebuilt-athletic extractor increases the risk of persona-specific code paths and hidden source-coordinate assumptions unless its behavior is represented by explicit, versioned data.
- Its zero-island/zero-spill/covered-joint audit does not certify perceptual joint and texture continuity; visual gates must be independent of the structural counters.

## Rerun audit metrics

These are the report outputs from the two local `dump-cycle` runs. `Ground Δ (all)` includes both support and airborne frames; negative airborne values are expected. `Ground Δ (phase label contains Contact)` is a secondary filter of the report's lowest-foot metric, not an independent support-sole measurement. Use it for comparison only, not as proof that the intended stance foot is grounded.

| Branch | Persona | Ground Δ (all frames) | Ground Δ (phase label contains `Contact`) | Semi-transparent-fringe samples |
|---|---|---:|---:|---:|
| PR #1 | Athletic | `-9..+2 px` | `-5..+2 px` | 3,652 |
| PR #1 | Average | `-10..+1 px` | `-6..+1 px` | 3,713 |
| PR #1 | Petite | `-9..0 px` | `-6..0 px` | 3,787 |
| PR #8 | Athletic | `-8..+6 px` | `-4..+6 px` | 3,746 |
| PR #8 | Average | `-10..+1 px` | `-6..+1 px` | 3,697 |
| PR #8 | Petite | `-9..0 px` | `-6..0 px` | 3,826 |

Across both branches, all audited photographic personas reported zero detached islands, magenta-spill pixels, and uncovered-joint frames. The 3,652–3,826 fringe samples per 16 frames are retained as a baseline signal; PR #1's FDS explicitly cautions that these samples may be normal antialiasing. The visual crop review—not a threshold on this count—found remaining quality concerns.

## Recommended disposition

1. **Keep both reviewed worktrees unchanged and separate.** Their exact commits and documented experiments remain valuable references.
2. **Use PR #1 as the stronger source for failure analysis and workflow discipline**, and PR #8 as a record of focused rebuild risks. Do not merge one into the other or into the baseline merely because both build.
3. **Adopt the applicable process:** immutable source provenance, exact prompt logging, persona-specific source calibration, real-asset tests, dense cycle audits, and human review of magnified seams.
4. **Redesign the contact audit:** encode the expected support-foot ID and sole landmark per phase, and report stance error separately from flight clearance.
5. **Select an authoring mode and target output before coding.** Compare full-body captured frames, an articulated 2D/2.5D rig, and a 3D-to-sprite route on a small, one-persona pilot before scaling to more personas.

The review deliberately leaves the current baseline implementation untouched beyond documentation and the adopted discipline files.

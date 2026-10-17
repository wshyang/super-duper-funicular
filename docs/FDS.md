# FDS — evidence and continuous learning register

Functional design lives in [ADDENDA.md](ADDENDA.md) and the domain design documents;
this register links evidence and decisions without replacing those contracts.
Proposed fixes/status: [RIG-QUALITY-PLAN.md](RIG-QUALITY-PLAN.md).
Prompt provenance: [PHOTO-PROMPTS.md](PHOTO-PROMPTS.md).
Branch reviews: [BRANCH-COMPARISON.md](BRANCH-COMPARISON.md).

## L001 · 2026-10-18 · Investigation, cross-branch synthesis and resumed delivery

**Evidence.** Current baseline `d0e12b5`. Stride Lab
`b227e2fe562be341f15f58955f539d325170729e`, detached at `/tmp/stride-lab`;
latest refreshed Sprite Motion Lab `ea3c37c6a8b946cf38e136cc183aa84edb012373`,
detached at `/tmp/sprite-lab-ea3c37c` (commit time 2026-10-17 22:08:51 UTC).
Read their end-cut masks, FDS, validation records and latest audit/rectification
changes. Neither reference implementation was executed locally this turn.

**Observations.** Stride Lab's bone-local radial/transverse mask blends corners
inside the joint plane into the shaft. Sprite Motion Lab now uses internal shaft
blending too, and adds interactive joint/audit export tooling. These are better
inspection and local-cut primitives than a global plate half-plane ellipse.
They do not guarantee seamless joints or recover missing texture.

**Applied.** Created the investigative plan first. Ported the mask into
`src/lib/photo/end-cap.ts` with optional spec/extractor support. Observed the test
suite fail on the missing module, then pass 15 tests. Trial reduced-alpha counts:
shoulder 0, forearm 50, shin 178, toe 33. Radius/axis measurements were made from
real extracted regions, not copied from reference rig units.

**Rejected/deferred.** The 3× plate-space knee crop shows a crescent background
gap. It is not app-fidelity (solver translations omitted), so it neither proves
that the mask introduced the gap nor proves an improvement. Removed default mask
activation and regenerated the baseline. Keep the tested port opt-in. Balls are
sealed after caps and may overwrite their reductions; far extraction needs parity.
Do not claim P-1 complete. Canonical capsule/ankle texture reconstruction and the
interactive audit UI remain deferred, not silently imported into a different rig.

**Strengths preserved here.** Coherent near-side source photography (with one
registered torso replacement), class-matte purge/refill, separately shot medial
far textures, measured width gates, runtime arbitrary-phase composition, rolling
hindfoot/forefoot and additive vector personas. Silhouette trace IoU measures
mask fidelity, not photographic realism. The references are ahead on independent
hands/pelvis/hair, browser inspection/export, and pure colour-band SVG output.

**Validation.** `npm run photo:extract` regenerated baseline near/far assets;
`npm run validate` passed typecheck, 177 tests / 13 files and production build.
No browser E2E, Docker test or reference-branch gates run. No images generated.
Standing per-turn learning/provenance rules added to `CLAUDE.md`.

**Next.** App-fidelity 16-phase before/after joint crops; inspect mask/ball order,
far parity and pivot coverage before enabling caps. Then address asset readiness
with a real failure-path test. Rounded-end requirement remains PARTIAL; male
photo, hand/pelvis/hair decomposition and texture seams remain open. Commit this
bounded change and open a PR on the session branch, naming the visual limitation.

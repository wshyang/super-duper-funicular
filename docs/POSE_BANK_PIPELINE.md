# New-Character Pose-Bank Pipeline

The pose bank turns one accepted full-body profile master into a repeatable, reviewable prompt-and-candidate workflow. It does **not** automate image-generation service calls or auto-accept candidates: each generated image remains an independently conditioned candidate that must be visually reviewed and logged before any crop is harvested.

## Stages

1. **Lock the identity master.** Select one accepted full-body side-profile image. Keep it immutable; compute and store its SHA-256. Describe identity and wardrobe separately in a profile JSON.
2. **Render pose-only guides.** `npm run render-pose-guides -- <guide-dir>` writes eight 1408 × 768 solver-based skeleton guides and a guide manifest. Blue denotes camera-near limbs, orange denotes camera-far limbs, dark denotes the head/torso centerline, and the dashed line is the ground. Optional `--rig-json=<path>` and `--gait-json=<path>` override the generic rig/gait values for a new character. The guide controls joints, never identity.
3. **Scaffold prompt and tracking files.** `npm run pose-bank:init -- <profile.json>` writes H01–H08 prompt text and a nine-frame `pose-bank.json`. H00 is the neutral identity master; it is not regenerated. The command refuses to overwrite an existing manifest unless `--force` is explicitly supplied. Review all generated prompt text before calling the image service.
4. **Generate one candidate per call.** Supply image 1 (the master) and image 2 (the phase guide). Log the exact submitted prompt, reference hashes, output path/hash, and settings in `docs/POSE_HARVEST_LOG.md`. Do not chain generated frames as identity references.
5. **Review and record.** Inspect every image individually. Mark the frame `accepted`, `conditional`, `rejected`, or `needs-regeneration`; record the concrete reason. `visibility` stores per-part values (`0` hidden, `1` occluded/cropped, `2` full segment/endpoints but touching, `3` isolated with readable pivots). A conditional or rejected frame is not eligible for source selection.
6. **Harvest only after acceptance.** `selectManifestHarvestFrame` filters to manifest frames with status `accepted` before applying `selectBestHarvestFrame`; conditional/rejected/needs-regeneration frames cannot be selected. Each `canonicalJigSource` records the source frame, candidate path/hash, anatomical side, pivot and cleanup notes. Use per-frame `poseInstances` for transforms/z-order; add a `poseVariant` only for a genuine pose-dependent shape change and retain source hash, shared pivot, scale, palette, and reason. Check phase-switch flicker before shipping.

## Profile JSON

```json
{
  "characterId": "new-runner-id",
  "masterImagePath": "src/images/new-runner/01-master-profile.png",
  "identityLock": "adult character identity, face, skin/fur tone, proportions and hair",
  "wardrobeLock": "exact outfit, accessories and footwear from the master",
  "outputDirectory": "src/images/new-runner-pose-bank",
  "guideDirectory": "src/images/new-runner-pose-bank/guides/skeleton",
  "promptDirectory": "src/images/new-runner-pose-bank/prompts"
}
```

For a materially different body, create a JSON rig override from `AnatomicalRigSpec` and optionally a `GaitConfig` override. The default guide uses the repository runner rig; it is a pose proposal, not proof that the new character proportions or the generated phase are correct.

## Pilot result (Athletic runner)

The initial pilot is recorded in `docs/POSE_HARVEST_LOG.md` and `src/images/photoreal-female-pose-bank/pose-bank.json`. H01, H02, H04, H05, and H08 have usable full-body pose coverage with crop/near-far limitations; H03, H06, and H07 are rejected and remain marked for regeneration. No production cutouts were extracted and no accepted reference assets were overwritten.

Observed prompt lessons:

- Small 220 × 256 photoreal rig renders were not a dependable pose constraint. They produced several generic contact/sprint poses, and generated images often failed to distinguish the opposite support half-cycle.
- The first upscaled photoreal H03 guide showed neck/edge artifacts and was replaced with a clean high-resolution colored-joint diagram. That guide made joints explicit but still did not prevent a high-knee sprint deviation. Treat pose-guide conditioning as a cue, not a guarantee; hard-reject wrong phase/support state.
- “No shadow / uniform magenta” remained imperfect: contact frames can contain lower-background variation or a soft shoe shadow even when forbidden. Preserve candidate images, validate background/key masks separately, and do not label footwear crops extraction-ready based on a full-body visual pass.
- Identity, outfit, right-facing camera and framing were comparatively stable when every phase referenced the same master. Near/far identity still requires explicit cross-frame verification; do not infer it from a similar silhouette.

The pilot is incomplete. Regenerate H03/H06/H07 with a stronger pose-conditioning approach or targeted inserts before extraction; then review the full nine-frame bank, score every part/frame pair, run the small crop/temporary-rig gate, and only then consider production integration.
## Targeted insert pilot and added review gate

Follow-up insert attempts `#83`–`#88` are recorded with verbatim prompts, reference/candidate hashes, and individual visual outcomes in `docs/POSE_HARVEST_LOG.md`. X01/#83 and X02/#84 generated visibly opposite forward/rear arm arrangements, but X02/#84 changed one wristband to dark/black and is rejected as a costume/crop source. Refinement X02/#87 restored both sky-blue wristbands, but the rear hand touches the hip/shorts instead of clearing the silhouette; retain as pose-only evidence, not a crop source. Exact camera-near/far chirality and chroma-key edges remain unverified. The first X04 leg-angle prompt (#85) collapsed into the same elongated airborne sprint as earlier images and was rejected as non-diverse. A stronger joint-angle refinement (#86) produced a clearly different high-knee/trailing-leg silhouette, but did not match the requested deep rear-knee tuck and retained a soft shadow; keep it for pose-diversity review only, not exact-angle or crop use. The accepted outfit was retained rather than generating an unclothed subject: exposed limbs already provide skin contours, and wardrobe continuity is required for production harvest.

**New learning:** Compare every insert against the closest existing candidate before acceptance. Prompt wording can request opposite angles without producing genuinely different joint geometry; when a candidate repeats a familiar stride, reject it and change the pose guide itself rather than adding more adjectives. Call #88 used a custom 1408 × 768 solved-joint diagram built from the H04 torso/arm pose plus explicit leg-joint overrides; it yielded a distinct raised-knee/folded-trailing-leg silhouette. This is stronger evidence of angle diversity, but near/far limb identity and lower-background key quality remain unverified, so it is not crop-approved. Use a distinct solved-joint guide that encodes target angles, then independently verify limb order, identity, silhouette gaps, full framing, and background/key quality. These inserts are not canonical gait phases and do not alter the H00–H08 status manifest. No crops or production assets were approved.


### Far-arm angle-diversity insert test (Calls #89–#90)

Review of H01–H08 confirmed that the camera-far arms tend to repeat a close-to-torso angle and expose little of the forearm. Two custom guides held the H02 body, legs and near arm fixed while assigning the far forearm distinct forward/up (`−41.4°`) and rear/down (`149.5°`) screen-space angles. Call #89 made a full raised forearm, cuff and hand visible beyond the front torso contour, though its palm opened and the other hand met the shorts. Call #90 exposed the rear/down forearm, cuff and hand with a clear gap behind the hip, improving on the older X02 rear-hand/hip overlap. Both maintained recognizable identity, outfit and right-facing framing. Their shadows/background variation disqualify them as clean crop/key sources; far-side chirality remains unverified from pixels. Exact prompts, guide/candidate hashes and full outcomes are in `docs/POSE_HARVEST_LOG.md`.

**Pipeline learning:** When forearm harvest diversity matters, do not score both arms as one aggregate `arms` visibility value. Include camera-far elbow and wrist positions in the guide, plan more than one angle range across source poses, and require a visible background gap around the forearm/cuff/hand. Keep side identity, anatomy, costume and background-key review as independent gates. Targeted inserts stay outside the canonical H00–H08 manifest until they pass all gates; these two did not pass the crop/key gate.

## Acceptance criteria, automated audit and the delta-edit loop (Calls #91–#95)

`docs/POSE_BANK_ACCEPTANCE.md` now defines **done** for a pose bank: measurable gates for key recoverability (G3), per-phase foot/ground landmarks (G4) and silhouette diversity (G6), plus visual gates for identity (G1), scale (G2) and guide fidelity / near-far order (G5). `python3 scripts/audit_pose_bank.py [--json out] [--normalize dir] [paths…]` computes every automated gate (modal-key extraction, border-connected key-family background with a 2 px erode/redilate leak guard, shoe-cluster contact-width analysis, pairwise IoU) and `--normalize` emits flat-key extraction plates; it was calibrated to reproduce the human verdicts of Calls #73–#90 before being used on new candidates.

The regeneration loop that finally converged (see `docs/POSE_HARVEST_LOG.md` Calls #91–#95):

1. **Base = nearest reviewed photo candidate, not the master + diagram.** Request 2–3 named joint corrections ("fold the shin back below the knee", "raise the heel to toe-only contact") and keep the solved-joint diagram as image 2 for angles only. This escaped the generic-sprint attractor that defeated every from-scratch H03/H06/H07 attempt.
2. **Audit before judgement.** Run the script on each candidate; the recurring failure it catches deterministically is the *ghosted airborne shoe* (magenta-spill island, 2.4–2.8 k px in #91/#93).
3. **Repaint-only follow-up delta** for spill/solidity defects ("repaint that shoe solid white… do not move any limb") — worked on the first try in both #92 and #94.
4. **Derive counterpart phases.** H07 was produced from the accepted H03 plate by swapping only the visible half-cycle cues (arm counter-swing, near-leg occlusion order), preserving the compact leg geometry; IoU 0.893 vs H03 is under the 0.90 duplicate cap and expected for pass-phase mirrors.
5. **Shadows are recoverable, not fatal.** Key-family shadow/gradient pixels (7–13 k px per candidate) flatten to ≤ 53 px of edge halo in `normalized/`; the old "any soft shadow ⇒ conditional forever" rule is retired.

Result: H01–H08 all hold `accepted-for-pose` (every automated gate passing; caveats recorded per frame in `pose-bank.json`). Crop/per-part approval remains a separate stage-6 gate, and near/far chirality still cannot be proven from pixels alone.

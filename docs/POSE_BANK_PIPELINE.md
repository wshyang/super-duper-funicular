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

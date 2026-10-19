# Reference: Guide Generator Usage

## Standard 8-phase guides

```bash
npm run render-pose-guides -- <guide-dir>
# e.g.
npm run render-pose-guides -- src/images/photoreal-female-pose-bank/guides/skeleton
# with overrides
npm run render-pose-guides -- src/images/photoreal-female-pose-bank/guides/skeleton --rig-json=./rig-override.json --gait-json=./gait-override.json
```

Writes `H01-pose-guide.png` … `H08-pose-guide.png` (1408×768) + `manifest.json`.

Source: `scripts/render-pose-guides.ts` → `renderPoseGuideRaster(pose, rig)` where `pose = solveArticulatedPose(φ, gait, rig)`.

## Custom compact + insert guides (V2)

```bash
npx tsx scripts/create-compact-guides.ts
```

Creates:
- `H03-v2-compact-toeoff-guide.png` (φ=0.25, stride 0.62, kneeDrive 0.68, forwardLean 18°, bounce 0.5)
- `H06-v2-left-down-guide.png` (φ=0.625, stride 0.75, kneeDrive 0.85)
- `H07-v2-compact-toeoff-guide.png` (φ=0.75, same as H03-v2 opposite side)
- `X07-far-forearm-low-forward-guide.png` (H02 body + far arm upper −10°, lower +20°)

Manifest: `src/images/photoreal-female-pose-bank/guides/skeleton/custom-guides-manifest.json` with rig/gait overrides.

### How it works

See `scripts/create-compact-guides.ts` / `src/pipeline/background-validator.ts` source for the compact logic:

- Overrides `GaitConfig`: `strideLengthScale`, `kneeDriveScale`, `forwardLeanDeg`, `bounceAmplitudeScale` to shrink sprint split from ~400 px to 220–280 px
- For X07, manually projects `farArm` from `poseH02.farArm.hipOrShoulder` with `upperAngle = -10°`, `lowerAngle = +20°` using `projectPoint`, then re-renders via `renderPoseGuideRaster`

### When to change guide geometry vs adjectives

Per `POSE_VARIATION_FLAW_ANALYSIS.md` F-01: **When output repeats familiar stride, reject and change guide itself** — adding adjectives (“more compact”, “very tucked”) does not break sprint prior. V2 #88 changed guide from elongated sprint to opposed shins and succeeded where #85/#86 prompt-only retries failed.

### Validation

```bash
npx tsx scripts/validate-candidates.ts --dir src/images/photoreal-female-pose-bank/candidates
npm run harvest-phases -- /tmp/v2-audit
npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red
```

Check `read_file` on `joint-crops-sheet.png` at 2× for seam, gap, wristband color.


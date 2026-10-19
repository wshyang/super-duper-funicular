import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import { solveArticulatedPose } from '../src/runner/gait.js';
import { writePngFile } from '../src/pipeline/image-io.js';
import { renderPoseGuideRaster } from '../src/pipeline/pose-guide-renderer.js';

/**
 * Create an improved H03 compact toe-off guide that explicitly counters sprint bias.
 * We reduce stride extension and lower the forward knee compared to default phase 0.25.
 */
const outPath = 'src/images/photoreal-female-pose-bank/guides/skeleton/H03-v2-compact-toeoff-guide.png';
const compactGait = {
  ...DEFAULT_GAIT_CONFIG,
  strideLengthScale: 0.62,
  kneeDriveScale: 0.68,
  armSwingScale: 0.85,
  forwardLeanDeg: 18,
  bounceAmplitudeScale: 0.5,
};

const pose = solveArticulatedPose(0.25, compactGait, DEFAULT_RIG_SPEC);
console.log('Pose H03-v2', pose.phaseName, 'pelvis', pose.pelvis, 'nearLeg', pose.nearLeg, 'farLeg', pose.farLeg);

const raster = renderPoseGuideRaster(pose, DEFAULT_RIG_SPEC, {
  width: 1408,
  height: 768,
  // background default 239,242,247 is fine; magenta is NOT in guide (guide is diagram only)
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
writePngFile(outPath, raster);
console.log(`Wrote ${outPath} (${raster.width}x${raster.height})`);

// Also create H06-v2 (left down) with deeper cushion - more distinct from H01
const outPathH06 = 'src/images/photoreal-female-pose-bank/guides/skeleton/H06-v2-left-down-guide.png';
const deeperGait = {
  ...DEFAULT_GAIT_CONFIG,
  strideLengthScale: 0.75,
  kneeDriveScale: 0.85,
  forwardLeanDeg: 20,
  bounceAmplitudeScale: 0.65,
};
const poseH06 = solveArticulatedPose(0.625, deeperGait, DEFAULT_RIG_SPEC);
const rasterH06 = renderPoseGuideRaster(poseH06, DEFAULT_RIG_SPEC, { width: 1408, height: 768 });
writePngFile(outPathH06, rasterH06);
console.log(`Wrote ${outPathH06}`);

// Also create H07-v2 (left pass) same compact logic as H03 but opposite side
const outPathH07 = 'src/images/photoreal-female-pose-bank/guides/skeleton/H07-v2-compact-toeoff-guide.png';
const poseH07 = solveArticulatedPose(0.75, compactGait, DEFAULT_RIG_SPEC);
const rasterH07 = renderPoseGuideRaster(poseH07, DEFAULT_RIG_SPEC, { width: 1408, height: 768 });
writePngFile(outPathH07, rasterH07);
console.log(`Wrote ${outPathH07}`);

// Also create X07 new low-forward far forearm guide based on X05 but more distinct
// We will manually tweak far arm to be low-forward 20° as in phase-11
// For now, generate a custom X07 using H02 body with far arm at +20° low-forward
import { createRaster, fillRaster, writePixel } from '../src/pipeline/raster.js';
type Point2D = { x: number; y: number };
type RgbaColor = { r: number; g: number; b: number; a: number };

const COLORS = {
  background: { r: 239, g: 242, b: 247, a: 255 },
  torso: { r: 34, g: 47, b: 67, a: 255 },
  near: { r: 0, g: 143, b: 224, a: 255 },
  far: { r: 239, g: 119, b: 36, a: 255 },
  hair: { r: 38, g: 46, b: 60, a: 255 },
  ground: { r: 115, g: 126, b: 145, a: 255 },
};

// Build X07: start from H02 pose and override far arm to low-forward +20°
const poseH02 = solveArticulatedPose(0.125, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
console.log('H02 pose for X07 base', poseH02.farArm);

// Override farArm: create a low-forward angle manually
// Shoulder at poseH02.farArm.hipOrShoulder, we want upper arm slightly forward ~ -15°, forearm low-forward +20° from horizontal
function projectPoint(pt: Point2D, angleRad: number, len: number): Point2D {
  return { x: pt.x + Math.cos(angleRad) * len, y: pt.y + Math.sin(angleRad) * len };
}
const shoulder = poseH02.farArm.hipOrShoulder;
// -15° from horizontal (slightly up), in rig coordinates where -PI/2 is up? Actually 0 is right, PI/2 is down in screen.
// For screen, 0 = right, PI/2 = down, -PI/2 = up
// We want upper arm angled forward/right ~ -10° (slightly up) and forearm +20° (slightly down) to get low-forward
const upperAngle = (-10 * Math.PI) / 180; // -10 deg
const lowerAngle = (20 * Math.PI) / 180; // +20 deg
const upperLen = DEFAULT_RIG_SPEC.upperArmLength;
const lowerLen = DEFAULT_RIG_SPEC.forearmLength;
const midJoint = projectPoint(shoulder, upperAngle, upperLen);
const wrist = projectPoint(midJoint, lowerAngle, lowerLen);
const tip = projectPoint(wrist, lowerAngle, 6);

const customFarArm = {
  hipOrShoulder: shoulder,
  midJoint,
  endEffector: wrist,
  heelPoint: wrist,
  ballPoint: tip,
  tipPoint: tip,
  upperAngleRad: upperAngle,
  lowerAngleRad: lowerAngle,
  distalAngleRad: lowerAngle,
  toeAngleRad: lowerAngle,
  heelLiftPx: 0,
  contactPhase: 'flight-reach' as const,
  isGrounded: false,
};

const poseX07 = {
  ...poseH02,
  phaseName: 'X07 Far Forearm Low-Forward' as any,
  farArm: customFarArm as any,
};

const rasterX07 = renderPoseGuideRaster(poseX07 as any, DEFAULT_RIG_SPEC, { width: 1408, height: 768 });
const outPathX07 = 'src/images/photoreal-female-pose-bank/guides/skeleton/inserts/X07-far-forearm-low-forward-guide.png';
fs.mkdirSync(path.dirname(outPathX07), { recursive: true });
writePngFile(outPathX07, rasterX07);
console.log(`Wrote ${outPathX07}`);

// Write manifest for new guides
const manifestPath = 'src/images/photoreal-female-pose-bank/guides/skeleton/custom-guides-manifest.json';
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      description: 'Improved v2 compact toe-off guides to counter sprint bias (F-01) and new X07 low-forward forearm',
      guides: [
        { id: 'H03-v2', path: outPath, phase: 0.25, overrides: compactGait },
        { id: 'H06-v2', path: outPathH06, phase: 0.625, overrides: deeperGait },
        { id: 'H07-v2', path: outPathH07, phase: 0.75, overrides: compactGait },
        { id: 'X07', path: outPathX07, phase: 0.125, note: 'H02 body with far arm +20° low-forward' },
      ],
    },
    null,
    2,
  ),
);
console.log(`Wrote manifest ${manifestPath}`);

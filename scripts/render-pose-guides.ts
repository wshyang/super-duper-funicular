import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import { solveArticulatedPose } from '../src/runner/gait.js';
import { writePngFile } from '../src/pipeline/image-io.js';
import {
  computeLockedGuideBounds,
  renderPoseGuideRaster,
  renderPoseGuideRasterWithLockedBounds,
} from '../src/pipeline/pose-guide-renderer.js';

const PHASES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] as const;
const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith('--'));
const outDir = path.resolve(positional[0] ?? 'src/images/photoreal-female-pose-bank/guides/skeleton');
const rigJsonPath = args.find((arg) => arg.startsWith('--rig-json='))?.slice('--rig-json='.length);
const gaitJsonPath = args.find((arg) => arg.startsWith('--gait-json='))?.slice('--gait-json='.length);
const useLocked = args.includes('--locked');
const rigOverrides = rigJsonPath
  ? (JSON.parse(fs.readFileSync(path.resolve(rigJsonPath), 'utf8')) as Partial<typeof DEFAULT_RIG_SPEC>)
  : {};
const gaitOverrides = gaitJsonPath
  ? (JSON.parse(fs.readFileSync(path.resolve(gaitJsonPath), 'utf8')) as Partial<typeof DEFAULT_GAIT_CONFIG>)
  : {};
const rig = { ...DEFAULT_RIG_SPEC, ...rigOverrides };
const gait = { ...DEFAULT_GAIT_CONFIG, ...gaitOverrides };
fs.mkdirSync(outDir, { recursive: true });

let lockedBounds: ReturnType<typeof computeLockedGuideBounds> | null = null;
if (useLocked) {
  const allPoses = PHASES.map((phase) => solveArticulatedPose(phase, gait, rig));
  lockedBounds = computeLockedGuideBounds(allPoses, rig);
  console.log(
    `[render-pose-guides] locked scale=${lockedBounds.scale.toFixed(3)} bounds ${lockedBounds.minX.toFixed(1)}..${lockedBounds.maxX.toFixed(1)} x ${lockedBounds.minY.toFixed(1)}..${lockedBounds.maxY.toFixed(1)}`,
  );
}

const records = PHASES.map((phase, index) => {
  const pose = solveArticulatedPose(phase, gait, rig);
  const fileName = `H${String(index + 1).padStart(2, '0')}-pose-guide.png`;
  const filePath = path.join(outDir, fileName);
  const raster = lockedBounds
    ? renderPoseGuideRasterWithLockedBounds(pose, rig, lockedBounds)
    : renderPoseGuideRaster(pose, rig);
  writePngFile(filePath, raster);
  return { key: `H${String(index + 1).padStart(2, '0')}`, phase, phaseName: pose.phaseName, file: fileName };
});
fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  `${JSON.stringify({ rig, gait, generatedAt: new Date().toISOString(), locked: !!lockedBounds, lockedBounds, records }, null, 2)}\n`,
  'utf8',
);
console.log(
  `[render-pose-guides] Wrote ${records.length} high-resolution pose guides to ${outDir}${useLocked ? ' (locked-scale)' : ''}`,
);

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import { solveArticulatedPose } from '../src/runner/gait.js';
import { writePngFile } from '../src/pipeline/image-io.js';
import { renderPoseGuideRaster } from '../src/pipeline/pose-guide-renderer.js';

const PHASES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875] as const;
const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith('--'));
const outDir = path.resolve(positional[0] ?? 'src/images/photoreal-female-pose-bank/guides/skeleton');
const rigJsonPath = args.find((arg) => arg.startsWith('--rig-json='))?.slice('--rig-json='.length);
const gaitJsonPath = args.find((arg) => arg.startsWith('--gait-json='))?.slice('--gait-json='.length);
const rigOverrides = rigJsonPath
  ? JSON.parse(fs.readFileSync(path.resolve(rigJsonPath), 'utf8')) as Partial<typeof DEFAULT_RIG_SPEC>
  : {};
const gaitOverrides = gaitJsonPath
  ? JSON.parse(fs.readFileSync(path.resolve(gaitJsonPath), 'utf8')) as Partial<typeof DEFAULT_GAIT_CONFIG>
  : {};
const rig = { ...DEFAULT_RIG_SPEC, ...rigOverrides };
const gait = { ...DEFAULT_GAIT_CONFIG, ...gaitOverrides };
fs.mkdirSync(outDir, { recursive: true });
const records = PHASES.map((phase, index) => {
  const pose = solveArticulatedPose(phase, gait, rig);
  const fileName = `H${String(index + 1).padStart(2, '0')}-pose-guide.png`;
  const filePath = path.join(outDir, fileName);
  writePngFile(filePath, renderPoseGuideRaster(pose, rig));
  return { key: `H${String(index + 1).padStart(2, '0')}`, phase, phaseName: pose.phaseName, file: fileName };
});
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify({ rig, gait, generatedAt: new Date().toISOString(), records }, null, 2)}\n`, 'utf8');
console.log(`[render-pose-guides] Wrote ${records.length} high-resolution pose guides to ${outDir}`);

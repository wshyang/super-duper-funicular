import fs from 'node:fs';
import path from 'node:path';
import { PHOTOREAL_ASSET_TUNING_DEFAULTS, applyAssetTuningToRigSpec, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import { renderMaterialDemo } from '../src/pipeline/pose-material-demo.js';
import type { PoseMaterialBank } from '../src/pipeline/pose-material-types.js';

function main(): void {
  const repoRoot = process.cwd();
  const outDir = process.argv[2] ?? path.join('/tmp', 'pose-material-demo');
  const bank = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'src/images/pose-material/bank.json'), 'utf8'),
  ) as PoseMaterialBank;
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
  const report = renderMaterialDemo({
    repoRoot,
    bank,
    rig: applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning),
    tuning,
    personaId: 'photo-sg-chinese-female',
    variant: 'red',
    frameCount: 16,
    outDir,
  });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'material-demo-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `Rendered ${report.framesRendered} frames -> ${report.contactSheetPath}\n` +
      `Material applied per part: ${JSON.stringify(report.covered)}\n` +
      `Uncovered selections (gaps): ${report.gaps.length}\n` +
      `Detached islands: ${report.detachedIslands} | material-induced ground delta ${report.groundDeltaMaxPx}px` +
      ` | stance sole spread ${report.stanceSoleSpreadPx}px (rig foot roll)\n` +
      `Mean pairwise silhouette IoU: ${report.meanPairIou.toFixed(3)} | max: ${report.maxPairIou.toFixed(3)} | half-cycle: ${report.halfCycleIou.toFixed(3)}\n`,
  );
}

main();

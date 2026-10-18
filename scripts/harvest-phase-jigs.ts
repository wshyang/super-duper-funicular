import path from 'node:path';
import { harvestArticulatedJigsFromPhaseFrames } from '../src/pipeline/phase-frame-harvester.js';

function main(): void {
  const repoRoot = process.cwd();
  const outDir = process.argv[2] ?? path.join('/tmp', 'phase-harvest-audit');
  const { report } = harvestArticulatedJigsFromPhaseFrames(repoRoot, outDir);
  process.stdout.write(
    `Harvested ${report.partsHarvestedCount} canonical jigs + ${report.variantsHarvestedCount} phase-variant copies from ${report.complianceLedger.length} phase frames into ${outDir}\n` +
      `Reference height: ${report.referenceHeightPx}px | Avg core coverage: ${report.averageCoreCoverageRatio} | Avg chroma separation: ${report.averageChromaSeparationRatio}\n`,
  );
}

main();

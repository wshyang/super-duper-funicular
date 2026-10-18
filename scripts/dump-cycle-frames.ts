import os from 'node:os';
import path from 'node:path';
import type { RunnerPersonaId, RunnerVariantId } from '../src/shared/types.js';
import { dumpFullGaitCycleToTempDir } from '../src/pipeline/cycle-frame-dumper.js';

export function runDumpCycleCli(argv: readonly string[]): void {
  const outDir = argv[2] ?? path.join(os.tmpdir(), 'gait-cycle-audit');
  const frameCount = argv[3] ? Math.max(4, Number.parseInt(argv[3], 10)) : 16;
  const personaId = (argv[4] as RunnerPersonaId | undefined) ?? 'photo-sg-chinese-female';
  const variant = (argv[5] as RunnerVariantId | undefined) ?? 'red';
  const report = dumpFullGaitCycleToTempDir({
    outDir,
    frameCount,
    personaId,
    variant,
  });
  console.log(
    `[dump-cycle] Dumped ${report.frameCount} cycle frames (${report.personaId}/${report.variant}) to ${report.outDir}`,
  );
  console.log(
    `[dump-cycle] Contact sheet: ${report.contactSheetPath} | Joint crops: ${report.jointCropsSheetPath}`,
  );
  console.log(
    `[dump-cycle] Telemetry: detachedIslands=${report.totalDisconnectedIslands}, magentaSpill=${report.totalMagentaSpillPixels}, uncoveredJointFrames=${report.framesWithUncoveredJoints}`,
  );
}

runDumpCycleCli(process.argv);

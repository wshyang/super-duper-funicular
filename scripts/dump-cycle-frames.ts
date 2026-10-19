import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  PhotorealAssetTuningSpec,
  PhotorealPersonaId,
  RunnerPersonaId,
  RunnerVariantId,
} from '../src/shared/types.js';
import {
  type CycleAuditReport,
  dumpFullGaitCycleToTempDir,
} from '../src/pipeline/cycle-frame-dumper.js';

const ALL_PHOTOREAL_PERSONAS: readonly PhotorealPersonaId[] = [
  'photo-sg-chinese-female-petite',
  'photo-sg-chinese-female',
  'photo-sg-chinese-female-average',
];

const ALL_RUNNER_PERSONAS: readonly RunnerPersonaId[] = [
  'sg-chinese-male',
  'sg-chinese-female',
  ...ALL_PHOTOREAL_PERSONAS,
];

function parseTuningOverrides(argv: readonly string[]): Partial<PhotorealAssetTuningSpec> | undefined {
  const overrides: Record<string, unknown> = {};
  const numericFlags: Readonly<Record<string, keyof PhotorealAssetTuningSpec>> = {
    '--head-scale': 'headScale',
    '--torso-length': 'torsoLengthScale',
    '--torso-width': 'torsoWidthPx',
    '--pelvis-length': 'pelvisLengthScale',
    '--pelvis-width': 'pelvisWidthPx',
    '--upper-arm-length': 'upperArmLengthScale',
    '--upper-arm-width': 'upperArmWidthPx',
    '--forearm-length': 'forearmLengthScale',
    '--forearm-width': 'forearmWidthPx',
    '--hand-length': 'handLengthPx',
    '--hand-width': 'handWidthPx',
    '--thigh-length': 'thighLengthScale',
    '--thigh-width': 'thighWidthPx',
    '--shin-length': 'shinLengthScale',
    '--shin-width': 'shinWidthPx',
    '--shoulder-offset-x': 'shoulderOffsetX',
    '--shoulder-offset-y': 'shoulderOffsetY',
    '--hip-offset-y': 'hipOffsetY',
  };
  for (const arg of argv) {
    if (arg.startsWith('--tuning=')) {
      Object.assign(overrides, JSON.parse(arg.slice('--tuning='.length)) as Record<string, unknown>);
      continue;
    }
    const [flag, rawVal] = arg.split('=');
    const key = flag ? numericFlags[flag] : undefined;
    if (key && rawVal !== undefined) {
      const parsed = Number.parseFloat(rawVal);
      if (Number.isFinite(parsed)) {
        overrides[key] = parsed;
      }
    }
  }
  return Object.keys(overrides).length > 0
    ? (overrides as Partial<PhotorealAssetTuningSpec>)
    : undefined;
}

function logSingleReport(report: CycleAuditReport): void {
  console.log(
    `[dump-cycle] Dumped ${report.frameCount} cycle frames (${report.personaId}/${report.variant}) to ${report.outDir}`,
  );
  console.log(
    `[dump-cycle] Contact sheet: ${report.contactSheetPath} | Joint crops: ${report.jointCropsSheetPath} | Standing profile: ${report.standingProfileAuditPath ?? 'n/a'}`,
  );
  console.log(
    `[dump-cycle] Telemetry: detachedIslands=${report.totalDisconnectedIslands}, magentaSpill=${report.totalMagentaSpillPixels}, uncoveredJointFrames=${report.framesWithUncoveredJoints}`,
  );
}

export function runDumpCycleCli(argv: readonly string[]): void {
  const positional = argv.slice(2).filter((a) => !a.startsWith('--'));
  const outDir = positional[0] ?? path.join(os.tmpdir(), 'gait-cycle-audit');
  const frameCount = positional[1] ? Math.max(4, Number.parseInt(positional[1], 10)) : 16;
  const personaArg = positional[2] ?? 'photo-sg-chinese-female';
  const variant = (positional[3] as RunnerVariantId | undefined) ?? 'red';
  const assetTuning = parseTuningOverrides(argv.slice(2));

  if (personaArg === 'all' || personaArg === 'all-photoreal' || personaArg === 'all-personas') {
    fs.mkdirSync(outDir, { recursive: true });
    const personasToDump: readonly RunnerPersonaId[] =
      personaArg === 'all-personas' ? ALL_RUNNER_PERSONAS : ALL_PHOTOREAL_PERSONAS;
    const reports: CycleAuditReport[] = [];
    for (const personaId of personasToDump) {
      const subDir = path.join(outDir, personaId);
      const report = dumpFullGaitCycleToTempDir({
        outDir: subDir,
        frameCount,
        personaId,
        variant,
        assetTuning,
      });
      logSingleReport(report);
      reports.push(report);
    }
    const summaryPath = path.join(outDir, 'multi-persona-audit-summary.json');
    fs.writeFileSync(
      summaryPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)}\n`,
      'utf8',
    );
    console.log(`[dump-cycle] Multi-persona summary written to ${summaryPath}`);
    return;
  }

  const report = dumpFullGaitCycleToTempDir({
    outDir,
    frameCount,
    personaId: personaArg as RunnerPersonaId,
    variant,
    assetTuning,
  });
  logSingleReport(report);
}

runDumpCycleCli(process.argv);

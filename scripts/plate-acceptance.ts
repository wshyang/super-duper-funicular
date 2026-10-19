import fs from 'node:fs';
import path from 'node:path';
import type { RasterImage } from '../src/shared/types.js';
import { readImageFile } from '../src/pipeline/image-io.js';
import {
  buildClassAcceptanceCriteria,
  runPlateAcceptanceGates,
  type PlateAcceptanceCriteria,
  type PlateGateClass,
} from '../src/pipeline/cv-acceptance-gates.js';

interface PlateScanResult {
  readonly plateId: string;
  readonly filePath: string;
  readonly overallPass: boolean;
  readonly failedGateIds: readonly string[];
  readonly gates: Array<{
    readonly gateId: string;
    readonly pass: boolean;
    readonly score: number;
  }>;
}

function main(): void {
  const repoRoot = process.cwd();
  const personaFolder =
    process.argv[2] ?? 'photoreal-female-phases';
  const reportPath =
    process.argv[3] ??
    path.join(repoRoot, 'docs', 'plate-acceptance-report.json');
  const scanResults = runAcceptanceOverPersonaFolder(
    repoRoot,
    personaFolder,
  );
  writeAcceptanceReport(reportPath, personaFolder, scanResults);
  printAcceptanceSummary(personaFolder, scanResults);
}

function runAcceptanceOverPersonaFolder(
  repoRoot: string,
  personaFolder: string,
): PlateScanResult[] {
  const folderPath = path.join(
    repoRoot,
    'src/images',
    personaFolder,
  );
  const masterPlate = loadPersonaReferenceMaster(
    repoRoot,
    personaFolder,
  );
  return fs
    .readdirSync(folderPath)
    .filter((name) => name.endsWith('.png'))
    .sort()
    .map((name) =>
      acceptPlate(
        name,
        path.join(folderPath, name),
        selectCriteriaForPlate(name, masterPlate),
      ),
    );
}

function loadPersonaReferenceMaster(
  repoRoot: string,
  personaFolder: string,
): RasterImage {
  const ownMasterPath = path.join(
    repoRoot,
    'src/images',
    personaFolder,
    '01-master-lateral-profile-reference.png',
  );
  if (fs.existsSync(ownMasterPath)) {
    return readImageFile(ownMasterPath);
  }
  return readImageFile(
    path.join(
      repoRoot,
      'src/images',
      'photoreal-female',
      '01-master-lateral-profile-reference.png',
    ),
  );
}

function selectCriteriaForPlate(
  plateName: string,
  masterPlate: ReturnType<typeof readImageFile>,
): PlateAcceptanceCriteria {
  return buildClassAcceptanceCriteria(
    classifyPlate(plateName),
    masterPlate,
  );
}

function classifyPlate(plateName: string): PlateGateClass {
  if (isPhaseFramePlate(plateName)) {
    return 'phase-frame';
  }
  if (plateName.startsWith('01-master')) {
    return 'master';
  }
  if (plateName.startsWith('02-head')) {
    return 'head';
  }
  if (plateName.startsWith('03-ponytail')) {
    return 'hair';
  }
  if (plateName.startsWith('04-')) {
    return 'neck';
  }
  if (plateName.startsWith('05-')) {
    return 'torso';
  }
  if (plateName.startsWith('06-')) {
    return 'pelvis';
  }
  if (plateName.startsWith('07-') || plateName.startsWith('08-')) {
    return 'arm';
  }
  if (plateName.startsWith('09-') || plateName.startsWith('10-')) {
    return 'leg';
  }
  return 'master';
}

function isPhaseFramePlate(plateName: string): boolean {
  return (
    plateName.startsWith('phase-') ||
    plateName.startsWith('frame-')
  );
}

function acceptPlate(
  name: string,
  filePath: string,
  criteria: PlateAcceptanceCriteria,
): PlateScanResult {
  const plate = readImageFile(filePath);
  const report = runPlateAcceptanceGates(
    name,
    plate,
    criteria,
  );
  return {
    plateId: report.plateId,
    filePath,
    overallPass: report.overallPass,
    failedGateIds: report.failedGateIds,
    gates: report.gates.map((gate) => ({
      gateId: gate.gateId,
      pass: gate.pass,
      score: gate.score,
    })),
  };
}

function writeAcceptanceReport(
  reportPath: string,
  personaFolder: string,
  results: readonly PlateScanResult[],
): void {
  const payload = {
    personaFolder,
    generatedAtIso: new Date().toISOString(),
    acceptedCount: results.filter((r) => r.overallPass).length,
    rejectedCount: results.filter((r) => !r.overallPass).length,
    results,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}

function printAcceptanceSummary(
  personaFolder: string,
  results: readonly PlateScanResult[],
): void {
  const accepted = results.filter((r) => r.overallPass).length;
  process.stdout.write(
    `[${personaFolder}] acceptance: ${accepted}/${results.length} plates passed\n`,
  );
  for (const result of results.filter((r) => !r.overallPass)) {
    process.stdout.write(
      `  REJECTED ${result.plateId}: ${result.failedGateIds.join(', ')}\n`,
    );
  }
}

main();

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Buffer, decodePngBuffer, encodePngFile } from '../src/pipeline/image-io.ts';
import { decomposeMaster } from '../src/pipeline/decomposer.ts';
import { buildContactSheet, buildGoldenManifest } from '../src/pipeline/golden-baker.ts';
import { contractPassed, countStripePixels, evaluatePartContract, type ContractContext, type PartContractCheck } from '../src/pipeline/part-contract.ts';
import { computeOpaqueBounds, getPixel, isOpaque, luminance, type Rect2, type RgbaImage } from '../src/pipeline/rgba-image.ts';
import { loadPersonaCalibration, type PartCalibration, type PersonaCalibrationV1 } from '../src/shared/persona-calibration.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const STRIPE_PARTS = ['torso', 'pelvis', 'nearThigh'];

function countOpaqueInRect(image: RgbaImage, rect: Rect2): number {
  let count = 0;
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (isOpaque(getPixel(image, x, y))) count += 1;
    }
  }
  return count;
}

export function measureMedianLuminancePart(part: RgbaImage): number {
  const values: number[] = [];
  for (let y = 0; y < part.height; y += 1) {
    for (let x = 0; x < part.width; x += 1) {
      const pixel = getPixel(part, x, y);
      if (pixel.a > 20) values.push(luminance(pixel));
    }
  }
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}

function stripePresence(parts: Readonly<Record<string, RgbaImage>>): Record<string, number> {
  const presence: Record<string, number> = {};
  for (const id of STRIPE_PARTS) {
    const part = parts[id];
    if (part !== undefined) presence[id] = countStripePixels(part);
  }
  return presence;
}

export function buildCutoutContext(master: RgbaImage, record: PersonaCalibrationV1, part: PartCalibration, parts: Readonly<Record<string, RgbaImage>>, occluderCanvas?: RgbaImage): ContractContext {
  const probe = part.orientationProbe;
  return {
    stage: 'cutout',
    partId: part.partId,
    luminanceBand: part.luminanceBand,
    expectedLowestRow: part.expectedLowestRow,
    stripeOwner: record.stripeOwner,
    stripePresence: stripePresence(parts),
    orientationProbe: probe === undefined ? undefined : {
      frontCount: countOpaqueInRect(master, probe.front),
      backCount: countOpaqueInRect(master, probe.back),
    },
    occluderCount: part.subtractOccluders?.length ?? 0,
    occluderCanvas,
  };
}

export function masterRatioCheck(record: PersonaCalibrationV1): { measured: number; min: number; max: number } {
  const lm = record.landmarks;
  const dist = (a: string, b: string): number => Math.hypot((lm[a]?.x ?? 0) - (lm[b]?.x ?? 0), (lm[a]?.y ?? 0) - (lm[b]?.y ?? 0));
  const arm = dist('shoulder', 'elbow') + dist('elbow', 'wrist');
  const leg = dist('hip', 'knee') + dist('knee', 'ankle');
  return { measured: arm / leg, min: record.planRatios.armLeg[0], max: record.planRatios.armLeg[1] };
}

function runBake(): number {
  const personaId = process.argv[2] ?? 'photo-sg-chinese-female';
  const record = loadPersonaCalibration(ROOT, personaId);
  const masterBuffer = readFileSync(join(ROOT, record.provenance.masterPath));
  const masterSha = sha256Buffer(masterBuffer);
  if (masterSha !== record.provenance.masterSha256) {
    console.error(`master sha mismatch: ${masterSha} != ${record.provenance.masterSha256}`);
    return 1;
  }
  const master = decodePngBuffer(masterBuffer);
  const { parts, occluderCanvases } = decomposeMaster(master, record);
  const report: Record<string, { passed: boolean; medianL: number; checks: PartContractCheck[] }> = {};
  let failures = 0;
  for (const part of record.parts) {
    const cutout = parts[part.partId];
    if (cutout === undefined) continue;
    const checks = evaluatePartContract(cutout, buildCutoutContext(master, record, part, parts, occluderCanvases[part.partId]));
    const passed = contractPassed(checks);
    if (!passed) failures += 1;
    report[part.partId] = { passed, medianL: Number(measureMedianLuminancePart(cutout).toFixed(1)), checks };
  }
  writeOutputs(personaId, record, masterSha, parts, report);
  console.log(`baked ${Object.keys(parts).length} parts for ${personaId}; contract failures: ${failures}`);
  return failures === 0 ? 0 : 1;
}

function writeOutputs(personaId: string, record: PersonaCalibrationV1, masterSha: string, parts: Readonly<Record<string, RgbaImage>>, report: unknown): void {
  const partsDir = join(ROOT, 'public', 'sprites', 'rev2', personaId, 'parts');
  const goldenDir = join(ROOT, 'docs', 'audit-golden', personaId);
  mkdirSync(partsDir, { recursive: true });
  mkdirSync(goldenDir, { recursive: true });
  for (const [id, part] of Object.entries(parts)) encodePngFile(join(partsDir, `${id}.png`), part);
  encodePngFile(join(goldenDir, 'contact-sheet.png'), buildContactSheet(parts));
  writeFileSync(join(goldenDir, 'golden-manifest.json'), `${JSON.stringify(buildGoldenManifest(personaId, masterSha, record.revision, parts), null, 2)}\n`);
  writeFileSync(join(goldenDir, 'part-contract-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

const isMainModule = (process.argv[1] ?? '').includes('decompose-and-bake');
if (isMainModule) process.exit(runBake());

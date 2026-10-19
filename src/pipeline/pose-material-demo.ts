import fs from 'node:fs';
import path from 'node:path';
import type {
  ArticulatedPose,
  BodyPartId,
  PhotorealAssetTuningSpec,
  RasterImage,
  RunnerVariantId,
} from '../shared/types.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import { solveArticulatedPose } from '../runner/gait.js';
import { RUNNER_PALETTES } from '../runner/palette.js';
import { renderRunnerPoseToRaster } from '../runner/rasterizer.js';
import {
  getPhotorealPartBankForPersona,
  setPhotorealPartBankForPersona,
} from '../runner/photoreal-rig.js';
import { readImageFile, writePngFile } from './image-io.js';
import { blitRaster, createRaster, fillRaster } from './raster.js';
import { extractAndLoadPhotorealFemaleParts } from './photoreal-extractor.js';
import { buildSilhouetteMask } from './pose-silhouette.js';
import { describeSilhouette, summarizeDiversity } from './pose-diversity.js';
import { listOpaqueComponentSizes } from './connected-components.js';
import {
  ANGLE_TOLERANCE_DEG,
  type PoseMaterialBank,
  type RenderedPartMaterial,
} from './pose-material-types.js';

export interface MaterialDemoConfig {
  readonly repoRoot: string;
  readonly bank: PoseMaterialBank;
  readonly rig: AnatomicalRigSpec;
  readonly tuning: PhotorealAssetTuningSpec;
  readonly personaId: 'photo-sg-chinese-female';
  readonly variant: RunnerVariantId;
  readonly frameCount: number;
  readonly outDir: string;
}

export interface MaterialSelectionLog {
  readonly phaseIndex: number;
  readonly partId: BodyPartId;
  readonly targetAngleDeg: number;
  readonly materialId: string | null;
  readonly deltaDeg: number | null;
}

export interface MaterialDemoReport {
  readonly outDir: string;
  readonly framesRendered: number;
  readonly contactSheetPath: string;
  readonly selections: readonly MaterialSelectionLog[];
  readonly covered: Readonly<Record<string, number>>;
  readonly gaps: readonly MaterialSelectionLog[];
  readonly meanPairIou: number;
  readonly maxPairIou: number;
  readonly halfCycleIou: number;
  readonly detachedIslands: number;
  readonly groundDeltaMaxPx: number;
  readonly stanceSoleSpreadPx: number;
}

const SELECTABLE: readonly BodyPartId[] = [
  'nearThigh', 'nearShin', 'farThigh', 'farShin',
  'nearUpperArm', 'nearForearm', 'farUpperArm', 'farForearm',
];

function angleOfBone(pose: ArticulatedPose, partId: BodyPartId): number {
  const limb = partId.endsWith('Thigh') || partId.endsWith('Shin')
    ? (partId.startsWith('near') ? pose.nearLeg : pose.farLeg)
    : (partId.startsWith('near') ? pose.nearArm : pose.farArm);
  const a = partId.includes('Thigh') || partId.includes('UpperArm') ? limb.hipOrShoulder : limb.midJoint;
  const b = partId.includes('Thigh') || partId.includes('UpperArm') ? limb.midJoint : limb.endEffector;
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function angleDelta(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function selectMaterial(
  materials: readonly RenderedPartMaterial[],
  partId: BodyPartId,
  targetAngleDeg: number,
): { readonly material: RenderedPartMaterial | null; readonly delta: number | null } {
  const candidates = materials
    .filter((entry) => entry.partId === partId)
    .map((entry) => ({ entry, delta: angleDelta(entry.measuredAngleDeg, targetAngleDeg) }))
    .filter((candidate) => candidate.delta <= ANGLE_TOLERANCE_DEG)
    .sort((a, b) => a.delta - b.delta);
  const best = candidates[0];
  return { material: best?.entry ?? null, delta: best?.delta ?? null };
}

/** Applies the selected material to the rig's part bank for one frame only. */
function applyFrameMaterial(
  config: MaterialDemoConfig,
  base: ReturnType<typeof getPhotorealPartBankForPersona>,
  pose: ArticulatedPose,
  materials: readonly RenderedPartMaterial[],
  log: MaterialSelectionLog[],
): number {
  const bank = { ...base };
  let applied = 0;
  for (const partId of SELECTABLE) {
    const target = angleOfBone(pose, partId);
    const { material, delta } = selectMaterial(materials, partId, target);
    log.push({
      phaseIndex: Math.round(pose.phase * config.frameCount),
      partId,
      targetAngleDeg: Number(target.toFixed(1)),
      materialId: material?.materialId ?? null,
      deltaDeg: delta === null ? null : Number(delta.toFixed(1)),
    });
    if (!material) continue;
    const image = readImageFile(path.resolve(config.repoRoot, material.cutoutPath));
    bank[partId] = image;
    applied++;
  }
  setPhotorealPartBankForPersona(config.personaId, bank);
  return applied;
}

/**
 * Renders the pose with the studio part bank only, so that ground-line error can
 * be attributed to harvested material rather than to the rig's foot roll.
 */
function buildBaselineFrame(config: MaterialDemoConfig, pose: ArticulatedPose): RasterImage {
  return renderRunnerPoseToRaster({
    pose,
    palette: RUNNER_PALETTES[config.variant],
    pixelScale: 1,
    personaId: config.personaId,
    assetTuning: config.tuning,
  });
}

interface FrameMeasurement {
  readonly frame: RasterImage;
  readonly mask: ReturnType<typeof buildSilhouetteMask>;
  readonly groundDeltaPx: number;
  readonly detachedIslands: number;
  readonly soleY: number;
  readonly inFlight: boolean;
}

/**
 * Renders one frame twice: once with the studio bank (the causal baseline for
 * AC-9) and once with the harvested material applied, then measures both.
 */
function measureFrame(
  config: MaterialDemoConfig,
  base: ReturnType<typeof getPhotorealPartBankForPersona>,
  pose: ArticulatedPose,
  selections: MaterialSelectionLog[],
): FrameMeasurement {
  const baselineMask = buildSilhouetteMask(buildBaselineFrame(config, pose));
  applyFrameMaterial(config, base, pose, config.bank.materials, selections);
  const frame = renderRunnerPoseToRaster({
    pose,
    palette: RUNNER_PALETTES[config.variant],
    pixelScale: 1,
    personaId: config.personaId,
    assetTuning: config.tuning,
  });
  const mask = buildSilhouetteMask(frame);
  const components = listOpaqueComponentSizes(frame, 32);
  return {
    frame,
    mask,
    groundDeltaPx: Math.abs(mask.maxY - baselineMask.maxY),
    detachedIslands: Math.max(0, components.length - 1),
    soleY: mask.maxY,
    inFlight: pose.isFlightPhase,
  };
}

export function renderMaterialDemo(config: MaterialDemoConfig): MaterialDemoReport {
  fs.mkdirSync(path.join(config.outDir, 'frames'), { recursive: true });
  extractAndLoadPhotorealFemaleParts(config.repoRoot);
  const base = { ...getPhotorealPartBankForPersona(config.personaId) };
  const selections: MaterialSelectionLog[] = [];
  const frames: RasterImage[] = [];
  const masks: Array<{ id: string; mask: ReturnType<typeof buildSilhouetteMask> }> = [];
  // AC-9 is measured causally: the same pose rendered *without* harvested
  // material is the baseline, so the delta is the ground-line error introduced
  // by material alone. Absolute sole height across a run cycle is a property of
  // the rig's foot roll (it lifts at toe-off and in flight) and is reported
  // separately as stance spread.
  const stanceSoles: number[] = [];
  let detachedIslands = 0;
  let groundDeltaMax = 0;
  for (let i = 0; i < config.frameCount; i++) {
    const pose = solveArticulatedPose(i / config.frameCount, undefined, config.rig);
    const measured = measureFrame(config, base, pose, selections);
    frames.push(measured.frame);
    const id = `frame-${String(i).padStart(2, '0')}`;
    masks.push({ id, mask: measured.mask });
    detachedIslands += measured.detachedIslands;
    groundDeltaMax = Math.max(groundDeltaMax, measured.groundDeltaPx);
    if (!measured.inFlight) stanceSoles.push(measured.soleY);
    writePngFile(path.join(config.outDir, 'frames', `${id}.png`), measured.frame);
  }
  return finalizeDemo(config, base, frames, masks, selections, detachedIslands, groundDeltaMax, stanceSoles);
}

function finalizeDemo(
  config: MaterialDemoConfig,
  base: ReturnType<typeof getPhotorealPartBankForPersona>,
  frames: readonly RasterImage[],
  masks: readonly { id: string; mask: ReturnType<typeof buildSilhouetteMask> }[],
  selections: readonly MaterialSelectionLog[],
  detachedIslands: number,
  groundDeltaMax: number,
  stanceSoles: readonly number[],
): MaterialDemoReport {
  setPhotorealPartBankForPersona(config.personaId, base);
  const contactSheetPath = path.join(config.outDir, 'contact-sheet-material.png');
  writePngFile(contactSheetPath, buildContactSheet([...frames], config.frameCount));
  const diversity = summarizeDiversity(masks.map((entry) => describeSilhouette(entry.id, entry.mask)));
  return {
    outDir: config.outDir,
    framesRendered: frames.length,
    contactSheetPath,
    selections: [...selections],
    covered: countCoverage(selections),
    gaps: selections.filter((entry) => entry.materialId === null),
    meanPairIou: diversity.meanPairIou,
    maxPairIou: diversity.maxPairIou,
    halfCycleIou: halfCycle([...masks]),
    detachedIslands,
    groundDeltaMaxPx: groundDeltaMax,
    stanceSoleSpreadPx: stanceSoles.length === 0 ? 0 : Math.max(...stanceSoles) - Math.min(...stanceSoles),
  };
}

function countCoverage(selections: readonly MaterialSelectionLog[]): Record<string, number> {
  const covered: Record<string, number> = {};
  for (const entry of selections) {
    if (entry.materialId === null) continue;
    covered[entry.partId] = (covered[entry.partId] ?? 0) + 1;
  }
  return covered;
}

function halfCycle(masks: readonly { readonly id: string; readonly mask: ReturnType<typeof buildSilhouetteMask> }[]): number {
  let total = 0;
  let count = 0;
  const half = Math.floor(masks.length / 2);
  for (let i = 0; i + half < masks.length; i++) {
    const a = masks[i];
    const b = masks[i + half];
    if (!a || !b) continue;
    let intersection = 0;
    let union = 0;
    for (let p = 0; p < a.mask.data.length; p++) {
      const inA = a.mask.data[p] === 1;
      const inB = b.mask.data[p] === 1;
      if (inA && inB) intersection++;
      if (inA || inB) union++;
    }
    total += union === 0 ? 0 : intersection / union;
    count++;
  }
  return count === 0 ? 0 : total / count;
}

function buildContactSheet(frames: readonly RasterImage[], frameCount: number): RasterImage {
  const cols = 4;
  const rows = Math.ceil(frameCount / cols);
  const width = frames[0]?.width ?? 220;
  const height = frames[0]?.height ?? 256;
  const sheet = createRaster(cols * width, rows * height);
  fillRaster(sheet, { r: 226, g: 230, b: 238, a: 255 });
  frames.forEach((frame, index) => {
    blitRaster(sheet, frame, { x: (index % cols) * width, y: Math.floor(index / cols) * height });
  });
  return sheet;
}

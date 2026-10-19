import type { RgbaColor, RasterImage } from '../shared/types.js';
import {
  listOpaqueComponentSizes,
  measureForegroundRegion,
} from './connected-components.js';
import { keyOutMagentaCell } from './magenta-key.js';
import { computeAlphaSilhouetteIoU } from './hashing.js';
import { createRaster, readPixel, writePixel } from './raster.js';

/**
 * Automated Computer-Vision Acceptance Gates for studio plates & phase frames.
 *
 * Replaces per-turn manual `read_file` eyeballing with deterministic,
 * reproducible pixel-math gates that every generated plate must pass before
 * it may enter the extraction pipeline (revised-pipeline design goal G5).
 *
 * Provenance note: gates measure *computable* properties (subject count,
 * backdrop uniformity, composition ratio, lower-region components, skin-tone
 * deltaE, silhouette lock). Chirality and fine anatomical correctness cannot
 * be verified from pixels alone in this environment; they remain covered by
 * the prompt-contract gate (`generation-manifest.ts`) plus the mandatory
 * human visual examination gate in `CLAUDE-validation.md §9.2`.
 */

export interface LabColor {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

export type PlateGateClass =
  | 'master'
  | 'head'
  | 'hair'
  | 'neck'
  | 'torso'
  | 'pelvis'
  | 'arm'
  | 'leg'
  | 'phase-frame';

export interface PlateAcceptanceCriteria {
  readonly plateGateClass: PlateGateClass;
  readonly minChromaUniformity: number;
  readonly maxForegroundSubjects: number;
  readonly minSubjectAreaPx: number;
  readonly maxSagittalWidthRatio: number | null;
  readonly maxLowerRegionComponents: number | null;
  readonly referenceSkinLab: LabColor;
  readonly maxSkinDeltaE2000: number | null;
  readonly referenceSilhouette: RasterImage | null;
  readonly minSilhouetteLockIoU: number | null;
}

export interface PlateGateResult {
  readonly gateId: string;
  readonly pass: boolean;
  readonly score: number;
  readonly detail: string;
}

export interface PlateAcceptanceReport {
  readonly plateId: string;
  readonly gates: readonly PlateGateResult[];
  readonly overallPass: boolean;
  readonly failedGateIds: readonly string[];
}

export const DEFAULT_CHROMA_UNIFORMITY = 0.985;
export const DEFAULT_MAX_SAGITTAL_WIDTH_RATIO = 0.62;
export const DEFAULT_MIN_SUBJECT_AREA_PX = 20_000;
export const DEFAULT_MAX_LOWER_REGION_COMPONENTS = 1;
export const DEFAULT_MAX_SKIN_DELTA_E = 12;
export const DEFAULT_MIN_SILHOUETTE_LOCK_IOU = 0.6;

export function keyOutMagentaPlate(plate: RasterImage): RasterImage {
  return keyOutMagentaCell(plate);
}

export function measureChromaBackgroundUniformity(
  plate: RasterImage,
): number {
  const band = 6;
  const dominant = measureDominantBorderColor(plate, band);
  let uniformPixels = 0;
  let bandPixels = 0;
  for (let y = 0; y < plate.height; y++) {
    for (let x = 0; x < plate.width; x++) {
      if (!isInBorderBand(plate, x, y, band)) {
        continue;
      }
      bandPixels += 1;
      const distance = computeRgbDistance(
        readPixel(plate, x, y),
        dominant,
      );
      if (distance <= BACKDROP_UNIFORMITY_TOLERANCE) {
        uniformPixels += 1;
      }
    }
  }
  return bandPixels === 0 ? 0 : uniformPixels / bandPixels;
}

const BACKDROP_UNIFORMITY_TOLERANCE = 60;

function measureDominantBorderColor(
  plate: RasterImage,
  band: number,
): RgbaColor {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  for (let y = 0; y < plate.height; y++) {
    for (let x = 0; x < plate.width; x++) {
      if (!isInBorderBand(plate, x, y, band)) {
        continue;
      }
      const color = readPixel(plate, x, y);
      rSum += color.r;
      gSum += color.g;
      bSum += color.b;
      count += 1;
    }
  }
  if (count === 0) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }
  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
    a: 255,
  };
}

function computeRgbDistance(
  colorA: { readonly r: number; readonly g: number; readonly b: number },
  colorB: { readonly r: number; readonly g: number; readonly b: number },
): number {
  const dr = colorA.r - colorB.r;
  const dg = colorA.g - colorB.g;
  const db = colorA.b - colorB.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

const CANONICAL_MAGENTA = { r: 255, g: 0, b: 255, a: 255 };
const BACKDROP_CONTRACT_TOLERANCE = 60;

export function measureBackdropContractDeviation(
  plate: RasterImage,
): number {
  const dominant = measureDominantBorderColor(plate, 6);
  return computeRgbDistance(dominant, CANONICAL_MAGENTA);
}

function isInBorderBand(
  plate: RasterImage,
  x: number,
  y: number,
  band: number,
): boolean {
  return (
    y < band || y >= plate.height - band || x < band || x >= plate.width - band
  );
}

export function countForegroundSubjects(
  keyed: RasterImage,
  minAreaPx: number,
): number {
  return listOpaqueComponentSizes(keyed, minAreaPx).length;
}

export function measureSagittalWidthRatio(keyed: RasterImage): number {
  const region = measureForegroundRegion(keyed);
  if (region.bounds.height <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return region.bounds.width / region.bounds.height;
}

export function countLowerRegionComponents(
  keyed: RasterImage,
  minAreaPx: number,
): number {
  const region = measureForegroundRegion(keyed);
  const lowerTop = region.bounds.y + Math.floor(region.bounds.height * 0.72);
  const cropHeight = keyed.height - lowerTop;
  if (cropHeight <= 0) {
    return 0;
  }
  const lowerCrop = createRaster(keyed.width, cropHeight);
  blitOpaqueRegion(keyed, lowerCrop, lowerTop);
  return listOpaqueComponentSizes(lowerCrop, minAreaPx).length;
}

function blitOpaqueRegion(
  source: RasterImage,
  target: RasterImage,
  sourceTopY: number,
  offsetX = 0,
  offsetY = 0,
): void {
  for (let y = sourceTopY; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const color = readPixel(source, x, y);
      if (color.a >= 64) {
        const targetX = x + offsetX;
        const targetY = y - sourceTopY + offsetY;
        if (
          targetX >= 0 &&
          targetX < target.width &&
          targetY >= 0 &&
          targetY < target.height
        ) {
          writePixel(target, { x: targetX, y: targetY }, color);
        }
      }
    }
  }
}

export function measureMeanSkinLab(keyed: RasterImage): LabColor {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  for (let y = 0; y < keyed.height; y++) {
    for (let x = 0; x < keyed.width; x++) {
      const color = readPixel(keyed, x, y);
      if (color.a >= 128 && isSkinLikePixel(color)) {
        rSum += color.r;
        gSum += color.g;
        bSum += color.b;
        count += 1;
      }
    }
  }
  if (count === 0) {
    return { l: 0, a: 0, b: 0 };
  }
  return convertSrgbToLab(rSum / count, gSum / count, bSum / count);
}

function isSkinLikePixel(color: RgbaColor): boolean {
  const warmGap = color.r - color.g;
  const luminanceFloor = color.r + color.g + color.b;
  return (
    warmGap >= 8 &&
    warmGap <= 130 &&
    color.b < color.r &&
    color.r >= 120 &&
    luminanceFloor >= 240 &&
    color.a >= 128
  );
}

export function convertSrgbToLab(r: number, g: number, b: number): LabColor {
  const xyz = convertSrgbToXyzD65(r / 255, g / 255, b / 255);
  return convertXyzToLab(xyz.x, xyz.y, xyz.z);
}

function convertSrgbToXyzD65(
  r: number,
  g: number,
  b: number,
): { readonly x: number; readonly y: number; readonly z: number } {
  const rl = expandSrgbChannel(r);
  const gl = expandSrgbChannel(g);
  const bl = expandSrgbChannel(b);
  return {
    x: 0.4124 * rl + 0.3576 * gl + 0.1805 * bl,
    y: 0.2126 * rl + 0.7152 * gl + 0.0722 * bl,
    z: 0.0193 * rl + 0.1192 * gl + 0.9505 * bl,
  };
}

function expandSrgbChannel(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

const D65_WHITE = { x: 0.95047, y: 1.0, z: 1.08883 };

function convertXyzToLab(x: number, y: number, z: number): LabColor {
  const fx = applyLabPivot(x / D65_WHITE.x);
  const fy = applyLabPivot(y / D65_WHITE.y);
  const fz = applyLabPivot(z / D65_WHITE.z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function applyLabPivot(value: number): number {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

export function computeDeltaE2000(labA: LabColor, labB: LabColor): number {
  const lMean = (labA.l + labB.l) / 2;
  const chromaA = Math.hypot(labA.a, labA.b);
  const chromaB = Math.hypot(labB.a, labB.b);
  const chromaMean = (chromaA + chromaB) / 2;
  const gFactor = 0.5 * (1 - sqrtC7OverC7Plus25(chromaMean));
  const aPrimeA = labA.a * (1 + gFactor);
  const aPrimeB = labB.a * (1 + gFactor);
  const chromaPrimeA = Math.hypot(aPrimeA, labA.b);
  const chromaPrimeB = Math.hypot(aPrimeB, labB.b);
  const hueAngleA = computeHueAngleDegrees(aPrimeA, labA.b);
  const hueAngleB = computeHueAngleDegrees(aPrimeB, labB.b);
  return assembleDeltaE2000Terms(
    labA.l,
    labB.l,
    chromaPrimeA,
    chromaPrimeB,
    hueAngleA,
    hueAngleB,
    lMean,
    chromaMean,
  );
}

function sqrtC7OverC7Plus25(chromaMean: number): number {
  const c7 = Math.pow(chromaMean, 7);
  return Math.sqrt(c7 / (c7 + 25.0 ** 7));
}

function assembleDeltaE2000Terms(
  lA: number,
  lB: number,
  chromaPrimeA: number,
  chromaPrimeB: number,
  hueAngleA: number,
  hueAngleB: number,
  lMean: number,
  chromaMean: number,
): number {
  const deltaLPrime = lB - lA;
  const deltaChromaPrime = chromaPrimeB - chromaPrimeA;
  const deltaHueDegrees = computeDeltaHueDegrees(
    hueAngleA,
    hueAngleB,
    chromaPrimeA,
    chromaPrimeB,
  );
  const deltaHPrime =
    2 *
    Math.sqrt(chromaPrimeA * chromaPrimeB) *
    Math.sin((deltaHueDegrees * Math.PI) / 360);
  const hueMean = computeMeanHueDegrees(hueAngleA, hueAngleB);
  const tFactor = computeTFactor(hueMean);
  const sl = weightingFactorSl(lMean);
  const sc = 1 + 0.045 * chromaMean;
  const sh = 1 + 0.015 * chromaMean * tFactor;
  const deltaTheta = (30 * Math.exp(-(((hueMean - 275) / 25) ** 2)) * Math.PI) / 180;
  const rc = -2 * sqrtC7OverC7Plus25(chromaMean);
  const rotationTerm = rc * Math.sin(2 * deltaTheta);
  const lTerm = deltaLPrime / sl;
  const cTerm = deltaChromaPrime / sc;
  const hTerm = deltaHPrime / sh;
  const sum =
    lTerm * lTerm +
    cTerm * cTerm +
    hTerm * hTerm +
    rotationTerm * cTerm * hTerm;
  return Math.sqrt(Math.max(0, sum));
}

function computeHueAngleDegrees(aPrime: number, bPrime: number): number {
  if (aPrime === 0 && bPrime === 0) {
    return 0;
  }
  const degrees = (Math.atan2(bPrime, aPrime) * 180) / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}

function weightingFactorSl(lMean: number): number {
  return 1 + (0.015 * ((lMean - 50) ** 2)) / Math.sqrt(20 + ((lMean - 50) ** 2));
}

function computeDeltaHueDegrees(
  hueAngleA: number,
  hueAngleB: number,
  chromaPrimeA: number,
  chromaPrimeB: number,
): number {
  if (chromaPrimeA * chromaPrimeB === 0) {
    return 0;
  }
  const rawDelta = hueAngleB - hueAngleA;
  if (rawDelta > 180) {
    return rawDelta - 360;
  }
  if (rawDelta < -180) {
    return rawDelta + 360;
  }
  return rawDelta;
}

function computeMeanHueDegrees(hueAngleA: number, hueAngleB: number): number {
  const sum = hueAngleA + hueAngleB;
  if (Math.abs(hueAngleA - hueAngleB) <= 180) {
    return sum / 2;
  }
  if (sum < 360) {
    return (sum + 360) / 2;
  }
  return (sum - 360) / 2;
}

function computeTFactor(hueMeanDegrees: number): number {
  return (
    1 -
    0.17 * Math.cos(((hueMeanDegrees - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hueMeanDegrees * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hueMeanDegrees + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hueMeanDegrees - 63) * Math.PI) / 180)
  );
}

export function computeNormalizedSilhouetteIoU(
  keyedA: RasterImage,
  keyedB: RasterImage,
): number {
  const canonicalA = registerSilhouetteToCanonicalCanvas(keyedA);
  const canonicalB = registerSilhouetteToCanonicalCanvas(keyedB);
  return computeAlphaSilhouetteIoU(canonicalA, canonicalB);
}

export function buildDefaultPlateAcceptanceCriteria(
  masterPlate: RasterImage,
): PlateAcceptanceCriteria {
  return buildClassAcceptanceCriteria(
    'master',
    masterPlate,
  );
}

interface ClassThresholdPreset {
  readonly maxSagittalWidthRatio: number | null;
  readonly maxLowerRegionComponents: number | null;
  readonly maxSkinDeltaE2000: number | null;
  readonly minSilhouetteLockIoU: number | null;
}

const CLASS_THRESHOLD_PRESETS: Readonly<
  Record<PlateGateClass, ClassThresholdPreset>
> = {
  master: {
    maxSagittalWidthRatio: DEFAULT_MAX_SAGITTAL_WIDTH_RATIO,
    maxLowerRegionComponents:
      DEFAULT_MAX_LOWER_REGION_COMPONENTS,
    maxSkinDeltaE2000: DEFAULT_MAX_SKIN_DELTA_E,
    minSilhouetteLockIoU: DEFAULT_MIN_SILHOUETTE_LOCK_IOU,
  },
  head: {
    maxSagittalWidthRatio: 2.0,
    maxLowerRegionComponents: null,
    maxSkinDeltaE2000: DEFAULT_MAX_SKIN_DELTA_E,
    minSilhouetteLockIoU: null,
  },
  hair: {
    maxSagittalWidthRatio: null,
    maxLowerRegionComponents: null,
    maxSkinDeltaE2000: null,
    minSilhouetteLockIoU: null,
  },
  neck: {
    maxSagittalWidthRatio: 0.8,
    maxLowerRegionComponents: null,
    maxSkinDeltaE2000: DEFAULT_MAX_SKIN_DELTA_E,
    minSilhouetteLockIoU: null,
  },
  torso: {
    maxSagittalWidthRatio: 0.8,
    maxLowerRegionComponents: null,
    maxSkinDeltaE2000: DEFAULT_MAX_SKIN_DELTA_E,
    minSilhouetteLockIoU: null,
  },
  pelvis: {
    maxSagittalWidthRatio: 0.8,
    maxLowerRegionComponents: null,
    maxSkinDeltaE2000: null,
    minSilhouetteLockIoU: null,
  },
  arm: {
    maxSagittalWidthRatio: null,
    maxLowerRegionComponents: null,
    maxSkinDeltaE2000: DEFAULT_MAX_SKIN_DELTA_E,
    minSilhouetteLockIoU: null,
  },
  leg: {
    maxSagittalWidthRatio: 0.5,
    maxLowerRegionComponents:
      DEFAULT_MAX_LOWER_REGION_COMPONENTS,
    maxSkinDeltaE2000: DEFAULT_MAX_SKIN_DELTA_E,
    minSilhouetteLockIoU: null,
  },
  'phase-frame': {
    maxSagittalWidthRatio: 0.95,
    maxLowerRegionComponents: 2,
    maxSkinDeltaE2000: DEFAULT_MAX_SKIN_DELTA_E,
    minSilhouetteLockIoU: null,
  },
};

export function buildClassAcceptanceCriteria(
  plateGateClass: PlateGateClass,
  masterPlate: RasterImage,
): PlateAcceptanceCriteria {
  const preset = CLASS_THRESHOLD_PRESETS[plateGateClass];
  const keyedMaster = keyOutMagentaPlate(masterPlate);
  return {
    plateGateClass,
    minChromaUniformity: DEFAULT_CHROMA_UNIFORMITY,
    maxForegroundSubjects: 1,
    minSubjectAreaPx: DEFAULT_MIN_SUBJECT_AREA_PX,
    maxSagittalWidthRatio: preset.maxSagittalWidthRatio,
    maxLowerRegionComponents:
      preset.maxLowerRegionComponents,
    referenceSkinLab: measureMeanSkinLab(keyedMaster),
    maxSkinDeltaE2000: preset.maxSkinDeltaE2000,
    referenceSilhouette:
      preset.minSilhouetteLockIoU === null
        ? null
        : keyedMaster,
    minSilhouetteLockIoU: preset.minSilhouetteLockIoU,
  };
}

export function buildPhaseFrameAcceptanceCriteria(
  masterPlate: RasterImage,
): PlateAcceptanceCriteria {
  return buildClassAcceptanceCriteria(
    'phase-frame',
    masterPlate,
  );
}

const CANONICAL_WIDTH = 220;
const CANONICAL_HEIGHT = 256;
const CANONICAL_CENTROID = { x: 110, y: 128 };

function registerSilhouetteToCanonicalCanvas(
  keyed: RasterImage,
): RasterImage {
  const canvas = createRaster(CANONICAL_WIDTH, CANONICAL_HEIGHT);
  const region = measureForegroundRegion(keyed);
  if (region.pixelCount === 0) {
    return canvas;
  }
  const scale = (CANONICAL_HEIGHT - 8) / region.bounds.height;
  const scaledWidth = Math.max(1, Math.round(keyed.width * scale));
  const scaledHeight = Math.max(1, Math.round(keyed.height * scale));
  const scaled = createRaster(scaledWidth, scaledHeight);
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const sourceX = Math.min(
        keyed.width - 1,
        Math.floor(x / scale),
      );
      const sourceY = Math.min(
        keyed.height - 1,
        Math.floor(y / scale),
      );
      writePixel(scaled, { x, y }, readPixel(keyed, sourceX, sourceY));
    }
  }
  const scaledRegion = measureForegroundRegion(scaled);
  const offsetX =
    CANONICAL_CENTROID.x - Math.round(scaledRegion.centroid.x);
  const offsetY =
    CANONICAL_CENTROID.y - Math.round(scaledRegion.centroid.y);
  blitOpaqueRegion(scaled, canvas, 0, offsetX, offsetY);
  return canvas;
}

export function runPlateAcceptanceGates(
  plateId: string,
  plate: RasterImage,
  criteria: PlateAcceptanceCriteria,
): PlateAcceptanceReport {
  const keyed = keyOutMagentaPlate(plate);
  const region = measureForegroundRegion(keyed);
  const gates = buildGateResults(keyed, plate, criteria, region.pixelCount);
  const failedGateIds = gates
    .filter((gate) => !gate.pass)
    .map((gate) => gate.gateId);
  return {
    plateId,
    gates,
    overallPass: failedGateIds.length === 0,
    failedGateIds,
  };
}

interface GateInputContext {
  readonly keyed: RasterImage;
  readonly plate: RasterImage;
  readonly criteria: PlateAcceptanceCriteria;
  readonly subjectAreaPx: number;
}

function buildGateResults(
  keyed: RasterImage,
  plate: RasterImage,
  criteria: PlateAcceptanceCriteria,
  subjectAreaPx: number,
): PlateGateResult[] {
  const context: GateInputContext = {
    keyed,
    plate,
    criteria,
    subjectAreaPx,
  };
  return [
    measureChromaUniformityGate(context),
    measureBackdropContractGate(context),
    measureSingleSubjectGate(context),
    measureSagittalCompositionGate(context),
    measureLowerRegionGate(context),
    measureSkinToneGate(context),
    measureSilhouetteLockGate(context),
  ];
}

function measureBackdropContractGate(
  context: GateInputContext,
): PlateGateResult {
  const deviation = measureBackdropContractDeviation(
    context.plate,
  );
  return {
    gateId: 'backdrop-chroma-contract',
    pass: deviation <= BACKDROP_CONTRACT_TOLERANCE,
    score: deviation,
    detail: `dominant border color ΔRGB ${deviation.toFixed(1)} from canonical #FF00FF (magenta-keyer contract)`,
  };
}

function measureChromaUniformityGate(
  context: GateInputContext,
): PlateGateResult {
  const score = measureChromaBackgroundUniformity(context.plate);
  return {
    gateId: 'chroma-background-uniformity',
    pass: score >= context.criteria.minChromaUniformity,
    score,
    detail: `border-band magenta coverage ${(score * 100).toFixed(2)}%`,
  };
}

function measureSingleSubjectGate(
  context: GateInputContext,
): PlateGateResult {
  const subjects = countForegroundSubjects(
    context.keyed,
    context.criteria.minSubjectAreaPx,
  );
  return {
    gateId: 'single-subject',
    pass: subjects <= context.criteria.maxForegroundSubjects,
    score: subjects,
    detail: `${subjects} foreground subject(s) >= ${context.criteria.minSubjectAreaPx}px`,
  };
}

function measureSagittalCompositionGate(
  context: GateInputContext,
): PlateGateResult {
  const maximumRatio =
    context.criteria.maxSagittalWidthRatio;
  if (maximumRatio === null) {
    return notApplicableGate(
      'sagittal-profile-composition',
      context.criteria.plateGateClass,
    );
  }
  const ratio = measureSagittalWidthRatio(context.keyed);
  return {
    gateId: 'sagittal-profile-composition',
    pass: ratio <= maximumRatio,
    score: ratio,
    detail: `foreground bbox width/height ratio ${ratio.toFixed(3)}`,
  };
}

function measureLowerRegionGate(
  context: GateInputContext,
): PlateGateResult {
  const maximumComponents =
    context.criteria.maxLowerRegionComponents;
  if (maximumComponents === null) {
    return notApplicableGate(
      'single-shoe-lower-region',
      context.criteria.plateGateClass,
    );
  }
  const components = countLowerRegionComponents(
    context.keyed,
    context.criteria.minSubjectAreaPx / 8,
  );
  return {
    gateId: 'single-shoe-lower-region',
    pass: components <= maximumComponents,
    score: components,
    detail: `${components} component(s) in lower 28% region`,
  };
}

function measureSkinToneGate(context: GateInputContext): PlateGateResult {
  const maximumDeltaE = context.criteria.maxSkinDeltaE2000;
  if (maximumDeltaE === null) {
    return notApplicableGate(
      'skin-tone-consistency',
      context.criteria.plateGateClass,
    );
  }
  const skinLab = measureMeanSkinLab(context.keyed);
  if (context.subjectAreaPx === 0 || skinLab.l === 0) {
    return {
      gateId: 'skin-tone-consistency',
      pass: false,
      score: Number.POSITIVE_INFINITY,
      detail: 'no skin-like pixels sampled on a skin-bearing plate class',
    };
  }
  const deltaE = computeDeltaE2000(
    skinLab,
    context.criteria.referenceSkinLab,
  );
  return {
    gateId: 'skin-tone-consistency',
    pass: deltaE <= maximumDeltaE,
    score: deltaE,
    detail: `mean skin ΔE2000 ${deltaE.toFixed(2)} vs master reference`,
  };
}

function notApplicableGate(
  gateId: string,
  plateGateClass: PlateGateClass,
): PlateGateResult {
  return {
    gateId,
    pass: true,
    score: -1,
    detail: `not applicable for ${plateGateClass} plates`,
  };
}

function measureSilhouetteLockGate(
  context: GateInputContext,
): PlateGateResult {
  const referenceSilhouette =
    context.criteria.referenceSilhouette;
  const minimumIoU = context.criteria.minSilhouetteLockIoU;
  if (!referenceSilhouette || minimumIoU === null) {
    return {
      gateId: 'silhouette-identity-lock',
      pass: true,
      score: -1,
      detail: 'not applicable for dynamic phase frames',
    };
  }
  const ioU = computeNormalizedSilhouetteIoU(
    context.keyed,
    referenceSilhouette,
  );
  return {
    gateId: 'silhouette-identity-lock',
    pass: ioU >= minimumIoU,
    score: ioU,
    detail: `centroid-registered silhouette IoU ${ioU.toFixed(3)} vs master`,
  };
}

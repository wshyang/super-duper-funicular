import fs from 'node:fs';
import path from 'node:path';
import type { BodyPartId, Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import type { PhotorealPartBank } from '../runner/photoreal-rig.js';
import { renderPhotorealFemalePoseOntoCanvas } from '../runner/photoreal-rig.js';
import { solveArticulatedPose } from '../runner/gait.js';
import {
  applyAssetTuningToRigSpec,
  DEFAULT_GAIT_CONFIG,
  DEFAULT_RIG_SPEC,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
} from '../runner/body-proportions.js';
import { RUNNER_PALETTES } from '../runner/palette.js';
import { sampleBilinearRgba } from '../runner/photoreal-warp.js';
import { readImageFile, writePngFile } from './image-io.js';
import { fillHollowJointBallByJacobiRelaxation, purgeSkinPartFabricSpill } from './photoreal-matte-and-qc.js';
import { applyPivotArcRoundedCut, attachEndCapComposite } from './rounded-joint-cutter.js';
import { createRaster, fillRaster, readPixel, writePixel } from './raster.js';
import {
  type HarvestedJigVariant,
  type PhaseFrameComplianceEntry,
  type PhaseJigVariantId,
  type PhotorealPhaseVariantBank,
  PHASE_FRAME_COMPLIANCE_LEDGER,
  PHASE_FRAME_JIG_SPECS,
  PHASE_VARIANT_JIG_SPECS,
  selectPhaseVariantBankForPose,
} from './phase-variant-specs.js';

export {
  PHASE_FRAME_COMPLIANCE_LEDGER,
  PHASE_FRAME_JIG_SPECS,
  PHASE_VARIANT_JIG_SPECS,
  selectPhaseVariantBankForPose,
  type HarvestedJigVariant,
  type PhaseFrameComplianceEntry,
  type PhaseJigVariantId,
  type PhotorealPhaseVariantBank,
};

export type PhaseFrameId =
  | 'frame-00-neutral'
  | 'phase-01-right-strike'
  | 'phase-02-left-strike'
  | 'phase-03-midstance-knee'
  | 'phase-04-flight-split'
  | 'phase-05-near-arm-forward-rejected'
  | 'phase-06-high-knee-ponytail-insert'
  | 'phase-07-near-shoulder-forward-refined'
  | 'phase-08-loaded-forefoot-roll-refined';

export interface PhaseJigSegmentSpec {
  readonly partId: BodyPartId;
  readonly selectedFrameId: PhaseFrameId;
  readonly fallbackFrameId: PhaseFrameId;
  readonly anatomicalRationale: string;
  readonly srcStart: Point2D;
  readonly srcEnd: Point2D;
  readonly dstStart: Point2D;
  readonly dstEnd: Point2D;
  readonly srcHalfWidthPx: number;
  readonly dstRadiusPx: number;
  readonly cropBox: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
  readonly shadeScale: number;
  readonly attachShortsCuff?: 'with-stripe' | 'solid-fabric';
}

export interface PhaseLimbClearanceMetrics {
  readonly partId: BodyPartId;
  readonly selectedFrameId: PhaseFrameId;
  readonly fallbackFrameId: PhaseFrameId;
  readonly coreCoverageRatio: number;
  readonly chromaBoundarySeparationRatio: number;
  readonly boneLengthPx: number;
  readonly normalizedHeightRatio: number;
  readonly opaquePixelsCount: number;
  readonly anatomicalRationale: string;
}

export interface PhaseHarvestReport {
  readonly referenceHeightPx: number;
  readonly frameHeightsPx: Readonly<Record<PhaseFrameId, number>>;
  readonly partsHarvestedCount: number;
  readonly variantsHarvestedCount: number;
  readonly averageCoreCoverageRatio: number;
  readonly averageChromaSeparationRatio: number;
  readonly complianceLedger: readonly PhaseFrameComplianceEntry[];
  readonly partMetrics: readonly PhaseLimbClearanceMetrics[];
  readonly variantMetrics: readonly (PhaseLimbClearanceMetrics & {
    readonly variantKey: string;
    readonly phaseTriggerDescription: string;
  })[];
}

export const PHASE_FRAME_FILES: Readonly<Record<PhaseFrameId, string>> = {
  'frame-00-neutral': 'src/images/photoreal-female/01-master-lateral-profile-reference.png',
  'phase-01-right-strike': 'src/images/photoreal-female-phases/phase-01-right-strike-left-arm-forward.png',
  'phase-02-left-strike': 'src/images/photoreal-female-phases/phase-02-left-strike-right-arm-forward.png',
  'phase-03-midstance-knee': 'src/images/photoreal-female-phases/phase-03-midstance-high-knee-pass.png',
  'phase-04-flight-split': 'src/images/photoreal-female-phases/phase-04-flight-max-split-stride.png',
  'phase-05-near-arm-forward-rejected': 'src/images/photoreal-female-phases/phase-05-near-arm-forward-drive.png',
  'phase-06-high-knee-ponytail-insert': 'src/images/photoreal-female-phases/phase-06-toe-off-plantar-roll-insert.png',
  'phase-07-near-shoulder-forward-refined': 'src/images/photoreal-female-phases/phase-07-near-shoulder-forward-refined.png',
  'phase-08-loaded-forefoot-roll-refined': 'src/images/photoreal-female-phases/phase-08-loaded-forefoot-roll-refined.png',
};

export function loadKeyedPhaseFrames(
  repoRoot: string,
): Readonly<Record<PhaseFrameId, RasterImage>> {
  const out = {} as Record<PhaseFrameId, RasterImage>;
  for (const [frameId, relPath] of Object.entries(PHASE_FRAME_FILES) as [PhaseFrameId, string][]) {
    const raw = readImageFile(path.join(repoRoot, relPath));
    out[frameId] = keyMagentaPhaseFrame(raw);
  }
  return out;
}

function keyMagentaPhaseFrame(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = readPixel(src, x, y);
      const excess = (p.r + p.b) / 2 - p.g;
      const isBg = p.r > 175 && p.b > 165 && p.g < 115 && excess > 92;
      if (isBg) continue;
      if (excess > 52 && p.b > p.g + 32) {
        const clampRB = Math.min(p.r, Math.round(p.g + 28));
        writePixel(out, { x, y }, { r: p.r, g: p.g, b: clampRB, a: 255 });
      } else {
        writePixel(out, { x, y }, { ...p, a: 255 });
      }
    }
  }
  return out;
}

export function measureForegroundHeightPx(img: RasterImage): number {
  let minY = img.height;
  let maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (readPixel(img, x, y).a > 128) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxY >= minY ? maxY - minY + 1 : 0;
}

export function measurePhaseLimbClearance(
  keyedFrame: RasterImage,
  spec: PhaseJigSegmentSpec,
  cutout: RasterImage,
  referenceHeightPx: number,
): PhaseLimbClearanceMetrics {
  const dx = spec.srcEnd.x - spec.srcStart.x;
  const dy = spec.srcEnd.y - spec.srcStart.y;
  const boneLengthPx = Math.hypot(dx, dy);
  const ux = dx / Math.max(1, boneLengthPx);
  const uy = dy / Math.max(1, boneLengthPx);
  let coreHits = 0;
  let marginClear = 0;
  const samples = 20;
  for (let i = 1; i <= samples; i++) {
    const t = i / (samples + 1);
    const cx = spec.srcStart.x + dx * t;
    const cy = spec.srcStart.y + dy * t;
    if (sampleBilinearRgba(keyedFrame, cx, cy).a > 96) coreHits++;
    const marginDist = spec.srcHalfWidthPx + 14;
    const leftP = sampleBilinearRgba(keyedFrame, cx - uy * marginDist, cy + ux * marginDist);
    const rightP = sampleBilinearRgba(keyedFrame, cx + uy * marginDist, cy - ux * marginDist);
    if (leftP.a < 32) marginClear++;
    if (rightP.a < 32) marginClear++;
  }
  return {
    partId: spec.partId,
    selectedFrameId: spec.selectedFrameId,
    fallbackFrameId: spec.fallbackFrameId,
    coreCoverageRatio: Number((coreHits / samples).toFixed(3)),
    chromaBoundarySeparationRatio: Number((marginClear / (samples * 2)).toFixed(3)),
    boneLengthPx: Number(boneLengthPx.toFixed(1)),
    normalizedHeightRatio: Number((boneLengthPx / Math.max(1, referenceHeightPx)).toFixed(3)),
    opaquePixelsCount: countOpaquePixels(cutout),
    anatomicalRationale: spec.anatomicalRationale,
  };
}

function countOpaquePixels(img: RasterImage): number {
  let count = 0;
  for (let i = 3; i < img.data.length; i += 4) {
    if (img.data[i]! > 24) count++;
  }
  return count;
}

export function extractSingleJigFromPhaseFrame(
  keyedFrame: RasterImage,
  spec: PhaseJigSegmentSpec,
  pelvisCuffSource?: RasterImage,
): RasterImage {
  const raw = samplePhaseSegmentToCanonical(keyedFrame, spec);
  const rounded = applyPhasePartRounding(raw, spec);
  if (spec.attachShortsCuff && pelvisCuffSource) {
    return attachEndCapComposite(rounded, {
      compositeSource: pelvisCuffSource,
      end: 'top',
      srcTopY: 50,
      srcBotY: 112,
      dstStraightCutY: 66,
      sideStripeMode: spec.attachShortsCuff,
      shadeScale: spec.shadeScale,
    });
  }
  return rounded;
}

function samplePhaseSegmentToCanonical(
  src: RasterImage,
  spec: PhaseJigSegmentSpec,
): RasterImage {
  const isRigidPart =
    spec.partId === 'head' ||
    spec.partId === 'hairAccessory' ||
    spec.partId === 'nearFoot' ||
    spec.partId === 'farFoot';
  if (!isRigidPart) {
    return sampleCrossSectionNormalizedLimb(src, spec);
  }
  const out = createRaster(160, 160);
  const sdx = spec.srcEnd.x - spec.srcStart.x;
  const sdy = spec.srcEnd.y - spec.srcStart.y;
  const ddx = spec.dstEnd.x - spec.dstStart.x;
  const ddy = spec.dstEnd.y - spec.dstStart.y;
  const srcLen = Math.max(1, Math.hypot(sdx, sdy));
  const dstLen = Math.max(1, Math.hypot(ddx, ddy));
  const sux = sdx / srcLen;
  const suy = sdy / srcLen;
  const dux = ddx / dstLen;
  const duy = ddy / dstLen;
  const alongScale = srcLen / dstLen;
  const { minX, maxX, minY, maxY } = spec.cropBox;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const rx = x - spec.dstStart.x;
      const ry = y - spec.dstStart.y;
      const along = (rx * dux + ry * duy) * alongScale;
      const across = (-rx * duy + ry * dux) * alongScale;
      if (Math.abs(across) > spec.srcHalfWidthPx) continue;
      const u = spec.srcStart.x + sux * along - suy * across;
      const v = spec.srcStart.y + suy * along + sux * across;
      if (u < minX || u > maxX || v < minY || v > maxY) continue;
      const p = sampleBilinearRgba(src, u, v);
      if (p.a > 16) writePixel(out, { x, y }, shadeRgba(p, spec.shadeScale));
    }
  }
  return out;
}

function sampleCrossSectionNormalizedLimb(
  src: RasterImage,
  spec: PhaseJigSegmentSpec,
): RasterImage {
  const out = createRaster(160, 160);
  const sdx = spec.srcEnd.x - spec.srcStart.x;
  const sdy = spec.srcEnd.y - spec.srcStart.y;
  const srcLen = Math.max(1, Math.hypot(sdx, sdy));
  const sux = sdx / srcLen;
  const suy = sdy / srcLen;
  const dstTopY = spec.dstStart.y;
  const dstBotY = spec.dstEnd.y;
  const dstLen = Math.max(1, dstBotY - dstTopY);
  const rDst = spec.dstRadiusPx;

  for (let y = Math.max(4, dstTopY - rDst); y <= Math.min(155, dstBotY + rDst); y++) {
    const tClamped = Math.max(0, Math.min(1, (y - dstTopY) / dstLen));
    const along = tClamped * srcLen;
    const span = measureCrossSectionSpan(src, spec, sux, suy, along);
    for (let x = 80 - rDst; x <= 80 + rDst; x++) {
      const nx = (x - 80) / Math.max(1, rDst);
      const across = span.mid + nx * span.halfW;
      const u = spec.srcStart.x + sux * along + suy * across;
      const v = spec.srcStart.y + suy * along - sux * across;
      const p = sampleBilinearRgba(src, u, v);
      if (p.a > 16) {
        const cleaned =
          spec.partId === 'neck'
            ? healNeckSingletPixel(p)
            : spec.partId === 'torso'
              ? healTorsoShoulderSkinPixel(p, x, y)
              : healArmSkinContaminants(spec.partId, p);
        writePixel(out, { x, y }, shadeRgba(cleaned, spec.shadeScale));
      }
    }
  }
  return out;
}

function measureCrossSectionSpan(
  src: RasterImage,
  spec: PhaseJigSegmentSpec,
  sux: number,
  suy: number,
  along: number,
): { readonly mid: number; readonly halfW: number } {
  const { minX, maxX, minY, maxY } = spec.cropBox;
  const maxS = spec.srcHalfWidthPx;
  let sMin = maxS;
  let sMax = -maxS;
  for (let s = -maxS; s <= maxS; s += 1) {
    const u = spec.srcStart.x + sux * along + suy * s;
    const v = spec.srcStart.y + suy * along - sux * s;
    if (u < minX || u > maxX || v < minY || v > maxY) continue;
    if (sampleBilinearRgba(src, u, v).a > 64) {
      if (s < sMin) sMin = s;
      if (s > sMax) sMax = s;
    }
  }
  if (sMax <= sMin) return { mid: 0, halfW: maxS * 0.65 };
  return {
    mid: (sMin + sMax) * 0.5,
    halfW: Math.max(8, (sMax - sMin) * 0.48),
  };
}

function healNeckSingletPixel(p: RgbaColor): RgbaColor {
  if (p.r - p.g >= 52 && p.r > 110) {
    return { r: 212, g: 162, b: 132, a: p.a };
  }
  return p;
}

function healTorsoShoulderSkinPixel(p: RgbaColor, x: number, y: number): RgbaColor {
  const isWhiteStripe = p.r > 180 && p.g > 170 && p.b > 170;
  const isSinglet = p.r > p.g * 1.45 && p.g < 95 && p.b < 110;
  if (!isWhiteStripe && !isSinglet && y < 96 && x < 104) {
    return { r: 154, g: 26, b: 42, a: p.a };
  }
  return p;
}

function healArmSkinContaminants(partId: BodyPartId, p: RgbaColor): RgbaColor {
  if (partId === 'nearUpperArm' || partId === 'farUpperArm') {
    const isWhiteStripe = p.r > 175 && p.g > 170 && p.b > 170 && Math.abs(p.r - p.b) < 28;
    const isSinglet = p.r >= 115 && p.r - p.g >= 82 && p.g < 58;
    if (isWhiteStripe || isSinglet) {
      return { r: 192, g: 135, b: 100, a: p.a };
    }
  }
  if (partId === 'farForearm' || partId === 'nearHand' || partId === 'farHand') {
    const isCyanWristband = p.b > 125 && p.g > 100 && p.b - p.r > 24;
    if (isCyanWristband) {
      return { r: 190, g: 134, b: 98, a: p.a };
    }
  }
  return p;
}

function applyPhasePartRounding(raw: RasterImage, spec: PhaseJigSegmentSpec): RasterImage {
  if (spec.partId === 'head') {
    return applyPivotArcRoundedCut(raw, {
      pivot: { x: 73, y: 122 }, radiusX: 42, radiusY: 11, cutSide: 'below', featherPx: 2.5,
    });
  }
  if (spec.partId === 'hairAccessory') return raw;
  if (spec.partId === 'nearFoot' || spec.partId === 'farFoot') {
    return applyPivotArcRoundedCut(raw, {
      pivot: { x: 60, y: 80 }, radiusX: 18, radiusY: 14, cutSide: 'above', featherPx: 2.5,
    });
  }
  if (spec.partId === 'torso') {
    const topRounded = applyPivotArcRoundedCut(raw, {
      pivot: { x: 78, y: 38 }, radiusX: 36, radiusY: 18, cutSide: 'above', featherPx: 3.0,
    });
    return applyPivotArcRoundedCut(topRounded, {
      pivot: { x: 78, y: 108 }, radiusX: 36, radiusY: 20, cutSide: 'below', featherPx: 3.5,
    });
  }
  if (spec.partId === 'pelvis') {
    return normalizePhasePelvisCutout(raw, spec.dstRadiusPx);
  }
  const topCut = applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 36 }, radiusX: spec.dstRadiusPx, radiusY: spec.dstRadiusPx, cutSide: 'above', featherPx: 2.5,
  });
  const botCut = applyPivotArcRoundedCut(topCut, {
    pivot: { x: 80, y: 124 }, radiusX: spec.dstRadiusPx, radiusY: spec.dstRadiusPx, cutSide: 'below', featherPx: 2.5,
  });
  const filled = fillHollowJointBallByJacobiRelaxation(botCut, {
    pivot: { x: 80, y: 36 }, radiusPx: Math.max(12, spec.dstRadiusPx - 2),
  });
  return purgeSkinPartFabricSpill(filled).cleaned;
}

function normalizePhasePelvisCutout(raw: RasterImage, rx: number): RasterImage {
  const out = createRaster(raw.width, raw.height);
  out.data.set(raw.data);
  for (let y = 4; y < out.height; y++) {
    for (let x = 54; x <= 114; x++) {
      const p = readPixel(out, x, y);
      if (p.a > 24 && (p.r > 58 || p.g > 58 || p.b > 58)) {
        writePixel(out, { x, y }, { r: 24, g: 26, b: 31, a: p.a });
      }
    }
  }
  const topRounded = applyPivotArcRoundedCut(out, {
    pivot: { x: 80, y: 40 }, radiusX: rx, radiusY: 16, cutSide: 'above', featherPx: 3.0,
  });
  return applyPivotArcRoundedCut(topRounded, {
    pivot: { x: 76, y: 108 }, radiusX: rx, radiusY: 22, cutSide: 'below', featherPx: 3.5,
  });
}

function shadeRgba(p: RgbaColor, scale: number): RgbaColor {
  return {
    r: Math.min(255, Math.round(p.r * scale)),
    g: Math.min(255, Math.round(p.g * scale)),
    b: Math.min(255, Math.round(p.b * scale)),
    a: p.a,
  };
}

export function harvestArticulatedJigsFromPhaseFrames(
  repoRoot: string,
  outputDir?: string,
): {
  readonly bank: PhotorealPartBank;
  readonly variantBank: PhotorealPhaseVariantBank;
  readonly report: PhaseHarvestReport;
} {
  const frames = loadKeyedPhaseFrames(repoRoot);
  const frameHeightsPx = {} as Record<PhaseFrameId, number>;
  for (const [id, img] of Object.entries(frames) as [PhaseFrameId, RasterImage][]) {
    frameHeightsPx[id] = measureForegroundHeightPx(img);
  }
  const refHeight = frameHeightsPx['frame-00-neutral'];
  const pelvisSpec = PHASE_FRAME_JIG_SPECS.find((s) => s.partId === 'pelvis')!;
  const rawPelvisJig = samplePhaseSegmentToCanonical(frames[pelvisSpec.selectedFrameId], pelvisSpec);
  const bank = {} as Record<BodyPartId, RasterImage>;
  const partMetrics: PhaseLimbClearanceMetrics[] = [];

  for (const spec of PHASE_FRAME_JIG_SPECS) {
    const srcFrame = frames[spec.selectedFrameId];
    const cutout = extractSingleJigFromPhaseFrame(srcFrame, spec, rawPelvisJig);
    bank[spec.partId] = cutout;
    partMetrics.push(measurePhaseLimbClearance(srcFrame, spec, cutout, refHeight));
  }
  const { variantBank, variantList, variantMetrics } = harvestPhaseJigVariants(frames, rawPelvisJig, refHeight);
  const report = summarizePhaseHarvestReport(refHeight, frameHeightsPx, partMetrics, variantMetrics);
  if (outputDir) {
    writePhaseHarvestArtifacts(outputDir, frames, bank, variantBank, variantList, report);
  }
  return { bank, variantBank, report };
}

function harvestPhaseJigVariants(
  frames: Readonly<Record<PhaseFrameId, RasterImage>>,
  rawPelvisJig: RasterImage,
  refHeight: number,
): {
  readonly variantBank: PhotorealPhaseVariantBank;
  readonly variantList: readonly HarvestedJigVariant[];
  readonly variantMetrics: readonly (PhaseLimbClearanceMetrics & {
    readonly variantKey: string;
    readonly phaseTriggerDescription: string;
  })[];
} {
  const mutableBank: Record<string, Record<string, HarvestedJigVariant>> = {};
  const variantList: HarvestedJigVariant[] = [];
  const variantMetrics: (PhaseLimbClearanceMetrics & {
    readonly variantKey: string;
    readonly phaseTriggerDescription: string;
  })[] = [];
  for (const vSpec of PHASE_VARIANT_JIG_SPECS) {
    const srcFrame = frames[vSpec.selectedFrameId];
    const cutout = extractSingleJigFromPhaseFrame(srcFrame, vSpec, rawPelvisJig);
    const metrics = measurePhaseLimbClearance(srcFrame, vSpec, cutout, refHeight);
    const entry: HarvestedJigVariant = {
      partId: vSpec.partId,
      variantId: vSpec.variantId,
      variantKey: vSpec.variantKey,
      sourceFrameId: vSpec.selectedFrameId,
      phaseTriggerDescription: vSpec.phaseTriggerDescription,
      image: cutout,
      metrics,
    };
    (mutableBank[vSpec.partId] ??= {})[vSpec.variantId] = entry;
    variantList.push(entry);
    variantMetrics.push({
      ...metrics,
      variantKey: vSpec.variantKey,
      phaseTriggerDescription: vSpec.phaseTriggerDescription,
    });
  }
  return { variantBank: mutableBank as PhotorealPhaseVariantBank, variantList, variantMetrics };
}

function summarizePhaseHarvestReport(
  referenceHeightPx: number,
  frameHeightsPx: Readonly<Record<PhaseFrameId, number>>,
  partMetrics: readonly PhaseLimbClearanceMetrics[],
  variantMetrics: readonly (PhaseLimbClearanceMetrics & {
    readonly variantKey: string;
    readonly phaseTriggerDescription: string;
  })[],
): PhaseHarvestReport {
  const all = [...partMetrics, ...variantMetrics];
  const covSum = all.reduce((acc, m) => acc + m.coreCoverageRatio, 0);
  const sepSum = all.reduce((acc, m) => acc + m.chromaBoundarySeparationRatio, 0);
  return {
    referenceHeightPx,
    frameHeightsPx,
    partsHarvestedCount: partMetrics.length,
    variantsHarvestedCount: variantMetrics.length,
    averageCoreCoverageRatio: Number((covSum / all.length).toFixed(3)),
    averageChromaSeparationRatio: Number((sepSum / all.length).toFixed(3)),
    complianceLedger: PHASE_FRAME_COMPLIANCE_LEDGER,
    partMetrics,
    variantMetrics,
  };
}

function writePhaseHarvestArtifacts(
  outputDir: string,
  frames: Readonly<Record<PhaseFrameId, RasterImage>>,
  bank: PhotorealPartBank,
  variantBank: PhotorealPhaseVariantBank,
  variantList: readonly HarvestedJigVariant[],
  report: PhaseHarvestReport,
): void {
  const partsDir = path.join(outputDir, 'parts');
  const variantsDir = path.join(partsDir, 'variants');
  fs.mkdirSync(variantsDir, { recursive: true });
  for (const [partId, img] of Object.entries(bank) as [BodyPartId, RasterImage][]) {
    writePngFile(path.join(partsDir, `${partId}.png`), img);
  }
  for (const v of variantList) {
    writePngFile(path.join(variantsDir, `${v.variantKey}.png`), v.image);
  }
  fs.writeFileSync(path.join(outputDir, 'phase-harvest-report.json'), JSON.stringify(report, null, 2));
  const sheet = renderPhaseHarvestDiagnosticSheet(frames, bank, variantBank, variantList);
  writePngFile(path.join(outputDir, 'phase-harvest-diagnostic-sheet.png'), sheet);
}

function renderPhaseHarvestDiagnosticSheet(
  frames: Readonly<Record<PhaseFrameId, RasterImage>>,
  bank: PhotorealPartBank,
  variantBank: PhotorealPhaseVariantBank,
  variantList: readonly HarvestedJigVariant[],
): RasterImage {
  const sheet = createRaster(1160, 880);
  fillRaster(sheet, { r: 24, g: 28, b: 38, a: 255 });
  const frameIds = Object.keys(PHASE_FRAME_FILES) as PhaseFrameId[];
  frameIds.forEach((fid, idx) => {
    blitScaledSourceFrameWithBoxes(sheet, frames[fid], fid, idx * 126 + 12, 8);
  });
  const allTiles: RasterImage[] = [
    ...PHASE_FRAME_JIG_SPECS.map((s) => bank[s.partId]!),
    ...variantList.map((v) => v.image),
  ];
  allTiles.forEach((tile, idx) => {
    const col = idx % 10;
    const row = Math.floor(idx / 10);
    blitHarvestedJigTile(sheet, tile, col * 114 + 14, 232 + row * 124);
  });
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
  const tunedRig = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning);
  [0, 0.25, 0.5, 0.75].forEach((phase, idx) => {
    const pose = solveArticulatedPose(phase, DEFAULT_GAIT_CONFIG, tunedRig);
    const activeBank = selectPhaseVariantBankForPose(pose, bank, variantBank);
    const rendered = createRaster(220, 256);
    renderPhotorealFemalePoseOntoCanvas(rendered, pose, RUNNER_PALETTES.red, {
      personaId: 'photo-sg-chinese-female',
      tuning,
      bankOverride: activeBank,
    });
    blitCompositeFrame(sheet, rendered, idx * 276 + 38, 612);
  });
  return sheet;
}

function blitScaledSourceFrameWithBoxes(
  dst: RasterImage,
  src: RasterImage,
  frameId: PhaseFrameId,
  ox: number,
  oy: number,
): void {
  const w = 120;
  const h = 212;
  const entry = PHASE_FRAME_COMPLIANCE_LEDGER.find((e) => e.frameId === frameId);
  const borderColor = entry?.complianceStatus === 'accepted'
    ? { r: 40, g: 220, b: 140, a: 255 }
    : { r: 245, g: 170, b: 40, a: 255 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.round(420 + (x / w) * 560);
      const sy = Math.round(20 + (y / h) * 720);
      const p = readPixel(src, sx, sy);
      const bg = { r: 42, g: 47, b: 61, a: 255 };
      writePixel(dst, { x: ox + x, y: oy + y }, p.a > 64 ? p : bg);
    }
  }
  drawRectOutline(dst, ox, oy, ox + w - 1, oy + h - 1, borderColor);
  for (const spec of [...PHASE_FRAME_JIG_SPECS, ...PHASE_VARIANT_JIG_SPECS]) {
    if (spec.selectedFrameId !== frameId) continue;
    const x0 = ox + Math.max(0, Math.min(w - 1, Math.round(((spec.cropBox.minX - 420) / 560) * w)));
    const x1 = ox + Math.max(0, Math.min(w - 1, Math.round(((spec.cropBox.maxX - 420) / 560) * w)));
    const y0 = oy + Math.max(0, Math.min(h - 1, Math.round(((spec.cropBox.minY - 20) / 720) * h)));
    const y1 = oy + Math.max(0, Math.min(h - 1, Math.round(((spec.cropBox.maxY - 20) / 720) * h)));
    drawRectOutline(dst, x0, y0, x1, y1, { r: 0, g: 240, b: 180, a: 255 });
  }
}

function drawRectOutline(
  dst: RasterImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: RgbaColor,
): void {
  for (let x = x0; x <= x1; x++) {
    writePixel(dst, { x, y: y0 }, color);
    writePixel(dst, { x, y: y1 }, color);
  }
  for (let y = y0; y <= y1; y++) {
    writePixel(dst, { x: x0, y }, color);
    writePixel(dst, { x: x1, y }, color);
  }
}

function blitHarvestedJigTile(dst: RasterImage, jig: RasterImage, ox: number, oy: number): void {
  const tileSize = 108;
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const sx = Math.round((x / tileSize) * jig.width);
      const sy = Math.round((y / tileSize) * jig.height);
      const p = readPixel(jig, sx, sy);
      const checker = ((x >> 3) + (y >> 3)) % 2 === 0 ? 52 : 62;
      const bg = { r: checker, g: checker + 4, b: checker + 12, a: 255 };
      writePixel(dst, { x: ox + x, y: oy + y }, p.a > 32 ? p : bg);
    }
  }
}

function blitCompositeFrame(dst: RasterImage, frame: RasterImage, ox: number, oy: number): void {
  const w = 220;
  const h = 256;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = readPixel(frame, x, y);
      const bg = y === 234 ? { r: 90, g: 200, b: 140, a: 255 } : { r: 226, g: 230, b: 238, a: 255 };
      writePixel(dst, { x: ox + x, y: oy + y }, p.a > 32 ? p : bg);
    }
  }
}

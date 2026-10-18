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

export type PhaseFrameId =
  | 'frame-00-neutral'
  | 'phase-01-right-strike'
  | 'phase-02-left-strike'
  | 'phase-03-midstance-knee'
  | 'phase-04-flight-split';

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
  readonly averageCoreCoverageRatio: number;
  readonly averageChromaSeparationRatio: number;
  readonly partMetrics: readonly PhaseLimbClearanceMetrics[];
}

export const PHASE_FRAME_FILES: Readonly<Record<PhaseFrameId, string>> = {
  'frame-00-neutral': 'src/images/photoreal-female/01-master-lateral-profile-reference.png',
  'phase-01-right-strike': 'src/images/photoreal-female-phases/phase-01-right-strike-left-arm-forward.png',
  'phase-02-left-strike': 'src/images/photoreal-female-phases/phase-02-left-strike-right-arm-forward.png',
  'phase-03-midstance-knee': 'src/images/photoreal-female-phases/phase-03-midstance-high-knee-pass.png',
  'phase-04-flight-split': 'src/images/photoreal-female-phases/phase-04-flight-max-split-stride.png',
};

export const PHASE_FRAME_JIG_SPECS: readonly PhaseJigSegmentSpec[] = [
  {
    partId: 'head',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'frame-00-neutral',
    anatomicalRationale: 'Sagittal profile head in active gaze with ponytail separated behind occiput.',
    srcStart: { x: 720, y: 42 },
    srcEnd: { x: 720, y: 145 },
    dstStart: { x: 76, y: 12 },
    dstEnd: { x: 76, y: 120 },
    srcHalfWidthPx: 48,
    dstRadiusPx: 38,
    cropBox: { minX: 673, maxX: 766, minY: 36, maxY: 152 },
    shadeScale: 1.0,
  },
  {
    partId: 'hairAccessory',
    selectedFrameId: 'phase-03-midstance-knee',
    fallbackFrameId: 'phase-01-right-strike',
    anatomicalRationale: 'Ponytail floats backward into open #FF00FF space during mid-stance recovery.',
    srcStart: { x: 668, y: 74 },
    srcEnd: { x: 600, y: 185 },
    dstStart: { x: 142, y: 82 },
    dstEnd: { x: 14, y: 86 },
    srcHalfWidthPx: 34,
    dstRadiusPx: 24,
    cropBox: { minX: 582, maxX: 674, minY: 62, maxY: 202 },
    shadeScale: 1.0,
  },
  {
    partId: 'neck',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'frame-00-neutral',
    anatomicalRationale: 'Continuous cervical skin column between jawline and collar with zero mannequin cut.',
    srcStart: { x: 714, y: 142 },
    srcEnd: { x: 712, y: 184 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 22,
    dstRadiusPx: 28,
    cropBox: { minX: 688, maxX: 740, minY: 136, maxY: 188 },
    shadeScale: 0.99,
  },
  {
    partId: 'torso',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-03-midstance-knee',
    anatomicalRationale: 'Near right arm swings behind back (-38 deg) and far left arm swings forward (+45 deg), leaving 100% of crimson singlet and white side stripe unobstructed.',
    srcStart: { x: 714, y: 192 },
    srcEnd: { x: 710, y: 362 },
    dstStart: { x: 74, y: 24 },
    dstEnd: { x: 80, y: 122 },
    srcHalfWidthPx: 48,
    dstRadiusPx: 38,
    cropBox: { minX: 664, maxX: 764, minY: 186, maxY: 368 },
    shadeScale: 1.0,
  },
  {
    partId: 'pelvis',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-03-midstance-knee',
    anatomicalRationale: 'Near hand is 65 px behind the hip in back-swing, exposing the entire sprinter-shorts waistband and hip saddle without arm/hand occlusion.',
    srcStart: { x: 704, y: 360 },
    srcEnd: { x: 706, y: 425 },
    dstStart: { x: 82, y: 28 },
    dstEnd: { x: 78, y: 126 },
    srcHalfWidthPx: 48,
    dstRadiusPx: 36,
    cropBox: { minX: 652, maxX: 758, minY: 354, maxY: 432 },
    shadeScale: 1.0,
  },
  {
    partId: 'nearUpperArm',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-04-flight-split',
    anatomicalRationale: 'Near right upper arm extends posteriorly into open #FF00FF space behind the torso.',
    srcStart: { x: 676, y: 206 },
    srcEnd: { x: 594, y: 256 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 22,
    dstRadiusPx: 26,
    cropBox: { minX: 575, maxX: 694, minY: 190, maxY: 268 },
    shadeScale: 1.0,
  },
  {
    partId: 'nearForearm',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-04-flight-split',
    anatomicalRationale: 'Near right forearm and cyan wristband hang in clear #FF00FF space 65 px behind the torso.',
    srcStart: { x: 592, y: 256 },
    srcEnd: { x: 568, y: 365 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 18,
    dstRadiusPx: 22,
    cropBox: { minX: 546, maxX: 616, minY: 246, maxY: 372 },
    shadeScale: 1.0,
  },
  {
    partId: 'nearHand',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'frame-00-neutral',
    anatomicalRationale: 'Near right hand/fist is completely isolated in #FF00FF magenta behind the hip at y=362..404.',
    srcStart: { x: 568, y: 362 },
    srcEnd: { x: 568, y: 400 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 20,
    dstRadiusPx: 22,
    cropBox: { minX: 544, maxX: 592, minY: 354, maxY: 408 },
    shadeScale: 1.0,
  },
  {
    partId: 'farUpperArm',
    selectedFrameId: 'phase-04-flight-split',
    fallbackFrameId: 'phase-01-right-strike',
    anatomicalRationale: 'Far left upper arm swings forward in front of the chest, exposing the medial inner bicep.',
    srcStart: { x: 754, y: 205 },
    srcEnd: { x: 806, y: 242 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 20,
    dstRadiusPx: 25,
    cropBox: { minX: 744, maxX: 822, minY: 188, maxY: 258 },
    shadeScale: 0.95,
  },
  {
    partId: 'farForearm',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-02-left-strike',
    anatomicalRationale: 'Far left forearm + cyan wristband swing forward in a 90-deg L-bend into open #FF00FF space in front of the chest.',
    srcStart: { x: 792, y: 266 },
    srcEnd: { x: 856, y: 196 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 19,
    dstRadiusPx: 22,
    cropBox: { minX: 772, maxX: 874, minY: 186, maxY: 280 },
    shadeScale: 0.98,
  },
  {
    partId: 'farHand',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-04-flight-split',
    anatomicalRationale: 'Far left hand is attached to the forward left forearm in 3D space, naturally locking medial inner-palm chirality with thumb pointing up.',
    srcStart: { x: 852, y: 202 },
    srcEnd: { x: 868, y: 172 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 20,
    dstRadiusPx: 20,
    cropBox: { minX: 838, maxX: 890, minY: 166, maxY: 210 },
    shadeScale: 1.0,
  },
  {
    partId: 'nearThigh',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-04-flight-split',
    anatomicalRationale: 'Right (near) thigh strides forward (+32 deg) completely separated from the trailing left thigh.',
    srcStart: { x: 734, y: 416 },
    srcEnd: { x: 822, y: 526 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 32,
    dstRadiusPx: 30,
    cropBox: { minX: 702, maxX: 854, minY: 402, maxY: 538 },
    shadeScale: 1.0,
    attachShortsCuff: 'with-stripe',
  },
  {
    partId: 'nearShin',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-03-midstance-knee',
    anatomicalRationale: 'Right (near) calf/shin and white ankle sock extend downward in clear #FF00FF space.',
    srcStart: { x: 823, y: 526 },
    srcEnd: { x: 840, y: 646 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 25,
    dstRadiusPx: 25,
    cropBox: { minX: 794, maxX: 866, minY: 516, maxY: 656 },
    shadeScale: 1.0,
  },
  {
    partId: 'nearFoot',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-03-midstance-knee',
    anatomicalRationale: 'Right (near) running shoe is 300+ px ahead of the left shoe, guaranteeing a single lateral shoe with zero ghost-shoe overlap.',
    srcStart: { x: 826, y: 678 },
    srcEnd: { x: 920, y: 684 },
    dstStart: { x: 38, y: 112 },
    dstEnd: { x: 136, y: 118 },
    srcHalfWidthPx: 36,
    dstRadiusPx: 36,
    cropBox: { minX: 814, maxX: 932, minY: 642, maxY: 702 },
    shadeScale: 1.0,
  },
  {
    partId: 'farThigh',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-02-left-strike',
    anatomicalRationale: 'Left (far) thigh extends backward (-28 deg) behind the hip, exposing the medial inner thigh separated from nearThigh by #FF00FF background.',
    srcStart: { x: 682, y: 432 },
    srcEnd: { x: 626, y: 538 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 32,
    dstRadiusPx: 29,
    cropBox: { minX: 586, maxX: 718, minY: 420, maxY: 548 },
    shadeScale: 0.90,
    attachShortsCuff: 'solid-fabric',
  },
  {
    partId: 'farShin',
    selectedFrameId: 'phase-01-right-strike',
    fallbackFrameId: 'phase-02-left-strike',
    anatomicalRationale: 'Left (far) calf/shin and white ankle sock extend diagonally backward in open #FF00FF space.',
    srcStart: { x: 624, y: 538 },
    srcEnd: { x: 518, y: 608 },
    dstStart: { x: 80, y: 36 },
    dstEnd: { x: 80, y: 124 },
    srcHalfWidthPx: 24,
    dstRadiusPx: 24,
    cropBox: { minX: 496, maxX: 662, minY: 526, maxY: 622 },
    shadeScale: 0.90,
  },
  {
    partId: 'farFoot',
    selectedFrameId: 'phase-03-midstance-knee',
    fallbackFrameId: 'phase-01-right-strike',
    anatomicalRationale: 'Elevated high-knee swing shoe in phase-03 (or push-off shoe in phase-01) is completely isolated in #FF00FF space with zero double-shoe overlap.',
    srcStart: { x: 768, y: 544 },
    srcEnd: { x: 860, y: 574 },
    dstStart: { x: 38, y: 112 },
    dstEnd: { x: 136, y: 118 },
    srcHalfWidthPx: 36,
    dstRadiusPx: 36,
    cropBox: { minX: 758, maxX: 868, minY: 506, maxY: 584 },
    shadeScale: 0.90,
  },
];

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
              : p;
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
  const isSinglet = p.r > p.g * 1.35 && p.g < 115 && p.b < 130;
  if (!isWhiteStripe && !isSinglet && y < 76 && x < 92) {
    return { r: 158, g: 26, b: 42, a: p.a };
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
): { readonly bank: PhotorealPartBank; readonly report: PhaseHarvestReport } {
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
  const report = summarizePhaseHarvestReport(refHeight, frameHeightsPx, partMetrics);
  if (outputDir) {
    writePhaseHarvestArtifacts(outputDir, frames, bank, report);
  }
  return { bank, report };
}

function summarizePhaseHarvestReport(
  referenceHeightPx: number,
  frameHeightsPx: Readonly<Record<PhaseFrameId, number>>,
  partMetrics: readonly PhaseLimbClearanceMetrics[],
): PhaseHarvestReport {
  const covSum = partMetrics.reduce((acc, m) => acc + m.coreCoverageRatio, 0);
  const sepSum = partMetrics.reduce((acc, m) => acc + m.chromaBoundarySeparationRatio, 0);
  return {
    referenceHeightPx,
    frameHeightsPx,
    partsHarvestedCount: partMetrics.length,
    averageCoreCoverageRatio: Number((covSum / partMetrics.length).toFixed(3)),
    averageChromaSeparationRatio: Number((sepSum / partMetrics.length).toFixed(3)),
    partMetrics,
  };
}

function writePhaseHarvestArtifacts(
  outputDir: string,
  frames: Readonly<Record<PhaseFrameId, RasterImage>>,
  bank: PhotorealPartBank,
  report: PhaseHarvestReport,
): void {
  const partsDir = path.join(outputDir, 'parts');
  fs.mkdirSync(partsDir, { recursive: true });
  for (const [partId, img] of Object.entries(bank) as [BodyPartId, RasterImage][]) {
    writePngFile(path.join(partsDir, `${partId}.png`), img);
  }
  fs.writeFileSync(path.join(outputDir, 'phase-harvest-report.json'), JSON.stringify(report, null, 2));
  const sheet = renderPhaseHarvestDiagnosticSheet(frames, bank);
  writePngFile(path.join(outputDir, 'phase-harvest-diagnostic-sheet.png'), sheet);
}

function renderPhaseHarvestDiagnosticSheet(
  frames: Readonly<Record<PhaseFrameId, RasterImage>>,
  bank: PhotorealPartBank,
): RasterImage {
  const sheet = createRaster(1100, 760);
  fillRaster(sheet, { r: 24, g: 28, b: 38, a: 255 });
  const frameIds: readonly PhaseFrameId[] = [
    'frame-00-neutral', 'phase-01-right-strike', 'phase-02-left-strike',
    'phase-03-midstance-knee', 'phase-04-flight-split',
  ];
  frameIds.forEach((fid, idx) => {
    blitScaledSourceFrameWithBoxes(sheet, frames[fid], fid, idx * 220 + 8, 8);
  });
  PHASE_FRAME_JIG_SPECS.forEach((spec, idx) => {
    const col = idx % 9;
    const row = Math.floor(idx / 9);
    const tile = bank[spec.partId];
    if (tile) {
      blitHarvestedJigTile(sheet, tile, col * 120 + 14, 240 + row * 120);
    }
  });
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
  const tunedRig = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning);
  [0, 0.25, 0.5, 0.75].forEach((phase, idx) => {
    const pose = solveArticulatedPose(phase, DEFAULT_GAIT_CONFIG, tunedRig);
    const rendered = createRaster(220, 256);
    renderPhotorealFemalePoseOntoCanvas(rendered, pose, RUNNER_PALETTES.red, {
      personaId: 'photo-sg-chinese-female',
      tuning,
      bankOverride: bank,
    });
    blitCompositeFrame(sheet, rendered, idx * 260 + 36, 488);
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
  const w = 204;
  const h = 216;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.round(420 + (x / w) * 560);
      const sy = Math.round(20 + (y / h) * 720);
      const p = readPixel(src, sx, sy);
      const bg = { r: 42, g: 47, b: 61, a: 255 };
      writePixel(dst, { x: ox + x, y: oy + y }, p.a > 64 ? p : bg);
    }
  }
  for (const spec of PHASE_FRAME_JIG_SPECS) {
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

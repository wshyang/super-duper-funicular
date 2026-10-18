import type { BodyPartId, Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import { sampleBilinearRgba } from '../runner/photoreal-warp.js';
import { purgeSkinPartFabricSpill } from './photoreal-matte-and-qc.js';
import { fillInteriorHandPinholes } from './side-profile-arm-extractor.js';
import { applyPivotArcRoundedCut } from './rounded-joint-cutter.js';
import { createRaster, readPixel, writePixel } from './raster.js';

interface SimilarityExtractSpec {
  readonly srcStart: Point2D;
  readonly srcEnd: Point2D;
  readonly dstStart: Point2D;
  readonly dstEnd: Point2D;
  readonly cropBox: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
  readonly shadeScale: number;
}

export function cleanAthleticTorsoNeckStub(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 0; y < 250; y++) {
    for (let x = 0; x < 760; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      const isSinglet = p.r > 115 && p.r - p.g > 55 && p.r > p.b * 1.35;
      const isWhiteStripe = p.r > 180 && p.g > 180 && p.b > 180;
      if (!isSinglet && !isWhiteStripe && (y < 155 || x < 645)) {
        writePixel(out, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
      }
    }
  }
  return out;
}

export function mirrorAthleticTorsoToRightProfile(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const sx = 158 - x;
      if (sx < 0 || sx >= src.width) continue;
      const p = readPixel(src, sx, y);
      if (p.a === 0) continue;
      if (x < 72 && y < 56) {
        const minAllowedY = 25 + (72 - x) * 0.52;
        if (y < minAllowedY) {
          const excess = minAllowedY - y;
          const alpha = excess >= 2.5 ? 0 : Math.round(p.a * (1 - excess / 2.5));
          if (alpha > 0) writePixel(out, { x, y }, { ...p, a: alpha });
          continue;
        }
      }
      writePixel(out, { x, y }, p);
    }
  }
  return out;
}

export function raiseAthleticBustLandmark(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  const topY = 24;
  const oldBustY = 67;
  const raisedBustY = 57;
  const bottomY = 122;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      let sourceY = y;
      if (y >= topY && y <= raisedBustY) {
        sourceY = topY + ((y - topY) * (oldBustY - topY)) / (raisedBustY - topY);
      } else if (y > raisedBustY && y <= bottomY) {
        sourceY = oldBustY + ((y - raisedBustY) * (bottomY - oldBustY)) / (bottomY - raisedBustY);
      }
      const bustInfluence = Math.max(0, 1 - Math.abs(sourceY - oldBustY) / 18);
      const anteriorScale = 1 - 0.22 * bustInfluence;
      const sourceX = x < 80 ? 80 + (x - 80) / anteriorScale : x;
      const p = sampleBilinearRgba(src, sourceX, sourceY);
      if (p.a > 0) writePixel(out, { x, y }, p);
    }
  }
  return out;
}

export function extractAthleticNeck(src: RasterImage): RasterImage {
  const neckSource = createRaster(src.width, src.height);
  for (let y = 350; y <= 424; y++) {
    const t = (y - 350) / 74;
    const minX = Math.round(672 + 12 * t);
    const maxX = Math.round(774 - 12 * t);
    for (let x = minX; x <= maxX; x++) {
      const p = readPixel(src, x, y);
      const isSkin = p.a > 32 && p.r > 95 && p.g > 55 && p.b > 32 &&
        p.r > p.g * 1.1 && p.g > p.b * 1.08 && p.g < 205 &&
        !(p.r > 135 && p.g < 52 && p.b < 65);
      if (isSkin) {
        const lum = (p.r + p.g + p.b) / 3;
        const boost = lum < 125 ? 125 / Math.max(60, lum) : 1.0;
        writePixel(neckSource, { x, y }, {
          r: Math.min(235, Math.round(p.r * boost)),
          g: Math.min(185, Math.round(p.g * boost)),
          b: Math.min(145, Math.round(p.b * boost)),
          a: 255,
        });
      }
    }
  }
  const cropped = extractAlignedPart(neckSource, {
    srcStart: { x: 724, y: 358 }, srcEnd: { x: 722, y: 420 },
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    cropBox: { minX: 660, minY: 348, maxX: 780, maxY: 426 }, shadeScale: 0.98,
  });
  return taperNeckCapsuleEdges(cropped);
}

function taperNeckCapsuleEdges(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    const tY = Math.max(0, Math.min(1, (y - 36) / 88));
    const halfW = 25.5 + 2.0 * tY;
    for (let x = 0; x < src.width; x++) {
      const dist = Math.abs(x - 80);
      if (dist > halfW) continue;
      const p = readPixel(src, x, y);
      if (p.a === 0) continue;
      const feather = dist > halfW - 2.5 ? Math.max(0, (halfW - dist) / 2.5) : 1.0;
      writePixel(out, { x, y }, { ...p, a: Math.round(p.a * feather) });
    }
  }
  const topRounded = applyPivotArcRoundedCut(out, {
    pivot: { x: 80, y: 36 }, radiusX: 26, radiusY: 25,
    cutSide: 'above', featherPx: 2.5,
  });
  return applyPivotArcRoundedCut(topRounded, {
    pivot: { x: 80, y: 124 }, radiusX: 28, radiusY: 25,
    cutSide: 'below', featherPx: 2.5,
  });
}

export function extractAthleticFarArmParts(
  src: RasterImage,
): Pick<Record<BodyPartId, RasterImage>, 'farUpperArm' | 'farForearm' | 'farHand'> {
  const farHand = extractAlignedPart(src, {
    srcStart: { x: 948, y: 560 }, srcEnd: { x: 1290, y: 550 },
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    cropBox: { minX: 925, minY: 360, maxX: 1320, maxY: 670 }, shadeScale: 1.05,
  });
  const farUpperArm = extractSegment(src, {
    srcStart: { x: 230, y: 180 }, srcEnd: { x: 490, y: 620 },
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    cropBox: { minX: 110, minY: 45, maxX: 555, maxY: 705 }, shadeScale: 0.96,
  }, 18);
  const farForearm = extractSegment(src, {
    srcStart: { x: 490, y: 620 }, srcEnd: { x: 930, y: 560 },
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    cropBox: { minX: 455, minY: 485, maxX: 990, maxY: 705 }, shadeScale: 1.02,
  }, 15);
  return {
    farUpperArm: purgeSkinPartFabricSpill(farUpperArm).cleaned,
    farForearm: purgeSkinPartFabricSpill(farForearm).cleaned,
    farHand: fillInteriorHandPinholes(purgeSkinPartFabricSpill(farHand).cleaned),
  };
}

function extractSegment(src: RasterImage, spec: SimilarityExtractSpec, radius: number): RasterImage {
  const raw = extractAlignedPart(src, spec);
  const topRounded = applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 36 }, radiusX: radius, radiusY: radius,
    cutSide: 'above', featherPx: 2.5,
  });
  return applyPivotArcRoundedCut(topRounded, {
    pivot: { x: 80, y: 124 }, radiusX: radius, radiusY: radius,
    cutSide: 'below', featherPx: 2.5,
  });
}

function extractAlignedPart(src: RasterImage, spec: SimilarityExtractSpec): RasterImage {
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
  const scale = srcLen / dstLen;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const rx = x - spec.dstStart.x;
      const ry = y - spec.dstStart.y;
      const along = (rx * dux + ry * duy) * scale;
      const across = (-rx * duy + ry * dux) * scale;
      const u = spec.srcStart.x + sux * along - suy * across;
      const v = spec.srcStart.y + suy * along + sux * across;
      const b = spec.cropBox;
      if (u < b.minX || u > b.maxX || v < b.minY || v > b.maxY) continue;
      const p = sampleBilinearRgba(src, u, v);
      if (p.a > 10) writePixel(out, { x, y }, shade(p, spec.shadeScale));
    }
  }
  return out;
}

function shade(p: RgbaColor, scale: number): RgbaColor {
  return { r: Math.round(p.r * scale), g: Math.round(p.g * scale), b: Math.round(p.b * scale), a: p.a };
}

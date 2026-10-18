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
  for (let y = 350; y <= 420; y++) {
    const t = (y - 350) / 70;
    const minX = Math.round(725 - 80 * t);
    const maxX = Math.round(765 - 65 * t + 15 * Math.sin(t * Math.PI));
    for (let x = minX; x <= maxX; x++) {
      const p = readPixel(src, x, y);
      const isSkin = p.a > 32 && p.r > 75 && p.g > 48 && p.b > 28 &&
        p.r > p.g * 1.08 && p.g > p.b * 1.08 && p.g < 205;
      if (isSkin) writePixel(neckSource, { x, y }, p);
    }
  }
  const cropped = extractAlignedPart(neckSource, {
    srcStart: { x: 748, y: 352 }, srcEnd: { x: 680, y: 410 },
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    cropBox: { minX: 640, minY: 345, maxX: 775, maxY: 425 }, shadeScale: 0.98,
  });
  return widenPart(cropped, 1.5);
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

function widenPart(src: RasterImage, scaleX: number): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = sampleBilinearRgba(src, 80 + (x - 80) / scaleX, y);
      if (p.a > 0) writePixel(out, { x, y }, p);
    }
  }
  return out;
}

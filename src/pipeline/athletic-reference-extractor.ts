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

export function extractAthleticTorso(src: RasterImage): RasterImage {
  const torso = extractAlignedPart(src, {
    srcStart: { x: 663, y: 165 }, srcEnd: { x: 706, y: 735 },
    dstStart: { x: 74, y: 24 }, dstEnd: { x: 80, y: 122 },
    cropBox: { minX: 534, minY: 142, maxX: 874, maxY: 760 }, shadeScale: 1.0,
  });
  return sealAthleticTorsoShoulderBulge(raiseAthleticBustLandmark(torso));
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

export function sealAthleticTorsoShoulderBulge(src: RasterImage): RasterImage {
  // The torso plate contains an attached upper-arm ball; the rig draws the arm
  // separately, so replace that flesh with singlet while keeping alpha solid.
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 20; y <= 72; y++) {
    const t = (y - 20) / 52;
    const shoulderSideX = Math.round(101 - 7 * Math.sin(Math.PI * t) + 3 * t);
    const naturalShoulderX = Math.round(88 + 0.42 * (y - 20));
    const maxShoulderX = Math.min(shoulderSideX, naturalShoulderX);
    if (y <= 64) {
      const fillStartX = 68;
      const fabric = findRowSinglet(out, y, fillStartX);
      for (let x = fillStartX; x <= maxShoulderX; x++) {
        const pixel = readPixel(out, x, y);
        const isWhiteStripe = pixel.r > 180 && pixel.g > 170 && pixel.b > 170;
        if (pixel.a > 0 && !isWhiteStripe) writePixel(out, { x, y }, { ...fabric, a: pixel.a });
      }
    }
    for (let x = maxShoulderX + 1; x <= 116; x++) {
      const p = readPixel(out, x, y);
      if (p.a > 0) writePixel(out, { x, y }, { ...p, a: 0 });
    }
  }
  return out;
}

function findRowSinglet(img: RasterImage, y: number, beforeX: number): RgbaColor {
  let refX = -1;
  for (let x = Math.min(beforeX - 1, 86); x >= 42; x--) {
    if (isSinglet(readPixel(img, x, y))) { refX = x; break; }
  }
  if (refX < 0) return { r: 146, g: 25, b: 42, a: 255 };
  let r = 0, g = 0, b = 0, count = 0;
  for (let yy = Math.max(0, y - 2); yy <= Math.min(img.height - 1, y + 2); yy++) {
    for (let x = Math.max(0, refX - 2); x <= Math.min(img.width - 1, refX + 2); x++) {
      const p = readPixel(img, x, yy);
      if (!isSinglet(p)) continue;
      r += p.r; g += p.g; b += p.b; count++;
    }
  }
  return count ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count), a: 255 } : { r: 146, g: 25, b: 42, a: 255 };
}

function isSinglet(p: RgbaColor): boolean {
  return p.a > 128 && p.r > p.g * 1.35 && p.g < 115 && p.b < 130;
}

export function extractAthleticNeck(src: RasterImage): RasterImage {
  const neckSource = createRaster(src.width, src.height);
  const topY = 224;
  const bottomY = 342;
  for (let y = topY; y <= bottomY; y++) {
    const t = (y - topY) / (bottomY - topY);
    const posteriorX = Math.round(684 - 52 * t);
    const anteriorX = Math.round(782 - 65 * t);
    for (let x = posteriorX; x <= anteriorX; x++) {
      const p = readPixel(src, x, y);
      if (isAthleticSkinPixel(p)) writePixel(neckSource, { x, y }, p);
    }
  }
  const aligned = extractAlignedPart(neckSource, {
    srcStart: { x: 772, y: 229 }, srcEnd: { x: 654, y: 338 },
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    cropBox: { minX: 610, minY: 220, maxX: 790, maxY: 345 }, shadeScale: 0.98,
  });
  return fillNarrowNeckGaps(aligned, 24);
}

function isAthleticSkinPixel(p: RgbaColor): boolean {
  return p.a > 32 && p.r > 75 && p.g > 48 && p.b > 28 &&
    p.r > p.g * 1.08 && p.g > p.b * 1.08 && p.g < 205;
}

function fillNarrowNeckGaps(src: RasterImage, maxGapPx: number): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 28; y <= 136; y++) {
    let previousOpaqueX = -1;
    for (let x = 0; x < src.width; x++) {
      if (readPixel(src, x, y).a <= 20) continue;
      if (previousOpaqueX >= 0 && x - previousOpaqueX - 1 > 0 && x - previousOpaqueX - 1 <= maxGapPx) {
        const left = readPixel(src, previousOpaqueX, y);
        const right = readPixel(src, x, y);
        if (isAthleticSkinPixel(left) && isAthleticSkinPixel(right)) {
          const gapLength = x - previousOpaqueX;
          for (let fillX = previousOpaqueX + 1; fillX < x; fillX++) {
            const t = (fillX - previousOpaqueX) / gapLength;
            writePixel(out, { x: fillX, y }, {
              r: Math.round(left.r + (right.r - left.r) * t),
              g: Math.round(left.g + (right.g - left.g) * t),
              b: Math.round(left.b + (right.b - left.b) * t),
              a: 255,
            });
          }
        }
      }
      previousOpaqueX = x;
    }
  }
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const p = readPixel(out, x, y);
      const clothingOrHair =
        (p.r > 135 && p.g < 52 && p.b < 65) ||
        (p.r < 45 && p.g < 45 && p.b < 45);
      if (p.a >= 128 && clothingOrHair) writePixel(out, { x, y }, { ...p, a: 0 });
    }
  }
  return out;
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

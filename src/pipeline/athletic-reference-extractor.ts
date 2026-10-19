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
  const cleaned = cleanAthleticTorsoNeckStub(src);
  const aligned = extractAlignedPart(cleaned, {
    srcStart: { x: 663, y: 165 }, srcEnd: { x: 706, y: 735 },
    dstStart: { x: 74, y: 24 }, dstEnd: { x: 80, y: 122 },
    cropBox: { minX: 495, minY: 162, maxX: 874, maxY: 760 }, shadeScale: 1.0,
  });
  const sealed = sealAthleticTorsoShoulderBulge(raiseAthleticBustLandmark(aligned));
  return mirrorAthleticTorsoToRightProfile(sealed);
}

export function sealAthleticTorsoShoulderBulge(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 20; y <= 72; y++) {
    const t = Math.max(0, (y - 20) / 52);
    const maxShoulderX = Math.round(90 + 16 * Math.pow(t, 0.72));
    if (y <= 64) {
      let fillStartX = 68;
      for (let x = 50; x <= 78; x++) {
        if (isSinglet(readPixel(out, x, y))) {
          fillStartX = Math.max(68, x);
          break;
        }
      }
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

export function cleanAthleticTorsoNeckStub(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 0; y < 250; y++) {
    for (let x = 0; x < 780; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      const isSinglet = p.r > 115 && p.r - p.g > 55 && p.r > p.b * 1.35;
      const isWhiteStripe = p.r > 180 && p.g > 180 && p.b > 180;
      if (y < 164 || (!isSinglet && !isWhiteStripe && (y < 172 || x < 672))) {
        writePixel(out, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
      }
    }
  }
  return out;
}

export function mirrorAthleticTorsoToRightProfile(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 25; y < src.height; y++) {
    const tCollar = Math.max(0, Math.min(1, (y - 25) / 35));
    const minBackX = 64 - 13 * Math.pow(tCollar, 0.78);
    const maxFrontX = y < 56 ? 75.5 + 30.5 * Math.pow((y - 25) / 31, 0.92) : 160;
    for (let x = 0; x < src.width; x++) {
      const sx = 158 - x;
      if (sx < 0 || sx >= src.width) continue;
      const p = readPixel(src, sx, y);
      if (p.a === 0) continue;
      let alpha = p.a;
      if (y < 30) {
        const collarArcY = 25.0 + 4.0 * Math.pow((x - 71.0) / 8.0, 2);
        if (y < collarArcY) {
          const excess = collarArcY - y;
          alpha = Math.min(alpha, excess >= 2.2 ? 0 : Math.round(p.a * (1 - excess / 2.2)));
        }
      }
      if (y < 60 && x < minBackX) {
        const excess = minBackX - x;
        alpha = Math.min(alpha, excess >= 2.5 ? 0 : Math.round(p.a * (1 - excess / 2.5)));
      }
      if (y < 56 && x > maxFrontX) {
        const excess = x - maxFrontX;
        alpha = Math.min(alpha, excess >= 2.5 ? 0 : Math.round(p.a * (1 - excess / 2.5)));
      }
      if (alpha > 0) writePixel(out, { x, y }, { ...p, a: alpha });
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
  for (let y = 310; y <= 445; y++) {
    const sampleY = Math.max(336, Math.min(408, y));
    for (let x = 654; x <= 780; x++) {
      const p = readPixel(src, x, sampleY);
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
    srcStart: { x: 718, y: 348 }, srcEnd: { x: 716, y: 406 },
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    cropBox: { minX: 654, minY: 310, maxX: 780, maxY: 445 }, shadeScale: 0.98,
  });
  return taperNeckCapsuleEdges(cropped);
}

function taperNeckCapsuleEdges(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  const rTop = 25.0;
  const rBot = 26.5;
  const featherPx = 2.5;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = readPixel(src, x, y);
      if (p.a === 0) continue;
      let dist = 0;
      let maxR = rTop;
      if (y < 36) {
        dist = Math.hypot(x - 80, y - 36);
        maxR = rTop;
      } else if (y > 124) {
        dist = Math.hypot(x - 80, y - 124);
        maxR = rBot;
      } else {
        const tY = (y - 36) / 88;
        dist = Math.abs(x - 80);
        maxR = rTop + (rBot - rTop) * tY;
      }
      if (dist > maxR) continue;
      const feather = dist > maxR - featherPx ? Math.max(0, (maxR - dist) / featherPx) : 1.0;
      const alpha = Math.round(p.a * feather);
      if (alpha > 0) writePixel(out, { x, y }, { ...p, a: alpha });
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

export function featherHeadNeckBase(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 98; y < src.height; y++) {
    const tY = Math.max(0, Math.min(1, (y - 100) / 22));
    const minBackX = 49.5 + 1.5 * tY;
    for (let x = 0; x < src.width; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      let r = p.r;
      let g = p.g;
      let b = p.b;
      if (x <= 96 && p.r > p.b + 15 && p.r > 95 && p.g > 60 && p.r < 194) {
        const lift = 0.55 * Math.min(1, (y - 96) / 14);
        r = Math.round(r * (1 - lift) + 202 * lift);
        g = Math.round(g * (1 - lift) + 142 * lift);
        b = Math.round(b * (1 - lift) + 102 * lift);
      }
      const backScale =
        x >= minBackX + 2.5 ? 1.0 : x <= minBackX ? 0.0 : (x - minBackX) / 2.5;
      const sSubmental = Math.max(0, Math.min(1, (x - 93) / 8));
      const backRaise = x < 73 ? 2.5 * Math.pow((73 - x) / 24, 2) : 0;
      const cutY = (121.5 - backRaise) * (1 - sSubmental) + 123.5 * sSubmental;
      const featherPx = 5.0 * (1 - sSubmental) + 1.5 * sSubmental;
      const vertScale =
        y <= cutY - featherPx ? 1.0 : y >= cutY ? 0.0 : (cutY - y) / featherPx;
      const alpha = Math.round(p.a * backScale * vertScale);
      writePixel(out, { x, y }, { r, g, b, a: alpha });
    }
  }
  return out;
}

export function harmonizeNeckToHeadSkin(neck: RasterImage, head: RasterImage): RasterImage {
  const headMean = sampleRegionSkinMean(head, 66, 84, 104, 115);
  const neckMean = sampleRegionSkinMean(neck, 70, 88, 38, 62);
  if (!headMean || !neckMean) return neck;
  const out = createRaster(neck.width, neck.height);
  const gainR = Math.max(0.76, Math.min(1.12, headMean.r / Math.max(1, neckMean.r)));
  const gainG = Math.max(0.76, Math.min(1.12, headMean.g / Math.max(1, neckMean.g)));
  const gainB = Math.max(0.76, Math.min(1.12, headMean.b / Math.max(1, neckMean.b)));
  for (let y = 0; y < neck.height; y++) {
    const t = Math.max(0, Math.min(1, (y - 52) / 68));
    const blend = 0.94 - 0.32 * t;
    const sR = 1 + (gainR - 1) * blend;
    const sG = 1 + (gainG - 1) * blend;
    const sB = 1 + (gainB - 1) * blend;
    for (let x = 0; x < neck.width; x++) {
      const p = readPixel(neck, x, y);
      if (p.a === 0) continue;
      writePixel(out, { x, y }, {
        r: Math.min(255, Math.round(p.r * sR)),
        g: Math.min(255, Math.round(p.g * sG)),
        b: Math.min(255, Math.round(p.b * sB)),
        a: p.a,
      });
    }
  }
  return out;
}

function sampleRegionSkinMean(
  img: RasterImage,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): { readonly r: number; readonly g: number; readonly b: number } | null {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = readPixel(img, x, y);
      if (p.a > 180 && p.r > p.b + 18 && p.r > 95) {
        r += p.r; g += p.g; b += p.b; n++;
      }
    }
  }
  return n > 0 ? { r: r / n, g: g / n, b: b / n } : null;
}


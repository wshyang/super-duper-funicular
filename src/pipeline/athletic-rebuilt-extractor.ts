import type { BodyPartId, Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import { sampleBilinearRgba } from '../runner/photoreal-warp.js';
import { applyPivotArcRoundedCut } from './rounded-joint-cutter.js';
import { removeSmallOpaqueIslands } from './connected-components.js';
import { extractAthleticNeck } from './athletic-reference-extractor.js';
import { createRaster, readPixel, writePixel } from './raster.js';

export interface RebuiltAthleticSources {
  readonly master: RasterImage;
  readonly neckProfile: RasterImage;
  readonly head: RasterImage;
  readonly ponytail: RasterImage;
  readonly torsoPortrait: RasterImage;
  readonly pelvis: RasterImage;
  readonly nearArm: RasterImage;
  readonly farArm: RasterImage;
  readonly nearLeg: RasterImage;
  readonly farLeg: RasterImage;
}

interface ExtractSpec {
  readonly srcStart: Point2D;
  readonly srcEnd: Point2D;
  readonly dstStart: Point2D;
  readonly dstEnd: Point2D;
  readonly crop: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
  readonly shade?: number;
}

export function extractRebuiltAthleticParts(
  src: RebuiltAthleticSources,
): Readonly<Record<BodyPartId, RasterImage>> {
  const parts: Record<BodyPartId, RasterImage> = {
    head: extractHead(src.head),
    hairAccessory: extractPonytail(src.ponytail),
    neck: extractAthleticNeck(src.neckProfile),
    torso: extractTorso(src.torsoPortrait),
    pelvis: refineAthleticPelvisContour(scaleHorizontally(extractPelvis(src.pelvis), 0.94)),
    ...extractNearArm(src.nearArm),
    ...extractFarArm(src.farArm),
    ...extractLegs(src.nearLeg, src.farLeg),
  };
  for (const id of Object.keys(parts) as BodyPartId[]) {
    parts[id] = removeSmallOpaqueIslands(parts[id], 4);
  }
  return parts;
}

function extractHead(src: RasterImage): RasterImage {
  return align(src, {
    srcStart: { x: 666, y: 66 }, srcEnd: { x: 772, y: 600 },
    dstStart: { x: 76, y: 12 }, dstEnd: { x: 74, y: 120 },
    crop: { minX: 340, minY: 58, maxX: 972, maxY: 615 },
  });
}

function extractPonytail(src: RasterImage): RasterImage {
  return align(src, {
    srcStart: { x: 1185, y: 205 }, srcEnd: { x: 210, y: 334 },
    dstStart: { x: 142, y: 82 }, dstEnd: { x: 14, y: 86 },
    crop: { minX: 195, minY: 115, maxX: 1260, maxY: 660 },
  });
}

function extractTorso(src: RasterImage): RasterImage {
  const crop = { minX: 590, minY: 285, maxX: 835, maxY: 765 };
  const torso = retainTorsoGarment(src, crop);
  const raw = align(torso, {
    srcStart: { x: 674, y: 302 }, srcEnd: { x: 723, y: 748 },
    dstStart: { x: 74, y: 24 }, dstEnd: { x: 80, y: 122 },
    crop,
  });
  return applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 122 }, radiusX: 31, radiusY: 20,
    cutSide: 'below', featherPx: 3.5,
  });
}

function extractPelvis(src: RasterImage): RasterImage {
  const crop = { minX: 475, minY: 155, maxX: 900, maxY: 620 };
  const cropped = extractMaterialRegion(src, crop);
  const raw = align(cropped, {
    srcStart: { x: 710, y: 188 }, srcEnd: { x: 724, y: 588 },
    dstStart: { x: 82, y: 28 }, dstEnd: { x: 78, y: 126 },
    crop,
  });
  const topRounded = applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 40 }, radiusX: 36, radiusY: 16,
    cutSide: 'above', featherPx: 3,
  });
  return applyPivotArcRoundedCut(topRounded, {
    pivot: { x: 76, y: 108 }, radiusX: 36, radiusY: 22,
    cutSide: 'below', featherPx: 3.5,
  });
}

function extractNearArm(src: RasterImage): Pick<Record<BodyPartId, RasterImage>, 'nearUpperArm' | 'nearForearm' | 'nearHand'> {
  return {
    nearUpperArm: cutBone(src, { x: 690, y: 55 }, { x: 686, y: 370 }, { minX: 610, minY: 28, maxX: 790, maxY: 390 }, 21, 15),
    nearForearm: cutBone(src, { x: 686, y: 370 }, { x: 710, y: 570 }, { minX: 620, minY: 345, maxX: 790, maxY: 600 }, 16, 13),
    nearHand: cutBone(src, { x: 710, y: 570 }, { x: 722, y: 732 }, { minX: 655, minY: 550, maxX: 790, maxY: 745 }, 13, 17),
  };
}

function extractFarArm(src: RasterImage): Pick<Record<BodyPartId, RasterImage>, 'farUpperArm' | 'farForearm' | 'farHand'> {
  return {
    farUpperArm: cutBone(src, { x: 425, y: 245 }, { x: 660, y: 650 }, { minX: 330, minY: 80, maxX: 710, maxY: 690 }, 21, 15),
    farForearm: scaleHorizontally(
      cutBone(src, { x: 660, y: 650 }, { x: 840, y: 430 }, { minX: 635, minY: 395, maxX: 900, maxY: 685 }, 16, 13),
      0.88,
    ),
    farHand: cutBone(src, { x: 840, y: 430 }, { x: 1030, y: 110 }, { minX: 820, minY: 75, maxX: 1060, maxY: 470 }, 13, 17),
  };
}

function extractLegs(
  near: RasterImage,
  far: RasterImage,
): Pick<Record<BodyPartId, RasterImage>, 'nearThigh' | 'nearShin' | 'nearFoot' | 'farThigh' | 'farShin' | 'farFoot'> {
  return {
    nearThigh: cutBone(near, { x: 710, y: 112 }, { x: 690, y: 386 }, { minX: 610, minY: 75, maxX: 810, maxY: 410 }, 25, 20),
    nearShin: cutBone(near, { x: 690, y: 386 }, { x: 680, y: 630 }, { minX: 610, minY: 355, maxX: 780, maxY: 655 }, 20, 14),
    nearFoot: extractFoot(near, { x: 640, y: 702 }, { x: 835, y: 710 }, { minX: 610, minY: 620, maxX: 850, maxY: 750 }, { x: 62, y: 82 }),
    farThigh: trimPosteriorShortsCuff(scaleHorizontally(
      cutBone(far, { x: 704, y: 110 }, { x: 690, y: 390 }, { minX: 610, minY: 75, maxX: 800, maxY: 420 }, 24, 19, 0.88),
      0.98,
    )),
    farShin: cutBone(far, { x: 690, y: 390 }, { x: 690, y: 640 }, { minX: 610, minY: 360, maxX: 790, maxY: 660 }, 19, 14, 0.88),
    farFoot: extractFoot(far, { x: 620, y: 710 }, { x: 850, y: 718 }, { minX: 605, minY: 625, maxX: 865, maxY: 755 }, { x: 60, y: 80 }, 0.88),
  };
}

function cutBone(
  src: RasterImage,
  start: Point2D,
  end: Point2D,
  crop: ExtractSpec['crop'],
  rTop: number,
  rBot: number,
  shade = 1,
): RasterImage {
  const raw = align(src, {
    srcStart: start, srcEnd: end,
    dstStart: { x: 80, y: 36 }, dstEnd: { x: 80, y: 124 },
    crop, shade,
  });
  const top = applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 36 }, radiusX: rTop, radiusY: rTop,
    cutSide: 'above', featherPx: 2.5,
  });
  return applyPivotArcRoundedCut(top, {
    pivot: { x: 80, y: 124 }, radiusX: rBot, radiusY: rBot,
    cutSide: 'below', featherPx: 2.5,
  });
}

function extractFoot(
  src: RasterImage,
  start: Point2D,
  end: Point2D,
  crop: ExtractSpec['crop'],
  anklePivot: Point2D,
  shade = 1,
): RasterImage {
  const raw = align(src, {
    srcStart: start, srcEnd: end,
    dstStart: { x: 38, y: 112 }, dstEnd: { x: 136, y: 118 },
    crop, shade,
  });
  return applyPivotArcRoundedCut(raw, {
    pivot: anklePivot, radiusX: 18, radiusY: 14,
    cutSide: 'above', featherPx: 2.5,
  });
}

function scaleHorizontally(src: RasterImage, factor: number): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = sampleBilinearRgba(src, 80 + (x - 80) / factor, y);
      if (p.a > 8) writePixel(out, { x, y }, p);
    }
  }
  return out;
}

function refineAthleticPelvisContour(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    const t = Math.max(0, Math.min(1, (y - 32) / 88));
    const posteriorScale = 0.93 - 0.23 * Math.sin(Math.PI * t);
    for (let x = 0; x < src.width; x++) {
      const sourceX = x < 80 ? 80 + (x - 80) / posteriorScale : x;
      const p = sampleBilinearRgba(src, sourceX, y);
      if (p.a > 8) writePixel(out, { x, y }, p);
    }
  }
  return out;
}

function trimPosteriorShortsCuff(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 18; y <= 52; y++) {
    const posteriorCut = Math.round(72 + ((y - 18) / 34) * 8);
    for (let x = 0; x < posteriorCut; x++) {
      const p = readPixel(out, x, y);
      const isShortsFabric = p.a > 0 && p.r < 96 && p.g < 100 && p.b < 112;
      if (isShortsFabric) writePixel(out, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
    }
  }
  return out;
}

function retainTorsoGarment(src: RasterImage, crop: ExtractSpec['crop']): RasterImage {
  return retainRegion(src, crop, (p) => {
    if (p.a === 0) return false;
    const isWhiteStripe = p.r > 180 && p.g > 170 && p.b > 170;
    const isSinglet = p.r - p.g >= 55 && p.g < p.r * 0.56 && p.b < p.r * 0.5;
    return isWhiteStripe || isSinglet;
  });
}

function extractMaterialRegion(src: RasterImage, region: ExtractSpec['crop']): RasterImage {
  return retainRegion(src, region, (p) => p.a > 0 && !(p.r > p.g * 1.2 && p.b > p.g * 1.15));
}

function retainRegion(
  src: RasterImage,
  region: ExtractSpec['crop'],
  keep: (p: RgbaColor, x: number, y: number) => boolean,
): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = Math.max(0, region.minY); y <= Math.min(src.height - 1, region.maxY); y++) {
    for (let x = Math.max(0, region.minX); x <= Math.min(src.width - 1, region.maxX); x++) {
      const p = readPixel(src, x, y);
      if (keep(p, x, y)) writePixel(out, { x, y }, p);
    }
  }
  return out;
}

function align(src: RasterImage, spec: ExtractSpec): RasterImage {
  const out = createRaster(160, 160);
  const sx = spec.srcEnd.x - spec.srcStart.x;
  const sy = spec.srcEnd.y - spec.srcStart.y;
  const dx = spec.dstEnd.x - spec.dstStart.x;
  const dy = spec.dstEnd.y - spec.dstStart.y;
  const srcLength = Math.max(1, Math.hypot(sx, sy));
  const dstLength = Math.max(1, Math.hypot(dx, dy));
  const scale = srcLength / dstLength;
  const sux = sx / srcLength;
  const suy = sy / srcLength;
  const dux = dx / dstLength;
  const duy = dy / dstLength;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const rx = x - spec.dstStart.x;
      const ry = y - spec.dstStart.y;
      const along = (rx * dux + ry * duy) * scale;
      const across = (-rx * duy + ry * dux) * scale;
      const u = spec.srcStart.x + sux * along - suy * across;
      const v = spec.srcStart.y + suy * along + sux * across;
      if (u < spec.crop.minX || u > spec.crop.maxX || v < spec.crop.minY || v > spec.crop.maxY) continue;
      const p = sampleBilinearRgba(src, u, v);
      if (p.a > 10) writePixel(out, { x, y }, shade(p, spec.shade ?? 1));
    }
  }
  return out;
}

function shade(p: RgbaColor, scale: number): RgbaColor {
  return { r: Math.round(p.r * scale), g: Math.round(p.g * scale), b: Math.round(p.b * scale), a: p.a };
}

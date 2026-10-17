import fs from 'node:fs';
import path from 'node:path';
import type { BodyPartId, Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import {
  type PhotorealPartBank,
  setPhotorealFemalePartBank,
} from '../runner/photoreal-rig.js';
import { sampleBilinearRgba } from '../runner/photoreal-warp.js';
import { readImageFile, writePngFile } from './image-io.js';
import { createRaster, readPixel, writePixel } from './raster.js';
import {
  applyPivotArcRoundedCut,
  cutArticulatedLimbWithRoundedEnds,
  cutHorizontalLimbWithRoundedEnds,
} from './rounded-joint-cutter.js';

export interface PhotorealSourceSet {
  readonly masterLateral: RasterImage;
  readonly headProfile: RasterImage;
  readonly ponytail: RasterImage;
  readonly neckCylinder: RasterImage;
  readonly torsoSinglet: RasterImage;
  readonly pelvisShorts: RasterImage;
  readonly nearArmLateral: RasterImage;
  readonly farArmMedial: RasterImage;
  readonly nearLegLateral: RasterImage;
  readonly farLegMedial: RasterImage;
}

const STUDIO_FILES: Readonly<Record<keyof PhotorealSourceSet, string>> = {
  masterLateral: '01-master-lateral-profile-reference.png',
  headProfile: '02-head-profile-right.png',
  ponytail: '03-ponytail-hair-accessory.png',
  neckCylinder: '04-cervical-neck-cylinder.png',
  torsoSinglet: '05-torso-racerback-singlet.png',
  pelvisShorts: '06-pelvis-sprinter-shorts.png',
  nearArmLateral: '07-near-right-arm-lateral-outside.png',
  farArmMedial: '08-far-left-arm-medial-inside-palm.png',
  nearLegLateral: '09-near-right-leg-lateral-outside-shoe.png',
  farLegMedial: '10-far-left-leg-medial-inside-shoe.png',
};

export function extractAndLoadPhotorealFemaleParts(
  repoRoot: string,
): PhotorealPartBank {
  const sourceDir = path.join(repoRoot, 'src/images/photoreal-female');
  const outDir = path.join(
    repoRoot,
    'public/sprites/photoreal/sg-chinese-female/parts',
  );
  const sources = loadAndKeyPhotorealSources(sourceDir);
  const bank = extractPhotorealSpriteParts(sources);
  writePhotorealPartCutouts(bank, outDir);
  setPhotorealFemalePartBank(bank);
  return bank;
}

export function loadAndKeyPhotorealSources(
  sourceDir: string,
): PhotorealSourceSet {
  const loaded = {} as Record<keyof PhotorealSourceSet, RasterImage>;
  for (const [key, filename] of Object.entries(STUDIO_FILES) as ReadonlyArray<
    [keyof PhotorealSourceSet, string]
  >) {
    const raw = readImageFile(path.join(sourceDir, filename));
    loaded[key] = keyStudioMagenta(raw);
  }
  return loaded;
}

export function keyStudioMagenta(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = readPixel(src, x, y);
      const cleaned = despillAndKeyPixel(p);
      if (cleaned.a > 0) writePixel(out, { x, y }, cleaned);
    }
  }
  return erodeAndFeatherFringe(out);
}

function despillAndKeyPixel(p: RgbaColor): RgbaColor {
  const rg = p.r - p.g;
  const bg = p.b - p.g;
  const rbDiff = Math.abs(p.r - p.b);
  const isBg = p.r > 132 && p.b > 110 && rg > 38 && bg > 28 && rbDiff < 66;
  if (isBg) return { r: 0, g: 0, b: 0, a: 0 };
  const spill = Math.max(0, Math.min(rg, bg) - 14);
  if (spill <= 0) return { r: p.r, g: p.g, b: p.b, a: 255 };
  const alpha = rbDiff < 45 && spill > 24 ? Math.max(0, 255 - spill * 5) : 255;
  return {
    r: Math.max(0, p.r - Math.round(spill * 0.48)),
    g: Math.min(255, p.g + Math.round(spill * 0.16)),
    b: Math.max(0, p.b - Math.round(spill * 0.65)),
    a: alpha,
  };
}

function erodeAndFeatherFringe(img: RasterImage): RasterImage {
  const out = createRaster(img.width, img.height);
  for (let y = 1; y < img.height - 1; y++) {
    for (let x = 1; x < img.width - 1; x++) {
      const c = readPixel(img, x, y);
      if (c.a === 0) continue;
      const n = countTransparentNeighbors(img, x, y);
      if (n >= 3) continue;
      const alphaScale = n === 2 ? 0.5 : n === 1 ? 0.82 : 1.0;
      writePixel(
        out,
        { x, y },
        { r: c.r, g: c.g, b: c.b, a: Math.round(c.a * alphaScale) },
      );
    }
  }
  return out;
}

function countTransparentNeighbors(
  img: RasterImage,
  x: number,
  y: number,
): number {
  let count = 0;
  if (readPixel(img, x - 1, y).a === 0) count++;
  if (readPixel(img, x + 1, y).a === 0) count++;
  if (readPixel(img, x, y - 1).a === 0) count++;
  if (readPixel(img, x, y + 1).a === 0) count++;
  return count;
}

export function extractPhotorealSpriteParts(
  sources: PhotorealSourceSet,
): Readonly<Record<BodyPartId, RasterImage>> {
  const nearArm = softenInteriorShadowGrooves(sources.nearArmLateral);
  const farArm = sources.farArmMedial;
  const nearLeg = softenInteriorShadowGrooves(sources.nearLegLateral);
  const farLeg = softenInteriorShadowGrooves(sources.farLegMedial);
  return {
    head: extractHeadCutout(sources.headProfile),
    hairAccessory: extractPonytailCutout(sources.ponytail),
    neck: extractNeckCutout(sources.neckCylinder),
    torso: extractTorsoCutout(sources.torsoSinglet),
    pelvis: extractPelvisCutout(sources.pelvisShorts),
    ...extractArmCutouts(nearArm, farArm),
    ...extractLegCutouts(nearLeg, farLeg),
  };
}

function softenInteriorShadowGrooves(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 10; y < src.height - 10; y++) {
    let minX = src.width;
    let maxX = -1;
    for (let x = 0; x < src.width; x++) {
      if (readPixel(src, x, y).a > 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    const span = maxX - minX;
    if (span < 28) continue;
    const refL = readPixel(src, minX + Math.round(span * 0.25), y);
    const refR = readPixel(src, minX + Math.round(span * 0.75), y);
    const refLum = (refL.r + refL.g + refL.b + refR.r + refR.g + refR.b) / 6;
    for (let x = minX + 4; x <= maxX - 4; x++) {
      const p = readPixel(src, x, y);
      const lum = (p.r + p.g + p.b) / 3;
      if (lum < refLum * 0.85 && p.r > p.b) {
        const t = (x - minX) / span;
        const targetR = refL.r * (1 - t) + refR.r * t;
        const targetG = refL.g * (1 - t) + refR.g * t;
        const targetB = refL.b * (1 - t) + refR.b * t;
        writePixel(
          out,
          { x, y },
          {
            r: Math.round(p.r * 0.35 + targetR * 0.65),
            g: Math.round(p.g * 0.35 + targetG * 0.65),
            b: Math.round(p.b * 0.35 + targetB * 0.65),
            a: p.a,
          },
        );
      }
    }
  }
  return out;
}

function extractHeadCutout(src: RasterImage): RasterImage {
  const raw = extractSimilarityAlignedPart(src, {
    srcStart: { x: 650, y: 70 },
    srcEnd: { x: 650, y: 555 },
    dstStart: { x: 76, y: 12 },
    dstEnd: { x: 76, y: 120 },
    cropBox: { minX: 425, minY: 55, maxX: 912, maxY: 605 },
    shadeScale: 1.0,
  });
  return applyPivotArcRoundedCut(raw, {
    pivot: { x: 66, y: 121 },
    radiusX: 35,
    radiusY: 11,
    cutSide: 'below',
    featherPx: 2.5,
  });
}

function extractPonytailCutout(src: RasterImage): RasterImage {
  return extractSimilarityAlignedPart(src, {
    srcStart: { x: 1235, y: 380 },
    srcEnd: { x: 110, y: 405 },
    dstStart: { x: 142, y: 82 },
    dstEnd: { x: 14, y: 86 },
    cropBox: { minX: 88, minY: 184, maxX: 1266, maxY: 578 },
    shadeScale: 1.0,
  });
}

function extractNeckCutout(src: RasterImage): RasterImage {
  return cutArticulatedLimbWithRoundedEnds(src, {
    srcTopY: 340,
    srcBotY: 540,
    dstRadiusTopPx: 28,
    dstRadiusBotPx: 31,
    roundTopEnd: true,
    roundBotEnd: true,
    shadeScale: 0.98,
  });
}

function extractTorsoCutout(src: RasterImage): RasterImage {
  const cleaned = cleanTorsoNeckStubAndSocket(src);
  const raw = extractSimilarityAlignedPart(cleaned, {
    srcStart: { x: 663, y: 165 },
    srcEnd: { x: 706, y: 690 },
    dstStart: { x: 74, y: 24 },
    dstEnd: { x: 80, y: 128 },
    cropBox: { minX: 534, minY: 142, maxX: 874, maxY: 724 },
    shadeScale: 1.0,
  });
  return applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 112 },
    radiusX: 32,
    radiusY: 22,
    cutSide: 'below',
    featherPx: 3.5,
  });
}

function cleanTorsoNeckStubAndSocket(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 0; y < 225; y++) {
    for (let x = 560; x < 790; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      const isCrimsonStrap = p.r - p.g > 68 && p.r > 135;
      if (!isCrimsonStrap && y < 192) {
        writePixel(out, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
      }
    }
  }
  const cx = 678;
  const cy = 310;
  const rOuter = 82;
  for (let y = cy - rOuter; y <= cy + rOuter; y++) {
    const refSkin = readPixel(out, 612, Math.max(225, Math.min(395, y)));
    for (let x = cx - rOuter; x <= cx + rOuter; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > rOuter) continue;
      const cur = readPixel(out, x, y);
      if (cur.a < 128 || cur.r - cur.g > 65) continue;
      const blend = Math.max(0, Math.min(1, (rOuter - dist) / 18)) * 0.92;
      writePixel(
        out,
        { x, y },
        {
          r: Math.round(cur.r * (1 - blend) + refSkin.r * blend),
          g: Math.round(cur.g * (1 - blend) + refSkin.g * blend),
          b: Math.round(cur.b * (1 - blend) + refSkin.b * blend),
          a: cur.a,
        },
      );
    }
  }
  return out;
}

function extractPelvisCutout(src: RasterImage): RasterImage {
  const raw = extractSimilarityAlignedPart(src, {
    srcStart: { x: 718, y: 95 },
    srcEnd: { x: 702, y: 695 },
    dstStart: { x: 82, y: 28 },
    dstEnd: { x: 78, y: 126 },
    cropBox: { minX: 435, minY: 40, maxX: 918, maxY: 732 },
    shadeScale: 1.0,
  });
  const topRounded = applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 40 },
    radiusX: 36,
    radiusY: 16,
    cutSide: 'above',
    featherPx: 3.0,
  });
  return applyPivotArcRoundedCut(topRounded, {
    pivot: { x: 76, y: 108 },
    radiusX: 36,
    radiusY: 22,
    cutSide: 'below',
    featherPx: 3.5,
  });
}

function cutLimbBothEnds(
  src: RasterImage,
  srcTopY: number,
  srcBotY: number,
  rTop: number,
  rBot: number,
  shadeScale: number,
): RasterImage {
  return cutArticulatedLimbWithRoundedEnds(src, {
    srcTopY,
    srcBotY,
    dstRadiusTopPx: rTop,
    dstRadiusBotPx: rBot,
    roundTopEnd: true,
    roundBotEnd: true,
    shadeScale,
  });
}

function extractArmCutouts(
  nearArm: RasterImage,
  farArm: RasterImage,
): Pick<
  Record<BodyPartId, RasterImage>,
  | 'nearUpperArm'
  | 'nearForearm'
  | 'nearHand'
  | 'farUpperArm'
  | 'farForearm'
  | 'farHand'
> {
  return {
    nearUpperArm: cutLimbBothEnds(nearArm, 140, 380, 25, 18, 1.0),
    nearForearm: cutLimbBothEnds(nearArm, 390, 618, 18, 15, 1.0),
    nearHand: cutLimbBothEnds(nearArm, 605, 722, 16, 21, 1.0),
    farUpperArm: cutArticulatedLimbWithRoundedEnds(farArm, {
      srcTopY: 140,
      srcBotY: 485,
      srcMaxX: 500,
      dstRadiusTopPx: 24,
      dstRadiusBotPx: 18,
      roundTopEnd: true,
      roundBotEnd: true,
      shadeScale: 0.9,
    }),
    farForearm: cutHorizontalLimbWithRoundedEnds(farArm, {
      srcLeftX: 430,
      srcRightX: 925,
      srcMinY: 495,
      dstRadiusTopPx: 18,
      dstRadiusBotPx: 15,
      shadeScale: 0.9,
    }),
    farHand: cutHorizontalLimbWithRoundedEnds(farArm, {
      srcLeftX: 895,
      srcRightX: 1135,
      srcMinY: 455,
      dstRadiusTopPx: 16,
      dstRadiusBotPx: 21,
      shadeScale: 0.9,
    }),
  };
}

function extractLegCutouts(
  nearLeg: RasterImage,
  farLeg: RasterImage,
): Pick<
  Record<BodyPartId, RasterImage>,
  'nearThigh' | 'nearShin' | 'nearFoot' | 'farThigh' | 'farShin' | 'farFoot'
> {
  return {
    nearThigh: cutLimbBothEnds(nearLeg, 175, 380, 26, 20, 1.0),
    nearShin: cutLimbBothEnds(nearLeg, 390, 635, 20, 14, 1.0),
    nearFoot: extractFootWithRoundedAnkleCut(nearLeg, {
      srcStart: { x: 632, y: 702 },
      srcEnd: { x: 822, y: 716 },
      cropBox: { minX: 615, minY: 625, maxX: 830, maxY: 734 },
      anklePivot: { x: 62, y: 82 },
      shadeScale: 1.0,
    }),
    farThigh: cutLimbBothEnds(farLeg, 115, 375, 25, 20, 0.88),
    farShin: cutLimbBothEnds(farLeg, 385, 610, 20, 14, 0.88),
    farFoot: extractFootWithRoundedAnkleCut(farLeg, {
      srcStart: { x: 632, y: 690 },
      srcEnd: { x: 846, y: 706 },
      cropBox: { minX: 626, minY: 595, maxX: 856, maxY: 718 },
      anklePivot: { x: 60, y: 80 },
      shadeScale: 0.88,
    }),
  };
}

function extractFootWithRoundedAnkleCut(
  src: RasterImage,
  spec: {
    readonly srcStart: Point2D;
    readonly srcEnd: Point2D;
    readonly cropBox: {
      readonly minX: number;
      readonly minY: number;
      readonly maxX: number;
      readonly maxY: number;
    };
    readonly anklePivot: Point2D;
    readonly shadeScale: number;
  },
): RasterImage {
  const raw = extractSimilarityAlignedPart(src, {
    srcStart: spec.srcStart,
    srcEnd: spec.srcEnd,
    dstStart: { x: 38, y: 112 },
    dstEnd: { x: 136, y: 118 },
    cropBox: spec.cropBox,
    shadeScale: spec.shadeScale,
  });
  return applyPivotArcRoundedCut(raw, {
    pivot: spec.anklePivot,
    radiusX: 18,
    radiusY: 14,
    cutSide: 'above',
    featherPx: 2.5,
  });
}

interface SimilarityExtractSpec {
  readonly srcStart: Point2D;
  readonly srcEnd: Point2D;
  readonly dstStart: Point2D;
  readonly dstEnd: Point2D;
  readonly cropBox: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  readonly shadeScale: number;
}

function extractSimilarityAlignedPart(
  src: RasterImage,
  spec: SimilarityExtractSpec,
): RasterImage {
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
  const { minX, maxX, minY, maxY } = spec.cropBox;

  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const rx = x - spec.dstStart.x;
      const ry = y - spec.dstStart.y;
      const along = (rx * dux + ry * duy) * scale;
      const across = (-rx * duy + ry * dux) * scale;
      const u = spec.srcStart.x + sux * along - suy * across;
      const v = spec.srcStart.y + suy * along + sux * across;
      if (u < minX || u > maxX || v < minY || v > maxY) continue;
      const c = sampleBilinearRgba(src, u, v);
      if (c.a > 10) writeShadedExtractedPixel(out, { x, y }, c, spec.shadeScale);
    }
  }
  return out;
}

function writeShadedExtractedPixel(
  out: RasterImage,
  pt: Point2D,
  c: RgbaColor,
  shadeScale: number,
): void {
  writePixel(out, pt, {
    r: Math.round(c.r * shadeScale),
    g: Math.round(c.g * shadeScale),
    b: Math.round(c.b * shadeScale),
    a: c.a,
  });
}

export function writePhotorealPartCutouts(
  bank: PhotorealPartBank,
  outputDir: string,
): readonly string[] {
  fs.mkdirSync(outputDir, { recursive: true });
  const paths: string[] = [];
  for (const [partId, img] of Object.entries(bank) as ReadonlyArray<
    [BodyPartId, RasterImage | undefined]
  >) {
    if (!img) continue;
    const outPath = path.join(outputDir, `${partId}.png`);
    writePngFile(outPath, img);
    paths.push(outPath);
  }
  return paths;
}

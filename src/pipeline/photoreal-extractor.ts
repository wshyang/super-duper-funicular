import fs from 'node:fs';
import path from 'node:path';
import type {
  BodyPartId,
  PhotorealPersonaId,
  Point2D,
  RasterImage,
  RgbaColor,
} from '../shared/types.js';
import {
  type PhotorealPartBank,
  setPhotorealFemalePartBank,
  setPhotorealPartBankForPersona,
} from '../runner/photoreal-rig.js';
import { sampleBilinearRgba } from '../runner/photoreal-warp.js';
import { readImageFile, writePngFile } from './image-io.js';
import {
  fillHollowJointBallByJacobiRelaxation,
  purgeSkinPartFabricSpill,
} from './photoreal-matte-and-qc.js';
import { createRaster, readPixel, writePixel } from './raster.js';
import {
  applyPivotArcRoundedCut,
  cutArticulatedLimbWithRoundedEnds,
  cutHorizontalLimbWithRoundedEnds,
} from './rounded-joint-cutter.js';
import {
  cleanAverageTorsoNeckStub,
  extractArmSegmentsFromMasterSideProfile,
  normalizeFingertipMagentaShadow,
} from './side-profile-arm-extractor.js';

export { extractArmSegmentsFromMasterSideProfile };

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
  const athleticBank = extractAndLoadPhotorealPartsForPersona(
    repoRoot,
    'photo-sg-chinese-female',
  );
  const avgSourceDir = path.join(repoRoot, 'src/images/photoreal-female-average');
  if (fs.existsSync(avgSourceDir)) {
    extractAndLoadPhotorealPartsForPersona(
      repoRoot,
      'photo-sg-chinese-female-average',
    );
  }
  return athleticBank;
}

export function extractAndLoadPhotorealPartsForPersona(
  repoRoot: string,
  personaId: PhotorealPersonaId,
): PhotorealPartBank {
  const isAvg = personaId === 'photo-sg-chinese-female-average';
  const sourceDir = path.join(
    repoRoot,
    isAvg ? 'src/images/photoreal-female-average' : 'src/images/photoreal-female',
  );
  const outDir = path.join(
    repoRoot,
    isAvg
      ? 'public/sprites/photoreal/sg-chinese-female-average/parts'
      : 'public/sprites/photoreal/sg-chinese-female/parts',
  );
  const sources = loadAndKeyPhotorealSources(sourceDir);
  const bank = extractPhotorealSpriteParts(sources, personaId);
  writePhotorealPartCutouts(bank, outDir);
  setPhotorealPartBankForPersona(personaId, bank);
  if (!isAvg) {
    setPhotorealFemalePartBank(bank);
  }
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
  personaId: PhotorealPersonaId = 'photo-sg-chinese-female',
): Readonly<Record<BodyPartId, RasterImage>> {
  const isAvg = personaId === 'photo-sg-chinese-female-average';
  const nearArm = softenInteriorShadowGrooves(sources.nearArmLateral);
  const farArm = sources.farArmMedial;
  const nearLeg = softenInteriorShadowGrooves(sources.nearLegLateral);
  const farLeg = softenInteriorShadowGrooves(sources.farLegMedial);
  const cleanShorts = stripPelvisShortsSkinFringe(sources.pelvisShorts, isAvg);
  return {
    head: extractHeadCutout(sources.headProfile),
    hairAccessory: extractPonytailCutout(sources.ponytail),
    neck: extractNeckCutout(sources.neckCylinder, isAvg),
    torso: extractTorsoCutout(sources.torsoSinglet, isAvg),
    pelvis: extractPelvisCutout(cleanShorts, isAvg),
    ...extractArmCutouts(nearArm, farArm, isAvg),
    ...extractLegCutouts(nearLeg, farLeg, cleanShorts, isAvg),
  };
}

function stripPelvisShortsSkinFringe(
  src: RasterImage,
  isAvg = false,
): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  const botCutY = isAvg ? 495 : 650;
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      const isWarmSkin = p.r > 110 && p.r - p.b > 22 && p.g - p.b > 8;
      if (isWarmSkin && (y < 130 || y > botCutY)) {
        writePixel(out, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
      }
    }
  }
  return out;
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

function extractNeckCutout(src: RasterImage, isAvg = false): RasterImage {
  const purged = purgeSkinPartFabricSpill(src).cleaned;
  const raw = cutArticulatedLimbWithRoundedEnds(purged, {
    srcTopY: isAvg ? 235 : 340,
    srcBotY: isAvg ? 585 : 540,
    dstRadiusTopPx: isAvg ? 35 : 28,
    dstRadiusBotPx: isAvg ? 39 : 31,
    roundTopEnd: true,
    roundBotEnd: true,
    shadeScale: 0.98,
  });
  return fillHollowJointBallByJacobiRelaxation(raw, {
    pivot: { x: 80, y: 36 },
    radiusPx: isAvg ? 33 : 26,
  });
}

function extractTorsoCutout(src: RasterImage, isAvg = false): RasterImage {
  const cleaned = isAvg
    ? cleanAverageTorsoNeckStub(src)
    : cleanTorsoNeckStubAndSocket(src);
  const raw = extractSimilarityAlignedPart(cleaned, {
    srcStart: isAvg ? { x: 682, y: 182 } : { x: 663, y: 165 },
    srcEnd: isAvg ? { x: 712, y: 585 } : { x: 706, y: 605 },
    dstStart: isAvg ? { x: 74, y: 22 } : { x: 74, y: 24 },
    dstEnd: isAvg ? { x: 80, y: 124 } : { x: 80, y: 122 },
    cropBox: isAvg
      ? { minX: 525, minY: 138, maxX: 880, maxY: 665 }
      : { minX: 534, minY: 142, maxX: 874, maxY: 612 },
    shadeScale: 1.0,
  });
  return applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: isAvg ? 114 : 108 },
    radiusX: isAvg ? 46 : 31,
    radiusY: 20,
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
  const cx = 674;
  const cy = 295;
  const rOuter = 94;
  const baseSkin = { r: 218, g: 162, b: 118, a: 255 };
  for (let y = cy - rOuter; y <= cy + rOuter; y++) {
    const rowSkin = readPixel(out, 602, Math.max(260, Math.min(360, y)));
    const isRowSkin =
      rowSkin.a > 200 && rowSkin.r - rowSkin.g < 70 && rowSkin.g > 125;
    const refSkin = isRowSkin ? rowSkin : baseSkin;
    for (let x = cx - rOuter; x <= cx + rOuter; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > rOuter) continue;
      const cur = readPixel(out, x, y);
      const isSingletFabric = dist >= 72 && cur.r - cur.g > 72 && cur.g < 95;
      if (cur.a < 128 || isSingletFabric) continue;
      const blend =
        dist < 72 ? 0.96 : Math.max(0, Math.min(1, (rOuter - dist) / 22)) * 0.95;
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

function extractPelvisCutout(src: RasterImage, isAvg = false): RasterImage {
  const raw = extractSimilarityAlignedPart(src, {
    srcStart: isAvg ? { x: 708, y: 100 } : { x: 718, y: 95 },
    srcEnd: isAvg ? { x: 704, y: 575 } : { x: 702, y: 695 },
    dstStart: { x: 82, y: 28 },
    dstEnd: { x: 78, y: 126 },
    cropBox: isAvg
      ? { minX: 465, minY: 85, maxX: 935, maxY: 590 }
      : { minX: 435, minY: 40, maxX: 918, maxY: 732 },
    shadeScale: 1.0,
  });
  if (!isAvg) {
    for (let y = 20; y < raw.height; y++) {
      const refFabric = readPixel(raw, 60, y);
      if (refFabric.a < 128) continue;
      for (let x = 66; x <= 96; x++) {
        const p = readPixel(raw, x, y);
        if (p.a > 32 && p.r > 70 && p.g > 70 && p.b > 70) {
          writePixel(raw, { x, y }, { ...refFabric, a: p.a });
        }
      }
    }
  }
  const topRounded = applyPivotArcRoundedCut(raw, {
    pivot: { x: 80, y: 40 },
    radiusX: isAvg ? 45 : 36,
    radiusY: 16,
    cutSide: 'above',
    featherPx: 3.0,
  });
  return applyPivotArcRoundedCut(topRounded, {
    pivot: { x: 76, y: 108 },
    radiusX: isAvg ? 45 : 36,
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
  isAvg = false,
): Pick<
  Record<BodyPartId, RasterImage>,
  | 'nearUpperArm'
  | 'nearForearm'
  | 'nearHand'
  | 'farUpperArm'
  | 'farForearm'
  | 'farHand'
> {
  const cleanNear = normalizeFingertipMagentaShadow(
    purgeSkinPartFabricSpill(nearArm).cleaned,
  );
  const cleanFar = purgeSkinPartFabricSpill(farArm).cleaned;
  return {
    ...extractNearArmParts(cleanNear, isAvg),
    ...extractFarArmParts(cleanFar, isAvg),
  };
}

function extractNearArmParts(
  cleanNear: RasterImage,
  isAvg: boolean,
): Pick<Record<BodyPartId, RasterImage>, 'nearUpperArm' | 'nearForearm' | 'nearHand'> {
  const rUpTop = isAvg ? 26 : 21;
  const rUpBot = isAvg ? 19 : 15;
  const rForeTop = isAvg ? 19 : 15;
  const rForeBot = isAvg ? 15 : 13;
  const rawUpper = cutLimbBothEnds(cleanNear, 120, 355, rUpTop, rUpBot, 1.0);
  return {
    nearUpperArm: purgeSkinPartFabricSpill(softenProximalShoulderCap(rawUpper)).cleaned,
    nearForearm: purgeSkinPartFabricSpill(
      cutLimbBothEnds(cleanNear, 365, 602, rForeTop, rForeBot, 1.0),
    ).cleaned,
    nearHand: purgeSkinPartFabricSpill(
      cutLimbBothEnds(cleanNear, 595, 708, 15, 19, 1.0),
    ).cleaned,
  };
}

function extractFarArmParts(
  cleanFar: RasterImage,
  isAvg: boolean,
): Pick<Record<BodyPartId, RasterImage>, 'farUpperArm' | 'farForearm' | 'farHand'> {
  const rUpTop = isAvg ? 26 : 21;
  const rUpBot = isAvg ? 19 : 15;
  const rForeTop = isAvg ? 19 : 16;
  const rForeBot = isAvg ? 15 : 14;
  return {
    farUpperArm: purgeSkinPartFabricSpill(
      cutArticulatedLimbWithRoundedEnds(cleanFar, {
        srcTopY: 130,
        srcBotY: 485,
        srcMaxX: isAvg ? 580 : 510,
        dstRadiusTopPx: rUpTop,
        dstRadiusBotPx: rUpBot,
        roundTopEnd: true,
        roundBotEnd: true,
        shadeScale: 0.92,
      }),
    ).cleaned,
    farForearm: purgeSkinPartFabricSpill(
      cutHorizontalLimbWithRoundedEnds(cleanFar, {
        srcLeftX: isAvg ? 565 : 550,
        srcRightX: isAvg ? 1020 : 910,
        srcMinY: 485,
        dstRadiusTopPx: rForeTop,
        dstRadiusBotPx: rForeBot,
        shadeScale: 1.05,
      }),
    ).cleaned,
    farHand: purgeSkinPartFabricSpill(
      cutHorizontalLimbWithRoundedEnds(cleanFar, {
        srcLeftX: isAvg ? 1010 : 895,
        srcRightX: isAvg ? 1245 : 1135,
        srcMinY: 455,
        dstRadiusTopPx: 15,
        dstRadiusBotPx: 19,
        shadeScale: 1.05,
      }),
    ).cleaned,
  };
}

function softenProximalShoulderCap(img: RasterImage): RasterImage {
  const out = createRaster(img.width, img.height);
  out.data.set(img.data);
  const refMid = readPixel(out, 80, 48);
  for (let y = 8; y <= 38; y++) {
    const t = Math.max(0, Math.min(1, (38 - y) / 28)) * 0.45;
    for (let x = 50; x <= 110; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      writePixel(
        out,
        { x, y },
        {
          r: Math.round(p.r * (1 - t) + refMid.r * t),
          g: Math.round(p.g * (1 - t) + refMid.g * t),
          b: Math.round(p.b * (1 - t) + refMid.b * t),
          a: p.a,
        },
      );
    }
  }
  return out;
}

function cutThighWithShortsCuff(
  legSrc: RasterImage,
  pelvisShorts: RasterImage,
  spec: {
    readonly srcTopY: number;
    readonly srcBotY: number;
    readonly rTop: number;
    readonly rBot: number;
    readonly cuffTopY: number;
    readonly cuffBotY: number;
    readonly sideStripeMode: 'with-stripe' | 'solid-fabric';
    readonly shadeScale: number;
  },
): RasterImage {
  return cutArticulatedLimbWithRoundedEnds(legSrc, {
    srcTopY: spec.srcTopY,
    srcBotY: spec.srcBotY,
    dstRadiusTopPx: spec.rTop,
    dstRadiusBotPx: spec.rBot,
    roundTopEnd: true,
    roundBotEnd: true,
    shadeScale: spec.shadeScale,
    endCapComposite: {
      compositeSource: pelvisShorts,
      end: 'top',
      srcTopY: spec.cuffTopY,
      srcBotY: spec.cuffBotY,
      dstStraightCutY: 66,
      sideStripeMode: spec.sideStripeMode,
      shadeScale: spec.shadeScale,
    },
  });
}

function extractLegCutouts(
  nearLeg: RasterImage,
  farLeg: RasterImage,
  pelvisShorts: RasterImage,
  isAvg = false,
): Pick<
  Record<BodyPartId, RasterImage>,
  'nearThigh' | 'nearShin' | 'nearFoot' | 'farThigh' | 'farShin' | 'farFoot'
> {
  const [rThighTop, rThighBot, rShinTop, rShinBot] = isAvg
    ? [29, 23, 22, 15]
    : [25, 20, 20, 14];
  const [cuffTopY, cuffBotY] = isAvg ? [250, 450] : [460, 690];
  return {
    nearThigh: cutThighWithShortsCuff(nearLeg, pelvisShorts, {
      srcTopY: 175, srcBotY: 380, rTop: rThighTop, rBot: rThighBot,
      cuffTopY, cuffBotY, sideStripeMode: 'with-stripe', shadeScale: 1.0,
    }),
    nearShin: cutLimbBothEnds(nearLeg, 390, 642, rShinTop, rShinBot, 1.0),
    nearFoot: extractFootWithRoundedAnkleCut(nearLeg, {
      srcStart: { x: 632, y: 702 }, srcEnd: { x: 822, y: 716 },
      cropBox: { minX: 615, minY: 625, maxX: 830, maxY: 734 },
      anklePivot: { x: 62, y: 82 }, shadeScale: 1.0,
    }),
    farThigh: cutThighWithShortsCuff(farLeg, pelvisShorts, {
      srcTopY: 115, srcBotY: 375, rTop: rThighTop - 1, rBot: rThighBot,
      cuffTopY, cuffBotY, sideStripeMode: 'solid-fabric', shadeScale: 0.88,
    }),
    farShin: cutLimbBothEnds(farLeg, 385, 622, rShinTop, rShinBot, 0.88),
    farFoot: extractFootWithRoundedAnkleCut(farLeg, {
      srcStart: { x: 632, y: 690 }, srcEnd: { x: 846, y: 706 },
      cropBox: { minX: 626, minY: 595, maxX: 856, maxY: 718 },
      anklePivot: { x: 60, y: 80 }, shadeScale: 0.88,
    }),
  };
}

function calibrateShoeVerticalShift(
  src: RasterImage,
  baseEndY: number,
): number {
  let maxY = 0;
  for (let y = 600; y < Math.min(src.height, 762); y++) {
    for (let x = 590; x < Math.min(src.width, 865); x++) {
      if (readPixel(src, x, y).a > 128 && y > maxY) {
        maxY = y;
      }
    }
  }
  if (maxY === 0) return 0;
  const dy = maxY - (baseEndY + 14);
  return Math.abs(dy) <= 4 ? 0 : dy;
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
  const dy = calibrateShoeVerticalShift(src, spec.srcEnd.y);
  const raw = extractSimilarityAlignedPart(src, {
    srcStart: { x: spec.srcStart.x, y: spec.srcStart.y + dy },
    srcEnd: { x: spec.srcEnd.x, y: spec.srcEnd.y + dy },
    dstStart: { x: 38, y: 112 },
    dstEnd: { x: 136, y: 118 },
    cropBox: {
      minX: Math.min(spec.cropBox.minX, 595),
      minY: spec.cropBox.minY + dy,
      maxX: Math.max(spec.cropBox.maxX, 860),
      maxY: Math.min(src.height - 1, spec.cropBox.maxY + dy + 6),
    },
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



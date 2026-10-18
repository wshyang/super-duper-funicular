import type { RasterImage } from '../shared/types.js';
import { createRaster, readPixel, writePixel } from './raster.js';
import { cutArticulatedLimbWithRoundedEnds } from './rounded-joint-cutter.js';

export interface SideProfileExtractedArm {
  readonly isolatedArmPlate: RasterImage;
  readonly nearUpperArm: RasterImage;
  readonly nearForearm: RasterImage;
  readonly nearHand: RasterImage;
  readonly shoulderTopY: number;
  readonly elbowY: number;
  readonly wristY: number;
  readonly handBotY: number;
}

export function extractArmSegmentsFromMasterSideProfile(
  masterLateral: RasterImage,
): SideProfileExtractedArm {
  const isolated = isolateSideProfileArmCorridor(masterLateral);
  let shoulderTopY = 235;
  let wristY = 385;
  let handBotY = 425;
  for (let y = 175; y <= 445; y++) {
    for (let x = 625; x <= 775; x++) {
      const p = readPixel(isolated, x, y);
      if (p.a < 128) continue;
      if (y < shoulderTopY) shoulderTopY = y;
      if (y > handBotY) handBotY = y;
      if (p.b > p.r + 24 && p.b > 120) wristY = y;
    }
  }
  const elbowY = Math.round(shoulderTopY + (wristY - shoulderTopY) * 0.52);
  return {
    isolatedArmPlate: isolated,
    nearUpperArm: cutSideArmPart(isolated, shoulderTopY + 8, elbowY, 21, 16),
    nearForearm: cutSideArmPart(isolated, elbowY + 2, wristY - 4, 16, 13),
    nearHand: cutSideArmPart(isolated, wristY - 6, handBotY, 14, 17),
    shoulderTopY,
    elbowY,
    wristY,
    handBotY,
  };
}

function cutSideArmPart(
  src: RasterImage,
  srcTopY: number,
  srcBotY: number,
  rTop: number,
  rBot: number,
): RasterImage {
  return cutArticulatedLimbWithRoundedEnds(src, {
    srcTopY,
    srcBotY,
    dstRadiusTopPx: rTop,
    dstRadiusBotPx: rBot,
    roundTopEnd: true,
    roundBotEnd: true,
    shadeScale: 1.0,
  });
}

function isolateSideProfileArmCorridor(master: RasterImage): RasterImage {
  const out = createRaster(master.width, master.height);
  const fallbackSkin = { r: 214, g: 168, b: 141, a: 255 };
  for (let y = 170; y <= 445; y++) {
    let minX = -1;
    let maxX = -1;
    let rowColor = fallbackSkin;
    for (let x = 625; x <= 748; x++) {
      const p = readPixel(master, x, y);
      if (p.a < 128) continue;
      const isSinglet = p.r - p.g >= 56 && p.r > 110;
      const isWhiteTrim = p.r > 215 && p.g > 210 && p.b > 210;
      const isDarkShorts = p.r < 65 && p.g < 65 && p.b < 70;
      const isWarmSkin = p.r > 95 && p.r - p.b > 8 && !isSinglet && !isWhiteTrim;
      const isSweatband = p.b > p.r + 20 && p.b > 110 && p.g > 90;
      if ((isWarmSkin || isSweatband) && !isDarkShorts) {
        writePixel(out, { x, y }, p);
        rowColor = p;
        if (minX === -1) minX = x;
        maxX = x;
      }
    }
    const spanL = minX !== -1 ? minX : 675;
    const spanR = maxX - spanL >= 18 ? Math.min(maxX, spanL + 56) : spanL + 26;
    for (let x = spanL; x <= spanR; x++) {
      if (readPixel(out, x, y).a < 128) writePixel(out, { x, y }, rowColor);
    }
  }
  return out;
}

export function normalizeFingertipMagentaShadow(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  const refSkin = readPixel(out, 725, 635);
  const target =
    refSkin.a > 128 && refSkin.g > 120
      ? refSkin
      : { r: 206, g: 148, b: 122, a: 255 };
  for (let y = 650; y < out.height; y++) {
    for (let x = 650; x <= 795; x++) {
      const p = readPixel(out, x, y);
      if (p.a < 32) continue;
      if (p.r - p.g > 56 && p.g < p.r * 0.65) {
        const lumScale = Math.max(0.76, Math.min(1.02, (p.r + p.g + p.b) / 450));
        writePixel(
          out,
          { x, y },
          {
            r: Math.round(target.r * lumScale),
            g: Math.round(target.g * lumScale),
            b: Math.round(target.b * lumScale),
            a: p.a,
          },
        );
      }
    }
  }
  return out;
}

export function cleanAverageTorsoNeckStub(src: RasterImage): RasterImage {
  const out = createRaster(src.width, src.height);
  out.data.set(src.data);
  for (let y = 0; y < 156; y++) {
    for (let x = 560; x < 790; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      const isCrimsonStrap = p.r - p.g > 48 && p.r > 110;
      if (!isCrimsonStrap && y < 150) {
        writePixel(out, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
      }
    }
  }
  const refSkin = readPixel(out, 670, 265);
  for (let y = 154; y <= 326; y++) {
    for (let x = 576; x <= 762; x++) {
      const normDist = Math.hypot((x - 670) / 90, (y - 252) / 88);
      if (normDist > 1.05) continue;
      const cur = readPixel(out, x, y);
      const isSinglet = cur.r - cur.g > 82 && cur.g < 75;
      const isWhiteStripe = cur.r > 180 && cur.g > 175 && cur.b > 175;
      if (cur.a < 128 || isSinglet || isWhiteStripe) continue;
      const blend = 0.96;
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

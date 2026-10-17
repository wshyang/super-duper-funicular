import type { Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import { sampleBilinearRgba } from '../runner/photoreal-warp.js';
import { createRaster, readPixel, writePixel } from './raster.js';

export interface EndCapCompositeSpec {
  readonly compositeSource: RasterImage;
  readonly end: 'top' | 'bottom';
  readonly srcTopY: number;
  readonly srcBotY: number;
  readonly dstStraightCutY: number;
  readonly sideStripeMode: 'with-stripe' | 'solid-fabric';
  readonly shadeScale: number;
}

export interface RoundedLimbCutSpec {
  readonly srcTopY: number;
  readonly srcBotY: number;
  readonly srcMaxX?: number;
  readonly dstTopY?: number;
  readonly dstBotY?: number;
  readonly dstRadiusTopPx: number;
  readonly dstRadiusBotPx: number;
  readonly roundTopEnd: boolean;
  readonly roundBotEnd: boolean;
  readonly shadeScale: number;
  readonly endCapComposite?: EndCapCompositeSpec;
}

export interface HorizontalLimbCutSpec {
  readonly srcLeftX: number;
  readonly srcRightX: number;
  readonly srcMinY: number;
  readonly dstRadiusTopPx: number;
  readonly dstRadiusBotPx: number;
  readonly shadeScale: number;
}

export interface PivotArcCutSpec {
  readonly pivot: Point2D;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly cutSide: 'above' | 'below';
  readonly featherPx: number;
  readonly maxCutX?: number;
}

export function cutArticulatedLimbWithRoundedEnds(
  src: RasterImage,
  spec: RoundedLimbCutSpec,
): RasterImage {
  const out = createRaster(160, 160);
  const dstTopY = spec.dstTopY ?? 36;
  const dstBotY = spec.dstBotY ?? 124;
  const topSpan = measureForegroundRowSpan(src, spec.srcTopY, spec.srcMaxX);
  const botSpan = measureForegroundRowSpan(src, spec.srcBotY, spec.srcMaxX);
  const yMin = spec.roundTopEnd ? dstTopY - spec.dstRadiusTopPx - 2 : dstTopY;
  const yMax = spec.roundBotEnd ? dstBotY + spec.dstRadiusBotPx + 2 : dstBotY;

  for (let y = yMin; y <= yMax; y++) {
    sampleLimbCutRow(out, src, spec, {
      y,
      dstTopY,
      dstBotY,
      topSpan,
      botSpan,
    });
  }
  if (spec.endCapComposite) {
    return attachEndCapComposite(out, spec.endCapComposite);
  }
  return out;
}

function sampleLimbCutRow(
  out: RasterImage,
  src: RasterImage,
  spec: RoundedLimbCutSpec,
  ctx: {
    readonly y: number;
    readonly dstTopY: number;
    readonly dstBotY: number;
    readonly topSpan: { readonly midX: number; readonly halfW: number };
    readonly botSpan: { readonly midX: number; readonly halfW: number };
  },
): void {
  const dstLen = ctx.dstBotY - ctx.dstTopY;
  const tRaw = (ctx.y - ctx.dstTopY) / dstLen;
  const tClamped = Math.max(0, Math.min(1, tRaw));
  const rAtY =
    spec.dstRadiusTopPx * (1 - tClamped) + spec.dstRadiusBotPx * tClamped;
  const v = clampSourceEndSampleY(
    spec,
    tRaw,
    ctx.topSpan.halfW,
    ctx.botSpan.halfW,
  );
  const axisMidX =
    ctx.topSpan.midX * (1 - tClamped) + ctx.botSpan.midX * tClamped;
  const refHalfW =
    ctx.topSpan.halfW * (1 - tClamped) + ctx.botSpan.halfW * tClamped;
  const rowSpan = measureForegroundRowSpan(src, v, spec.srcMaxX);
  const ratio = Math.max(0.72, Math.min(1.28, rowSpan.halfW / Math.max(12, refHalfW)));
  const endBlend = Math.min(1, Math.min(tClamped, 1 - tClamped) * 4.5);
  const effectiveRadius = rAtY * (1 - endBlend + endBlend * ratio);
  const maxR = Math.max(spec.dstRadiusTopPx, spec.dstRadiusBotPx) + 12;

  for (let x = 80 - maxR; x <= 80 + maxR; x++) {
    const maskAlpha = evaluateRoundedEndMask(
      { x, y: ctx.y },
      {
        dstTopY: ctx.dstTopY,
        dstBotY: ctx.dstBotY,
        rTop: spec.dstRadiusTopPx,
        rBot: spec.dstRadiusBotPx,
        rAtY: effectiveRadius,
        roundTop: spec.roundTopEnd,
        roundBot: spec.roundBotEnd,
      },
    );
    if (maskAlpha <= 0.01) continue;
    const nx = (x - 80) / Math.max(1, effectiveRadius);
    const u =
      rowSpan.midX * endBlend + axisMidX * (1 - endBlend) + nx * rowSpan.halfW;
    const sampled = sampleBilinearRgba(src, u, v);
    if (sampled.a > 8) {
      writeShadedPixel(
        out,
        { x, y: ctx.y },
        { ...sampled, a: Math.round(sampled.a * maskAlpha) },
        spec.shadeScale,
      );
    }
  }
}

function clampSourceEndSampleY(
  spec: RoundedLimbCutSpec,
  tRaw: number,
  topHalfW: number,
  botHalfW: number,
): number {
  const srcSpan = spec.srcBotY - spec.srcTopY;
  if (tRaw < 0) {
    const maxCapSrc = Math.min(topHalfW * 0.65, srcSpan * 0.22);
    return spec.srcTopY + Math.max(-maxCapSrc, tRaw * srcSpan * 0.55);
  }
  if (tRaw > 1) {
    const maxCapSrc = Math.min(botHalfW * 0.65, srcSpan * 0.22);
    return spec.srcBotY + Math.min(maxCapSrc, (tRaw - 1) * srcSpan * 0.55);
  }
  return spec.srcTopY + tRaw * srcSpan;
}

export function applyPivotArcRoundedCut(
  img: RasterImage,
  spec: PivotArcCutSpec,
): RasterImage {
  const out = createRaster(img.width, img.height);
  out.data.set(img.data);
  for (let y = 0; y < img.height; y++) {
    const dy = y - spec.pivot.y;
    const inCutHalfPlane = spec.cutSide === 'above' ? dy < 0 : dy > 0;
    if (!inCutHalfPlane) continue;
    for (let x = 0; x < img.width; x++) {
      if (spec.maxCutX !== undefined && x > spec.maxCutX) continue;
      const cur = readPixel(out, x, y);
      if (cur.a === 0) continue;
      const dx = (x - spec.pivot.x) / Math.max(1, spec.radiusX);
      const ny = dy / Math.max(1, spec.radiusY);
      const dist = Math.hypot(dx, ny);
      const edgeSpan = spec.featherPx / Math.max(spec.radiusX, spec.radiusY);
      if (dist > 1.0 - edgeSpan) {
        const alphaScale = Math.max(
          0,
          Math.min(1, (1.0 - dist) / Math.max(0.02, edgeSpan)),
        );
        writePixel(out, { x, y }, { ...cur, a: Math.round(cur.a * alphaScale) });
      }
    }
  }
  return out;
}

function evaluateRoundedEndMask(
  pt: Point2D,
  geom: {
    readonly dstTopY: number;
    readonly dstBotY: number;
    readonly rTop: number;
    readonly rBot: number;
    readonly rAtY: number;
    readonly roundTop: boolean;
    readonly roundBot: boolean;
  },
): number {
  let dist = Math.abs(pt.x - 80);
  let rRef = geom.rAtY;
  if (pt.y < geom.dstTopY && geom.roundTop) {
    dist = Math.hypot(pt.x - 80, pt.y - geom.dstTopY);
    rRef = geom.rTop;
  } else if (pt.y > geom.dstBotY && geom.roundBot) {
    dist = Math.hypot(pt.x - 80, pt.y - geom.dstBotY);
    rRef = geom.rBot;
  }
  const feather = 1.6;
  if (dist <= rRef - feather + 0.4) return 1.0;
  if (dist >= rRef + 0.4) return 0.0;
  return (rRef + 0.4 - dist) / feather;
}

export function measureForegroundRowSpan(
  src: RasterImage,
  yRow: number,
  srcMaxX?: number,
): { readonly midX: number; readonly halfW: number } {
  const y = Math.max(0, Math.min(src.height - 1, Math.round(yRow)));
  const xLimit = srcMaxX !== undefined ? Math.min(src.width, srcMaxX) : src.width;
  let minX = src.width;
  let maxX = -1;
  for (let x = 0; x < xLimit; x++) {
    if (readPixel(src, x, y).a > 32) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  if (maxX <= minX) {
    return { midX: src.width * 0.5, halfW: 48 };
  }
  return {
    midX: (minX + maxX) * 0.5,
    halfW: Math.max(14, (maxX - minX) * 0.485),
  };
}

export function cutHorizontalLimbWithRoundedEnds(
  src: RasterImage,
  spec: HorizontalLimbCutSpec,
): RasterImage {
  const rotated = createRaster(src.height, src.width);
  for (let y = spec.srcMinY; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = readPixel(src, x, y);
      if (p.a > 0) {
        writePixel(rotated, { x: src.height - 1 - y, y: x }, p);
      }
    }
  }
  return cutArticulatedLimbWithRoundedEnds(rotated, {
    srcTopY: spec.srcLeftX,
    srcBotY: spec.srcRightX,
    dstRadiusTopPx: spec.dstRadiusTopPx,
    dstRadiusBotPx: spec.dstRadiusBotPx,
    roundTopEnd: true,
    roundBotEnd: true,
    shadeScale: spec.shadeScale,
  });
}

function writeShadedPixel(
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

/**
 * Attaches an optional composite segment (e.g. a sprinter-shorts leg cuff extracted from
 * the pelvis/torso base) onto the proximal (`top`) or distal (`bottom`) end of a rounded-end
 * limb cutout. The outer joint cap stays semicircularly rounded to gel with the mating torso/pelvis
 * pivot while the inner boundary terminates in a crisp straight cut at `dstStraightCutY`.
 */
export function attachEndCapComposite(
  limbCutout: RasterImage,
  spec: EndCapCompositeSpec,
): RasterImage {
  const out = createRaster(limbCutout.width, limbCutout.height);
  out.data.set(limbCutout.data);
  const yStart = spec.end === 'top' ? 0 : spec.dstStraightCutY;
  const yEnd = spec.end === 'top' ? spec.dstStraightCutY : limbCutout.height - 1;
  for (let y = yStart; y <= yEnd; y++) {
    sampleCompositeCuffRow(out, limbCutout, spec, y);
  }
  return out;
}

function sampleCompositeCuffRow(
  out: RasterImage,
  limbCutout: RasterImage,
  spec: EndCapCompositeSpec,
  y: number,
): void {
  const bandMinY = spec.end === 'top' ? 10 : spec.dstStraightCutY;
  const bandMaxY = spec.end === 'top' ? spec.dstStraightCutY : 148;
  const tY = Math.max(0, Math.min(1, (y - bandMinY) / Math.max(1, bandMaxY - bandMinY)));
  const srcV = spec.srcTopY + tY * (spec.srcBotY - spec.srcTopY);
  const srcSpan = measureForegroundRowSpan(spec.compositeSource, srcV);
  const dstSpan = measureForegroundRowSpan(limbCutout, y);
  const isHemEdge = Math.abs(y - spec.dstStraightCutY) <= 1;
  const hemShade = isHemEdge ? spec.shadeScale * 0.82 : spec.shadeScale;
  const allowStripe = spec.sideStripeMode === 'with-stripe' && (spec.end !== 'top' || y >= 18);

  for (let x = 0; x < limbCutout.width; x++) {
    const basePx = readPixel(limbCutout, x, y);
    if (basePx.a <= 8) continue;
    const nx = (x - dstSpan.midX) / Math.max(8, dstSpan.halfW);
    const u = allowStripe
      ? srcSpan.midX + nx * srcSpan.halfW * 0.85
      : srcSpan.midX - srcSpan.halfW * 0.38 + nx * srcSpan.halfW * 0.25;
    const sampled = sampleBilinearRgba(spec.compositeSource, u, srcV);
    if (sampled.a > 16) {
      writeShadedPixel(out, { x, y }, { ...sampled, a: basePx.a }, hemShade);
    }
  }
}


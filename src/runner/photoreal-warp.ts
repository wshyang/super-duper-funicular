import type {
  LimbKinematics,
  Point2D,
  RasterImage,
  RgbaColor,
} from '../shared/types.js';
import { blendPixel, readPixel } from '../pipeline/raster.js';

export interface SegmentWarpSpec {
  readonly dstStart: Point2D;
  readonly dstEnd: Point2D;
  readonly dstHalfWidthPx: number;
  readonly srcStart?: Point2D;
  readonly srcEnd?: Point2D;
  readonly tintTarget?: RgbaColor;
  readonly tintMode?: 'crimson-singlet' | 'accent-trim' | 'none';
}

export interface ContinuousTwoBoneWarpSpec {
  readonly root: Point2D;
  readonly mid: Point2D;
  readonly tip: Point2D;
  readonly halfWidthPx: number;
  readonly upperCutout: RasterImage;
  readonly lowerCutout: RasterImage;
  readonly tintTarget?: RgbaColor;
  readonly tintMode?: 'crimson-singlet' | 'accent-trim' | 'none';
}

const DEFAULT_SRC_START: Point2D = { x: 80, y: 36 };
const DEFAULT_SRC_END: Point2D = { x: 80, y: 124 };

export function warpPhotorealSegmentToQuad(
  canvas: RasterImage,
  cutout: RasterImage,
  spec: SegmentWarpSpec,
): void {
  const srcStart = spec.srcStart ?? DEFAULT_SRC_START;
  const srcEnd = spec.srcEnd ?? DEFAULT_SRC_END;
  const dx = spec.dstEnd.x - spec.dstStart.x;
  const dy = spec.dstEnd.y - spec.dstStart.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return;
  const ux = dx / len;
  const uy = dy / len;
  const srcDx = srcEnd.x - srcStart.x;
  const srcDy = srcEnd.y - srcStart.y;
  const srcLen = Math.max(1, Math.hypot(srcDx, srcDy));
  const sux = srcDx / srcLen;
  const suy = srcDy / srcLen;
  const bounds = computeSegmentBounds(spec, len);

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const rx = x + 0.5 - spec.dstStart.x;
      const ry = y + 0.5 - spec.dstStart.y;
      const alongPx = rx * ux + ry * uy;
      const acrossPx = -rx * uy + ry * ux;
      const uOff = (acrossPx / Math.max(1, spec.dstHalfWidthPx)) * 80;
      const vOff = mapLongitudinalWithIsotropicCaps(
        alongPx,
        len,
        srcLen,
        spec.dstHalfWidthPx,
      );
      const u = srcStart.x + sux * vOff - suy * uOff;
      const v = srcStart.y + suy * vOff + sux * uOff;
      const sampled = sampleBilinearRgba(cutout, u, v);
      if (sampled.a <= 6) continue;
      blendPixel(
        canvas,
        { x, y },
        applyGarmentTint(sampled, spec.tintTarget, spec.tintMode ?? 'none'),
      );
    }
  }
}

function mapLongitudinalWithIsotropicCaps(
  alongPx: number,
  len: number,
  srcLen: number,
  dstHalfWidthPx: number,
): number {
  const capScale = 80 / Math.max(1, dstHalfWidthPx);
  if (alongPx < 0) {
    return alongPx * capScale;
  }
  if (alongPx > len) {
    return srcLen + (alongPx - len) * capScale;
  }
  return (alongPx / len) * srcLen;
}

export function warpContinuousTwoBoneChain(
  canvas: RasterImage,
  spec: ContinuousTwoBoneWarpSpec,
): void {
  warpPhotorealSegmentToQuad(canvas, spec.upperCutout, {
    dstStart: spec.root,
    dstEnd: spec.mid,
    dstHalfWidthPx: spec.halfWidthPx,
    tintTarget: spec.tintTarget,
    tintMode: spec.tintMode,
  });
  warpPhotorealSegmentToQuad(canvas, spec.lowerCutout, {
    dstStart: spec.mid,
    dstEnd: spec.tip,
    dstHalfWidthPx: spec.halfWidthPx,
    tintTarget: spec.tintTarget,
    tintMode: spec.tintMode,
  });
}

export function warpPhotorealRollingShoe(
  canvas: RasterImage,
  shoeCutout: RasterImage,
  leg: LimbKinematics,
  tintTarget: RgbaColor,
  halfHeightPx = 14,
): void {
  const bounds = computeFootBounds(leg, halfHeightPx);
  const srcHeel: Point2D = { x: 38, y: 112 };
  const srcBall: Point2D = { x: 102, y: 116 };
  const srcToe: Point2D = { x: 136, y: 118 };

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const uv = mapPointToTwoSegmentShoe(
        { x: x + 0.5, y: y + 0.5 },
        leg,
        halfHeightPx,
        { srcHeel, srcBall, srcToe },
      );
      if (!uv) continue;
      const sampled = sampleBilinearRgba(shoeCutout, uv.x, uv.y);
      if (sampled.a <= 6) continue;
      const recolored = applyGarmentTint(sampled, tintTarget, 'accent-trim');
      blendPixel(canvas, { x, y }, recolored);
    }
  }
}

function mapPointToTwoSegmentShoe(
  pt: Point2D,
  leg: LimbKinematics,
  halfHeightPx: number,
  srcPts: {
    readonly srcHeel: Point2D;
    readonly srcBall: Point2D;
    readonly srcToe: Point2D;
  },
): Point2D | null {
  const cdx = leg.tipPoint.x - leg.heelPoint.x;
  const cdy = leg.tipPoint.y - leg.heelPoint.y;
  const chordLen = Math.max(1, Math.hypot(cdx, cdy));
  const ux = cdx / chordLen;
  const uy = cdy / chordLen;
  const nx = uy;
  const ny = -ux;

  const bdx = leg.ballPoint.x - leg.heelPoint.x;
  const bdy = leg.ballPoint.y - leg.heelPoint.y;
  const sBall = Math.max(0.25, Math.min(0.85, (bdx * ux + bdy * uy) / chordLen));
  const hBall = bdx * nx + bdy * ny;

  const px = pt.x - leg.heelPoint.x;
  const py = pt.y - leg.heelPoint.y;
  const s = (px * ux + py * uy) / chordLen;
  const h = px * nx + py * ny;
  if (s < -0.35 || s > 1.25) return null;

  const w0 = Math.max(0, Math.min(1, s / sBall));
  const w1 = Math.max(0, Math.min(1, (1 - s) / (1 - sBall)));
  const tent = Math.min(w0, w1);
  const hSole = hBall * tent;
  const nRel = (h - hSole) / halfHeightPx;
  if (nRel < -0.8 || nRel > 2.6) return null;

  const u =
    s <= sBall
      ? srcPts.srcHeel.x + (srcPts.srcBall.x - srcPts.srcHeel.x) * (s / sBall)
      : srcPts.srcBall.x +
        (srcPts.srcToe.x - srcPts.srcBall.x) * ((s - sBall) / (1 - sBall));
  const vSole =
    srcPts.srcHeel.y +
    (srcPts.srcToe.y - srcPts.srcHeel.y) * Math.max(0, Math.min(1, s));
  const v = vSole - nRel * 28;
  return { x: u, y: v };
}

export function sampleBilinearRgba(
  img: RasterImage,
  u: number,
  v: number,
): RgbaColor {
  if (u < 0 || v < 0 || u >= img.width - 1 || v >= img.height - 1) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  const c00 = readPixel(img, x0, y0);
  const c10 = readPixel(img, x0 + 1, y0);
  const c01 = readPixel(img, x0, y0 + 1);
  const c11 = readPixel(img, x0 + 1, y0 + 1);
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  const a = c00.a * w00 + c10.a * w10 + c01.a * w01 + c11.a * w11;
  if (a <= 1) return { r: 0, g: 0, b: 0, a: 0 };
  const aw00 = c00.a * w00;
  const aw10 = c10.a * w10;
  const aw01 = c01.a * w01;
  const aw11 = c11.a * w11;
  const aSum = Math.max(1, aw00 + aw10 + aw01 + aw11);
  return {
    r: Math.round((c00.r * aw00 + c10.r * aw10 + c01.r * aw01 + c11.r * aw11) / aSum),
    g: Math.round((c00.g * aw00 + c10.g * aw10 + c01.g * aw01 + c11.g * aw11) / aSum),
    b: Math.round((c00.b * aw00 + c10.b * aw10 + c01.b * aw01 + c11.b * aw11) / aSum),
    a: Math.round(a),
  };
}

function applyGarmentTint(
  pixel: RgbaColor,
  target: RgbaColor | undefined,
  mode: 'crimson-singlet' | 'accent-trim' | 'none',
): RgbaColor {
  if (!target || mode === 'none') return pixel;
  const maxC = Math.max(pixel.r, pixel.g, pixel.b);
  const minC = Math.min(pixel.r, pixel.g, pixel.b);
  const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
  const redDom = pixel.r - Math.max(pixel.g, pixel.b);
  if (redDom < 56 || pixel.r - pixel.g < 58 || sat < 0.44) return pixel;
  const strength = Math.min(1, (redDom - 56) / 48);
  const lumRatio = (pixel.r * 0.3 + pixel.g * 0.59 + pixel.b * 0.11) / 148;
  const tr = Math.min(255, Math.round(target.r * lumRatio));
  const tg = Math.min(255, Math.round(target.g * lumRatio));
  const tb = Math.min(255, Math.round(target.b * lumRatio));
  return {
    r: Math.round(pixel.r * (1 - strength) + tr * strength),
    g: Math.round(pixel.g * (1 - strength) + tg * strength),
    b: Math.round(pixel.b * (1 - strength) + tb * strength),
    a: pixel.a,
  };
}

function computeSegmentBounds(
  spec: SegmentWarpSpec,
  len: number,
): {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
} {
  const pad = Math.ceil(Math.max(spec.dstHalfWidthPx * 1.35, len * 0.55));
  return {
    minX: Math.max(0, Math.floor(Math.min(spec.dstStart.x, spec.dstEnd.x) - pad)),
    maxX: Math.min(219, Math.ceil(Math.max(spec.dstStart.x, spec.dstEnd.x) + pad)),
    minY: Math.max(0, Math.floor(Math.min(spec.dstStart.y, spec.dstEnd.y) - pad)),
    maxY: Math.min(255, Math.ceil(Math.max(spec.dstStart.y, spec.dstEnd.y) + pad)),
  };
}

function computeFootBounds(
  leg: LimbKinematics,
  halfHeightPx: number,
): {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
} {
  const pad = Math.ceil(halfHeightPx * 3.1);
  const xs = [leg.heelPoint.x, leg.ballPoint.x, leg.tipPoint.x, leg.endEffector.x];
  const ys = [leg.heelPoint.y, leg.ballPoint.y, leg.tipPoint.y, leg.endEffector.y];
  return {
    minX: Math.max(0, Math.floor(Math.min(...xs) - pad)),
    maxX: Math.min(219, Math.ceil(Math.max(...xs) + pad)),
    minY: Math.max(0, Math.floor(Math.min(...ys) - pad)),
    maxY: Math.min(255, Math.ceil(Math.max(...ys) + pad)),
  };
}

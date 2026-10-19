import type { BodyPartId, Point2D, RasterImage } from '../shared/types.js';
import { createRaster, readPixel, writePixel } from './raster.js';

export type MaterialMatteClass = 'skin' | 'fabric';

export interface JointBallRelaxSpec {
  readonly pivot: Point2D;
  readonly radiusPx: number;
  readonly passes?: number;
}

export interface LimbWidthParityEntry {
  readonly limbPair: 'upperArm' | 'forearm' | 'thigh' | 'shin';
  readonly nearWidthPx: number;
  readonly farWidthPx: number;
  readonly relativeDeltaPct: number;
}

export function isSkinTonePixel(r: number, g: number, b: number): boolean {
  if (r < 96 || g < 52) return false;
  if (r - b < 24 || g - b < 8) return false;
  return r - g < 96;
}

export function isBrightSingletStrapPixel(r: number, g: number, b: number): boolean {
  return r >= 120 && r - g >= 96 && (g < 52 || r - b > 96);
}

export function purgeSkinPartFabricSpill(img: RasterImage): {
  readonly cleaned: RasterImage;
  readonly purgedPixelCount: number;
} {
  const out = createRaster(img.width, img.height);
  out.data.set(img.data);
  let purgedPixelCount = 0;
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const p = readPixel(out, x, y);
      if (p.a === 0) continue;
      if (isBrightSingletStrapPixel(p.r, p.g, p.b)) {
        writePixel(out, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
        purgedPixelCount++;
      }
    }
  }
  return { cleaned: out, purgedPixelCount };
}

export function countBrightSingletPixels(img: RasterImage): number {
  let count = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const p = readPixel(img, x, y);
      if (p.a >= 128 && isBrightSingletStrapPixel(p.r, p.g, p.b)) {
        count++;
      }
    }
  }
  return count;
}

export function fillHollowJointBallByJacobiRelaxation(
  img: RasterImage,
  spec: JointBallRelaxSpec,
): RasterImage {
  const out = createRaster(img.width, img.height);
  out.data.set(img.data);
  const r = Math.ceil(spec.radiusPx);
  const cx = Math.round(spec.pivot.x);
  const cy = Math.round(spec.pivot.y);
  const seedRgb = computeSolidCapMeanRgb(out, { cx, cy, r });
  if (!seedRgb) return out;

  const passes = spec.passes ?? 24;
  for (let pass = 0; pass < passes; pass++) {
    relaxInteriorBallPass(out, { cx, cy, r, seedRgb });
  }
  return out;
}

function computeSolidCapMeanRgb(
  img: RasterImage,
  box: { readonly cx: number; readonly cy: number; readonly r: number },
): { readonly r: number; readonly g: number; readonly b: number } | null {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (let y = box.cy - box.r; y <= box.cy + box.r; y++) {
    for (let x = box.cx - box.r; x <= box.cx + box.r; x++) {
      if (Math.hypot(x - box.cx, y - box.cy) > box.r) continue;
      const p = readPixel(img, x, y);
      if (p.a >= 220) {
        sumR += p.r;
        sumG += p.g;
        sumB += p.b;
        count++;
      }
    }
  }
  if (count === 0) return null;
  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count),
  };
}

function relaxInteriorBallPass(
  img: RasterImage,
  box: {
    readonly cx: number;
    readonly cy: number;
    readonly r: number;
    readonly seedRgb: { readonly r: number; readonly g: number; readonly b: number };
  },
): void {
  const innerR = Math.max(2, box.r - 2.5);
  for (let y = box.cy - box.r; y <= box.cy + box.r; y++) {
    for (let x = box.cx - box.r; x <= box.cx + box.r; x++) {
      const dist = Math.hypot(x - box.cx, y - box.cy);
      if (dist > innerR) continue;
      const cur = readPixel(img, x, y);
      if (cur.a >= 210) continue;
      const nbr = sampleFourNeighbourMean(img, x, y, box.seedRgb);
      writePixel(img, { x, y }, { ...nbr, a: Math.max(cur.a, 245) });
    }
  }
}

function sampleFourNeighbourMean(
  img: RasterImage,
  x: number,
  y: number,
  fallback: { readonly r: number; readonly g: number; readonly b: number },
): { readonly r: number; readonly g: number; readonly b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const p = readPixel(img, x + dx, y + dy);
    if (p.a >= 120) {
      r += p.r;
      g += p.g;
      b += p.b;
      count++;
    }
  }
  if (count === 0) return fallback;
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

export function measureMedianShaftWidthPx(img: RasterImage): number {
  const widths: number[] = [];
  for (let y = 42; y <= 118; y += 4) {
    let minX = img.width;
    let maxX = -1;
    for (let x = 0; x < img.width; x++) {
      if (readPixel(img, x, y).a >= 64) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    if (maxX >= minX) {
      widths.push(maxX - minX + 1);
    }
  }
  if (widths.length === 0) return 0;
  const sorted = [...widths].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function measureNearFarLimbWidthParity(
  parts: Record<BodyPartId, RasterImage>,
): readonly LimbWidthParityEntry[] {
  const pairs: readonly {
    readonly limbPair: LimbWidthParityEntry['limbPair'];
    readonly nearId: BodyPartId;
    readonly farId: BodyPartId;
  }[] = [
    { limbPair: 'upperArm', nearId: 'nearUpperArm', farId: 'farUpperArm' },
    { limbPair: 'forearm', nearId: 'nearForearm', farId: 'farForearm' },
    { limbPair: 'thigh', nearId: 'nearThigh', farId: 'farThigh' },
    { limbPair: 'shin', nearId: 'nearShin', farId: 'farShin' },
  ];
  return pairs.map((item) => {
    const nearWidthPx = measureMedianShaftWidthPx(parts[item.nearId]);
    const farWidthPx = measureMedianShaftWidthPx(parts[item.farId]);
    const denom = Math.max(1, nearWidthPx);
    const relativeDeltaPct = Number(
      ((Math.abs(nearWidthPx - farWidthPx) / denom) * 100).toFixed(2),
    );
    return {
      limbPair: item.limbPair,
      nearWidthPx,
      farWidthPx,
      relativeDeltaPct,
    };
  });
}

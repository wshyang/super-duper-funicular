import type { RasterImage, RgbaColor } from '../shared/types.js';
import { readPixel } from './raster.js';

/**
 * Measured background/key-quality metrics implementing SC-AC-05
 * (`docs/SPRITE_CAPTURE_ACCEPTANCE_CRITERIA.md`).
 *
 * The pose-bank candidates are centered full-body framings on a magenta field,
 * so background-only samples are drawn from the left/right margins and the top
 * strip (regions the figure never occupies in an accepted framing), while the
 * floor-shadow search runs over the bottom band.
 */

export interface BackgroundUniformity {
  readonly referenceColor: RgbaColor;
  readonly sampleCount: number;
  readonly meanLuminance: number;
  readonly stdDev: number;
  readonly maxDistance: number;
}

export interface FloorShadowMeasurement {
  readonly pixelCount: number;
  readonly boundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null;
  /** Dark pixels in the central foot zone (30%..70% width): contact shadow lives here. */
  readonly centralPixelCount: number;
  readonly centralBoundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null;
  /** Dark pixels outside the foot zone: global floor wash / vignette. */
  readonly lateralPixelCount: number;
  /** Deepest background luminance dip observed in the band (shadow hardness). */
  readonly maxDip: number;
  /**
   * Shadow pixels touching/adjacent to the figure silhouette (within 6 px).
   * Detached flight shadows score 0 and are keyable; touching shadows contaminate edges.
   */
  readonly contactPixelCount: number;
  readonly bandY0: number;
  readonly bandY1: number;
}

export interface SoleEdgeMeasurement {
  readonly contrast: number;
  readonly edgeY: number | null;
}

export const SC_AC_05_BG_STDDEV_MAX = 8;
export const SC_AC_05_FLIGHT_SHADOW_CONTACT_MAX_PX = 0;
export const SC_AC_05_FLIGHT_SHADOW_MAX_DIP = 65;
export const SC_AC_05_CONTACT_SHADOW_MAX_DIP = 85;
export const SC_AC_05_SOLE_EDGE_MIN_CONTRAST = 40;

function luminance(px: RgbaColor): number {
  return 0.2126 * px.r + 0.7152 * px.g + 0.0722 * px.b;
}

function colorDistance(a: RgbaColor, b: RgbaColor): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * True when the pixel reads as a darker shade of the backdrop (floor
 * shadow/wash) rather than figure: it must not exceed the backdrop on any
 * channel (within tolerance) and must preserve the backdrop's channel
 * signature. Prevents shadows from masquerading as figure in masks.
 */
function isBackgroundShade(px: RgbaColor, bg: RgbaColor): boolean {
  if (px.r > bg.r + 8 || px.g > bg.g + 12 || px.b > bg.b + 8) return false;
  const pxRB = px.r - px.b;
  const bgRB = bg.r - bg.b;
  if (Math.abs(pxRB - bgRB) >= 50) return false;
  if (bg.g - px.g >= 60) return false;
  return true;
}

function isFigurePixel(px: RgbaColor, bg: RgbaColor, figureDistanceThreshold: number): boolean {
  if (px.a < 128) return false;
  if (colorDistance(px, bg) <= figureDistanceThreshold) return false;
  return !isBackgroundShade(px, bg);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** Estimate the backdrop color from top-edge patches (never figure pixels, never floor wash). */
export function estimateBackgroundColor(raster: RasterImage, patch = 24): RgbaColor {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  // Top corners + top-edge thirds. Bottom corners are deliberately excluded:
  // every pose-bank candidate carries floor wash/shadow in the lower band.
  const patches: Array<[number, number]> = [
    [0, 0],
    [raster.width - patch, 0],
    [Math.floor(raster.width / 3) - Math.floor(patch / 2), 0],
    [Math.floor((2 * raster.width) / 3) - Math.floor(patch / 2), 0],
  ];
  for (const [ox, oy] of patches) {
    for (let y = oy; y < oy + patch; y += 2) {
      for (let x = ox; x < ox + patch; x += 2) {
        const px = readPixel(raster, x, y);
        rs.push(px.r);
        gs.push(px.g);
        bs.push(px.b);
      }
    }
  }
  return { r: Math.round(median(rs)), g: Math.round(median(gs)), b: Math.round(median(bs)), a: 255 };
}

/**
 * Background uniformity sampled from figure-free margins: left/right 8%
 * vertical bands plus the top 10% strip. Returns luminance std-dev; the
 * SC-AC-05 gate requires < 12 for both flight and contact frames.
 */
export function measureBackgroundUniformity(raster: RasterImage, step = 8): BackgroundUniformity {
  const ref = estimateBackgroundColor(raster);
  const lums: number[] = [];
  let maxDistance = 0;
  const marginX = Math.max(8, Math.floor(raster.width * 0.08));
  const topBand = Math.max(6, Math.floor(raster.height * 0.04));
  const headX0 = Math.floor(raster.width * 0.3);
  const headX1 = Math.ceil(raster.width * 0.7);
  const visit = (x: number, y: number) => {
    const px = readPixel(raster, x, y);
    lums.push(luminance(px));
    maxDistance = Math.max(maxDistance, colorDistance(px, ref));
  };
  for (let y = 0; y < raster.height; y += step) {
    for (let x = 0; x < marginX; x += step) visit(x, y);
    for (let x = raster.width - marginX; x < raster.width; x += step) visit(x, y);
  }
  for (let y = 0; y < topBand; y += step) {
    for (let x = marginX; x < raster.width - marginX; x += step) {
      if (x >= headX0 && x <= headX1) continue;
      visit(x, y);
    }
  }
  const mean = lums.length === 0 ? 0 : lums.reduce((a, b) => a + b, 0) / lums.length;
  const variance = lums.length === 0 ? 0 : lums.reduce((a, b) => a + (b - mean) ** 2, 0) / lums.length;
  return {
    referenceColor: ref,
    sampleCount: lums.length,
    meanLuminance: Math.round(mean * 10) / 10,
    stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
    maxDistance: Math.round(maxDistance * 10) / 10,
  };
}

/**
 * Floor-shadow search over the bottom band (default lower 15%). A pixel counts
 * as shadow when it is substantially darker than the backdrop reference while
 * remaining opaque. Returns the connected-region-agnostic count plus bounding
 * box; the SC-AC-05 gate applies flight/contact budgets to these.
 */
interface ShadowScan {
  readonly count: number;
  readonly maxDip: number;
  readonly bounds: { minX: number; maxX: number; minY: number; maxY: number } | null;
  readonly central: number;
  readonly centralBounds: { minX: number; maxX: number; minY: number; maxY: number } | null;
  readonly mask: ReadonlyArray<{ x: number; y: number }>;
}

function buildStrongFigureMask(raster: RasterImage, ref: RgbaColor, scanY0: number): Uint8Array {
  const mask = new Uint8Array(raster.width * raster.height);
  for (let y = scanY0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (isFigurePixel(readPixel(raster, x, y), ref, 60)) mask[y * raster.width + x] = 1;
    }
  }
  return mask;
}

function makeNearFigure(mask: Uint8Array, width: number, height: number): (x: number, y: number, radius: number) => boolean {
  return (x, y, radius) => {
    for (let dy = -radius; dy <= radius; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (mask[ny * width + nx] === 1) return true;
      }
    }
    return false;
  };
}

function scanShadowBand(
  raster: RasterImage,
  ref: RgbaColor,
  refLum: number,
  bandY0: number,
  bandY1: number,
  footX0: number,
  footX1: number,
  darkenThreshold: number,
  nearFigure: (x: number, y: number, radius: number) => boolean,
): ShadowScan {
  let count = 0;
  let maxDip = 0;
  let central = 0;
  const bounds = { minX: raster.width, maxX: -1, minY: raster.height, maxY: -1 };
  const cBounds = { minX: raster.width, maxX: -1, minY: raster.height, maxY: -1 };
  const mask: Array<{ x: number; y: number }> = [];
  for (let y = bandY0; y <= bandY1; y++) {
    for (let x = 0; x < raster.width; x++) {
      const px = readPixel(raster, x, y);
      if (px.a < 128 || !isBackgroundShade(px, ref)) continue;
      const dip = refLum - luminance(px);
      if (dip < darkenThreshold || nearFigure(x, y, 3)) continue;
      count++;
      mask.push({ x, y });
      if (dip > maxDip) maxDip = dip;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
      if (x < footX0 || x > footX1) continue;
      central++;
      cBounds.minX = Math.min(cBounds.minX, x);
      cBounds.maxX = Math.max(cBounds.maxX, x);
      cBounds.minY = Math.min(cBounds.minY, y);
      cBounds.maxY = Math.max(cBounds.maxY, y);
    }
  }
  return {
    count,
    maxDip,
    bounds: count === 0 ? null : bounds,
    central,
    centralBounds: central === 0 ? null : cBounds,
    mask,
  };
}

export function measureFloorShadow(
  raster: RasterImage,
  bandFraction = 0.15,
  darkenThreshold = 28,
): FloorShadowMeasurement {
  const ref = estimateBackgroundColor(raster);
  const refLum = luminance(ref);
  const bandY0 = Math.floor(raster.height * (1 - bandFraction));
  const bandY1 = raster.height - 1;
  const footX0 = Math.floor(raster.width * 0.3);
  const footX1 = Math.ceil(raster.width * 0.7);
  // Strong-figure lookup over the band (plus margin above): shadow candidates
  // within 3 px of figure are shoe/outsole pixels, not shadow.
  const scanY0 = Math.max(0, bandY0 - 12);
  const nearFigure = makeNearFigure(buildStrongFigureMask(raster, ref, scanY0), raster.width, raster.height);
  const scan = scanShadowBand(raster, ref, refLum, bandY0, bandY1, footX0, footX1, darkenThreshold, nearFigure);
  return {
    pixelCount: scan.count,
    boundingBox: scan.bounds,
    centralPixelCount: scan.central,
    centralBoundingBox: scan.centralBounds,
    lateralPixelCount: scan.count - scan.central,
    maxDip: Math.round(scan.maxDip * 10) / 10,
    contactPixelCount: scan.mask.filter((pt) => nearFigure(pt.x, pt.y, 12)).length,
    bandY0,
    bandY1,
  };
}

/**
 * Sole-edge contrast: strongest vertical luminance step inside a search column
 * band around the annotated sole location. The caller supplies the approximate
 * sole x-center, half-width, and y search range from review annotation; keying
 * needs a hard edge, so SC-AC-05 requires contrast >= 40 on contact frames.
 */
export function measureSoleEdgeContrast(
  raster: RasterImage,
  soleX: number,
  halfWidthPx: number,
  y0: number,
  y1: number,
): SoleEdgeMeasurement {
  let best = 0;
  let edgeY: number | null = null;
  const x0 = Math.max(0, Math.floor(soleX - halfWidthPx));
  const x1 = Math.min(raster.width - 1, Math.ceil(soleX + halfWidthPx));
  const lo = Math.max(1, Math.floor(y0));
  const hi = Math.min(raster.height - 1, Math.ceil(y1));
  for (let x = x0; x <= x1; x++) {
    for (let y = lo; y <= hi; y++) {
      const step = Math.abs(luminance(readPixel(raster, x, y)) - luminance(readPixel(raster, x, y - 1)));
      if (step > best) {
        best = step;
        edgeY = y;
      }
    }
  }
  return { contrast: Math.round(best * 10) / 10, edgeY };
}

export interface FigureEdge {
  readonly soleX: number;
  readonly soleBottomY: number;
}

/**
 * Lowest figure edge in the central zone: scans bottom-up for the first row
 * with >= 3 non-background pixels. Returns null when the band holds no figure
 * (fully clean flight framing). Used to auto-locate the sole for edge contrast.
 */
export function findLowestFigureEdge(raster: RasterImage, minPixelsPerRow = 3): FigureEdge | null {
  const bg = estimateBackgroundColor(raster);
  const x0 = Math.floor(raster.width * 0.25);
  const x1 = Math.ceil(raster.width * 0.75);
  for (let y = raster.height - 1; y >= 0; y--) {
    let count = 0;
    let sumX = 0;
    for (let x = x0; x <= x1; x++) {
      if (isFigurePixel(readPixel(raster, x, y), bg, 60)) {
        count++;
        sumX += x;
      }
    }
    if (count >= minPixelsPerRow) return { soleX: Math.round(sumX / count), soleBottomY: y };
  }
  return null;
}

export type KeyFrameType = 'flight' | 'contact';

export interface KeyGateResult {
  readonly pass: boolean;
  readonly failures: readonly string[];
}

export function evaluateKeyGate(
  uniformity: BackgroundUniformity,
  shadow: FloorShadowMeasurement,
  frameType: KeyFrameType,
  soleEdge?: SoleEdgeMeasurement,
): KeyGateResult {
  const failures: string[] = [];
  if (uniformity.stdDev >= SC_AC_05_BG_STDDEV_MAX) {
    failures.push(`key-bg: stddev ${uniformity.stdDev} >= ${SC_AC_05_BG_STDDEV_MAX}`);
  }
  if (frameType === 'flight') {
    // Detached soft shadows are keyable (adaptive key); touching or hard shadows are not.
    if (shadow.contactPixelCount > SC_AC_05_FLIGHT_SHADOW_CONTACT_MAX_PX) {
      failures.push(`key-shadow: flight shadow touches figure (${shadow.contactPixelCount} px, budget 0)`);
    }
    if (shadow.maxDip >= SC_AC_05_FLIGHT_SHADOW_MAX_DIP) {
      failures.push(`key-shadow: flight shadow dip ${shadow.maxDip} >= ${SC_AC_05_FLIGHT_SHADOW_MAX_DIP} (hard blob)`);
    }
  } else {
    if (shadow.maxDip >= SC_AC_05_CONTACT_SHADOW_MAX_DIP) {
      failures.push(`key-shadow: contact shadow dip ${shadow.maxDip} >= ${SC_AC_05_CONTACT_SHADOW_MAX_DIP} (hard blob)`);
    }
    if (!soleEdge) {
      failures.push('key-edge: contact frame needs an annotated sole-edge measurement');
    } else if (soleEdge.contrast < SC_AC_05_SOLE_EDGE_MIN_CONTRAST) {
      failures.push(`key-edge: sole contrast ${soleEdge.contrast} < ${SC_AC_05_SOLE_EDGE_MIN_CONTRAST}`);
    }
  }
  return { pass: failures.length === 0, failures };
}

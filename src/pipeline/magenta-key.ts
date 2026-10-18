import type { RasterImage, RgbaColor } from '../shared/types.js';
import { cloneRaster, readPixel, writePixel } from './raster.js';

export function isPureMagentaDivider(color: RgbaColor): boolean {
  return color.r >= 225 && color.b >= 225 && color.g <= 42;
}

export function isMagentaBackdropPixel(color: RgbaColor): boolean {
  if (color.a === 0) {
    return true;
  }
  const rbDiff = Math.abs(color.r - color.b);
  const redOverGreen = color.r - color.g;
  const blueOverGreen = color.b - color.g;
  // Supports both pure #FF00FF (255,0,255) and the studio dusty magenta ~ (219,71,163) used
  // in photoreal plates and diffusion candidates. Relaxed from pure-only to cover
  // actual production backgrounds while still rejecting skin/shoe whites and charcoals.
  return (
    color.r >= 180 &&
    color.b >= 135 &&
    redOverGreen >= 75 &&
    blueOverGreen >= 55 &&
    rbDiff <= 80
  );
}

export function isHighConfidenceInteriorMagenta(color: RgbaColor): boolean {
  const rbDiff = Math.abs(color.r - color.b);
  return (
    color.r >= 190 &&
    color.b >= 145 &&
    color.r - color.g >= 85 &&
    color.b - color.g >= 65 &&
    rbDiff <= 75
  );
}

export function keyOutMagentaCell(cell: RasterImage): RasterImage {
  const out = cloneRaster(cell);
  const bgMask = buildMagentaMask(out);
  applyTransparencyMask(out, bgMask);
  despillBoundaryFringe(out, bgMask);
  return out;
}

function buildMagentaMask(raster: RasterImage): Uint8Array {
  const total = raster.width * raster.height;
  const mask = new Uint8Array(total);
  const queue: number[] = [];
  seedBorderAndInteriorMagenta(raster, mask, queue);
  floodFillMagentaNeighbors(raster, mask, queue);
  return mask;
}

function seedBorderAndInteriorMagenta(
  raster: RasterImage,
  mask: Uint8Array,
  queue: number[],
): void {
  const { width, height } = raster;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const onMargin = x < 3 || x >= width - 3 || y < 3 || y >= height - 3;
      const px = readPixel(raster, x, y);
      if (onMargin || isHighConfidenceInteriorMagenta(px)) {
        mask[idx] = 1;
        queue.push(idx);
      }
    }
  }
}

function floodFillMagentaNeighbors(
  raster: RasterImage,
  mask: Uint8Array,
  queue: number[],
): void {
  const { width, height } = raster;
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head] ?? 0;
    head++;
    const x = idx % width;
    const y = Math.floor(idx / width);
    enqueueIfBackdrop(raster, mask, { x: x - 1, y, queue });
    enqueueIfBackdrop(raster, mask, { x: x + 1, y, queue });
    enqueueIfBackdrop(raster, mask, { x, y: y - 1, queue });
    enqueueIfBackdrop(raster, mask, { x, y: y + 1, queue });
  }
  void height;
}

interface NeighborStep {
  readonly x: number;
  readonly y: number;
  readonly queue: number[];
}

function enqueueIfBackdrop(raster: RasterImage, mask: Uint8Array, step: NeighborStep): void {
  if (step.x < 0 || step.x >= raster.width || step.y < 0 || step.y >= raster.height) {
    return;
  }
  const nIdx = step.y * raster.width + step.x;
  if (mask[nIdx] === 1) {
    return;
  }
  const px = readPixel(raster, step.x, step.y);
  if (isMagentaBackdropPixel(px)) {
    mask[nIdx] = 1;
    step.queue.push(nIdx);
  }
}

function applyTransparencyMask(raster: RasterImage, mask: Uint8Array): void {
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      const offset = i * 4;
      raster.data[offset] = 0;
      raster.data[offset + 1] = 0;
      raster.data[offset + 2] = 0;
      raster.data[offset + 3] = 0;
    }
  }
}

function despillBoundaryFringe(raster: RasterImage, bgMask: Uint8Array): void {
  const { width, height } = raster;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (bgMask[idx] === 0 && touchesBackground(bgMask, width, idx)) {
        cleanBoundaryPixel(raster, x, y);
      }
    }
  }
}

function touchesBackground(bgMask: Uint8Array, width: number, idx: number): boolean {
  return (
    bgMask[idx - 1] === 1 ||
    bgMask[idx + 1] === 1 ||
    bgMask[idx - width] === 1 ||
    bgMask[idx + width] === 1
  );
}

export interface ShadowBandCheck {
  readonly hasShadow: boolean;
  readonly shadowPixelCount: number;
  readonly bandPixelCount: number;
}

export function detectShadowBand(raster: RasterImage, bandHeightPx = 16): ShadowBandCheck {
  // Inspect a horizontal band centered on the ground line estimate (bottom 15% of image).
  // Any non-magenta, low-luma-connected patch that touches the ground span is a shadow.
  const bandY0 = Math.max(0, raster.height - bandHeightPx - Math.round(raster.height * 0.06));
  const bandY1 = Math.min(raster.height, bandY0 + bandHeightPx);
  let bandPixels = 0;
  let shadowPixels = 0;
  for (let y = bandY0; y < bandY1; y++) {
    for (let x = 0; x < raster.width; x++) {
      bandPixels++;
      const px = readPixel(raster, x, y);
      if (isMagentaBackdropPixel(px) || px.a === 0) continue;
      // Shadow casts are slightly desaturated magenta with lower value: not pure magenta
      // and luma depression vs expected magenta (R~255,G~0,B~255 → luma ~105). Real shadow
      // is luma 40-120 with residual magenta.
      const luma = 0.2126 * px.r + 0.7152 * px.g + 0.0722 * px.b;
      if (luma < 140 && px.r > 80 && px.b > 80) shadowPixels++;
      // Also catch grey floor smear: low saturation but not skin/shoe white
      else if (luma < 170 && Math.abs(px.r - px.g) < 18 && Math.abs(px.g - px.b) < 18) shadowPixels++;
    }
  }
  return { hasShadow: shadowPixels > Math.max(50, bandPixels * 0.0015), shadowPixelCount: shadowPixels, bandPixelCount: bandPixels };
}

export function isCleanMagentaKey(raster: RasterImage): boolean {
  // Border ring must be > 98% magenta/transparent
  const ring = 6;
  let ringTotal = 0;
  let ringOk = 0;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      const onRing = x < ring || x >= raster.width - ring || y < ring || y >= raster.height - ring;
      if (!onRing) continue;
      ringTotal++;
      const px = readPixel(raster, x, y);
      if (px.a === 0 || isMagentaBackdropPixel(px)) ringOk++;
    }
  }
  const ratio = ringOk / Math.max(1, ringTotal);
  const shadow = detectShadowBand(raster);
  return ratio > 0.985 && !shadow.hasShadow;
}

function cleanBoundaryPixel(raster: RasterImage, x: number, y: number): void {
  const px = readPixel(raster, x, y);
  const magentaExcess = Math.min(px.r, px.b) - px.g;
  if (px.r > 175 && px.b > 175 && magentaExcess > 70) {
    writePixel(raster, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
    return;
  }
  if (magentaExcess > 45 && px.g < 40) {
    const clampedR = Math.min(px.r, px.g + 30);
    const clampedB = Math.min(px.b, px.g + 30);
    writePixel(raster, { x, y }, { r: clampedR, g: px.g, b: clampedB, a: px.a });
  }
}

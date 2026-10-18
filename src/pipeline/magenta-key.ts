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
  return (
    color.r >= 205 &&
    color.b >= 198 &&
    redOverGreen >= 95 &&
    blueOverGreen >= 90 &&
    rbDiff <= 45
  );
}

export function isHighConfidenceInteriorMagenta(color: RgbaColor): boolean {
  const rbDiff = Math.abs(color.r - color.b);
  return (
    color.r >= 218 &&
    color.b >= 215 &&
    color.r - color.g >= 112 &&
    color.b - color.g >= 110 &&
    rbDiff <= 35
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

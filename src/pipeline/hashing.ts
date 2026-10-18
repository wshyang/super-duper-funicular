import crypto from 'node:crypto';
import type { RasterImage } from '../shared/types.js';
import { readPixel } from './raster.js';

export function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function sha256Raster(raster: RasterImage): string {
  const header = Buffer.from(`${raster.width}x${raster.height}:`);
  const payload = Buffer.from(
    raster.data.buffer,
    raster.data.byteOffset,
    raster.data.byteLength,
  );
  return crypto.createHash('sha256').update(header).update(payload).digest('hex');
}

export function computeDHash64(raster: RasterImage): string {
  const cols = 9;
  const rows = 8;
  const luma = sampleLumaGrid(raster, cols, rows);
  let bits = 0n;
  for (let r = 0; r < rows; r++) {
    bits = appendRowBits(bits, luma, r * cols);
  }
  return bits.toString(16).padStart(16, '0');
}

function sampleLumaGrid(raster: RasterImage, cols: number, rows: number): number[] {
  const values: number[] = [];
  for (let r = 0; r < rows; r++) {
    const y = Math.floor(((r + 0.5) * raster.height) / rows);
    for (let c = 0; c < cols; c++) {
      const x = Math.floor(((c + 0.5) * raster.width) / cols);
      const px = readPixel(raster, x, y);
      const luminance = (px.r * 299 + px.g * 587 + px.b * 114) * (px.a / 255);
      values.push(luminance);
    }
  }
  return values;
}

function appendRowBits(current: bigint, luma: readonly number[], rowOffset: number): bigint {
  let out = current;
  for (let c = 0; c < 8; c++) {
    const left = luma[rowOffset + c] ?? 0;
    const right = luma[rowOffset + c + 1] ?? 0;
    out = (out << 1n) | (left > right ? 1n : 0n);
  }
  return out;
}

export function computeDHashHammingDistance(hashA: string, hashB: string): number {
  const a = BigInt(`0x${hashA}`);
  const b = BigInt(`0x${hashB}`);
  let xor = a ^ b;
  let dist = 0;
  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }
  return dist;
}

export function computeAlphaSilhouetteIoU(rasterA: RasterImage, rasterB: RasterImage): number {
  const height = Math.max(rasterA.height, rasterB.height);
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < height; y++) {
    const counts = accumulateRowOverlap(rasterA, rasterB, y);
    intersection += counts.intersection;
    union += counts.union;
  }
  return union === 0 ? 1 : intersection / union;
}

interface OverlapCounts {
  readonly intersection: number;
  readonly union: number;
}

function accumulateRowOverlap(
  rasterA: RasterImage,
  rasterB: RasterImage,
  y: number,
): OverlapCounts {
  const width = Math.max(rasterA.width, rasterB.width);
  let intersection = 0;
  let union = 0;
  for (let x = 0; x < width; x++) {
    const aOpaque = readPixel(rasterA, x, y).a >= 128;
    const bOpaque = readPixel(rasterB, x, y).a >= 128;
    if (aOpaque || bOpaque) {
      union++;
    }
    if (aOpaque && bOpaque) {
      intersection++;
    }
  }
  return { intersection, union };
}

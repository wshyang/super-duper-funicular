import { createHash } from 'node:crypto';
import type { Raster } from '../../shared/types.ts';

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

/** Canonical RGBA hash: ignores metadata by hashing raw pixels + dimensions. */
export function rgbaSha256(raster: Raster): string {
  const header = `${raster.width}x${raster.height}`;
  return createHash('sha256').update(header).update(Buffer.from(raster.data)).digest('hex');
}

/** 64-bit difference hash (8×8 comparisons on a 9×8 grey grid) as 16 hex chars. */
export function dHash64(raster: Raster): string {
  const grey = greyGrid(raster, 9, 8);
  let bits = '';
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const left = grey[row * 9 + col] ?? 0;
      const right = grey[row * 9 + col + 1] ?? 0;
      bits += left > right ? '1' : '0';
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

export function hamming64(a: string, b: string): number {
  let xor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

function greyGrid(raster: Raster, cols: number, rows: number): number[] {
  const out: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      out.push(blockMeanGrey(raster, col, row, cols, rows));
    }
  }
  return out;
}

function blockMeanGrey(raster: Raster, col: number, row: number, cols: number, rows: number): number {
  const x0 = Math.floor((col * raster.width) / cols);
  const x1 = Math.max(x0 + 1, Math.floor(((col + 1) * raster.width) / cols));
  const y0 = Math.floor((row * raster.height) / rows);
  const y1 = Math.max(y0 + 1, Math.floor(((row + 1) * raster.height) / rows));
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * raster.width + x) * 4;
      sum += 0.299 * (raster.data[i] ?? 0) + 0.587 * (raster.data[i + 1] ?? 0) + 0.114 * (raster.data[i + 2] ?? 0);
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

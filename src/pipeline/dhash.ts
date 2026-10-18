import type { RasterImage } from '../shared/types.js';

function lumaAt(image: RasterImage, x: number, y: number): number {
  const offset = (y * image.width + x) * 4;
  const { data } = image;
  return 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
}

function boxDownsampleTo9x8(image: RasterImage): number[] {
  const cells: number[] = [];
  for (let cellY = 0; cellY < 8; cellY++) {
    for (let cellX = 0; cellX < 9; cellX++) {
      cells.push(sampleCellMean(image, cellX, cellY));
    }
  }
  return cells;
}

function sampleCellMean(image: RasterImage, cellX: number, cellY: number): number {
  const x0 = Math.floor((cellX * image.width) / 9);
  const x1 = Math.max(x0 + 1, Math.floor(((cellX + 1) * image.width) / 9));
  const y0 = Math.floor((cellY * image.height) / 8);
  const y1 = Math.max(y0 + 1, Math.floor(((cellY + 1) * image.height) / 8));
  let total = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      total += lumaAt(image, x, y);
      count++;
    }
  }
  return total / count;
}

export function computeDHash64(image: RasterImage): string {
  const luma = boxDownsampleTo9x8(image);
  let hash = 0n;
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const bitIndex = row * 8 + column;
      if (luma[row * 9 + column] < luma[row * 9 + column + 1]) {
        hash |= 1n << BigInt(bitIndex);
      }
    }
  }
  return hash.toString(16).padStart(16, '0');
}

export function dHashHammingDistance(a: string, b: string): number {
  let distance = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const xor = parseInt(a[index], 16) ^ parseInt(b[index], 16);
    distance += bitCount4(xor);
  }
  return distance + Math.abs(a.length - b.length) * 4;
}

function bitCount4(nibble: number): number {
  let value = nibble;
  value = (value & 0x5) + ((value >> 1) & 0x5);
  value = (value & 0x3) + ((value >> 2) & 0x3);
  return value;
}

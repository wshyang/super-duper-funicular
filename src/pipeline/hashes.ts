import { createHash } from 'node:crypto';
import type { DecodedImage } from './image-codec.ts';

export const sha256 = (buffer: Uint8Array): string =>
  createHash('sha256').update(buffer).digest('hex');

/** Stable digest of the decoded pixels plus their dimensions. */
export const pixelSha256 = (image: DecodedImage): string => {
  const header = Buffer.from(`${image.width}x${image.height}:`, 'utf8');
  return createHash('sha256').update(header).update(Buffer.from(image.data)).digest('hex');
};

const lumaGrid = (image: DecodedImage, width: number, height: number): number[] => {
  const values: number[] = [];
  for (let gy = 0; gy < height; gy += 1) {
    for (let gx = 0; gx < width; gx += 1) {
      const x0 = Math.floor((gx * image.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * image.width) / width));
      const y0 = Math.floor((gy * image.height) / height);
      const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * image.height) / height));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const index = (y * image.width + x) * 4;
          const alpha = (image.data[index + 3] ?? 0) / 255;
          const luma =
            0.299 * (image.data[index] ?? 0) +
            0.587 * (image.data[index + 1] ?? 0) +
            0.114 * (image.data[index + 2] ?? 0);
          sum += luma * alpha;
          count += 1;
        }
      }
      values.push(count === 0 ? 0 : sum / count);
    }
  }
  return values;
};

/** 64-bit horizontal difference hash (16 lowercase hex characters). */
export const dHash64 = (image: DecodedImage): string => {
  const grid = lumaGrid(image, 9, 8);
  let bits = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = grid[y * 9 + x] ?? 0;
      const right = grid[y * 9 + x + 1] ?? 0;
      bits += left > right ? '1' : '0';
    }
  }
  let hex = '';
  for (let index = 0; index < 64; index += 4) {
    hex += Number.parseInt(bits.slice(index, index + 4), 2).toString(16);
  }
  return hex;
};

export const hammingDistance = (a: string, b: string): number => {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = Number.parseInt(a[index] as string, 16);
    const right = Number.parseInt(b[index] as string, 16);
    let xor = left ^ right;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
};

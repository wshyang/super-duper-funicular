import type { RasterImage } from '../shared/types.js';

const KEYED = 0;
const KEPT = 255;

function isMagentaLike(r: number, g: number, b: number): boolean {
  if (g >= r * 0.78 || g >= b * 0.78) return false;
  if (r < 55 || b < 45) return false;
  return (b - g) > 0.5 * (r - g) && (r - g) > 25;
}

export function computeKeyedAlpha(image: RasterImage): Uint8Array {
  const { width, height, data } = image;
  const alpha = new Uint8Array(width * height).fill(KEPT);
  const queue: number[] = [];
  seedBorderFlood(image, alpha, queue);
  floodMagenta(image, alpha, queue);
  sweepEnclosedMagenta(data, alpha);
  return alpha;
}

function sweepEnclosedMagenta(data: Buffer, alpha: Uint8Array): void {
  for (let index = 0; index < alpha.length; index++) {
    if (alpha[index] === KEYED) continue;
    const offset = index * 4;
    if (isMagentaLike(data[offset], data[offset + 1], data[offset + 2])) {
      alpha[index] = KEYED;
    }
  }
}

function seedBorderFlood(image: RasterImage, alpha: Uint8Array, queue: number[]): void {
  const { width, height } = image;
  for (let x = 0; x < width; x++) {
    trySeed(image, alpha, queue, x, 0);
    trySeed(image, alpha, queue, x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    trySeed(image, alpha, queue, 0, y);
    trySeed(image, alpha, queue, width - 1, y);
  }
}

function trySeed(image: RasterImage, alpha: Uint8Array, queue: number[], x: number, y: number): void {
  const index = y * image.width + x;
  if (alpha[index] === KEYED) return;
  const offset = index * 4;
  if (!isMagentaLike(image.data[offset], image.data[offset + 1], image.data[offset + 2])) return;
  alpha[index] = KEYED;
  queue.push(index);
}

function floodMagenta(image: RasterImage, alpha: Uint8Array, queue: number[]): void {
  const { width, height, data } = image;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbours = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y < height - 1 ? index + width : -1,
    ];
    for (const neighbour of neighbours) {
      if (neighbour < 0 || alpha[neighbour] === KEYED) continue;
      const offset = neighbour * 4;
      if (isMagentaLike(data[offset], data[offset + 1], data[offset + 2])) {
        alpha[neighbour] = KEYED;
        queue.push(neighbour);
      }
    }
  }
}

export function applyAlpha(image: RasterImage, alpha: Uint8Array): RasterImage {
  const output = { width: image.width, height: image.height, data: Buffer.from(image.data) };
  for (let index = 0; index < alpha.length; index++) {
    output.data[index * 4 + 3] = alpha[index];
  }
  return output;
}

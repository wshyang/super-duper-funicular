import fs from 'node:fs';
import { PNG } from 'pngjs';
import type { Rgba } from '../../shared/atlas-types.js';

export function loadPng(file: string): Rgba {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

export function savePng(file: string, img: Rgba): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  fs.mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

export function createRgba(width: number, height: number): Rgba {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function readRgba(img: Rgba, x: number, y: number): readonly number[] {
  const i = (y * img.width + x) * 4;
  return [img.data[i] ?? 0, img.data[i + 1] ?? 0, img.data[i + 2] ?? 0, img.data[i + 3] ?? 0];
}

/** Magenta chroma matte: true where the pixel is subject (not #FF00FF-family backdrop). */
export function isSubjectPixel(rgba: readonly number[]): boolean {
  const [r, g, b] = rgba;
  const magenta = r > 150 && b > 150 && g < 120 && r - g > 60 && b - g > 60;
  return !magenta;
}

export function sampleBilinearRgba(img: Rgba, x: number, y: number): readonly number[] {
  if (x < 0 || y < 0 || x > img.width - 1 || y > img.height - 1) return [0, 0, 0, 0];
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, img.width - 1);
  const y1 = Math.min(y0 + 1, img.height - 1);
  const fx = x - x0;
  const fy = y - y0;
  const out = [0, 0, 0, 0];
  const corners: readonly (readonly [number, number, number])[] = [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x1, y0, fx * (1 - fy)],
    [x0, y1, (1 - fx) * fy],
    [x1, y1, fx * fy],
  ];
  for (const [cx, cy, w] of corners) {
    const p = readRgba(img, cx, cy);
    for (let c = 0; c < 4; c++) out[c] += (p[c] ?? 0) * w;
  }
  return out;
}

export function meanLuminance(img: Rgba, predicate: (x: number, y: number) => boolean): number {
  let sum = 0;
  let count = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!predicate(x, y)) continue;
      const [r, g, b] = readRgba(img, x, y);
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

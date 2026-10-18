import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import type { RgbaImage } from './rgba-image.ts';

export function decodePngBuffer(buffer: Buffer): RgbaImage {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

export function decodePngFile(path: string): RgbaImage {
  return decodePngBuffer(readFileSync(path));
}

export function encodePngBuffer(image: RgbaImage): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data);
  return PNG.sync.write(png);
}

export function encodePngFile(path: string, image: RgbaImage): void {
  writeFileSync(path, encodePngBuffer(image));
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function sha256Image(image: RgbaImage): string {
  return sha256Buffer(Buffer.from(image.data));
}

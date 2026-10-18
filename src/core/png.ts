import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import type { RasterImage } from './types.js';

export function decodePng(buffer: Buffer): RasterImage {
  const png = PNG.sync.read(buffer);
  const data = new Uint8ClampedArray(png.data.length);
  data.set(png.data);
  return { width: png.width, height: png.height, data };
}

export function readPngFile(filePath: string): RasterImage {
  return decodePng(fs.readFileSync(filePath));
}

export function encodePng(image: RasterImage): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data);
  return PNG.sync.write(png);
}

export function writePngFile(filePath: string, image: RasterImage): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, encodePng(image));
}

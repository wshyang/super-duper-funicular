import fs from 'node:fs';
import path from 'node:path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import type { RasterImage } from '../shared/types.js';

export function decodeImageBuffer(buffer: Buffer, fileHint: string): RasterImage {
  const ext = path.extname(fileHint).toLowerCase();
  if (ext === '.png') {
    const parsed = PNG.sync.read(buffer);
    return {
      width: parsed.width,
      height: parsed.height,
      data: new Uint8ClampedArray(parsed.data),
    };
  }
  const decoded = jpeg.decode(buffer, { useTArray: true });
  return {
    width: decoded.width,
    height: decoded.height,
    data: new Uint8ClampedArray(decoded.data),
  };
}

export function readImageFile(filePath: string): RasterImage {
  const buffer = fs.readFileSync(filePath);
  return decodeImageBuffer(buffer, filePath);
}

export function encodePngBuffer(raster: RasterImage): Buffer {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data.buffer, raster.data.byteOffset, raster.data.byteLength);
  return PNG.sync.write(png);
}

export function writePngFile(filePath: string, raster: RasterImage): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const encoded = encodePngBuffer(raster);
  fs.writeFileSync(filePath, encoded);
}

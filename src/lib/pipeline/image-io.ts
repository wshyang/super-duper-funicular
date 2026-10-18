import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import type { Raster } from '../../shared/types.ts';

/** Node-side codecs (pure JS, no native binaries — ADD-001/ADD-007). */
export function decodeJpeg(buffer: Uint8Array): Raster {
  const image = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

export function decodePng(buffer: Uint8Array): Raster {
  const png = PNG.sync.read(Buffer.from(buffer));
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

export function encodePng(raster: Raster): Uint8Array {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  return new Uint8Array(PNG.sync.write(png));
}

export function getPixel(raster: Raster, x: number, y: number): readonly [number, number, number, number] {
  const i = (y * raster.width + x) * 4;
  return [raster.data[i] ?? 0, raster.data[i + 1] ?? 0, raster.data[i + 2] ?? 0, raster.data[i + 3] ?? 0];
}

import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { createHash } from 'node:crypto';
import type { PixelImage } from '../shared/types';

export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const decodeJpeg = (bytes: Uint8Array): PixelImage => {
  const decoded = jpeg.decode(Buffer.from(bytes), { useTArray: true, maxMemoryUsageInMB: 1024 });
  return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) };
};

export const cropImage = (image: PixelImage, rect: CropRect): PixelImage => {
  const data = new Uint8Array(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const sourceX = rect.x + x;
      const sourceY = rect.y + y;
      if (sourceX < 0 || sourceY < 0 || sourceX >= image.width || sourceY >= image.height) continue;
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const targetOffset = (y * rect.width + x) * 4;
      data[targetOffset] = image.data[sourceOffset] ?? 0;
      data[targetOffset + 1] = image.data[sourceOffset + 1] ?? 0;
      data[targetOffset + 2] = image.data[sourceOffset + 2] ?? 0;
      data[targetOffset + 3] = image.data[sourceOffset + 3] ?? 255;
    }
  }
  return { width: rect.width, height: rect.height, data };
};

export const encodePng = (image: PixelImage): Buffer => {
  const png = new PNG({ width: image.width, height: image.height, colorType: 6 });
  png.data = Buffer.from(image.data);
  return PNG.sync.write(png, { colorType: 6, inputColorType: 6 });
};

export const sha256 = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

export const pixelSha256 = (image: PixelImage): string => {
  const dimensions = Buffer.allocUnsafe(8);
  dimensions.writeUInt32BE(image.width, 0);
  dimensions.writeUInt32BE(image.height, 4);
  return createHash('sha256').update(dimensions).update(image.data).digest('hex');
};

export const alphaBounds = (
  image: PixelImage,
  threshold = 8,
): readonly [number, number, number, number] => {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0 ? [0, 0, 0, 0] : [minX, minY, maxX, maxY];
};

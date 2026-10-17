import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

export interface DecodedImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type ImageExtension = 'png' | 'jpeg' | 'jpg';

export const extensionOf = (path: string): ImageExtension | null => {
  const match = path.toLowerCase().match(/\.(png|jpe?g)$/);
  if (!match) return null;
  const extension = match[1] === 'jpg' ? 'jpeg' : match[1];
  return extension as ImageExtension;
};

export const decodeImage = (buffer: Uint8Array, extension: ImageExtension): DecodedImage => {
  if (extension === 'png') {
    const png = PNG.sync.read(Buffer.from(buffer));
    return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
  }
  const decoded = jpeg.decode(Buffer.from(buffer), { useTArray: true, maxMemoryUsageInMB: 1024 });
  return {
    width: decoded.width,
    height: decoded.height,
    data: new Uint8ClampedArray(decoded.data),
  };
};

export const encodePng = (image: DecodedImage): Buffer => {
  const png = new PNG({ width: image.width, height: image.height, colorType: 6 });
  png.data = Buffer.from(image.data);
  return PNG.sync.write(png, { colorType: 6 });
};

export const cropImage = (
  image: DecodedImage,
  rect: { x: number; y: number; width: number; height: number },
): DecodedImage => {
  const data = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const sourceX = rect.x + x;
      const sourceY = rect.y + y;
      if (sourceX < 0 || sourceY < 0 || sourceX >= image.width || sourceY >= image.height) continue;
      const source = (sourceY * image.width + sourceX) * 4;
      const target = (y * rect.width + x) * 4;
      data[target] = image.data[source] ?? 0;
      data[target + 1] = image.data[source + 1] ?? 0;
      data[target + 2] = image.data[source + 2] ?? 0;
      data[target + 3] = image.data[source + 3] ?? 0;
    }
  }
  return { width: rect.width, height: rect.height, data };
};

export const alphaBounds = (
  image: DecodedImage,
  threshold = 8,
): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) <= threshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
};

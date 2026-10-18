export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface Pixel {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface Rect2 {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function createImage(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function cloneImage(source: RgbaImage): RgbaImage {
  return { width: source.width, height: source.height, data: new Uint8ClampedArray(source.data) };
}

export function getPixel(image: RgbaImage, x: number, y: number): Pixel {
  const i = (y * image.width + x) * 4;
  return { r: image.data[i] ?? 0, g: image.data[i + 1] ?? 0, b: image.data[i + 2] ?? 0, a: image.data[i + 3] ?? 0 };
}

export function setPixel(image: RgbaImage, x: number, y: number, pixel: Pixel): void {
  const i = (y * image.width + x) * 4;
  image.data[i] = pixel.r;
  image.data[i + 1] = pixel.g;
  image.data[i + 2] = pixel.b;
  image.data[i + 3] = pixel.a;
}

export function isMagentaBackdrop(pixel: Pixel): boolean {
  return pixel.r > 200 && pixel.b > 200 && pixel.g < 120;
}

export function isMagentaSpill(pixel: Pixel): boolean {
  return pixel.a > 20 && pixel.r > 150 && pixel.b > 150 && pixel.r - pixel.g > 60 && pixel.b - pixel.g > 60;
}

export function isOpaque(pixel: Pixel): boolean {
  return pixel.a > 20 && !isMagentaBackdrop(pixel);
}

export function isWhiteFabric(pixel: Pixel): boolean {
  return pixel.a > 20 && pixel.r > 215 && pixel.g > 215 && pixel.b > 215;
}

export function luminance(pixel: Pixel): number {
  return 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;
}

export function computeOpaqueBounds(image: RgbaImage): Bounds | null {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (!isOpaque(getPixel(image, x, y))) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

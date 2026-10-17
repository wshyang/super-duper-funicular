import { readFileSync } from "node:fs";

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  /** RGBA, 8 bits per channel, row-major. */
  readonly data: Uint8ClampedArray;
}

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

const isPng = (bytes: Uint8Array): boolean =>
  bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

const isJpeg = (bytes: Uint8Array): boolean =>
  bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

/** Decodes PNG or JPEG bytes into straight-alpha RGBA. */
export async function decodeImage(bytes: Uint8Array): Promise<RgbaImage> {
  if (isPng(bytes)) return decodePng(bytes);
  if (isJpeg(bytes)) return decodeJpeg(bytes);
  throw new ImageDecodeError("Unsupported image format: expected PNG or JPEG");
}

export async function readImage(path: string): Promise<RgbaImage> {
  return decodeImage(new Uint8Array(readFileSync(path)));
}

async function decodePng(bytes: Uint8Array): Promise<RgbaImage> {
  const { PNG } = await import("pngjs");
  const png = PNG.sync.read(Buffer.from(bytes));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}

async function decodeJpeg(bytes: Uint8Array): Promise<RgbaImage> {
  const jpeg = await import("jpeg-js");
  const decoded = jpeg.default.decode(Buffer.from(bytes), { useTArray: true });
  const pixels = decoded.width * decoded.height;
  const data = new Uint8ClampedArray(pixels * 4);
  for (let index = 0; index < pixels; index += 1) {
    const source = index * 4;
    const target = index * 4;
    data[target] = decoded.data[source] ?? 0;
    data[target + 1] = decoded.data[source + 1] ?? 0;
    data[target + 2] = decoded.data[source + 2] ?? 0;
    data[target + 3] = 255;
  }
  return { width: decoded.width, height: decoded.height, data };
}

export function cropImage(image: RgbaImage, x: number, y: number, width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = ((y + row) * image.width + x) * 4;
    data.set(image.data.subarray(sourceStart, sourceStart + width * 4), row * width * 4);
  }
  return { width, height, data };
}

export function pixelAt(image: RgbaImage, x: number, y: number): readonly [number, number, number, number] {
  const index = (y * image.width + x) * 4;
  return [
    image.data[index] ?? 0,
    image.data[index + 1] ?? 0,
    image.data[index + 2] ?? 0,
    image.data[index + 3] ?? 0,
  ];
}

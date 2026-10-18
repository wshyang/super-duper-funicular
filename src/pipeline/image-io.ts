import fs from 'node:fs';
import { PNG } from 'pngjs';
import jpegJs from 'jpeg-js';
import type { RasterImage } from '../shared/types.js';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

function isPngBuffer(bytes: Buffer): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function loadImage(path: string): RasterImage {
  const bytes = fs.readFileSync(path);
  if (isPngBuffer(bytes)) {
    return decodePng(bytes);
  }
  return decodeJpeg(bytes);
}

function decodePng(bytes: Buffer): RasterImage {
  const png = PNG.sync.read(bytes);
  return { width: png.width, height: png.height, data: Buffer.from(png.data) };
}

function decodeJpeg(bytes: Buffer): RasterImage {
  const jpeg = require('jpeg-js') as { decode: (b: Buffer, o: { useTArray: boolean }) => { width: number; height: number; data: number[] } };
  const decoded = jpeg.decode(bytes, { useTArray: true });
  return {
    width: decoded.width,
    height: decoded.height,
    data: Buffer.from(decoded.data),
  };
}

export function saveImage(path: string, image: RasterImage): void {
  const png = new PNG({ width: image.width, height: image.height });
  image.data.copy(png.data);
  fs.mkdirSync(path.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(path, PNG.sync.write(png));
}

export function createImage(width: number, height: number): RasterImage {
  return { width, height, data: Buffer.alloc(width * height * 4, 0) };
}

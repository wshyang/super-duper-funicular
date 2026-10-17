import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { Raster } from "./raster.ts";

export type ImageFormat = "jpeg" | "png";

export function formatForPath(path: string): ImageFormat {
  const extension = extname(path).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  if (extension === ".png") return "png";
  throw new Error(`Unsupported image extension for ${path}; expected .jpg, .jpeg or .png`);
}

/** Decodes JPEG or PNG bytes into an RGBA raster. Pure: no file access. */
export function decodeRaster(bytes: Uint8Array, format: ImageFormat): Raster {
  if (format === "jpeg") {
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) };
  }
  const decoded = PNG.sync.read(Buffer.from(bytes));
  return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) };
}

/** Encodes an RGBA raster as a PNG. Deterministic for identical pixels. */
export function encodePng(raster: Raster): Buffer {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  return PNG.sync.write(png, { deflateLevel: 9 });
}

export async function loadRaster(path: string): Promise<Raster> {
  const bytes = await readFile(path);
  return decodeRaster(new Uint8Array(bytes), formatForPath(path));
}

export async function saveRasterAsPng(path: string, raster: Raster): Promise<void> {
  await writeFile(path, encodePng(raster));
}

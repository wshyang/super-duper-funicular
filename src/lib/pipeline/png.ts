import { PNG } from "pngjs";

/** Encodes straight-alpha RGBA as a PNG buffer. */
export function encodePng(rgba: Uint8ClampedArray, width: number, height: number): Buffer {
  const png = new PNG({ width, height, colorType: 6 });
  png.data = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  return PNG.sync.write(png, { colorType: 6, inputColorType: 6, inputHasAlpha: true });
}

export interface RgbaPixels {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8ClampedArray;
}

/** Nearest-neighbour upscale, used for legible contact sheets. */
export function scaleNearest(source: RgbaPixels, factor: number): RgbaPixels {
  const width = source.width * factor;
  const height = source.height * factor;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.floor(x / factor);
      const sourceY = Math.floor(y / factor);
      const from = (sourceY * source.width + sourceX) * 4;
      const to = (y * width + x) * 4;
      rgba[to] = source.rgba[from] ?? 0;
      rgba[to + 1] = source.rgba[from + 1] ?? 0;
      rgba[to + 2] = source.rgba[from + 2] ?? 0;
      rgba[to + 3] = source.rgba[from + 3] ?? 0;
    }
  }
  return { width, height, rgba };
}

/** Composites a sprite over an opaque backdrop, for SVG-free previews. */
export function onBackdrop(source: RgbaPixels, colour: readonly [number, number, number]): RgbaPixels {
  const rgba = new Uint8ClampedArray(source.width * source.height * 4);
  for (let index = 0; index < source.width * source.height; index += 1) {
    const offset = index * 4;
    const alpha = (source.rgba[offset + 3] ?? 0) / 255;
    rgba[offset] = Math.round((source.rgba[offset] ?? 0) * alpha + colour[0] * (1 - alpha));
    rgba[offset + 1] = Math.round((source.rgba[offset + 1] ?? 0) * alpha + colour[1] * (1 - alpha));
    rgba[offset + 2] = Math.round((source.rgba[offset + 2] ?? 0) * alpha + colour[2] * (1 - alpha));
    rgba[offset + 3] = 255;
  }
  return { width: source.width, height: source.height, rgba };
}

export function blit(
  destination: RgbaPixels,
  source: RgbaPixels,
  targetX: number,
  targetY: number,
): void {
  for (let y = 0; y < source.height; y += 1) {
    const toY = y + targetY;
    if (toY < 0 || toY >= destination.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const toX = x + targetX;
      if (toX < 0 || toX >= destination.width) continue;
      const from = (y * source.width + x) * 4;
      if ((source.rgba[from + 3] ?? 0) === 0) continue;
      const to = (toY * destination.width + toX) * 4;
      destination.rgba[to] = source.rgba[from] ?? 0;
      destination.rgba[to + 1] = source.rgba[from + 1] ?? 0;
      destination.rgba[to + 2] = source.rgba[from + 2] ?? 0;
      destination.rgba[to + 3] = source.rgba[from + 3] ?? 0;
    }
  }
}

/** RGBA raster: 4 bytes per pixel, row-major, top-left origin. */
export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Span {
  /** First index, inclusive. */
  readonly start: number;
  /** Last index, inclusive. */
  readonly end: number;
}

export const BYTES_PER_PIXEL = 4;

export function createRaster(width: number, height: number): Raster {
  return { width, height, data: new Uint8Array(width * height * BYTES_PER_PIXEL) };
}

export function pixelOffset(raster: Raster, x: number, y: number): number {
  return (y * raster.width + x) * BYTES_PER_PIXEL;
}

export function isInside(raster: Raster, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < raster.width && y < raster.height;
}

export function cropRaster(source: Raster, rect: Rect): Raster {
  const output = createRaster(rect.width, rect.height);
  const rowBytes = rect.width * BYTES_PER_PIXEL;
  for (let row = 0; row < rect.height; row += 1) {
    const from = pixelOffset(source, rect.x, rect.y + row);
    output.data.set(source.data.subarray(from, from + rowBytes), row * rowBytes);
  }
  return output;
}

/** Returns a new raster with `source` drawn at `origin`, using source alpha. */
export function compositeOver(target: Raster, source: Raster, origin: Point): Raster {
  const output: Raster = { ...target, data: new Uint8Array(target.data) };
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const tx = origin.x + x;
      const ty = origin.y + y;
      if (!isInside(target, tx, ty)) continue;
      const from = pixelOffset(source, x, y);
      if (source.data[from + 3] === 0) continue;
      output.data.set(source.data.subarray(from, from + BYTES_PER_PIXEL), pixelOffset(target, tx, ty));
    }
  }
  return output;
}

/** Integer nearest-neighbour upscale. Returns a new raster. */
export function scaleNearest(source: Raster, factor: number): Raster {
  const output = createRaster(source.width * factor, source.height * factor);
  for (let y = 0; y < output.height; y += 1) {
    for (let x = 0; x < output.width; x += 1) {
      const from = pixelOffset(source, Math.floor(x / factor), Math.floor(y / factor));
      output.data.set(source.data.subarray(from, from + BYTES_PER_PIXEL), pixelOffset(output, x, y));
    }
  }
  return output;
}

/** Fills a raster with an opaque background colour, returning a new raster. */
export function withBackground(source: Raster, color: readonly [number, number, number]): Raster {
  const data = new Uint8Array(source.data.length);
  for (let index = 0; index < data.length; index += BYTES_PER_PIXEL) {
    data.set([color[0], color[1], color[2], 255], index);
  }
  return compositeOver({ ...source, data }, source, { x: 0, y: 0 });
}

/** Lays rasters out left to right, then top to bottom, into a grid with `columns` cells. */
export function tileRasters(tiles: readonly Raster[], columns: number, background: readonly [number, number, number]): Raster {
  const cellWidth = Math.max(...tiles.map((tile) => tile.width));
  const cellHeight = Math.max(...tiles.map((tile) => tile.height));
  const rows = Math.ceil(tiles.length / columns);
  const canvas = withBackground(createRaster(columns * cellWidth, rows * cellHeight), background);
  return tiles.reduce(
    (sheet, tile, index) => compositeOver(sheet, tile, { x: (index % columns) * cellWidth, y: Math.floor(index / columns) * cellHeight }),
    canvas,
  );
}

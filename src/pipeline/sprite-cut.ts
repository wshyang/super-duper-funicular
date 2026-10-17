import { keepSignificantComponents } from "./connected-components.ts";
import { keyOutBackground } from "./magenta-key.ts";
import { cropRaster, pixelOffset, type Point, type Rect, type Raster } from "./raster.ts";

export interface CellKey {
  readonly row: number;
  readonly column: number;
}

/** One cut-out sprite. `pivot` is in the cut's own pixel coordinates; y = ground line (bottom edge). */
export interface SpriteCut {
  readonly key: CellKey;
  readonly sheetBounds: Rect;
  readonly pixels: Raster;
  readonly pivot: Point;
}

/** Smallest component, as a share of the largest, that still counts as part of the sprite. */
const MINIMUM_COMPONENT_SHARE = 0.02;

export function maskBounds(mask: Uint8Array, width: number, height: number): Rect {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error("Cell contains no sprite pixels");
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Centroid x of the mask, rounded to a whole pixel, within the given rectangle. */
export function maskCentroidX(mask: Uint8Array, width: number, bounds: Rect): number {
  let total = 0;
  let count = 0;
  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      total += x - bounds.x;
      count += 1;
    }
  }
  return Math.round(total / count);
}

function applyAlphaFromMask(pixels: Raster, mask: Uint8Array): Raster {
  const data = new Uint8Array(pixels.data);
  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      const alphaOffset = pixelOffset(pixels, x, y) + 3;
      data[alphaOffset] = mask[y * pixels.width + x] === 0 ? 0 : 255;
    }
  }
  return { ...pixels, data };
}

/** Cuts the sprite out of one grid cell: keys the background, keeps the body, crops, and sets alpha. */
export function cutSpriteFromCell(sheet: Raster, cell: Rect, key: CellKey): SpriteCut {
  const rawMask = keyOutBackground(sheet, cell);
  const mask = keepSignificantComponents(rawMask, cell.width, cell.height, MINIMUM_COMPONENT_SHARE);
  const local = maskBounds(mask, cell.width, cell.height);
  const sheetBounds: Rect = { x: cell.x + local.x, y: cell.y + local.y, width: local.width, height: local.height };
  const cropped = cropRaster(sheet, sheetBounds);
  const cropMask = cropMaskTo(mask, cell.width, local);
  const pixels = applyAlphaFromMask(cropped, cropMask);
  const centroidX = maskCentroidX(mask, cell.width, local);
  return { key, sheetBounds, pixels, pivot: { x: centroidX, y: local.height } };
}

function cropMaskTo(mask: Uint8Array, stride: number, bounds: Rect): Uint8Array {
  const output = new Uint8Array(bounds.width * bounds.height);
  for (let y = 0; y < bounds.height; y += 1) {
    const from = (bounds.y + y) * stride + bounds.x;
    output.set(mask.subarray(from, from + bounds.width), y * bounds.width);
  }
  return output;
}

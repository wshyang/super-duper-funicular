import { createRaster, compositeOver, type Point, type Raster } from "./raster.ts";
import type { SpriteCut } from "./sprite-cut.ts";

export interface RegisteredFrame {
  readonly key: SpriteCut["key"];
  readonly sheetBounds: SpriteCut["sheetBounds"];
  readonly pixels: Raster;
  readonly pivot: Point;
}

export interface Registration {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly pivot: Point;
  readonly frames: readonly RegisteredFrame[];
}

/**
 * Places every cut on one shared canvas so that the centroid column and the ground line
 * coincide in every frame. Nothing is scaled: the artwork keeps its original pixels.
 */
export function registerCuts(cuts: readonly SpriteCut[]): Registration {
  const pivot = sharedPivot(cuts);
  const canvasWidth = Math.max(...cuts.map((cut) => cut.pivot.x)) + Math.max(...cuts.map((cut) => cut.pixels.width - cut.pivot.x));
  const canvasHeight = Math.max(...cuts.map((cut) => cut.pixels.height));
  const frames = cuts.map((cut) => registerOne(cut, pivot, { width: canvasWidth, height: canvasHeight }));
  return { canvasWidth, canvasHeight, pivot, frames };
}

function sharedPivot(cuts: readonly SpriteCut[]): Point {
  return {
    x: Math.max(...cuts.map((cut) => cut.pivot.x)),
    y: Math.max(...cuts.map((cut) => cut.pixels.height)),
  };
}

function registerOne(
  cut: SpriteCut,
  pivot: Point,
  canvas: { readonly width: number; readonly height: number },
): RegisteredFrame {
  const blank = createRaster(canvas.width, canvas.height);
  const origin = { x: pivot.x - cut.pivot.x, y: pivot.y - cut.pivot.y };
  return {
    key: cut.key,
    sheetBounds: cut.sheetBounds,
    pixels: compositeOver(blank, cut.pixels, origin),
    pivot,
  };
}

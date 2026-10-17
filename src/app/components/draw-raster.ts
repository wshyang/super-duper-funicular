import type { Raster } from "../../pipeline/raster.ts";

/** Copies an RGBA raster onto a canvas at its native resolution. The CSS scales it up. */
export function drawRasterToCanvas(canvas: HTMLCanvasElement, raster: Raster): void {
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("2D canvas context is unavailable");
  const pixels = new Uint8ClampedArray(raster.data);
  context.putImageData(new ImageData(pixels, raster.width, raster.height), 0, 0);
}

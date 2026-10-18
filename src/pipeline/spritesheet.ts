import { createImage } from './image-io.js';
import type { RasterImage } from '../shared/types.js';

export function buildHorizontalStrip(frames: readonly RasterImage[], gutterPx = 0): RasterImage {
  const width = frames.reduce((total, frame) => total + frame.width, 0) + gutterPx * (frames.length + 1);
  const height = Math.max(...frames.map((frame) => frame.height)) + gutterPx * 2;
  const strip = createImage(width, height);
  let cursorX = gutterPx;
  for (const frame of frames) {
    blitAt(strip, frame, cursorX, gutterPx);
    cursorX += frame.width + gutterPx;
  }
  return strip;
}

function blitAt(target: RasterImage, source: RasterImage, originX: number, originY: number): void {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const sourceOffset = (y * source.width + x) * 4;
      const alpha = source.data[sourceOffset + 3];
      if (alpha <= 2) continue;
      const targetOffset = ((originY + y) * target.width + originX + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        target.data[targetOffset + channel] = source.data[sourceOffset + channel];
      }
    }
  }
}

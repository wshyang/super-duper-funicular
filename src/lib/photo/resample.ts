import type { CutPart, PhotoPartId } from "./cut.ts";

export interface Scale {
  readonly x: number;
  readonly y: number;
}

const channelAt = (pixels: Uint8ClampedArray, index: number, channel: number): number =>
  (pixels[index * 4 + channel] ?? 0) / 255;

/**
 * Bilinear resample of a cut part. Colour is interpolated premultiplied by
 * alpha, then divided back out, so soft silhouette edges do not darken against
 * transparent neighbours.
 */
export function resamplePart(part: CutPart, scale: Scale, id: PhotoPartId = part.id): CutPart {
  const width = Math.max(1, Math.round(part.width * scale.x));
  const height = Math.max(1, Math.round(part.height * scale.y));
  const pixels = new Uint8ClampedArray(width * height * 4);
  const stepX = part.width / width;
  const stepY = part.height / height;
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(part.height - 1, (y + 0.5) * stepY - 0.5);
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(part.height - 1, y0 + 1);
    const fy = sourceY - y0;
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(part.width - 1, (x + 0.5) * stepX - 0.5);
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(part.width - 1, x0 + 1);
      const fx = sourceX - x0;
      const corners = [
        [y0 * part.width + x0, (1 - fx) * (1 - fy)],
        [y0 * part.width + x1, fx * (1 - fy)],
        [y1 * part.width + x0, (1 - fx) * fy],
        [y1 * part.width + x1, fx * fy],
      ] as const;
      let alpha = 0;
      const colour = [0, 0, 0];
      for (const [index, weight] of corners) {
        const cornerAlpha = channelAt(part.pixels, index, 3);
        alpha += cornerAlpha * weight;
        for (let channel = 0; channel < 3; channel += 1) {
          colour[channel] = (colour[channel] ?? 0) + channelAt(part.pixels, index, channel) * cornerAlpha * weight;
        }
      }
      const target = (y * width + x) * 4;
      if (alpha > 0) {
        for (let channel = 0; channel < 3; channel += 1) {
          pixels[target + channel] = Math.round(((colour[channel] ?? 0) / alpha) * 255);
        }
      }
      pixels[target + 3] = Math.round(alpha * 255);
    }
  }
  return { id, x: 0, y: 0, width, height, pixels };
}

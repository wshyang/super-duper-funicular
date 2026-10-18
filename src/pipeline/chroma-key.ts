import type { PixelImage } from '../shared/types';

export interface ChromaResult {
  readonly image: PixelImage;
  readonly keyedPixels: number;
  readonly despilledPixels: number;
  /** Opaque strong-magenta pixels or magenta-hued pixels still touching the cleared matte. */
  readonly magentaSpill: number;
}

type RGB = readonly [number, number, number];

const MAX_FRINGE_LAYERS = 8;

const isBackground = (red: number, green: number, blue: number): boolean =>
  red > 175 && blue > 170 && green < 175 && red - green > 65 && blue - green > 65;

const isStrongMagenta = (red: number, green: number, blue: number): boolean =>
  red > 205 && blue > 195 && green < 75 && red - green > 120 && blue - green > 115;

const isMagentaFringe = (red: number, green: number, blue: number): boolean =>
  red > 110 &&
  blue > 110 &&
  green < 155 &&
  red - green > 40 &&
  blue - green > 40 &&
  Math.abs(red - blue) < 80;

const readRgb = (image: PixelImage, pixel: number): RGB => {
  const offset = pixel * 4;
  return [image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0];
};

const borderFlood = (image: PixelImage): Uint8Array => {
  const mask = new Uint8Array(image.width * image.height);
  const queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel: number): void => {
    if (mask[pixel] === 1) return;
    const [red, green, blue] = readRgb(image, pixel);
    if (!isBackground(red, green, blue)) return;
    mask[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };
  for (let x = 0; x < image.width; x += 1) {
    enqueue(x);
    enqueue((image.height - 1) * image.width + x);
  }
  for (let y = 0; y < image.height; y += 1) {
    enqueue(y * image.width);
    enqueue(y * image.width + image.width - 1);
  }
  while (head < tail) {
    const pixel = queue[head] ?? 0;
    head += 1;
    const x = pixel % image.width;
    const y = Math.floor(pixel / image.width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < image.width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - image.width);
    if (y + 1 < image.height) enqueue(pixel + image.width);
  }
  return mask;
};

const adjacentBackground = (mask: Uint8Array, image: PixelImage, pixel: number): RGB | null => {
  const x = pixel % image.width;
  const y = Math.floor(pixel / image.width);
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const column = x + dx;
      const row = y + dy;
      if (column < 0 || row < 0 || column >= image.width || row >= image.height) continue;
      const neighbor = row * image.width + column;
      if (mask[neighbor] !== 1) continue;
      const color = readRgb(image, neighbor);
      red += color[0];
      green += color[1];
      blue += color[2];
      count += 1;
    }
  }
  return count === 0 ? null : [red / count, green / count, blue / count];
};

const estimateMatte = (
  image: PixelImage,
  mask: Uint8Array,
  pixel: number,
): {
  readonly foreground: RGB;
  readonly alpha: number;
} | null => {
  const background = adjacentBackground(mask, image, pixel);
  if (!background) return null;
  const observed = readRgb(image, pixel);
  const observedDelta = observed.map((channel, index) => channel - (background[index] ?? 0));
  const observedDistance = observedDelta.reduce((sum, channel) => sum + channel * channel, 0);
  const magentaCast = Math.min(observed[0] - observed[1], observed[2] - observed[1]);
  if (observedDistance < 250 || magentaCast < 20) return null;

  const x = pixel % image.width;
  const y = Math.floor(pixel / image.width);
  let best: { foreground: RGB; alpha: number; residual: number } | null = null;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const column = x + dx;
      const row = y + dy;
      if (column < 0 || row < 0 || column >= image.width || row >= image.height) continue;
      const neighbor = row * image.width + column;
      if (mask[neighbor] === 1) continue;
      const foreground = readRgb(image, neighbor);
      const foregroundDelta = foreground.map(
        (channel, index) => channel - (background[index] ?? 0),
      );
      const foregroundDistance = foregroundDelta.reduce(
        (sum, channel) => sum + channel * channel,
        0,
      );
      if (foregroundDistance < observedDistance * 1.15 || foregroundDistance < 2_000) continue;
      const dot = observedDelta.reduce(
        (sum, channel, index) => sum + channel * (foregroundDelta[index] ?? 0),
        0,
      );
      const alpha = dot / foregroundDistance;
      if (alpha < 0.08 || alpha >= 0.98) continue;
      const residual = Math.sqrt(
        observedDelta.reduce((sum, channel, index) => {
          const error = channel - alpha * (foregroundDelta[index] ?? 0);
          return sum + error * error;
        }, 0) / 3,
      );
      if (residual > 32 || (best && residual >= best.residual)) continue;
      best = { foreground, alpha, residual };
    }
  }
  return best ? { foreground: best.foreground, alpha: best.alpha } : null;
};

export const keyMagentaBackground = (source: PixelImage): ChromaResult => {
  const mask = borderFlood(source);
  const data = new Uint8Array(source.data);
  let keyedPixels = 0;
  let despilledPixels = 0;
  let magentaSpill = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const [red, green, blue] = readRgb(source, pixel);
    if (mask[pixel] !== 1 && !isStrongMagenta(red, green, blue)) continue;
    const offset = pixel * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
    mask[pixel] = 1;
    keyedPixels += 1;
  }

  // Peel the JPEG's magenta halo outward from the connected matte, stopping at dark outlines.
  for (let layer = 0; layer < MAX_FRINGE_LAYERS; layer += 1) {
    const nextMask = new Uint8Array(mask);
    let removedInLayer = 0;
    for (let pixel = 0; pixel < mask.length; pixel += 1) {
      if (mask[pixel] === 1) continue;
      const [red, green, blue] = readRgb(source, pixel);
      if (!isMagentaFringe(red, green, blue) || !adjacentBackground(mask, source, pixel)) continue;
      const offset = pixel * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      nextMask[pixel] = 1;
      keyedPixels += 1;
      removedInLayer += 1;
    }
    if (removedInLayer === 0) break;
    mask.set(nextMask);
  }

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (mask[pixel] === 1) continue;
    const matte = estimateMatte(source, mask, pixel);
    if (!matte) continue;
    const offset = pixel * 4;
    data[offset] = matte.foreground[0];
    data[offset + 1] = matte.foreground[1];
    data[offset + 2] = matte.foreground[2];
    data[offset + 3] = Math.round(matte.alpha * 255);
    despilledPixels += 1;
  }

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    if ((data[offset + 3] ?? 0) < 16) continue;
    const [red, green, blue] = [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
    if (
      isStrongMagenta(red, green, blue) ||
      (isMagentaFringe(red, green, blue) && adjacentBackground(mask, source, pixel) !== null)
    ) {
      magentaSpill += 1;
    }
  }
  return {
    image: { width: source.width, height: source.height, data },
    keyedPixels,
    despilledPixels,
    magentaSpill,
  };
};

import type { DecodedImage } from './image-codec.ts';

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface QuantisedImage {
  readonly palette: readonly Rgb[];
  readonly labels: Int16Array;
  readonly counts: readonly number[];
  readonly width: number;
  readonly height: number;
}

interface Sample {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly count: number;
}

const OPAQUE = 128;

const gatherSamples = (image: DecodedImage): Sample[] => {
  const buckets = new Map<number, Sample>();
  const { data } = image;
  for (let offset = 0; offset < data.length; offset += 16) {
    if ((data[offset + 3] ?? 0) < OPAQUE) continue;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const existing = buckets.get(key);
    if (existing) buckets.set(key, { ...existing, count: existing.count + 1 });
    else buckets.set(key, { r, g, b, count: 1 });
  }
  return [...buckets.values()];
};

interface Box {
  readonly samples: readonly Sample[];
  readonly range: number;
  readonly axis: 'r' | 'g' | 'b';
}

const boxOf = (samples: readonly Sample[]): Box => {
  let minR = 255;
  let minG = 255;
  let minB = 255;
  let maxR = 0;
  let maxG = 0;
  let maxB = 0;
  for (const sample of samples) {
    minR = Math.min(minR, sample.r);
    maxR = Math.max(maxR, sample.r);
    minG = Math.min(minG, sample.g);
    maxG = Math.max(maxG, sample.g);
    minB = Math.min(minB, sample.b);
    maxB = Math.max(maxB, sample.b);
  }
  const spans: [number, 'r' | 'g' | 'b'][] = [
    [maxR - minR, 'r'],
    [maxG - minG, 'g'],
    [maxB - minB, 'b'],
  ];
  spans.sort((a, b) => b[0] - a[0]);
  return { samples, range: spans[0]?.[0] ?? 0, axis: spans[0]?.[1] ?? 'r' };
};

const splitBox = (box: Box): [Box, Box] | null => {
  const sorted = [...box.samples].sort((a, b) => a[box.axis] - b[box.axis]);
  if (sorted.length < 2) return null;
  const total = sorted.reduce((sum, sample) => sum + sample.count, 0);
  let running = 0;
  let splitIndex = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    running += (sorted[index] as Sample).count;
    if (running >= total / 2) {
      splitIndex = index;
      break;
    }
  }
  const left = sorted.slice(0, Math.max(1, splitIndex));
  const right = sorted.slice(Math.max(1, splitIndex));
  if (left.length === 0 || right.length === 0) return null;
  return [boxOf(left), boxOf(right)];
};

const averageColor = (samples: readonly Sample[]): Rgb => {
  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  for (const sample of samples) {
    r += sample.r * sample.count;
    g += sample.g * sample.count;
    b += sample.b * sample.count;
    weight += sample.count;
  }
  const divisor = Math.max(1, weight);
  return {
    r: Math.round(r / divisor),
    g: Math.round(g / divisor),
    b: Math.round(b / divisor),
  };
};

/** Deterministic median-cut palette; no randomness, so builds are reproducible. */
export const buildPalette = (image: DecodedImage, maxColors: number): Rgb[] => {
  const samples = gatherSamples(image);
  if (samples.length === 0) return [];
  let boxes: Box[] = [boxOf(samples)];
  while (boxes.length < maxColors) {
    const target = boxes.reduce(
      (best, box) => (box.range > best.range ? box : best),
      boxes[0] as Box,
    );
    if (target.range <= 0) break;
    const split = splitBox(target);
    if (!split) break;
    boxes = boxes.filter((box) => box !== target).concat(split);
  }
  return boxes
    .map((box) => averageColor(box.samples))
    .sort((a, b) => a.r - b.r || a.g - b.g || a.b - b.b);
};

const nearestIndex = (palette: readonly Rgb[], r: number, g: number, b: number): number => {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < palette.length; index += 1) {
    const entry = palette[index] as Rgb;
    const dr = entry.r - r;
    const dg = entry.g - g;
    const db = entry.b - b;
    const distance = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
};

/** Assign every pixel to the nearest palette entry; transparent pixels become -1. */
export const quantiseImage = (image: DecodedImage, maxColors = 14): QuantisedImage => {
  const palette = buildPalette(image, maxColors);
  const labels = new Int16Array(image.width * image.height).fill(-1);
  const counts = new Array<number>(palette.length).fill(0);
  for (let pixel = 0; pixel < labels.length; pixel += 1) {
    const offset = pixel * 4;
    if ((image.data[offset + 3] ?? 0) < OPAQUE || palette.length === 0) continue;
    const index = nearestIndex(
      palette,
      image.data[offset] ?? 0,
      image.data[offset + 1] ?? 0,
      image.data[offset + 2] ?? 0,
    );
    labels[pixel] = index;
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return { palette, labels, counts, width: image.width, height: image.height };
};

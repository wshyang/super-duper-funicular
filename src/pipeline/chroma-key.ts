import type { DecodedImage } from './image-codec.ts';

const isLooseMagenta = (r: number, g: number, b: number): boolean =>
  r > 120 && b > 120 && g < 175 && r - g > 42 && b - g > 42;

const isStrongMagenta = (r: number, g: number, b: number): boolean =>
  r > 195 && b > 195 && g < 105 && r - g > 100 && b - g > 100;

export interface ChromaKeyResult {
  readonly image: DecodedImage;
  readonly keyedPixels: number;
  readonly despilledPixels: number;
}

/** Breadth-first flood fill from the image border over loose-magenta pixels. */
const floodBackground = (data: Uint8ClampedArray, width: number, height: number): Uint8Array => {
  const keyed = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const push = (index: number): void => {
    if (keyed[index] === 1) return;
    const offset = index * 4;
    if (!isLooseMagenta(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0)) return;
    keyed[index] = 1;
    queue[tail] = index;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head] as number;
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }
  return keyed;
};

const clearPixel = (data: Uint8ClampedArray, offset: number): void => {
  data[offset] = 0;
  data[offset + 1] = 0;
  data[offset + 2] = 0;
  data[offset + 3] = 0;
};

const despillPixel = (data: Uint8ClampedArray, offset: number): boolean => {
  const r = data[offset] ?? 0;
  const g = data[offset + 1] ?? 0;
  const b = data[offset + 2] ?? 0;
  if (r <= g + 70 || b <= g + 70) return false;
  const target = Math.round((r + b) / 2);
  data[offset] = Math.min(r, target - 22);
  data[offset + 1] = Math.min(255, g + 8);
  data[offset + 2] = Math.min(b, target - 22);
  return true;
};

/**
 * Border-seeded flood fill plus an interior strong-magenta sweep. Seeding from
 * the border protects interior purple jersey pixels that share magenta's hue.
 */
export const keyMagentaBackground = (source: DecodedImage): ChromaKeyResult => {
  const { width, height } = source;
  const data = new Uint8ClampedArray(source.data);
  const keyed = floodBackground(data, width, height);
  let keyedPixels = 0;
  let despilledPixels = 0;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const strong = isStrongMagenta(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
    if (keyed[index] === 1 || strong) {
      clearPixel(data, offset);
      keyedPixels += 1;
    } else if (despillPixel(data, offset)) {
      despilledPixels += 1;
    }
  }
  return { image: { width, height, data }, keyedPixels, despilledPixels };
};

/** Count opaque pixels whose colour still reads as magenta, for QC gates. */
export const countMagentaSpill = (image: DecodedImage): number => {
  let spill = 0;
  for (let index = 0; index < image.width * image.height; index += 1) {
    const offset = index * 4;
    if ((image.data[offset + 3] ?? 0) < 16) continue;
    const r = image.data[offset] ?? 0;
    const g = image.data[offset + 1] ?? 0;
    const b = image.data[offset + 2] ?? 0;
    if (isStrongMagenta(r, g, b)) spill += 1;
  }
  return spill;
};

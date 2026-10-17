import type { RgbaImage } from "./decode.ts";

/**
 * The source sheet is drawn on a saturated magenta field. JPEG compression
 * smears that magenta a few pixels into every edge, so the key is a soft score
 * rather than a hard boolean: 1 means pure key colour, 0 means certainly art.
 */
export function magentaScore(red: number, green: number, blue: number): number {
  const chroma = Math.min(red, blue) - green;
  const blueRedBalance = Math.abs(red - blue);
  const brightness = Math.min(red, blue);
  if (chroma <= 0) return 0;
  const chromaScore = clamp01((chroma - 35) / 55);
  const brightnessScore = clamp01((brightness - 140) / 60);
  const balanceScore = clamp01(1 - blueRedBalance / 60);
  return Math.min(chromaScore, brightnessScore, balanceScore);
}

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * True for any pixel carrying magenta: the bright key itself and the dark
 * purple ringing that JPEG leaves along a hard edge. Magenta has near-equal red
 * and blue; the sheet's purple kit does not (its blue is 28 levels above its
 * red), which keeps artwork out of this test.
 */
export function isKeyBlend(red: number, green: number, blue: number): boolean {
  const purpleLike = Math.min(red, blue) - green > 30 && Math.abs(red - blue) < 14;
  return purpleLike || magentaScore(red, green, blue) > 0.5;
}

/** Foreground opacity per pixel: 0 on keyed background, 1 on solid art. */
export function keyAlpha(image: RgbaImage, threshold = 0.5): Float32Array {
  const alpha = new Float32Array(image.width * image.height);
  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 4;
    const score = magentaScore(image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0);
    alpha[index] = score >= threshold ? 0 : 1;
  }
  return alpha;
}

/**
 * Soft alpha plus colour decontamination. Each pixel is treated as
 * `art * a + magenta * (1 - a)`, and `a` is derived from how much magenta is
 * left. The recovered art colour is then written back, which removes the pink
 * fringe that a plain binary key leaves on JPEG edges.
 */
export function keyAndUnmix(image: RgbaImage): Uint8ClampedArray {
  const output = new Uint8ClampedArray(image.width * image.height * 4);
  const key = { r: 253, g: 74, b: 253 };
  for (let index = 0; index < image.width * image.height; index += 1) {
    const offset = index * 4;
    const red = image.data[offset] ?? 0;
    const green = image.data[offset + 1] ?? 0;
    const blue = image.data[offset + 2] ?? 0;
    const score = magentaScore(red, green, blue);
    if (score >= 0.92) continue;
    const alpha = 1 - score;
    const safeAlpha = alpha < 0.08 ? 0.08 : alpha;
    const art = {
      r: (red - key.r * (1 - safeAlpha)) / safeAlpha,
      g: (green - key.g * (1 - safeAlpha)) / safeAlpha,
      b: (blue - key.b * (1 - safeAlpha)) / safeAlpha,
    };
    output[offset] = clampByte(art.r);
    output[offset + 1] = clampByte(art.g);
    output[offset + 2] = clampByte(art.b);
    output[offset + 3] = Math.round(alpha * 255);
  }
  return output;
}

const clampByte = (value: number): number => Math.round(Math.min(255, Math.max(0, value)));

/** Largest blob of non-background art inside an image, useful for bounds checks. */
export function alphaBounds(mask: Float32Array, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((mask[y * width + x] ?? 0) <= 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

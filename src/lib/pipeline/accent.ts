import type { RgbaImage } from "./decode.ts";

export interface Accent {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly hex: string;
  readonly name: string;
}

const HUE_NAMES: readonly { readonly max: number; readonly name: string }[] = [
  { max: 15, name: "red" },
  { max: 40, name: "orange" },
  { max: 68, name: "yellow" },
  { max: 160, name: "green" },
  { max: 255, name: "blue" },
  { max: 290, name: "purple" },
  { max: 340, name: "magenta" },
  { max: 361, name: "red" },
];

const toHex = (value: number): string => value.toString(16).padStart(2, "0");

/**
 * Finds the kit colour of a figure: the most common saturated pixel that is
 * neither skin, hair, shorts, shoe nor outline. It is used to name the colour
 * variant folder from the artwork itself instead of a hard-coded row order.
 */
export function detectAccent(image: RgbaImage): Accent {
  const buckets = new Map<number, { count: number; red: number; green: number; blue: number }>();
  for (let index = 0; index < image.width * image.height; index += 1) {
    const offset = index * 4;
    if ((image.data[offset + 3] ?? 255) < 200) continue;
    const red = image.data[offset] ?? 0;
    const green = image.data[offset + 1] ?? 0;
    const blue = image.data[offset + 2] ?? 0;
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
    if (saturation < 0.45 || maximum < 70) continue;
    if (isSkin(red, green, blue) || isShorts(red, green, blue) || isHair(red, green, blue)) continue;
    const hue = hueOf(red, green, blue);
    const bucketKey = Math.round(hue / 10) * 10;
    const bucket = buckets.get(bucketKey) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    buckets.set(bucketKey, bucket);
  }
  const best = [...buckets.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (best === undefined) {
    return { red: 200, green: 60, blue: 60, hex: "#c83c3c", name: "unknown" };
  }
  const [hueBucket, entry] = best;
  const red = Math.round(entry.red / entry.count);
  const green = Math.round(entry.green / entry.count);
  const blue = Math.round(entry.blue / entry.count);
  const hue = ((hueBucket % 360) + 360) % 360;
  const name = HUE_NAMES.find((candidate) => hue < candidate.max)?.name ?? "unknown";
  return { red, green, blue, hex: `#${toHex(red)}${toHex(green)}${toHex(blue)}`, name };
}

const isSkin = (red: number, green: number, blue: number): boolean =>
  red > 120 && red < 250 && green > 70 && green < 190 && blue > 45 && blue < 165 && red > green + 18 && green > blue + 6;

const isShorts = (red: number, green: number, blue: number): boolean =>
  red < 100 && green < 115 && blue > 40 && blue < 155 && blue > red;

const isHair = (red: number, green: number, blue: number): boolean =>
  red < 130 && green < 90 && blue < 70;

function hueOf(red: number, green: number, blue: number): number {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0) return 0;
  let hue: number;
  if (maximum === red) hue = ((green - blue) / delta) % 6;
  else if (maximum === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return ((hue * 60) % 360 + 360) % 360;
}

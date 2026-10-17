export type Rgb = readonly [number, number, number];

export interface RunnerVariant {
  readonly id: string;
  readonly label: string;
  /** Shirt and sock colour, sampled from the reference sheet's accent pixels. */
  readonly accent: Rgb;
}

export interface RunnerColors {
  readonly skin: Rgb;
  readonly skinShade: Rgb;
  readonly hair: Rgb;
  readonly shorts: Rgb;
  readonly shoe: Rgb;
  readonly outline: Rgb;
  readonly eye: Rgb;
  readonly accent: Rgb;
}

/** Shared colours sampled from the reference sheet. */
export const SHARED_COLORS: Omit<RunnerColors, "accent"> = {
  skin: [0xd2, 0x84, 0x5a],
  skinShade: [0xb8, 0x64, 0x3e],
  hair: [0x48, 0x24, 0x06],
  shorts: [0x30, 0x3c, 0x54],
  shoe: [0x24, 0x2a, 0x42],
  outline: [0x12, 0x06, 0x0a],
  eye: [0x06, 0x00, 0x00],
};

export const RUNNER_VARIANTS: readonly RunnerVariant[] = [
  { id: "red", label: "Red", accent: [0xc8, 0x28, 0x24] },
  { id: "blue", label: "Blue", accent: [0x34, 0x74, 0xd8] },
  { id: "green", label: "Green", accent: [0x2c, 0xa8, 0x24] },
  { id: "yellow", label: "Yellow", accent: [0xfc, 0xe8, 0x00] },
  { id: "purple", label: "Purple", accent: [0x80, 0x30, 0x9c] },
  { id: "orange", label: "Orange", accent: [0xfc, 0x7c, 0x08] },
];

export function colorsFor(variant: RunnerVariant): RunnerColors {
  return { ...SHARED_COLORS, accent: variant.accent };
}

export function findVariant(id: string): RunnerVariant {
  const variant = RUNNER_VARIANTS.find((candidate) => candidate.id === id);
  if (variant === undefined) throw new Error(`Unknown runner variant: ${id}`);
  return variant;
}

/** Multiplies a colour by a factor below 1 to push a far-side limb into shadow. */
export function shade(color: Rgb, factor: number): Rgb {
  return [Math.round(color[0] * factor), Math.round(color[1] * factor), Math.round(color[2] * factor)];
}

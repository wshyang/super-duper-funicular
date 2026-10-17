export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface Palette {
  readonly skin: Rgb;
  readonly skinShade: Rgb;
  readonly skinLight: Rgb;
  readonly shirt: Rgb;
  readonly shirtShade: Rgb;
  readonly shirtLight: Rgb;
  readonly shorts: Rgb;
  readonly shortsShade: Rgb;
  readonly shortsLight: Rgb;
  readonly stripe: Rgb;
  readonly sock: Rgb;
  readonly sockShade: Rgb;
  readonly sockLight: Rgb;
  readonly shoe: Rgb;
  readonly shoeShade: Rgb;
  readonly shoeLight: Rgb;
  readonly sole: Rgb;
  readonly hair: Rgb;
  readonly hairShade: Rgb;
  readonly hairLight: Rgb;
  readonly outline: Rgb;
  readonly eye: Rgb;
  readonly mouth: Rgb;
  readonly white: Rgb;
}

export interface Colorway {
  readonly id: string;
  readonly label: string;
  readonly shirt: Rgb;
}

export const hex = (value: string): Rgb => ({
  r: Number.parseInt(value.slice(1, 3), 16),
  g: Number.parseInt(value.slice(3, 5), 16),
  b: Number.parseInt(value.slice(5, 7), 16),
});

export const rgbCss = (color: Rgb): string => `rgb(${color.r} ${color.g} ${color.b})`;

export const mixRgb = (a: Rgb, b: Rgb, amount: number): Rgb => ({
  r: Math.round(a.r + (b.r - a.r) * amount),
  g: Math.round(a.g + (b.g - a.g) * amount),
  b: Math.round(a.b + (b.b - a.b) * amount),
});

export const shadeRgb = (color: Rgb, factor: number): Rgb =>
  mixRgb(color, { r: 0, g: 0, b: 0 }, 1 - factor);

export const lightenRgb = (color: Rgb, amount: number): Rgb =>
  mixRgb(color, { r: 255, g: 255, b: 255 }, amount);

const SHARED = {
  skin: hex("#d2845a"),
  skinShade: hex("#af6238"),
  skinLight: hex("#e9a578"),
  shorts: hex("#303c54"),
  shortsShade: hex("#202838"),
  shortsLight: hex("#4a5872"),
  stripe: hex("#5c7a3c"),
  shoe: hex("#242b42"),
  shoeShade: hex("#151a2b"),
  shoeLight: hex("#3d4866"),
  sole: hex("#11141f"),
  hair: hex("#4a260a"),
  hairShade: hex("#311805"),
  hairLight: hex("#6d3c14"),
  outline: hex("#160a10"),
  eye: hex("#0a0507"),
  mouth: hex("#8a4a38"),
  white: hex("#f1e9dc"),
} as const;

export const COLORWAYS: readonly Colorway[] = [
  { id: "red", label: "Red", shirt: hex("#c8282c") },
  { id: "blue", label: "Blue", shirt: hex("#3474d8") },
  { id: "green", label: "Green", shirt: hex("#2ca824") },
  { id: "yellow", label: "Yellow", shirt: hex("#f0d000") },
  { id: "purple", label: "Purple", shirt: hex("#80309c") },
  { id: "orange", label: "Orange", shirt: hex("#f87c08") },
];

export function findColorway(id: string): Colorway {
  const colorway = COLORWAYS.find((candidate) => candidate.id === id);
  if (colorway === undefined) throw new Error(`Unknown colorway: ${id}`);
  return colorway;
}

/** The sock shares the accent colour, exactly as in the source sheet. */
export function buildPalette(colorway: Colorway): Palette {
  const accent = colorway.shirt;
  const isYellow = colorway.id === "yellow";
  return {
    ...SHARED,
    shirt: accent,
    shirtShade: shadeRgb(accent, 0.66),
    shirtLight: lightenRgb(accent, isYellow ? 0.18 : 0.26),
    sock: accent,
    sockShade: shadeRgb(accent, 0.62),
    sockLight: lightenRgb(accent, isYellow ? 0.22 : 0.3),
  };
}

/**
 * Far-side limbs sit in shadow, which is the depth cue the source sheet lacks.
 * The shadow is cooled towards blue as well as darkened, so a far limb reads as
 * "behind" rather than as dirty.
 */
export function shadePalette(palette: Palette, factor: number): Palette {
  const shade = (color: Rgb) => mixRgb(shadeRgb(color, factor), { r: 34, g: 46, b: 72 }, 0.18);
  return {
    ...palette,
    skin: shade(palette.skin),
    skinShade: shade(palette.skinShade),
    skinLight: shade(palette.skinLight),
    shirt: shade(palette.shirt),
    shirtShade: shade(palette.shirtShade),
    shirtLight: shade(palette.shirtLight),
    shorts: shade(palette.shorts),
    shortsShade: shade(palette.shortsShade),
    shortsLight: shade(palette.shortsLight),
    sock: shade(palette.sock),
    sockShade: shade(palette.sockShade),
    sockLight: shade(palette.sockLight),
    shoe: shade(palette.shoe),
    shoeShade: shade(palette.shoeShade),
    shoeLight: shade(palette.shoeLight),
    sole: shade(palette.sole),
    hair: shade(palette.hair),
    hairShade: shade(palette.hairShade),
    hairLight: shade(palette.hairLight),
    outline: palette.outline,
    white: shade(palette.white),
  };
}

import { pixelIndex } from '../core/raster.js';
import type { RasterImage } from '../core/types.js';
import { isChromaPixel } from '../analysis/chroma.js';
import type { RegionId, Rgb } from './master-profile.js';

/**
 * Material palette, measured rather than declared.
 *
 * The first version of the profiler classified materials with hue rules:
 * "fabric is red, skin is warm, shorts are dark, shoes are bright". Those rules
 * are a description of *one* photograph. A second persona in a jade-green
 * singlet produced `shoulder = 173` (four pixels under the chin) and
 * `shortsHem = 405`, above `hip = 466`, because almost none of her clothing
 * satisfied "red".
 *
 * The palette is now sampled where anatomy guarantees a material: the face is
 * skin, the chest band is the top, the hip band is the shorts, the sole band is
 * the shoe, the back of the head is hair. Classification is nearest-colour
 * against those five measurements. A persona may therefore wear any colour; what
 * it may not do is put its singlet somewhere other than its torso.
 */
export interface Palette {
  readonly skin: Rgb;
  readonly fabric: Rgb;
  readonly shorts: Rgb;
  readonly shoe: Rgb;
  readonly hair: Rgb;
  /** True when a role had to fall back to a plausible default. */
  readonly fallbacks: readonly RegionId[];
  /**
   * Row above which a dark pixel is hair rather than shorts. Black hair and
   * black shorts are the same colour; without a positional rule the ponytail can
   * bind to the pelvis bone and the shorts to the head.
   */
  readonly hairBelowY: number;
}

interface Sample {
  readonly colour: Rgb;
  readonly count: number;
}

/**
 * Subject pixels at least `radius` pixels from the backdrop, in 8 directions.
 * The anti-aliased halo around a keyed figure blends with the backdrop; sampling
 * it produced a "skin" colour of #723b5b — mauve, because it was half magenta.
 * Every palette sample is taken from this eroded interior.
 */
export function interiorMask(master: RasterImage, key: Rgb, radius = 5): Uint8Array {
  const { width, height } = master;
  const subject = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = pixelIndex(master, x, y);
      subject[y * width + x] =
        isChromaPixel(master.data[i] ?? 0, master.data[i + 1] ?? 0, master.data[i + 2] ?? 0, key) ? 0 : 1;
    }
  }
  const interior = new Uint8Array(width * height);
  const offsets: ReadonlyArray<readonly [number, number]> = [
    [radius, 0], [-radius, 0], [0, radius], [0, -radius],
    [radius, radius], [radius, -radius], [-radius, radius], [-radius, -radius],
  ];
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const index = y * width + x;
      if (!subject[index]) continue;
      let ok = 1;
      for (const [dx, dy] of offsets) {
        if (!subject[(y + dy) * width + (x + dx)]) {
          ok = 0;
          break;
        }
      }
      interior[index] = ok;
    }
  }
  return interior;
}

/**
 * Most common colour among subject pixels in a horizontal band, after removing
 * pixels close to any excluded colour. Quantised to 16 levels per channel so
 * that photographic noise collapses into one bin instead of becoming one
 * cluster per pixel.
 */
function bandDominant(
  master: RasterImage,
  interior: Uint8Array,
  y0: number,
  y1: number,
  excluded: readonly Rgb[],
  exclusionRadius = 70,
): Sample | null {
  const bins = new Map<number, { r: number; g: number; b: number; n: number }>();
  const top = Math.max(0, Math.floor(y0));
  const bottom = Math.min(master.height - 1, Math.ceil(y1));
  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < master.width; x++) {
      if (!interior[y * master.width + x]) continue;
      const i = pixelIndex(master, x, y);
      const r = master.data[i] ?? 0;
      const g = master.data[i + 1] ?? 0;
      const b = master.data[i + 2] ?? 0;
      if (excluded.some((colour) => Math.hypot(r - colour.r, g - colour.g, b - colour.b) < exclusionRadius)) {
        continue;
      }
      const qu = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
      const bin = bins.get(qu);
      if (bin) {
        bin.r += r;
        bin.g += g;
        bin.b += b;
        bin.n++;
      } else {
        bins.set(qu, { r, g, b, n: 1 });
      }
    }
  }
  let best: Sample | null = null;
  for (const bin of bins.values()) {
    const count = bin.n;
    if (!best || count > best.count) {
      best = { colour: { r: Math.round(bin.r / count), g: Math.round(bin.g / count), b: Math.round(bin.b / count) }, count };
    }
  }
  return best;
}

/**
 * Dominant colour of the leading (`side = 1`) or trailing (`side = -1`) edge of
 * a band: for each row, only subject pixels within `depth` pixels of the
 * silhouette's anterior (or posterior) extent. This is how skin and hair are
 * sampled without guessing: a standing lateral figure has a face at the front of
 * its head and hair at the back, and at hip height its leading edge is a hand.
 */
function edgeDominant(
  master: RasterImage,
  interior: Uint8Array,
  y0: number,
  y1: number,
  side: 1 | -1,
  /** Skip the outermost pixels: the blend band there is 4–6 px wide on a soft-lit plate. */
  skip = 4,
  depth = 18,
): Sample | null {
  const bins = new Map<number, Bin>();
  const top = Math.max(0, Math.floor(y0));
  const bottom = Math.min(master.height - 1, Math.ceil(y1));
  for (let y = top; y <= bottom; y++) {
    const edge = silhouetteEdge(interior, master.width, y, side);
    if (edge < 0) continue;
    collectInset(bins, master, interior, y, edge, side, skip, depth);
  }
  return dominantBin(bins);
}

type Bin = { r: number; g: number; b: number; n: number };

/** Column of the silhouette boundary on one side of row `y`, or −1. */
function silhouetteEdge(interior: Uint8Array, width: number, y: number, side: 1 | -1): number {
  for (let step = 0; step < width; step++) {
    const x = side === 1 ? width - 1 - step : step;
    if (interior[y * width + x]) return x;
  }
  return -1;
}

/** Accumulates `depth` pixels inward from `edge`, quantised into coarse colour bins. */
function collectInset(
  bins: Map<number, Bin>,
  master: RasterImage,
  interior: Uint8Array,
  y: number,
  edge: number,
  side: 1 | -1,
  skip: number,
  depth: number,
): void {
  for (let d = skip; d < skip + depth; d++) {
    const x = edge - side * d;
    if (x < 0 || x >= master.width) break;
    if (!interior[y * master.width + x]) continue;
    const i = pixelIndex(master, x, y);
    const r = master.data[i] ?? 0;
    const g = master.data[i + 1] ?? 0;
    const b = master.data[i + 2] ?? 0;
    const qu = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
    const bin = bins.get(qu);
    if (bin) {
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bin.n++;
    } else {
      bins.set(qu, { r, g, b, n: 1 });
    }
  }
}

/** The most populous bin, averaged. A mode, not a mean: it ignores the minority. */
function dominantBin(bins: ReadonlyMap<number, Bin>): Sample | null {
  let best: Sample | null = null;
  for (const bin of bins.values()) {
    if (!best || bin.n > best.count) {
      best = {
        colour: { r: Math.round(bin.r / bin.n), g: Math.round(bin.g / bin.n), b: Math.round(bin.b / bin.n) },
        count: bin.n,
      };
    }
  }
  return best;
}

/** Luminance used only to order hair (darkest) among candidates. */
function luma(colour: Rgb): number {
  return 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
}

export interface PaletteInput {
  readonly master: RasterImage;
  readonly key: Rgb;
  readonly topY: number;
  readonly soleY: number;
  readonly minX: number;
  readonly maxX: number;
}

/**
 * Samples the five roles. Bands are expressed as fractions of measured stature,
 * which is the one quantity that is always reliable: it needs only the crown and
 * the sole, and those are the silhouette's first and last non-background rows.
 */
export function measurePalette(input: PaletteInput): Palette {
  const { master, key, topY, soleY } = input;
  const stature = Math.max(8, soleY - topY);
  const band = (a: number, b: number): [number, number] => [topY + stature * a, topY + stature * b];
  const fallbacks: RegionId[] = [];
  const interior = interiorMask(master, key);

  // Skin: the leading edge of the face band. NOT the whole head band — in a
  // profile the hair dominates that band, which is how the first attempt ended
  // up with a skin colour of #0b090a.
  const skinSample = edgeDominant(master, interior, ...band(0.05, 0.12), 1) ??
    edgeDominant(master, interior, ...band(0.4, 0.55), 1);
  const skin = skinSample?.colour ?? { r: 200, g: 150, b: 120 };
  if (!skinSample) fallbacks.push('skin');

  // Hair: the darkest dominant colour of the head band. In a lateral view the
  // hair occupies the back half of the skull, so it dominates that band in every
  // photograph that has any hair at all.
  // Hair: the trailing edge of the skull.
  const hairSample = edgeDominant(master, interior, ...band(0.01, 0.1), -1);
  const hair = hairSample && luma(hairSample.colour) < luma(skin) ? hairSample.colour : { r: 22, g: 18, b: 18 };
  if (!hairSample || luma(hairSample.colour) >= luma(skin)) fallbacks.push('hair');

  const torso = bandDominant(master, interior, ...band(0.28, 0.4), [skin, hair]);
  const fabric = torso?.colour ?? { r: 160, g: 40, b: 50 };
  if (!torso) fallbacks.push('fabric');

  // Hair is deliberately NOT excluded here: black shorts are within a few levels
  // of black hair, and excluding hair excluded the shorts with it, leaving the
  // shaded thigh as the most common colour in the hip band.
  const hip = bandDominant(master, interior, ...band(0.5, 0.62), [skin, fabric]);
  const shorts = hip?.colour ?? { r: 20, g: 20, b: 24 };
  if (!hip) fallbacks.push('dark');

  const sole = bandDominant(master, interior, ...band(0.975, 1.0), [skin, hair, fabric, shorts]);
  const shoe = sole?.colour ?? { r: 220, g: 218, b: 224 };
  if (!sole) fallbacks.push('white');

  return { skin, fabric, shorts, shoe, hair, fallbacks, hairBelowY: topY + stature * 0.22 };
}

/**
 * Nearest measured role, in a shading-tolerant space.
 *
 * Plain RGB distance fails on a lit subject: shadowed skin `(150,90,70)` is
 * nearer to crimson fabric `(169,23,54)` than to the lit skin it belongs to
 * `(230,171,133)`, so the athletic plate's shoulder line jumped from row 219 to
 * row 165. Comparing chromaticity removes shading — but it also makes black
 * shorts and white shoes identical `(0.33,0.33,0.33)`, so luminance is kept at
 * half weight. The two dark roles are then separated by height (see below),
 * which is the one cue colour cannot supply.
 */
export function classifyByPalette(r: number, g: number, b: number, palette: Palette, y?: number): RegionId {
  if (y !== undefined) {
    const toHair = Math.hypot(r - palette.hair.r, g - palette.hair.g, b - palette.hair.b);
    const toShorts = Math.hypot(r - palette.shorts.r, g - palette.shorts.g, b - palette.shorts.b);
    if (Math.min(toHair, toShorts) < 45) return y < palette.hairBelowY ? 'hair' : 'dark';
  }
  const roles: ReadonlyArray<readonly [RegionId, Rgb]> = [
    ['skin', palette.skin],
    ['fabric', palette.fabric],
    ['dark', palette.shorts],
    ['white', palette.shoe],
    ['hair', palette.hair],
  ];
  const sum = Math.max(1, r + g + b);
  let best: RegionId = 'other';
  let bestScore = 0.45;
  for (const [role, colour] of roles) {
    const cs = Math.max(1, colour.r + colour.g + colour.b);
    const chroma = Math.hypot(r / sum - colour.r / cs, g / sum - colour.g / cs, b / sum - colour.b / cs);
    const luma = Math.abs((0.2126 * r + 0.7152 * g + 0.0722 * b) - (0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b)) / 255;
    const score = 2 * chroma + 0.5 * luma;
    if (score < bestScore) {
      best = role;
      bestScore = score;
    }
  }
  return best;
}

/**
 * A short, human-readable description of what was measured — printed into
 * `profile.json` so that a reviewer can see the five colours the pipeline
 * believes it is looking at without opening the plate.
 */
export function describePalette(palette: Palette): string {
  const hex = (c: Rgb): string =>
    `#${[c.r, c.g, c.b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
  return `skin ${hex(palette.skin)} fabric ${hex(palette.fabric)} shorts ${hex(palette.shorts)} shoe ${hex(palette.shoe)} hair ${hex(palette.hair)}`;
}

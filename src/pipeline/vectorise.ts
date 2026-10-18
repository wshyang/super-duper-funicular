import type { Vec2 } from '../shared/types.ts';
import type { Rgb, QuantisedImage } from './quantise.ts';
import { quantiseImage } from './quantise.ts';
import { contoursOfMask } from './trace.ts';
import type { DecodedImage } from './image-codec.ts';

export interface VectorBand {
  readonly color: Rgb;
  readonly hex: string;
  readonly paths: readonly (readonly Vec2[])[];
  readonly pixels: number;
}

export interface VectorImage {
  readonly width: number;
  readonly height: number;
  readonly bands: readonly VectorBand[];
  readonly svg: string;
  readonly pointCount: number;
}

const toHex = (value: number): string =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');

const colorHex = (color: Rgb): string => `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;

const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

const pathData = (paths: readonly (readonly Vec2[])[]): string =>
  paths
    .map((points) => {
      const [first, ...rest] = points;
      if (!first) return '';
      const start = `M${formatNumber(first.x)} ${formatNumber(first.y)}`;
      const body = rest
        .map((point) => `L${formatNumber(point.x)} ${formatNumber(point.y)}`)
        .join('');
      return `${start}${body}Z`;
    })
    .join('');

const maskFor = (quantised: QuantisedImage, index: number): Uint8Array => {
  const mask = new Uint8Array(quantised.width * quantised.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    mask[pixel] = quantised.labels[pixel] === index ? 1 : 0;
  }
  return mask;
};

const bandsOf = (quantised: QuantisedImage, tolerance: number, minArea: number): VectorBand[] => {
  const bands: VectorBand[] = [];
  quantised.palette.forEach((color, index) => {
    const pixels = quantised.counts[index] ?? 0;
    if (pixels === 0) return;
    const paths = contoursOfMask(maskFor(quantised, index), quantised.width, quantised.height, {
      tolerance,
      minArea,
    });
    if (paths.length === 0) return;
    bands.push({ color, hex: colorHex(color), paths, pixels });
  });
  return bands.sort((a, b) => b.pixels - a.pixels);
};

const svgOf = (width: number, height: number, bands: readonly VectorBand[]): string => {
  const body = bands
    .map((band) => `  <path fill="${band.hex}" fill-rule="evenodd" d="${pathData(band.paths)}"/>`)
    .join('\n');
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="geometricPrecision">`,
    `  <title>Colour-band vector trace (${bands.length} bands)</title>`,
    body,
    `</svg>`,
    ``,
  ].join('\n');
};

export interface VectorOptions {
  readonly maxColors?: number;
  readonly tolerance?: number;
  readonly minArea?: number;
}

/** Quantise to a deterministic palette, trace every band, and emit pure SVG paths. */
export const vectoriseImage = (image: DecodedImage, options: VectorOptions = {}): VectorImage => {
  const quantised = quantiseImage(image, options.maxColors ?? 14);
  const bands = bandsOf(quantised, options.tolerance ?? 0.6, options.minArea ?? 4);
  const pointCount = bands.reduce(
    (sum, band) => sum + band.paths.reduce((inner, path) => inner + path.length, 0),
    0,
  );
  return {
    width: image.width,
    height: image.height,
    bands,
    pointCount,
    svg: svgOf(image.width, image.height, bands),
  };
};

import type { Vec2 } from '../shared/types.ts';
import type { Rgb, QuantisedImage } from './quantise.ts';
import type { VectorImage } from './vectorise.ts';

export interface RasterisedVector {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface VectorFidelity {
  readonly maskIou: number;
  readonly colourAgreement: number;
  readonly sourcePixels: number;
  readonly tracedPixels: number;
}

interface Edge {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

const edgesOf = (paths: readonly (readonly Vec2[])[]): Edge[] => {
  const edges: Edge[] = [];
  for (const path of paths) {
    for (let index = 0; index < path.length; index += 1) {
      const a = path[index] as Vec2;
      const b = path[(index + 1) % path.length] as Vec2;
      if (a.y !== b.y) edges.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
    }
  }
  return edges;
};

const crossingsAt = (edges: readonly Edge[], scanY: number): number[] => {
  const xs: number[] = [];
  for (const edge of edges) {
    const minY = Math.min(edge.y0, edge.y1);
    const maxY = Math.max(edge.y0, edge.y1);
    if (scanY < minY || scanY >= maxY) continue;
    const t = (scanY - edge.y0) / (edge.y1 - edge.y0);
    xs.push(edge.x0 + t * (edge.x1 - edge.x0));
  }
  return xs.sort((a, b) => a - b);
};

/** Even-odd scanline fill of one colour band, written into an RGBA buffer. */
const fillBand = (
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  paths: readonly (readonly Vec2[])[],
  color: Rgb,
): void => {
  const edges = edgesOf(paths);
  for (let y = 0; y < height; y += 1) {
    const xs = crossingsAt(edges, y + 0.5);
    for (let index = 0; index + 1 < xs.length; index += 2) {
      const from = Math.max(0, Math.ceil(xs[index] as number));
      const to = Math.min(width - 1, Math.floor(xs[index + 1] as number));
      for (let x = from; x <= to; x += 1) {
        const offset = (y * width + x) * 4;
        buffer[offset] = color.r;
        buffer[offset + 1] = color.g;
        buffer[offset + 2] = color.b;
        buffer[offset + 3] = 255;
      }
    }
  }
};

export const rasteriseVector = (vector: VectorImage): RasterisedVector => {
  const data = new Uint8ClampedArray(vector.width * vector.height * 4);
  for (const band of vector.bands) {
    fillBand(data, vector.width, vector.height, band.paths, band.color);
  }
  return { width: vector.width, height: vector.height, data };
};

const withinTolerance = (left: Rgb, right: Rgb, tolerance: number): boolean =>
  Math.abs(left.r - right.r) <= tolerance &&
  Math.abs(left.g - right.g) <= tolerance &&
  Math.abs(left.b - right.b) <= tolerance;

/**
 * Compare a rasterised vector against the quantised source. `maskIou` measures
 * silhouette agreement; `colourAgreement` measures how many traced pixels land
 * on the same palette entry as the source.
 */
export const measureFidelity = (
  quantised: QuantisedImage,
  raster: RasterisedVector,
  tolerance = 40,
): VectorFidelity => {
  let intersection = 0;
  let union = 0;
  let agreed = 0;
  let sourcePixels = 0;
  let tracedPixels = 0;
  for (let pixel = 0; pixel < quantised.width * quantised.height; pixel += 1) {
    const label = quantised.labels[pixel] ?? -1;
    const offset = pixel * 4;
    const hasVector = (raster.data[offset + 3] ?? 0) > 0;
    const hasSource = label >= 0;
    if (hasSource) sourcePixels += 1;
    if (hasVector) tracedPixels += 1;
    if (hasSource && hasVector) intersection += 1;
    if (hasSource || hasVector) union += 1;
    if (!hasSource || !hasVector) continue;
    const source = quantised.palette[label] as Rgb;
    const traced: Rgb = {
      r: raster.data[offset] ?? 0,
      g: raster.data[offset + 1] ?? 0,
      b: raster.data[offset + 2] ?? 0,
    };
    if (withinTolerance(source, traced, tolerance)) agreed += 1;
  }
  return {
    maskIou: union === 0 ? 1 : intersection / union,
    colourAgreement: intersection === 0 ? 0 : agreed / intersection,
    sourcePixels,
    tracedPixels,
  };
};

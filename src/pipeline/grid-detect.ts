import type { GridSpec, PixelImage } from '../shared/types';

interface Band {
  readonly start: number;
  readonly end: number;
}

const isMagentaBackground = (image: PixelImage, x: number, y: number): boolean => {
  const offset = (y * image.width + x) * 4;
  const red = image.data[offset] ?? 0;
  const green = image.data[offset + 1] ?? 0;
  const blue = image.data[offset + 2] ?? 0;
  return red > 145 && blue > 135 && green < 150 && red - green > 55 && blue - green > 45;
};

const runs = (values: readonly number[], threshold: number, minLength: number): Band[] => {
  const found: Band[] = [];
  let start = -1;
  for (let index = 0; index <= values.length; index += 1) {
    const active = index < values.length && (values[index] ?? 0) >= threshold;
    if (active && start < 0) start = index;
    if (!active && start >= 0) {
      if (index - start >= minLength) found.push({ start, end: index });
      start = -1;
    }
  }
  return found;
};

const mergeNearby = (bands: readonly Band[], gap: number): Band[] => {
  const merged: Band[] = [];
  for (const band of bands) {
    const previous = merged.at(-1);
    if (previous && band.start - previous.end <= gap) {
      merged[merged.length - 1] = { start: previous.start, end: band.end };
    } else {
      merged.push(band);
    }
  }
  return merged;
};

const rowProjection = (image: PixelImage): number[] => {
  const projection: number[] = [];
  for (let y = 0; y < image.height; y += 1) {
    let hits = 0;
    let samples = 0;
    for (let x = 0; x < image.width; x += 4) {
      samples += 1;
      if (isMagentaBackground(image, x, y)) hits += 1;
    }
    projection.push(1 - hits / Math.max(1, samples));
  }
  return projection;
};

const columnProjection = (image: PixelImage, row: Band): number[] => {
  const projection: number[] = [];
  for (let x = 0; x < image.width; x += 1) {
    let hits = 0;
    let samples = 0;
    for (let y = row.start; y < row.end; y += 3) {
      samples += 1;
      if (isMagentaBackground(image, x, y)) hits += 1;
    }
    projection.push(1 - hits / Math.max(1, samples));
  }
  return projection;
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  if (sorted.length % 2 === 0) return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return sorted[middle] ?? 0;
};

const detectRows = (image: PixelImage): Band[] => {
  const profile = rowProjection(image);
  const candidates = mergeNearby(runs(profile, 0.15, 6), 2);
  const tallest = Math.max(0, ...candidates.map((band) => band.end - band.start));
  return candidates
    .filter((band) => band.start > 2 && band.end - band.start >= Math.max(24, tallest * 0.6))
    .sort((left, right) => left.start - right.start);
};

export const detectGrid = (image: PixelImage): GridSpec => {
  const rowBands = detectRows(image);
  if (rowBands.length !== 6) {
    throw new Error(`Expected six sprite rows; detected ${rowBands.length}.`);
  }
  const rowStarts = rowBands.map((band) => band.start);
  const rowPitches = rowStarts.slice(1).map((start, index) => start - (rowStarts[index] ?? start));
  const pitch = Math.round(median(rowPitches));
  const columnBands = mergeNearby(runs(columnProjection(image, rowBands[0]!), 0.15, 8), 3).filter(
    (band) => band.end - band.start >= image.width / 32,
  );
  if (columnBands.length !== 8) {
    throw new Error(`Expected eight sprite columns; detected ${columnBands.length}.`);
  }
  const bandHeight = Math.round(median(rowBands.map((band) => band.end - band.start)));
  const headerPx = Math.max(0, Math.round((rowStarts[0] ?? 0) - (pitch - bandHeight) / 2));
  const cellHeight = Math.min(pitch, Math.floor((image.height - headerPx) / rowBands.length));
  return {
    rows: rowBands.length,
    columns: columnBands.length,
    headerPx,
    cellWidth: Math.round(image.width / columnBands.length),
    cellHeight,
  };
};

export const cellRect = (
  grid: GridSpec,
  row: number,
  column: number,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} => ({
  x: column * grid.cellWidth,
  y: grid.headerPx + row * grid.cellHeight,
  width: grid.cellWidth,
  height: grid.cellHeight,
});

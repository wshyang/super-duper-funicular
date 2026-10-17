import type { DecodedImage } from './image-codec.ts';

export interface GridSpec {
  readonly rows: number;
  readonly columns: number;
  readonly headerPx: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly contentBands: readonly (readonly [number, number])[];
}

const magentaScore = (image: DecodedImage, x: number, y: number): boolean => {
  const index = (y * image.width + x) * 4;
  const r = image.data[index] ?? 0;
  const g = image.data[index + 1] ?? 0;
  const b = image.data[index + 2] ?? 0;
  return r > 150 && b > 150 && g < 130 && r - g > 70 && b - g > 70;
};

const runsAbove = (profile: readonly number[], threshold: number): [number, number][] => {
  const raw: [number, number][] = [];
  let start: number | null = null;
  profile.forEach((value, index) => {
    const isContent = value < threshold;
    if (isContent && start === null) start = index;
    if (!isContent && start !== null) {
      raw.push([start, index]);
      start = null;
    }
  });
  if (start !== null) raw.push([start, profile.length]);
  const merged: [number, number][] = [];
  for (const [from, to] of raw) {
    const last = merged[merged.length - 1];
    if (last && from - last[1] <= 2) last[1] = to;
    else merged.push([from, to]);
  }
  return merged.filter(([from, to]) => to - from >= 6);
};

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number);
};

const rowBands = (
  image: DecodedImage,
): { contentBands: [number, number][]; rows: [number, number][] } => {
  const profile: number[] = [];
  for (let y = 0; y < image.height; y += 1) {
    let magenta = 0;
    let samples = 0;
    for (let x = 0; x < image.width; x += 2) {
      samples += 1;
      if (magentaScore(image, x, y)) magenta += 1;
    }
    profile.push(magenta / Math.max(1, samples));
  }
  const bands = runsAbove(profile, 0.85);
  const tallest = Math.max(0, ...bands.map(([start, end]) => end - start));
  const rows = bands.filter(
    ([start, end]) => end - start >= Math.max(24, tallest * 0.6) && start > 2,
  );
  return { contentBands: bands, rows };
};

const columnClusters = (
  image: DecodedImage,
  band: readonly [number, number],
): [number, number][] => {
  const profile: number[] = [];
  for (let x = 0; x < image.width; x += 1) {
    let magenta = 0;
    let samples = 0;
    for (let y = band[0]; y < band[1]; y += 2) {
      samples += 1;
      if (magentaScore(image, x, y)) magenta += 1;
    }
    profile.push(magenta / Math.max(1, samples));
  }
  return runsAbove(profile, 0.85).filter(([start, end]) => end - start > 8);
};

/**
 * Detect the reference sheet's magenta-separated character grid from pixels alone.
 * The header band (title text) is excluded; rows are the tall content bands.
 */
export const detectGrid = (image: DecodedImage): GridSpec => {
  const { contentBands, rows } = rowBands(image);
  if (rows.length < 2) {
    throw new Error('Unable to detect sprite-sheet rows from the magenta separators.');
  }
  const starts = rows.map(([start]) => start);
  const heights = rows.map(([start, end]) => end - start);
  const rowPitch = Math.round(
    median(starts.slice(1).map((start, index) => start - (starts[index] as number))),
  );
  const bandHeight = median(heights);
  const headerPx = Math.max(0, Math.round((starts[0] as number) - (rowPitch - bandHeight) / 2));
  const clusters = columnClusters(image, rows[0] as [number, number]);
  const wideClusters = clusters.filter(
    ([start, end]) => end - start >= Math.max(20, image.width * 0.02),
  );
  if (wideClusters.length < 2) {
    throw new Error('Unable to detect sprite-sheet columns from the magenta separators.');
  }
  const columns =
    wideClusters.length >= 4 && wideClusters.length <= 12
      ? wideClusters.length
      : Math.max(2, Math.round(image.width / median(clusters.map(([start, end]) => end - start))));
  return {
    rows: rows.length,
    columns,
    headerPx,
    cellWidth: Math.round(image.width / columns),
    cellHeight: rowPitch,
    contentBands,
  };
};

export const cellRect = (
  grid: GridSpec,
  row: number,
  column: number,
): { x: number; y: number; width: number; height: number } => ({
  x: column * grid.cellWidth,
  y: grid.headerPx + row * grid.cellHeight,
  width: grid.cellWidth,
  height: grid.cellHeight,
});

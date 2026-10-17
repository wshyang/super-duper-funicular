import type { RgbaImage } from "./decode.ts";
import { clusterPositions, labelComponents, type Component, type LabelResult } from "./components.ts";
import { magentaScore } from "./keying.ts";

export interface SheetLayout {
  readonly rows: number;
  readonly columns: number;
  /** Cell rectangles in source pixels, row-major. */
  readonly cells: readonly SheetCell[];
  readonly components: readonly Component[];
  readonly labels: LabelResult;
}

export interface SheetCell {
  readonly row: number;
  readonly column: number;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly componentIds: readonly number[];
}

export interface FigureFilter {
  /** Minimum blob area as a fraction of the sheet area. */
  readonly minimumAreaFraction: number;
  /** Minimum blob height as a fraction of the sheet height. */
  readonly minimumHeightFraction: number;
  /** Blob height / width. A standing figure is taller than it is wide. */
  readonly minimumAspect: number;
}

export const DEFAULT_FIGURE_FILTER: FigureFilter = {
  minimumAreaFraction: 0.0025,
  minimumHeightFraction: 0.06,
  minimumAspect: 0.8,
};

export function buildForegroundMask(image: RgbaImage, threshold = 0.5): (x: number, y: number) => boolean {
  const lookup = new Uint8Array(image.width * image.height);
  for (let index = 0; index < lookup.length; index += 1) {
    const offset = index * 4;
    const score = magentaScore(image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0);
    lookup[index] = score >= threshold ? 0 : 1;
  }
  return (x, y) => lookup[y * image.width + x] === 1;
}

/**
 * Recovers the sheet grid from artwork alone: figure-like blobs are labelled,
 * then their centres are clustered into rows and columns. It does not read the
 * printed title or frame numbers, so a sheet without labels works the same way.
 */
export function detectSheet(image: RgbaImage, filter: FigureFilter = DEFAULT_FIGURE_FILTER): SheetLayout {
  const minimumArea = image.width * image.height * filter.minimumAreaFraction;
  const labelled = labelComponents(buildForegroundMask(image), image.width, image.height, minimumArea);
  const figures = labelled.components.filter((component) => {
    const height = component.maxY - component.minY + 1;
    const width = component.maxX - component.minX + 1;
    return height >= image.height * filter.minimumHeightFraction && height / width >= filter.minimumAspect;
  });
  if (figures.length === 0) throw new Error("No figure-like blobs found on the sheet");
  const heights = figures.map((component) => component.maxY - component.minY + 1);
  const widths = figures.map((component) => component.maxX - component.minX + 1);
  const rowClusters = clusterPositions(
    figures.map((component) => component.centroidY),
    median(heights) * 0.5,
  );
  const columnClusters = clusterPositions(
    figures.map((component) => component.centroidX),
    median(widths) * 0.5,
  );
  const cells = buildCells(figures, rowClusters, columnClusters);
  return {
    rows: rowClusters.length,
    columns: columnClusters.length,
    cells,
    components: figures,
    labels: labelled,
  };
}

function nearestCluster(clusters: readonly number[][], value: number): number {
  let bestIndex = 0;
  let bestDistance = Infinity;
  clusters.forEach((cluster, index) => {
    const centre = cluster.reduce((sum, entry) => sum + entry, 0) / cluster.length;
    const distance = Math.abs(centre - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function buildCells(
  figures: readonly Component[],
  rowClusters: readonly number[][],
  columnClusters: readonly number[][],
): SheetCell[] {
  const buckets = new Map<string, Component[]>();
  for (const component of figures) {
    const row = nearestCluster(rowClusters, component.centroidY);
    const column = nearestCluster(columnClusters, component.centroidX);
    const key = `${row}:${column}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(component);
    buckets.set(key, bucket);
  }
  const cells: SheetCell[] = [];
  for (let row = 0; row < rowClusters.length; row += 1) {
    for (let column = 0; column < columnClusters.length; column += 1) {
      const members = buckets.get(`${row}:${column}`);
      if (members === undefined || members.length === 0) continue;
      cells.push({
        row,
        column,
        minX: Math.min(...members.map((member) => member.minX)),
        maxX: Math.max(...members.map((member) => member.maxX)),
        minY: Math.min(...members.map((member) => member.minY)),
        maxY: Math.max(...members.map((member) => member.maxY)),
        componentIds: members.map((member) => member.id),
      });
    }
  }
  return cells;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

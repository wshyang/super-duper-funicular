import { BYTES_PER_PIXEL, type Raster, type Span } from "./raster.ts";

export interface SheetGrid {
  readonly columns: readonly Span[];
  readonly rows: readonly Span[];
}

export interface GridExpectation {
  readonly columns: number;
  readonly rows: number;
}

/** A gutter pixel is pure magenta: red and blue high, green almost zero. */
const GUTTER_MIN_CHANNEL = 200;
const GUTTER_MAX_GREEN = 25;
/** A row or column is a gutter when at least this share of its pixels are gutter pixels. */
const GUTTER_MIN_SHARE = 0.5;
/** Shortest interval that can be a cell; the header label band is far smaller. */
const MIN_CELL_SPAN = 100;

export function isGutterPixel(red: number, green: number, blue: number): boolean {
  return red >= GUTTER_MIN_CHANNEL && blue >= GUTTER_MIN_CHANNEL && green <= GUTTER_MAX_GREEN;
}

/** Fraction of gutter pixels per column, one value per x. */
export function columnGutterShares(raster: Raster): number[] {
  const counts = new Array<number>(raster.width).fill(0);
  forEachPixel(raster, (x, y, offset) => {
    if (isGutterPixelAt(raster, offset)) counts[x]! += 1;
    return y;
  });
  return counts.map((count) => count / raster.height);
}

/** Fraction of gutter pixels per row, one value per y. */
export function rowGutterShares(raster: Raster): number[] {
  const counts = new Array<number>(raster.height).fill(0);
  forEachPixel(raster, (_x, y, offset) => {
    if (isGutterPixelAt(raster, offset)) counts[y]! += 1;
    return y;
  });
  return counts.map((count) => count / raster.width);
}

function isGutterPixelAt(raster: Raster, offset: number): boolean {
  return isGutterPixel(raster.data[offset]!, raster.data[offset + 1]!, raster.data[offset + 2]!);
}

function forEachPixel(raster: Raster, visit: (x: number, y: number, offset: number) => number): void {
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      visit(x, y, (y * raster.width + x) * BYTES_PER_PIXEL);
    }
  }
}

/** Contiguous runs of indices whose share meets the gutter threshold. */
export function gutterSpans(shares: readonly number[]): Span[] {
  const spans: Span[] = [];
  let start = -1;
  shares.forEach((share, index) => {
    const isGutter = share >= GUTTER_MIN_SHARE;
    if (isGutter && start < 0) start = index;
    if (!isGutter && start >= 0) {
      spans.push({ start, end: index - 1 });
      start = -1;
    }
  });
  if (start >= 0) spans.push({ start, end: shares.length - 1 });
  return spans;
}

/** The cell intervals lying between consecutive gutters, long enough to hold a sprite. */
export function cellSpansBetween(gutters: readonly Span[], length: number): Span[] {
  const cells: Span[] = [];
  let cursor = 0;
  for (const gutter of gutters) {
    cells.push({ start: cursor, end: gutter.start - 1 });
    cursor = gutter.end + 1;
  }
  cells.push({ start: cursor, end: length - 1 });
  return cells.filter((span) => span.end - span.start + 1 >= MIN_CELL_SPAN);
}

/** Detects the sheet grid from magenta gutters and checks it against the expected layout. */
export function detectSheetGrid(raster: Raster, expected: GridExpectation): SheetGrid {
  const columns = cellSpansBetween(gutterSpans(columnGutterShares(raster)), raster.width);
  const rows = cellSpansBetween(gutterSpans(rowGutterShares(raster)), raster.height);
  assertCount("columns", columns.length, expected.columns);
  assertCount("rows", rows.length, expected.rows);
  return { columns, rows };
}

function assertCount(axis: string, found: number, expected: number): void {
  if (found !== expected) {
    throw new Error(`Grid mismatch: expected ${expected} ${axis} but found ${found}`);
  }
}

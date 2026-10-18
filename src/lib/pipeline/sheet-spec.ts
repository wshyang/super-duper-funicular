import type { Raster, SheetGeometry } from '../../shared/types.ts';
import { getPixel } from './image-io.ts';

export const EXPECTED_ROWS = 6;
export const EXPECTED_COLUMNS = 8;
const DIVIDER_RATIO = 0.8;
const MIN_CELL_PX = 60;

export function isMagentaLike(r: number, g: number, b: number): boolean {
  return r > 200 && b > 200 && g < 130;
}

/** Grid dividers are the pure tone (#FD00FC, g≈0); cell fields are #FD49FD. */
export function isDividerTone(r: number, g: number, b: number): boolean {
  return r > 200 && b > 200 && g < 40;
}

/**
 * Detect the sheet grid from magenta line runs (FDS #feat-extraction step 2):
 * nothing about the geometry is hardcoded; wrong shapes throw.
 */
export function detectSheetGeometry(raster: Raster, sourceSha256: string): SheetGeometry {
  const rowRatios = lineRatios(raster, 'rows');
  const columnRatios = lineRatios(raster, 'columns');
  const rowBands = bands(rowRatios, DIVIDER_RATIO);
  const columnBands = bands(columnRatios, DIVIDER_RATIO);
  const rowTops = interiors(rowBands, rowRatios.length);
  const columnLefts = interiors(columnBands, columnRatios.length);
  if (rowTops.length !== EXPECTED_ROWS || columnLefts.length !== EXPECTED_COLUMNS) {
    throw new Error(
      `sheet grid mismatch: detected ${rowTops.length} rows × ${columnLefts.length} columns, expected ${EXPECTED_ROWS}×${EXPECTED_COLUMNS}`,
    );
  }
  return {
    sourceSha256,
    sourceSize: { width: raster.width, height: raster.height },
    headerHeight: rowTops[0] ?? 0,
    rowTops,
    columnLefts,
    rows: EXPECTED_ROWS,
    columns: EXPECTED_COLUMNS,
  };
}

function lineRatios(raster: Raster, axis: 'rows' | 'columns'): number[] {
  const outer = axis === 'rows' ? raster.height : raster.width;
  const inner = axis === 'rows' ? raster.width : raster.height;
  const ratios: number[] = [];
  for (let o = 0; o < outer; o += 1) {
    let hits = 0;
    for (let i = 0; i < inner; i += 2) {
      const [r, g, b] = axis === 'rows' ? getPixel(raster, i, o) : getPixel(raster, o, i);
      if (isDividerTone(r, g, b)) hits += 1;
    }
    ratios.push(hits / Math.ceil(inner / 2));
  }
  return ratios;
}

interface Band {
  readonly start: number;
  readonly end: number;
}

function bands(ratios: readonly number[], threshold: number): Band[] {
  const out: Band[] = [];
  let start: number | null = null;
  ratios.forEach((ratio, index) => {
    if (ratio >= threshold && start === null) start = index;
    if ((ratio < threshold || index === ratios.length - 1) && start !== null) {
      out.push({ start, end: ratio < threshold ? index - 1 : index });
      start = null;
    }
  });
  return out;
}

/** Cell interiors between divider bands; the band before the first cell is the header. */
function interiors(dividers: readonly Band[], size: number): number[] {
  const starts: number[] = [];
  for (let i = 0; i + 1 < dividers.length; i += 1) {
    const top = (dividers[i]?.end ?? 0) + 1;
    const next = dividers[i + 1]?.start ?? size;
    if (next - top > MIN_CELL_PX) starts.push(top);
  }
  const last = dividers.at(-1);
  if (last && size - (last.end + 1) > MIN_CELL_PX) starts.push(last.end + 1);
  return starts;
}

export function cellRect(geometry: SheetGeometry, row: number, column: number, raster: Raster): { x: number; y: number; w: number; h: number } {
  const x = geometry.columnLefts[column] ?? 0;
  const y = geometry.rowTops[row] ?? 0;
  const w = (geometry.columnLefts[column + 1] ?? raster.width) - x;
  const h = (geometry.rowTops[row + 1] ?? raster.height) - y;
  return { x, y, w, h };
}

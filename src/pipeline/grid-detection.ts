import type { BoundingBox, RasterImage } from '../shared/types.js';
import { isPureMagentaDivider } from './magenta-key.js';
import { readPixel } from './raster.js';

export interface SpanInterval {
  readonly start: number;
  readonly end: number;
}

export interface SheetGridLayout {
  readonly headerHeight: number;
  readonly rowSpans: readonly SpanInterval[];
  readonly colSpans: readonly SpanInterval[];
  readonly cells: readonly (readonly BoundingBox[])[];
}

export function detectSpriteSheetGrid(sheet: RasterImage): SheetGridLayout {
  const rowDividerMask = scanHorizontalDividers(sheet);
  const rowDividerBands = groupTrueRuns(rowDividerMask, 2);
  const rowSpans = extractContentSpans(rowDividerBands, sheet.height, 80);
  const headerHeight = rowSpans[0]?.start ?? 0;
  const colDividerMask = scanVerticalDividers(sheet, headerHeight);
  const colDividerBands = groupTrueRuns(colDividerMask, 2);
  const colSpans = extractContentSpans(colDividerBands, sheet.width, 80);
  const cells = buildCellMatrix(rowSpans, colSpans);
  return { headerHeight, rowSpans, colSpans, cells };
}

function scanHorizontalDividers(sheet: RasterImage): boolean[] {
  const mask: boolean[] = [];
  const threshold = Math.floor(sheet.width * 0.78);
  for (let y = 0; y < sheet.height; y++) {
    let pureCount = 0;
    for (let x = 0; x < sheet.width; x++) {
      if (isPureMagentaDivider(readPixel(sheet, x, y))) {
        pureCount++;
      }
    }
    mask.push(pureCount >= threshold);
  }
  return mask;
}

function scanVerticalDividers(sheet: RasterImage, startY: number): boolean[] {
  const mask: boolean[] = [];
  const activeHeight = Math.max(1, sheet.height - startY);
  const threshold = Math.floor(activeHeight * 0.78);
  for (let x = 0; x < sheet.width; x++) {
    let pureCount = 0;
    for (let y = startY; y < sheet.height; y++) {
      if (isPureMagentaDivider(readPixel(sheet, x, y))) {
        pureCount++;
      }
    }
    mask.push(pureCount >= threshold);
  }
  return mask;
}

export function groupTrueRuns(flags: readonly boolean[], maxGap: number): SpanInterval[] {
  const groups: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < flags.length; i++) {
    if (!flags[i]) {
      continue;
    }
    const last = groups[groups.length - 1];
    if (!last || i > last.end + maxGap) {
      groups.push({ start: i, end: i });
    } else {
      last.end = i;
    }
  }
  return groups;
}

export function extractContentSpans(
  dividers: readonly SpanInterval[],
  totalSize: number,
  minSpanSize: number,
): SpanInterval[] {
  const spans: SpanInterval[] = [];
  let cursor = 0;
  for (const div of dividers) {
    if (div.start - cursor >= minSpanSize) {
      spans.push({ start: cursor, end: div.start - 1 });
    }
    cursor = div.end + 1;
  }
  if (totalSize - cursor >= minSpanSize) {
    spans.push({ start: cursor, end: totalSize - 1 });
  }
  return spans;
}

function buildCellMatrix(
  rowSpans: readonly SpanInterval[],
  colSpans: readonly SpanInterval[],
): BoundingBox[][] {
  return rowSpans.map((row) =>
    colSpans.map((col) => ({
      x: col.start,
      y: row.start,
      width: col.end - col.start + 1,
      height: row.end - row.start + 1,
    })),
  );
}

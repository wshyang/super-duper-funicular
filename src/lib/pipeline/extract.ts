import type { ExtractedFrame, PaletteId, Raster, SheetGeometry, SpriteManifest } from '../../shared/types.ts';
import { createRaster } from '../render/raster.ts';
import { dHash64, sha256Hex } from './hashing.ts';
import { encodePng, getPixel } from './image-io.ts';
import { keyCell } from './keying.ts';
import { largestComponent, type ComponentStats } from './components.ts';
import { cellRect, detectSheetGeometry } from './sheet-spec.ts';

export const PALETTES: readonly PaletteId[] = ['crimson', 'cobalt', 'leaf', 'sunshine', 'violet', 'tangerine'];
export const CANVAS_MARGIN = 12;
export const GROUND_MARGIN = 6;
export const GENERATED_BY = 'stride-harmonised-lab sprites:extract v1';

export interface RawCellStats {
  readonly palette: PaletteId;
  readonly frame: number;
  readonly rawBounds: { readonly w: number; readonly h: number };
  readonly rawCentroidX: number;
  readonly rawGroundY: number;
  readonly naiveResidue: number;
  readonly keyedResidue: number;
}

export interface ExtractionResult {
  readonly manifest: SpriteManifest;
  readonly frames: ReadonlyMap<string, Raster>;
  readonly rawStats: readonly RawCellStats[];
}

/** Full extraction over a decoded sheet (FDS #feat-extraction). Node-only. */
export function extractSheet(sheet: Raster, sourceSha256: string): ExtractionResult {
  const geometry = detectSheetGeometry(sheet, sourceSha256);
  const cells = cutCells(sheet, geometry);
  const canvas = canvasSize(cells);
  const frames = new Map<string, Raster>();
  const manifestFrames: ExtractedFrame[] = [];
  const rawStats: RawCellStats[] = [];
  for (const cell of cells) {
    const placed = place(cell, canvas);
    const bytes = encodePng(placed.raster);
    frames.set(cell.id, placed.raster);
    manifestFrames.push(frameEntry(cell, placed, bytes, canvas));
    rawStats.push(cell.rawStats);
  }
  return {
    manifest: { version: 1, generatedBy: GENERATED_BY, sheet: geometry, canvas, frames: manifestFrames },
    frames,
    rawStats,
  };
}

interface CutCell {
  readonly id: string;
  readonly palette: PaletteId;
  readonly frame: number;
  readonly raster: Raster;
  readonly stats: ComponentStats;
  readonly rawStats: RawCellStats;
}

function cutCells(sheet: Raster, geometry: SheetGeometry): CutCell[] {
  const cells: CutCell[] = [];
  for (let row = 0; row < geometry.rows; row += 1) {
    for (let column = 0; column < geometry.columns; column += 1) {
      cells.push(cutCell(sheet, geometry, row, column));
    }
  }
  return cells;
}

function cutCell(sheet: Raster, geometry: SheetGeometry, row: number, column: number): CutCell {
  const rect = cellRect(geometry, row, column, sheet);
  const cell = crop(sheet, rect.x, rect.y, rect.w, rect.h);
  const keyed = keyCell(cell);
  const stats = largestComponent(keyed.raster);
  const palette = PALETTES[row] ?? 'crimson';
  const frame = column + 1;
  return {
    id: `${palette}-${String(frame).padStart(2, '0')}`,
    palette,
    frame,
    raster: keyed.raster,
    stats,
    rawStats: {
      palette,
      frame,
      rawBounds: { w: stats.bounds.w, h: stats.bounds.h },
      rawCentroidX: round2(stats.centroid.x),
      rawGroundY: stats.groundY,
      naiveResidue: keyed.naiveResidue,
      keyedResidue: keyed.keyedResidue,
    },
  };
}

function crop(sheet: Raster, x: number, y: number, w: number, h: number): Raster {
  const out = createRaster(w, h);
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      const [r, g, b, a] = getPixel(sheet, x + px, y + py);
      const i = (py * w + px) * 4;
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = a;
    }
  }
  return out;
}

function canvasSize(cells: readonly CutCell[]): { width: number; height: number } {
  const w = Math.max(...cells.map((c) => c.stats.bounds.w)) + CANVAS_MARGIN * 2;
  const h = Math.max(...cells.map((c) => c.stats.bounds.h)) + CANVAS_MARGIN * 2;
  return { width: w, height: h };
}

function place(cell: CutCell, canvas: { width: number; height: number }): { raster: Raster } {
  const out = createRaster(canvas.width, canvas.height);
  const offsetX = Math.round(canvas.width / 2 - cell.stats.centroid.x);
  const offsetY = Math.round(canvas.height - GROUND_MARGIN - cell.stats.groundY);
  copyOpaque(cell.raster, out, offsetX, offsetY);
  return { raster: out };
}

function copyOpaque(source: Raster, target: Raster, offsetX: number, offsetY: number): void {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const [r, g, b, a] = getPixel(source, x, y);
      if (a === 0) continue;
      const tx = x + offsetX;
      const ty = y + offsetY;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
      const i = (ty * target.width + tx) * 4;
      target.data[i] = r;
      target.data[i + 1] = g;
      target.data[i + 2] = b;
      target.data[i + 3] = a;
    }
  }
}

function frameEntry(cell: CutCell, placed: { raster: Raster }, bytes: Uint8Array, canvas: { width: number; height: number }): ExtractedFrame {
  return {
    id: cell.id,
    palette: cell.palette,
    frame: cell.frame,
    url: `/sprites/extracted/${cell.id}.png`,
    sha256: sha256Hex(bytes),
    dHash64: dHash64(placed.raster),
    bounds: { width: cell.stats.bounds.w, height: cell.stats.bounds.h },
    pivot: { x: Math.round(canvas.width / 2), y: Math.round(canvas.height - GROUND_MARGIN) },
    groundY: canvas.height - GROUND_MARGIN,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

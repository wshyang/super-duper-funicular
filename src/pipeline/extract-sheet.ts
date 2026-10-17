import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { detectSheetGrid, type SheetGrid } from "./grid-detection.ts";
import { hashRasterPixels, findDuplicateGroups } from "./hashing.ts";
import { encodePng, loadRaster } from "./image-io.ts";
import { cropRaster, type Rect, type Raster } from "./raster.ts";
import { cutSpriteFromCell, type SpriteCut } from "./sprite-cut.ts";
import { registerCuts, type Registration, type RegisteredFrame } from "./sprite-registration.ts";

export interface RowVariant {
  readonly id: string;
  readonly label: string;
}

export interface SheetSpec {
  readonly id: string;
  readonly sourcePath: string;
  readonly outputDirectory: string;
  readonly publicPathPrefix: string;
  readonly columns: number;
  readonly rows: number;
  readonly rowVariants: readonly RowVariant[];
}

export interface ManifestFrame {
  readonly id: string;
  readonly variant: string;
  readonly frame: number;
  readonly url: string;
  readonly sheetCell: { readonly row: number; readonly column: number };
  readonly sheetBounds: Rect;
  readonly pixelSha256: string;
}

export interface SpriteManifest {
  readonly schemaVersion: 1;
  readonly sheet: { readonly id: string; readonly source: string; readonly columns: number; readonly rows: number };
  readonly canvas: { readonly width: number; readonly height: number };
  readonly pivot: { readonly x: number; readonly y: number };
  readonly variants: readonly { readonly id: string; readonly label: string }[];
  readonly frames: readonly ManifestFrame[];
}

export function cellRectOf(grid: SheetGrid, key: { row: number; column: number }): Rect {
  const column = grid.columns[key.column]!;
  const row = grid.rows[key.row]!;
  return {
    x: column.start,
    y: row.start,
    width: column.end - column.start + 1,
    height: row.end - row.start + 1,
  };
}

/** Cuts every cell of the grid, row by row, into a flat list. */
export function cutAllCells(sheet: Raster, grid: SheetGrid): SpriteCut[] {
  const cuts: SpriteCut[] = [];
  grid.rows.forEach((_row, row) => {
    grid.columns.forEach((_column, column) => {
      const rect = cellRectOf(grid, { row, column });
      const cellPixels = cropRaster(sheet, rect);
      const cellBounds = { x: 0, y: 0, width: rect.width, height: rect.height };
      cuts.push({ ...cutSpriteFromCell(cellPixels, cellBounds, { row, column }), sheetBounds: rect });
    });
  });
  return cuts;
}

export function frameFileName(frameNumber: number): string {
  return `frame-${String(frameNumber).padStart(2, "0")}.png`;
}

function assertUniqueFrames(frames: readonly RegisteredFrame[]): void {
  const artefacts = frames.map((frame, index) => ({ path: `frame-${index}`, hash: hashRasterPixels(frame.pixels) }));
  const duplicates = findDuplicateGroups(artefacts);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate sprite frames detected: ${JSON.stringify(duplicates)}`);
  }
}

function frameEntry(spec: SheetSpec, frame: RegisteredFrame): ManifestFrame {
  const variant = spec.rowVariants[frame.key.row]!;
  const frameNumber = frame.key.column + 1;
  return {
    id: `${spec.id}-${variant.id}-${frameNumber}`,
    variant: variant.id,
    frame: frameNumber,
    url: `${spec.publicPathPrefix}/${variant.id}/${frameFileName(frameNumber)}`,
    sheetCell: { row: frame.key.row, column: frame.key.column },
    sheetBounds: frame.sheetBounds,
    pixelSha256: hashRasterPixels(frame.pixels),
  };
}

export function buildManifest(spec: SheetSpec, registration: Registration): SpriteManifest {
  return {
    schemaVersion: 1,
    sheet: { id: spec.id, source: spec.sourcePath.split("/").slice(-3).join("/"), columns: spec.columns, rows: spec.rows },
    canvas: { width: registration.canvasWidth, height: registration.canvasHeight },
    pivot: registration.pivot,
    variants: spec.rowVariants,
    frames: registration.frames.map((frame) => frameEntry(spec, frame)),
  };
}

async function writeFrames(spec: SheetSpec, frames: readonly RegisteredFrame[]): Promise<void> {
  for (const frame of frames) {
    const variant = spec.rowVariants[frame.key.row]!;
    const directory = join(spec.outputDirectory, variant.id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, frameFileName(frame.key.column + 1)), encodePng(frame.pixels));
  }
}

/**
 * Full extraction: load the sheet, detect the grid, cut and register every cell,
 * check uniqueness, then write the PNG frames and the manifest. Output directory is
 * cleared first so that re-running reproduces the same tree.
 */
export async function extractSheet(spec: SheetSpec): Promise<SpriteManifest> {
  const sheet = await loadRaster(spec.sourcePath);
  const grid = detectSheetGrid(sheet, { columns: spec.columns, rows: spec.rows });
  const registration = registerCuts(cutAllCells(sheet, grid));
  assertUniqueFrames(registration.frames);
  await rm(spec.outputDirectory, { recursive: true, force: true });
  await writeFrames(spec, registration.frames);
  const manifest = buildManifest(spec, registration);
  await writeFile(join(spec.outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

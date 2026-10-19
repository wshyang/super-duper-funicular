import fs from 'node:fs';
import path from 'node:path';
import type {
  BoundingBox,
  ExtractedFrameEntry,
  ExtractedSheetManifest,
  RasterImage,
  RunnerVariantId,
} from '../shared/types.js';
import {
  type ForegroundRegionStats,
  measureForegroundRegion,
  removeSmallOpaqueIslands,
} from './connected-components.js';
import { detectSpriteSheetGrid, type SheetGridLayout } from './grid-detection.js';
import { computeAlphaSilhouetteIoU, computeDHash64, sha256Raster } from './hashing.js';
import { readImageFile, writePngFile } from './image-io.js';
import { keyOutMagentaCell } from './magenta-key.js';
import { blitRaster, createRaster, cropRaster } from './raster.js';

export const VARIANT_ORDER: readonly RunnerVariantId[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
];

export const STANDARD_FRAME_WIDTH = 220;
export const STANDARD_FRAME_HEIGHT = 256;
const TARGET_ANCHOR_X = 110;
const TARGET_ANCHOR_Y = 132;
const TARGET_BASELINE_Y = 242;

export interface CutCellResult {
  readonly entry: ExtractedFrameEntry;
  readonly registeredRaster: RasterImage;
  readonly tightRaster: RasterImage;
  readonly stats: ForegroundRegionStats;
}

export interface SheetExtractionResult {
  readonly manifest: ExtractedSheetManifest;
  readonly cells: readonly CutCellResult[];
}

export interface ExtractSheetPaths {
  readonly sourceSheetPath: string;
  readonly outputPublicDir: string;
  readonly publicUrlPrefix: string;
}

export function extractSpritesFromSheet(paths: ExtractSheetPaths): SheetExtractionResult {
  const sheet = readImageFile(paths.sourceSheetPath);
  const grid = detectSpriteSheetGrid(sheet);
  const allCells: CutCellResult[] = [];
  for (let row = 0; row < grid.rowSpans.length; row++) {
    const rowCells = extractVariantRow(sheet, grid, { row, paths });
    allCells.push(...rowCells);
  }
  const manifest = buildExtractionManifest(sheet, grid, { paths, cells: allCells });
  const manifestPath = path.join(paths.outputPublicDir, 'manifest.json');
  fs.mkdirSync(paths.outputPublicDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { manifest, cells: allCells };
}

interface RowExtractContext {
  readonly row: number;
  readonly paths: ExtractSheetPaths;
}

function extractVariantRow(
  sheet: RasterImage,
  grid: SheetGridLayout,
  ctx: RowExtractContext,
): CutCellResult[] {
  const variant = VARIANT_ORDER[ctx.row] ?? 'red';
  const rowResults: CutCellResult[] = [];
  for (let col = 0; col < grid.colSpans.length; col++) {
    const cellBounds = grid.cells[ctx.row]?.[col];
    if (!cellBounds) {
      continue;
    }
    const result = processSingleCell(sheet, cellBounds, {
      row: ctx.row,
      col,
      variant,
      priorInRow: rowResults,
      paths: ctx.paths,
    });
    rowResults.push(result);
  }
  return rowResults;
}

interface SingleCellContext {
  readonly row: number;
  readonly col: number;
  readonly variant: RunnerVariantId;
  readonly priorInRow: readonly CutCellResult[];
  readonly paths: ExtractSheetPaths;
}

function processSingleCell(
  sheet: RasterImage,
  cellBounds: BoundingBox,
  ctx: SingleCellContext,
): CutCellResult {
  const rawCell = cropRaster(sheet, cellBounds);
  const keyed = keyOutMagentaCell(rawCell);
  const cleaned = removeSmallOpaqueIslands(keyed, 28);
  const stats = measureForegroundRegion(cleaned);
  const tightRaster = cropRaster(cleaned, stats.bounds);
  const registeredRaster = registerSpriteOnCanvas(tightRaster, stats);
  const dupInfo = findDuplicateInRow(registeredRaster, ctx.priorInRow);
  const frameIndex = ctx.col + 1;
  const fileName = `frame-${String(frameIndex).padStart(2, '0')}.png`;
  const relDir = `${ctx.variant}/${fileName}`;
  const filePath = path.join(ctx.paths.outputPublicDir, relDir);
  const publicUrl = `${ctx.paths.publicUrlPrefix}/${relDir}`;
  writePngFile(filePath, registeredRaster);
  writeUniqueAliasIfUnique(registeredRaster, dupInfo.isDuplicate, {
    variant: ctx.variant,
    frameIndex,
    outputPublicDir: ctx.paths.outputPublicDir,
  });
  const entry: ExtractedFrameEntry = {
    variant: ctx.variant,
    frameIndex,
    row: ctx.row,
    col: ctx.col,
    publicUrl,
    filePath: path.relative(process.cwd(), filePath),
    cellBounds,
    spriteBoundsInCell: stats.bounds,
    anchorPoint: { x: TARGET_ANCHOR_X, y: TARGET_BASELINE_Y },
    foregroundPixels: stats.pixelCount,
    pixelSha256: sha256Raster(registeredRaster),
    dHash64: computeDHash64(registeredRaster),
    isDuplicateInRow: dupInfo.isDuplicate,
    duplicateOfFrame: dupInfo.duplicateOfFrame,
    duplicateSimilarityIoU: Number(dupInfo.bestIoU.toFixed(4)),
  };
  return { entry, registeredRaster, tightRaster, stats };
}

export function registerSpriteOnCanvas(
  tightRaster: RasterImage,
  stats: ForegroundRegionStats,
): RasterImage {
  const canvas = createRaster(STANDARD_FRAME_WIDTH, STANDARD_FRAME_HEIGHT);
  const localCentroidX = stats.centroid.x - stats.bounds.x;
  const localCentroidY = stats.centroid.y - stats.bounds.y;
  const dstX = Math.round(TARGET_ANCHOR_X - localCentroidX);
  const dstY = Math.round(TARGET_ANCHOR_Y - localCentroidY);
  blitRaster(canvas, tightRaster, { x: dstX, y: dstY });
  return canvas;
}

interface DuplicateMatch {
  readonly isDuplicate: boolean;
  readonly duplicateOfFrame: number | null;
  readonly bestIoU: number;
}

function findDuplicateInRow(
  current: RasterImage,
  priorInRow: readonly CutCellResult[],
): DuplicateMatch {
  let bestIoU = 0;
  let bestFrame: number | null = null;
  for (const prev of priorInRow) {
    const iou = computeAlphaSilhouetteIoU(current, prev.registeredRaster);
    if (iou > bestIoU) {
      bestIoU = iou;
      bestFrame = prev.entry.frameIndex;
    }
  }
  const isDuplicate = bestIoU >= 0.78;
  return {
    isDuplicate,
    duplicateOfFrame: isDuplicate ? bestFrame : null,
    bestIoU,
  };
}

interface UniqueAliasOptions {
  readonly variant: RunnerVariantId;
  readonly frameIndex: number;
  readonly outputPublicDir: string;
}

function writeUniqueAliasIfUnique(
  raster: RasterImage,
  isDuplicate: boolean,
  options: UniqueAliasOptions,
): void {
  if (isDuplicate) {
    return;
  }
  const uniqueName = `unique-${String(options.frameIndex).padStart(2, '0')}.png`;
  const uniquePath = path.join(options.outputPublicDir, options.variant, uniqueName);
  writePngFile(uniquePath, raster);
}

interface ManifestBuildInput {
  readonly paths: ExtractSheetPaths;
  readonly cells: readonly CutCellResult[];
}

function buildExtractionManifest(
  sheet: RasterImage,
  grid: SheetGridLayout,
  input: ManifestBuildInput,
): ExtractedSheetManifest {
  const entries = input.cells.map((c) => c.entry);
  const totalUnique = entries.filter((e) => !e.isDuplicateInRow).length;
  const rows = grid.rowSpans.length;
  return {
    schemaVersion: '1.0.0',
    sourceImage: path.relative(process.cwd(), input.paths.sourceSheetPath),
    sheetWidth: sheet.width,
    sheetHeight: sheet.height,
    headerHeight: grid.headerHeight,
    rows,
    cols: grid.colSpans.length,
    outputWidth: STANDARD_FRAME_WIDTH,
    outputHeight: STANDARD_FRAME_HEIGHT,
    totalExtractedFrames: entries.length,
    uniquePosesPerRow: rows > 0 ? Math.round(totalUnique / rows) : 0,
    totalUniquePoses: totalUnique,
    variants: VARIANT_ORDER,
    frames: entries,
  };
}

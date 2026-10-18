import { PALETTES, SOURCE_PATH, SOURCE_SHA256 } from '../shared/constants';
import type { FrameRecord, GridSpec, PaletteId, PixelImage, SpriteManifest } from '../shared/types';
import { alphaBounds, cropImage, encodePng, pixelSha256, sha256 } from './image-codec';
import { cellRect, detectGrid } from './grid-detect';
import { keyMagentaBackground } from './chroma-key';

export interface ExtractedFrame {
  readonly record: FrameRecord;
  readonly image: PixelImage;
}

export interface ExtractionResult {
  readonly sourceSha256: string;
  readonly source: PixelImage;
  readonly grid: GridSpec;
  readonly frames: readonly ExtractedFrame[];
  readonly manifest: SpriteManifest;
}

const frameId = (palette: PaletteId, column: number): string =>
  `runner-${palette}-${String(column + 1).padStart(2, '0')}`;

export const extractSpriteSheet = (
  source: PixelImage,
  sourceBytes: Uint8Array,
): ExtractionResult => {
  const sourceSha256 = sha256(sourceBytes);
  if (sourceSha256 !== SOURCE_SHA256) {
    throw new Error(`Reference source SHA mismatch: ${sourceSha256}`);
  }
  const grid = detectGrid(source);
  const exactPixels = new Map<string, string>();
  const frames: ExtractedFrame[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    const palette = PALETTES[row]?.id;
    if (!palette) throw new Error(`No palette is configured for row ${row + 1}.`);
    for (let column = 0; column < grid.columns; column += 1) {
      frames.push(extractCell(source, grid, row, column, palette, exactPixels));
    }
  }
  const manifest: SpriteManifest = {
    generator: 'npm run pipeline',
    source: { path: SOURCE_PATH, sha256: sourceSha256, width: source.width, height: source.height },
    grid,
    frames: frames.map(({ record }) => record),
  };
  return { sourceSha256, source, grid, frames, manifest };
};

const extractCell = (
  source: PixelImage,
  grid: GridSpec,
  row: number,
  column: number,
  palette: PaletteId,
  exactPixels: Map<string, string>,
): ExtractedFrame => {
  const cropped = cropImage(source, cellRect(grid, row, column));
  const keyed = keyMagentaBackground(cropped);
  const id = frameId(palette, column);
  const pixelHash = pixelSha256(keyed.image);
  const duplicate = exactPixels.get(pixelHash) ?? null;
  if (!duplicate) exactPixels.set(pixelHash, id);
  const record: FrameRecord = {
    id,
    palette,
    row,
    column,
    url: `/sprites/reference/${palette}/frame-${String(column + 1).padStart(2, '0')}.png`,
    width: keyed.image.width,
    height: keyed.image.height,
    bounds: alphaBounds(keyed.image),
    pixelSha256: pixelHash,
    fileSha256: '',
    exactDuplicateOf: duplicate,
    magentaSpill: keyed.magentaSpill,
  };
  return { record, image: keyed.image };
};

export const finalizePngHashes = (result: ExtractionResult): ExtractionResult => {
  const frames = result.frames.map(({ record, image }) => {
    const bytes = encodePng(image);
    return { record: { ...record, fileSha256: sha256(bytes) }, image };
  });
  return {
    ...result,
    frames,
    manifest: { ...result.manifest, frames: frames.map(({ record }) => record) },
  };
};

export const encodeFrame = (frame: ExtractedFrame): Buffer => encodePng(frame.image);

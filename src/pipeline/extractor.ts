import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PaletteId, ReferenceFrame, SpriteManifest } from '../shared/types.ts';
import {
  cropImage,
  decodeImage,
  encodePng,
  extensionOf,
  type DecodedImage,
} from './image-codec.ts';
import { detectGrid, cellRect, type GridSpec } from './grid-detect.ts';
import { countMagentaSpill, keyMagentaBackground } from './chroma-key.ts';
import { centroidAlignedIou, silhouetteOf, type Silhouette } from './silhouette.ts';
import { sha256 } from './hashes.ts';

export const ROW_PALETTES: readonly PaletteId[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
];
const DUPLICATE_IOU = 0.9;

export interface ExtractedFrame {
  readonly id: string;
  readonly palette: PaletteId;
  readonly row: number;
  readonly column: number;
  readonly image: DecodedImage;
  readonly silhouette: Silhouette;
  readonly url: string;
  readonly sha256: string;
  readonly keyedPixels: number;
  readonly magentaSpill: number;
  readonly duplicateOf: string | null;
}

export interface ExtractionSet {
  readonly grid: GridSpec;
  readonly frames: readonly ExtractedFrame[];
  readonly sourceSha256: string;
  readonly sourcePath: string;
  readonly source: DecodedImage;
}

export const decodeSource = (sourcePath: string): DecodedImage => {
  const extension = extensionOf(sourcePath);
  if (!extension) throw new Error(`Unsupported source image extension: ${sourcePath}`);
  return decodeImage(readFileSync(sourcePath), extension);
};

export const extractFrames = (source: DecodedImage, sourcePath: string): ExtractionSet => {
  const grid = detectGrid(source);
  const frames: ExtractedFrame[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    const palette = ROW_PALETTES[row % ROW_PALETTES.length] as PaletteId;
    const rowFrames: ExtractedFrame[] = [];
    for (let column = 0; column < grid.columns; column += 1) {
      const cell = cropImage(source, cellRect(grid, row, column));
      const keyed = keyMagentaBackground(cell);
      const silhouette = silhouetteOf(keyed.image);
      const id = `runner-${palette}-${String(column + 1).padStart(2, '0')}`;
      const duplicate = rowFrames.find(
        (candidate) => centroidAlignedIou(silhouette, candidate.silhouette) >= DUPLICATE_IOU,
      );
      const frame: ExtractedFrame = {
        id,
        palette,
        row,
        column,
        image: keyed.image,
        silhouette,
        url: `/sprites/reference/${palette}/frame-${String(column + 1).padStart(2, '0')}.png`,
        sha256: '',
        keyedPixels: keyed.keyedPixels,
        magentaSpill: countMagentaSpill(keyed.image),
        duplicateOf: duplicate?.id ?? null,
      };
      rowFrames.push(frame);
      frames.push(frame);
    }
  }
  return {
    grid,
    frames,
    sourceSha256: sha256(readFileSync(sourcePath)),
    sourcePath,
    source,
  };
};

const manifestFrame = (frame: ExtractedFrame): ReferenceFrame => ({
  id: frame.id,
  palette: frame.palette,
  column: frame.column,
  url: frame.url,
  width: frame.image.width,
  height: frame.image.height,
  bounds: [
    frame.silhouette.bounds.minX,
    frame.silhouette.bounds.minY,
    frame.silhouette.bounds.maxX,
    frame.silhouette.bounds.maxY,
  ],
  pivot: [Math.round(frame.silhouette.centroid.x), Math.round(frame.silhouette.centroid.y)],
  sha256: frame.sha256,
  duplicateOf: frame.duplicateOf,
});

export const writeExtraction = (
  set: ExtractionSet,
  options: { publicDir: string; sourceLabel: string },
): SpriteManifest => {
  const written = set.frames.map((frame) => {
    const directory = join(options.publicDir, 'reference', frame.palette);
    mkdirSync(directory, { recursive: true });
    const buffer = encodePng(frame.image);
    writeFileSync(
      join(directory, `frame-${String(frame.column + 1).padStart(2, '0')}.png`),
      buffer,
    );
    return { ...frame, sha256: sha256(buffer) };
  });
  const manifest: SpriteManifest = {
    generatedBy: 'npm run sprites:extract',
    source: {
      path: options.sourceLabel,
      sha256: set.sourceSha256,
      width: set.source.width,
      height: set.source.height,
    },
    layout: {
      rows: set.grid.rows,
      columns: set.grid.columns,
      headerPx: set.grid.headerPx,
      cellWidth: set.grid.cellWidth,
      cellHeight: set.grid.cellHeight,
    },
    canvas: { width: set.grid.cellWidth, height: set.grid.cellHeight },
    frames: written.map(manifestFrame),
  };
  mkdirSync(join(options.publicDir), { recursive: true });
  writeFileSync(join(options.publicDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

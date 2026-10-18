import path from 'node:path';
import type { PhotorealPersonaId, RasterImage } from '../shared/types.js';
import { removeSmallOpaqueIslands } from './connected-components.js';
import { keyStudioMagenta } from './photoreal-extractor.js';
import { readImageFile, writePngFile } from './image-io.js';

const PROFILE_SOURCES: ReadonlyArray<{
  readonly personaId: PhotorealPersonaId;
  readonly folder: string;
  readonly sourceDir: string;
}> = [
  { personaId: 'photo-sg-chinese-female-petite', folder: 'sg-chinese-female-petite', sourceDir: 'photoreal-female-petite' },
  { personaId: 'photo-sg-chinese-female', folder: 'sg-chinese-female', sourceDir: 'photoreal-female' },
  { personaId: 'photo-sg-chinese-female-average', folder: 'sg-chinese-female-average', sourceDir: 'photoreal-female-average' },
];

export function generatePhotorealReferenceProfiles(repoRoot: string): readonly string[] {
  return PROFILE_SOURCES.map((source) => writeReferenceProfile(repoRoot, source));
}

function writeReferenceProfile(
  repoRoot: string,
  source: (typeof PROFILE_SOURCES)[number],
): string {
  const sourcePath = path.join(repoRoot, 'src/images', source.sourceDir, '01-master-lateral-profile-reference.png');
  const keyed = keyStudioMagenta(readImageFile(sourcePath));
  const cropped = cropRasterToOpaqueBounds(removeSmallOpaqueIslands(keyed, 16));
  const output = path.join(repoRoot, 'public/sprites/photoreal', source.folder, 'reference-profile.png');
  writePngFile(output, cropped);
  return output;
}

function cropRasterToOpaqueBounds(src: RasterImage): RasterImage {
  const bounds = findOpaqueBounds(src);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const output: RasterImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  for (let y = 0; y < height; y++) {
    const start = ((bounds.minY + y) * src.width + bounds.minX) * 4;
    output.data.set(src.data.subarray(start, start + width * 4), y * width * 4);
  }
  return output;
}

function findOpaqueBounds(src: RasterImage): {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
} {
  const bounds = scanOpaqueBounds(src);
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) {
    throw new Error('Master profile contains no keyed foreground pixels.');
  }
  return padBounds(bounds, src.width, src.height, 2);
}

function scanOpaqueBounds(src: RasterImage): { minX: number; minY: number; maxX: number; maxY: number } {
  const bounds = { minX: src.width, minY: src.height, maxX: -1, maxY: -1 };
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (src.data[(y * src.width + x) * 4 + 3] < 32) continue;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return bounds;
}

function padBounds(
  bounds: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number },
  width: number,
  height: number,
  padding: number,
): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } {
  return {
    minX: Math.max(0, bounds.minX - padding),
    minY: Math.max(0, bounds.minY - padding),
    maxX: Math.min(width - 1, bounds.maxX + padding),
    maxY: Math.min(height - 1, bounds.maxY + padding),
  };
}

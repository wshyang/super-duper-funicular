import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTES } from '../shared/constants.ts';
import type { VectorFrameEntry, VectorManifest } from '../shared/types.ts';
import { decodeImage } from './image-codec.ts';
import { quantiseImage } from './quantise.ts';
import { vectoriseImage, type VectorImage } from './vectorise.ts';
import { measureFidelity, rasteriseVector } from './vector-eval.ts';

export const VECTOR_DIR = 'public/vectors';
export const VECTOR_OPTIONS = { maxColors: 14, tolerance: 0.3, minArea: 2 } as const;

const entryOf = (
  id: string,
  file: string,
  vector: VectorImage,
  fidelity: { maskIou: number; colourAgreement: number },
): VectorFrameEntry => ({
  id,
  file,
  width: vector.width,
  height: vector.height,
  bands: vector.bands.length,
  paths: vector.bands.reduce((sum, band) => sum + band.paths.length, 0),
  points: vector.pointCount,
  bytes: vector.svg.length,
  maskIou: Number(fidelity.maskIou.toFixed(4)),
  colourAgreement: Number(fidelity.colourAgreement.toFixed(4)),
});

const mean = (values: readonly number[]): number =>
  values.length === 0
    ? 0
    : Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));

/** Vectorise every extracted reference frame and write SVGs plus a manifest. */
export const buildVectors = (root: string): VectorManifest => {
  const frames: VectorFrameEntry[] = [];
  for (const palette of PALETTES) {
    const outputDir = join(root, VECTOR_DIR, palette.id);
    mkdirSync(outputDir, { recursive: true });
    for (let index = 1; index <= 8; index += 1) {
      const id = `${palette.id}-${String(index).padStart(2, '0')}`;
      const sourcePath = join(
        root,
        'public',
        'sprites',
        'reference',
        palette.id,
        `frame-${String(index).padStart(2, '0')}.png`,
      );
      const image = decodeImage(readFileSync(sourcePath), 'png');
      const vector = vectoriseImage(image, VECTOR_OPTIONS);
      const fidelity = measureFidelity(
        quantiseImage(image, VECTOR_OPTIONS.maxColors),
        rasteriseVector(vector),
      );
      const file = `${palette.id}/frame-${String(index).padStart(2, '0')}.svg`;
      writeFileSync(join(root, VECTOR_DIR, file), vector.svg);
      frames.push(entryOf(id, file, vector, fidelity));
    }
  }
  const manifest: VectorManifest = {
    generatedBy: 'npm run vectors:build',
    options: VECTOR_OPTIONS,
    frames,
    meanMaskIou: mean(frames.map((frame) => frame.maskIou)),
    meanColourAgreement: mean(frames.map((frame) => frame.colourAgreement)),
  };
  writeFileSync(join(root, VECTOR_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

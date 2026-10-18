import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadImage, createImage } from './image-io.js';
import { computeKeyedAlpha, applyAlpha } from './chroma-key.js';
import { computeDistanceTransform } from './distance-transform.js';
import { segmentFigureParts } from './segment-parts.js';
import { alignSkeletonToSilhouette } from '../runner/fit-skeleton.js';
import { solveRigPose } from '../runner/rig.js';
import { seedSpecForKey } from '../runner/pose-table.js';
import { ARTICULATED_PART_IDS, REASSEMBLY_ORDER } from '../shared/rig.js';
import type { ArticulatedPartId, KeyAtlasManifest, RasterImage } from '../shared/rig.js';

const PERSONA_DIR = 'src/images/p2/sg-chinese-female';
const ATLAS_DIR = 'public/sprites/p2/sg-chinese-female/atlas';
const KEY_FILES = [
  'key-01-phi-000.png', 'key-02-phi-125.png', 'key-03-phi-250.png', 'key-04-phi-375.png',
  'key-05-phi-500.png', 'key-06-phi-625.png', 'key-07-phi-750.png', 'key-08-phi-875.png',
];

describe('part atlas', () => {
  it('reassembles every key atlas pixel-exactly from the shipped PNGs and bboxes', () => {
    for (let keyIndex = 0; keyIndex < KEY_FILES.length; keyIndex++) {
      const keyed = keyedImage(KEY_FILES[keyIndex]);
      const manifest = readManifest(keyIndex);
      const recomposed = reassemble(manifest, keyed.width, keyed.height);
      const metrics = compareAlpha(recomposed, keyed);
      expect(metrics.symmetricDifference, KEY_FILES[keyIndex]).toBe(0);
      expect(metrics.meanAbsRgbDiff, KEY_FILES[keyIndex]).toBe(0);
    }
  });

  it('ships well-formed manifests with cutouts matching their declared pixel counts', () => {
    for (let keyIndex = 0; keyIndex < KEY_FILES.length; keyIndex++) {
      const manifest = readManifest(keyIndex);
      expect(Object.keys(manifest.parts).sort()).toEqual([...ARTICULATED_PART_IDS].sort());
      for (const partId of ARTICULATED_PART_IDS) {
        const entry = manifest.parts[partId];
        const cutout = loadImage(`public${entry.pngPath}`);
        expect(cutout.width, `${KEY_FILES[keyIndex]} ${partId}`).toBe(entry.bbox.width);
        expect(cutout.height, `${KEY_FILES[keyIndex]} ${partId}`).toBe(entry.bbox.height);
        expect(countOpaque(cutout), `${KEY_FILES[keyIndex]} ${partId}`).toBe(entry.opaquePixelCount);
        expect(Number.isFinite(entry.pivot.x)).toBe(true);
        expect(Number.isFinite(entry.pivot.y)).toBe(true);
      }
      expect([...REASSEMBLY_ORDER].sort()).toEqual([...ARTICULATED_PART_IDS].sort());
    }
  });

  it('labels every keyed pixel with at least one part and no mask pixel outside the silhouette', () => {
    const plate = loadImage(`${PERSONA_DIR}/${KEY_FILES[0]}`);
    const keyed = applyAlpha(plate, computeKeyedAlpha(plate));
    const pose = fittedPose(keyed, 0);
    const segmentation = segmentFigureParts({
      pose,
      keyedAlpha: alphaPlane(keyed),
      distanceTransform: computeDistanceTransform(keyed),
      width: plate.width,
      height: plate.height,
    });
    let outside = 0;
    let uncovered = 0;
    for (let index = 0; index < keyed.width * keyed.height; index++) {
      const inSilhouette = keyed.data[index * 4 + 3] > 16;
      let inAnyPart = false;
      for (const partId of ARTICULATED_PART_IDS) {
        if (segmentation.masks[partId][index] === 1) inAnyPart = true;
      }
      if (inAnyPart && !inSilhouette) outside++;
      if (inSilhouette && !inAnyPart) uncovered++;
    }
    expect(outside).toBe(0);
    expect(uncovered).toBe(0);
  });
});

function keyedImage(file: string): RasterImage {
  return applyAlpha(loadImage(`${PERSONA_DIR}/${file}`), computeKeyedAlpha(loadImage(`${PERSONA_DIR}/${file}`)));
}

function readManifest(keyIndex: number): KeyAtlasManifest {
  const keyDir = KEY_FILES[keyIndex].replace('.png', '');
  return JSON.parse(fs.readFileSync(`${ATLAS_DIR}/${keyDir}/manifest.json`, 'utf8')) as KeyAtlasManifest;
}

function reassemble(manifest: KeyAtlasManifest, width: number, height: number): RasterImage {
  const canvas = createImage(width, height);
  for (const partId of REASSEMBLY_ORDER) {
    const entry = manifest.parts[partId];
    const cutout = loadImage(`public${entry.pngPath}`);
    for (let y = 0; y < cutout.height; y++) {
      for (let x = 0; x < cutout.width; x++) {
        const sourceOffset = (y * cutout.width + x) * 4;
        if (cutout.data[sourceOffset + 3] <= 16) continue;
        const targetOffset = ((entry.bbox.y + y) * canvas.width + entry.bbox.x + x) * 4;
        for (let channel = 0; channel < 4; channel++) canvas.data[targetOffset + channel] = cutout.data[sourceOffset + channel];
      }
    }
  }
  return canvas;
}

function compareAlpha(recomposed: RasterImage, original: RasterImage): { symmetricDifference: number; meanAbsRgbDiff: number } {
  let symmetricDifference = 0;
  let rgbSum = 0;
  let rgbCount = 0;
  for (let index = 3; index < original.data.length; index += 4) {
    if ((original.data[index] > 16) !== (recomposed.data[index] > 16)) symmetricDifference++;
  }
  for (let index = 0; index < original.data.length; index += 4) {
    if (original.data[index + 3] <= 16 || recomposed.data[index + 3] <= 16) continue;
    for (let channel = 0; channel < 3; channel++) rgbSum += Math.abs(original.data[index + channel] - recomposed.data[index + channel]);
    rgbCount++;
  }
  return { symmetricDifference, meanAbsRgbDiff: rgbCount === 0 ? 0 : rgbSum / (rgbCount * 3) };
}

function countOpaque(image: RasterImage): number {
  let count = 0;
  for (let index = 3; index < image.data.length; index += 4) {
    if (image.data[index] > 16) count++;
  }
  return count;
}

function fittedPose(keyed: RasterImage, keyIndex: number): ReturnType<typeof solveRigPose> {
  const downscale = 4;
  const width = Math.floor(keyed.width / downscale);
  const height = Math.floor(keyed.height / downscale);
  const mask = new Uint8Array(width * height);
  let sumX = 0;
  let count = 0;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = keyed.data[(y * downscale * keyed.width + x * downscale) * 4 + 3];
      if (alpha <= 16) continue;
      mask[y * width + x] = 1;
      sumX += x;
      count++;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const figureHeightPx = (maxY - minY + 1) * downscale;
  const seed = seedSpecForKey(keyIndex, sumX / count, minY + (maxY - minY + 1) * 0.52);
  const lowImage = createImage(width, height);
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] !== 1) continue;
    lowImage.data[index * 4 + 3] = 255;
  }
  const fit = alignSkeletonToSilhouette(mask, width, height, seed, computeDistanceTransform(lowImage));
  const vector = [
    fit.spec.pelvisX * downscale, fit.spec.pelvisY * downscale, fit.spec.torsoPitchRad, fit.spec.headTiltRad,
  ];
  const spec = { ...seed, pelvisX: vector[0], pelvisY: vector[1], torsoPitchRad: vector[2], headTiltRad: vector[3] };
  return solveRigPose(spec, figureHeightPx);
}

function alphaPlane(keyed: RasterImage): Uint8Array {
  const plane = new Uint8Array(keyed.width * keyed.height);
  for (let index = 0; index < plane.length; index++) plane[index] = keyed.data[index * 4 + 3];
  return plane;
}

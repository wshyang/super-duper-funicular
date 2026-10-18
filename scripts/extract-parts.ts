import fs from 'node:fs';
import { loadImage, createImage, saveImage } from '../src/pipeline/image-io.js';
import { computeKeyedAlpha, applyAlpha } from '../src/pipeline/chroma-key.js';
import { computeDistanceTransform } from '../src/pipeline/distance-transform.js';
import { segmentFigureParts } from '../src/pipeline/segment-parts.js';
import { alignSkeletonToSilhouette } from '../src/runner/fit-skeleton.js';
import { solveRigPose, specToVector, vectorToSpec } from '../src/runner/rig.js';
import { seedSpecForKey } from '../src/runner/pose-table.js';
import {
  ARTICULATED_PART_IDS, REASSEMBLY_ORDER,
  type ArticulatedPartId, type KeyAtlasManifest, type PartManifestEntry, type Point2D, type RigPose, type RasterImage,
} from '../src/shared/rig.js';
import { writeSkeletonOverlaySheet, writePartsMontage, writeReassemblyProofSheet } from './acquisition/audit-sheets.js';
import type { KeyExtraction } from './acquisition/audit-sheet-types.js';

const PERSONA_DIR = 'src/images/p2/sg-chinese-female';
const ATLAS_DIR = 'public/sprites/p2/sg-chinese-female/atlas';
const FIT_DOWNSCALE = 4;
const KEYS: readonly { readonly file: string; readonly phase: number }[] = [
  { file: 'key-01-phi-000.png', phase: 0 },
  { file: 'key-02-phi-125.png', phase: 0.125 },
  { file: 'key-03-phi-250.png', phase: 0.25 },
  { file: 'key-04-phi-375.png', phase: 0.375 },
  { file: 'key-05-phi-500.png', phase: 0.5 },
  { file: 'key-06-phi-625.png', phase: 0.625 },
  { file: 'key-07-phi-750.png', phase: 0.75 },
  { file: 'key-08-phi-875.png', phase: 0.875 },
];

interface PartGeometry {
  readonly pivot: Point2D;
  readonly distalTip: Point2D | null;
  readonly axisRad: number;
  readonly lengthPx: number;
}

interface FitOutcome {
  readonly spec: ReturnType<typeof vectorToSpec>;
  readonly figureHeightPx: number;
  readonly iou: number;
}

interface MaskScan {
  readonly mask: Uint8Array;
  readonly centroidX: number;
  readonly minY: number;
}

function main(): void {
  const startedAt = Date.now();
  fs.mkdirSync(ATLAS_DIR, { recursive: true });
  const extractions = KEYS.map((key) => extractKey(key.file, key.phase));
  for (const extraction of extractions) {
    const { fitSilhouetteIoU, reassembly } = extraction.manifest;
    console.log(`[atlas] ${extraction.keyFile} fitIoU=${fitSilhouetteIoU.toFixed(4)} reassemblyIoU=${reassembly.silhouetteIoU.toFixed(5)} alphaMismatch=${(reassembly.alphaMismatchFraction * 100).toFixed(3)}% rgbDelta=${reassembly.meanAbsRgbDiff.toFixed(3)}`);
  }
  writeSkeletonOverlaySheet(extractions);
  writePartsMontage(extractions);
  writeReassemblyProofSheet(extractions);
  console.log(`[atlas] ${extractions.length} key atlases + 3 audit sheets written (${Date.now() - startedAt}ms)`);
}

function extractKey(keyFile: string, phase: number): KeyExtraction {
  const plate = loadImage(`${PERSONA_DIR}/${keyFile}`);
  const keyed = applyAlpha(plate, computeKeyedAlpha(plate));
  const distanceTransform = computeDistanceTransform(keyed);
  const keyedAlpha = keyedAlphaPlane(keyed);
  const keyIndex = KEYS.findIndex((key) => key.file === keyFile);
  const fit = fitAtLowResolution(keyed, keyIndex);
  const pose = solveRigPose(fit.spec, fit.figureHeightPx);
  const segmentation = segmentFigureParts({ pose, keyedAlpha, distanceTransform, width: plate.width, height: plate.height });
  const geometry = partGeometryFromPose(pose);
  const manifest = exportPartCutouts(keyFile, phase, keyed, distanceTransform, segmentation.masks, geometry, fit.iou, pose);
  return { keyFile, phase, manifest, keyed, pose };
}

function keyedAlphaPlane(keyed: RasterImage): Uint8Array {
  const plane = new Uint8Array(keyed.width * keyed.height);
  for (let index = 0; index < plane.length; index++) plane[index] = keyed.data[index * 4 + 3];
  return plane;
}

function fitAtLowResolution(keyed: RasterImage, keyIndex: number): FitOutcome {
  const width = Math.floor(keyed.width / FIT_DOWNSCALE);
  const height = Math.floor(keyed.height / FIT_DOWNSCALE);
  const scan = scanDownscaledMask(keyed, width, height);
  const distanceTransform = computeDistanceTransform(maskToImage(scan.mask, width, height));
  const figureHeight = scan.maxY - scan.minY + 1;
  const seed = seedSpecForKey(keyIndex, scan.centroidX, scan.minY + figureHeight * 0.52);
  const result = alignSkeletonToSilhouette(scan.mask, width, height, seed, distanceTransform);
  return { spec: scalePelvisToFullResolution(result.spec), figureHeightPx: figureHeight * FIT_DOWNSCALE, iou: result.iou };
}

function maskToImage(mask: Uint8Array, width: number, height: number): RasterImage {
  const image = createImage(width, height);
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] !== 1) continue;
    image.data[index * 4 + 3] = 255;
  }
  return image;
}

interface DownscaleScan {
  readonly mask: Uint8Array;
  readonly centroidX: number;
  readonly minY: number;
  readonly maxY: number;
}

function scanDownscaledMask(keyed: RasterImage, width: number, height: number): DownscaleScan {
  const mask = new Uint8Array(width * height);
  let sumX = 0;
  let count = 0;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = keyed.data[(y * FIT_DOWNSCALE * keyed.width + x * FIT_DOWNSCALE) * 4 + 3];
      if (alpha <= 16) continue;
      mask[y * width + x] = 1;
      sumX += x;
      count++;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { mask, centroidX: count === 0 ? width / 2 : sumX / count, minY, maxY };
}

function scalePelvisToFullResolution(spec: ReturnType<typeof vectorToSpec>): ReturnType<typeof vectorToSpec> {
  const vector = specToVector(spec);
  vector[0] *= FIT_DOWNSCALE;
  vector[1] *= FIT_DOWNSCALE;
  return vectorToSpec(vector);
}

function partGeometryFromPose(pose: RigPose): Readonly<Record<ArticulatedPartId, PartGeometry>> {
  const geometry = {} as Record<ArticulatedPartId, PartGeometry>;
  geometry.farUpperArm = chainGeometry(pose.farArm.root, pose.farArm.mid, pose.farArm.tip);
  geometry.farForearm = chainGeometry(pose.farArm.mid, pose.farArm.tip, pose.farArm.end);
  geometry.farHand = tipGeometry(pose.farArm.tip, pose.farArm.end);
  geometry.farThigh = chainGeometry(pose.farLeg.root, pose.farLeg.mid, pose.farLeg.tip);
  geometry.farShin = chainGeometry(pose.farLeg.mid, pose.farLeg.tip, pose.farLeg.end);
  geometry.farFoot = tipGeometry(pose.farLeg.tip, pose.farLeg.end);
  geometry.nearUpperArm = chainGeometry(pose.nearArm.root, pose.nearArm.mid, pose.nearArm.tip);
  geometry.nearForearm = chainGeometry(pose.nearArm.mid, pose.nearArm.tip, pose.nearArm.end);
  geometry.nearHand = tipGeometry(pose.nearArm.tip, pose.nearArm.end);
  geometry.nearThigh = chainGeometry(pose.nearLeg.root, pose.nearLeg.mid, pose.nearLeg.tip);
  geometry.nearShin = chainGeometry(pose.nearLeg.mid, pose.nearLeg.tip, pose.nearLeg.end);
  geometry.nearFoot = tipGeometry(pose.nearLeg.tip, pose.nearLeg.end);
  geometry.pelvis = { pivot: pose.pelvis, distalTip: pose.waist, axisRad: axisRad(pose.pelvis, pose.waist), lengthPx: span(pose.pelvis, pose.waist) };
  geometry.torso = { pivot: pose.waist, distalTip: pose.neckBase, axisRad: axisRad(pose.waist, pose.neckBase), lengthPx: span(pose.waist, pose.neckBase) };
  geometry.head = { pivot: pose.neckBase, distalTip: { x: pose.headCenter.x, y: pose.headCenter.y - pose.headRadiusPx }, axisRad: axisRad(pose.neckBase, pose.headCenter), lengthPx: span(pose.neckBase, pose.headCenter) + pose.headRadiusPx };
  return geometry;
}

function chainGeometry(pivot: Point2D, mid: Point2D, distalTip: Point2D): PartGeometry {
  return { pivot, distalTip, axisRad: axisRad(pivot, mid), lengthPx: span(pivot, mid) };
}

function tipGeometry(pivot: Point2D, tip: Point2D): PartGeometry {
  return { pivot, distalTip: tip, axisRad: axisRad(pivot, tip), lengthPx: span(pivot, tip) };
}

function axisRad(a: Point2D, b: Point2D): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function span(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function exportPartCutouts(
  keyFile: string,
  phase: number,
  keyed: RasterImage,
  distanceTransform: Float64Array,
  masks: Readonly<Record<ArticulatedPartId, Uint8Array>>,
  geometry: Readonly<Record<ArticulatedPartId, PartGeometry>>,
  fitIou: number,
  pose: RigPose,
): KeyAtlasManifest {
  const keyDir = `${ATLAS_DIR}/${keyFile.replace('.png', '')}`;
  fs.mkdirSync(keyDir, { recursive: true });
  const parts = {} as Record<ArticulatedPartId, PartManifestEntry>;
  for (const partId of ARTICULATED_PART_IDS) {
    parts[partId] = exportOnePart(keyDir, partId, keyed, distanceTransform, masks[partId], geometry[partId]);
  }
  const recomposed = reassembleFromManifest(keyed.width, keyed.height, parts);
  const manifest: KeyAtlasManifest = {
    keyPath: `${PERSONA_DIR}/${keyFile}`,
    phase,
    figureHeightPx: Math.round(pose.figureHeightPx * 100) / 100,
    fitSilhouetteIoU: round(fitIou, 4),
    canvas: { width: keyed.width, height: keyed.height },
    parts,
    reassembly: compareImages(recomposed, keyed),
  };
  fs.writeFileSync(`${keyDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function exportOnePart(
  keyDir: string,
  partId: ArticulatedPartId,
  keyed: RasterImage,
  distanceTransform: Float64Array,
  mask: Uint8Array,
  partGeometry: PartGeometry,
): PartManifestEntry {
  const bbox = maskBbox(mask, keyed.width, keyed.height);
  const cutout = cropImage(renderPartCutout(keyed, mask), bbox);
  const pngPath = `${keyDir}/${partId}.png`;
  saveImage(pngPath, cutout);
  return {
    partId,
    pivot: roundPoint(partGeometry.pivot),
    distalTip: partGeometry.distalTip === null ? null : roundPoint(partGeometry.distalTip),
    boneAxisRad: round(partGeometry.axisRad, 4),
    lengthPx: round(partGeometry.lengthPx, 2),
    meanWidthPx: round(meanDtWidth(mask, distanceTransform), 2),
    bbox,
    pngPath: pngPath.replace('public', ''),
    opaquePixelCount: countMask(mask),
  };
}

function renderPartCutout(keyed: RasterImage, mask: Uint8Array): RasterImage {
  const cutout = createImage(keyed.width, keyed.height);
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] !== 1) continue;
    const offset = index * 4;
    for (let channel = 0; channel < 4; channel++) cutout.data[offset + channel] = keyed.data[offset + channel];
  }
  return cutout;
}

function meanDtWidth(mask: Uint8Array, distanceTransform: Float64Array): number {
  let sum = 0;
  let count = 0;
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] !== 1) continue;
    sum += distanceTransform[index];
    count++;
  }
  return count === 0 ? 0 : 2 * (sum / count);
}

function countMask(mask: Uint8Array): number {
  let count = 0;
  for (let index = 0; index < mask.length; index++) {
    if (mask[index] === 1) count++;
  }
  return count;
}

function maskBbox(mask: Uint8Array, width: number, height: number): PartManifestEntry['bbox'] {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] !== 1) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width: 1, height: 1 };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function cropImage(image: RasterImage, bbox: PartManifestEntry['bbox']): RasterImage {
  const cropped = createImage(bbox.width, bbox.height);
  for (let y = 0; y < bbox.height; y++) {
    for (let x = 0; x < bbox.width; x++) {
      const sourceOffset = ((bbox.y + y) * image.width + bbox.x + x) * 4;
      const targetOffset = (y * bbox.width + x) * 4;
      for (let channel = 0; channel < 4; channel++) cropped.data[targetOffset + channel] = image.data[sourceOffset + channel];
    }
  }
  return cropped;
}

function reassembleFromManifest(width: number, height: number, parts: Readonly<Record<ArticulatedPartId, PartManifestEntry>>): RasterImage {
  const canvas = createImage(width, height);
  for (const partId of REASSEMBLY_ORDER) {
    const cutout = loadImage(`public${parts[partId].pngPath}`);
    blitFull(canvas, cutout, parts[partId].bbox.x, parts[partId].bbox.y);
  }
  return canvas;
}

function blitFull(target: RasterImage, source: RasterImage, originX: number, originY: number): void {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const sourceOffset = (y * source.width + x) * 4;
      if (source.data[sourceOffset + 3] <= 16) continue;
      const targetOffset = ((originY + y) * target.width + originX + x) * 4;
      for (let channel = 0; channel < 4; channel++) target.data[targetOffset + channel] = source.data[sourceOffset + channel];
    }
  }
}

function compareImages(recomposed: RasterImage, original: RasterImage): { silhouetteIoU: number; alphaMismatchFraction: number; meanAbsRgbDiff: number } {
  let intersection = 0;
  let symmetricDifference = 0;
  let rgbSum = 0;
  let rgbCount = 0;
  const pixelCount = original.width * original.height;
  for (let index = 3; index < original.data.length; index += 4) {
    const inA = original.data[index] > 16;
    const inB = recomposed.data[index] > 16;
    if (inA && inB) intersection++;
    if (inA !== inB) symmetricDifference++;
  }
  for (let index = 0; index < original.data.length; index += 4) {
    if (original.data[index + 3] <= 16 || recomposed.data[index + 3] <= 16) continue;
    for (let channel = 0; channel < 3; channel++) rgbSum += Math.abs(original.data[index + channel] - recomposed.data[index + channel]);
    rgbCount++;
  }
  return {
    silhouetteIoU: round(intersection / Math.max(1, intersection + symmetricDifference), 5),
    alphaMismatchFraction: round(symmetricDifference / pixelCount, 5),
    meanAbsRgbDiff: round(rgbCount === 0 ? 0 : rgbSum / (rgbCount * 3), 3),
  };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundPoint(point: Point2D): Point2D {
  return { x: round(point.x, 2), y: round(point.y, 2) };
}

main();

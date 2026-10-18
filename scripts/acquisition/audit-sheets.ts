import { createImage, loadImage, saveImage } from '../../src/pipeline/image-io.js';
import type { ArticulatedPartId, Point2D, RasterImage } from '../../src/shared/rig.js';
import { ARTICULATED_PART_IDS, REASSEMBLY_ORDER } from '../../src/shared/rig.js';
import type { RigPose } from '../../src/shared/rig.js';
import type { KeyExtraction } from './audit-sheet-types.js';

const PANEL_RGB = [226, 230, 238];
const BONE_RGB = [0, 158, 96];
const JOINT_RGB = [214, 40, 40];
const MISMATCH_RGB = [214, 40, 40];
const SHEET_DIR = 'public/sprites/p2/sg-chinese-female/atlas';

export function writeSkeletonOverlaySheet(extractions: readonly KeyExtraction[]): void {
  const cellWidth = 320;
  const cellHeight = 180;
  const sheet = createImage(cellWidth * 4 + 40, cellHeight * 2 + 24);
  fillPanel(sheet);
  extractions.forEach((extraction, index) => {
    const originX = 8 + (index % 4) * (cellWidth + 8);
    const originY = 8 + Math.floor(index / 4) * (cellHeight + 8);
    paintSkeletonCell(sheet, extraction, originX, originY, cellWidth, cellHeight);
  });
  saveImage(`${SHEET_DIR}/skeleton-overlays.png`, sheet);
}

function paintSkeletonCell(sheet: RasterImage, extraction: KeyExtraction, originX: number, originY: number, cellWidth: number, cellHeight: number): void {
  const scale = Math.min(cellWidth / extraction.keyed.width, cellHeight / extraction.keyed.height);
  blitScaled(sheet, extraction.keyed, originX, originY, scale, 0.55);
  for (const bone of skeletonSegments(extraction.pose)) {
    drawLine(sheet, transformed(bone.a, originX, originY, scale), transformed(bone.b, originX, originY, scale), BONE_RGB);
  }
  for (const joint of jointPoints(extraction.pose)) {
    drawDot(sheet, transformed(joint, originX, originY, scale), JOINT_RGB);
  }
}

interface Segment2D {
  readonly a: Point2D;
  readonly b: Point2D;
}

function skeletonSegments(pose: RigPose): readonly Segment2D[] {
  return [
    { a: pose.pelvis, b: pose.waist },
    { a: pose.waist, b: pose.neckBase },
    { a: pose.neckBase, b: pose.headCenter },
    { a: pose.nearArm.root, b: pose.nearArm.mid }, { a: pose.nearArm.mid, b: pose.nearArm.tip }, { a: pose.nearArm.tip, b: pose.nearArm.end },
    { a: pose.farArm.root, b: pose.farArm.mid }, { a: pose.farArm.mid, b: pose.farArm.tip }, { a: pose.farArm.tip, b: pose.farArm.end },
    { a: pose.nearLeg.root, b: pose.nearLeg.mid }, { a: pose.nearLeg.mid, b: pose.nearLeg.tip }, { a: pose.nearLeg.tip, b: pose.nearLeg.end },
    { a: pose.farLeg.root, b: pose.farLeg.mid }, { a: pose.farLeg.mid, b: pose.farLeg.tip }, { a: pose.farLeg.tip, b: pose.farLeg.end },
  ];
}

function jointPoints(pose: RigPose): readonly Point2D[] {
  return [
    pose.pelvis, pose.waist, pose.neckBase, pose.headCenter,
    pose.nearArm.root, pose.nearArm.mid, pose.nearArm.tip,
    pose.farArm.root, pose.farArm.mid, pose.farArm.tip,
    pose.nearLeg.root, pose.nearLeg.mid, pose.nearLeg.tip,
    pose.farLeg.root, pose.farLeg.mid, pose.farLeg.tip,
  ];
}

function transformed(point: Point2D, originX: number, originY: number, scale: number): Point2D {
  return { x: originX + point.x * scale, y: originY + point.y * scale };
}

export function writePartsMontage(extractions: readonly KeyExtraction[]): void {
  const cellWidth = 68;
  const cellHeight = 88;
  const sheet = createImage(cellWidth * extractions.length + 8, cellHeight * ARTICULATED_PART_IDS.length + 8);
  fillPanel(sheet);
  extractions.forEach((extraction, keyIndex) => {
    ARTICULATED_PART_IDS.forEach((partId, partIndex) => {
      const originX = 4 + keyIndex * cellWidth;
      const originY = 4 + partIndex * cellHeight;
      paintPartThumb(sheet, extraction, partId, originX, originY, cellWidth - 4, cellHeight - 4);
    });
  });
  saveImage(`${SHEET_DIR}/parts-montage.png`, sheet);
}

function paintPartThumb(
  sheet: RasterImage,
  extraction: KeyExtraction,
  partId: ArticulatedPartId,
  originX: number,
  originY: number,
  cellWidth: number,
  cellHeight: number,
): void {
  const entry = extraction.manifest.parts[partId];
  const cutout = loadImage(`public${entry.pngPath}`);
  const scale = Math.min(cellWidth / cutout.width, cellHeight / cutout.height, 1);
  const scaledWidth = Math.max(1, Math.round(cutout.width * scale));
  const scaledHeight = Math.max(1, Math.round(cutout.height * scale));
  const offsetX = originX + Math.floor((cellWidth - scaledWidth) / 2);
  const offsetY = originY + Math.floor((cellHeight - scaledHeight) / 2);
  blitScaled(sheet, cutout, offsetX, offsetY, scale, 1);
}

export function writeReassemblyProofSheet(extractions: readonly KeyExtraction[]): void {
  const cellWidth = 200;
  const cellHeight = 112;
  const sheet = createImage(cellWidth * 3 + 16, (cellHeight + 4) * extractions.length + 8);
  fillPanel(sheet);
  extractions.forEach((extraction, index) => {
    const originY = 4 + index * (cellHeight + 4);
    const recomposed = reassembleForProof(extraction);
    paintScaledCell(sheet, extraction.keyed, 4, originY, cellWidth, cellHeight);
    paintScaledCell(sheet, recomposed, cellWidth + 8, originY, cellWidth, cellHeight);
    paintDiffCell(sheet, extraction.keyed, recomposed, 2 * cellWidth + 12, originY, cellWidth, cellHeight);
  });
  saveImage(`${SHEET_DIR}/reassembly-proof.png`, sheet);
}

function reassembleForProof(extraction: KeyExtraction): RasterImage {
  const canvas = createImage(extraction.keyed.width, extraction.keyed.height);
  for (const partId of REASSEMBLY_ORDER) {
    const entry = extraction.manifest.parts[partId];
    const cutout = loadImage(`public${entry.pngPath}`);
    blitPart(canvas, cutout, entry.bbox.x, entry.bbox.y);
  }
  return canvas;
}

function blitPart(target: RasterImage, source: RasterImage, originX: number, originY: number): void {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const sourceOffset = (y * source.width + x) * 4;
      if (source.data[sourceOffset + 3] <= 16) continue;
      const targetOffset = ((originY + y) * target.width + originX + x) * 4;
      for (let channel = 0; channel < 4; channel++) target.data[targetOffset + channel] = source.data[sourceOffset + channel];
    }
  }
}

function paintScaledCell(sheet: RasterImage, image: RasterImage, originX: number, originY: number, cellWidth: number, cellHeight: number): void {
  const scale = Math.min(cellWidth / image.width, cellHeight / image.height);
  blitScaled(sheet, image, originX, originY, scale, 1);
}

function paintDiffCell(sheet: RasterImage, original: RasterImage, recomposed: RasterImage, originX: number, originY: number, cellWidth: number, cellHeight: number): void {
  const scale = Math.min(cellWidth / original.width, cellHeight / original.height);
  const scaledWidth = Math.round(original.width * scale);
  const scaledHeight = Math.round(original.height * scale);
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const sourceOffset = (Math.floor(y / scale) * original.width + Math.floor(x / scale)) * 4;
      const targetOffset = ((originY + y) * sheet.width + originX + x) * 4;
      const mismatch = (original.data[sourceOffset + 3] > 16) !== (recomposed.data[sourceOffset + 3] > 16);
      sheet.data[targetOffset] = mismatch ? MISMATCH_RGB[0] : 210;
      sheet.data[targetOffset + 1] = mismatch ? MISMATCH_RGB[1] : 214;
      sheet.data[targetOffset + 2] = mismatch ? MISMATCH_RGB[2] : 222;
      sheet.data[targetOffset + 3] = 255;
    }
  }
}

function blitScaled(sheet: RasterImage, image: RasterImage, originX: number, originY: number, scale: number, alpha: number): void {
  const scaledWidth = Math.round(image.width * scale);
  const scaledHeight = Math.round(image.height * scale);
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const sourceOffset = (Math.floor(y / scale) * image.width + Math.floor(x / scale)) * 4;
      const sourceAlpha = (image.data[sourceOffset + 3] / 255) * alpha;
      if (sourceAlpha <= 0.02) continue;
      const targetOffset = ((originY + y) * sheet.width + originX + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        sheet.data[targetOffset + channel] = Math.round(image.data[sourceOffset + channel] * sourceAlpha + sheet.data[targetOffset + channel] * (1 - sourceAlpha));
      }
      sheet.data[targetOffset + 3] = 255;
    }
  }
}

function drawLine(sheet: RasterImage, a: Point2D, b: Point2D, rgb: readonly number[]): void {
  const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    drawDot(sheet, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, rgb);
  }
}

function drawDot(sheet: RasterImage, center: Point2D, rgb: readonly number[]): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = Math.round(center.x) + dx;
      const y = Math.round(center.y) + dy;
      if (x < 0 || y < 0 || x >= sheet.width || y >= sheet.height) continue;
      const offset = (y * sheet.width + x) * 4;
      sheet.data[offset] = rgb[0];
      sheet.data[offset + 1] = rgb[1];
      sheet.data[offset + 2] = rgb[2];
      sheet.data[offset + 3] = 255;
    }
  }
}

function fillPanel(sheet: RasterImage): void {
  for (let index = 0; index < sheet.data.length; index += 4) {
    sheet.data[index] = PANEL_RGB[0];
    sheet.data[index + 1] = PANEL_RGB[1];
    sheet.data[index + 2] = PANEL_RGB[2];
    sheet.data[index + 3] = 255;
  }
}

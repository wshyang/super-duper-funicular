import type { PartCalibration, PersonaCalibrationV1 } from '../shared/persona-calibration.ts';
import { chromaKeyWindow } from './chroma-key.ts';
import { purgeClassesForKind, purgeMaterialClasses } from './material-matte.ts';
import { applyPivotCaps } from './rounded-caps.ts';
import { createImage, getPixel, setPixel, type RgbaImage } from './rgba-image.ts';

export const PART_CANVAS = 160;

export interface DecomposedParts {
  readonly parts: Readonly<Record<string, RgbaImage>>;
  readonly occluderCanvases: Readonly<Record<string, RgbaImage>>;
}

function partScale(part: PartCalibration): number {
  if (part.srcDistal !== undefined && part.dstDistal !== undefined) {
    const srcBone = Math.hypot(part.srcDistal.x - part.srcProximal.x, part.srcDistal.y - part.srcProximal.y);
    const dstBone = Math.hypot(part.dstDistal.x - part.dstProximal.x, part.dstDistal.y - part.dstProximal.y);
    return dstBone / srcBone;
  }
  return part.scale ?? 1;
}

function blitPart(keyed: RgbaImage, part: PartCalibration): RgbaImage {
  const canvas = createImage(PART_CANVAS, PART_CANVAS);
  const scale = partScale(part);
  for (let dy = 0; dy < PART_CANVAS; dy += 1) {
    for (let dx = 0; dx < PART_CANVAS; dx += 1) {
      const sx = Math.round(part.srcProximal.x + (dx - part.dstProximal.x) / scale) - part.window.x;
      const sy = Math.round(part.srcProximal.y + (dy - part.dstProximal.y) / scale) - part.window.y;
      if (sx < 0 || sy < 0 || sx >= keyed.width || sy >= keyed.height) continue;
      const pixel = getPixel(keyed, sx, sy);
      if (pixel.a === 0) continue;
      setPixel(canvas, dx, dy, pixel);
    }
  }
  return canvas;
}

function subtractOccluders(keyed: RgbaImage, part: PartCalibration, masks: Readonly<Record<string, Uint8Array>>, masterWidth: number): void {
  for (const occluder of part.subtractOccluders ?? []) {
    const mask = masks[occluder];
    if (mask === undefined) continue;
    for (let y = 0; y < keyed.height; y += 1) {
      for (let x = 0; x < keyed.width; x += 1) {
        if (mask[(part.window.y + y) * masterWidth + (part.window.x + x)] === 1) {
          setPixel(keyed, x, y, { ...getPixel(keyed, x, y), a: 0 });
        }
      }
    }
  }
}

function recordMask(keyed: RgbaImage, part: PartCalibration, mask: Uint8Array, masterWidth: number): void {
  for (let y = 0; y < keyed.height; y += 1) {
    for (let x = 0; x < keyed.width; x += 1) {
      if (getPixel(keyed, x, y).a > 20) mask[(part.window.y + y) * masterWidth + (part.window.x + x)] = 1;
    }
  }
}

function blitDesignedMask(preOpaque: Uint8Array, keyed: RgbaImage, part: PartCalibration): RgbaImage {
  const canvas = createImage(PART_CANVAS, PART_CANVAS);
  const scale = partScale(part);
  for (let y = 0; y < keyed.height; y += 1) {
    for (let x = 0; x < keyed.width; x += 1) {
      const idx = y * keyed.width + x;
      if (preOpaque[idx] === 0 || getPixel(keyed, x, y).a !== 0) continue;
      const dx = Math.round(part.dstProximal.x + (part.window.x + x - part.srcProximal.x) * scale);
      const dy = Math.round(part.dstProximal.y + (part.window.y + y - part.srcProximal.y) * scale);
      if (dx < 0 || dy < 0 || dx >= PART_CANVAS || dy >= PART_CANVAS) continue;
      setPixel(canvas, dx, dy, { r: 255, g: 0, b: 255, a: 255 });
    }
  }
  return canvas;
}

function snapshotOpaque(keyed: RgbaImage): Uint8Array {
  const snapshot = new Uint8Array(keyed.width * keyed.height);
  for (let i = 0; i < snapshot.length; i += 1) snapshot[i] = (keyed.data[i * 4 + 3] ?? 0) > 20 ? 1 : 0;
  return snapshot;
}

interface CutResult {
  readonly cut: RgbaImage;
  readonly occluderCanvas: RgbaImage;
}

function cutPart(master: RgbaImage, part: PartCalibration, masks: Record<string, Uint8Array>): CutResult {
  const keyed = chromaKeyWindow(master, part.window);
  const preOpaque = snapshotOpaque(keyed);
  subtractOccluders(keyed, part, masks, master.width);
  purgeMaterialClasses(keyed, purgeClassesForKind(part.kind));
  const occluderCanvas = blitDesignedMask(preOpaque, keyed, part);
  const blitted = blitPart(keyed, part);
  const capped = applyPivotCaps(blitted, {
    centerX: part.dstProximal.x,
    proximalY: part.dstProximal.y,
    distalY: part.dstDistal?.y,
    capRadius: part.capRadius,
  });
  const mask = new Uint8Array(master.width * master.height);
  recordMask(keyed, part, mask, master.width);
  masks[part.partId] = mask;
  return { cut: capped, occluderCanvas };
}

export function decomposeMaster(master: RgbaImage, record: PersonaCalibrationV1): DecomposedParts {
  const masks: Record<string, Uint8Array> = {};
  const parts: Record<string, RgbaImage> = {};
  const occluderCanvases: Record<string, RgbaImage> = {};
  for (const part of record.parts) {
    const result = cutPart(master, part, masks);
    parts[part.partId] = result.cut;
    occluderCanvases[part.partId] = result.occluderCanvas;
  }
  return { parts, occluderCanvases };
}

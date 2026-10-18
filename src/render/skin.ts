import { clamp } from '../core/geometry.js';
import { createRaster, pixelIndex } from '../core/raster.js';
import type { PoseFrame, RasterImage } from '../core/types.js';
import { addressPoint, sampleAtlas, type Atlas } from '../atlas/unwrap.js';
import type { Bone, BoneId } from '../rig/bones.js';
import { poseBonesForPersona, type PersonaContext } from './persona.js';

export interface RenderOptions {
  /** Silhouette edge width in px. The surface has no interior seams, so 1 is enough. */
  readonly feather?: number;
  readonly supersample?: 1 | 2;
}

const SUBSAMPLES: Readonly<Record<1 | 2, readonly number[]>> = { 1: [0.5], 2: [0.25, 0.75] };

/**
 * Skinned render.
 *
 * Two passes, back layer then front layer, and inside each pass the bones paint
 * in anatomical order (`paintOrder`). For every bone the destination pixel is
 * projected back into the *posed* bone frame, an atlas address `(u, v)` is read,
 * and the atlas is sampled. Because atlas space and pose space share one
 * parameterisation, a joint is an interior point of a continuous surface: there
 * is no cut edge anywhere in the interior of the body.
 */
export function renderSkinnedFrame(
  pose: PoseFrame,
  context: PersonaContext,
  options: RenderOptions = {},
): RasterImage {
  const feather = options.feather ?? 0.9;
  const offsets = SUBSAMPLES[options.supersample ?? 2];
  const canvas = createRaster(context.width, context.height);
  const bones = poseBonesForPersona(pose, context);
  for (const layer of ['back', 'front'] as const) {
    const ordered = bones.filter((bone) => bone.layer === layer).sort((a, b) => a.paintOrder - b.paintOrder);
    for (const bone of ordered) paintBone(canvas, bone, context.atlas, feather, offsets);
  }
  return canvas;
}

function paintBone(
  canvas: RasterImage,
  bone: Bone,
  atlas: Atlas,
  feather: number,
  offsets: readonly number[],
): void {
  const tile = atlas.tiles[bone.id as BoneId];
  if (!tile) return;
  const pad = Math.max(bone.halfWidthProximal, bone.halfWidthDistal) + 3;
  const minX = Math.max(0, Math.floor(Math.min(bone.proximal.x, bone.distal.x) - pad));
  const maxX = Math.min(canvas.width - 1, Math.ceil(Math.max(bone.proximal.x, bone.distal.x) + pad));
  const minY = Math.max(0, Math.floor(Math.min(bone.proximal.y, bone.distal.y) - pad));
  const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(bone.proximal.y, bone.distal.y) + pad));
  const samples = offsets.length * offsets.length;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (const oy of offsets) {
        for (const ox of offsets) {
          const address = addressPoint({ x: x + ox, y: y + oy }, bone);
          const limit = 1 + feather / Math.max(1, bone.halfWidthProximal);
          if (address.normalizedDistance > limit) continue;
          const sample = sampleAtlas(tile, address.t, address.offset);
          const weight = clamp((limit - address.normalizedDistance) / (feather / Math.max(1, bone.halfWidthProximal)), 0, 1);
          if (weight <= 0) continue;
          r += sample.r;
          g += sample.g;
          b += sample.b;
          hits++;
        }
      }
      if (hits === 0) continue;
      const coverage = clamp(hits / samples, 0, 1);
      const index = pixelIndex(canvas, x, y);
      canvas.data[index] = r / hits;
      canvas.data[index + 1] = g / hits;
      canvas.data[index + 2] = b / hits;
      canvas.data[index + 3] = Math.round(coverage * 255);
    }
  }
}

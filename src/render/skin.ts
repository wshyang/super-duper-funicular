import { clamp, distanceToSegment } from '../core/geometry.js';
import { createRaster, pixelIndex } from '../core/raster.js';
import type { PoseFrame, RasterImage } from '../core/types.js';
import { addressPoint, sampleAtlas, type Atlas, type AtlasTile } from '../atlas/unwrap.js';
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

/**
 * Alpha-composites one sample over the canvas.
 *
 * Replacing the pixel instead — writing the new coverage straight into alpha —
 * looks harmless and is not: a bone painted later has a feathered edge, and
 * wherever that edge crosses an already-solid neighbour it *erases* the
 * neighbour's alpha. The result is a translucent seam exactly at the joint,
 * which reads as a detached limb once the frame is thresholded. That is why the
 * near shoe floated free of its leg at one phase.
 */
function compositeOver(
  canvas: RasterImage,
  index: number,
  r: number,
  g: number,
  b: number,
  coverage: number,
): void {
  const dstA = (canvas.data[index + 3] ?? 0) / 255;
  const srcA = coverage;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  const mix = (src: number, dst: number): number => (src * srcA + dst * dstA * (1 - srcA)) / outA;
  canvas.data[index] = mix(r, canvas.data[index] ?? 0);
  canvas.data[index + 1] = mix(g, canvas.data[index + 1] ?? 0);
  canvas.data[index + 2] = mix(b, canvas.data[index + 2] ?? 0);
  canvas.data[index + 3] = Math.round(outA * 255);
}

/** 1 inside the capsule, fading to 0 across `feather` px at its silhouette edge. */
function featheredEdge(normalizedDistance: number, limit: number, feather: number, radius: number): number {
  const band = feather / Math.max(1, radius);
  return clamp((limit - normalizedDistance) / band, 0, 1);
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
  const context = { tile, bone, feather, offsets, samples: offsets.length * offsets.length };
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const sample = sampleBonePixel(context, x, y);
      if (!sample) continue;
      compositeOver(canvas, pixelIndex(canvas, x, y), sample.r, sample.g, sample.b, sample.coverage);
    }
  }
}

interface PaintContext {
  readonly tile: AtlasTile;
  readonly bone: Bone;
  readonly feather: number;
  readonly offsets: readonly number[];
  readonly samples: number;
}

interface PixelSample {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly coverage: number;
}

/** Averages the subsamples that land inside one bone's capsule, or `null`. */
function sampleBonePixel(context: PaintContext, x: number, y: number): PixelSample | null {
  const { tile, bone, feather, offsets } = context;
  let r = 0;
  let g = 0;
  let b = 0;
  let hits = 0;
  const fill = bone.jointFill;
  const fillWeight =
    fill &&
    distanceToSegment({ x: x + 0.5, y: y + 0.5 }, bone.proximal, fill) <=
      Math.max(bone.halfWidthProximal, bone.halfWidthDistal)
      ? 1
      : 0;
  for (const oy of offsets) {
    for (const ox of offsets) {
      const address = addressPoint({ x: x + ox, y: y + oy }, bone);
      const limit = 1 + feather / Math.max(1, bone.halfWidthProximal);
      const edge = featheredEdge(address.normalizedDistance, limit, feather, bone.halfWidthProximal);
      if (Math.max(edge, fillWeight) <= 0) continue;
      const sample = sampleAtlas(tile, address.t, address.offset);
      if (sample.a === 0) continue;
      r += sample.r;
      g += sample.g;
      b += sample.b;
      hits++;
    }
  }
  if (hits === 0) return null;
  return { r: r / hits, g: g / hits, b: b / hits, coverage: clamp(hits / context.samples, 0, 1) };
}


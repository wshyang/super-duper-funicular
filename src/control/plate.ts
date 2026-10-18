import { clamp } from '../core/geometry.js';
import { blendPixel, createRaster, writePixel } from '../core/raster.js';
import type {
  Capsule,
  MaterialId,
  PoseFrame,
  RasterImage,
  RgbaColor,
} from '../core/types.js';
import { capsuleBounds, coverageAlpha, unionDistance } from './capsule.js';
import type { PlatePalette } from './palette.js';

const CANVAS_WIDTH = 220;
const CANVAS_HEIGHT = 256;

export interface PlateOptions {
  readonly outline?: boolean;
  readonly joints?: boolean;
  readonly groundLine?: boolean;
  readonly background?: RgbaColor | null;
}

/** One paint pass: a union of capsules of the same material, painted together. */
interface PaintGroup {
  readonly material: MaterialId;
  readonly capsules: readonly Capsule[];
  readonly shade: number;
}

function footCapsules(pose: PoseFrame): { near: Capsule[]; far: Capsule[] } {
  const build = (roll: PoseFrame['nearFoot'], material: MaterialId): Capsule[] => [
    { a: roll.ankle, b: roll.ball, radiusStart: 5.6, radiusEnd: 5.0, material },
    { a: roll.ball, b: roll.toe, radiusStart: 5.0, radiusEnd: 3.0, material },
    { a: roll.heel, b: roll.ankle, radiusStart: 4.4, radiusEnd: 4.8, material },
  ];
  return {
    near: build(pose.nearFoot, 'footwear'),
    far: build(pose.farFoot, 'footwearFar'),
  };
}

/**
 * Back-to-front paint order. The far side is painted first so that the near
 * limbs occlude it, exactly as a strict sagittal view requires.
 */
export function paintGroups(pose: PoseFrame): PaintGroup[] {
  const feet = footCapsules(pose);
  const nearSkin = [...pose.nearLeg, ...pose.nearArm].map((segment) => segment.capsule);
  const farSkin = [...pose.farLeg, ...pose.farArm].map((segment) => segment.capsule);
  return [
    { material: 'hair', capsules: [pose.hair], shade: 1 },
    { material: 'skinFar', capsules: farSkin, shade: 0.9 },
    { material: 'footwearFar', capsules: feet.far, shade: 0.9 },
    { material: 'fabricFar', capsules: [pose.pelvisCapsule], shade: 0.9 },
    { material: 'fabric', capsules: [pose.torso], shade: 1 },
    { material: 'footwear', capsules: feet.near, shade: 1 },
    { material: 'skin', capsules: nearSkin, shade: 1 },
    { material: 'skin', capsules: [pose.neck, pose.head], shade: 1 },
  ];
}

export function renderControlPlate(
  pose: PoseFrame,
  palette: PlatePalette,
  options: PlateOptions = {},
): RasterImage {
  const canvas = createRaster(CANVAS_WIDTH, CANVAS_HEIGHT);
  if (options.background) {
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) writePixel(canvas, x, y, options.background);
    }
  }
  for (const group of paintGroups(pose)) paintGroup(canvas, group, palette);
  if (options.outline) paintOutline(canvas);
  if (options.groundLine) paintGroundLine(canvas, pose.groundY, palette);
  if (options.joints) paintJoints(canvas, pose, palette);
  return canvas;
}

function paintGroup(canvas: RasterImage, group: PaintGroup, palette: PlatePalette): void {
  if (group.capsules.length === 0) return;
  const bounds = capsuleBounds(group.capsules);
  const base = palette.materials[group.material];
  const minX = Math.max(0, Math.floor(bounds.minX));
  const minY = Math.max(0, Math.floor(bounds.minY));
  const maxX = Math.min(canvas.width - 1, Math.ceil(bounds.maxX));
  const maxY = Math.min(canvas.height - 1, Math.ceil(bounds.maxY));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = unionDistance({ x: x + 0.5, y: y + 0.5 }, group.capsules);
      const alpha = coverageAlpha(d, 0.85);
      if (alpha <= 0) continue;
      const interior = clamp(-d / 7, 0, 1);
      const light = (0.82 + 0.18 * interior) * group.shade;
      blendPixel(canvas, x, y, {
        r: base.r * light,
        g: base.g * light,
        b: base.b * light,
        a: Math.round(alpha * 255),
      });
    }
  }
}

/** A one-pixel darker rim: useful because it makes silhouette defects legible. */
function paintOutline(canvas: RasterImage): void {
  const copy = { width: canvas.width, height: canvas.height, data: new Uint8ClampedArray(canvas.data) };
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const i = (y * canvas.width + x) * 4;
      if ((alphaAt(copy, x, y) ?? 0) === 0) continue;
      const neighbours = [
        alphaAt(copy, x - 1, y) ?? 0,
        alphaAt(copy, x + 1, y) ?? 0,
        alphaAt(copy, x, y - 1) ?? 0,
        alphaAt(copy, x, y + 1) ?? 0,
      ];
      if (neighbours.some((a) => a === 0)) {
        const data = canvas.data;
        data[i] = (data[i] ?? 0) * 0.55;
        data[i + 1] = (data[i + 1] ?? 0) * 0.55;
        data[i + 2] = (data[i + 2] ?? 0) * 0.55;
      }
    }
  }
}

function alphaAt(image: RasterImage, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3] ?? 0;
}

function paintGroundLine(canvas: RasterImage, groundY: number, palette: PlatePalette): void {
  for (let x = 6; x < canvas.width - 6; x++) {
    blendPixel(canvas, x, groundY, { ...palette.ground, a: 150 });
  }
}

function paintJoints(canvas: RasterImage, pose: PoseFrame, palette: PlatePalette): void {
  const points = [
    pose.pelvis,
    pose.torsoTop,
    pose.headCenter,
    ...pose.nearLeg.map((s) => s.capsule.a),
    ...pose.nearLeg.map((s) => s.capsule.b),
    ...pose.nearArm.map((s) => s.capsule.a),
    ...pose.nearArm.map((s) => s.capsule.b),
  ];
  for (const point of points) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 2) continue;
        blendPixel(canvas, Math.round(point.x) + dx, Math.round(point.y) + dy, palette.joint);
      }
    }
  }
}

/** Flat silhouette on the chroma background: the structure reference handed to an image model. */
export function renderSilhouettePlate(pose: PoseFrame, palette: PlatePalette): RasterImage {
  const canvas = createRaster(CANVAS_WIDTH, CANVAS_HEIGHT);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) writePixel(canvas, x, y, palette.background);
  }
  const capsules = paintGroups(pose).flatMap((group) => group.capsules);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const d = unionDistance({ x: x + 0.5, y: y + 0.5 }, capsules);
      if (d <= 0.4) writePixel(canvas, x, y, { r: 24, g: 24, b: 28, a: 255 });
    }
  }
  return canvas;
}

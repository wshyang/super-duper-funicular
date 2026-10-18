import type { Primitive, RenderScene, Vec2 } from '../shared/types.ts';
import { parseColor as parseCssColor } from './scene-shapes.ts';

export interface RasterImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const parseColor = (color: string): Rgba => {
  const { r, g, b, a } = parseCssColor(color);
  return { r: r / 255, g: g / 255, b: b / 255, a };
};

const circlePolygon = (center: Vec2, radius: number, segments = 44): Vec2[] => {
  const points: Vec2[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
  }
  return points;
};

const capsulePolygon = (a: Vec2, b: Vec2, radius: number): Vec2[] => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return circlePolygon(a, radius);
  const start = Math.atan2(dy / len, dx / len);
  const points: Vec2[] = [];
  const steps = 20;
  for (let index = 0; index <= steps; index += 1) {
    const angle = start + Math.PI / 2 + (index / steps) * Math.PI;
    points.push({ x: a.x + Math.cos(angle) * radius, y: a.y + Math.sin(angle) * radius });
  }
  for (let index = 0; index <= steps; index += 1) {
    const angle = start - Math.PI / 2 + (index / steps) * Math.PI;
    points.push({ x: b.x + Math.cos(angle) * radius, y: b.y + Math.sin(angle) * radius });
  }
  return points;
};

const expandPolygon = (points: readonly Vec2[], amount: number): Vec2[] => {
  if (amount <= 0) return [...points];
  const count = Math.max(1, points.length);
  const cx = points.reduce((sum, point) => sum + point.x, 0) / count;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / count;
  return points.map((point) => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: point.x + (dx / len) * amount, y: point.y + (dy / len) * amount };
  });
};

const primitivePolygon = (primitive: Primitive, grow: number): Vec2[] => {
  if (primitive.kind === 'circle') {
    return circlePolygon(primitive.center as Vec2, (primitive.radius ?? 0) + grow);
  }
  if (primitive.kind === 'capsule') {
    return capsulePolygon(primitive.a as Vec2, primitive.b as Vec2, (primitive.radius ?? 0) + grow);
  }
  return grow > 0 ? expandPolygon(primitive.points ?? [], grow) : [...(primitive.points ?? [])];
};

interface FrameBuffer {
  readonly width: number;
  readonly height: number;
  /** Premultiplied RGBA in [0, 1]. */
  readonly data: Float32Array;
}

const composite = (buffer: FrameBuffer, x: number, y: number, color: Rgba, alpha: number): void => {
  const index = (y * buffer.width + x) * 4;
  const srcAlpha = Math.max(0, Math.min(1, alpha * color.a));
  const dstAlpha = buffer.data[index + 3] ?? 0;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);
  buffer.data[index] = color.r * srcAlpha + (buffer.data[index] ?? 0) * (1 - srcAlpha);
  buffer.data[index + 1] = color.g * srcAlpha + (buffer.data[index + 1] ?? 0) * (1 - srcAlpha);
  buffer.data[index + 2] = color.b * srcAlpha + (buffer.data[index + 2] ?? 0) * (1 - srcAlpha);
  buffer.data[index + 3] = outAlpha;
};

const fillPolygon = (
  buffer: FrameBuffer,
  polygon: readonly Vec2[],
  color: Rgba,
  alpha: number,
): void => {
  if (polygon.length < 3) return;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of polygon) {
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const startRow = Math.max(0, Math.floor(minY));
  const endRow = Math.min(buffer.height - 1, Math.ceil(maxY));
  for (let y = startRow; y <= endRow; y += 1) {
    const scan = y + 0.5;
    const crossings: number[] = [];
    for (let index = 0; index < polygon.length; index += 1) {
      const a = polygon[index] as Vec2;
      const b = polygon[(index + 1) % polygon.length] as Vec2;
      const upward = a.y <= scan && b.y > scan;
      const downward = b.y <= scan && a.y > scan;
      if (upward) crossings.push(a.x + ((scan - a.y) / (b.y - a.y)) * (b.x - a.x));
      else if (downward) crossings.push(b.x + ((scan - b.y) / (a.y - b.y)) * (a.x - b.x));
    }
    crossings.sort((left, right) => left - right);
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      const from = Math.max(0, Math.ceil((crossings[index] as number) - 0.5));
      const to = Math.min(buffer.width - 1, Math.floor((crossings[index + 1] as number) - 0.5));
      for (let x = from; x <= to; x += 1) composite(buffer, x, y, color, alpha);
    }
  }
};

export interface RasterOptions {
  readonly scale?: number;
  readonly supersample?: number;
  readonly background?: string | null;
}

const createBuffer = (width: number, height: number, background: string | null): FrameBuffer => {
  const buffer: FrameBuffer = { width, height, data: new Float32Array(width * height * 4) };
  if (!background) return buffer;
  const color = parseColor(background);
  for (let index = 0; index < buffer.data.length; index += 4) {
    buffer.data[index] = color.r;
    buffer.data[index + 1] = color.g;
    buffer.data[index + 2] = color.b;
    buffer.data[index + 3] = 1;
  }
  return buffer;
};

const paintParts = (buffer: FrameBuffer, scene: RenderScene, factor: number): void => {
  const transform = (point: Vec2): Vec2 => ({ x: point.x * factor, y: point.y * factor });
  for (const part of scene.parts) {
    for (const primitive of part.primitives) {
      const alpha = primitive.alpha ?? 1;
      const outlineWidth = primitive.outlineWidth ?? 0;
      if (primitive.outline && outlineWidth > 0) {
        fillPolygon(
          buffer,
          primitivePolygon(primitive, outlineWidth * factor).map(transform),
          parseColor(primitive.outline),
          alpha,
        );
      }
      fillPolygon(
        buffer,
        primitivePolygon(primitive, 0).map(transform),
        parseColor(primitive.fill),
        alpha,
      );
    }
  }
};

const downsample = (
  buffer: FrameBuffer,
  width: number,
  height: number,
  supersample: number,
): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(width * height * 4);
  const samples = supersample * supersample;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const index = ((y * supersample + sy) * buffer.width + x * supersample + sx) * 4;
          r += buffer.data[index] ?? 0;
          g += buffer.data[index + 1] ?? 0;
          b += buffer.data[index + 2] ?? 0;
          a += buffer.data[index + 3] ?? 0;
        }
      }
      const alpha = a / samples;
      const out = (y * width + x) * 4;
      if (alpha > 1e-6) {
        data[out] = (r / samples / alpha) * 255;
        data[out + 1] = (g / samples / alpha) * 255;
        data[out + 2] = (b / samples / alpha) * 255;
      }
      data[out + 3] = Math.round(alpha * 255);
    }
  }
  return data;
};

/** Deterministic software painter shared by tests and offline render tools. */
export const renderSceneToRaster = (
  scene: RenderScene,
  options: RasterOptions = {},
): RasterImage => {
  const scale = options.scale ?? 1;
  const supersample = options.supersample ?? 2;
  const width = Math.max(1, Math.round(scene.width * scale));
  const height = Math.max(1, Math.round(scene.height * scale));
  const buffer = createBuffer(
    width * supersample,
    height * supersample,
    options.background ?? null,
  );
  paintParts(buffer, scene, scale * supersample);
  return { width, height, data: downsample(buffer, width, height, supersample) };
};

/** Alpha coverage of the scene, used by silhouette and export tests. */
export const renderSceneAlphaMask = (scene: RenderScene, scale = 1): Uint8Array => {
  const image = renderSceneToRaster(scene, { scale });
  const mask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = image.data[index * 4 + 3] ?? 0;
  }
  return mask;
};

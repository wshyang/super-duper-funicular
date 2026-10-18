import type { Raster, Vec2 } from '../../shared/types.ts';

/** Declared mutation exception: pixel buffers (CLAUDE-function-design.md). */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export function createRaster(width: number, height: number): Raster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function parseHex(color: string): Rgba {
  const hex = color.replace('#', '');
  const int = Number.parseInt(hex, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: 255 };
}

export function shade(color: string, factor: number): string {
  const c = parseHex(color);
  const ch = (v: number): string => Math.round(v * factor).toString(16).padStart(2, '0');
  return `#${ch(c.r)}${ch(c.g)}${ch(c.b)}`;
}

export function clear(raster: Raster, color: Rgba | null): void {
  raster.data.fill(0);
  if (!color) return;
  for (let i = 0; i < raster.data.length; i += 4) {
    raster.data[i] = color.r;
    raster.data[i + 1] = color.g;
    raster.data[i + 2] = color.b;
    raster.data[i + 3] = color.a;
  }
}

function blend(raster: Raster, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return;
  const i = (y * raster.width + x) * 4;
  const alpha = color.a / 255;
  raster.data[i] = color.r * alpha + (raster.data[i] ?? 0) * (1 - alpha);
  raster.data[i + 1] = color.g * alpha + (raster.data[i + 1] ?? 0) * (1 - alpha);
  raster.data[i + 2] = color.b * alpha + (raster.data[i + 2] ?? 0) * (1 - alpha);
  raster.data[i + 3] = Math.min(255, (raster.data[i + 3] ?? 0) + color.a);
}

/** Even-odd scanline polygon fill. */
export function fillPolygon(raster: Raster, points: readonly Vec2[], color: Rgba): void {
  const ys = points.map((p) => Math.round(p.y));
  const top = Math.max(0, Math.min(...ys));
  const bottom = Math.min(raster.height - 1, Math.max(...ys));
  for (let y = top; y <= bottom; y += 1) {
    for (const x of scanIntersections(points, y + 0.5)) blend(raster, Math.round(x), y, color);
  }
}

function scanIntersections(points: readonly Vec2[], y: number): number[] {
  const xs: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i] as Vec2;
    const b = points[(i + 1) % points.length] as Vec2;
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
      xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
  }
  xs.sort((p, q) => p - q);
  const spans: number[] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) {
    for (let x = Math.ceil(xs[i] as number); x <= Math.floor(xs[i + 1] as number); x += 1) spans.push(x);
  }
  return spans;
}

export function fillCircle(raster: Raster, center: Vec2, radius: number, color: Rgba): void {
  const top = Math.max(0, Math.floor(center.y - radius));
  const bottom = Math.min(raster.height - 1, Math.ceil(center.y + radius));
  for (let y = top; y <= bottom; y += 1) {
    const dy = y + 0.5 - center.y;
    const half = Math.sqrt(Math.max(0, radius * radius - dy * dy));
    for (let x = Math.ceil(center.x - half); x <= Math.floor(center.x + half); x += 1) {
      blend(raster, x, y, color);
    }
  }
}

export function fillCapsule(raster: Raster, a: Vec2, b: Vec2, radius: number, color: Rgba): void {
  const top = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius));
  const bottom = Math.min(raster.height - 1, Math.ceil(Math.max(a.y, b.y) + radius));
  const left = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius));
  const right = Math.min(raster.width - 1, Math.ceil(Math.max(a.x, b.x) + radius));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (distanceToSegment(x + 0.5, y + 0.5, a, b) <= radius) blend(raster, x, y, color);
    }
  }
}

function distanceToSegment(px: number, py: number, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

/** Silhouette mask (alpha > 0) used by the analysis suites. */
export function alphaMask(raster: Raster): Uint8Array {
  const mask = new Uint8Array(raster.width * raster.height);
  for (let i = 0; i < mask.length; i += 1) mask[i] = (raster.data[i * 4 + 3] ?? 0) > 0 ? 1 : 0;
  return mask;
}

export function countOpaque(raster: Raster): number {
  let n = 0;
  for (let i = 3; i < raster.data.length; i += 4) if ((raster.data[i] ?? 0) > 0) n += 1;
  return n;
}

import type { Raster, Vec2 } from '../../shared/types.ts';

export interface ComponentStats {
  readonly bounds: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly centroid: Vec2;
  readonly groundY: number;
  readonly pixels: number;
}

/** 4-connectivity largest opaque component: bounds, centroid, ground line. */
export function largestComponent(raster: Raster): ComponentStats {
  const seen = new Uint8Array(raster.width * raster.height);
  let best: number[] = [];
  for (let start = 0; start < seen.length; start += 1) {
    if (seen[start] || !opaque(raster, start)) continue;
    const component = flood(raster, seen, start);
    if (component.length > best.length) best = component;
  }
  return statsOf(best, raster.width);
}

function opaque(raster: Raster, index: number): boolean {
  return (raster.data[index * 4 + 3] ?? 0) > 0;
}

function flood(raster: Raster, seen: Uint8Array, start: number): number[] {
  const stack = [start];
  seen[start] = 1;
  const out: number[] = [];
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    out.push(index);
    const x = index % raster.width;
    const y = Math.floor(index / raster.width);
    push(raster, seen, stack, x + 1, y);
    push(raster, seen, stack, x - 1, y);
    push(raster, seen, stack, x, y + 1);
    push(raster, seen, stack, x, y - 1);
  }
  return out;
}

function push(raster: Raster, seen: Uint8Array, stack: number[], x: number, y: number): void {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return;
  const index = y * raster.width + x;
  if (seen[index] || !opaque(raster, index)) return;
  seen[index] = 1;
  stack.push(index);
}

function statsOf(component: readonly number[], width: number): ComponentStats {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  for (const index of component) {
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    sumX += x;
  }
  return {
    bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    centroid: { x: sumX / Math.max(1, component.length), y: 0 },
    groundY: maxY,
    pixels: component.length,
  };
}

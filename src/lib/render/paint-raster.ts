import type { PaintOp, Raster, RenderOptions } from '../../shared/types.ts';
import { clear, createRaster, fillCapsule, fillCircle, fillPolygon, parseHex, type Rgba } from './raster.ts';
import { transformOp, type Transform } from './paint-ops.ts';

const BACKGROUNDS: Record<RenderOptions['background'], Rgba | null> = {
  light: parseHex('#f5f5f5'),
  dark: parseHex('#141414'),
  transparent: null,
};

/** Paint transformed ops into a raster without touching the background. */
export function paintOps(raster: Raster, ops: readonly PaintOp[], t: Transform): void {
  for (const raw of ops) drawOp(raster, transformOp(raw, t));
}

/**
 * Paint one panel into a sheet at (x, y): the panel is rendered into a
 * temporary cell buffer (its own background) and blitted, so neighbouring
 * panels can never bleed or be cleared.
 */
export function paintCell(
  sheet: Raster,
  ops: readonly PaintOp[],
  background: RenderOptions['background'],
  t: Transform,
  cellWidth: number,
  cellHeight: number,
  x: number,
  y: number,
): void {
  const temp = createRaster(cellWidth, cellHeight);
  clear(temp, BACKGROUNDS[background]);
  paintOps(temp, ops, t);
  blit(temp, sheet, x, y);
}

function blit(source: Raster, target: Raster, x: number, y: number): void {
  for (let py = 0; py < source.height; py += 1) {
    for (let px = 0; px < source.width; px += 1) {
      const tx = x + px;
      const ty = y + py;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
      const si = (py * source.width + px) * 4;
      const alpha = (source.data[si + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const ti = (ty * target.width + tx) * 4;
      target.data[ti] = (source.data[si] ?? 0) * alpha + (target.data[ti] ?? 0) * (1 - alpha);
      target.data[ti + 1] = (source.data[si + 1] ?? 0) * alpha + (target.data[ti + 1] ?? 0) * (1 - alpha);
      target.data[ti + 2] = (source.data[si + 2] ?? 0) * alpha + (target.data[ti + 2] ?? 0) * (1 - alpha);
      target.data[ti + 3] = Math.min(255, (target.data[ti + 3] ?? 0) + (source.data[si + 3] ?? 0));
    }
  }
}

function drawOp(raster: Raster, op: PaintOp): void {
  const color = parseHex(op.color);
  switch (op.kind) {
    case 'capsule':
      fillCapsule(raster, op.a, op.b, op.radius, color);
      return;
    case 'circle':
      fillCircle(raster, op.center, op.radius, color);
      return;
    case 'polygon':
      fillPolygon(raster, op.points, color);
      return;
    case 'segment':
      fillCapsule(raster, op.a, op.b, op.width / 2, color);
      return;
  }
}

import type { PaintOp } from '../../shared/types.ts';
import { transformOp, type Transform } from '../../lib/render/paint-ops.ts';

const BACKGROUNDS: Record<'light' | 'dark' | 'transparent', string | null> = {
  light: '#f5f5f5',
  dark: '#141414',
  transparent: null,
};

/** Browser twin of the pure-TS raster painter (#nfr-two-painters). */
export function paintOpsToCanvas(
  ctx: CanvasRenderingContext2D,
  ops: readonly PaintOp[],
  transform: Transform,
  background: 'light' | 'dark' | 'transparent',
  rect: { width: number; height: number; x: number; y: number },
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  const color = BACKGROUNDS[background];
  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  } else {
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
  }
  ctx.translate(rect.x, rect.y);
  for (const raw of ops) drawOp(ctx, transformOp(raw, transform));
  ctx.restore();
}

function drawOp(ctx: CanvasRenderingContext2D, op: PaintOp): void {
  ctx.fillStyle = op.color;
  ctx.strokeStyle = op.color;
  switch (op.kind) {
    case 'capsule':
      ctx.lineWidth = op.radius * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(op.a.x, op.a.y);
      ctx.lineTo(op.b.x, op.b.y);
      ctx.stroke();
      return;
    case 'segment':
      ctx.lineWidth = op.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(op.a.x, op.a.y);
      ctx.lineTo(op.b.x, op.b.y);
      ctx.stroke();
      return;
    case 'circle':
      ctx.beginPath();
      ctx.arc(op.center.x, op.center.y, op.radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    case 'polygon':
      ctx.beginPath();
      op.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      return;
  }
}

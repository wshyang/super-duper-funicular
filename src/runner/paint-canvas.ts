import type { Primitive, RenderScene } from '../shared/types.ts';
import { darken, lighten } from './scene.ts';

const fillStyle = (
  ctx: CanvasRenderingContext2D,
  primitive: Primitive,
  scope: 'fill' | 'outline',
): string | CanvasGradient => {
  if (scope === 'outline') return primitive.outline ?? 'transparent';
  if (primitive.kind === 'capsule') {
    const gradient = ctx.createLinearGradient(
      primitive.a?.x ?? 0,
      primitive.a?.y ?? 0,
      primitive.b?.x ?? 0,
      primitive.b?.y ?? 0,
    );
    gradient.addColorStop(0, lighten(primitive.fill, 0.14));
    gradient.addColorStop(0.55, primitive.fill);
    gradient.addColorStop(1, darken(primitive.fill, 0.12));
    return gradient;
  }
  if (primitive.kind === 'circle') {
    const center = primitive.center ?? { x: 0, y: 0 };
    const radius = Math.max(1, primitive.radius ?? 1);
    const gradient = ctx.createRadialGradient(
      center.x - radius * 0.35,
      center.y - radius * 0.4,
      radius * 0.1,
      center.x,
      center.y,
      radius,
    );
    gradient.addColorStop(0, lighten(primitive.fill, 0.18));
    gradient.addColorStop(1, darken(primitive.fill, 0.08));
    return gradient;
  }
  const points = primitive.points ?? [];
  const ys = points.map((point) => point.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const gradient = ctx.createLinearGradient(0, minY, 0, Math.max(minY + 1, maxY));
  gradient.addColorStop(0, lighten(primitive.fill, 0.08));
  gradient.addColorStop(1, darken(primitive.fill, 0.1));
  return gradient;
};

const tracePath = (ctx: CanvasRenderingContext2D, primitive: Primitive, grow: number): void => {
  ctx.beginPath();
  if (primitive.kind === 'capsule') {
    const a = primitive.a ?? { x: 0, y: 0 };
    const b = primitive.b ?? a;
    const radius = (primitive.radius ?? 0) + grow;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.5, radius * 2);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    return;
  }
  if (primitive.kind === 'circle') {
    const center = primitive.center ?? { x: 0, y: 0 };
    ctx.arc(center.x, center.y, Math.max(0.5, (primitive.radius ?? 0) + grow), 0, Math.PI * 2);
    return;
  }
  const points = primitive.points ?? [];
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
};

const drawPrimitive = (ctx: CanvasRenderingContext2D, primitive: Primitive): void => {
  ctx.globalAlpha = primitive.alpha ?? 1;
  const strokeWidth = primitive.outlineWidth ?? 0;
  if (primitive.outline && strokeWidth > 0) {
    tracePath(ctx, primitive, strokeWidth);
    ctx.strokeStyle = primitive.outline;
    ctx.stroke();
  }
  tracePath(ctx, primitive, 0);
  ctx.fillStyle = fillStyle(ctx, primitive, 'fill');
  ctx.fill();
  if (primitive.kind === 'polygon' && primitive.outline && strokeWidth > 0) {
    ctx.strokeStyle = primitive.outline;
    ctx.lineWidth = strokeWidth * 2;
    ctx.stroke();
  }
};

export interface PaintOptions {
  readonly clear?: boolean;
  readonly alpha?: number;
}

/** Browser painter: same scene contract as the deterministic software painter. */
export const paintScene = (
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  scale = 1,
  options: PaintOptions = {},
): void => {
  ctx.save();
  if (options.clear !== false) ctx.clearRect(0, 0, scene.width * scale, scene.height * scale);
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  for (const part of scene.parts) {
    for (const primitive of part.primitives) {
      drawPrimitive(ctx, primitive);
    }
  }
  ctx.restore();
};

export const paintSkeleton = (
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  scale = 1,
): void => {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(94, 234, 212, 0.75)';
  scene.skeleton.forEach((line, index) => {
    ctx.beginPath();
    line.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.setLineDash(index === scene.skeleton.length - 1 ? [3, 4] : []);
    ctx.stroke();
  });
  for (const line of scene.skeleton.slice(0, 5)) {
    for (const point of line) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.1, 0, Math.PI * 2);
      ctx.fillStyle = '#5eead4';
      ctx.fill();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
};

export const cartoonGround = (
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  scale = 1,
): void => {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const gradient = ctx.createLinearGradient(0, scene.groundY - 2, 0, scene.height);
  gradient.addColorStop(0, 'rgba(94, 234, 212, 0.22)');
  gradient.addColorStop(1, 'rgba(94, 234, 212, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, scene.groundY - 1, scene.width, scene.height - scene.groundY + 1);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.fillRect(0, scene.groundY, scene.width, 1);
  ctx.restore();
};

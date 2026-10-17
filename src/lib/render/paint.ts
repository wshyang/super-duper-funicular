import type { Scene } from "./scene.ts";
import { sceneOutlineWidth } from "./scene.ts";
import type { Vec2 } from "../geometry/vec.ts";
import type { RunnerPose } from "../gait/pose.ts";
import { rgbCss, type Rgb } from "../rig/palette.ts";

/** The subset of the canvas 2-D API the painter needs. Both the browser and
 * @napi-rs/canvas (used for real render tests and previews) satisfy it. */
export interface PaintGradient {
  addColorStop(offset: number, colour: string): void;
}

export interface PaintContext {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineJoin: string;
  lineCap: string;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  arc(x: number, y: number, radius: number, start: number, end: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): PaintGradient;
}

export interface View {
  /** Pixels per body height. */
  readonly scale: number;
  /** Screen x of world x = 0. */
  readonly originX: number;
  /** Screen y of the ground plane. */
  readonly groundY: number;
}

export const worldToScreen = (point: Vec2, view: View): Vec2 => ({
  x: view.originX + point.x * view.scale,
  y: view.groundY - point.y * view.scale,
});

export interface PaintOptions {
  readonly drawOutline?: boolean;
}

/**
 * Two passes per part: an expanded outline pass, then the fills. The fills
 * cover the inner half of the outline, so a part made of many overlapping
 * shapes still shows one clean silhouette edge and no internal seams.
 */
export function paintScene(
  context: PaintContext,
  scene: Scene,
  view: View,
  options: PaintOptions = {},
): void {
  const drawOutline = options.drawOutline ?? true;
  const lineWidth = Math.max(1, sceneOutlineWidth() * 2 * view.scale);
  for (const group of scene.groups) {
    if (drawOutline && group.outline !== null) {
      context.strokeStyle = rgbCss(group.outline);
      context.lineWidth = lineWidth;
      context.lineJoin = "round";
      context.lineCap = "round";
      for (const shape of group.shapes) {
        tracePolygon(context, shape.points, view);
        context.stroke();
      }
    }
    for (const shape of group.shapes) {
      tracePolygon(context, shape.points, view);
      context.fillStyle = rgbCss(shape.fill);
      context.fill();
    }
  }
}

export function tracePolygon(context: PaintContext, points: readonly Vec2[], view: View): void {
  const first = points[0];
  if (first === undefined) return;
  const start = worldToScreen(first, view);
  context.beginPath();
  context.moveTo(start.x, start.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index] as Vec2;
    const screen = worldToScreen(point, view);
    context.lineTo(screen.x, screen.y);
  }
  context.closePath();
}

export function paintSkeleton(context: PaintContext, pose: RunnerPose, view: View): void {
  const bones: Array<readonly [Vec2, Vec2]> = [
    [pose.near.leg.hip, pose.near.leg.knee],
    [pose.near.leg.knee, pose.near.leg.ankle],
    [pose.far.leg.hip, pose.far.leg.knee],
    [pose.far.leg.knee, pose.far.leg.ankle],
    [pose.near.arm.shoulder, pose.near.arm.elbow],
    [pose.near.arm.elbow, pose.near.arm.wrist],
    [pose.far.arm.shoulder, pose.far.arm.elbow],
    [pose.far.arm.elbow, pose.far.arm.wrist],
    [pose.hip, pose.neckBase],
    [pose.neckBase, pose.headBase],
    [pose.headBase, pose.headCenter],
    [pose.near.leg.ankle, pose.near.leg.foot.ball],
    [pose.far.leg.ankle, pose.far.leg.foot.ball],
  ];
  const joints = [
    pose.near.leg.hip, pose.near.leg.knee, pose.near.leg.ankle,
    pose.far.leg.hip, pose.far.leg.knee, pose.far.leg.ankle,
    pose.near.arm.shoulder, pose.near.arm.elbow, pose.near.arm.wrist,
    pose.far.arm.shoulder, pose.far.arm.elbow, pose.far.arm.wrist,
    pose.hip, pose.neckBase, pose.headBase, pose.headCenter,
  ];
  context.save();
  context.lineWidth = 1.5;
  context.strokeStyle = "rgba(66, 240, 208, 0.75)";
  for (const [from, to] of bones) {
    const a = worldToScreen(from, view);
    const b = worldToScreen(to, view);
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }
  for (const joint of joints) {
    const screen = worldToScreen(joint, view);
    context.beginPath();
    context.arc(screen.x, screen.y, 3.2, 0, Math.PI * 2);
    context.fillStyle = "#42f0d0";
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = "#08231f";
    context.stroke();
  }
  context.restore();
}

export function paintPath(
  context: PaintContext,
  points: readonly Vec2[],
  view: View,
  stroke: string,
  width = 2,
): void {
  if (points.length < 2) return;
  context.save();
  context.strokeStyle = stroke;
  context.lineWidth = width;
  context.lineJoin = "round";
  context.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(point, view);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.stroke();
  context.restore();
}

export function paintShadow(context: PaintContext, pose: RunnerPose, view: View): void {
  const planted = [pose.near.leg, pose.far.leg].filter((leg) => leg.isStance);
  const feet = planted.length > 0 ? planted.map((leg) => leg.ankle) : [pose.near.leg.ankle, pose.far.leg.ankle];
  const averageX = feet.reduce((sum, point) => sum + point.x, 0) / feet.length;
  const center = worldToScreen({ x: averageX, y: 0 }, view);
  const radius = view.scale * 0.17;
  context.save();
  context.translate(center.x, center.y);
  context.scale(1, 0.26);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, "rgba(12, 15, 20, 0.45)");
  gradient.addColorStop(1, "rgba(12, 15, 20, 0)");
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.restore();
}

export function paintGround(
  context: PaintContext,
  view: View,
  width: number,
  colour = "rgba(255,255,255,0.14)",
): void {
  context.save();
  context.strokeStyle = colour;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, view.groundY);
  context.lineTo(width, view.groundY);
  context.stroke();
  context.restore();
}

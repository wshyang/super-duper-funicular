import type { ArticulatedPose } from "../gait/pose.ts";
import type { Palette } from "../rig/palette.ts";

export interface PaintOptions {
  readonly canvas: HTMLCanvasElement;
  readonly pose: ArticulatedPose;
  readonly palette: Palette;
  readonly scale: number;
  readonly groundY: number;
}

export function paintPose(options: PaintOptions): void {
  const ctx = options.canvas.getContext("2d");
  if (!ctx) return;
  const { pose, palette, scale, groundY } = options;
  ctx.clearRect(0, 0, options.canvas.width, options.canvas.height);
  ctx.fillStyle = "#1c2430";
  ctx.fillRect(0, 0, options.canvas.width, options.canvas.height);
  ctx.strokeStyle = "#3a4658";
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(options.canvas.width, groundY);
  ctx.stroke();
  const map = (x: number, y: number) => ({
    x: options.canvas.width / 2 + x * scale,
    y: groundY - y * scale,
  });
  const strokeLimb = (a: { x: number; y: number }, b: { x: number; y: number }, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  strokeLimb(map(pose.farHip.x, pose.farHip.y), map(pose.farKnee.x, pose.farKnee.y), palette.shorts, 10);
  strokeLimb(map(pose.farKnee.x, pose.farKnee.y), map(pose.farAnkle.x, pose.farAnkle.y), palette.skin, 8);
  strokeLimb(map(pose.farShoulder.x, pose.farShoulder.y), map(pose.farElbow.x, pose.farElbow.y), palette.jersey, 8);
  strokeLimb(map(pose.farElbow.x, pose.farElbow.y), map(pose.farWrist.x, pose.farWrist.y), palette.skin, 7);
  const pelvis = map(pose.pelvis.x, pose.pelvis.y);
  const neck = map(pose.neck.x, pose.neck.y);
  strokeLimb(pelvis, neck, palette.jersey, 16);
  strokeLimb(map(pose.nearHip.x, pose.nearHip.y), map(pose.nearKnee.x, pose.nearKnee.y), palette.shorts, 11);
  strokeLimb(map(pose.nearKnee.x, pose.nearKnee.y), map(pose.nearAnkle.x, pose.nearAnkle.y), palette.skin, 8);
  strokeLimb(map(pose.nearShoulder.x, pose.nearShoulder.y), map(pose.nearElbow.x, pose.nearElbow.y), palette.jersey, 8);
  strokeLimb(map(pose.nearElbow.x, pose.nearElbow.y), map(pose.nearWrist.x, pose.nearWrist.y), palette.skin, 7);
  const head = map(pose.head.x, pose.head.y);
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.hair;
  ctx.beginPath();
  ctx.arc(head.x - 4, head.y - 6, 12, Math.PI, Math.PI * 2);
  ctx.fill();
}

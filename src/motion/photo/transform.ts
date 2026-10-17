import type { Point } from "../gait";
export interface PartAnchors {
  start: number[];
  end: number[];
}
export type Matrix = [number, number, number, number, number, number];
export function getPartTransform(options: {
  part: PartAnchors;
  target: { start: Point; end: Point };
  width: number;
}): Matrix {
  const { part, target, width } = options;
  const sx = part.end[0] - part.start[0],
    sy = part.end[1] - part.start[1];
  const length = Math.hypot(sx, sy),
    ux = sx / length,
    uy = sy / length;
  const dx = target.end.x - target.start.x,
    dy = target.end.y - target.start.y;
  const a = (dx * ux + dy * width * uy) / length,
    b = (dy * ux - dx * width * uy) / length;
  const c = (dx * uy - dy * width * ux) / length,
    d = (dy * uy + dx * width * ux) / length;
  return [
    a,
    b,
    c,
    d,
    target.start.x - a * part.start[0] - c * part.start[1],
    target.start.y - b * part.start[0] - d * part.start[1],
  ];
}
export function applyTransform(matrix: Matrix, point: number[]): Point {
  return {
    x: matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    y: matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
  };
}

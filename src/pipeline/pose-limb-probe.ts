import type { BodyPartId, Point2D, RasterImage } from '../shared/types.js';
import type { SilhouetteMask } from './pose-material-types.js';

/**
 * Local limb probe.
 *
 * A limb is not just "a tube full of foreground": inside a torso a tube can be
 * full of foreground too. What distinguishes a limb is that its two long sides
 * fall on real appearance edges — silhouette boundary on the outside, and a
 * shading/fabric discontinuity against the far limb on the inside. Scoring the
 * gradient across the tube walls is therefore the discriminator that a pure
 * coverage score lacks, and it is what lets material be harvested from a plate
 * whose global pose differs from the prompt.
 */

export interface GradientField {
  readonly width: number;
  readonly height: number;
  readonly magnitude: Float32Array;
}

export interface TubeProbe {
  readonly start: Point2D;
  readonly end: Point2D;
  readonly halfWidth: number;
}

export interface TubeScore {
  readonly fill: number;
  readonly wallContrast: number;
  readonly widthAgreement: number;
  readonly score: number;
}

export function computeGradientField(image: RasterImage): GradientField {
  const { width, height } = image;
  const magnitude = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const value = (channel: number, dx: number, dy: number): number => {
        const index = ((y + dy) * width + (x + dx)) * 4 + channel;
        const alpha = image.data[index + 3] ?? 0;
        return alpha < 24 ? -1 : ((image.data[index] ?? 0) + (image.data[index + 1] ?? 0) + (image.data[index + 2] ?? 0)) / 3;
      };
      const gx = value(0, 1, 0) - value(0, -1, 0);
      const gy = value(0, 0, 1) - value(0, 0, -1);
      magnitude[y * width + x] = Math.abs(gx) + Math.abs(gy);
    }
  }
  return { width, height, magnitude };
}

export function sampleGradient(field: GradientField, point: Point2D): number {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < 0 || y < 0 || x >= field.width || y >= field.height) return 255;
  return field.magnitude[y * field.width + x] ?? 0;
}

function unit(a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function fillOf(mask: SilhouetteMask, tube: TubeProbe): number {
  const axis = unit(tube.start, tube.end);
  const normal = { x: -axis.y, y: axis.x };
  const length = Math.hypot(tube.end.x - tube.start.x, tube.end.y - tube.start.y);
  let inside = 0;
  let total = 0;
  for (let t = 0; t <= length; t += 4) {
    for (let o = -tube.halfWidth; o <= tube.halfWidth; o += 3) {
      const x = Math.round(tube.start.x + axis.x * t + normal.x * o);
      const y = Math.round(tube.start.y + axis.y * t + normal.y * o);
      if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) continue;
      total++;
      if (mask.data[y * mask.width + x] === 1) inside++;
    }
  }
  return total === 0 ? 0 : inside / total;
}

/**
 * Mean gradient measured just inside each wall of the tube. Interior fabric is
 * smooth, so a tube that has slid off the limb into the torso scores low here.
 */
function wallContrast(field: GradientField, mask: SilhouetteMask, tube: TubeProbe): number {
  const axis = unit(tube.start, tube.end);
  const normal = { x: -axis.y, y: axis.x };
  const length = Math.hypot(tube.end.x - tube.start.x, tube.end.y - tube.start.y);
  let total = 0;
  let count = 0;
  for (let t = length * 0.2; t <= length * 0.8; t += 4) {
    for (const side of [1, -1]) {
      const centre = {
        x: tube.start.x + axis.x * t + normal.x * tube.halfWidth * side,
        y: tube.start.y + axis.y * t + normal.y * tube.halfWidth * side,
      };
      const onEdge = isBoundary(mask, centre);
      const contrast = Math.max(
        sampleGradient(field, { x: centre.x + normal.x * side, y: centre.y + normal.y * side }),
        sampleGradient(field, { x: centre.x - normal.x * side, y: centre.y - normal.y * side }),
        sampleGradient(field, centre),
      );
      total += Math.max(contrast, onEdge ? 90 : 0);
      count++;
    }
  }
  return count === 0 ? 0 : Math.min(1, total / count / 90);
}

function isBoundary(mask: SilhouetteMask, point: Point2D): boolean {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < 1 || y < 1 || x >= mask.width - 1 || y >= mask.height - 1) return true;
  const here = mask.data[y * mask.width + x] === 1;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const there = mask.data[(y + dy) * mask.width + (x + dx)] === 1;
    if (here !== there) return true;
  }
  return false;
}

function measureWidth(mask: SilhouetteMask, tube: TubeProbe): number {
  const axis = unit(tube.start, tube.end);
  const normal = { x: -axis.y, y: axis.x };
  const length = Math.hypot(tube.end.x - tube.start.x, tube.end.y - tube.start.y);
  const limit = Math.max(8, tube.halfWidth * 2.6);
  const widths: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = length * (0.2 + 0.1 * i);
    const centre = { x: tube.start.x + axis.x * t, y: tube.start.y + axis.y * t };
    if (sampleMask(mask, centre) !== 1) continue;
    widths.push(Math.min(scan(mask, centre, normal, limit), scan(mask, centre, { x: -normal.x, y: -normal.y }, limit)));
  }
  if (widths.length === 0) return 0;
  widths.sort((a, b) => a - b);
  return widths[Math.floor(widths.length / 2)] ?? 0;
}

function sampleMask(mask: SilhouetteMask, point: Point2D): number {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return 0;
  return mask.data[y * mask.width + x] ?? 0;
}

function scan(mask: SilhouetteMask, centre: Point2D, direction: Point2D, limit: number): number {
  let last = 0;
  for (let d = 1; d <= limit; d++) {
    if (sampleMask(mask, { x: centre.x + direction.x * d, y: centre.y + direction.y * d }) !== 1) break;
    last = d;
  }
  return last;
}

export function scoreTube(
  mask: SilhouetteMask,
  field: GradientField,
  tube: TubeProbe,
  expectedHalfWidth: number,
): TubeScore {
  const fill = fillOf(mask, tube);
  const contrast = wallContrast(field, mask, tube);
  const measured = measureWidth(mask, tube);
  const widthAgreement = expectedHalfWidth <= 0
    ? 0
    : Math.max(0, 1 - Math.abs(measured - expectedHalfWidth) / expectedHalfWidth);
  return {
    fill,
    wallContrast: contrast,
    widthAgreement,
    score: fill * 1.0 + contrast * 1.1 + widthAgreement * 0.5,
  };
}

export interface ProbeSearchResult extends TubeScore {
  readonly tube: TubeProbe;
  readonly angleRad: number;
  readonly angleDeltaRad: number;
}

export interface ProbeSearchOptions {
  readonly angleRangeDeg?: number;
  readonly angleStepDeg?: number;
  readonly rootJitterPx?: number;
  readonly rootJitterStepPx?: number;
  readonly tipRangePx?: number;
  readonly tipStepPx?: number;
}

/**
 * Searches for the tube that best explains a limb around the predicted bone.
 * The proximal joint may only jitter slightly (joints do not detach), while the
 * distal end is free to swing and to shorten, because a plate's limb may be at a
 * different flexion than the solved pose.
 */
export function searchLimbTube(
  mask: SilhouetteMask,
  field: GradientField,
  root: Point2D,
  tip: Point2D,
  expectedHalfWidth: number,
  options: ProbeSearchOptions = {},
): ProbeSearchResult {
  const angleRange = ((options.angleRangeDeg ?? 55) * Math.PI) / 180;
  const angleStep = ((options.angleStepDeg ?? 5) * Math.PI) / 180;
  const jitter = options.rootJitterPx ?? 4;
  const jitterStep = options.rootJitterStepPx ?? 4;
  const tipRange = options.tipRangePx ?? 0.14;
  const tipStep = options.tipStepPx ?? 0.07;
  const baseLength = Math.hypot(tip.x - root.x, tip.y - root.y) || 1;
  const baseAngle = Math.atan2(tip.y - root.y, tip.x - root.x);
  let best: ProbeSearchResult | null = null;
  for (let a = -angleRange; a <= angleRange + 1e-6; a += angleStep) {
    for (let scale = 1 - tipRange; scale <= 1 + tipRange + 1e-6; scale += tipStep) {
      for (let ox = -jitter; ox <= jitter; ox += jitterStep) {
        for (let oy = -jitter; oy <= jitter; oy += jitterStep) {
          const angle = baseAngle + a;
          const length = baseLength * scale;
          const tube: TubeProbe = {
            start: { x: root.x + ox, y: root.y + oy },
            end: { x: root.x + ox + Math.cos(angle) * length, y: root.y + oy + Math.sin(angle) * length },
            halfWidth: expectedHalfWidth,
          };
          const scored = scoreTube(mask, field, tube, expectedHalfWidth);
          if (!best || scored.score > best.score) {
            best = { tube, angleRad: angle, angleDeltaRad: a, ...scored };
          }
        }
      }
    }
  }
  if (!best) {
    return {
      tube: { start: root, end: tip, halfWidth: expectedHalfWidth },
      angleRad: baseAngle,
      angleDeltaRad: 0,
      fill: 0,
      wallContrast: 0,
      widthAgreement: 0,
      score: 0,
    };
  }
  return best;
}

export function partOfChain(partId: BodyPartId): 'upper' | 'lower' | 'distal' {
  if (partId.includes('UpperArm') || partId.includes('Thigh')) return 'upper';
  if (partId.includes('Forearm') || partId.includes('Shin')) return 'lower';
  return 'distal';
}

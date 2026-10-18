import { clamp, distanceToSegment } from '../core/geometry.js';
import type { Capsule, Point2D } from '../core/types.js';

/**
 * Signed distance to a tapered capsule: negative inside, positive outside.
 * The radius is interpolated along the *projection* parameter, so the shape is
 * a true capsule sweep with round caps at both ends.
 */
export function capsuleDistance(point: Point2D, capsule: Capsule): number {
  const { a, b } = capsule;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return Math.hypot(point.x - a.x, point.y - a.y) - capsule.radiusStart;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
  const radius = capsule.radiusStart + (capsule.radiusEnd - capsule.radiusStart) * t;
  return distanceToSegment(point, a, b) - radius;
}

/** Minimum signed distance over a group of capsules — the union's distance field. */
export function unionDistance(point: Point2D, capsules: readonly Capsule[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const capsule of capsules) {
    const d = capsuleDistance(point, capsule);
    if (d < best) best = d;
  }
  return best;
}

/** Anti-aliased coverage from a signed distance; `feather` is the edge width in pixels. */
export function coverageAlpha(signedDistance: number, feather = 0.9): number {
  return clamp(0.5 - signedDistance / (2 * feather), 0, 1);
}

/** Capsule bounding box, padded by the maximum radius. */
export function capsuleBounds(capsules: readonly Capsule[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const capsule of capsules) {
    const pad = Math.max(capsule.radiusStart, capsule.radiusEnd) + 2;
    minX = Math.min(minX, capsule.a.x - pad, capsule.b.x - pad);
    minY = Math.min(minY, capsule.a.y - pad, capsule.b.y - pad);
    maxX = Math.max(maxX, capsule.a.x + pad, capsule.b.x + pad);
    maxY = Math.max(maxY, capsule.a.y + pad, capsule.b.y + pad);
  }
  return { minX, minY, maxX, maxY };
}

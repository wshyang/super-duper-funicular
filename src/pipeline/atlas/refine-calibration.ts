import type { CalibrationPose, Point2D, Rgba } from '../../shared/atlas-types.js';
import { isSubjectPixel, readRgba } from './image-io.js';

/**
 * Stage 2.5 deterministic calibration refinement (PIPE-REV P-R3): agent/human
 * landmark estimates are snapped to the limb centreline on the plate by
 * run-based slice centroids + least-squares axis refit. Removes eyeball error
 * without any stochastic step. Provenance: refinedFrom = v1 estimate.
 */
export function refineBone(plate: Rgba, p: Point2D, q: Point2D, pad: number): [Point2D, Point2D] {
  let a = p;
  let b = q;
  for (let iter = 0; iter < 3; iter++) {
    const cloud = sliceCentroids(plate, a, b, pad);
    if (cloud.length < 4) break;
    const fitted = fitAxis(cloud, a, b);
    a = fitted[0];
    b = fitted[1];
  }
  return [a, b];
}

function sliceCentroids(plate: Rgba, a: Point2D, b: Point2D, pad: number): Point2D[] {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const len = Math.hypot(ux, uy) || 1;
  const nx = -uy / len;
  const ny = ux / len;
  const slices = 12;
  const cloud: Point2D[] = [];
  for (let s = 1; s < slices; s++) {
    const t = s / slices;
    const cx = a.x + ux * t;
    const cy = a.y + uy * t;
    const run = centreRun(plate, cx, cy, nx, ny, pad);
    if (run) cloud.push(run);
  }
  return cloud;
}

/** Centroid of the subject run along the slice line that contains the slice centre. */
function centreRun(plate: Rgba, cx: number, cy: number, nx: number, ny: number, pad: number): Point2D | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  let inRun = false;
  let runHit = false;
  for (let o = -pad; o <= pad; o++) {
    const x = Math.round(cx + nx * o);
    const y = Math.round(cy + ny * o);
    const subject = x >= 0 && y >= 0 && x < plate.width && y < plate.height && isSubjectPixel(readRgba(plate, x, y));
    if (subject && !inRun && o > 0 && !runHit) {
      // start of the first run after centre: only accept the run containing centre
    }
    if (subject) {
      if (!inRun && count === 0 && o < -1) {
        // run started before centre: reset accumulator so only centre run counts
        sumX = 0;
        sumY = 0;
        count = 0;
      }
      inRun = true;
      sumX += x;
      sumY += y;
      count++;
      if (o >= 0) runHit = true;
    } else if (inRun && runHit) {
      break;
    } else {
      inRun = false;
      if (o >= 0 && runHit) break;
      sumX = 0;
      sumY = 0;
      count = 0;
    }
  }
  if (count < 3 || !runHit) return null;
  return { x: sumX / count, y: sumY / count };
}

function fitAxis(cloud: readonly Point2D[], a: Point2D, b: Point2D): [Point2D, Point2D] {
  const mx = cloud.reduce((s, p) => s + p.x, 0) / cloud.length;
  const my = cloud.reduce((s, p) => s + p.y, 0) / cloud.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of cloud) {
    sxx += (p.x - mx) * (p.x - mx);
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) * (p.y - my);
  }
  const dir = principalDirection(sxx, sxy, syy);
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const p of cloud) {
    const t = (p.x - mx) * dir.x + (p.y - my) * dir.y;
    tMin = Math.min(tMin, t);
    tMax = Math.max(tMax, t);
  }
  const pa: Point2D = { x: mx + dir.x * tMin, y: my + dir.y * tMin };
  const pb: Point2D = { x: mx + dir.x * tMax, y: my + dir.y * tMax };
  const flip = (pb.x - pa.x) * (b.x - a.x) + (pb.y - pa.y) * (b.y - a.y) < 0;
  return flip ? [pb, pa] : [pa, pb];
}

function principalDirection(sxx: number, sxy: number, syy: number): Point2D {
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const l1 = trace / 2 + Math.sqrt(Math.max(0, (trace * trace) / 4 - det));
  let dx = sxy !== 0 ? l1 - syy : 1;
  let dy = sxy !== 0 ? sxy : 0;
  if (dx === 0 && dy === 0) {
    dx = 1;
    dy = 0;
  }
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function refinePose(plate: Rgba, pose: CalibrationPose, bones: readonly [string, string][]): CalibrationPose {
  const landmarks: Record<string, readonly number[]> = { ...pose.landmarks };
  for (const [ai, bi] of bones) {
    const la = landmarks[ai];
    const lb = landmarks[bi];
    if (!la || !lb) continue;
    const len = Math.hypot(la[0] - lb[0], la[1] - lb[1]);
    if (len < 24) continue;
    const [ra, rb] = refineBone(plate, { x: la[0], y: la[1] }, { x: lb[0], y: lb[1] }, Math.min(46, 14 + len * 0.16));
    // NOTE: trust-region rejection was tried and REJECTED (TURN-L06): it also
    // discards good snaps. Outcome-based bone selection (extraction keptRatio)
    // is the designed replacement - Sprint 1 follow-up `#feat-calib-select`.
    landmarks[ai] = [Math.round(ra.x), Math.round(ra.y)];
    landmarks[bi] = [Math.round(rb.x), Math.round(rb.y)];
  }
  return { ...pose, landmarks, placedBy: `${pose.placedBy} | refinedBy: run-based slice regression v1` };
}

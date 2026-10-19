import type { BodyPartId, Point2D } from '../shared/types.js';
import type {
  CapsuleSpec,
  LimbFit,
  PartEligibility,
  PoseTargetGeometry,
  Registration,
  SilhouetteMask,
  VisibilityScore,
} from './pose-material-types.js';
import {
  isMaskForeground,
  projectPointToImage,
  sampleCapsuleInterior,
} from './pose-silhouette.js';

export interface PartFitOptions {
  readonly angleSearchDeg?: number;
  readonly angleStepDeg?: number;
  readonly offsetSearchPx?: number;
  readonly stationCount?: number;
}

const DEFAULT_OPTIONS: Required<PartFitOptions> = {
  angleSearchDeg: 25,
  angleStepDeg: 2.5,
  offsetSearchPx: 5,
  stationCount: 9,
};

/** Weight on the prior: a fit must explain the pixels well enough to justify
 * moving away from the solved bone. Without it the fitter slides onto whichever
 * neighbouring limb happens to be more filled. */
const DEVIATION_PENALTY = 0.9;
const WIDTH_AGREEMENT_WEIGHT = 0.45;

function rotate(point: Point2D, origin: Point2D, angleRad: number): Point2D {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return { x: origin.x + dx * cos - dy * sin, y: origin.y + dx * sin + dy * cos };
}

function normalize(vector: Point2D): Point2D {
  const length = Math.hypot(vector.x, vector.y);
  return length < 1e-6 ? { x: 0, y: 0 } : { x: vector.x / length, y: vector.y / length };
}

function perpendicular(axis: Point2D): Point2D {
  return { x: -axis.y, y: axis.x };
}

/**
 * The proximal joint is pinned: hips, knees, shoulders and elbows are the
 * anchors the rig itself uses, and a limb cannot detach from its joint. Only the
 * distal direction and length may move, which keeps a search from drifting onto
 * a neighbouring limb.
 */
function boneCandidate(
  proximal: Point2D,
  distal: Point2D,
  deltaRad: number,
  lengthScale: number,
  jitter: Point2D,
): { start: Point2D; end: Point2D; angleRad: number } {
  const start = { x: proximal.x + jitter.x, y: proximal.y + jitter.y };
  const rotated = rotate(distal, proximal, deltaRad);
  const end = {
    x: start.x + (rotated.x - proximal.x) * lengthScale,
    y: start.y + (rotated.y - proximal.y) * lengthScale,
  };
  return { start, end, angleRad: Math.atan2(end.y - start.y, end.x - start.x) };
}

function coverageOf(mask: SilhouetteMask, capsule: CapsuleSpec): number {
  const samples = sampleCapsuleInterior(capsule, 5);
  if (samples.length === 0) return 0;
  let hits = 0;
  for (const point of samples) if (isMaskForeground(mask, point)) hits++;
  return hits / samples.length;
}

/**
 * Median half-width measured by walking outward from the bone axis until the
 * silhouette ends. This is the physical definition of "how thick is the limb
 * here", so it disagrees with the predicted width when the bone has left its
 * limb.
 */
export function measureHalfWidth(
  mask: SilhouetteMask,
  start: Point2D,
  end: Point2D,
  expectedHalfWidth: number,
  stationCount: number,
): number {
  const axis = normalize({ x: end.x - start.x, y: end.y - start.y });
  const normal = perpendicular(axis);
  const limit = Math.max(10, expectedHalfWidth * 2.6);
  const widths: number[] = [];
  for (let i = 0; i < stationCount; i++) {
    const t = 0.2 + (0.6 * i) / Math.max(1, stationCount - 1);
    const center = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
    if (!isMaskForeground(mask, center)) continue;
    const left = scanEdge(mask, center, normal, limit);
    const right = scanEdge(mask, center, { x: -normal.x, y: -normal.y }, limit);
    widths.push(Math.min(left, right));
  }
  if (widths.length === 0) return 0;
  widths.sort((a, b) => a - b);
  return widths[Math.floor(widths.length / 2)] ?? expectedHalfWidth;
}

function scanEdge(
  mask: SilhouetteMask,
  center: Point2D,
  direction: Point2D,
  limit: number,
): number {
  let last = 0;
  for (let d = 1; d <= limit; d++) {
    if (!isMaskForeground(mask, { x: center.x + direction.x * d, y: center.y + direction.y * d })) break;
    last = d;
  }
  return last;
}

export function measureIsolation(
  mask: SilhouetteMask,
  start: Point2D,
  end: Point2D,
  halfWidth: number,
  stationCount: number,
): number {
  const axis = normalize({ x: end.x - start.x, y: end.y - start.y });
  const normal = perpendicular(axis);
  let isolated = 0;
  let stations = 0;
  for (let i = 0; i < stationCount; i++) {
    const t = 0.2 + (0.6 * i) / Math.max(1, stationCount - 1);
    const center = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
    const left = sideBackground(mask, center, normal, halfWidth);
    const right = sideBackground(mask, center, { x: -normal.x, y: -normal.y }, halfWidth);
    stations++;
    if (Math.max(left, right) >= 0.66) isolated++;
  }
  return stations === 0 ? 0 : isolated / stations;
}

function sideBackground(
  mask: SilhouetteMask,
  center: Point2D,
  direction: Point2D,
  halfWidth: number,
): number {
  const factors = [1.15, 1.35, 1.55];
  let background = 0;
  for (const factor of factors) {
    const point = {
      x: center.x + direction.x * Math.max(2, halfWidth) * factor,
      y: center.y + direction.y * Math.max(2, halfWidth) * factor,
    };
    if (!isMaskForeground(mask, point)) background++;
  }
  return background / factors.length;
}

function visibilityFrom(coverage: number, isolation: number, widthAgreement: number): VisibilityScore {
  if (coverage >= 0.9 && isolation >= 0.5 && widthAgreement >= 0.6) return 3;
  if (coverage >= 0.75 && isolation >= 0.25 && widthAgreement >= 0.35) return 2;
  if (coverage >= 0.4) return 1;
  return 0;
}

interface SearchResult {
  readonly deltaRad: number;
  readonly lengthScale: number;
  readonly jitter: Point2D;
  readonly start: Point2D;
  readonly end: Point2D;
  readonly angleRad: number;
  readonly coverage: number;
  readonly halfWidth: number;
  readonly widthAgreement: number;
  readonly score: number;
}

function scoreCandidate(
  mask: SilhouetteMask,
  bone: { start: Point2D; end: Point2D; angleRad: number },
  expectedHalfWidth: number,
  deltaRad: number,
  stationCount: number,
): { coverage: number; halfWidth: number; widthAgreement: number; score: number } {
  const coverage = coverageOf(mask, { partId: 'torso', ...bone, halfWidth: expectedHalfWidth });
  const halfWidth = measureHalfWidth(mask, bone.start, bone.end, expectedHalfWidth, stationCount);
  const widthAgreement = expectedHalfWidth <= 0
    ? 0
    : Math.max(0, 1 - Math.abs(halfWidth - expectedHalfWidth) / expectedHalfWidth);
  const deviation = Math.abs(deltaRad) / ((10 * Math.PI) / 180);
  const score =
    coverage + WIDTH_AGREEMENT_WEIGHT * widthAgreement - DEVIATION_PENALTY * Math.min(1, deviation);
  return { coverage, halfWidth, widthAgreement, score };
}

function searchBone(
  mask: SilhouetteMask,
  proximal: Point2D,
  distal: Point2D,
  expectedHalfWidth: number,
  options: Required<PartFitOptions>,
): SearchResult {
  const maxAngle = (options.angleSearchDeg * Math.PI) / 180;
  const angleStep = (options.angleStepDeg * Math.PI) / 180;
  let best: SearchResult | null = null;
  for (let angle = -maxAngle; angle <= maxAngle + 1e-6; angle += angleStep) {
    for (const lengthScale of [0.94, 1, 1.06]) {
      for (let ox = -options.offsetSearchPx; ox <= options.offsetSearchPx; ox += options.offsetSearchPx) {
        for (let oy = -options.offsetSearchPx; oy <= options.offsetSearchPx; oy += options.offsetSearchPx) {
          const jitter = { x: ox, y: oy };
          const bone = boneCandidate(proximal, distal, angle, lengthScale, jitter);
          const scored = scoreCandidate(mask, bone, expectedHalfWidth, angle, options.stationCount);
          if (!best || scored.score > best.score) {
            best = { ...bone, deltaRad: angle, lengthScale, jitter, ...scored };
          }
        }
      }
    }
  }
  if (!best) {
    return {
      deltaRad: 0, lengthScale: 1, jitter: { x: 0, y: 0 },
      start: proximal, end: distal, angleRad: 0,
      coverage: 0, halfWidth: 0, widthAgreement: 0, score: 0,
    };
  }
  return best;
}

function missingFit(partId: BodyPartId): LimbFit {
  return {
    partId,
    found: false,
    angleRad: 0,
    targetAngleRad: 0,
    angleErrorRad: 0,
    deviationRad: 0,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    halfWidthPx: 0,
    coverage: 0,
    isolation: 0,
    widthAgreement: 0,
    visibility: 0,
  };
}

function angleDifference(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function fitPartInSource(
  mask: SilhouetteMask,
  registration: Registration,
  target: PoseTargetGeometry,
  partId: BodyPartId,
  options: PartFitOptions = {},
): LimbFit {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const primary = target.parts.find((entry) => entry.partId === partId);
  if (!primary) return missingFit(partId);
  const proximal = projectPointToImage(primary.capsule.start, registration);
  const distal = projectPointToImage(primary.capsule.end, registration);
  const expectedHalfWidth = Math.max(2, primary.capsule.halfWidth * registration.scale);
  const best = searchBone(mask, proximal, distal, expectedHalfWidth, resolved);
  const isolation = measureIsolation(mask, best.start, best.end, best.halfWidth || expectedHalfWidth, resolved.stationCount);
  const targetAngle = Math.atan2(distal.y - proximal.y, distal.x - proximal.x);
  return {
    partId,
    found: best.coverage >= 0.4,
    angleRad: best.angleRad,
    targetAngleRad: targetAngle,
    angleErrorRad: angleDifference(best.angleRad, targetAngle),
    deviationRad: best.deltaRad,
    start: best.start,
    end: best.end,
    halfWidthPx: best.halfWidth,
    coverage: best.coverage,
    isolation,
    widthAgreement: best.widthAgreement,
    visibility: visibilityFrom(best.coverage, isolation, best.widthAgreement),
  };
}

export function bucketOfAngle(angleRad: number): number {
  const degrees = (angleRad * 180) / Math.PI;
  const normalized = (((degrees + 180) % 360) + 360) % 360 - 180;
  return Math.round(normalized / 15) * 15;
}

export function sideOfPart(partId: BodyPartId): PartEligibility['side'] {
  if (partId.startsWith('near')) return 'near';
  if (partId.startsWith('far')) return 'far';
  return 'midline';
}

export function eligibilityReasonCodes(fit: LimbFit): string[] {
  const codes: string[] = [];
  if (!fit.found) return ['part-not-visible'];
  if (fit.coverage < 0.75) codes.push('low-coverage');
  if (fit.isolation < 0.25) codes.push('merged-with-neighbour');
  if (fit.widthAgreement < 0.35) codes.push('width-mismatch');
  if (Math.abs(fit.deviationRad) > (40 * Math.PI) / 180) codes.push('angle-unresolved');
  return codes;
}

export function evaluatePart(
  mask: SilhouetteMask,
  registration: Registration,
  target: PoseTargetGeometry,
  partId: BodyPartId,
  options: PartFitOptions = {},
): PartEligibility {
  const fit = fitPartInSource(mask, registration, target, partId, options);
  const reasonCodes = eligibilityReasonCodes(fit);
  return {
    partId,
    side: sideOfPart(partId),
    fit,
    eligible: reasonCodes.length === 0,
    reasonCodes,
    bucketDeg: fit.found ? bucketOfAngle(fit.angleRad) : null,
  };
}

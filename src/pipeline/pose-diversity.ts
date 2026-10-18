import type { ArticulatedPose, LimbKinematics, Point2D } from '../shared/types.js';

/**
 * Pose-observation annotations and quantitative diversity/compliance checks
 * implementing SC-AC-02 (pose-geometry compliance) and SC-AC-03 (pose
 * diversity) from `docs/SPRITE_CAPTURE_ACCEPTANCE_CRITERIA.md`.
 *
 * Angle conventions (screen space, +x faces right/foward, +y faces down):
 * - `*KneeDeg` / `*ElbowDeg`: interior joint flexion in degrees; 180 = straight.
 * - `*ThighSwingDeg` / `*ShoulderSwingDeg`: proximal segment vs straight-down
 *   vertical; 0 = hanging straight down, positive = swung forward (toward +x),
 *   negative = swung rearward (toward -x).
 */

export type FootState = 'contact' | 'airborne';

export type ArmQuadrant = 'forward-up' | 'forward-down' | 'rear-up' | 'rear-down';

export interface PoseObservation {
  readonly nearKneeDeg: number;
  readonly farKneeDeg: number;
  readonly nearThighSwingDeg: number;
  readonly farThighSwingDeg: number;
  readonly nearElbowDeg: number;
  readonly farElbowDeg: number;
  readonly nearShoulderSwingDeg: number;
  readonly farShoulderSwingDeg: number;
  readonly nearFootState: FootState;
  readonly farFootState: FootState;
  readonly torsoLeanDeg?: number;
}

export interface PoseAnnotation extends PoseObservation {
  readonly candidateId: string;
  readonly candidatePath?: string;
  readonly candidateSha256?: string;
  readonly frameKey?: string;
  readonly annotatedBy: string;
  readonly annotatedAt: string;
  /** How the angles were obtained. Only `by-eye` exists until an estimator lands. */
  readonly confidence: 'by-eye' | 'measured';
  readonly notes?: string;
}

export const MAJOR_JOINT_KEYS = [
  'nearKneeDeg',
  'farKneeDeg',
  'nearThighSwingDeg',
  'farThighSwingDeg',
  'nearElbowDeg',
  'farElbowDeg',
  'nearShoulderSwingDeg',
  'farShoulderSwingDeg',
] as const;

export type MajorJointKey = (typeof MAJOR_JOINT_KEYS)[number];

export const SC_AC_03_MIN_JOINT_DELTA_DEG = 25;
export const SC_AC_02_MAJOR_TOLERANCE_DEG = 20;

function angleBetween(a: Point2D, vertex: Point2D, b: Point2D): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag <= 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

function swingFromVertical(origin: Point2D, end: Point2D): number {
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  if (Math.hypot(dx, dy) <= 0) return 0;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

export function armQuadrant(shoulder: Point2D, wrist: Point2D): ArmQuadrant {
  const forward = wrist.x >= shoulder.x;
  const up = wrist.y < shoulder.y;
  if (forward && up) return 'forward-up';
  if (forward) return 'forward-down';
  if (up) return 'rear-up';
  return 'rear-down';
}

function limbAngles(limb: LimbKinematics): { interiorDeg: number; swingDeg: number } {
  return {
    interiorDeg: angleBetween(limb.hipOrShoulder, limb.midJoint, limb.endEffector),
    swingDeg: swingFromVertical(limb.hipOrShoulder, limb.midJoint),
  };
}

/** Derive the SC-AC-02 target observation from a solved rig pose (the guide). */
export function observationFromSolvedPose(pose: ArticulatedPose): PoseObservation {
  const nearLeg = limbAngles(pose.nearLeg);
  const farLeg = limbAngles(pose.farLeg);
  const nearArm = limbAngles(pose.nearArm);
  const farArm = limbAngles(pose.farArm);
  return {
    nearKneeDeg: round1(nearLeg.interiorDeg),
    farKneeDeg: round1(farLeg.interiorDeg),
    nearThighSwingDeg: round1(nearLeg.swingDeg),
    farThighSwingDeg: round1(farLeg.swingDeg),
    nearElbowDeg: round1(nearArm.interiorDeg),
    farElbowDeg: round1(farArm.interiorDeg),
    nearShoulderSwingDeg: round1(nearArm.swingDeg),
    farShoulderSwingDeg: round1(farArm.swingDeg),
    nearFootState: pose.nearLeg.isGrounded ? 'contact' : 'airborne',
    farFootState: pose.farLeg.isGrounded ? 'contact' : 'airborne',
    torsoLeanDeg: round1((pose.torsoAngleRad * 180) / Math.PI),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface PoseDistance {
  readonly maxJointDeltaDeg: number;
  readonly differingJoints: readonly { joint: MajorJointKey; deltaDeg: number }[];
  readonly contactStateChanged: boolean;
  readonly armQuadrantChanged: boolean;
  readonly nearQuadrantA: ArmQuadrant;
  readonly nearQuadrantB: ArmQuadrant;
  readonly farQuadrantA: ArmQuadrant;
  readonly farQuadrantB: ArmQuadrant;
}

function quadrantOf(shoulderSwingDeg: number, elbowDeg: number): ArmQuadrant {
  // Raised arms (|swing| > 100°): the elbow sits above shoulder height and the
  // wrist stays on the same side (all bank inserts). Otherwise reconstruct the
  // wrist carry: elbow flexion rotates the wrist forward of the upper-arm line.
  if (Math.abs(shoulderSwingDeg) > 100) {
    return shoulderSwingDeg > 0 ? 'forward-up' : 'rear-up';
  }
  const wristSwing = Math.max(-150, Math.min(150, shoulderSwingDeg + (180 - elbowDeg) * 0.75));
  const forward = wristSwing > 5;
  const up = Math.abs(wristSwing) > 80;
  if (forward && up) return 'forward-up';
  if (forward) return 'forward-down';
  if (up) return 'rear-up';
  return 'rear-down';
}

/** Pairwise pose distance between two observations (SC-AC-03 input). */
export function poseAngularDistance(a: PoseObservation, b: PoseObservation): PoseDistance {
  const differingJoints = MAJOR_JOINT_KEYS.map((joint) => ({
    joint,
    deltaDeg: round1(Math.abs(a[joint] - b[joint])),
  })).sort((x, y) => y.deltaDeg - x.deltaDeg);
  const maxJointDeltaDeg = differingJoints[0]?.deltaDeg ?? 0;
  const contactStateChanged = a.nearFootState !== b.nearFootState || a.farFootState !== b.farFootState;
  const nearQuadrantA = quadrantOf(a.nearShoulderSwingDeg, a.nearElbowDeg);
  const nearQuadrantB = quadrantOf(b.nearShoulderSwingDeg, b.nearElbowDeg);
  const farQuadrantA = quadrantOf(a.farShoulderSwingDeg, a.farElbowDeg);
  const farQuadrantB = quadrantOf(b.farShoulderSwingDeg, b.farElbowDeg);
  return {
    maxJointDeltaDeg,
    differingJoints,
    contactStateChanged,
    armQuadrantChanged: nearQuadrantA !== nearQuadrantB || farQuadrantA !== farQuadrantB,
    nearQuadrantA,
    nearQuadrantB,
    farQuadrantA,
    farQuadrantB,
  };
}

export interface DuplicateCheck {
  readonly duplicate: boolean;
  readonly closestCandidateId: string | null;
  readonly closestDistance: PoseDistance | null;
  readonly reason: string;
}

/**
 * SC-AC-03: a candidate is a duplicate when it is within tolerance of ANY
 * previously accepted candidate on all three diversity axes simultaneously
 * (no large joint delta, same contact states, same arm quadrants).
 */
export function checkDuplicateAgainstAccepted(
  candidate: PoseObservation,
  accepted: readonly PoseAnnotation[],
  minJointDeltaDeg: number = SC_AC_03_MIN_JOINT_DELTA_DEG,
): DuplicateCheck {
  let closest: { id: string; distance: PoseDistance } | null = null;
  for (const prior of accepted) {
    const distance = poseAngularDistance(candidate, prior);
    if (!closest || distance.maxJointDeltaDeg < closest.distance.maxJointDeltaDeg) {
      closest = { id: prior.candidateId, distance };
    }
    const diverse =
      distance.maxJointDeltaDeg >= minJointDeltaDeg ||
      distance.contactStateChanged ||
      distance.armQuadrantChanged;
    if (!diverse) {
      return {
        duplicate: true,
        closestCandidateId: prior.candidateId,
        closestDistance: distance,
        reason:
          `duplicate of ${prior.candidateId}: max joint delta ${distance.maxJointDeltaDeg}° ` +
          `< ${minJointDeltaDeg}°, same contact states, same arm quadrants`,
      };
    }
  }
  if (!closest) {
    return { duplicate: false, closestCandidateId: null, closestDistance: null, reason: 'first accepted candidate' };
  }
  const d = closest.distance;
  return {
    duplicate: false,
    closestCandidateId: closest.id,
    closestDistance: d,
    reason:
      `diverse from ${closest.id}: max joint delta ${d.maxJointDeltaDeg}° ` +
      `(${d.differingJoints[0]?.joint}), contactChanged=${d.contactStateChanged}, quadrantChanged=${d.armQuadrantChanged}`,
  };
}

export type PoseComplianceVerdict = 'pass' | 'deviated' | 'rejected';

export interface ComplianceCheck {
  readonly verdict: PoseComplianceVerdict;
  readonly contactMismatch: boolean;
  readonly outOfTolerance: readonly { joint: MajorJointKey; observed: number; target: number; delta: number }[];
  readonly reason: string;
}

/**
 * SC-AC-02: contact state must match exactly; targeted major joints must sit
 * within tolerance. `targetedJoints` defaults to all major joints; inserts may
 * target a subset (e.g. only the far arm for X05/X06).
 */
export function checkPoseCompliance(
  observed: PoseObservation,
  target: PoseObservation,
  targetedJoints: readonly MajorJointKey[] = MAJOR_JOINT_KEYS,
  toleranceDeg: number = SC_AC_02_MAJOR_TOLERANCE_DEG,
): ComplianceCheck {
  const contactMismatch =
    observed.nearFootState !== target.nearFootState || observed.farFootState !== target.farFootState;
  const outOfTolerance = targetedJoints
    .map((joint) => ({
      joint,
      observed: observed[joint],
      target: target[joint],
      delta: round1(Math.abs(observed[joint] - target[joint])),
    }))
    .filter((entry) => entry.delta > toleranceDeg)
    .sort((x, y) => y.delta - x.delta);
  if (contactMismatch) {
    return {
      verdict: 'rejected',
      contactMismatch,
      outOfTolerance,
      reason: `wrong contact state (near ${target.nearFootState}->${observed.nearFootState}, far ${target.farFootState}->${observed.farFootState})`,
    };
  }
  if (outOfTolerance.length === 0) {
    return { verdict: 'pass', contactMismatch, outOfTolerance, reason: 'all targeted joints within tolerance' };
  }
  // Wrong phase family heuristic: 4+ major joints out, or any single joint >60° out.
  // (A recognizable phase with 2-3 drifted joints is `deviated`, still usable
  // as pose reference; calibration: H02 #75 has 3 outs at max Δ47 and is the
  // canonical `deviated` case, H05 #78 has 5+ outs and is `rejected`.)
  const rejected = outOfTolerance.length >= 4 || (outOfTolerance[0]?.delta ?? 0) > 60;
  return {
    verdict: rejected ? 'rejected' : 'deviated',
    contactMismatch,
    outOfTolerance,
    reason: rejected
      ? `wrong phase family: ${outOfTolerance.map((e) => `${e.joint} Δ${e.delta}°`).join(', ')}`
      : `deviated: ${outOfTolerance.map((e) => `${e.joint} Δ${e.delta}°`).join(', ')}`,
  };
}

export type KneeBin = 'tucked' | 'mid' | 'extended';
export type SwingBin = 'rear' | 'neutral' | 'forward';

export function kneeBin(interiorDeg: number): KneeBin {
  if (interiorDeg < 70) return 'tucked';
  if (interiorDeg <= 140) return 'mid';
  return 'extended';
}

export function elbowBin(interiorDeg: number): KneeBin {
  if (interiorDeg < 80) return 'tucked';
  if (interiorDeg <= 150) return 'mid';
  return 'extended';
}

export function swingBin(swingDeg: number): SwingBin {
  if (swingDeg < -15) return 'rear';
  if (swingDeg <= 25) return 'neutral';
  return 'forward';
}

export function assertValidAnnotation(annotation: PoseAnnotation): void {
  if (!annotation.candidateId.trim()) throw new Error('PoseAnnotation requires a candidateId.');
  if (!annotation.annotatedBy.trim()) throw new Error('PoseAnnotation requires annotatedBy.');
  for (const joint of MAJOR_JOINT_KEYS) {
    const value = annotation[joint];
    if (!Number.isFinite(value)) throw new Error(`PoseAnnotation ${annotation.candidateId} has non-finite ${joint}.`);
  }
  for (const key of ['nearKneeDeg', 'farKneeDeg', 'nearElbowDeg', 'farElbowDeg'] as const) {
    const value = annotation[key];
    if (value < 0 || value > 180) throw new Error(`PoseAnnotation ${annotation.candidateId} has impossible ${key}=${value}.`);
  }
}

import type { CycleMetrics, MotionProfile, Pose } from '../../shared/types.ts';
import { BODY } from '../rig/body.ts';
import { distance } from '../geometry/vec.ts';
import { solvePose } from '../gait/pose.ts';

export const AUDIT_SAMPLES = 64;

/** Behavioural acceptance metrics for the generated cycle (FDS #feat-gait). */
export function auditCycle(profile: MotionProfile, samples: number = AUDIT_SAMPLES): CycleMetrics {
  const poses = samplePoses(profile, samples);
  const separations = poses.map((pose) => Math.abs(pose.joints.toe.near.x - pose.joints.toe.far.x));
  const deltas = poses.map((pose) => pose.joints.toe.near.x - pose.joints.toe.far.x);
  return {
    minFootSeparationPx: round2(Math.min(...separations)),
    crossovers: signChanges(deltas),
    leadSwaps: signChanges(deltas),
    flightPhases: countSupport(poses, 'flight'),
    doubleSupportPhases: countSupport(poses, 'double-support'),
    maxBoneLengthError: round3(maxBoneError(poses)),
    soleClearanceMinPx: round2(minSoleClearance(poses)),
  };
}

export function samplePoses(profile: MotionProfile, samples: number): Pose[] {
  const poses: Pose[] = [];
  for (let i = 0; i < samples; i += 1) poses.push(solvePose(i / samples, profile));
  return poses;
}

function signChanges(values: readonly number[]): number {
  let changes = 0;
  let previous = 0;
  for (const value of values) {
    const sign = Math.sign(value);
    if (sign !== 0 && previous !== 0 && sign !== previous) changes += 1;
    if (sign !== 0) previous = sign;
  }
  return changes;
}

function countSupport(poses: readonly Pose[], state: Pose['support']): number {
  return poses.filter((pose) => pose.support === state).length;
}

function maxBoneError(poses: readonly Pose[]): number {
  let worst = 0;
  for (const pose of poses) {
    const j = pose.joints;
    worst = Math.max(
      worst,
      Math.abs(distance(j.hip, j.knee.near) - BODY.femur),
      Math.abs(distance(j.knee.near, j.ankle.near) - BODY.tibia),
      Math.abs(distance(j.hip, j.knee.far) - BODY.femur),
      Math.abs(distance(j.knee.far, j.ankle.far) - BODY.tibia),
      Math.abs(distance(j.shoulder, j.elbow.near) - BODY.humerus),
      Math.abs(distance(j.elbow.near, j.wrist.near) - BODY.forearm),
    );
  }
  return worst;
}

/** Smallest gap between the swinging foot's lowest point and the ground line. */
function minSoleClearance(poses: readonly Pose[]): number {
  let min = Infinity;
  for (const pose of poses) {
    for (const side of ['near', 'far'] as const) {
      const inStance = pose.support === `${side}-stance` || pose.support === 'double-support';
      if (inStance) continue;
      const lowest = Math.max(pose.joints.toe[side].y, pose.joints.heel[side].y);
      min = Math.min(min, -lowest);
    }
  }
  return Number.isFinite(min) ? min : 0;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

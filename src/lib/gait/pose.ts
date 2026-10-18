import type { MotionProfile, Pose, Side, SupportState, Vec2 } from '../../shared/types.ts';
import { BODY } from '../rig/body.ts';
import { fract, rotate, vec } from '../geometry/vec.ts';
import { footState, supportState } from './foot.ts';
import { solveTwoBone } from './ik.ts';

/** Hip lead ahead of the unchanged contact paths (FDS #feat-gait lean rule). */
const HIP_LEAN_BONE_FACTOR = 1;
const RUN_BOB_PX = 2.5;
const WALK_BOB_PX = 1.2;

/**
 * The single pose solver (FDS #feat-gait). Pure: phase + profile in, pose out.
 * Ground line is y = 0, +y is down, +x is the running direction.
 */
export function solvePose(phase: number, profile: MotionProfile): Pose {
  const p = fract(phase);
  const nearPhase = p;
  const farPhase = fract(p + 0.5);
  const nearFoot = footState(nearPhase, profile);
  const farFoot = footState(farPhase, profile);
  const hip = hipPosition(p, profile);
  const near = solveLeg(hip, nearFoot.ankle);
  const far = solveLeg(hip, farFoot.ankle);
  const upper = solveUpper(p, nearPhase, farPhase, profile, hip);
  const support: SupportState = supportState(nearFoot.inStance, farFoot.inStance);
  return {
    phase: p,
    motion: profile.id,
    support,
    joints: {
      hip,
      shoulder: upper.shoulder,
      neckBase: upper.neckBase,
      headCenter: upper.headCenter,
      knee: { near: near.knee, far: far.knee },
      ankle: { near: nearFoot.ankle, far: farFoot.ankle },
      toe: {
        near: footPoint(nearFoot.ankle, nearFoot.pitch, BODY.footLength * 0.5),
        far: footPoint(farFoot.ankle, farFoot.pitch, BODY.footLength * 0.5),
      },
      heel: {
        near: footPoint(nearFoot.ankle, nearFoot.pitch, -BODY.footLength * 0.5),
        far: footPoint(farFoot.ankle, farFoot.pitch, -BODY.footLength * 0.5),
      },
      elbow: { near: upper.elbow.near, far: upper.elbow.far },
      wrist: { near: upper.wrist.near, far: upper.wrist.far },
    },
    torsoLeanRad: profile.leanRad,
    neckPitchRad: upper.neckPitch,
    headPitchRad: upper.headPitch,
    footPitch: { near: nearFoot.pitch, far: farFoot.pitch },
  };
}

function hipPosition(p: number, profile: MotionProfile): Vec2 {
  const bobAmplitude = profile.doubleSupportDuty > 0 ? WALK_BOB_PX : RUN_BOB_PX;
  const bob = -bobAmplitude * Math.cos(4 * Math.PI * p);
  const lead = Math.sin(profile.leanRad) * BODY.femur * HIP_LEAN_BONE_FACTOR;
  return vec(lead, -profile.pelvisHeightPx + bob);
}

function solveLeg(hip: Vec2, ankle: Vec2): { knee: Vec2 } {
  return { knee: solveTwoBone(hip, ankle, BODY.femur, BODY.tibia, 1).mid };
}

interface UpperSolution {
  shoulder: Vec2;
  neckBase: Vec2;
  headCenter: Vec2;
  elbow: Record<Side, Vec2>;
  wrist: Record<Side, Vec2>;
  neckPitch: number;
  headPitch: number;
}

function solveUpper(p: number, nearPhase: number, farPhase: number, profile: MotionProfile, hip: Vec2): UpperSolution {
  const lean = profile.leanRad;
  const shoulder = addVec(hip, rotate(vec(0, -BODY.torso), lean));
  const neckBase = addVec(shoulder, rotate(vec(0, -2), lean));
  const neckPitch = -0.4 * lean + 0.06 * Math.sin(2 * Math.PI * p);
  const headPitch = -0.8 * neckPitch;
  const headCenter = addVec(neckBase, rotate(vec(0, -BODY.neck), lean + neckPitch));
  return {
    shoulder,
    neckBase,
    headCenter,
    neckPitch,
    headPitch,
    elbow: {
      near: armJoint(shoulder, swingAngle(farPhase, profile), BODY.humerus),
      far: armJoint(shoulder, swingAngle(nearPhase, profile), BODY.humerus),
    },
    wrist: {
      near: wristOf(shoulder, swingAngle(farPhase, profile), profile),
      far: wristOf(shoulder, swingAngle(nearPhase, profile), profile),
    },
  };
}

function swingAngle(legPhase: number, profile: MotionProfile): number {
  return profile.armSwingRad * Math.sin(2 * Math.PI * legPhase);
}

function armJoint(shoulder: Vec2, swing: number, len: number): Vec2 {
  return addVec(shoulder, rotate(vec(0, len), -swing));
}

function wristOf(shoulder: Vec2, swing: number, profile: MotionProfile): Vec2 {
  const elbow = armJoint(shoulder, swing, BODY.humerus);
  const forearmAngle = -swing * 0.4 - profile.elbowFlexRad;
  return addVec(elbow, rotate(vec(0, BODY.forearm), forearmAngle));
}

function footPoint(ankle: Vec2, pitch: number, dx: number): Vec2 {
  const local = vec(dx, BODY.footHeight);
  return addVec(ankle, rotate(local, pitch));
}

function addVec(a: Vec2, b: Vec2): Vec2 {
  return vec(a.x + b.x, a.y + b.y);
}

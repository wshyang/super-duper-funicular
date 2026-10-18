import {
  TAU,
  clamp,
  degToRad,
  lerp,
  normalizePhase,
  projectPoint,
  smoothStep,
} from '../core/geometry.js';
import type {
  Capsule,
  GaitConfig,
  LimbSegment,
  MaterialId,
  Point2D,
  PoseFrame,
  RigSpec,
} from '../core/types.js';
import { DEFAULT_RIG, RUN_GAIT } from './spec.js';
import {
  DEFAULT_FOOT,
  describeContact,
  lowestFootPoint,
  solveFoot,
  solveFootFromContact,
  stancePitchRad,
  swingPitchRad,
  type FootGeometry,
} from './foot-roll.js';
import { solveTwoBone } from './ik.js';

export interface SolveOptions {
  readonly rig?: RigSpec;
  readonly gait?: GaitConfig;
  readonly foot?: FootGeometry;
}

interface LegTargets {
  readonly ankle: Point2D;
  readonly stance: boolean;
  readonly stanceProgress: number;
  readonly swingProgress: number;
  readonly contact: 'stance' | 'heel-off' | 'toe-off' | 'swing';
}

/** Ankle position for one leg at local phase `localPhase`, following the stance/swing split. */
export function solveLegTargets(
  localPhase: number,
  gait: GaitConfig,
  rig: RigSpec,
  foot: FootGeometry = DEFAULT_FOOT,
): LegTargets {
  const phase = normalizePhase(localPhase);
  const stance = phase < gait.stanceDuty;
  const stanceProgress = stance ? phase / gait.stanceDuty : 1;
  const swingProgress = stance ? 0 : (phase - gait.stanceDuty) / (1 - gait.stanceDuty);
  const half = gait.strideLengthPx / 2;
  const contactX = stance
    ? rig.pelvisRestX + half - 2 * half * stanceProgress
    : rig.pelvisRestX - half + 2 * half * smoothStep(swingProgress);
  const pitch = stance ? stancePitchRad(stanceProgress) : swingPitchRad(swingProgress);
  const groundContact = { x: contactX, y: rig.groundY - foot.soleRadius };
  if (stance) {
    return {
      ankle: solveFootFromContact(groundContact, pitch, foot),
      stance,
      stanceProgress,
      swingProgress,
      contact: describeContact(stance, stanceProgress),
    };
  }
  const lifted = { x: groundContact.x, y: groundContact.y - gait.footLiftPx * Math.sin(Math.PI * swingProgress) };
  const candidate = solveFootFromContact(lifted, pitch, foot);
  const rolled = solveFoot(candidate, pitch, foot, rig.groundY, 'swing');
  const clearance = rig.groundY - foot.soleRadius - lowestFootPoint(rolled);
  const ankle = clearance < 0 ? { x: candidate.x, y: candidate.y + clearance } : candidate;
  return { ankle, stance, stanceProgress, swingProgress, contact: 'swing' };
}

function legPitch(target: LegTargets): number {
  if (!target.stance) return swingPitchRad(target.swingProgress);
  return stancePitchRad(target.stanceProgress);
}

function capsule(
  id: string,
  side: 'near' | 'far',
  a: Point2D,
  b: Point2D,
  rStart: number,
  rEnd: number,
  material: MaterialId,
): LimbSegment {
  return { id, side, capsule: { a, b, radiusStart: rStart, radiusEnd: rEnd, material } };
}

export function solvePose(phaseInput: number, options: SolveOptions = {}): PoseFrame {
  const rig = options.rig ?? DEFAULT_RIG;
  const gait = options.gait ?? RUN_GAIT;
  const foot = options.foot ?? DEFAULT_FOOT;
  const phase = normalizePhase(phaseInput);
  const bounce = -gait.pelvisBouncePx * Math.cos(2 * TAU * phase);
  const pelvis: Point2D = { x: rig.pelvisRestX, y: rig.pelvisRestY + bounce };
  const lean = degToRad(gait.forwardLeanDeg);
  const torsoTop = projectPoint(pelvis, -Math.PI / 2 + lean, rig.torsoLength);
  const neckTop = projectPoint(torsoTop, -Math.PI / 2 + lean * (1 - gait.neckCounterScale), rig.neckLength);
  const headCenter = projectPoint(neckTop, -Math.PI / 2 + lean * 0.25, rig.headRadius);
  const nearTarget = solveLegTargets(phase, gait, rig, foot);
  const farTarget = solveLegTargets(phase + 0.5, gait, rig, foot);
  const nearHip: Point2D = { x: pelvis.x + 1, y: pelvis.y + 2 };
  const farHip: Point2D = { x: pelvis.x - 2, y: pelvis.y + 2 };
  const nearFoot = solveFoot(nearTarget.ankle, legPitch(nearTarget), foot, rig.groundY, nearTarget.contact);
  const farFoot = solveFoot(farTarget.ankle, legPitch(farTarget), foot, rig.groundY, farTarget.contact);
  const nearLeg = solveLegChain('near', nearHip, nearTarget.ankle, rig);
  const farLeg = solveLegChain('far', farHip, farTarget.ankle, rig);
  const shoulder = projectPoint(torsoTop, -Math.PI / 2 + lean, 3);
  return {
    phase,
    frameIndex: Math.floor(phase * 8 + 1e-6),
    pelvis,
    torsoTop,
    headCenter,
    hairTip: solveHairTip(headCenter, lean, phase, rig),
    nearLeg,
    farLeg,
    nearArm: solveArmChain('near', shoulder, phase, 1, rig, gait),
    farArm: solveArmChain('far', shoulder, phase, -1, rig, gait),
    torso: { a: pelvis, b: torsoTop, radiusStart: rig.torsoHalfWidth * 0.78, radiusEnd: rig.torsoHalfWidth, material: 'fabric' } satisfies Capsule,
    pelvisCapsule: {
      a: { x: pelvis.x, y: pelvis.y - 8 },
      b: { x: pelvis.x, y: pelvis.y + 8 },
      radiusStart: rig.hipHalfWidth + 3,
      radiusEnd: rig.hipHalfWidth,
      material: 'fabric',
    },
    neck: { a: torsoTop, b: neckTop, radiusStart: 5.6, radiusEnd: 5.0, material: 'skin' },
    head: {
      a: neckTop,
      b: { x: headCenter.x, y: neckTop.y - rig.headRadius * 1.72 },
      radiusStart: rig.headRadius * 0.86,
      radiusEnd: rig.headRadius * 0.8,
      material: 'skin',
    },
    hair: {
      a: { x: headCenter.x - rig.headRadius * 0.3, y: headCenter.y - rig.headRadius * 0.72 },
      b: solveHairTip(headCenter, lean, phase, rig),
      radiusStart: 4.6,
      radiusEnd: 2.4,
      material: 'hair',
    },
    nearFoot,
    farFoot,
    groundY: rig.groundY,
  };
}

function solveLegChain(side: 'near' | 'far', hip: Point2D, ankle: Point2D, rig: RigSpec): LimbSegment[] {
  const kneeBend = side === 'near' ? -1 : -1;
  const solved = solveTwoBone(hip, ankle, rig.thighLength, rig.shinLength, kneeBend);
  const thighR = rig.limbRadius.thigh;
  const shinR = rig.limbRadius.shin;
  return [
    capsule(`${side}Thigh`, side, hip, solved.mid, thighR, thighR * 0.82, side === 'near' ? 'skin' : 'skinFar'),
    capsule(`${side}Shin`, side, solved.mid, solved.tip, shinR, shinR * 0.62, side === 'near' ? 'skin' : 'skinFar'),
  ];
}

export function solveArmChain(
  side: 'near' | 'far',
  shoulder: Point2D,
  phase: number,
  swingSign: 1 | -1,
  rig: RigSpec,
  gait: GaitConfig,
): LimbSegment[] {
  const swing = 0.55 * gait.armSwingScale * Math.cos(TAU * phase) * swingSign;
  const upperAngle = Math.PI / 2 + swing;
  const flex = degToRad(78 + 12 * Math.sin(TAU * phase + 0.6));
  const elbow = projectPoint(shoulder, upperAngle, rig.upperArmLength);
  const wrist = projectPoint(elbow, upperAngle - flex, rig.forearmLength);
  const handTip = projectPoint(wrist, upperAngle - flex - degToRad(14), rig.handLength);
  const material: MaterialId = side === 'near' ? 'skin' : 'skinFar';
  const upperR = rig.limbRadius.upperArm;
  const foreR = rig.limbRadius.forearm;
  return [
    capsule(`${side}UpperArm`, side, shoulder, elbow, upperR, upperR * 0.9, material),
    capsule(`${side}Forearm`, side, elbow, wrist, foreR, foreR * 0.78, material),
    capsule(`${side}Hand`, side, wrist, handTip, rig.limbRadius.hand, rig.limbRadius.hand * 0.72, material),
  ];
}

/**
 * The ponytail hangs from the crown *down the back of the head*, not straight
 * out behind it. The first version used an angle of almost exactly π — a
 * horizontal ray — which is why the hair rendered as a plank sticking out of the
 * skull: the geometry was doing precisely what it was told.
 */
function solveHairTip(headCenter: Point2D, lean: number, phase: number, rig: RigSpec): Point2D {
  const lag = Math.sin(TAU * phase + 1.1) * 0.12;
  const angle = Math.PI * 0.62 + lean * 0.35 + lag;
  const root = { x: headCenter.x - rig.headRadius * 0.3, y: headCenter.y - rig.headRadius * 0.72 };
  return projectPoint(root, angle, rig.hairLength);
}

/** Pelvis vertical offset relative to rest, used by foot-contact audits. */
export function pelvisOffset(phase: number, gait: GaitConfig): number {
  return -gait.pelvisBouncePx * Math.cos(2 * TAU * normalizePhase(phase));
}

export function phaseList(frameCount: number): number[] {
  return Array.from({ length: frameCount }, (_, index) => index / frameCount);
}

export function withPhase(phase: number, offset: number): number {
  return normalizePhase(phase + offset);
}

export function easeInOut(t: number): number {
  return smoothStep(clamp(t, 0, 1));
}

export function blendPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

import { polar, vec, type Vec2 } from '../geometry/vec';
import { solveTwoBoneIk } from './ik';
import { BODY } from '../rig/body';
export interface GaitParams { readonly strideHz: number; readonly leanDeg: number; readonly bounce: number; readonly armSwingDeg: number }
export const RUN: GaitParams = { strideHz: 1.6, leanDeg: 8, bounce: 0.035, armSwingDeg: 38 };
export const WALK: GaitParams = { strideHz: 0.9, leanDeg: 3, bounce: 0.015, armSwingDeg: 22 }; // motion family (PR#2)
export const MOTIONS = { run: RUN, walk: WALK } as const;
export type MotionId = keyof typeof MOTIONS;
export const PART_IDS = ['head','neck','torso','pelvis','nearUpperArm','nearForearm','nearHand','farUpperArm','farForearm','farHand','nearThigh','nearShin','nearShoe','nearToe','farThigh','farShin','farShoe','farToe'] as const;
export type PartId = typeof PART_IDS[number];
export interface Pose { readonly phase: number; readonly hip: Vec2; readonly neckBase: Vec2; readonly head: Vec2; readonly joints: Readonly<Record<string, Vec2>>; readonly footRoll: { readonly near: number; readonly far: number } }
/** Foot-roll 0=heel strike → 1=toe-off (PR#3 foot.ts strength). */
export const footRollAt = (phase: number): number => { const p = ((phase % 1) + 1) % 1; return p < 0.35 ? p / 0.35 : 1; };
function leg(hip: Vec2, phase: number, p: GaitParams): { knee: Vec2; ankle: Vec2; roll: number } {
  const swing = Math.sin(phase * Math.PI * 2); const lift = Math.max(0, Math.sin(phase * Math.PI * 2 + 0.6));
  const target = vec(hip.x + swing * 0.38, hip.y + BODY.thigh + BODY.shin - lift * 0.28 - 0.02);
  const ik = solveTwoBoneIk(hip, target, BODY.thigh, BODY.shin, 1);
  return { knee: ik.joint, ankle: ik.end, roll: footRollAt(phase) };
}
export function poseAt(phase: number, p: GaitParams = RUN): Pose {
  const bounce = Math.abs(Math.sin(phase * Math.PI * 2)) * p.bounce;
  const hip = vec(0, 1.02 - bounce); const neckBase = polar(hip, p.leanDeg, BODY.torso);
  const head = polar(neckBase, p.leanDeg * 0.5, BODY.neck + BODY.headR);
  const near = leg(hip, phase, p); const far = leg(hip, phase + 0.5, p);
  const arm = (off: number) => { const sh = neckBase; const swing = Math.sin((phase + off) * Math.PI * 2) * p.armSwingDeg; const el = polar(sh, 180 - swing, BODY.upperArm); const ha = polar(el, 120 - swing * 0.6, BODY.forearm); return { el, ha }; };
  const aN = arm(0.5); const aF = arm(0);
  const toe = (ankle: Vec2, roll: number) => vec(ankle.x + BODY.foot * (0.4 + roll * 0.6), ankle.y - roll * 0.03);
  return { phase, hip, neckBase, head, footRoll: { near: near.roll, far: far.roll }, joints: {
    nearKnee: near.knee, nearAnkle: near.ankle, farKnee: far.knee, farAnkle: far.ankle,
    nearElbow: aN.el, nearHand: aN.ha, farElbow: aF.el, farHand: aF.ha,
    nearToe: toe(near.ankle, near.roll), farToe: toe(far.ankle, far.roll) } };
}

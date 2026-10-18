import type { PartMeta, Point2D, Rgba } from '../shared/atlas-types.js';
import { createRgba, sampleBilinearRgba } from '../pipeline/atlas/image-io.js';

export interface RigLengths {
  readonly torso: number;
  readonly neck: number;
  readonly head: number;
  readonly thigh: number;
  readonly shin: number;
  readonly foot: number;
  readonly upperArm: number;
  readonly forearm: number;
  readonly hand: number;
}

export interface RigPart {
  readonly img: Rgba;
  readonly meta: PartMeta;
}

export const FRAME_W = 220;
export const FRAME_H = 256;
export const GROUND_Y = 234;
const TAU = Math.PI * 2;

/** Placeholder sinusoidal gait (Stage 6 reference fit pending). Positive = backward swing. */
export function gaitAngles(phase: number): Readonly<Record<string, number>> {
  const far = phase + 0.5;
  const hip = (p: number): number => -0.55 * Math.sin(TAU * p) + 0.06;
  const knee = (p: number): number => 0.35 + 0.85 * (0.5 + 0.5 * Math.sin(TAU * p + 2.4));
  const ankle = (p: number): number => -0.25 * Math.sin(TAU * p + 0.8);
  const foot = (p: number): number => -Math.PI / 2 + 0.3 * Math.sin(TAU * p + 2.6) + 0.12;
  const shoulder = (p: number): number => 0.5 * Math.sin(TAU * p);
  const elbow = (p: number): number => 0.9 + 0.25 * Math.sin(TAU * p + 1.2);
  return {
    hipNear: hip(phase), kneeNear: knee(phase), ankleNear: ankle(phase), footNear: foot(phase),
    hipFar: hip(far), kneeFar: knee(far), ankleFar: ankle(far), footFar: foot(far),
    shoulderNear: shoulder(phase), elbowNear: elbow(phase),
    shoulderFar: shoulder(far), elbowFar: elbow(far),
    torso: -0.24, neck: Math.PI + 0.12, head: Math.PI + 0.1,
    hair: -0.5 + 0.25 * Math.sin(TAU * phase + 2.0),
    handNear: 0.2, handFar: 0.2,
  };
}

function rotDir(down: boolean, theta: number): Point2D {
  const cx = down ? 0 : 1;
  const cy = down ? 1 : 0;
  return { x: cx * Math.cos(theta) - cy * Math.sin(theta), y: cx * Math.sin(theta) + cy * Math.cos(theta) };
}

function advance(from: Point2D, dir: Point2D, len: number): Point2D {
  return { x: from.x + dir.x * len, y: from.y + dir.y * len };
}

export function solveJoints(len: RigLengths, phase: number): Readonly<Record<string, Point2D>> {
  const a = gaitAngles(phase);
  const bob = 2.5 * Math.sin(2 * TAU * phase + 1.0);
  const waist: Point2D = { x: 110, y: 118 + bob };
  const torsoDir = rotDir(true, a.torso ?? 0);
  const collar = { x: waist.x - torsoDir.x * len.torso, y: waist.y - torsoDir.y * len.torso };
  const neckDir = rotDir(true, a.neck ?? Math.PI);
  const skullBase = advance(collar, neckDir, len.neck);
  const headDir = rotDir(true, a.head ?? Math.PI);
  const skullTop = advance(skullBase, headDir, len.head);
  const shoulder = { x: collar.x, y: collar.y + 6 };
  const hip = { x: waist.x, y: waist.y + 6 };
  const limb = (sh: Point2D, a1: number, l1: number, a2: number, l2: number, a3: number, l3: number) => {
    const d1 = rotDir(true, a1);
    const j1 = advance(sh, d1, l1);
    const d2 = rotDir(true, a1 + a2);
    const j2 = advance(j1, d2, l2);
    const j3 = advance(j2, rotDir(true, a1 + a2 + a3), l3);
    return { j1, j2, j3 };
  };
  const nearLeg = limb(hip, a.hipNear ?? 0, len.thigh, a.kneeNear ?? 0, len.shin, 0, 0);
  const farLeg = limb(hip, a.hipFar ?? 0, len.thigh, a.kneeFar ?? 0, len.shin, 0, 0);
  const nearArm = limb(shoulder, a.shoulderNear ?? 0, len.upperArm, a.elbowNear ?? 0, len.forearm, a.handNear ?? 0, len.hand);
  const farArm = limb(shoulder, a.shoulderFar ?? 0, len.upperArm, a.elbowFar ?? 0, len.forearm, a.handFar ?? 0, len.hand);
  return {
    waist, collar, skullBase, skullTop, shoulder, hip,
    hairPivot: { x: skullBase.x - 8, y: skullBase.y - len.head * 0.35 },
    nearThigh: hip, nearShin: nearLeg.j1, nearFoot: nearLeg.j2,
    farThigh: hip, farShin: farLeg.j1, farFoot: farLeg.j2,
    nearUpperArm: shoulder, nearForearm: nearArm.j1, nearHand: nearArm.j2,
    farUpperArm: shoulder, farForearm: farArm.j1, farHand: farArm.j2,
    torso: collar, neck: collar, head: skullBase, hairAccessory: { x: skullBase.x - 8, y: skullBase.y - len.head * 0.35 },
    pelvis: waist,
    footNearBall: advance(nearLeg.j2, rotDir(true, a.footNear ?? 0), len.foot),
    footFarBall: advance(farLeg.j2, rotDir(true, a.footFar ?? 0), len.foot),
    angles: { x: 0, y: 0 },
  };
}

export function partWorldAngle(_joints: Readonly<Record<string, Point2D>>, phase: number, partId: string): number {
  const a = gaitAngles(phase);
  const table: Readonly<Record<string, number>> = {
    torso: a.torso ?? 0, neck: a.neck ?? Math.PI, head: a.head ?? Math.PI, hairAccessory: a.hair ?? -0.5,
    pelvis: a.torso ?? 0,
    nearThigh: a.hipNear ?? 0, nearShin: (a.hipNear ?? 0) + (a.kneeNear ?? 0), nearFoot: a.footNear ?? -Math.PI / 2,
    farThigh: a.hipFar ?? 0, farShin: (a.hipFar ?? 0) + (a.kneeFar ?? 0), farFoot: a.footFar ?? -Math.PI / 2,
    nearUpperArm: a.shoulderNear ?? 0,
    nearForearm: (a.shoulderNear ?? 0) + (a.elbowNear ?? 0),
    nearHand: (a.shoulderNear ?? 0) + (a.elbowNear ?? 0) + (a.handNear ?? 0),
    farUpperArm: a.shoulderFar ?? 0,
    farForearm: (a.shoulderFar ?? 0) + (a.elbowFar ?? 0),
    farHand: (a.shoulderFar ?? 0) + (a.elbowFar ?? 0) + (a.handFar ?? 0),
  };
  return table[partId] ?? 0;
}

/** Inverse-rotate blit of one canonical part about its proximal joint, painter order upstream. */
export function blitPart(fb: Rgba, part: RigPart, joint: Point2D, theta: number): void {
  const { img, meta } = part;
  const reach = meta.restLength + meta.halfWidth * 2 + 4;
  const cos = Math.cos(-theta);
  const sin = Math.sin(-theta);
  const px = meta.pivots.proximal.x;
  const py = meta.pivots.proximal.y;
  const minX = Math.max(0, Math.floor(joint.x - reach));
  const maxX = Math.min(fb.width - 1, Math.ceil(joint.x + reach));
  const minY = Math.max(0, Math.floor(joint.y - reach));
  const maxY = Math.min(fb.height - 1, Math.ceil(joint.y + reach));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - joint.x;
      const dy = y - joint.y;
      const tx = px + cos * dx - sin * dy;
      const ty = py + sin * dx + cos * dy;
      if (tx < 0 || ty < 0 || tx > img.width - 1 || ty > img.height - 1) continue;
      const s = sampleBilinearRgba(img, tx, ty);
      const sa = (s[3] ?? 0) / 255;
      if (sa <= 0.01) continue;
      const i = (y * fb.width + x) * 4;
      const da = (fb.data[i + 3] ?? 0) / 255;
      const outA = sa + da * (1 - sa);
      fb.data[i] = ((s[0] ?? 0) * sa + (fb.data[i] ?? 0) * da * (1 - sa)) / (outA || 1);
      fb.data[i + 1] = ((s[1] ?? 0) * sa + (fb.data[i + 1] ?? 0) * da * (1 - sa)) / (outA || 1);
      fb.data[i + 2] = ((s[2] ?? 0) * sa + (fb.data[i + 2] ?? 0) * da * (1 - sa)) / (outA || 1);
      fb.data[i + 3] = Math.round(outA * 255);
    }
  }
}

export function countComponents(img: Rgba): number {
  const seen = new Uint8Array(img.width * img.height);
  const stack: number[] = [];
  let components = 0;
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || (img.data[start * 4 + 3] ?? 0) === 0) continue;
    components++;
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const cur = stack.pop() ?? 0;
      const cx = cur % img.width;
      const next = [cx > 0 ? cur - 1 : -1, cx < img.width - 1 ? cur + 1 : -1, cur - img.width, cur + img.width];
      for (const n of next) {
        if (n < 0 || n >= seen.length || seen[n] || (img.data[n * 4 + 3] ?? 0) === 0) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
  }
  return components;
}

export function lowestOpaqueY(img: Rgba): number {
  for (let y = img.height - 1; y >= 0; y--) {
    for (let x = 0; x < img.width; x++) {
      if ((img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0) return y;
    }
  }
  return -1;
}

export function renderFrame(parts: readonly RigPart[], len: RigLengths, phase: number): Rgba {
  const fb = createRgba(FRAME_W, FRAME_H);
  const joints = solveJoints(len, phase);
  const ordered = [...parts].sort((p, q) => p.meta.zOrder - q.meta.zOrder);
  for (const part of ordered) {
    const joint = joints[part.meta.partId];
    if (!joint) continue;
    blitPart(fb, part, joint, partWorldAngle(joints, phase, part.meta.partId));
  }
  return fb;
}

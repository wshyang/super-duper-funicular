import type { PaintOp, Persona, Pose, Side, Vec2 } from '../../shared/types.ts';
import { BODY } from '../rig/body.ts';
import { rotate, vec } from '../geometry/vec.ts';
import { shade } from './raster.ts';

export interface Transform {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export const identityTransform: Transform = { scale: 1, offsetX: 0, offsetY: 0 };

export function applyTransform(t: Transform, p: Vec2): Vec2 {
  return vec(p.x * t.scale + t.offsetX, p.y * t.scale + t.offsetY);
}

export function transformOp(op: PaintOp, t: Transform): PaintOp {
  switch (op.kind) {
    case 'capsule':
      return { ...op, a: applyTransform(t, op.a), b: applyTransform(t, op.b), radius: op.radius * t.scale };
    case 'circle':
      return { ...op, center: applyTransform(t, op.center), radius: op.radius * t.scale };
    case 'polygon':
      return { ...op, points: op.points.map((p) => applyTransform(t, p)) };
    case 'segment':
      return { ...op, a: applyTransform(t, op.a), b: applyTransform(t, op.b), width: op.width * t.scale };
  }
}

/**
 * Pose → paint ops in rig space (ground y=0, +y down), back-to-front
 * (FDS #feat-render). The browser canvas painter and the pure-TS raster
 * painter both consume this list (#nfr-two-painters).
 */
export function poseToOps(pose: Pose, persona: Persona): PaintOp[] {
  const pal = persona.palette;
  const far = { skin: pal.skinFar, top: shade(pal.top, 0.78), bottom: shade(pal.bottom, 0.78), shoe: pal.shoeFar };
  const near = { skin: pal.skin, top: pal.top, bottom: pal.bottom, shoe: pal.shoe };
  // Sleeveless kit: arms read as skin so they stay visible against the torso.

  const j = pose.joints;
  const ops: PaintOp[] = [];
  ops.push(...armOps(j.shoulder, j.elbow.far, j.wrist.far, far.skin));
  ops.push(...legOps('far', j.hip, j.knee.far, j.ankle.far, pose.footPitch.far, far.bottom, far.shoe));
  ops.push({ kind: 'circle', center: j.hip, radius: 7, color: pal.bottom });
  ops.push({ kind: 'capsule', a: j.hip, b: j.shoulder, radius: 8, color: pal.top });
  ops.push({ kind: 'capsule', a: j.neckBase, b: j.headCenter, radius: 3, color: pal.skin });
  ops.push({ kind: 'circle', center: j.headCenter, radius: BODY.headRadius, color: pal.skin });
  ops.push(hairOp(pose, pal.hair));
  ops.push(...legOps('near', j.hip, j.knee.near, j.ankle.near, pose.footPitch.near, near.bottom, near.shoe));
  ops.push(...armOps(j.shoulder, j.elbow.near, j.wrist.near, near.skin));
  return ops;
}

function legOps(_side: Side, hip: Vec2, knee: Vec2, ankle: Vec2, pitch: number, kit: string, shoe: string): PaintOp[] {
  return [
    { kind: 'capsule', a: hip, b: knee, radius: BODY.thighRadius, color: kit },
    { kind: 'capsule', a: knee, b: ankle, radius: BODY.shinRadius, color: kit },
    shoeOp(ankle, pitch, shoe),
  ];
}

function armOps(shoulder: Vec2, elbow: Vec2, wrist: Vec2, skin: string): PaintOp[] {
  return [
    { kind: 'capsule', a: shoulder, b: elbow, radius: BODY.armRadius, color: skin },
    { kind: 'capsule', a: elbow, b: wrist, radius: BODY.armRadius * 0.9, color: skin },
    { kind: 'circle', center: wrist, radius: BODY.handRadius, color: skin },
  ];
}

function shoeOp(ankle: Vec2, pitch: number, color: string): PaintOp {
  const corner = (dx: number, dy: number): Vec2 => {
    const local = vec(dx, dy);
    return { x: ankle.x + rotate(local, pitch).x, y: ankle.y + rotate(local, pitch).y };
  };
  const half = BODY.footLength * 0.5;
  return {
    kind: 'polygon',
    points: [corner(-half, -2), corner(half, -2), corner(half, BODY.footHeight), corner(-half, BODY.footHeight)],
    color,
  };
}

function hairOp(pose: Pose, hair: string): PaintOp {
  // Cap only: the face must stay visible in side view (audit finding TURN-L02).
  const back = vec(-BODY.headRadius * 0.45, -BODY.headRadius * 0.45);
  return { kind: 'circle', center: { x: pose.joints.headCenter.x + back.x, y: pose.joints.headCenter.y + back.y }, radius: BODY.headRadius * 0.75, color: hair };
}

/** Skeleton overlay ops (audit + workbench overlay). */
export function skeletonOps(pose: Pose, color: string): PaintOp[] {
  const j = pose.joints;
  const seg = (a: Vec2, b: Vec2): PaintOp => ({ kind: 'segment', a, b, width: 1.5, color });
  return [
    seg(j.hip, j.shoulder),
    seg(j.shoulder, j.neckBase),
    seg(j.neckBase, j.headCenter),
    seg(j.hip, j.knee.near),
    seg(j.knee.near, j.ankle.near),
    seg(j.ankle.near, j.toe.near),
    seg(j.hip, j.knee.far),
    seg(j.knee.far, j.ankle.far),
    seg(j.ankle.far, j.toe.far),
    seg(j.shoulder, j.elbow.near),
    seg(j.elbow.near, j.wrist.near),
    seg(j.shoulder, j.elbow.far),
    seg(j.elbow.far, j.wrist.far),
    { kind: 'circle', center: j.hip, radius: 2, color },
    { kind: 'circle', center: j.knee.near, radius: 2, color },
    { kind: 'circle', center: j.ankle.near, radius: 2, color },
  ];
}

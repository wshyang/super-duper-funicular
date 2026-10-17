import { motions, type MotionType } from "./motions";
export interface Point {
  x: number;
  y: number;
}
export interface Gait {
  motion?: MotionType;
  cadence: number;
  stride: number;
  lift: number;
  lean: number;
}
export interface Shoe {
  heel: Point;
  toe: Point;
  ankle: Point;
  angle: number;
}
export interface Leg {
  shoe: Shoe;
  knee: Point;
  foot: Point;
  isContact: boolean;
}
export interface Pose {
  motion: MotionType;
  hip: Point;
  shoulder: Point;
  neck: Point;
  head: Point;
  torsoAngle: number;
  neckAngle: number;
  headAngle: number;
  near: Leg;
  far: Leg;
  phase: number;
}
export const defaults: Gait = { cadence: 168, stride: 36, lift: 25, lean: 10 };
export const stance = motions.run.stance;
export const getStance = (gait: Gait) => motions[gait.motion ?? "run"].stance;
export const wrap = (phase: number) => ((phase % 1) + 1) % 1;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function getFoot(phase: number, gait: Gait): Point {
  const cycle = wrap(phase);
  const stance = getStance(gait);
  if (cycle < stance) return { x: gait.stride * (0.5 - cycle / stance), y: 0 };
  const swing = (cycle - stance) / (1 - stance);
  const ease = swing * swing * (3 - 2 * swing);
  return {
    x:
      gait.stride *
      (ease -
        0.5 -
        ((1 - stance) / stance) * (2 * swing ** 3 - 3 * swing ** 2 + swing)),
    y: -gait.lift * Math.sin(Math.PI * swing) ** 2,
  };
}

export function solveKnee(hip: Point, foot: Point): Point {
  const dx = foot.x - hip.x,
    dy = foot.y - hip.y;
  const length = Math.max(0.001, distance(hip, foot));
  const bend = Math.sqrt(Math.max(0, 32 ** 2 - (length / 2) ** 2));
  return {
    x: (hip.x + foot.x) / 2 + (dy / length) * bend,
    y: (hip.y + foot.y) / 2 - (dx / length) * bend,
  };
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
function getShoeAngle(phase: number, gait: Gait) {
  if (gait.motion && gait.motion !== "run")
    return getWalkingShoeAngle(phase, gait);
  const cycle = wrap(phase);
  if (cycle < stance) return radians(52) * smooth((cycle / stance - 0.4) / 0.6);
  const swing = (cycle - stance) / (1 - stance);
  if (swing < 0.45) return radians(52 - 60 * smooth(swing / 0.45));
  return radians(-8 * (1 - smooth((swing - 0.45) / 0.55)));
}
export function getShoe(phase: number, gait: Gait): Shoe {
  const reference = getFoot(phase, gait);
  const angle = getShoeAngle(phase, gait);
  const isHeelPivot = gait.motion && gait.motion !== "run" && angle < 0;
  const duty = getStance(gait);
  const isWalkingSwing =
    gait.motion && gait.motion !== "run" && wrap(phase) >= duty;
  const recovery = smooth((wrap(phase) - duty) / (1 - duty));
  const toe = isWalkingSwing
    ? {
        x: reference.x + 10 + 16 * (Math.cos(radians(-15)) - 1) * recovery,
        y: reference.y + 16 * Math.sin(radians(-15)) * recovery,
      }
    : isHeelPivot
      ? {
          x: reference.x - 6 + 16 * Math.cos(angle),
          y: reference.y + 16 * Math.sin(angle),
        }
      : { x: reference.x + 10, y: reference.y };
  const heel = {
    x: toe.x - 16 * Math.cos(angle),
    y: toe.y - 16 * Math.sin(angle),
  };
  const ankle = {
    x: toe.x - 10 * Math.cos(angle) + 6 * Math.sin(angle),
    y: toe.y - 10 * Math.sin(angle) - 6 * Math.cos(angle),
  };
  return { toe, heel, ankle, angle };
}
function getLeg(phase: number, hip: Point, gait: Gait): Leg {
  const shoe = getShoe(phase, gait);
  const foot = shoe.ankle;
  return {
    foot,
    shoe,
    knee: solveKnee(hip, foot),
    isContact: wrap(phase) < getStance(gait),
  };
}
function getUpperBody(hip: Point, cycle: number, gait: Gait) {
  const beat = 4 * Math.PI * cycle;
  const sway = gait.motion && gait.motion !== "run" ? 0.45 : 1;
  const torsoAngle = radians(gait.lean + sway * 1.8 * Math.sin(beat - 0.35));
  const shoulder = {
    x: hip.x + Math.sin(torsoAngle) * 31,
    y: hip.y - Math.cos(torsoAngle) * 31,
  };
  // Cervical counter-rotation and a phase-lagged nod, not a rigid torso attachment.
  const neckAngle = radians(gait.lean * 0.35 + sway * 4 * Math.sin(beat - 0.9));
  const neck = {
    x: shoulder.x + Math.sin(neckAngle) * 8,
    y: shoulder.y - Math.cos(neckAngle) * 8,
  };
  const headAngle = radians(
    gait.lean * 0.12 + sway * 1.5 * Math.sin(beat - 1.2),
  );
  const head = {
    x: neck.x + Math.sin(headAngle) * 10,
    y: neck.y - Math.cos(headAngle) * 10,
  };
  return { shoulder, neck, head, torsoAngle, neckAngle, headAngle };
}
export function getPose(phase: number, gait: Gait): Pose {
  const cycle = wrap(phase);
  const motion = gait.motion ?? "run";
  const hip = {
    x: Math.sin(radians(gait.lean)) * 18,
    y:
      motion === "run"
        ? -60 + 2.5 * Math.sin(4 * Math.PI * cycle)
        : -68 + 1 * Math.cos(4 * Math.PI * cycle),
  };
  return {
    motion,
    hip,
    ...getUpperBody(hip, cycle, gait),
    near: getLeg(cycle, hip, gait),
    far: getLeg(cycle + 0.5, hip, gait),
    phase: cycle,
  };
}

export function getPhaseLabel(
  phase: number,
  motion: MotionType = "run",
): string {
  if (motion !== "run") return getWalkingLabel(phase, motion);
  const half = wrap(phase * 2);
  if (half < 0.2) return "Contact";
  if (half < 0.5) return "Compression";
  if (half < 0.72) return "Push-off";
  return "Flight";
}

export function getArm(pose: Pose, phase: number) {
  const isWalking = pose.motion !== "run";
  const amplitude =
    pose.motion === "walk" ? 0.35 : pose.motion === "brisk-walk" ? 0.5 : 0.85;
  const swing = Math.cos(phase * Math.PI * 2) * amplitude;
  const elbow = {
    x: pose.shoulder.x + Math.sin(swing) * 22,
    y: pose.shoulder.y + Math.cos(swing) * 22,
  };
  const hand = isWalking
    ? {
        x: elbow.x + Math.sin(swing + 0.28) * 19,
        y: elbow.y + Math.cos(swing + 0.28) * 19,
      }
    : {
        x: elbow.x + Math.cos(swing + 0.65) * 19,
        y: elbow.y - Math.sin(swing + 0.65) * 19,
      };
  return [pose.shoulder, elbow, hand];
}

function getWalkingShoeAngle(phase: number, gait: Gait) {
  const cycle = wrap(phase),
    duty = getStance(gait);
  if (cycle < duty) {
    const contact = cycle / duty;
    if (contact < 0.2) return radians(-15 * (1 - smooth(contact / 0.2)));
    return radians(40 * smooth((contact - 0.55) / 0.45));
  }
  return radians(40 - 55 * smooth((cycle - duty) / (1 - duty)));
}
function getWalkingLabel(phase: number, motion: MotionType) {
  const cycle = wrap(phase),
    duty = motions[motion].stance;
  if (cycle < 0.1) return "Heel strike";
  if (cycle < 0.22) return "Loading";
  if (cycle < 0.38) return "Mid-stance";
  if (cycle < 0.5) return "Heel rise";
  if (cycle < duty) return "Double support";
  if (cycle < duty + 0.07) return "Toe-off";
  if (cycle < 0.9) return "Swing";
  return "Heel approach";
}

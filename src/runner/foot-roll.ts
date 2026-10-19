import type {
  FootContactPhase,
  GaitConfig,
  Point2D,
} from '../shared/types.js';
import type { AnatomicalRigSpec } from './body-proportions.js';
import { projectPoint } from './two-bone-ik.js';

export interface RollingFootKnot {
  readonly ballDx: number;
  readonly ballLiftY: number;
  readonly rearFootPitchDeg: number;
  readonly toePitchDeg: number;
  readonly contactPhase: FootContactPhase;
  readonly grounded: boolean;
}

export interface SolvedFootRollGeometry {
  readonly ankleTarget: Point2D;
  readonly heelPoint: Point2D;
  readonly ballPoint: Point2D;
  readonly tipPoint: Point2D;
  readonly rearFootAngleRad: number;
  readonly toeAngleRad: number;
  readonly heelLiftPx: number;
  readonly contactPhase: FootContactPhase;
  readonly isGrounded: boolean;
}

const FOOT_ROLL_KNOTS: readonly RollingFootKnot[] = [
  {
    ballDx: 22,
    ballLiftY: 0,
    rearFootPitchDeg: 10,
    toePitchDeg: -22,
    contactPhase: 'midfoot-strike',
    grounded: true,
  },
  {
    ballDx: -4,
    ballLiftY: 0,
    rearFootPitchDeg: 8,
    toePitchDeg: 0,
    contactPhase: 'sole-roll',
    grounded: true,
  },
  {
    ballDx: -28,
    ballLiftY: 0,
    rearFootPitchDeg: 52,
    toePitchDeg: 2,
    contactPhase: 'heel-off-roll',
    grounded: true,
  },
  {
    ballDx: -50,
    ballLiftY: 14,
    rearFootPitchDeg: 68,
    toePitchDeg: 58,
    contactPhase: 'toe-off',
    grounded: false,
  },
  {
    ballDx: -38,
    ballLiftY: 44,
    rearFootPitchDeg: 76,
    toePitchDeg: 70,
    contactPhase: 'swing-recovery',
    grounded: false,
  },
  {
    ballDx: -10,
    ballLiftY: 42,
    rearFootPitchDeg: 38,
    toePitchDeg: 30,
    contactPhase: 'swing-recovery',
    grounded: false,
  },
  {
    ballDx: 18,
    ballLiftY: 30,
    rearFootPitchDeg: 4,
    toePitchDeg: -10,
    contactPhase: 'flight-reach',
    grounded: false,
  },
  {
    ballDx: 34,
    ballLiftY: 12,
    rearFootPitchDeg: -6,
    toePitchDeg: -24,
    contactPhase: 'flight-reach',
    grounded: false,
  },
];

export interface FootRollSolveContext {
  readonly pelvis: Point2D;
  readonly config: GaitConfig;
  readonly rig: AnatomicalRigSpec;
}

export function solveRollingFootGeometry(
  legPhase: number,
  ctx: FootRollSolveContext,
): SolvedFootRollGeometry {
  const sample = interpolateFootRollKnot(legPhase, ctx.config);
  const soleClearance = 3.5;
  const ballX = ctx.pelvis.x + sample.ballDx * ctx.config.strideLengthScale;
  const ballY = Math.min(
    ctx.rig.groundY - soleClearance,
    ctx.rig.groundY - soleClearance - sample.ballLiftY * ctx.config.kneeDriveScale,
  );
  const ballPoint: Point2D = { x: ballX, y: ballY };
  const rearFootAngleRad = (sample.rearFootPitchDeg * Math.PI) / 180;
  const toeAngleRad = (sample.toePitchDeg * Math.PI) / 180;
  const ankleTarget = projectPoint(
    ballPoint,
    rearFootAngleRad + Math.PI,
    ctx.rig.midfootLength,
  );
  const rawHeel = projectPoint(
    ankleTarget,
    rearFootAngleRad + Math.PI,
    ctx.rig.heelOffsetLength,
  );
  const heelPoint: Point2D = {
    x: rawHeel.x,
    y: Math.min(ctx.rig.groundY - soleClearance, rawHeel.y),
  };
  const rawToe = projectPoint(ballPoint, toeAngleRad, ctx.rig.toeLength);
  const tipPoint: Point2D = {
    x: rawToe.x,
    y: Math.min(ctx.rig.groundY - soleClearance + 1, rawToe.y),
  };
  const heelLiftPx = Math.max(
    0,
    Number((ctx.rig.groundY - soleClearance - heelPoint.y).toFixed(1)),
  );
  return {
    ankleTarget,
    heelPoint,
    ballPoint,
    tipPoint,
    rearFootAngleRad,
    toeAngleRad,
    heelLiftPx,
    contactPhase: sample.contactPhase,
    isGrounded: sample.grounded,
  };
}

export function reanchorFootToSolvedAnkle(
  solvedAnkle: Point2D,
  roll: SolvedFootRollGeometry,
  rig: AnatomicalRigSpec,
): SolvedFootRollGeometry {
  const soleClearance = 3.5;
  const ballRaw = projectPoint(solvedAnkle, roll.rearFootAngleRad, rig.midfootLength);
  const ballPoint: Point2D = {
    x: ballRaw.x,
    y: Math.min(rig.groundY - soleClearance, ballRaw.y),
  };
  const heelRaw = projectPoint(
    solvedAnkle,
    roll.rearFootAngleRad + Math.PI,
    rig.heelOffsetLength,
  );
  const heelPoint: Point2D = {
    x: heelRaw.x,
    y: Math.min(rig.groundY - soleClearance, heelRaw.y),
  };
  const toeRaw = projectPoint(ballPoint, roll.toeAngleRad, rig.toeLength);
  const tipPoint: Point2D = {
    x: toeRaw.x,
    y: Math.min(rig.groundY - soleClearance + 1, toeRaw.y),
  };
  const heelLiftPx = Math.max(
    0,
    Number((rig.groundY - soleClearance - heelPoint.y).toFixed(1)),
  );
  return {
    ...roll,
    ankleTarget: solvedAnkle,
    heelPoint,
    ballPoint,
    tipPoint,
    heelLiftPx,
  };
}

function interpolateFootRollKnot(
  legPhase: number,
  config: GaitConfig,
): RollingFootKnot {
  const phase = ((legPhase % 1) + 1) % 1;
  const mode = config.locomotionMode ?? 'run';
  const stanceDuty = mode === 'walk' ? 0.62 : mode === 'brisk-walk' ? 0.56 : 0.32;
  const isWalkingMode = mode === 'walk' || mode === 'brisk-walk';
  const remappedPhase = isWalkingMode
    ? phase < stanceDuty
      ? (phase / stanceDuty) * 0.32
      : 0.32 + ((phase - stanceDuty) / (1 - stanceDuty)) * 0.68
    : phase;
  const scaled = remappedPhase * 8;
  const idx0 = Math.floor(scaled) % 8;
  const idx1 = (idx0 + 1) % 8;
  const t = smoothStep(scaled - Math.floor(scaled));
  const k0 = FOOT_ROLL_KNOTS[idx0] ?? FOOT_ROLL_KNOTS[0]!;
  const k1 = FOOT_ROLL_KNOTS[idx1] ?? FOOT_ROLL_KNOTS[0]!;
  const grounded = phase < stanceDuty;
  const rawLiftY = grounded ? 0 : lerp(k0.ballLiftY, k1.ballLiftY, t);
  const liftScale = mode === 'walk' ? 0.32 : mode === 'brisk-walk' ? 0.45 : 1.0;
  return {
    ballDx: lerp(k0.ballDx, k1.ballDx, t),
    ballLiftY: rawLiftY * liftScale,
    rearFootPitchDeg:
      lerp(k0.rearFootPitchDeg, k1.rearFootPitchDeg, t) * config.footRollScale,
    toePitchDeg: lerp(k0.toePitchDeg, k1.toePitchDeg, t) * config.footRollScale,
    contactPhase: grounded
      ? phase < stanceDuty * 0.35
        ? 'midfoot-strike'
        : phase < stanceDuty * 0.72
          ? 'sole-roll'
          : 'heel-off-roll'
      : t < 0.5
        ? k0.contactPhase
        : k1.contactPhase,
    grounded,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

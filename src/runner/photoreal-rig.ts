import type {
  ArticulatedPose,
  BodyPartId,
  LimbKinematics,
  Point2D,
  RasterImage,
  RunnerPalette,
} from '../shared/types.js';
import { parseHexColor } from './palette.js';
import {
  warpPhotorealRollingShoe,
  warpPhotorealSegmentToQuad,
} from './photoreal-warp.js';

export type PhotorealPartBank = Partial<Record<BodyPartId, RasterImage>>;

let activeFemalePartBank: PhotorealPartBank = {};

export function setPhotorealFemalePartBank(bank: PhotorealPartBank): void {
  activeFemalePartBank = { ...bank };
}

export function getPhotorealFemalePartBank(): PhotorealPartBank {
  return activeFemalePartBank;
}

export function hasPhotorealFemalePartBank(): boolean {
  return Boolean(
    activeFemalePartBank.head &&
      activeFemalePartBank.torso &&
      activeFemalePartBank.nearThigh,
  );
}

export function renderPhotorealFemalePoseOntoCanvas(
  canvas: RasterImage,
  pose: ArticulatedPose,
  palette: RunnerPalette,
): boolean {
  if (!hasPhotorealFemalePartBank()) return false;
  const bank = activeFemalePartBank as Record<BodyPartId, RasterImage>;
  renderFarSideLimbs(canvas, pose, palette, bank);
  renderTorsoAndNeck(canvas, pose, palette, bank);
  renderNearLegAndPelvisShorts(canvas, pose, palette, bank);
  renderHeadAndPonytail(canvas, pose, palette, bank);
  renderNearArmChain(canvas, pose, palette, bank);
  return true;
}

function renderFarSideLimbs(
  canvas: RasterImage,
  pose: ArticulatedPose,
  palette: RunnerPalette,
  bank: Record<BodyPartId, RasterImage>,
): void {
  warpPhotorealSegmentToQuad(canvas, bank.farUpperArm, {
    dstStart: pose.farArm.hipOrShoulder,
    dstEnd: pose.farArm.midJoint,
    dstHalfWidthPx: 23,
  });
  warpPhotorealSegmentToQuad(canvas, bank.farForearm, {
    dstStart: pose.farArm.midJoint,
    dstEnd: pose.farArm.endEffector,
    dstHalfWidthPx: 23,
  });
  const farHandTip = computeHandTip(pose.farArm, 9.0);
  warpPhotorealSegmentToQuad(canvas, bank.farHand, {
    dstStart: pose.farArm.endEffector,
    dstEnd: farHandTip,
    dstHalfWidthPx: 21,
  });

  warpPhotorealSegmentToQuad(canvas, bank.farShin, {
    dstStart: pose.farLeg.midJoint,
    dstEnd: pose.farLeg.endEffector,
    dstHalfWidthPx: 28,
  });
  warpPhotorealSegmentToQuad(canvas, bank.farThigh, {
    dstStart: pose.farLeg.hipOrShoulder,
    dstEnd: pose.farLeg.midJoint,
    dstHalfWidthPx: 28,
  });
  warpPhotorealRollingShoe(
    canvas,
    bank.farFoot,
    pose.farLeg,
    parseHexColor(palette.jerseyMain),
    13.5,
  );
}

function renderTorsoAndNeck(
  canvas: RasterImage,
  pose: ArticulatedPose,
  palette: RunnerPalette,
  bank: Record<BodyPartId, RasterImage>,
): void {
  const headPivot: Point2D = {
    x: pose.neck.x + 1.5,
    y: pose.neck.y - 1.5,
  };
  const neckBottom: Point2D = {
    x: pose.collar.x + 0.5,
    y: pose.collar.y + 3.5,
  };
  warpPhotorealSegmentToQuad(canvas, bank.neck, {
    dstStart: headPivot,
    dstEnd: neckBottom,
    dstHalfWidthPx: 17,
  });

  const torsoTop: Point2D = {
    x: pose.collar.x - 0.5,
    y: pose.collar.y - 2.0,
  };
  const torsoBottom: Point2D = {
    x: pose.pelvis.x,
    y: pose.pelvis.y + 2.0,
  };
  warpPhotorealSegmentToQuad(canvas, bank.torso, {
    dstStart: torsoTop,
    dstEnd: torsoBottom,
    dstHalfWidthPx: 41,
    srcStart: { x: 74, y: 26 },
    srcEnd: { x: 80, y: 120 },
    tintTarget: parseHexColor(palette.jerseyMain),
    tintMode: 'crimson-singlet',
  });
}

function renderNearLegAndPelvisShorts(
  canvas: RasterImage,
  pose: ArticulatedPose,
  palette: RunnerPalette,
  bank: Record<BodyPartId, RasterImage>,
): void {
  const pelvisTop: Point2D = {
    x: pose.pelvis.x + 2.0,
    y: pose.pelvis.y - 9.0,
  };
  const pelvisBottom: Point2D = {
    x: pose.pelvis.x - 1.0,
    y: pose.pelvis.y + 12.0,
  };
  warpPhotorealSegmentToQuad(canvas, bank.pelvis, {
    dstStart: pelvisTop,
    dstEnd: pelvisBottom,
    dstHalfWidthPx: 28,
    srcStart: { x: 82, y: 32 },
    srcEnd: { x: 78, y: 120 },
  });

  warpPhotorealSegmentToQuad(canvas, bank.nearShin, {
    dstStart: pose.nearLeg.midJoint,
    dstEnd: pose.nearLeg.endEffector,
    dstHalfWidthPx: 29,
  });
  warpPhotorealSegmentToQuad(canvas, bank.nearThigh, {
    dstStart: pose.nearLeg.hipOrShoulder,
    dstEnd: pose.nearLeg.midJoint,
    dstHalfWidthPx: 29,
  });

  warpPhotorealRollingShoe(
    canvas,
    bank.nearFoot,
    pose.nearLeg,
    parseHexColor(palette.jerseyMain),
    14.0,
  );
}

function renderHeadAndPonytail(
  canvas: RasterImage,
  pose: ArticulatedPose,
  palette: RunnerPalette,
  bank: Record<BodyPartId, RasterImage>,
): void {
  const headPivot: Point2D = {
    x: pose.neck.x + 2.0,
    y: pose.neck.y + 2.0,
  };
  const headCrown: Point2D = {
    x: headPivot.x + 1.0 + Math.sin(pose.neckAngleRad) * 2.0,
    y: headPivot.y - 26.5,
  };
  const ponyBounce = Math.sin(pose.phase * Math.PI * 4 - 0.55) * 4.0;
  const ponyRoot: Point2D = {
    x: headPivot.x - 7.5,
    y: headPivot.y - 15.5,
  };
  const ponyTip: Point2D = {
    x: ponyRoot.x - 25,
    y: ponyRoot.y + 3.0 + ponyBounce,
  };
  warpPhotorealSegmentToQuad(canvas, bank.hairAccessory, {
    dstStart: ponyRoot,
    dstEnd: ponyTip,
    dstHalfWidthPx: 19,
    srcStart: { x: 142, y: 82 },
    srcEnd: { x: 14, y: 86 },
    tintTarget: parseHexColor(palette.jerseyMain),
    tintMode: 'accent-trim',
  });

  warpPhotorealSegmentToQuad(canvas, bank.head, {
    dstStart: headCrown,
    dstEnd: headPivot,
    dstHalfWidthPx: 23,
    srcStart: { x: 76, y: 12 },
    srcEnd: { x: 76, y: 120 },
  });
}

function renderNearArmChain(
  canvas: RasterImage,
  pose: ArticulatedPose,
  _palette: RunnerPalette,
  bank: Record<BodyPartId, RasterImage>,
): void {
  const shoulderSocket: Point2D = {
    x: pose.nearArm.hipOrShoulder.x - 0.5,
    y: pose.nearArm.hipOrShoulder.y - 2.5,
  };
  warpPhotorealSegmentToQuad(canvas, bank.nearUpperArm, {
    dstStart: shoulderSocket,
    dstEnd: pose.nearArm.midJoint,
    dstHalfWidthPx: 25,
  });
  warpPhotorealSegmentToQuad(canvas, bank.nearForearm, {
    dstStart: pose.nearArm.midJoint,
    dstEnd: pose.nearArm.endEffector,
    dstHalfWidthPx: 25,
  });
  const nearHandTip = computeHandTip(pose.nearArm, 9.5);
  warpPhotorealSegmentToQuad(canvas, bank.nearHand, {
    dstStart: pose.nearArm.endEffector,
    dstEnd: nearHandTip,
    dstHalfWidthPx: 22,
  });
}

function computeHandTip(arm: LimbKinematics, handLenPx: number): Point2D {
  const dx = arm.endEffector.x - arm.midJoint.x;
  const dy = arm.endEffector.y - arm.midJoint.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  return {
    x: arm.endEffector.x + (dx / len) * handLenPx,
    y: arm.endEffector.y + (dy / len) * handLenPx,
  };
}

import { FOOT_SHAPE, PALETTE_BY_ID, PERSONA_BY_ID, STAGE_SIZE } from '../shared/constants';
import type { ArmPose, GaitSettings, LegPose, Palette, Point, RunnerPose } from '../shared/types';

export type StageBackground = 'light' | 'dark' | 'transparent';

export interface RenderOptions {
  readonly background?: StageBackground;
  readonly skeleton?: boolean;
  readonly clear?: boolean;
  readonly alpha?: number;
}

const roundedStroke = (
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  color: string,
  width: number,
): void => {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
};

const joint = (
  context: CanvasRenderingContext2D,
  point: Point,
  radius: number,
  color: string,
): void => {
  context.fillStyle = color;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
};

const drawLeg = (
  context: CanvasRenderingContext2D,
  leg: LegPose,
  palette: Palette,
  far: boolean,
): void => {
  const skin = far ? '#ba845f' : '#d69a70';
  const pants = far ? '#253245' : palette.shorts;
  const shoe = far ? '#435164' : '#202a35';
  const scale = far ? 0.78 : 1;
  roundedStroke(context, leg.hip, leg.knee, pants, 25 * scale);
  roundedStroke(context, leg.knee, leg.foot.ankle, skin, 15 * scale);
  joint(context, leg.hip, 9 * scale, pants);
  joint(context, leg.knee, 7 * scale, skin);
  context.save();
  context.translate(leg.foot.ankle.x, leg.foot.ankle.y);
  context.rotate(leg.foot.pitch);
  context.fillStyle = shoe;
  context.beginPath();
  context.roundRect(
    FOOT_SHAPE.heelX,
    FOOT_SHAPE.topY,
    FOOT_SHAPE.toeX - FOOT_SHAPE.heelX,
    FOOT_SHAPE.soleY - FOOT_SHAPE.topY,
    FOOT_SHAPE.radius,
  );
  context.fill();
  context.fillStyle = far ? '#778393' : '#f1f2ec';
  context.fillRect(FOOT_SHAPE.heelX, FOOT_SHAPE.soleY - 4, FOOT_SHAPE.toeX - FOOT_SHAPE.heelX, 4);
  context.restore();
};

const drawArm = (
  context: CanvasRenderingContext2D,
  arm: ArmPose,
  palette: Palette,
  far: boolean,
): void => {
  const skin = far ? '#ad7858' : '#d69a70';
  const sleeve = far ? palette.shade : palette.primary;
  const scale = far ? 0.78 : 1;
  roundedStroke(context, arm.shoulder, arm.elbow, sleeve, 18 * scale);
  roundedStroke(context, arm.elbow, arm.wrist, skin, 11 * scale);
  joint(context, arm.elbow, 5 * scale, skin);
  joint(context, arm.wrist, 6 * scale, skin);
};

const drawTorso = (context: CanvasRenderingContext2D, pose: RunnerPose, palette: Palette): void => {
  context.save();
  context.translate(pose.hip.x, pose.hip.y);
  context.rotate(pose.torsoAngle);
  context.fillStyle = palette.shorts;
  context.beginPath();
  context.roundRect(-24, -6, 50, 33, 11);
  context.fill();
  context.fillStyle = palette.primary;
  context.beginPath();
  context.moveTo(-21, 1);
  context.lineTo(18, 1);
  context.lineTo(20, -44);
  context.quadraticCurveTo(11, -88, -4, -112);
  context.lineTo(-24, -109);
  context.lineTo(-27, -43);
  context.closePath();
  context.fill();
  context.fillStyle = palette.shade;
  context.beginPath();
  context.moveTo(-24, -108);
  context.lineTo(-8, -110);
  context.lineTo(-3, -76);
  context.lineTo(-22, -77);
  context.closePath();
  context.fill();
  context.fillStyle = palette.accent;
  context.beginPath();
  context.roundRect(12, -102, 5, 26, 2);
  context.fill();
  context.restore();
};

const drawNeck = (context: CanvasRenderingContext2D, pose: RunnerPose): void => {
  roundedStroke(context, pose.shoulder, pose.neck, '#d69a70', 16);
};

const drawHead = (
  context: CanvasRenderingContext2D,
  pose: RunnerPose,
  settings: GaitSettings,
): void => {
  const persona = PERSONA_BY_ID[settings.persona];
  context.save();
  context.translate(pose.head.x, pose.head.y);
  context.rotate(pose.torsoAngle * 0.25);
  context.fillStyle = '#d69a70';
  context.beginPath();
  context.ellipse(0, 0, 18 * persona.headScale, 22 * persona.headScale, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#2a241f';
  context.beginPath();
  context.ellipse(
    -1,
    -9,
    19 * persona.headScale,
    12 * persona.headScale,
    -0.12,
    Math.PI,
    Math.PI * 2,
  );
  context.lineTo(12, -2);
  context.lineTo(5, 0);
  context.closePath();
  context.fill();
  if (persona.ponytail) {
    roundedStroke(
      context,
      { x: -12, y: -7 },
      { x: -32, y: 3 + Math.sin(pose.phase * Math.PI * 2) * 4 },
      '#2a241f',
      7,
    );
  }
  context.fillStyle = '#202329';
  context.beginPath();
  context.ellipse(9, -1, 1.6, 2.2, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const drawBackground = (
  context: CanvasRenderingContext2D,
  theme: Exclude<StageBackground, 'transparent'>,
): void => {
  const dark = theme === 'dark';
  const gradient = context.createLinearGradient(0, 0, STAGE_SIZE.width, STAGE_SIZE.height);
  gradient.addColorStop(0, dark ? '#253039' : '#f7f8f5');
  gradient.addColorStop(1, dark ? '#171f26' : '#e9eee8');
  context.fillStyle = gradient;
  context.fillRect(0, 0, STAGE_SIZE.width, STAGE_SIZE.height);
  context.strokeStyle = dark ? 'rgba(231, 242, 232, 0.08)' : 'rgba(42, 67, 57, 0.06)';
  context.lineWidth = 1;
  for (let x = 24; x < STAGE_SIZE.width; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, STAGE_SIZE.height);
    context.stroke();
  }
  context.strokeStyle = dark ? 'rgba(231, 242, 232, 0.12)' : 'rgba(42, 67, 57, 0.08)';
  for (let y = 34; y < STAGE_SIZE.groundY; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(STAGE_SIZE.width, y);
    context.stroke();
  }
  context.fillStyle = dark ? '#74828a' : '#d3dbd2';
  context.fillRect(0, STAGE_SIZE.groundY, STAGE_SIZE.width, 2);
  context.fillStyle = dark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(23, 35, 30, 0.10)';
  context.beginPath();
  context.ellipse(STAGE_SIZE.width / 2, STAGE_SIZE.groundY + 10, 100, 11, 0, 0, Math.PI * 2);
  context.fill();
};

const drawSkeleton = (context: CanvasRenderingContext2D, pose: RunnerPose): void => {
  const bone = '#167a6f';
  const point = '#d0f77a';
  roundedStroke(context, pose.hip, pose.shoulder, bone, 4);
  roundedStroke(context, pose.shoulder, pose.neck, bone, 3);
  roundedStroke(context, pose.neck, pose.head, bone, 3);
  for (const leg of [pose.farLeg, pose.nearLeg]) {
    roundedStroke(context, leg.hip, leg.knee, bone, 3);
    roundedStroke(context, leg.knee, leg.foot.ankle, bone, 3);
  }
  for (const arm of [pose.farArm, pose.nearArm]) {
    roundedStroke(context, arm.shoulder, arm.elbow, bone, 3);
    roundedStroke(context, arm.elbow, arm.wrist, bone, 3);
  }
  for (const jointPoint of [
    pose.hip,
    pose.shoulder,
    pose.neck,
    pose.head,
    pose.nearLeg.knee,
    pose.farLeg.knee,
    pose.nearArm.elbow,
    pose.farArm.elbow,
  ]) {
    joint(context, jointPoint, 4, point);
  }
};

export const renderRunner = (
  context: CanvasRenderingContext2D,
  pose: RunnerPose,
  settings: GaitSettings,
  options: RenderOptions = {},
): void => {
  const palette = PALETTE_BY_ID[settings.palette];
  const background = options.background ?? 'light';
  if (options.clear ?? true) context.clearRect(0, 0, STAGE_SIZE.width, STAGE_SIZE.height);
  if (background !== 'transparent') drawBackground(context, background);

  context.save();
  context.globalAlpha = options.alpha ?? 1;
  drawLeg(context, pose.farLeg, palette, true);
  drawArm(context, pose.farArm, palette, true);
  drawNeck(context, pose);
  drawTorso(context, pose, palette);
  drawHead(context, pose, settings);
  drawLeg(context, pose.nearLeg, palette, false);
  drawArm(context, pose.nearArm, palette, false);
  if (options.skeleton) drawSkeleton(context, pose);
  context.restore();
};

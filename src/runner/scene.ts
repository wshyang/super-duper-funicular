import type {
  BodyPartId,
  GaitSettings,
  PoseFrame,
  Primitive,
  RenderScene,
  ScenePart,
  Vec2,
} from '../shared/types.ts';
import { CANVAS, PALETTE_BY_ID, PART_ORDER, PERSONA_BY_ID } from '../shared/constants.ts';
import { solvePose, rigFor } from './pose.ts';
import { add, normalize, rotate, scale, vec } from './vec.ts';
import {
  capsule,
  circle,
  darken,
  ellipsePoints,
  limb,
  polygon,
  shine,
  OUTLINE,
  OUTLINE_FAR,
} from './scene-shapes.ts';

const SHOE = '#2e3644';

export { darken, lighten, mixHex } from './scene-shapes.ts';
export type { ToneOptions } from './scene-shapes.ts';

const shoePrimitives = (foot: PoseFrame['pose']['nearLeg']['foot'], far: boolean): Primitive[] => {
  const outline = far ? OUTLINE_FAR : OUTLINE;
  const body = far ? darken(SHOE, 0.3) : SHOE;
  const sole = far ? '#171b22' : '#e8e5dc';
  const accent = far ? '#7f3b36' : '#c02822';
  const soleOffset = vec(0, 2.4);
  return [
    capsule(add(foot.heel, soleOffset), add(foot.toe, soleOffset), 2.1, sole, {
      outline,
      outlineWidth: 0.7,
    }),
    capsule(foot.heel, foot.ball, 6.7, body, { outline }),
    capsule(foot.ball, foot.toe, 5.5, body, { outline }),
    capsule(add(foot.heel, vec(1, -2.4)), add(foot.ball, vec(3, -2.6)), 1.3, accent, {
      outlineWidth: 0,
    }),
  ];
};

const shoePart = (
  foot: PoseFrame['pose']['nearLeg']['foot'],
  far: boolean,
  side: 'near' | 'far',
  sock: string,
): ScenePart => ({
  part: side === 'far' ? 'farFoot' : 'nearFoot',
  primitives: [
    ...shoePrimitives(foot, far),
    circle(add(foot.ankle, vec(0, -1)), 5.4, sock, {
      outline: far ? OUTLINE_FAR : OUTLINE,
      outlineWidth: 0.9,
    }),
  ],
});

const torsoPart = (frame: PoseFrame, primary: string, accent: string, torso: number): ScenePart => {
  const { hip, torsoAngleRad } = frame.pose;
  const local = (x: number, y: number): Vec2 => add(hip, rotate(vec(x, y), torsoAngleRad));
  const body = [
    local(-22, -1),
    local(18, -1),
    local(25, -torso * 0.42),
    local(23, -torso * 0.8),
    local(13, -torso * 0.96),
    local(-2, -torso * 1.0),
    local(-14, -torso * 0.98),
    local(-23, -torso * 0.82),
    local(-24, -torso * 0.36),
  ];
  const stripe = [local(18, -4), local(22, -5), local(25, -torso * 0.48), local(20, -torso * 0.48)];
  const yoke = [
    local(-14, -torso * 0.97),
    local(-2, -torso * 1.0),
    local(13, -torso * 0.96),
    local(10, -torso * 0.82),
    local(-15, -torso * 0.83),
  ];
  return {
    part: 'torso',
    primitives: [
      polygon(body, primary),
      polygon(stripe, accent, { alpha: 0.92 }),
      polygon(yoke, darken(primary, 0.3)),
    ],
  };
};

const pelvisPart = (frame: PoseFrame, shorts: string, accent: string): ScenePart => {
  const { hip, torsoAngleRad } = frame.pose;
  const local = (x: number, y: number): Vec2 => add(hip, rotate(vec(x, y), torsoAngleRad * 0.35));
  const body = [
    local(-22, -7),
    local(20, -7),
    local(24, 8),
    local(18, 22),
    local(-16, 23),
    local(-24, 9),
  ];
  const band = [local(-22, -9), local(20, -9), local(21, -1), local(-22, -1)];
  return {
    part: 'pelvis',
    primitives: [polygon(body, shorts), polygon(band, accent, { alpha: 0.95 })],
  };
};

const headPart = (
  frame: PoseFrame,
  skin: string,
  skinShade: string,
  hair: string,
  headRx: number,
  headRy: number,
): ScenePart => {
  const { headCenter, headAngleRad } = frame.pose;
  const local = (x: number, y: number): Vec2 => add(headCenter, rotate(vec(x, y), headAngleRad));
  const skull = ellipsePoints(headCenter, headRx, headRy, headAngleRad);
  const nose = [local(headRx - 1.5, -1.5), local(headRx + 6, 4), local(headRx - 2.5, 6)];
  const hairCap = ellipsePoints(
    add(headCenter, rotate(vec(-1.5, -3.6), headAngleRad)),
    headRx + 2.3,
    headRy + 1.5,
    headAngleRad,
    22,
  ).filter((point) => point.y < headCenter.y - headRy * 0.2);
  const eye = circle(local(headRx * 0.5, -2.8), 1.55, '#20232a', { outlineWidth: 0 });
  const ear = circle(local(-headRx * 0.58, 2.2), 3.6, skinShade, { outlineWidth: 0.7 });
  const jaw = [local(headRx * 0.28, 8), local(headRx * 0.62, 6.6), local(headRx * 0.34, 12.6)];
  return {
    part: 'head',
    primitives: [
      polygon(skull, skin),
      polygon(hairCap, hair),
      polygon(nose, skinShade, { outlineWidth: 0.9 }),
      polygon(jaw, skinShade, { outlineWidth: 0 }),
      ear,
      eye,
      capsule(local(headRx * 0.3, -7), local(headRx * 0.8, -7.5), 0.9, darken(hair, 0.1), {
        outlineWidth: 0,
      }),
    ],
  };
};

const hairPart = (
  frame: PoseFrame,
  hair: string,
  hasPonytail: boolean,
  headAngle: number,
): ScenePart => {
  if (!hasPonytail) {
    const tuft = add(frame.pose.headCenter, rotate(vec(-14, -9), headAngle));
    return { part: 'hairAccessory', primitives: [circle(tuft, 6.5, hair, { outlineWidth: 0 })] };
  }
  const [base, mid, tip, end] = frame.pose.ponytail as [Vec2, Vec2, Vec2, Vec2];
  return {
    part: 'hairAccessory',
    primitives: [
      capsule(base, mid, 5.4, hair),
      capsule(mid, tip, 4.4, hair),
      capsule(tip, end, 3.1, hair),
      circle(add(end, vec(-1, 1)), 2.4, hair, { outlineWidth: 0 }),
    ],
  };
};

const armParts = (frame: PoseFrame, far: boolean, skin: string, radius: number): ScenePart[] => {
  const arm = far ? frame.pose.farArm : frame.pose.nearArm;
  const suffix = far ? 'far' : 'near';
  return [
    limb(
      `${suffix}UpperArm`,
      arm.shoulder,
      arm.elbow,
      radius,
      skin,
      far,
      circle(arm.shoulder, radius * 0.96, darken(skin, 0.16), { outlineWidth: 0 }),
    ),
    limb(
      `${suffix}Forearm`,
      arm.elbow,
      arm.wrist,
      radius * 0.9,
      skin,
      far,
      circle(arm.elbow, radius * 0.86, darken(skin, 0.18), { outlineWidth: 0 }),
    ),
    {
      part: `${suffix}Hand`,
      primitives: [
        circle(arm.wrist, radius * 0.58, darken(skin, 0.1), {
          outline: far ? OUTLINE_FAR : OUTLINE,
          outlineWidth: 0.9,
        }),
        circle(arm.hand, radius * 0.78, skin, {
          outline: far ? OUTLINE_FAR : OUTLINE,
          outlineWidth: 0.9,
        }),
      ],
    },
  ];
};

const sockPrimitives = (
  ankle: Vec2,
  knee: Vec2,
  far: boolean,
  sock: string,
  radius: number,
): Primitive[] => {
  const direction = normalize(vec(ankle.x - knee.x, ankle.y - knee.y));
  const top = add(ankle, scale(direction, -26));
  return [
    capsule(ankle, top, radius, far ? darken(sock, 0.22) : sock, {
      outline: far ? OUTLINE_FAR : OUTLINE,
      outlineWidth: 0.9,
    }),
  ];
};

const legParts = (
  frame: PoseFrame,
  far: boolean,
  skin: string,
  width: number,
  socks: string,
): ScenePart[] => {
  const leg = far ? frame.pose.farLeg : frame.pose.nearLeg;
  const suffix = far ? 'far' : 'near';
  const shin = limb(
    `${suffix}Shin`,
    leg.knee,
    leg.ankle,
    width * 0.93,
    skin,
    far,
    circle(leg.knee, width * 0.82, darken(skin, 0.2), { outlineWidth: 0 }),
  );
  return [
    limb(
      `${suffix}Thigh`,
      leg.hip,
      leg.knee,
      width,
      skin,
      far,
      circle(leg.hip, width * 0.9, darken(skin, 0.14), { outlineWidth: 0 }),
    ),
    {
      ...shin,
      primitives: [
        ...shin.primitives,
        ...sockPrimitives(leg.ankle, leg.knee, far, socks, width * 0.62),
      ],
    },
    shoePart(leg.foot, far, far ? 'far' : 'near', socks),
  ];
};

const skeletonLines = (frame: PoseFrame): Vec2[][] => {
  const { pose } = frame;
  return [
    [pose.hip, pose.shoulder, pose.neckBase, pose.neckTop, pose.headCenter],
    [pose.hip, pose.nearLeg.knee, pose.nearLeg.ankle, pose.nearLeg.foot.toe],
    [pose.hip, pose.farLeg.knee, pose.farLeg.ankle, pose.farLeg.foot.toe],
    [pose.shoulder, pose.nearArm.elbow, pose.nearArm.wrist, pose.nearArm.hand],
    [pose.shoulder, pose.farArm.elbow, pose.farArm.wrist, pose.farArm.hand],
    [vec(0, CANVAS.groundY), vec(CANVAS.width, CANVAS.groundY)],
  ];
};

export interface SceneOptions {
  readonly visibleParts?: readonly BodyPartId[];
  readonly dimHidden?: boolean;
}

export const buildScene = (
  settings: GaitSettings,
  phase: number,
  options: SceneOptions = {},
): RenderScene => {
  const frame = solvePose(settings, phase);
  const persona = PERSONA_BY_ID[settings.persona];
  const palette = PALETTE_BY_ID[settings.palette];
  const rig = rigFor(settings);
  const visible = options.visibleParts;
  const nearSkin = persona.skin;
  const farSkin = darken(persona.skin, 0.3);
  const socks = darken(palette.primary, 0.08);
  const parts: ScenePart[] = [
    ...armParts(frame, true, farSkin, rig.farLimbWidth),
    ...legParts(frame, true, farSkin, rig.farLimbWidth, socks),
    pelvisPart(frame, palette.shorts, palette.accent),
    {
      part: 'neck',
      primitives: [
        capsule(frame.pose.neckBase, frame.pose.neckTop, 7.4, nearSkin),
        shine(frame.pose.neckBase, frame.pose.neckTop, 7.4),
      ],
    },
    hairPart(frame, persona.hair, persona.ponytail, frame.pose.headAngleRad),
    torsoPart(frame, palette.primary, palette.accent, rig.torso),
    headPart(frame, nearSkin, persona.skinShade, persona.hair, rig.headRadiusX, rig.headRadiusY),
    ...legParts(frame, false, nearSkin, rig.nearLimbWidth, socks),
    ...armParts(frame, false, nearSkin, rig.nearLimbWidth * 0.95),
  ];
  const ordered = PART_ORDER.map((id) => parts.find((part) => part.part === id)).filter(
    (part): part is ScenePart => part !== undefined,
  );
  const filtered = visible ? ordered.filter((part) => visible.includes(part.part)) : ordered;
  return {
    width: CANVAS.width,
    height: CANVAS.height,
    groundY: CANVAS.groundY,
    parts: filtered,
    skeleton: skeletonLines(frame),
  };
};

export { ellipsePoints };

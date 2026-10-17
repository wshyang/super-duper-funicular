import type { BodyMetrics } from "../rig/body.ts";
import type { Vec2 } from "../geometry/vec.ts";
import { vec } from "../geometry/vec.ts";
import type { PhotoPartId } from "./cut.ts";

/** A separately photographed far-side limb, so the inside surface is real. */
export interface PhotoFarPart {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** Pivot inside the crop, in scaled plate pixels. */
  readonly pivot: readonly [number, number];
  /** The bone's angle in its own reference photo. */
  readonly neutral: number;
  /** Traced silhouette in crop pixels, SVG path data (even-odd). */
  readonly shape?: string;
}

/** One cut-out in the manifest, in plate pixels. */
export interface PhotoPart {
  readonly id: PhotoPartId;
  readonly file: string;
  readonly fileFar: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Pivot inside the crop, in plate pixels, measured from its top-left. */
  readonly pivot: readonly [number, number];
  /** Traced silhouette in crop pixels, SVG path data (even-odd). */
  readonly shape?: string;
  readonly far?: PhotoFarPart;
}

export interface PhotoRig {
  readonly id: string;
  readonly label: string;
  readonly image: string;
  /** Real-world stature in metres; the gait solver scales footfalls with it. */
  readonly statureMetres?: number;
  /** Ball-and-socket joints cut into the near plates. */
  readonly links?: readonly {
    readonly joint: string;
    readonly parent: PhotoPartId;
    readonly child: PhotoPartId | null;
    readonly radius: number;
  }[];
  /** Plate pixels per body height: the conversion between photo and world. */
  readonly pixelsPerBody: number;
  readonly scale: { readonly soleY: number; readonly crownY: number };
  readonly joints: Readonly<Record<string, readonly [number, number]>>;
  readonly neutralAngles: Readonly<Record<string, number>>;
  readonly pose?: {
    readonly armSwing?: number;
    readonly armBias?: number;
    readonly elbowFlex?: number;
  };
  readonly parts: readonly PhotoPart[];
}

/** Applies a rig's posture adjustments to the shared gait parameters. */
export function photoGait<T extends { armSwing: number; armBias: number; elbowFlex: number }>(
  gait: T,
  rig: PhotoRig,
): T {
  return { ...gait, ...(rig.pose ?? {}) };
}

/** Human names for the atlas cells, matching the vector rig's vocabulary. */
export const PHOTO_PART_LABELS: Readonly<Record<PhotoPartId, string>> = {
  head: "Head",
  neck: "Neck",
  torso: "Torso",
  upperArm: "Upper arm",
  forearm: "Forearm",
  thigh: "Thigh",
  shin: "Shin",
  shoe: "Hindfoot",
  shoeToe: "Forefoot",
};

export const PHOTO_PART_ORDER: readonly PhotoPartId[] = [
  "head",
  "neck",
  "torso",
  "upperArm",
  "forearm",
  "thigh",
  "shin",
  "shoe",
  "shoeToe",
];

export function parsePhotoRig(json: unknown): PhotoRig {
  const rig = json as PhotoRig;
  if (rig === null || typeof rig !== "object" || !Array.isArray(rig.parts)) {
    throw new Error("Photo rig manifest is malformed");
  }
  if (rig.parts.length !== PHOTO_PART_ORDER.length) {
    throw new Error(`Photo rig must have ${PHOTO_PART_ORDER.length} parts, got ${rig.parts.length}`);
  }
  for (const id of PHOTO_PART_ORDER) {
    if (!rig.parts.some((part) => part.id === id)) throw new Error(`Photo rig is missing part ${id}`);
  }
  if (!(rig.pixelsPerBody > 0)) throw new Error("Photo rig has no pixel scale");
  return rig;
}

export const partById = (rig: PhotoRig, id: PhotoPartId): PhotoPart => {
  const part = rig.parts.find((candidate) => candidate.id === id);
  if (part === undefined) throw new Error(`Unknown photo part ${id}`);
  return part;
};

/**
 * Body metrics measured off the plate, so the IK solves to the same limb
 * lengths the photograph actually has. The invariant every persona shares
 * holds here too: hip + torso + neck + head offset + head radius = 1.
 */
export function photoBodyMetrics(rig: PhotoRig): BodyMetrics {
  const per = rig.pixelsPerBody;
  const joint = (id: string): [number, number] => (rig.joints[id] as [number, number] | undefined) ?? [0, 0];
  const [hipX, hipY] = joint("hip");
  const [shoulderX, shoulderY] = joint("shoulder");
  const [neckX, neckY] = joint("neckBase");
  const [headX, headY] = joint("headBase");
  const [kneeX, kneeY] = joint("knee");
  const [ankleX, ankleY] = joint("ankle");
  const [ballX] = joint("ball");
  const [toeX] = joint("toe");
  const [heelX] = joint("heel");
  const [elbowX, elbowY] = joint("elbow");
  const [wristX, wristY] = joint("wrist");
  const [chinX, chinY] = joint("chin");
  const sole = rig.scale.soleY;
  const crown = rig.scale.crownY;
  const across = (x: number, originX: number) => (x - originX) / per;
  const up = (y: number) => (sole - y) / per;
  const headCentreY = (crown + chinY) / 2;
  return {
    id: rig.id,
    statureMetres: rig.statureMetres ?? 1.61,
    height: 1,
    ankleHeight: up(ankleY),
    thighLength: Math.hypot(kneeX - hipX, kneeY - hipY) / per,
    shinLength: Math.hypot(ankleX - kneeX, ankleY - kneeY) / per,
    legLength: Math.hypot(ankleX - hipX, ankleY - hipY) / per,
    hipStandHeight: up(hipY),
    torsoLength: (hipY - neckY) / per,
    neckLength: (neckY - headY) / per,
    headCenterOffset: up(headY) - up(headCentreY),
    headRadiusX: Math.abs(chinX - headX) > 0 ? 0.06 : 0.06,
    headRadiusY: (chinY - crown) / 2 / per,
    upperArmLength: Math.hypot(elbowX - shoulderX, elbowY - shoulderY) / per,
    forearmLength: Math.hypot(wristX - elbowX, wristY - elbowY) / per,
    handRadius: 0.03,
    footHeel: across(heelX, ankleX),
    footBall: across(ballX, ankleX),
    footToe: across(toeX, ankleX),
    footSole: -up(sole) + up(ankleY),
    footTop: 0.02,
    thighTopRadius: 0.062,
    thighKneeRadius: 0.04,
    shinKneeRadius: 0.045,
    shinAnkleRadius: 0.026,
    upperArmTopRadius: 0.04,
    upperArmElbowRadius: 0.026,
    forearmElbowRadius: 0.03,
    forearmWristRadius: 0.018,
    chestDepth: 0.08,
    waistDepth: 0.058,
    hipDepth: 0.08,
    shortsLength: 0.09,
    sockHeight: 0.11,
    sleeveLength: 0.06,
    shoulderAt: (hipY - shoulderY) / (hipY - neckY),
    farLimbOffset: 0.014,
  };
}

/** The photo's neutral joint positions in world body units, for diagnostics. */
export function neutralJoints(rig: PhotoRig): Readonly<Record<string, Vec2>> {
  const [hipX] = rig.joints.hip ?? [0, 0];
  const toWorld = ([x, y]: readonly [number, number]): Vec2 =>
    vec((x - hipX) / rig.pixelsPerBody, (rig.scale.soleY - y) / rig.pixelsPerBody);
  return Object.fromEntries(Object.entries(rig.joints).map(([key, value]) => [key, toWorld(value)]));
}

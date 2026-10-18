export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Rgba {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type LandmarkId = string;

export interface CalibrationPose {
  readonly poseId: string;
  readonly plate: string;
  readonly schemaVersion: number;
  readonly placedBy: string;
  readonly landmarks: Readonly<Record<LandmarkId, readonly number[]>>;
}

export interface PartExtractSpec {
  readonly partId: string;
  readonly sourcePose: string;
  readonly proximal: LandmarkId;
  readonly distal: LandmarkId;
  readonly canonical: 'down' | 'forward';
  readonly competeWith: readonly (readonly [LandmarkId, LandmarkId])[];
  readonly radiusFactor: number;
  readonly sleeve?: readonly [LandmarkId, LandmarkId];
}

export interface PartMeta {
  readonly partId: string;
  readonly sourcePose: string;
  readonly pivots: { readonly proximal: Point2D; readonly distal: Point2D };
  readonly restLength: number;
  readonly halfWidth: number;
  readonly canonical: 'down' | 'forward';
  readonly zOrder: number;
  readonly relightScale: number;
}

export const Z_ORDER: Readonly<Record<string, number>> = {
  farUpperArm: 1, farForearm: 2, farHand: 3, farThigh: 4, farShin: 5, farFoot: 6,
  pelvis: 7, neck: 8, hairAccessory: 9, torso: 10, head: 11,
  nearThigh: 12, nearShin: 13, nearFoot: 14, nearUpperArm: 15, nearForearm: 16, nearHand: 17,
};

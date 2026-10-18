/**
 * Shared value types. Image space: origin top-left, +x right (the direction the
 * subject faces), +y down. Every length carries `Px` unless it is a ratio.
 */

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface RasterImage {
  readonly width: number;
  readonly height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  readonly data: Uint8ClampedArray;
}

export const MATERIALS = ['skin', 'skinFar', 'fabric', 'fabricFar', 'footwear', 'footwearFar', 'hair'] as const;
export type MaterialId = (typeof MATERIALS)[number];

/** A tapered capsule: the set of points within a linearly interpolated radius of segment a→b. */
export interface Capsule {
  readonly a: Point2D;
  readonly b: Point2D;
  readonly radiusStart: number;
  readonly radiusEnd: number;
  readonly material: MaterialId;
}

/** One articulated body part, resolved for a single frame. */
export interface LimbSegment {
  readonly id: string;
  readonly side: 'near' | 'far';
  readonly capsule: Capsule;
}

export interface FootRoll {
  readonly ankle: Point2D;
  readonly ball: Point2D;
  readonly toe: Point2D;
  readonly heel: Point2D;
  readonly contact: 'stance' | 'heel-off' | 'toe-off' | 'swing';
}

export interface PoseFrame {
  readonly phase: number;
  readonly frameIndex: number;
  readonly pelvis: Point2D;
  readonly torsoTop: Point2D;
  readonly headCenter: Point2D;
  readonly hairTip: Point2D;
  readonly nearLeg: LimbSegment[];
  readonly farLeg: LimbSegment[];
  readonly nearArm: LimbSegment[];
  readonly farArm: LimbSegment[];
  readonly torso: Capsule;
  readonly pelvisCapsule: Capsule;
  readonly neck: Capsule;
  readonly head: Capsule;
  readonly hair: Capsule;
  readonly nearFoot: FootRoll;
  readonly farFoot: FootRoll;
  readonly groundY: number;
}

export interface RigSpec {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly groundY: number;
  readonly pelvisRestY: number;
  readonly pelvisRestX: number;
  readonly torsoLength: number;
  readonly neckLength: number;
  readonly headRadius: number;
  readonly hairLength: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly handLength: number;
  readonly thighLength: number;
  readonly shinLength: number;
  readonly footLength: number;
  readonly hipHalfWidth: number;
  readonly torsoHalfWidth: number;
  readonly limbRadius: Readonly<Record<'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin', number>>;
}

export interface GaitConfig {
  readonly cadenceHz: number;
  readonly strideLengthPx: number;
  readonly stanceDuty: number;
  readonly forwardLeanDeg: number;
  readonly footLiftPx: number;
  readonly armSwingScale: number;
  readonly kneeFlexScale: number;
  readonly pelvisBouncePx: number;
  readonly neckCounterScale: number;
}

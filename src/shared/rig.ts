import type { Point2D, RasterImage } from './types.js';

export type { Point2D, RasterImage };

/**
 * 16-DOF side-view rig specification. All angles in radians, absolute in screen
 * space (y down): limb angles measured from straight down (+ = forward/+x);
 * foot angle measured from the +x axis (+ = toe below horizontal).
 */
export interface SkeletonSpec {
  readonly pelvisX: number;
  readonly pelvisY: number;
  readonly torsoPitchRad: number;
  readonly headTiltRad: number;
  readonly nearThighRad: number;
  readonly nearShinRad: number;
  readonly nearFootRad: number;
  readonly farThighRad: number;
  readonly farShinRad: number;
  readonly farFootRad: number;
  readonly nearShoulderRad: number;
  readonly nearElbowRad: number;
  readonly nearHandRad: number;
  readonly farShoulderRad: number;
  readonly farElbowRad: number;
  readonly farHandRad: number;
}

export const SKELETON_PARAM_COUNT = 16;

export interface RigLimbChain {
  readonly root: Point2D;
  readonly mid: Point2D;
  readonly tip: Point2D;
  readonly end: Point2D;
}

export interface RigPose {
  readonly pelvis: Point2D;
  readonly waist: Point2D;
  readonly collar: Point2D;
  readonly neckBase: Point2D;
  readonly headCenter: Point2D;
  readonly headRadiusPx: number;
  readonly nearArm: RigLimbChain;
  readonly farArm: RigLimbChain;
  readonly nearLeg: RigLimbChain;
  readonly farLeg: RigLimbChain;
  readonly figureHeightPx: number;
}

export type ArticulatedPartId =
  | 'farUpperArm' | 'farForearm' | 'farHand'
  | 'farThigh' | 'farShin' | 'farFoot'
  | 'pelvis' | 'torso' | 'head'
  | 'nearThigh' | 'nearShin' | 'nearFoot'
  | 'nearUpperArm' | 'nearForearm' | 'nearHand';

export const ARTICULATED_PART_IDS: readonly ArticulatedPartId[] = [
  'farUpperArm', 'farForearm', 'farHand',
  'farThigh', 'farShin', 'farFoot',
  'pelvis', 'torso', 'head',
  'nearThigh', 'nearShin', 'nearFoot',
  'nearUpperArm', 'nearForearm', 'nearHand',
];

/** Paint order for lossless reassembly (far → core → near). */
export const REASSEMBLY_ORDER: readonly ArticulatedPartId[] = [
  'farUpperArm', 'farForearm', 'farHand',
  'farThigh', 'farShin', 'farFoot',
  'pelvis', 'torso', 'head',
  'nearThigh', 'nearShin', 'nearFoot',
  'nearUpperArm', 'nearForearm', 'nearHand',
];

export interface PartManifestEntry {
  readonly partId: ArticulatedPartId;
  readonly pivot: Point2D;
  readonly distalTip: Point2D | null;
  readonly boneAxisRad: number;
  readonly lengthPx: number;
  readonly meanWidthPx: number;
  readonly bbox: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly pngPath: string;
  readonly opaquePixelCount: number;
}

export interface ReassemblyMetrics {
  readonly silhouetteIoU: number;
  readonly alphaMismatchFraction: number;
  readonly meanAbsRgbDiff: number;
}

export interface KeyAtlasManifest {
  readonly keyPath: string;
  readonly phase: number;
  readonly figureHeightPx: number;
  readonly fitSilhouetteIoU: number;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly parts: Readonly<Record<ArticulatedPartId, PartManifestEntry>>;
  readonly reassembly: ReassemblyMetrics;
}

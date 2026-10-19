import type { BodyPartId, Point2D } from '../shared/types.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import type { ArticulatedPose } from '../shared/types.js';

/** Shared contracts for measured pose material (see docs/POSE_MATERIAL_ACCEPTANCE.md). */
/** Material measured further than this from a target bone is not a candidate. */
export const ANGLE_TOLERANCE_DEG = 18;

export type MaterialStatus = 'accepted' | 'conditional' | 'rejected' | 'material-gap';

export type VisibilityScore = 0 | 1 | 2 | 3;

export interface SilhouetteMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly count: number;
  readonly headCentroid: Point2D;
  readonly faceWidthPx: number;
}

export interface CapsuleSpec {
  readonly partId: BodyPartId;
  readonly start: Point2D;
  readonly end: Point2D;
  readonly halfWidth: number;
}

export interface Registration {
  readonly scale: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly poseF1: number;
  readonly figureHeightPx: number;
}

export interface LimbFit {
  readonly partId: BodyPartId;
  readonly found: boolean;
  readonly angleRad: number;
  readonly targetAngleRad: number;
  readonly angleErrorRad: number;
  readonly deviationRad: number;
  readonly start: Point2D;
  readonly end: Point2D;
  readonly halfWidthPx: number;
  readonly coverage: number;
  readonly isolation: number;
  readonly widthAgreement: number;
  readonly visibility: VisibilityScore;
}

export interface PartEligibility {
  readonly partId: BodyPartId;
  readonly side: 'near' | 'far' | 'midline';
  readonly fit: LimbFit;
  readonly eligible: boolean;
  readonly reasonCodes: readonly string[];
  readonly bucketDeg: number | null;
}

export interface SourceEvidence {
  readonly sourceId: string;
  readonly path: string;
  readonly sha256: string;
  readonly role: 'master' | 'pose-bank' | 'phase-harvest';
  readonly wardrobe: 'clothed' | 'anatomy-study';
  readonly width: number;
  readonly height: number;
  readonly figureHeightPx: number;
  readonly faceWidthPx: number;
  readonly faceScaleRatio: number;
  readonly backgroundNoise: number;
  readonly fringeRatio: number;
  readonly interiorLeakRatio: number;
  readonly magentaLeakPixels: number;
  readonly shadowFraction: number;
  readonly registration: Registration | null;
  readonly poseMatchRatio: number;
  readonly parts: readonly PartEligibility[];
  readonly status: MaterialStatus;
  readonly reasonCodes: readonly string[];
}

export interface BucketCoverageEntry {
  readonly partId: BodyPartId;
  readonly bucketDeg: number;
  readonly sources: readonly string[];
}

export interface MaterialGap {
  readonly partId: BodyPartId;
  readonly phaseIndex: number;
  readonly targetAngleDeg: number;
  readonly targetBucketDeg: number;
  readonly reason: string;
}

export interface PoseMaterialAuditReport {
  readonly generatedAt: string;
  readonly masterPath: string;
  readonly sources: readonly SourceEvidence[];
  readonly buckets: readonly BucketCoverageEntry[];
  readonly gaps: readonly MaterialGap[];
  readonly eligibilityCounts: Readonly<Record<string, number>>;
}

export interface RenderedPartMaterial {
  readonly materialId: string;
  readonly partId: BodyPartId;
  readonly sourceId: string;
  readonly sourceSha256: string;
  readonly sourcePath: string;
  readonly measuredAngleDeg: number;
  readonly bucketDeg: number;
  readonly halfWidthPx: number;
  readonly visibility: VisibilityScore;
  readonly sideProvenance: 'pixel' | 'guide-derived';
  readonly cutoutPath: string;
  readonly cutoutSha256: string;
}

export interface PoseMaterialBank {
  readonly schemaVersion: 1;
  readonly personaId: string;
  readonly masterPath: string;
  readonly materials: readonly RenderedPartMaterial[];
}

export interface TargetPartGeometry {
  readonly partId: BodyPartId;
  readonly capsule: CapsuleSpec;
  readonly side: 'near' | 'far' | 'midline';
}

export interface PoseTargetGeometry {
  readonly pose: ArticulatedPose;
  readonly rig: AnatomicalRigSpec;
  readonly parts: readonly TargetPartGeometry[];
  readonly figureTop: number;
  readonly figureBottom: number;
  readonly headCenter: Point2D;
}

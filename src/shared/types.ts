export type RunnerVariantId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type RunnerPersonaId =
  | 'sg-chinese-male'
  | 'sg-chinese-female'
  | 'photo-sg-chinese-female';

export type BackdropVariantId =
  | 'stadium-day'
  | 'stadium-dusk'
  | 'stadium-night'
  | 'magenta-key'
  | 'studio-grid';

export type GaitPhaseName =
  | 'Right Contact (Midfoot Strike)'
  | 'Right Down (Sole Roll & Cushion)'
  | 'Right Pass (Heel-Off & Toe Roll)'
  | 'Right Flight (Forward Fall Drive)'
  | 'Left Contact (Midfoot Strike)'
  | 'Left Down (Sole Roll & Cushion)'
  | 'Left Pass (Heel-Off & Toe Roll)'
  | 'Left Flight (Forward Fall Drive)';

export type FootContactPhase =
  | 'midfoot-strike'
  | 'sole-roll'
  | 'heel-off-roll'
  | 'toe-off'
  | 'swing-recovery'
  | 'flight-reach';

export type BodyPartId =
  | 'farUpperArm'
  | 'farForearm'
  | 'farHand'
  | 'farThigh'
  | 'farShin'
  | 'farFoot'
  | 'pelvis'
  | 'torso'
  | 'neck'
  | 'head'
  | 'hairAccessory'
  | 'nearThigh'
  | 'nearShin'
  | 'nearFoot'
  | 'nearUpperArm'
  | 'nearForearm'
  | 'nearHand';

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Point2D {
  readonly x: number;
  readonly y: number;
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
  readonly data: Uint8ClampedArray;
}

export interface RunnerPalette {
  readonly id: RunnerVariantId;
  readonly label: string;
  readonly jerseyMain: string;
  readonly jerseyShadow: string;
  readonly jerseyHighlight: string;
  readonly shortsMain: string;
  readonly shortsShadow: string;
  readonly sockMain: string;
  readonly sockShadow: string;
  readonly skinNear: string;
  readonly skinFar: string;
  readonly hairMain: string;
  readonly shoeMain: string;
  readonly shoeSole: string;
  readonly outline: string;
}

export interface ExtractedFrameEntry {
  readonly variant: RunnerVariantId;
  readonly frameIndex: number;
  readonly row: number;
  readonly col: number;
  readonly publicUrl: string;
  readonly filePath: string;
  readonly cellBounds: BoundingBox;
  readonly spriteBoundsInCell: BoundingBox;
  readonly anchorPoint: Point2D;
  readonly foregroundPixels: number;
  readonly pixelSha256: string;
  readonly dHash64: string;
  readonly isDuplicateInRow: boolean;
  readonly duplicateOfFrame: number | null;
  readonly duplicateSimilarityIoU: number;
}

export interface ExtractedSheetManifest {
  readonly schemaVersion: string;
  readonly sourceImage: string;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
  readonly headerHeight: number;
  readonly rows: number;
  readonly cols: number;
  readonly outputWidth: number;
  readonly outputHeight: number;
  readonly totalExtractedFrames: number;
  readonly uniquePosesPerRow: number;
  readonly totalUniquePoses: number;
  readonly variants: readonly RunnerVariantId[];
  readonly frames: readonly ExtractedFrameEntry[];
}

export interface FramePairSimilarity {
  readonly frameA: number;
  readonly frameB: number;
  readonly silhouetteIoU: number;
  readonly dHashHammingDistance: number;
  readonly isHalfCycleDuplicate: boolean;
}

export interface FrameBiomechanicalMetrics {
  readonly frameIndex: number;
  readonly bboxWidth: number;
  readonly bboxHeight: number;
  readonly headTopY: number;
  readonly footBottomY: number;
  readonly centroidX: number;
  readonly centroidY: number;
  readonly frontFootOffsetX: number;
  readonly rearFootOffsetX: number;
  readonly footSeparationPx: number;
  readonly leadLegSide: 'unilateral-same-leg';
}

export interface FlawItemReport {
  readonly id: string;
  readonly severity: 'critical' | 'major' | 'moderate';
  readonly title: string;
  readonly summary: string;
  readonly quantitativeEvidence: string;
  readonly biomechanicalImpact: string;
  readonly algorithmicFix: string;
}

export interface SpriteFlawAnalysisReport {
  readonly schemaVersion: string;
  readonly analyzedSheetPath: string;
  readonly claimedCycleLabel: string;
  readonly actualUniquePoseCountPerRow: number;
  readonly meanHalfCycleIoU: number;
  readonly minFootSeparationPx: number;
  readonly verticalBaselineJitterPx: number;
  readonly heightVariationPx: number;
  readonly iouMatrixRedRow: readonly (readonly number[])[];
  readonly halfCyclePairs: readonly FramePairSimilarity[];
  readonly frameMetrics: readonly FrameBiomechanicalMetrics[];
  readonly flaws: readonly FlawItemReport[];
}

export interface DedupeFileEntry {
  readonly originalPath: string;
  readonly filedPath: string;
  readonly assetCategory: 'spritesheet-reference' | 'spritesheet-algorithmic' | 'backdrop';
  readonly width: number;
  readonly height: number;
  readonly byteSize: number;
  readonly byteSha256: string;
  readonly pixelSha256: string;
  readonly dHash64: string;
  readonly status: 'active' | 'deprecated';
  readonly supersededBy: string | null;
  readonly description: string;
}

export interface ImageCatalogManifest {
  readonly schemaVersion: string;
  readonly totalFilesScanned: number;
  readonly uniqueFilesFiled: number;
  readonly duplicateFilesRemoved: number;
  readonly intraSheetTotalCells: number;
  readonly intraSheetUniqueCells: number;
  readonly intraSheetDuplicateCells: number;
  readonly entries: readonly DedupeFileEntry[];
}

export interface AlgorithmicBodyPartEntry {
  readonly partId: BodyPartId;
  readonly label: string;
  readonly layerOrder: number;
  readonly side: 'far' | 'center' | 'near';
  readonly parentJoint: string;
  readonly childJoint: string;
  readonly lengthPx: number;
  readonly thicknessPx: number;
  readonly publicUrl: string;
  readonly femalePublicUrl: string;
  readonly photoFemalePublicUrl?: string;
}

export interface AlgorithmicManifest {
  readonly schemaVersion: string;
  readonly sheetPath: string;
  readonly publicSheetUrl: string;
  readonly femaleSheetPath: string;
  readonly femalePublicSheetUrl: string;
  readonly frameCount: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly personas: readonly RunnerPersonaId[];
  readonly variants: readonly RunnerVariantId[];
  readonly frameUrlsByVariant: Readonly<Record<RunnerVariantId, readonly string[]>>;
  readonly femaleFrameUrlsByVariant: Readonly<Record<RunnerVariantId, readonly string[]>>;
  readonly bodyParts: readonly AlgorithmicBodyPartEntry[];
}

export type LocomotionModeId = 'run' | 'walk' | 'brisk-walk';

export interface GaitConfig {
  readonly locomotionMode?: LocomotionModeId;
  readonly cadenceHz: number;
  readonly strideLengthScale: number;
  readonly kneeDriveScale: number;
  readonly armSwingScale: number;
  readonly forwardLeanDeg: number;
  readonly neckMotionScale: number;
  readonly footRollScale: number;
  readonly bounceAmplitudeScale: number;
  readonly pixelScale: 1 | 2 | 3;
}

export interface LimbKinematics {
  readonly hipOrShoulder: Point2D;
  readonly midJoint: Point2D;
  readonly endEffector: Point2D;
  readonly heelPoint: Point2D;
  readonly ballPoint: Point2D;
  readonly tipPoint: Point2D;
  readonly upperAngleRad: number;
  readonly lowerAngleRad: number;
  readonly distalAngleRad: number;
  readonly toeAngleRad: number;
  readonly heelLiftPx: number;
  readonly contactPhase: FootContactPhase;
  readonly isGrounded: boolean;
}

export interface ArticulatedPose {
  readonly phase: number;
  readonly canonicalFrameIndex: number;
  readonly phaseName: GaitPhaseName;
  readonly groundY: number;
  readonly pelvis: Point2D;
  readonly chest: Point2D;
  readonly collar: Point2D;
  readonly neck: Point2D;
  readonly headCenter: Point2D;
  readonly hairAnchor: Point2D;
  readonly hairTip: Point2D;
  readonly torsoAngleRad: number;
  readonly neckAngleRad: number;
  readonly headAngleRad: number;
  readonly hairAngleRad: number;
  readonly pelvisTiltRad: number;
  readonly fallForwardComLeadPx: number;
  readonly nearLeg: LimbKinematics;
  readonly farLeg: LimbKinematics;
  readonly nearArm: LimbKinematics;
  readonly farArm: LimbKinematics;
  readonly isFlightPhase: boolean;
  readonly footCrossoverDeltaX: number;
}

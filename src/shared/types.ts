export type PaletteId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
export type MotionId = 'run' | 'walk' | 'brisk-walk';
export type PersonaId = 'sprinter' | 'strider';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Palette {
  readonly id: PaletteId;
  readonly label: string;
  readonly primary: string;
  readonly shade: string;
  readonly accent: string;
  readonly shorts: string;
}

export interface Persona {
  readonly id: PersonaId;
  readonly label: string;
  readonly scale: number;
  readonly headScale: number;
  readonly ponytail: boolean;
}

export interface MotionProfile {
  readonly id: MotionId;
  readonly label: string;
  readonly cadence: number;
  readonly dutyFactor: number;
  readonly stride: number;
  readonly lift: number;
  readonly leanDeg: number;
  readonly flight: boolean;
}

export interface GaitSettings {
  readonly persona: PersonaId;
  readonly palette: PaletteId;
  readonly motion: MotionId;
  readonly speed: number;
}

export interface FootPose {
  readonly ankle: Point;
  readonly heel: Point;
  readonly toe: Point;
  readonly pitch: number;
  readonly stance: boolean;
}

export interface LegPose {
  readonly hip: Point;
  readonly knee: Point;
  readonly foot: FootPose;
}

export interface ArmPose {
  readonly shoulder: Point;
  readonly elbow: Point;
  readonly wrist: Point;
}

export interface RunnerPose {
  readonly phase: number;
  readonly hip: Point;
  readonly shoulder: Point;
  readonly neck: Point;
  readonly head: Point;
  readonly torsoAngle: number;
  readonly nearLeg: LegPose;
  readonly farLeg: LegPose;
  readonly nearArm: ArmPose;
  readonly farArm: ArmPose;
  readonly flight: boolean;
}

export interface GridSpec {
  readonly rows: number;
  readonly columns: number;
  readonly headerPx: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
}

export interface PixelImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface FrameRecord {
  readonly id: string;
  readonly palette: PaletteId;
  readonly row: number;
  readonly column: number;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly bounds: readonly [number, number, number, number];
  readonly pixelSha256: string;
  readonly fileSha256: string;
  readonly exactDuplicateOf: string | null;
  /** Strong magenta or residual magenta-fringe edge pixels left by the key. */
  readonly magentaSpill: number;
}

export interface SpriteManifest {
  readonly generator: string;
  readonly source: {
    readonly path: string;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
  };
  readonly grid: GridSpec;
  readonly frames: readonly FrameRecord[];
}

export interface DuplicateMeasurement {
  readonly first: string;
  readonly second: string;
  readonly centroidAlignedIoU: number;
}

export interface FrameMeasurement {
  readonly id: string;
  readonly palette: PaletteId;
  readonly column: number;
  readonly silhouettePixels: number;
  readonly bounds: readonly [number, number, number, number];
  readonly centroid: Point;
  readonly lowerBandClusterCount: number;
  readonly lowerBandSeparationPx: number;
}

export interface RowMeasurement {
  readonly palette: PaletteId;
  readonly frameHeightRangePx: number;
  readonly baselineRangePx: number;
  readonly nearDuplicatePairs: readonly DuplicateMeasurement[];
  readonly quarterCyclePairs: readonly DuplicateMeasurement[];
}

export interface SourceAnalysis {
  readonly sourceSha256: string;
  readonly frameCount: number;
  readonly paletteCount: number;
  readonly nearDuplicateThreshold: number;
  readonly exactDuplicateCount: number;
  readonly magentaSpillPixels: number;
  readonly frames: readonly FrameMeasurement[];
  readonly rows: readonly RowMeasurement[];
}

/**
 * Single typed-contract source (GREENFIELD §6, ADD-005): manifests, analysis
 * reports and render settings are typed here once and consumed by the browser
 * views, the Node tools and the tests.
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Bounds {
  readonly width: number;
  readonly height: number;
}

export interface ExtractedFrame {
  readonly id: string;
  readonly palette: PaletteId;
  readonly frame: number;
  readonly url: string;
  readonly sha256: string;
  readonly dHash64: string;
  readonly bounds: Bounds;
  readonly pivot: Vec2;
  readonly groundY: number;
}

export type PaletteId =
  | 'crimson'
  | 'cobalt'
  | 'leaf'
  | 'sunshine'
  | 'violet'
  | 'tangerine';

export interface SheetGeometry {
  readonly sourceSha256: string;
  readonly sourceSize: Bounds;
  readonly headerHeight: number;
  readonly rowTops: readonly number[];
  readonly columnLefts: readonly number[];
  readonly rows: number;
  readonly columns: number;
}

export interface SpriteManifest {
  readonly version: 1;
  readonly generatedBy: string;
  readonly sheet: SheetGeometry;
  readonly canvas: Bounds;
  readonly frames: readonly ExtractedFrame[];
}

export interface FlawReport {
  readonly version: 1;
  readonly sourceSha256: string;
  readonly flaws: readonly FlawFinding[];
  readonly halfCycleIou: readonly number[];
  readonly meanHalfCycleIou: number;
  readonly meanAdjacentIou: number;
  readonly groundJitterPx: number;
  readonly centroidDriftPx: number;
  readonly heightVariancePx: number;
  readonly minFootSeparationPx: number;
  readonly leadSwaps: number;
}

export interface FlawFinding {
  readonly id: 'FLAW-01' | 'FLAW-02' | 'FLAW-03' | 'FLAW-04' | 'FLAW-05';
  readonly severity: 'critical' | 'major' | 'moderate';
  readonly title: string;
  readonly detected: boolean;
  readonly evidence: string;
}

export type MotionId = 'run' | 'walk' | 'brisk-walk';
export type PersonaId = 'wei-ming' | 'mei-lin';

export interface MotionProfile {
  readonly id: MotionId;
  readonly label: string;
  readonly cadenceStepsPerMin: number;
  readonly stanceDuty: number;
  readonly doubleSupportDuty: number;
  readonly footTravelPx: number;
  readonly footLiftPx: number;
  readonly leanRad: number;
  readonly armSwingRad: number;
  readonly elbowFlexRad: number;
  readonly pelvisHeightPx: number;
}

export interface PersonaPalette {
  readonly skin: string;
  readonly skinFar: string;
  readonly hair: string;
  readonly top: string;
  readonly bottom: string;
  readonly shoe: string;
  readonly shoeFar: string;
}

export interface Persona {
  readonly id: PersonaId;
  readonly label: string;
  readonly scale: number;
  readonly palette: PersonaPalette;
}

export type SupportState = 'near-stance' | 'far-stance' | 'double-support' | 'flight';

export interface PoseJoint {
  readonly hip: Vec2;
  readonly shoulder: Vec2;
  readonly neckBase: Vec2;
  readonly headCenter: Vec2;
  readonly knee: Readonly<Record<Side, Vec2>>;
  readonly ankle: Readonly<Record<Side, Vec2>>;
  readonly toe: Readonly<Record<Side, Vec2>>;
  readonly heel: Readonly<Record<Side, Vec2>>;
  readonly elbow: Readonly<Record<Side, Vec2>>;
  readonly wrist: Readonly<Record<Side, Vec2>>;
}

export type Side = 'near' | 'far';

export interface Pose {
  readonly phase: number;
  readonly motion: MotionId;
  readonly support: SupportState;
  readonly joints: PoseJoint;
  readonly torsoLeanRad: number;
  readonly neckPitchRad: number;
  readonly headPitchRad: number;
  readonly footPitch: Readonly<Record<Side, number>>;
}

export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type PaintOp =
  | { readonly kind: 'capsule'; readonly a: Vec2; readonly b: Vec2; readonly radius: number; readonly color: string }
  | { readonly kind: 'polygon'; readonly points: readonly Vec2[]; readonly color: string }
  | { readonly kind: 'circle'; readonly center: Vec2; readonly radius: number; readonly color: string }
  | { readonly kind: 'segment'; readonly a: Vec2; readonly b: Vec2; readonly width: number; readonly color: string };

export interface RenderOptions {
  readonly width: number;
  readonly height: number;
  readonly background: 'light' | 'dark' | 'transparent';
  readonly skeleton: boolean;
  readonly onionPhases: readonly number[];
}

export interface CycleMetrics {
  readonly minFootSeparationPx: number;
  readonly crossovers: number;
  readonly leadSwaps: number;
  readonly flightPhases: number;
  readonly doubleSupportPhases: number;
  readonly maxBoneLengthError: number;
  readonly soleClearanceMinPx: number;
}

/** Shared, single-source domain contracts for pipeline, engine, UI and tools. */

export type PaletteId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
export type MotionId = 'run' | 'brisk-walk' | 'walk';
export type PersonaId = 'wei-ming' | 'mei-lin';
export type GaitSide = 'near' | 'far';

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Palette {
  readonly id: PaletteId;
  readonly label: string;
  readonly primary: string;
  readonly primaryDark: string;
  readonly accent: string;
  readonly shorts: string;
}

export interface Persona {
  readonly id: PersonaId;
  readonly name: string;
  readonly pronoun: string;
  readonly skin: string;
  readonly skinShade: string;
  readonly hair: string;
  readonly scale: number;
  readonly ponytail: boolean;
}

export interface GaitSettings {
  readonly persona: PersonaId;
  readonly palette: PaletteId;
  readonly motion: MotionId;
  readonly cadence: number;
  readonly stride: number;
  readonly footLift: number;
  readonly lean: number;
}

export interface FootState {
  readonly ankle: Vec2;
  readonly heel: Vec2;
  readonly ball: Vec2;
  readonly toe: Vec2;
  readonly pitchRad: number;
  readonly isStance: boolean;
  readonly progress: number;
}

export interface LimbChain {
  readonly hip: Vec2;
  readonly knee: Vec2;
  readonly ankle: Vec2;
  readonly foot: FootState;
}

export interface ArmChain {
  readonly shoulder: Vec2;
  readonly elbow: Vec2;
  readonly wrist: Vec2;
  readonly hand: Vec2;
  readonly angleRad: number;
}

export interface BodyPose {
  readonly origin: Vec2;
  readonly hip: Vec2;
  readonly shoulder: Vec2;
  readonly neckBase: Vec2;
  readonly neckTop: Vec2;
  readonly headCenter: Vec2;
  readonly headAngleRad: number;
  readonly torsoAngleRad: number;
  readonly nearLeg: LimbChain;
  readonly farLeg: LimbChain;
  readonly nearArm: ArmChain;
  readonly farArm: ArmChain;
  readonly ponytail: readonly Vec2[];
}

export interface PoseFrame {
  readonly phase: number;
  readonly pose: BodyPose;
  readonly isFlight: boolean;
  readonly isDoubleSupport: boolean;
}

export type BodyPartId =
  | 'farUpperArm'
  | 'farForearm'
  | 'farHand'
  | 'farThigh'
  | 'farShin'
  | 'farFoot'
  | 'pelvis'
  | 'neck'
  | 'hairAccessory'
  | 'torso'
  | 'head'
  | 'nearThigh'
  | 'nearShin'
  | 'nearFoot'
  | 'nearUpperArm'
  | 'nearForearm'
  | 'nearHand';

export interface Primitive {
  readonly kind: 'polygon' | 'circle' | 'capsule';
  readonly points?: readonly Vec2[];
  readonly center?: Vec2;
  readonly a?: Vec2;
  readonly b?: Vec2;
  readonly radius?: number;
  readonly fill: string;
  readonly outline?: string;
  readonly outlineWidth?: number;
  readonly alpha?: number;
}

export interface ScenePart {
  readonly part: BodyPartId;
  readonly primitives: readonly Primitive[];
}

export interface RenderScene {
  readonly width: number;
  readonly height: number;
  readonly groundY: number;
  readonly parts: readonly ScenePart[];
  readonly skeleton: readonly (readonly Vec2[])[];
}

export interface ReferenceFrame {
  readonly id: string;
  readonly palette: PaletteId;
  readonly column: number;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly bounds: readonly [number, number, number, number];
  readonly pivot: readonly [number, number];
  readonly sha256: string;
  readonly duplicateOf: string | null;
}

export interface SpriteManifest {
  readonly generatedBy: string;
  readonly source: {
    readonly path: string;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
  };
  readonly layout: {
    readonly rows: number;
    readonly columns: number;
    readonly headerPx: number;
    readonly cellWidth: number;
    readonly cellHeight: number;
  };
  readonly canvas: { readonly width: number; readonly height: number };
  readonly frames: readonly ReferenceFrame[];
}

export interface DuplicatePair {
  readonly a: string;
  readonly b: string;
  readonly iou: number;
}

export interface FlawAnalysis {
  readonly generatedBy: string;
  readonly frameCount: number;
  readonly uniqueCount: number;
  readonly duplicateThreshold: number;
  readonly meanDuplicateIou: number;
  readonly maxDuplicateIou: number;
  readonly duplicatePairs: readonly DuplicatePair[];
  readonly nearDuplicates: readonly DuplicatePair[];
  readonly scaleJitterPx: number;
  readonly baselineJitterPx: number;
  readonly minFootSeparationPx: number;
  readonly maxFootSeparationPx: number;
  readonly leadLegLockRatio: number;
  readonly crossoverFrames: number;
  readonly findings: readonly string[];
}

export type ParityStatus = 'yes' | 'partial' | 'gap' | 'unverified';

export interface BranchTip {
  readonly name: string;
  readonly branch: string;
  readonly hash: string;
  readonly committedAt: string;
  readonly subject: string;
}

export interface BranchTipsFile {
  readonly observedAt: string;
  readonly tips: readonly BranchTip[];
}

export interface VectorFrameEntry {
  readonly id: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly bands: number;
  readonly paths: number;
  readonly points: number;
  readonly bytes: number;
  readonly maskIou: number;
  readonly colourAgreement: number;
}

export interface VectorManifest {
  readonly generatedBy: string;
  readonly options: {
    readonly maxColors: number;
    readonly tolerance: number;
    readonly minArea: number;
  };
  readonly frames: readonly VectorFrameEntry[];
  readonly meanMaskIou: number;
  readonly meanColourAgreement: number;
}

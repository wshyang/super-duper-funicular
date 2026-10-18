export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface RasterImage {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

export interface PlateKind {
  readonly kind: 'master' | 'key';
}

export interface PlateRecord {
  readonly path: string;
  readonly kind: 'master' | 'key';
  readonly canonicalPhase: number | null;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly pixelSha256: string;
  readonly dHash64: string;
}

export interface ConformanceMetrics {
  readonly heightFraction: number;
  readonly widthFraction: number;
  readonly minDHashHammingToOthers: number | null;
  readonly soleBaselineYInPlate: number;
  readonly contactClass: 'stance' | 'flight';
  readonly passed: boolean;
  readonly failureReasons: readonly string[];
}

export interface KeyframeRecord extends PlateRecord {
  readonly canonicalPhase: number;
  readonly conformance: ConformanceMetrics;
}

export interface CanvasSpec {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly groundY: number;
}

export interface FrameRegistry {
  readonly personaId: string;
  readonly canvas: CanvasSpec;
  readonly masterPath: string;
  readonly masterHeightFraction: number;
  readonly keys: readonly KeyframeRecord[];
  readonly generatedAtUtc: string;
}

export interface ComposedFrameRecord {
  readonly phase: number;
  readonly baseKeyPhase: number;
  readonly blendKeyPhase: number | null;
  readonly blendWeight: number;
  readonly liftPx: number;
}

export interface SilhouetteBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly pixelCount: number;
}

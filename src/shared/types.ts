/**
 * Shared typed contracts — Stage 1 placeholder (FDS §3, CLAUDE-conventions).
 * Full types arrive in Stage 2 (port from arena/917ef347 src/shared/types.ts + persona + motion extensions).
 */

export type ColorVariant = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
export type PersonaId = 'sg-chinese-female' | 'sg-chinese-male' | 'photo-sg-chinese-female';
export type LocomotionModeId = 'run' | 'walk' | 'brisk-walk';

export interface FiledImageAsset {
  filedPath: string;
  assetCategory: 'spritesheet-reference' | 'spritesheet-algorithmic' | 'photo-studio-plate' | 'backdrop';
  pixelSha256: string;
  dHash64: string;
  status: 'active' | 'deprecated';
  supersededBy: string | null;
}

export interface ExtractedFrame {
  variant: ColorVariant;
  frameIndex: number; // 1..8
  publicUrl: string;
  isDuplicateInRow: boolean;
}

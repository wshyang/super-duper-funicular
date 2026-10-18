import type { KeyAtlasManifest, RasterImage, RigPose } from '../../src/shared/rig.js';

export interface KeyExtraction {
  readonly keyFile: string;
  readonly phase: number;
  readonly manifest: KeyAtlasManifest;
  readonly keyed: RasterImage;
  readonly pose: RigPose;
}

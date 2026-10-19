import type { PhotorealAssetTuningSpec, RunnerPersonaId, RunnerVariantId } from '../shared/types.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import { RUNNER_PALETTES } from '../runner/palette.js';
import { renderRunnerPoseToRaster } from '../runner/rasterizer.js';
import {
  buildSilhouetteMask,
  measurePoseF1,
  registerSilhouette,
} from './pose-silhouette.js';
import type { PoseTargetGeometry } from './pose-material-types.js';

export interface PoseCalibrationEntry {
  readonly phaseIndex: number;
  readonly ceilingF1: number;
  readonly figureHeightPx: number;
}

/**
 * The capsule target is an approximation of the rig's own rendered silhouette
 * (clothing, rounded caps and shoes are not capsules). Measuring the rig against
 * its own target gives the achievable ceiling, so a generated plate can be
 * scored as a fraction of what the renderer itself can reach. Without this every
 * comparison silently compares "photo versus capsule" with "capsule versus
 * capsule".
 */
export function calibratePoseCeilings(params: {
  readonly targets: readonly PoseTargetGeometry[];
  readonly rig: AnatomicalRigSpec;
  readonly tuning: PhotorealAssetTuningSpec;
  readonly personaId: RunnerPersonaId;
  readonly variant: RunnerVariantId;
}): PoseCalibrationEntry[] {
  return params.targets.map((target, index) => {
    const rendered = renderRunnerPoseToRaster({
      pose: target.pose,
      palette: RUNNER_PALETTES[params.variant],
      pixelScale: 1,
      personaId: params.personaId,
      assetTuning: params.tuning,
    });
    const mask = buildSilhouetteMask(rendered);
    const registration = registerSilhouette(mask, target);
    return {
      phaseIndex: index,
      ceilingF1: measurePoseF1(mask, registration, target),
      figureHeightPx: registration.figureHeightPx,
    };
  });
}

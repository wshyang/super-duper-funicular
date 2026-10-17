import { compositeOver, type Raster } from "../pipeline/raster.ts";
import { DEFAULT_BODY, fullLegLength, type BodyProportions } from "./body-proportions.ts";
import { DEFAULT_GAIT, sampleGait, type GaitParameters } from "./gait.ts";
import { buildBodyOps } from "./paint-ops.ts";
import { colorsFor, type RunnerVariant } from "./palette.ts";
import { buildSkeletonOverlayOps } from "./skeleton-overlay.ts";
import { addOutline, paintLayer, type ScreenFrame } from "./rasterize.ts";
import { buildSkeleton, type Skeleton } from "./skeleton.ts";

/** Low-resolution frame: the browser scales it up with nearest-neighbour sampling for a pixel-art look. */
export const RUNNER_SCREEN: ScreenFrame = {
  width: 128,
  height: 144,
  scale: 1.2,
  originX: 64,
  groundRow: 136,
};

export interface RunnerFrameRequest {
  readonly phase: number;
  readonly variant: RunnerVariant;
  readonly gait: GaitParameters;
  readonly body: BodyProportions;
}

export function defaultRequest(phase: number, variant: RunnerVariant): RunnerFrameRequest {
  return { phase, variant, gait: DEFAULT_GAIT, body: DEFAULT_BODY };
}

export function skeletonFor(request: RunnerFrameRequest): Skeleton {
  const sample = sampleGait(request.phase, fullLegLength(request.body), request.gait);
  return buildSkeleton(sample, request.body);
}

/** The figure alone, with a one-pixel outline, transparent elsewhere. */
export function renderRunnerFrame(request: RunnerFrameRequest): Raster {
  const colors = colorsFor(request.variant);
  const ops = buildBodyOps(skeletonFor(request), request.body, colors);
  return addOutline(paintLayer(RUNNER_SCREEN, ops), colors.outline);
}

/** Bones and joints only, transparent elsewhere. Composite over a frame to inspect the rig. */
export function renderSkeletonOverlay(request: RunnerFrameRequest): Raster {
  return paintLayer(RUNNER_SCREEN, buildSkeletonOverlayOps(skeletonFor(request)));
}

/** Figure with the skeleton drawn on top. */
export function renderRunnerWithSkeleton(request: RunnerFrameRequest): Raster {
  return compositeOver(renderRunnerFrame(request), renderSkeletonOverlay(request), { x: 0, y: 0 });
}

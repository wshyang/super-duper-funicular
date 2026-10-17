import { useMemo } from "react";
import { type Raster, compositeOver } from "../../pipeline/raster.ts";
import { findVariant } from "../../runner/palette.ts";
import { defaultRequest, renderRunnerFrame, renderSkeletonOverlay } from "../../runner/render-frame.ts";

/** The procedural frame for a phase, with the skeleton composited on top when requested. */
export function useRunnerRaster(phase: number, variantId: string, showSkeleton: boolean): Raster {
  return useMemo(() => {
    const request = defaultRequest(phase, findVariant(variantId));
    const body = renderRunnerFrame(request);
    return showSkeleton ? compositeOver(body, renderSkeletonOverlay(request), { x: 0, y: 0 }) : body;
  }, [phase, variantId, showSkeleton]);
}

/** Eight evenly spaced frames across one cycle, for the filmstrip. */
export function useFilmstrip(variantId: string, frameCount: number): Raster[] {
  return useMemo(() => {
    const variant = findVariant(variantId);
    return Array.from({ length: frameCount }, (_, index) => renderRunnerFrame(defaultRequest(index / frameCount, variant)));
  }, [variantId, frameCount]);
}

import type { GaitParameters } from "../../lib/gait/gait.ts";
import { groundSpeed } from "../../lib/gait/gait.ts";
import { stanceHalfReach } from "../../lib/gait/gait.ts";
import type { View } from "../../lib/render/paint.ts";

export interface Footprint {
  /** World x where the foot landed, in body heights. */
  readonly originX: number;
  /** Ground distance travelled when the foot landed. */
  readonly bornDistance: number;
}

export interface TrailState {
  readonly footprints: readonly Footprint[];
  readonly distance: number;
}

export const EMPTY_TRAIL: TrailState = { footprints: [], distance: 0 };

const TRAIL_LIFETIME = 1.6;
const MAX_FOOTPRINTS = 18;
const VIEW_HEIGHT_RATIO = 0.72;
const VIEW_GROUND_RATIO = 0.86;
const VIEW_ORIGIN_X = 0.46;

/** Fits the generated figure into the canvas: one body height is the scale. */
export function viewForCanvas(width: number, height: number): View {
  return {
    scale: height * VIEW_HEIGHT_RATIO,
    originX: width * VIEW_ORIGIN_X,
    groundY: height * VIEW_GROUND_RATIO,
  };
}

/** Adds a footprint each time a new stance begins (twice per cycle). */
export function advanceTrail(trail: TrailState, gait: GaitParameters, phase: number, delta: number): TrailState {
  const distance = trail.distance + groundSpeed(gait) * delta;
  const stanceIndex = Math.floor(phase * 2);
  const previousIndex = Math.floor(((phase - delta / gait.cycleSeconds) % 1 + 1) % 1 * 2);
  const landed = stanceIndex !== previousIndex;
  const landedAt = stanceHalfReach(gait) + gait.contactOffset;
  const fresh = landed
    ? [...trail.footprints, { originX: landedAt, bornDistance: distance }].slice(-MAX_FOOTPRINTS)
    : [...trail.footprints];
  const alive = fresh.filter((footprint) => distance - footprint.bornDistance <= TRAIL_LIFETIME * groundSpeed(gait) + gait.strideLength);
  return { footprints: alive, distance };
}

/** Screen-space x of a footprint that scrolls backwards at ground speed. */
export function footprintScreenX(footprint: Footprint, trail: TrailState, view: View): number {
  const worldX = footprint.originX - (trail.distance - footprint.bornDistance);
  return view.originX + worldX * view.scale;
}

/** Scale at which one body height maps to pixels, for the body height ruler. */
export const bodyHeightPixels = (view: View): number => view.scale;

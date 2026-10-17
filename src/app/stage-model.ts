import { type GaitSample } from "../runner/gait.ts";
import { wrapPhase } from "../runner/gait.ts";

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 2;
export const DEFAULT_SPEED = 1;
/** Full gait cycles per second at speed 1. */
export const BASE_CYCLES_PER_SECOND = 0.6;

export function clampSpeed(speed: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
}

export function cyclesPerSecond(speed: number): number {
  return BASE_CYCLES_PER_SECOND * clampSpeed(speed);
}

/** Advances a cycle phase by elapsed time. Always returns a phase in [0, 1). */
export function advancePhase(phase: number, elapsedSeconds: number, cyclesPerSec: number): number {
  return wrapPhase(phase + elapsedSeconds * cyclesPerSec);
}

export function contactLabel(sample: GaitSample): string {
  if (sample.near.inStance && sample.far.inStance) return "Double support";
  if (sample.near.inStance) return "Near foot planted";
  if (sample.far.inStance) return "Far foot planted";
  return "Flight: both feet in the air";
}

/** Index of the nearest frame in a cycle of `frameCount` evenly spaced frames. */
export function nearestFrameIndex(phase: number, frameCount: number): number {
  return Math.round(wrapPhase(phase) * frameCount) % frameCount;
}

export function formatPhase(phase: number): string {
  return `${(wrapPhase(phase) * 100).toFixed(1)}%`;
}

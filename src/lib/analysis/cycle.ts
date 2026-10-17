import type { ArticulatedPose } from "../gait/pose.ts";

export interface CycleMetrics {
  readonly crossoverCount: number;
  readonly flightCount: number;
  readonly maxFootDelta: number;
  readonly unilateralLock: boolean;
}

export function analyseCycle(poses: readonly ArticulatedPose[]): CycleMetrics {
  let crossoverCount = 0;
  let flightCount = 0;
  let maxFootDelta = 0;
  let nearAlways = true;
  let farAlways = true;
  for (const pose of poses) {
    if (pose.footCrossover > 0) crossoverCount += 1;
    if (!pose.nearGrounded && !pose.farGrounded) flightCount += 1;
    maxFootDelta = Math.max(maxFootDelta, Math.abs(pose.footCrossover));
    if (!pose.nearGrounded) nearAlways = false;
    if (!pose.farGrounded) farAlways = false;
  }
  return {
    crossoverCount,
    flightCount,
    maxFootDelta,
    unilateralLock: nearAlways || farAlways,
  };
}

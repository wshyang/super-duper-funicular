import type { RunnerPose } from "../gait/pose.ts";

/**
 * A coarse pose fingerprint built from body-relative measurements only, so it
 * is comparable between the reference sprites and the procedural runner:
 * thigh and shin angles for both legs, arm angles, and torso lean.
 */
export function poseSignatureFromLandmarks(pose: RunnerPose): number[] {
  // Angles are mapped to 0..1 over their plausible range so that the mean
  // absolute difference stays comparable to the 0..1 silhouette signature.
  // Continuous normalisation: no binning, so two genuinely different poses
  // cannot collide on a coarse grid.
  const normalise = (value: number, minimum: number, maximum: number) =>
    Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
  const legs = [pose.near.leg, pose.far.leg].flatMap((leg) => [
    normalise(leg.thighAngle, -1.3, 1.3),
    normalise(leg.shinAngle, -1.3, 1.3),
    normalise(leg.ankle.y, 0, 0.55),
  ]);
  const arms = [pose.near.arm, pose.far.arm].flatMap((arm) => [
    normalise(arm.upperAngle, -1.2, 1.2),
    normalise(arm.forearmAngle, -0.6, 2.6),
  ]);
  return [...legs, ...arms, normalise(pose.torsoAngle, -0.1, 0.4)];
}

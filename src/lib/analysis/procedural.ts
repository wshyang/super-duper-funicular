import { DEFAULT_CONTROLS, resolveGait, type GaitParameters } from "../gait/gait.ts";
import { solvePose } from "../gait/pose.ts";
import { MALE_BODY, type BodyMetrics } from "../rig/body.ts";
import type { FrameLandmark } from "./cycle.ts";
import { poseSignatureFromLandmarks } from "./signature.ts";

/**
 * The same landmark set the reference frames are measured with, but taken from
 * the pose model instead of pixels. The lowest point of the figure is the
 * lowest sole point of either foot; a planted foot therefore reads as height 0
 * and an airborne one as a positive clearance, exactly like the sheet.
 */
export function proceduralLandmarks(
  gait: GaitParameters,
  sampleCount: number,
  pixelsPerBody = 231,
  body: BodyMetrics = MALE_BODY,
): FrameLandmark[] {
  const frames: FrameLandmark[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    // Half-frame offset so a short flight window still lands on a sample.
    const pose = solvePose(gait, (index + 0.5) / sampleCount, body);
    const legs = [pose.near.leg, pose.far.leg];
    const soleHeight = Math.min(...legs.map((leg) => leg.foot.contact.y));
    const separation = Math.abs(pose.near.leg.foot.contact.x - pose.far.leg.foot.contact.x);
    frames.push({
      index,
      headX: pose.headCenter.x * pixelsPerBody,
      headY: pose.headCenter.y * pixelsPerBody,
      // Negative so that a planted foot (soleHeight 0) is the maximum, matching
      // the sheet convention where lowestY grows downwards.
      lowestY: -soleHeight * pixelsPerBody,
      height: (pose.headCenter.y + body.headRadiusY) * pixelsPerBody,
      footSeparation: separation * pixelsPerBody,
      signature: poseSignatureFromLandmarks(pose),
    });
  }
  return frames;
}

export const defaultProceduralLandmarks = (sampleCount = 8): FrameLandmark[] => {
  const gait = resolveGait(DEFAULT_CONTROLS);
  return proceduralLandmarks(gait, sampleCount);
};

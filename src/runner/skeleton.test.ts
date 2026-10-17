import { describe, expect, it } from "vitest";
import { DEFAULT_BODY, fullLegLength } from "./body-proportions.ts";
import { DEFAULT_GAIT, SOLE_LINE, sampleGait } from "./gait.ts";
import { buildSkeleton } from "./skeleton.ts";
import { distanceBetween } from "./vector.ts";

function skeletonAt(phase: number) {
  return buildSkeleton(sampleGait(phase, fullLegLength(DEFAULT_BODY), DEFAULT_GAIT), DEFAULT_BODY);
}

describe("buildSkeleton", () => {
  it("preserves every rigid segment length at any phase", () => {
    for (const phase of [0, 0.13, 0.45, 0.72]) {
      const skeleton = skeletonAt(phase);
      expect(distanceBetween(skeleton.hip, skeleton.neck)).toBeCloseTo(DEFAULT_BODY.torsoLength, 6);
      for (const side of [skeleton.near, skeleton.far]) {
        expect(distanceBetween(side.leg.hip, side.leg.knee)).toBeCloseTo(DEFAULT_BODY.thighLength, 6);
        expect(distanceBetween(side.leg.knee, side.leg.ankle)).toBeCloseTo(DEFAULT_BODY.shinLength, 6);
        expect(distanceBetween(side.arm.shoulder, side.arm.elbow)).toBeCloseTo(DEFAULT_BODY.upperArmLength, 6);
        expect(distanceBetween(side.arm.elbow, side.arm.wrist)).toBeCloseTo(DEFAULT_BODY.forearmLength, 6);
      }
    }
  });

  it("plants the stance ankle on the sole line", () => {
    const skeleton = skeletonAt(0.1);
    expect(skeleton.near.leg.ankle.y).toBeCloseTo(SOLE_LINE, 6);
  });

  it("places the head above the neck and the neck above the hip", () => {
    const skeleton = skeletonAt(0.3);
    expect(skeleton.headCenter.y).toBeGreaterThan(skeleton.neck.y);
    expect(skeleton.neck.y).toBeGreaterThan(skeleton.hip.y);
  });
});

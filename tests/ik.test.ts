import { describe, expect, it } from "vitest";
import { interiorAngle, overreach, solveTwoBone } from "../src/lib/gait/ik.ts";
import { distance, vec } from "../src/lib/geometry/vec.ts";

const THIGH = 0.245;
const SHIN = 0.235;

describe("two-bone IK", () => {
  it("reaches a target inside range exactly", () => {
    const solution = solveTwoBone(vec(0, 0.5), vec(0.1, 0.1), THIGH, SHIN, 1);
    expect(solution.isClamped).toBe(false);
    expect(distance(solution.end, vec(0.1, 0.1))).toBeCloseTo(0, 6);
  });

  it("puts the knee forward for a leg whose target is below the hip", () => {
    const solution = solveTwoBone(vec(0, 0.5), vec(0, 0.06), THIGH, SHIN, 1);
    expect(solution.joint.x).toBeGreaterThan(0);
  });

  it("clamps a target beyond full extension instead of producing NaN", () => {
    const solution = solveTwoBone(vec(0, 0), vec(0, -2), THIGH, SHIN, 1);
    expect(solution.isClamped).toBe(true);
    expect(Number.isFinite(solution.joint.x)).toBe(true);
    expect(distance(vec(0, 0), solution.end)).toBeCloseTo(THIGH + SHIN, 3);
  });

  it("keeps bone lengths fixed at every target distance", () => {
    for (let step = 0; step <= 20; step += 1) {
      const target = vec(Math.sin(step * 0.2) * 0.3, 0.08 + Math.cos(step * 0.3) * 0.3);
      const solution = solveTwoBone(vec(0, 0.5), target, THIGH, SHIN, 1);
      expect(distance(vec(0, 0.5), solution.joint)).toBeCloseTo(THIGH, 4);
      expect(distance(solution.joint, solution.end)).toBeCloseTo(SHIN, 4);
    }
  });

  it("reports the interior knee angle as nearly straight at full extension", () => {
    const solution = solveTwoBone(vec(0, 0.48), vec(0, 0), THIGH, SHIN, 1);
    expect(interiorAngle(vec(0, 0.48), solution.joint, solution.end)).toBeCloseTo(Math.PI, 1);
  });

  it("measures overreach so the diagnostics can flag impossible poses", () => {
    expect(overreach(vec(0, 0), vec(0, -1), THIGH, SHIN)).toBeCloseTo(1 - (THIGH + SHIN), 6);
    expect(overreach(vec(0, 0), vec(0, -0.2), THIGH, SHIN)).toBe(0);
  });
});

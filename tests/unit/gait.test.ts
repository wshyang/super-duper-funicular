import { describe, expect, it } from "vitest";
import { DEFAULT_CONTROLS, resolveGait, sampleLeg, wrapPhase } from "../../src/lib/gait/gait.ts";
import { solveTwoBone } from "../../src/lib/gait/ik.ts";
import { solvePose } from "../../src/lib/gait/pose.ts";
import { MALE_BODY } from "../../src/lib/rig/body.ts";
import { analyseCycle } from "../../src/lib/analysis/cycle.ts";
import { vec } from "../../src/lib/geometry/vec.ts";

describe("gait and IK", () => {
  it("wraps negative phases", () => {
    expect(wrapPhase(-0.25)).toBeCloseTo(0.75);
  });

  it("keeps duty factor below 0.5 so flight exists", () => {
    const gait = resolveGait(DEFAULT_CONTROLS);
    expect(gait.dutyFactor).toBeLessThan(0.5);
  });

  it("solves a reachable two-bone chain without clamp", () => {
    const solution = solveTwoBone(vec(0, 0), vec(0, -0.4), 0.245, 0.235, 1);
    expect(solution.isClamped).toBe(false);
    expect(solution.joint.x).toBeGreaterThan(0);
  });

  it("alternates stance and produces crossover across a cycle", () => {
    const gait = resolveGait(DEFAULT_CONTROLS);
    const poses = Array.from({ length: 32 }, (_, i) => solvePose(i / 32, gait, MALE_BODY));
    const metrics = analyseCycle(poses);
    expect(metrics.unilateralLock).toBe(false);
    expect(metrics.crossoverCount).toBeGreaterThan(0);
    expect(metrics.flightCount).toBeGreaterThan(0);
  });

  it("plants the stance ankle near the sole plane", () => {
    const gait = resolveGait(DEFAULT_CONTROLS);
    const stance = sampleLeg(gait, 0.05, MALE_BODY);
    expect(stance.inStance).toBe(true);
    expect(stance.ankle.y).toBeCloseTo(-MALE_BODY.footSole);
  });
});

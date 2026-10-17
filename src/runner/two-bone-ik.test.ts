import { describe, expect, it } from "vitest";
import { solveTwoBone } from "./two-bone-ik.ts";
import { distanceBetween, vec } from "./vector.ts";

const BONES = { first: 23, second: 22 };
const ROOT = vec(0, 40);

describe("solveTwoBone", () => {
  it("keeps both bone lengths and reaches a reachable target exactly", () => {
    const target = vec(10, 22);
    const solution = solveTwoBone(ROOT, target, BONES, 1);
    expect(distanceBetween(ROOT, solution.joint)).toBeCloseTo(BONES.first, 6);
    expect(distanceBetween(solution.joint, solution.end)).toBeCloseTo(BONES.second, 6);
    expect(solution.end.x).toBeCloseTo(target.x, 6);
    expect(solution.end.y).toBeCloseTo(target.y, 6);
  });

  it("bulges the knee forward when the preferred side is +1", () => {
    const solution = solveTwoBone(ROOT, vec(0, 22), BONES, 1);
    expect(solution.joint.x).toBeGreaterThan(0);
  });

  it("bulges the knee backward when the preferred side is -1", () => {
    const solution = solveTwoBone(ROOT, vec(0, 22), BONES, -1);
    expect(solution.joint.x).toBeLessThan(0);
  });

  it("clamps an unreachable target onto the reach circle and keeps bone lengths", () => {
    const solution = solveTwoBone(ROOT, vec(0, -100), BONES, 1);
    expect(distanceBetween(ROOT, solution.end)).toBeCloseTo(BONES.first + BONES.second, 4);
    expect(distanceBetween(ROOT, solution.joint)).toBeCloseTo(BONES.first, 6);
  });
});

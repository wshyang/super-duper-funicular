import { describe, it, expect } from "vitest";
import {
  getPose,
  defaults,
  getFoot,
  distance,
  getArm,
  stance,
} from "../../../src/motion/gait";
describe("analytical running gait", () => {
  it("closes the loop exactly", () =>
    expect(getPose(0, defaults)).toEqual(getPose(1, defaults)));
  it("exchanges feet after half a cycle", () => {
    expect(
      distance(
        getPose(0.18, defaults).near.foot,
        getPose(0.68, defaults).far.foot,
      ),
    ).toBeLessThan(1e-10);
  });
  it("preserves both leg segment lengths over all controls", () => {
    for (const stride of [18, 36, 48])
      for (const lift of [12, 25, 38])
        for (let i = 0; i < 100; i++) {
          const pose = getPose(i / 100, { ...defaults, stride, lift });
          for (const leg of [pose.near, pose.far]) {
            expect(distance(pose.hip, leg.knee)).toBeCloseTo(32, 5);
            expect(distance(leg.knee, leg.foot)).toBeCloseTo(32, 5);
          }
        }
  });
  it("keeps stance on ground and cancels forward travel", () => {
    const a = getFoot(0.1, defaults),
      b = getFoot(0.2, defaults);
    expect(a.y).toBe(0);
    expect(b.y).toBe(0);
    expect(b.x - a.x).toBeCloseTo((-defaults.stride * 0.1) / 0.36);
  });
  it("contains flight and never penetrates the ground", () => {
    const poses = Array.from({ length: 100 }, (_, i) =>
      getPose(i / 100, defaults),
    );
    expect(poses.some((p) => !p.near.isContact && !p.far.isContact)).toBe(true);
    expect(poses.every((p) => p.near.foot.y <= 0 && p.far.foot.y <= 0)).toBe(
      true,
    );
  });
});

describe("articulation and boundary continuity", () => {
  it("keeps arms and torso the same length at every pose", () => {
    for (let i = 0; i < 100; i++) {
      const pose = getPose(i / 100, defaults);
      expect(distance(pose.hip, pose.shoulder)).toBeCloseTo(31, 8);
      const [shoulder, elbow, hand] = getArm(pose, pose.phase);
      expect(distance(shoulder, elbow)).toBeCloseTo(22, 8);
      expect(distance(elbow, hand)).toBeCloseTo(19, 8);
    }
  });
  it("swings the near arm opposite the near leg", () => {
    const pose = getPose(0, defaults);
    const [, elbow] = getArm(pose, pose.phase + 0.5);
    expect(elbow.x - pose.shoulder.x).toBeLessThan(0);
    expect(pose.near.foot.x).toBeGreaterThan(0);
  });
  it("matches foot velocity at toe-off and wraparound", () => {
    const epsilon = 1e-6;
    for (const boundary of [stance, 1]) {
      const before = getFoot(boundary - epsilon, defaults);
      const now = getFoot(boundary, defaults);
      const after = getFoot(boundary + epsilon, defaults);
      expect((now.x - before.x) / epsilon).toBeCloseTo(
        (after.x - now.x) / epsilon,
        2,
      );
      expect((now.y - before.y) / epsilon).toBeCloseTo(
        (after.y - now.y) / epsilon,
        2,
      );
    }
  });
});

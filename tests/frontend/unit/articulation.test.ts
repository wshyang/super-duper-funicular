import { describe, it, expect } from "vitest";
import { getPose, defaults, distance, stance } from "../../../src/motion/gait";

describe("rolling contact and upper-body articulation", () => {
  it("lands flat, then raises the heel around a planted toe", () => {
    const landing = getPose(0, defaults).near.shoe;
    const push = getPose(stance * 0.9, defaults).near.shoe;
    expect(landing.heel.y).toBeCloseTo(landing.toe.y, 8);
    expect(push.toe.y).toBeCloseTo(0, 8);
    expect(push.heel.y).toBeLessThan(-8);
    expect(push.angle).toBeGreaterThan(0.6);
  });
  it("keeps the toe fixed in world space during the roll", () => {
    const a = getPose(stance * 0.6, defaults).near.shoe;
    const b = getPose(stance * 0.9, defaults).near.shoe;
    expect(b.toe.x - a.toe.x).toBeCloseTo(-defaults.stride * 0.3, 8);
  });
  it("keeps soles above ground and bones fixed across the control range", () => {
    for (const lean of [0, 10, 20])
      for (const stride of [18, 48])
        for (const lift of [12, 38]) {
          for (let i = 0; i < 200; i++) {
            const pose = getPose(i / 200, { ...defaults, lean, stride, lift });
            for (const leg of [pose.near, pose.far]) {
              expect(leg.shoe.heel.y).toBeLessThanOrEqual(1e-8);
              expect(leg.shoe.toe.y).toBeLessThanOrEqual(1e-8);
              expect(distance(leg.shoe.heel, leg.shoe.toe)).toBeCloseTo(16, 7);
              expect(distance(pose.hip, leg.knee)).toBeCloseTo(32, 7);
              expect(distance(leg.knee, leg.foot)).toBeCloseTo(32, 7);
            }
          }
        }
  });
  it("closes ankle, sole and head position and velocity at cycle boundaries", () => {
    const epsilon = 1e-6;
    for (const boundary of [stance, 1]) {
      const a = getPose(boundary - epsilon, defaults),
        b = getPose(boundary, defaults),
        c = getPose(boundary + epsilon, defaults);
      for (const point of [
        (p: typeof a) => p.near.foot,
        (p: typeof a) => p.near.shoe.toe,
        (p: typeof a) => p.head,
      ]) {
        for (const axis of ["x", "y"] as const) {
          expect((point(b)[axis] - point(a)[axis]) / epsilon).toBeCloseTo(
            (point(c)[axis] - point(b)[axis]) / epsilon,
            1,
          );
        }
      }
    }
  });
  it("articulates the neck while keeping the head steadier than the torso", () => {
    const a = getPose(0, defaults),
      b = getPose(0.125, defaults);
    expect(distance(a.shoulder, a.neck)).toBeCloseTo(8, 8);
    expect(distance(b.shoulder, b.neck)).toBeCloseTo(8, 8);
    expect(a.neckAngle).not.toBeCloseTo(b.neckAngle, 3);
    expect(Math.abs(a.headAngle)).toBeLessThan(Math.abs(a.torsoAngle));
    expect(a.headAngle - a.torsoAngle).not.toBeCloseTo(
      b.headAngle - b.torsoAngle,
      3,
    );
  });
  it("moves the hips and chest forward with lean, without translating the planted toe", () => {
    const upright = getPose(0.15, { ...defaults, lean: 0 });
    const forward = getPose(0.15, { ...defaults, lean: 20 });
    expect(forward.hip.x).toBeGreaterThan(upright.hip.x + 4);
    expect(forward.shoulder.x).toBeGreaterThan(upright.shoulder.x + 12);
    expect(forward.near.shoe.toe).toEqual(upright.near.shoe.toe);
  });
});

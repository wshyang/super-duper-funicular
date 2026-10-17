import { describe, it, expect } from "vitest";
import {
  getPose,
  getShoe,
  getFoot,
  getArm,
  distance,
} from "../../../src/motion/gait";
import {
  getMotionDefaults,
  motions,
  type MotionType,
} from "../../../src/motion/motions";
describe.each<MotionType>(["walk", "brisk-walk"])("%s mechanics", (motion) => {
  const gait = getMotionDefaults(motion),
    profile = motions[motion];
  it("always has ground support, including two double-support intervals", () => {
    const poses = Array.from({ length: 1000 }, (_, i) =>
      getPose(i / 1000, gait),
    );
    expect(poses.every((p) => p.near.isContact || p.far.isContact)).toBe(true);
    const both =
      poses.filter((p) => p.near.isContact && p.far.isContact).length / 1000;
    expect(both).toBeCloseTo(2 * profile.stance - 1, 2);
  });
  it("lands on the heel and lifts the heel for toe-off", () => {
    const contact = getShoe(0, gait),
      push = getShoe(profile.stance * 0.95, gait);
    expect(contact.heel.y).toBeCloseTo(0, 8);
    expect(contact.toe.y).toBeLessThan(-2);
    expect(push.toe.y).toBeCloseTo(0, 8);
    expect(push.heel.y).toBeLessThan(-5);
  });
  it("locks the supporting heel/toe to the moving ground", () => {
    const a = getShoe(0.02, gait),
      b = getShoe(0.04, gait);
    expect(b.heel.x - a.heel.x).toBeCloseTo(
      (-gait.stride * 0.02) / profile.stance,
      8,
    );
    const c = getShoe(profile.stance * 0.8, gait),
      d = getShoe(profile.stance * 0.9, gait);
    expect(d.toe.x - c.toe.x).toBeCloseTo(-gait.stride * 0.1, 8);
  });
  it("loops and preserves ankle velocity at touchdown and toe-off", () => {
    expect(getPose(0, gait)).toEqual(getPose(1, gait));
    const epsilon = 1e-6;
    for (const boundary of [profile.stance, 1])
      for (const axis of ["x", "y"] as const) {
        const a = getShoe(boundary - epsilon, gait).ankle,
          b = getShoe(boundary, gait).ankle,
          c = getShoe(boundary + epsilon, gait).ankle;
        expect((b[axis] - a[axis]) / epsilon).toBeCloseTo(
          (c[axis] - b[axis]) / epsilon,
          1,
        );
      }
  });
  it("keeps bones fixed and soles above ground at all control extremes", () => {
    for (const stride of profile.limits.stride)
      for (const lift of profile.limits.lift)
        for (const lean of profile.limits.lean)
          for (let i = 0; i < 200; i++) {
            const p = getPose(i / 200, { ...gait, stride, lift, lean });
            for (const leg of [p.near, p.far]) {
              expect(distance(p.hip, leg.knee)).toBeCloseTo(32, 6);
              expect(distance(leg.knee, leg.foot)).toBeCloseTo(32, 6);
              expect(leg.shoe.toe.y).toBeLessThanOrEqual(1e-8);
              expect(leg.shoe.heel.y).toBeLessThanOrEqual(1e-8);
            }
            const [shoulder, elbow, wrist] = getArm(p, p.phase);
            expect(distance(shoulder, elbow)).toBeCloseTo(22, 6);
            expect(distance(elbow, wrist)).toBeCloseTo(19, 6);
          }
  });
  it("has less clearance and straighter relaxed arms than a run", () => {
    const p = getPose(0, gait),
      [, elbow, wrist] = getArm(p, 0);
    expect(wrist.y).toBeGreaterThan(elbow.y + 10);
    expect(
      Math.abs(getFoot(profile.stance + (1 - profile.stance) / 2, gait).y),
    ).toBe(gait.lift);
  });
});

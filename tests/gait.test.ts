import { describe, expect, it } from "vitest";
import { FEMALE_BODY, MALE_BODY } from "../src/lib/rig/body.ts";
import {
  DEFAULT_CONTROLS,
  GAIT_LIMITS,
  groundSpeed,
  hipHeightAt,
  resolveGait,
  sampleLeg,
  supportState,
  wrapPhase,
  type GaitParameters,
} from "../src/lib/gait/gait.ts";
import { plantFoot } from "../src/lib/gait/foot.ts";
import { solvePose } from "../src/lib/gait/pose.ts";

const gait = resolveGait(DEFAULT_CONTROLS);
const body = MALE_BODY;
const SAMPLES = 240;

const phases = (count = SAMPLES) => Array.from({ length: count }, (_, index) => index / count);

describe("phase handling", () => {
  it("wraps negative and over-unity phases into [0, 1)", () => {
    expect(wrapPhase(-0.25)).toBeCloseTo(0.75, 10);
    expect(wrapPhase(2.25)).toBeCloseTo(0.25, 10);
  });

  it("is periodic in every sampled pose", () => {
    const first = solvePose(gait, 0.3, body);
    const looped = solvePose(gait, 1.3, body);
    expect(looped.hipHeight).toBeCloseTo(first.hipHeight, 10);
    expect(looped.near.leg.ankle.x).toBeCloseTo(first.near.leg.ankle.x, 10);
    expect(looped.far.leg.ankle.y).toBeCloseTo(first.far.leg.ankle.y, 10);
  });
});

describe("alternation", () => {
  it("swaps which leg is planted at the half cycle", () => {
    expect(sampleLeg(gait, 0.1, body).inStance).toBe(true);
    expect(sampleLeg(gait, 0.1 + 0.5, body).inStance).toBe(false);
    expect(sampleLeg(gait, 0.6, body).inStance).toBe(false);
    expect(sampleLeg(gait, 0.6 + 0.5, body).inStance).toBe(true);
  });

  it("never has both feet planted (a run has a flight phase)", () => {
    for (const phase of phases()) {
      const both = sampleLeg(gait, phase, body).inStance && sampleLeg(gait, phase + 0.5, body).inStance;
      expect(both).toBe(false);
    }
  });

  it("has at least one foot planted for most of the cycle", () => {
    const flightShare = phases().filter((phase) => supportState(gait, phase) === "flight").length / SAMPLES;
    expect(flightShare).toBeGreaterThan(0.1);
    expect(flightShare).toBeLessThan(0.4);
  });

  it("produces different poses for all 8 evenly spaced frames", () => {
    const keys = new Set<string>();
    for (let index = 0; index < 8; index += 1) {
      const pose = solvePose(gait, index / 8, body);
      keys.add(
        [
          pose.near.leg.thighAngle.toFixed(3),
          pose.far.leg.thighAngle.toFixed(3),
          pose.near.arm.upperAngle.toFixed(3),
        ].join("|"),
      );
    }
    expect(keys.size).toBe(8);
  });

  it("runs the same gait on both personas", () => {
    for (const metrics of [MALE_BODY, FEMALE_BODY]) {
      const pose = solvePose(gait, 0.2, metrics);
      expect(pose.near.leg.ankle.y).toBeGreaterThan(0);
      expect(Number.isFinite(pose.far.leg.knee.x)).toBe(true);
    }
  });
});

describe("foot contact", () => {
  it("keeps every planted sole on the ground line", () => {
    for (const phase of phases()) {
      for (const offset of [0, 0.5]) {
        const leg = sampleLeg(gait, phase + offset, body);
        if (!leg.inStance) continue;
        const pose = solvePose(gait, phase, body);
        const target = offset === 0 ? pose.near.leg : pose.far.leg;
        expect(target.foot.contact.y).toBeCloseTo(0, 3);
      }
    }
  });

  it("slides the planted foot backwards at ground speed", () => {
    const velocity = groundSpeed(gait);
    const dt = 1 / SAMPLES;
    for (const phase of phases(120)) {
      const before = sampleLeg(gait, phase, body);
      const after = sampleLeg(gait, phase + dt, body);
      if (!before.inStance || !after.inStance) continue;
      const dx = (after.ankle.x - before.ankle.x) / (dt * gait.cycleSeconds);
      expect(dx).toBeCloseTo(-velocity, 1);
    }
  });

  it("lifts the swinging foot clear of the ground", () => {
    let peak = 0;
    for (const phase of phases()) {
      const leg = sampleLeg(gait, phase, body);
      if (leg.inStance) continue;
      peak = Math.max(peak, leg.ankle.y);
    }
    expect(peak).toBeGreaterThan(body.ankleHeight * 2);
  });

  it("never drives a foot below the ground", () => {
    for (const phase of phases()) {
      for (const offset of [0, 0.5]) {
        const leg = sampleLeg(gait, phase + offset, body);
        expect(leg.ankle.y).toBeGreaterThan(0);
      }
    }
  });
});

/** Sole gaps in metres above the ground line, for one foot attitude. */
function soleGaps(hind: number, fore: number) {
  const planted = plantFoot(0, hind, fore, body);
  return {
    heel: planted.heel.y,
    ball: planted.ball.y,
    toe: planted.toe.y,
  };
}

describe("foot roll", () => {
  it("lands close to flat, not on a heel spike or a toe stab", () => {
    const at = soleGaps(...stanceAt(0));
    expect(at.heel).toBeLessThan(0.004);
    expect(at.ball).toBeLessThan(0.004);
    expect(at.toe).toBeLessThan(0.006);
  });

  it("keeps the sole flat while the body passes over the foot", () => {
    const at = soleGaps(...stanceAt(0.4));
    expect(at.heel).toBeLessThan(1e-6);
    expect(at.ball).toBeLessThan(1e-6);
  });

  it("peels the heel off the ground while the ball stays planted", () => {
    const gaps = [0.66, 0.76, 0.86].map((progress) => soleGaps(...stanceAt(progress)));
    for (const gap of gaps) {
      expect(gap.ball).toBeCloseTo(0, 6);
      expect(gap.heel).toBeGreaterThan(0.01);
    }
    expect(gaps[0]?.heel).toBeLessThan(gaps[1]?.heel ?? 0);
    expect(gaps[1]?.heel).toBeLessThan(gaps[2]?.heel ?? 0);
  });

  it("finishes the push-off through the toe, with the heel high", () => {
    const at = soleGaps(...stanceAt(0.99));
    expect(at.toe).toBeCloseTo(0, 6);
    expect(at.ball).toBeGreaterThan(0.01);
    expect(at.heel).toBeGreaterThan(0.04);
  });

  it("never lets a sole point pass below the ground", () => {
    for (let step = 0; step <= 100; step += 1) {
      const at = soleGaps(...stanceAt(step / 100));
      expect(Math.min(at.heel, at.ball, at.toe)).toBeGreaterThan(-1e-6);
    }
  });

  it("rotates the foot through a wide arc rather than pressing it flat", () => {
    const angles = Array.from({ length: 100 }, (_, step) => stanceAt(step / 100));
    const hind = angles.map((anglesAtStep) => anglesAtStep[0]);
    // About 45 degrees of ankle rotation inside stance alone: the foot pivots
    // over the ball instead of dropping onto the ground and lifting off it.
    expect(Math.max(...hind) - Math.min(...hind)).toBeGreaterThan(0.6);
    for (const [hindAngle] of angles) expect(hindAngle).toBeLessThanOrEqual(0.001);
  });

  it("dorsiflexes the swing foot to clear the ground", () => {
    const midSwing = solvePose(gait, 0.68, body).near.leg;
    expect(midSwing.isStance).toBe(false);
    expect(midSwing.hindAngle).toBeGreaterThan(0.1);
    expect(midSwing.foot.toe.y).toBeGreaterThan(0);
    expect(midSwing.foot.heel.y).toBeGreaterThan(0);
  });
});

/** Foot angles at a stance progress, in the order the sole gap helper expects. */
function stanceAt(progress: number): [number, number] {
  const sample = sampleLeg(gait, gait.dutyFactor * progress, body);
  return [sample.hindAngle, sample.foreAngle];
}

describe("forward lean", () => {
  it("pitches the trunk forward at every phase", () => {
    for (const phase of phases(120)) {
      const pose = solvePose(gait, phase, body);
      expect(pose.torsoAngle).toBeGreaterThan(0.1);
      expect(pose.shoulder.x).toBeGreaterThan(pose.hip.x);
      expect(pose.headCenter.x).toBeGreaterThan(pose.hip.x);
    }
  });

  it("leans further when the lean control increases", () => {
    const upright = solvePose(resolveGait({ ...DEFAULT_CONTROLS, lean: 0.05 }), 0.2, body);
    const forward = solvePose(resolveGait({ ...DEFAULT_CONTROLS, lean: 0.3 }), 0.2, body);
    expect(forward.shoulder.x).toBeGreaterThan(upright.shoulder.x + 0.03);
  });

  it("keeps the support foot behind the pelvis for most of stance", () => {
    const foot: number[] = [];
    for (let step = 0; step < 60; step += 1) {
      foot.push(sampleLeg(gait, (gait.dutyFactor * step) / 60, body).ankle.x);
    }
    const mean = foot.reduce((sum, value) => sum + value, 0) / foot.length;
    expect(mean).toBeLessThan(-0.02);
  });
});

describe("neck articulation", () => {
  it("puts a real segment between the torso and the head", () => {
    const pose = solvePose(gait, 0.2, body);
    const neck = Math.hypot(pose.headBase.x - pose.neckBase.x, pose.headBase.y - pose.neckBase.y);
    expect(neck).toBeCloseTo(body.neckLength, 6);
    expect(neck).toBeGreaterThan(0.02);
  });

  it("absorbs most of the trunk lean instead of carrying the head with it", () => {
    for (const lean of [0.08, 0.17, 0.3]) {
      const pose = solvePose(resolveGait({ ...DEFAULT_CONTROLS, lean }), 0.2, body);
      expect(Math.abs(pose.neckAngle)).toBeLessThan(pose.torsoAngle);
      expect(Math.abs(pose.headAngle)).toBeLessThan(Math.abs(pose.neckAngle));
      expect(pose.torsoAngle - pose.headAngle).toBeGreaterThan(lean * 0.55);
    }
  });

  it("keeps the gaze near level through the whole cycle", () => {
    for (const phase of phases(120)) {
      const pose = solvePose(gait, phase, body);
      expect(Math.abs(pose.headAngle)).toBeLessThan(0.12);
    }
  });

  it("moves the neck pivot with the trunk, not with the head", () => {
    const pose = solvePose(gait, 0.2, body);
    const fromHip = Math.hypot(pose.neckBase.x - pose.hip.x, pose.neckBase.y - pose.hip.y);
    expect(fromHip).toBeCloseTo(body.torsoLength, 6);
    expect(pose.headBase.y).toBeGreaterThan(pose.neckBase.y);
  });
});

const correlation = (a: readonly number[], b: readonly number[]): number => {
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const da = (a[index] as number) - meanA;
    const db = (b[index] as number) - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  return covariance / Math.sqrt(varianceA * varianceB);
};

describe("pelvis", () => {
  it("stays within a plausible band of hip heights", () => {
    for (const phase of phases()) {
      const height = hipHeightAt(gait, phase, body);
      expect(height).toBeGreaterThan(body.legLength * 0.85);
      expect(height).toBeLessThan(body.legLength * 1.12);
    }
  });

  it("repeats its profile every half stride, when the legs swap", () => {
    for (const phase of phases(60)) {
      expect(hipHeightAt(gait, phase, body)).toBeCloseTo(hipHeightAt(gait, phase + 0.5, body), 8);
    }
  });

  it("moves the pelvis up and down instead of holding it still", () => {
    const heights = phases().map((phase) => hipHeightAt(gait, phase, body));
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.01);
  });
});

describe("arms and joint limits", () => {
  it("swings the arms in opposition to the legs", () => {
    // The two waveforms are not mirror images instant by instant (the leg has a
    // stance and a swing shape); opposition is a negative correlation over the
    // whole cycle, which is what a runner's arm-leg coupling actually is.
    const foot: number[] = [];
    const arm: number[] = [];
    for (const phase of phases(120)) {
      const pose = solvePose(gait, phase, body);
      // Ankle position is the direct measure of which leg is forward; the
      // thigh angle is a poor proxy because the swing knee drives ahead.
      foot.push(pose.near.leg.ankle.x);
      arm.push(pose.near.arm.upperAngle);
    }
    expect(correlation(foot, arm)).toBeLessThan(-0.75);
  });

  it("also opposes the other arm to the same leg, so the pair counter-rotates", () => {
    const nearArm: number[] = [];
    const farArm: number[] = [];
    for (const phase of phases(60)) {
      const pose = solvePose(gait, phase, body);
      nearArm.push(pose.near.arm.upperAngle);
      farArm.push(pose.far.arm.upperAngle);
    }
    expect(correlation(nearArm, farArm)).toBeLessThan(-0.99);
  });

  it("keeps both knees on the forward side of the hip-ankle line", () => {
    for (const phase of phases(80)) {
      const pose = solvePose(gait, phase, body);
      for (const leg of [pose.near.leg, pose.far.leg]) {
        // Project the knee onto the perpendicular of hip -> ankle. A knee can
        // sit behind the hip when the ankle is behind it and the leg is nearly
        // straight; what must never happen is a knee that bends backwards.
        const dx = leg.ankle.x - leg.hip.x;
        const dy = leg.ankle.y - leg.hip.y;
        const length = Math.hypot(dx, dy) || 1;
        const forward = ((leg.knee.x - leg.hip.x) * -dy + (leg.knee.y - leg.hip.y) * dx) / length;
        expect(forward).toBeGreaterThan(-1e-6);
        expect(leg.kneeFlexion).toBeLessThan(2.45);
      }
    }
  });

  it("keeps the elbows flexed, as a sprinter's arms are", () => {
    for (const phase of phases(60)) {
      const pose = solvePose(gait, phase, body);
      for (const arm of [pose.near.arm, pose.far.arm]) {
        expect(arm.elbowFlexion).toBeGreaterThan(1);
        expect(arm.elbowFlexion).toBeLessThan(2.2);
      }
    }
  });

  it("resolves every control into the documented parameter range", () => {
    const extreme: GaitParameters = resolveGait({
      cadence: 9999,
      strideLength: 99,
      dutyFactor: 0.9,
      lean: 9,
      armSwing: 9,
      bobGain: 9,
    });
    expect(extreme.cycleSeconds).toBeGreaterThan(0.5);
    expect(extreme.dutyFactor).toBeLessThan(0.5);
    expect(extreme.lean).toBeLessThanOrEqual(GAIT_LIMITS.lean.max);
    expect(extreme.armSwing).toBeLessThanOrEqual(GAIT_LIMITS.armSwing.max);
    expect(extreme.bobGain).toBeLessThanOrEqual(GAIT_LIMITS.bobGain.max);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_GAIT, SOLE_LINE, sampleGait, wrapPhase, type GaitSample } from "./gait.ts";
import { DEFAULT_BODY, fullLegLength } from "./body-proportions.ts";

const LEG = fullLegLength(DEFAULT_BODY);
const SAMPLES = 400;

function sweep(): GaitSample[] {
  return Array.from({ length: SAMPLES }, (_, index) => sampleGait(index / SAMPLES, LEG, DEFAULT_GAIT));
}

function worldAnkleY(sample: GaitSample, side: "near" | "far"): number {
  return sample.hipHeight + sample[side].ankleOffset.y;
}

describe("wrapPhase", () => {
  it("maps any phase into [0, 1)", () => {
    expect(wrapPhase(1.25)).toBeCloseTo(0.25);
    expect(wrapPhase(-0.25)).toBeCloseTo(0.75);
    expect(wrapPhase(0)).toBe(0);
  });
});

describe("sampleGait periodicity and symmetry", () => {
  it("repeats exactly after one full cycle", () => {
    const first = sampleGait(0.37, LEG, DEFAULT_GAIT);
    const second = sampleGait(1.37, LEG, DEFAULT_GAIT);
    expect(second.hipHeight).toBeCloseTo(first.hipHeight, 9);
    expect(second.near.ankleOffset.x).toBeCloseTo(first.near.ankleOffset.x, 9);
  });

  it("makes the far leg a half-cycle copy of the near leg", () => {
    const at = sampleGait(0.15, LEG, DEFAULT_GAIT);
    const halfLater = sampleGait(0.65, LEG, DEFAULT_GAIT);
    expect(halfLater.near.ankleOffset.x).toBeCloseTo(at.far.ankleOffset.x, 9);
    expect(halfLater.near.ankleOffset.y).toBeCloseTo(at.far.ankleOffset.y, 9);
    expect(halfLater.hipHeight).toBeCloseTo(at.hipHeight, 9);
  });

  it("never lifts the hip above touchdown height by more than the flight bounce", () => {
    const heights = sweep().map((sample) => sample.hipHeight);
    const touchdownHeight = DEFAULT_GAIT.edgeReachRatio * LEG;
    expect(Math.max(...heights)).toBeLessThanOrEqual(touchdownHeight + DEFAULT_GAIT.flightBounce + 1e-9);
  });
});

describe("planted feet", () => {
  it("keeps the stance ankle exactly on the sole line in every stance frame", () => {
    const stanceFrames = sweep().filter((sample) => sample.near.inStance);
    expect(stanceFrames.length).toBeGreaterThan(SAMPLES * 0.35);
    for (const sample of stanceFrames) {
      expect(worldAnkleY(sample, "near")).toBeCloseTo(SOLE_LINE, 9);
    }
  });

  it("moves the stance foot steadily backwards relative to the hip", () => {
    const frames = Array.from({ length: 20 }, (_, index) => sampleGait(index * 0.4 / 20, LEG, DEFAULT_GAIT));
    for (let index = 1; index < frames.length; index += 1) {
      expect(frames[index]!.near.ankleOffset.x).toBeLessThan(frames[index - 1]!.near.ankleOffset.x);
    }
  });

  it("keeps the body's grounded foot within the leg's reach at every phase", () => {
    for (const sample of sweep()) {
      const reach = Math.hypot(sample.near.ankleOffset.x, sample.near.ankleOffset.y);
      expect(reach).toBeLessThanOrEqual(LEG + 1e-9);
    }
  });
});

describe("running rhythm", () => {
  it("spends the configured share of each leg's cycle on the ground", () => {
    const frames = sweep();
    const nearStance = frames.filter((sample) => sample.near.inStance).length / frames.length;
    expect(nearStance).toBeCloseTo(DEFAULT_GAIT.stanceShare, 1);
  });

  it("has a flight window in which neither foot touches the ground", () => {
    const frames = sweep();
    const airborne = frames.filter((sample) => !sample.near.inStance && !sample.far.inStance);
    expect(airborne.length / frames.length).toBeCloseTo(1 - 2 * DEFAULT_GAIT.stanceShare, 1);
    for (const sample of airborne) {
      expect(worldAnkleY(sample, "near")).toBeGreaterThan(SOLE_LINE - 1e-9);
    }
  });

  it("dips lower in mid-stance than at touchdown, like a compressing spring", () => {
    const touchdown = sampleGait(0, LEG, DEFAULT_GAIT).hipHeight;
    const midStance = sampleGait(0.2, LEG, DEFAULT_GAIT).hipHeight;
    expect(midStance).toBeLessThan(touchdown);
  });

  it("rises again during flight", () => {
    const midStance = sampleGait(0.2, LEG, DEFAULT_GAIT).hipHeight;
    const flight = sampleGait(0.45, LEG, DEFAULT_GAIT).hipHeight;
    expect(flight).toBeGreaterThan(midStance);
  });
});

describe("arms against legs", () => {
  it("swings each arm opposite to its same-side leg", () => {
    const sample = sampleGait(0.5, LEG, DEFAULT_GAIT);
    expect(sample.near.ankleOffset.x).toBeLessThan(0);
    expect(sample.nearShoulder).toBeGreaterThan(0);
  });

  it("gives the near and far arms opposite shoulder angles", () => {
    for (const sample of sweep()) {
      expect(sample.nearShoulder).toBeCloseTo(-sample.farShoulder, 9);
    }
  });
});

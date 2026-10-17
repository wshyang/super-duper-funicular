import { describe, expect, it } from "vitest";
import { advancePhase, clampSpeed, contactLabel, cyclesPerSecond, formatPhase, nearestFrameIndex, MAX_SPEED, MIN_SPEED } from "./stage-model.ts";
import { DEFAULT_BODY, fullLegLength } from "../runner/body-proportions.ts";
import { DEFAULT_GAIT, sampleGait } from "../runner/gait.ts";

const LEG = fullLegLength(DEFAULT_BODY);

describe("speed", () => {
  it("clamps the slider value to the supported range", () => {
    expect(clampSpeed(0)).toBe(MIN_SPEED);
    expect(clampSpeed(99)).toBe(MAX_SPEED);
    expect(clampSpeed(1.5)).toBe(1.5);
  });

  it("converts speed into gait cycles per second", () => {
    expect(cyclesPerSecond(1)).toBeCloseTo(0.6, 9);
    expect(cyclesPerSecond(2)).toBeCloseTo(1.2, 9);
  });
});

describe("advancePhase", () => {
  it("moves by elapsed time times cycle rate and wraps into [0, 1)", () => {
    expect(advancePhase(0.9, 0.5, 0.4)).toBeCloseTo(0.1, 9);
    expect(advancePhase(0, 0, 1)).toBe(0);
  });
});

describe("contactLabel", () => {
  it("names the planted foot, or flight when neither is down", () => {
    const labels = new Set<string>();
    for (let index = 0; index < 100; index += 1) {
      labels.add(contactLabel(sampleGait(index / 100, LEG, DEFAULT_GAIT)));
    }
    expect(labels).toContain("Near foot planted");
    expect(labels).toContain("Far foot planted");
    expect(labels).toContain("Flight: both feet in the air");
  });
});

describe("nearestFrameIndex and formatPhase", () => {
  it("maps a phase onto one of the frame slots, wrapping at the end", () => {
    expect(nearestFrameIndex(0, 8)).toBe(0);
    expect(nearestFrameIndex(0.26, 8)).toBe(2);
    expect(nearestFrameIndex(0.99, 8)).toBe(0);
  });

  it("formats a phase as a percentage of the cycle", () => {
    expect(formatPhase(0.25)).toBe("25.0%");
  });
});

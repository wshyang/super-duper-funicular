import { describe, it, expect } from "vitest";
import {
  personaList,
  personas,
  getPonytailAngle,
} from "../../../src/motion/personas";
describe("runner personas", () => {
  it("provides two named, distinct adult character designs", () => {
    expect(
      personaList.filter((p) => p.renderStyle === "pixel").map((p) => p.id),
    ).toEqual(["wei-ming", "mei-lin"]);
    expect(personas["wei-ming"].hairstyle).not.toBe(
      personas["mei-lin"].hairstyle,
    );
    expect(
      personaList.every((p) => p.torsoWidth > 0 && p.shortsLength > 0),
    ).toBe(true);
  });
  it("loops secondary hair articulation without a discontinuity", () => {
    expect(getPonytailAngle(0)).toBeCloseTo(getPonytailAngle(1), 10);
    expect(getPonytailAngle(0.1)).not.toBeCloseTo(getPonytailAngle(0.3), 3);
  });
});

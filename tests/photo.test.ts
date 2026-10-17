import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import type { CutPart } from "../src/lib/photo/cut.ts";
import { resamplePart } from "../src/lib/photo/resample.ts";
import { parsePhotoRig, partById, photoBodyMetrics, photoGait, PHOTO_PART_ORDER } from "../src/lib/photo/rig.ts";
import { composePhotoRunner, photoAssetFiles } from "../src/lib/photo/scene.ts";
import { findRunnerOption, lookFor, RUNNER_OPTIONS } from "../src/lib/rig/persona.ts";
import { DEFAULT_SETTINGS, isPhotoSettings, withPersona } from "../src/app/state/settings.ts";

const manifest = JSON.parse(readFileSync("public/sprites/photo/female-rig.json", "utf8"));
const rig = parsePhotoRig(manifest);
const body = photoBodyMetrics(rig);
const gait = photoGait(resolveGait(DEFAULT_CONTROLS), rig);

describe("photographic rig", () => {
  it("carries all nine parts with a far block on every limb", () => {
    expect(rig.parts.map((part) => part.id)).toEqual([...PHOTO_PART_ORDER]);
    expect(rig.pixelsPerBody).toBe(1219);
    const limbs = rig.parts.filter((part) => part.far !== undefined).map((part) => part.id);
    expect(limbs).toEqual(["upperArm", "forearm", "thigh", "shin", "shoe", "shoeToe"]);
  });

  it("measures the body in the same units as the vector rigs", () => {
    expect(body.thighLength).toBeCloseTo(0.215, 3);
    expect(body.shinLength).toBeCloseTo(0.24, 3);
    expect(body.upperArmLength).toBeCloseTo(0.194, 3);
    expect(body.forearmLength).toBeCloseTo(0.19, 3);
    expect(body.shoulderAt).toBeCloseTo(0.941, 3);
    expect(body.hipStandHeight + body.torsoLength).toBeLessThan(1);
  });

  it("adopts the rig's own arm carriage without touching the shared gait", () => {
    expect(gait.armSwing).toBe(0.35);
    expect(gait.armBias).toBe(-0.05);
    expect(gait.elbowFlex).toBe(1.45);
    expect(DEFAULT_CONTROLS.armSwing).toBe(0.8);
  });

  it("paints far limbs from their medial reference shots", () => {
    const pose = solvePose(gait, 0.25, body);
    const draws = composePhotoRunner(pose, rig);
    expect(draws).toHaveLength(15);
    expect(draws.slice(0, 6).every((draw) => draw.far)).toBe(true);
    for (const id of ["upperArm", "forearm", "thigh", "shin", "shoe", "shoeToe"] as const) {
      const part = partById(rig, id);
      const far = draws.find((draw) => draw.id === id && draw.far);
      const near = draws.find((draw) => draw.id === id && !draw.far);
      expect(far?.file).toBe(part.far?.file);
      expect(far?.width).toBe(part.far?.width);
      expect(far?.pivotX).toBe(part.far?.pivot[0]);
      expect(near?.file).toBe(part.file);
    }
  });

  it("rotates a far limb about its own reference neutral", () => {
    const pose = solvePose(gait, 0.125, body);
    const draw = composePhotoRunner(pose, rig).find((entry) => entry.id === "upperArm" && entry.far);
    const part = partById(rig, "upperArm");
    expect(draw?.angle).toBeCloseTo((part.far?.neutral ?? 0) - pose.far.arm.upperAngle, 9);
  });

  it("lists every bitmap the loader must fetch, far shots included", () => {
    const files = photoAssetFiles(rig);
    expect(files).toHaveLength(24);
    expect(files).toContain("sg-chinese-female-photo-far/shoe.png");
    expect(new Set(files).size).toBe(files.length);
  });

  it("rejects a manifest that is missing articulated parts", () => {
    const broken = { ...manifest, parts: manifest.parts.slice(0, 8) };
    expect(() => parsePhotoRig(broken)).toThrow(/9 parts/);
  });
});

describe("resample", () => {
  const pixel = (red: number, alpha: number): CutPart => ({
    id: "torso",
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    pixels: new Uint8ClampedArray([
      red, 0, 0, alpha,
      red, 0, 0, alpha,
      red, 0, 0, alpha,
      red, 0, 0, alpha,
    ]),
  });

  it("scales dimensions and keeps opaque colour", () => {
    const doubled = resamplePart(pixel(200, 255), { x: 2, y: 2 });
    expect([doubled.width, doubled.height]).toEqual([4, 4]);
    expect(doubled.pixels[0]).toBe(200);
    expect(doubled.pixels[3]).toBe(255);
  });

  it("does not let transparent neighbours bleed colour into an edge", () => {
    const half = resamplePart(pixel(200, 128), { x: 0.5, y: 0.5 });
    expect([half.width, half.height]).toEqual([1, 1]);
    expect(half.pixels[0]).toBe(200);
    expect(half.pixels[3]).toBe(128);
  });
});

describe("runner options", () => {
  it("adds the photo persona above the vector pair", () => {
    expect(RUNNER_OPTIONS.map((option) => option.id)).toEqual([
      "sg-chinese-male",
      "sg-chinese-female",
      "sg-chinese-female-photo",
    ]);
    expect(findRunnerOption("sg-chinese-female-photo").kind).toBe("photo");
    expect(findRunnerOption("sg-chinese-male").kind).toBe("vector");
  });

  it("keeps the vector look unreachable for a photo runner", () => {
    expect(() => lookFor("sg-chinese-female-photo", "red")).toThrow(/Unknown persona/);
  });

  it("switches to the photo runner without changing the kit", () => {
    const switched = withPersona({ ...DEFAULT_SETTINGS, colorwayId: "green" }, "sg-chinese-female-photo");
    expect(switched.personaId).toBe("sg-chinese-female-photo");
    expect(switched.colorwayId).toBe("green");
    expect(isPhotoSettings(switched)).toBe(true);
    expect(withPersona(DEFAULT_SETTINGS, "sg-chinese-female").colorwayId).toBe("blue");
  });
});

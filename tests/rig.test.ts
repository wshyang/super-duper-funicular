import { describe, expect, it } from "vitest";
import { polygonBounds } from "../src/lib/geometry/poly.ts";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import { composeRunner, singlePartScene } from "../src/lib/render/scene.ts";
import { FEMALE_BODY, JOINT_LIMITS, MALE_BODY, type BodyMetrics } from "../src/lib/rig/body.ts";
import { buildAllParts, buildThigh, buildTorso } from "../src/lib/rig/parts/index.ts";
import { buildPalette, COLORWAYS, findColorway } from "../src/lib/rig/palette.ts";
import { findPersona, lookFor, PERSONAS, partsFor } from "../src/lib/rig/persona.ts";

const look = lookFor("sg-chinese-male", "red");
const palette = look.palette;
const gait = resolveGait(DEFAULT_CONTROLS);
const body = MALE_BODY;

const everyBody: readonly BodyMetrics[] = [MALE_BODY, FEMALE_BODY];

describe("body metrics", () => {
  it.each(everyBody.map((metrics) => [metrics.id, metrics] as const))(
    "adds up to a standing figure of about one body height (%s)",
    (_id, metrics) => {
      const hip = metrics.hipStandHeight;
      const headTop = hip + metrics.torsoLength + metrics.neckLength + metrics.headCenterOffset + metrics.headRadiusY;
      expect(headTop).toBeCloseTo(1, 3);
    },
  );

  it("has legs longer than the torso plus head, as a runner's do", () => {
    for (const metrics of everyBody) expect(metrics.legLength).toBeGreaterThan(metrics.torsoLength);
  });

  it("gives the two personas distinct anatomy", () => {
    expect(FEMALE_BODY.statureMetres).toBeLessThan(MALE_BODY.statureMetres);
    expect(FEMALE_BODY.hipDepth).toBeGreaterThan(MALE_BODY.hipDepth);
    expect(FEMALE_BODY.chestDepth).toBeLessThan(MALE_BODY.chestDepth);
    expect(FEMALE_BODY.hipStandHeight).toBeLessThan(MALE_BODY.hipStandHeight);
  });

  it("declares joint limits that the gait model actually respects", () => {
    for (const metrics of everyBody) {
      for (let index = 0; index < 120; index += 1) {
        const pose = solvePose(gait, index / 120, metrics);
        for (const leg of [pose.near.leg, pose.far.leg]) {
          expect(leg.kneeFlexion).toBeGreaterThan(JOINT_LIMITS.kneeMinFlexion);
          expect(leg.kneeFlexion).toBeLessThan(JOINT_LIMITS.kneeMaxFlexion);
        }
      }
    }
  });
});

describe("rig parts", () => {
  const parts = buildAllParts(body, "short");

  it("has the nine articulated parts the renderer needs", () => {
    expect(parts.map((part) => part.id)).toEqual([
      "torso",
      "neck",
      "head",
      "thigh",
      "shin",
      "shoe",
      "shoeToe",
      "upperArm",
      "forearm",
    ]);
  });

  it("gives every part a pivot at the origin and a tip along its bone", () => {
    for (const part of parts) {
      expect(part.shapes.length).toBeGreaterThan(1);
      const bounds = polygonBounds(part.shapes.flatMap((shape) => shape.points));
      expect(bounds.minX).toBeLessThan(0.001);
      expect(bounds.maxX).toBeGreaterThan(0);
      expect(part.tip.x !== part.origin.x || part.tip.y !== part.origin.y).toBe(true);
    }
  });

  it("builds every part from the metrics it was given", () => {
    for (const metrics of everyBody) {
      const built = buildAllParts(metrics, "short");
      expect(built.find((part) => part.id === "thigh")?.length).toBe(metrics.thighLength);
      expect(built.find((part) => part.id === "neck")?.length).toBe(metrics.neckLength);
    }
  });

  it("sizes the thigh to the metric it is rigged with", () => {
    const thigh = buildThigh(body);
    const bounds = polygonBounds(thigh.shapes.flatMap((shape) => shape.points));
    expect(bounds.minY).toBeCloseTo(-body.thighLength - body.thighTopRadius * 0.05, 0);
    expect(thigh.length).toBe(body.thighLength);
  });

  it("builds the torso taller than it is deep", () => {
    const bounds = polygonBounds(buildTorso(body).shapes.flatMap((shape) => shape.points));
    expect(bounds.maxY - bounds.minY).toBeGreaterThan((bounds.maxX - bounds.minX) * 1.4);
  });

  it("splits the shoe at the ball of the foot", () => {
    const shoe = buildAllParts(body).find((part) => part.id === "shoe");
    const toe = buildAllParts(body).find((part) => part.id === "shoeToe");
    expect(shoe?.tip.x).toBeCloseTo(body.footBall, 6);
    expect(toe?.length).toBeCloseTo(body.footToe - body.footBall, 6);
    expect((shoe?.label ?? "").length).toBeGreaterThan(3);
    expect((toe?.label ?? "").length).toBeGreaterThan(3);
  });

  it("uses only palette materials", () => {
    const allowed = new Set(Object.keys(palette));
    for (const part of parts) {
      for (const shape of part.shapes) expect(allowed.has(shape.material)).toBe(true);
    }
  });

  it("renders a part at the origin without any pose", () => {
    const scene = singlePartScene(buildThigh(body), palette);
    expect(scene.groups).toHaveLength(1);
    expect(scene.groups[0]?.shapes.length).toBeGreaterThan(3);
  });
});

describe("skins and personas", () => {
  it("offers a male and a female Singaporean Chinese runner", () => {
    expect(PERSONAS.map((persona) => persona.id)).toEqual(["sg-chinese-male", "sg-chinese-female"]);
    expect(findPersona("sg-chinese-female").body).toBe(FEMALE_BODY);
  });

  it("changes hair silhouette with the skin, not the rig", () => {
    const short = buildAllParts(body, "short").find((part) => part.id === "head");
    const ponytail = buildAllParts(body, "ponytail").find((part) => part.id === "head");
    expect(ponytail?.shapes.length).toBeGreaterThan(short?.shapes.length ?? 0);
  });

  it("re-colours the skin family without touching the kit", () => {
    const male = lookFor("sg-chinese-male", "red").palette;
    const female = lookFor("sg-chinese-female", "red").palette;
    expect(female.skin).not.toEqual(male.skin);
    expect(female.shirt).toEqual(male.shirt);
  });

  it("lets a skin replace any part's geometry through the override hook", () => {
    const base = lookFor("sg-chinese-male", "red");
    const swapped = {
      ...base,
      overrides: { torso: () => buildTorso(FEMALE_BODY) },
    };
    const torso = partsFor(swapped).find((part) => part.id === "torso");
    expect(torso?.length).toBe(FEMALE_BODY.torsoLength);
  });
});

describe("scene composition", () => {
  it("draws far limbs first, then torso and neck, then the near side", () => {
    const scene = composeRunner(solvePose(gait, 0.2, body), look);
    const ids = scene.groups.map((group) => group.id);
    expect(ids.indexOf("thigh-far")).toBeLessThan(ids.indexOf("torso"));
    expect(ids.indexOf("torso")).toBeLessThan(ids.indexOf("neck"));
    expect(ids.indexOf("neck")).toBeLessThan(ids.indexOf("head"));
    expect(ids.indexOf("shoe-far")).toBeLessThan(ids.indexOf("shoeToe-far"));
  });

  it("shades the far side darker than the near side", () => {
    const scene = composeRunner(solvePose(gait, 0.2, body), look);
    const far = scene.groups.find((group) => group.id === "thigh-far");
    const near = scene.groups.find((group) => group.id === "thigh-near");
    const farSkin = far?.shapes.find((shape) => shape.fill.g > 100);
    const nearSkin = near?.shapes.find((shape) => shape.fill.g > 100);
    expect(farSkin?.fill.g).toBeLessThan(nearSkin?.fill.g ?? 255);
  });

  it("bounds every frame roughly one body height tall", () => {
    for (const metrics of everyBody) {
      for (let index = 0; index < 20; index += 1) {
        const scene = composeRunner(solvePose(gait, index / 20, metrics), look);
        const height = scene.bounds.maxY - scene.bounds.minY;
        expect(height).toBeGreaterThan(0.8);
        expect(height).toBeLessThan(1.15);
      }
    }
  });

  it("keeps the figure centred, so an in-place loop does not slide", () => {
    const centres = Array.from({ length: 16 }, (_, index) => {
      const bounds = composeRunner(solvePose(gait, index / 16, body), look).bounds;
      return (bounds.minX + bounds.maxX) / 2;
    });
    expect(Math.max(...centres) - Math.min(...centres)).toBeLessThan(0.12);
  });

  it("rises and falls over the cycle rather than holding a fixed height", () => {
    const heights = Array.from({ length: 24 }, (_, index) => {
      const scene = composeRunner(solvePose(gait, index / 24, body), look);
      return scene.bounds.maxY;
    });
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.01);
  });
});

describe("palettes", () => {
  it("has six colourways with distinct shirts and matching socks", () => {
    expect(COLORWAYS).toHaveLength(6);
    expect(new Set(COLORWAYS.map((colorway) => colorway.shirt.r + colorway.shirt.g * 1000)).size).toBe(6);
    for (const colorway of COLORWAYS) {
      const colours = buildPalette(colorway);
      expect(colours.sock).toEqual(colours.shirt);
    }
  });

  it("keeps the skin and shorts identical across colourways", () => {
    const red = buildPalette(findColorway("red"));
    const blue = buildPalette(findColorway("blue"));
    expect(blue.skin).toEqual(red.skin);
    expect(blue.shorts).toEqual(red.shorts);
    expect(blue.shirt).not.toEqual(red.shirt);
  });
});

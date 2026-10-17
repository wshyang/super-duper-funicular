import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { atlasView, pivotPoint } from "../src/app/components/photo-atlas.ts";
import { parsePhotoRig, PHOTO_PART_LABELS, PHOTO_PART_ORDER } from "../src/lib/photo/rig.ts";

const rig = parsePhotoRig(JSON.parse(readFileSync("public/sprites/photo/female-rig.json", "utf8")));
const CELL = 132;
const PADDING = 14;

describe("photographic parts atlas", () => {
  it("gives every articulated part a cell, a label and a traced silhouette", () => {
    expect(rig.parts.map((part) => part.id)).toEqual([...PHOTO_PART_ORDER]);
    for (const id of PHOTO_PART_ORDER) {
      expect(PHOTO_PART_LABELS[id].length).toBeGreaterThan(2);
    }
    for (const part of rig.parts) {
      expect(part.shape ?? "").toMatch(/^M[\d.]+ [\d.]+/);
    }
  });

  it("fits every crop inside its cell with the same padding", () => {
    for (const part of rig.parts) {
      const view = atlasView(part, CELL, PADDING);
      expect(view.scale).toBeGreaterThan(0);
      expect(part.width * view.scale).toBeLessThanOrEqual(CELL - PADDING * 2 + 1e-9);
      expect(part.height * view.scale).toBeLessThanOrEqual(CELL - PADDING * 2 + 1e-9);
      expect(view.x).toBeGreaterThanOrEqual(PADDING - 1e-9);
      expect(view.y).toBeGreaterThanOrEqual(PADDING - 1e-9);
    }
  });

  it("projects each pivot into cell pixels, so the marker is not a guess", () => {
    const head = rig.parts.find((part) => part.id === "head");
    expect(head).toBeDefined();
    const view = atlasView(head!, CELL, PADDING);
    const joint = pivotPoint(head!, view);
    expect(joint.x).toBeCloseTo(view.x + head!.pivot[0] * view.scale, 9);
    expect(joint.y).toBeCloseTo(view.y + head!.pivot[1] * view.scale, 9);
    expect(joint.x).toBeGreaterThan(0);
    expect(joint.y).toBeGreaterThan(0);
  });

  it("draws a chevron when a pivot sits outside its own crop, e.g. the thigh's hip", () => {
    const thigh = rig.parts.find((part) => part.id === "thigh");
    expect(thigh).toBeDefined();
    const joint = pivotPoint(thigh!, atlasView(thigh!, CELL, PADDING));
    expect(joint.y).toBeLessThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { capsule, circlePolygon, polygonArea, polygonBounds, smoothClosedPolygon, chamferedBox } from "../src/lib/geometry/poly.ts";
import { add, angleDelta, length, normalize, rotate, vec } from "../src/lib/geometry/vec.ts";

describe("vector maths", () => {
  it("normalises to unit length", () => {
    expect(length(normalize(vec(3, 4)))).toBeCloseTo(1, 10);
  });

  it("returns a zero vector instead of NaN for the zero vector", () => {
    const result = normalize(vec(0, 0));
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("rotates a vector a quarter turn counter-clockwise", () => {
    const rotated = rotate(vec(1, 0), Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 10);
    expect(rotated.y).toBeCloseTo(1, 10);
  });

  it("measures the shortest signed angle across the wrap point", () => {
    expect(angleDelta(3.1, -3.1)).toBeCloseTo(0.083185, 4);
  });

  it("adds componentwise without mutating its inputs", () => {
    const a = vec(1, 2);
    const b = vec(3, 4);
    expect(add(a, b)).toEqual({ x: 4, y: 6 });
    expect(a).toEqual({ x: 1, y: 2 });
  });
});

describe("polygons", () => {
  it("builds a circle whose area matches pi r squared", () => {
    const area = polygonArea(circlePolygon(vec(0, 0), 2, 2, 256));
    expect(area).toBeCloseTo(Math.PI * 4, 1);
  });

  it("builds a capsule that spans both joints plus both radii", () => {
    const shape = capsule(vec(0, 0), vec(0, -10), 2, 1);
    const bounds = polygonBounds(shape);
    expect(bounds.minY).toBeCloseTo(-11, 5);
    expect(bounds.maxY).toBeCloseTo(2, 5);
    expect(bounds.minX).toBeCloseTo(-2, 5);
    expect(bounds.maxX).toBeCloseTo(2, 5);
  });

  it("keeps a smoothed polygon inside a plausible envelope of its control points", () => {
    const control = [vec(0, 0), vec(10, 0), vec(10, 10), vec(0, 10)];
    const smooth = smoothClosedPolygon(control, 8);
    expect(smooth.length).toBe(32);
    const bounds = polygonBounds(smooth);
    expect(bounds.minX).toBeGreaterThan(-2);
    expect(bounds.maxX).toBeLessThan(12);
  });

  it("chamfers all four corners", () => {
    const box = chamferedBox(vec(0, 0), 5, 5, 1);
    expect(box).toHaveLength(8);
    expect(polygonArea(box)).toBeLessThan(100);
  });
});

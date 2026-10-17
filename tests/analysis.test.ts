import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { buildCycleReport, findDuplicates, landmarksFromSheet } from "../src/lib/analysis/cycle.ts";
import { proceduralLandmarks } from "../src/lib/analysis/procedural.ts";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { readImage } from "../src/lib/pipeline/decode.ts";
import { detectSheet } from "../src/lib/pipeline/sheet.ts";

const image = await readImage(resolve("src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg"));
const layout = detectSheet(image);
const landmarks = landmarksFromSheet(image, layout);
const firstRow = landmarks.slice(0, layout.columns);
const reference = buildCycleReport("row 1", firstRow);
const gait = resolveGait(DEFAULT_CONTROLS);
const generated = buildCycleReport("generated", proceduralLandmarks(gait, layout.columns), 0.02);

describe("reference sheet findings", () => {
  it("contains exactly four unique poses per row of eight", () => {
    expect(reference.uniquePoses).toBe(4);
  });

  it("repeats frame i as frame i+4, in every colourway", () => {
    for (let row = 0; row < layout.rows; row += 1) {
      const frames = landmarks.filter((frame) => Math.floor(frame.index / layout.columns) === row);
      const groups = findDuplicates(frames, 0.06);
      expect(groups).toHaveLength(4);
      for (const group of groups) expect(group.frames).toHaveLength(2);
      expect(groups.map((group) => group.frames.map((index) => index % layout.columns))).toEqual([
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ]);
    }
  });

  it("barely touches the ground: at most two frames per row are planted", () => {
    expect(reference.framesOnGround).toBeLessThanOrEqual(2);
    expect(reference.maxGroundClearancePx).toBeGreaterThan(10);
  });

  it("drifts sideways by tens of pixels", () => {
    expect(reference.headDriftPx).toBeGreaterThan(30);
  });

  it("changes figure height across the cycle", () => {
    expect(reference.figureHeightRangePx).toBeGreaterThan(10);
  });

  it("has a half-cycle pose distance far below its neighbour distance", () => {
    expect(reference.halfCycleDistance).toBeLessThan(reference.adjacentDistance);
  });
});

describe("procedural runner", () => {
  it("produces a distinct pose for every frame", () => {
    expect(generated.uniquePoses).toBe(8);
  });

  it("holds the head on one column", () => {
    expect(generated.headDriftPx).toBeLessThan(4);
  });

  it("keeps its figure height within the modelled pelvis bob", () => {
    // The only vertical freedom the model has is the pelvis curve, so the
    // frame-to-frame height range must match that travel, not exceed it.
    const bobPx = (gait.stanceCompression + gait.flightRise) * gait.bobGain * 231;
    expect(generated.figureHeightRangePx).toBeLessThan(bobPx * 1.25 + 2);
    expect(generated.figureHeightRangePx).toBeLessThan(reference.figureHeightRangePx);
  });

  it("plants a foot on most frames and still leaves the ground", () => {
    expect(generated.framesOnGround).toBeGreaterThanOrEqual(5);
    expect(generated.maxGroundClearancePx).toBeGreaterThan(6);
  });

  it("beats the reference on every headline metric", () => {
    expect(generated.uniquePoses).toBeGreaterThan(reference.uniquePoses);
    expect(generated.headDriftPx).toBeLessThan(reference.headDriftPx);
    expect(generated.figureHeightRangePx).toBeLessThan(reference.figureHeightRangePx);
    expect(generated.framesOnGround).toBeGreaterThan(reference.framesOnGround);
  });

  it("keeps a short flight phase rather than a floaty one", () => {
    const flightShare = 1 - generated.framesOnGround / generated.frameCount;
    expect(flightShare).toBeLessThan(0.4);
  });
});

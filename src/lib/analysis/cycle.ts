import { labelComponents } from "../pipeline/components.ts";
import type { RgbaImage } from "../pipeline/decode.ts";
import { cutCell, poseSignatureVector, signatureDistance, type CutSprite } from "../pipeline/sprite-cut.ts";
import type { SheetLayout } from "../pipeline/sheet.ts";

/**
 * Measurements for one animation frame that do not depend on the pose itself:
 * where the head sits, how high the lowest part of the figure is, how wide the
 * stance is, and a coarse pose fingerprint. The same shape is produced for the
 * reference sheet (from pixels) and for the procedural runner (from the rig),
 * so the two cycles can be judged by identical rules.
 */
export interface FrameLandmark {
  readonly index: number;
  readonly headX: number;
  readonly headY: number;
  /** Pixel y of the lowest point of the figure, in the same units as `height`. */
  readonly lowestY: number;
  /** Height of the whole figure in pixels. */
  readonly height: number;
  /** Horizontal distance between the two feet, or null when only one is separable. */
  readonly footSeparation: number | null;
  readonly signature: readonly number[];
}

export interface DuplicateGroup {
  readonly frames: readonly number[];
}

export interface CycleReport {
  readonly label: string;
  readonly frameCount: number;
  readonly uniquePoses: number;
  readonly duplicateGroups: readonly DuplicateGroup[];
  readonly halfCycleDistance: number;
  readonly adjacentDistance: number;
  readonly headDriftPx: number;
  readonly groundLineVariationPx: number;
  readonly figureHeightRangePx: number;
  readonly framesOnGround: number;
  readonly meanGroundClearancePx: number;
  readonly maxGroundClearancePx: number;
  readonly footSeparationRangePx: number | null;
  readonly frames: readonly FrameLandmark[];
}

export const DUPLICATE_THRESHOLD = 0.06;

interface Blob {
  readonly x: number;
  readonly y: number;
  readonly bottom: number;
  readonly area: number;
}

function colourBlobs(
  sprite: CutSprite,
  test: (red: number, green: number, blue: number) => boolean,
  minimumArea: number,
): Blob[] {
  const { rgba, width, height } = sprite;
  const labelled = labelComponents((x, y) => {
    const offset = (y * width + x) * 4;
    if ((rgba[offset + 3] ?? 0) < 128) return false;
    return test(rgba[offset] ?? 0, rgba[offset + 1] ?? 0, rgba[offset + 2] ?? 0);
  }, width, height, minimumArea);
  return labelled.components.map((component) => ({
    x: component.centroidX,
    y: component.centroidY,
    bottom: component.maxY,
    area: component.area,
  }));
}

const isShorts = (red: number, green: number, blue: number): boolean =>
  red < 100 && green < 115 && blue > 40 && blue < 158 && blue > red + 8;

const isHair = (red: number, green: number, blue: number): boolean =>
  red > 35 && red < 140 && green < 100 && blue < 76 && red > green + 14;

function pelvisY(sprite: CutSprite): number {
  const blob = colourBlobs(sprite, isShorts, 400).sort((a, b) => b.area - a.area)[0];
  return blob?.y ?? sprite.height * 0.55;
}

/** Legs split from the body silhouette, below the pelvis. Colour-independent. */
function legBlobs(sprite: CutSprite): Blob[] {
  const cut = Math.round(pelvisY(sprite));
  const { rgba, width, height } = sprite;
  const labelled = labelComponents((x, y) => {
    if (y < cut) return false;
    return (rgba[(y * width + x) * 4 + 3] ?? 0) >= 128;
  }, width, height, 150);
  return labelled.components.map((component) => ({
    x: component.centroidX,
    y: component.centroidY,
    bottom: component.maxY,
    area: component.area,
  }));
}

/** Landmarks for one cut sprite, read from the artwork only. */
export function landmarksFromSprite(sprite: CutSprite, index: number): FrameLandmark {
  const hair = colourBlobs(sprite, isHair, 60).sort((a, b) => b.area - a.area)[0];
  let lowestY = 0;
  let topY = sprite.height;
  for (let y = 0; y < sprite.height; y += 1) {
    for (let x = 0; x < sprite.width; x += 1) {
      if ((sprite.rgba[(y * sprite.width + x) * 4 + 3] ?? 0) < 128) continue;
      if (y > lowestY) lowestY = y;
      if (y < topY) topY = y;
    }
  }
  const legs = legBlobs(sprite);
  const separation = legs.length >= 2 ? Math.abs((legs[0]?.x ?? 0) - (legs[1]?.x ?? 0)) : null;
  return {
    index,
    headX: hair?.x ?? 0,
    headY: hair?.y ?? 0,
    lowestY,
    height: sprite.height - topY,
    footSeparation: separation,
    signature: poseSignatureVector(sprite.rgba, sprite.width, sprite.height),
  };
}

export function landmarksFromSheet(image: RgbaImage, layout: SheetLayout): FrameLandmark[] {
  return layout.cells.map((cell, index) => landmarksFromSprite(cutCell(image, cell, layout.labels), index));
}

/** Frames that repeat an earlier pose within the same run. */
export function findDuplicates(frames: readonly FrameLandmark[], threshold = DUPLICATE_THRESHOLD): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const assigned = new Set<number>();
  frames.forEach((frame, index) => {
    if (assigned.has(index)) return;
    const members = frames
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(
        ({ other, otherIndex }) =>
          otherIndex >= index && !assigned.has(otherIndex) && signatureDistance(frame.signature, other.signature) <= threshold,
      )
      .map(({ otherIndex }) => otherIndex);
    if (members.length < 2) return;
    members.forEach((member) => assigned.add(member));
    groups.push({ frames: members });
  });
  return groups;
}

function meanAdjacentDistance(frames: readonly FrameLandmark[]): number {
  if (frames.length < 2) return 0;
  let total = 0;
  for (let index = 0; index < frames.length; index += 1) {
    const next = frames[(index + 1) % frames.length] as FrameLandmark;
    total += signatureDistance((frames[index] as FrameLandmark).signature, next.signature);
  }
  return total / frames.length;
}

function meanHalfCycleDistance(frames: readonly FrameLandmark[]): number {
  const half = Math.floor(frames.length / 2);
  if (half < 1) return 0;
  let total = 0;
  for (let index = 0; index < half; index += 1) {
    total += signatureDistance((frames[index] as FrameLandmark).signature, (frames[index + half] as FrameLandmark).signature);
  }
  return total / half;
}

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const range = (values: readonly number[]): number => (values.length === 0 ? 0 : Math.max(...values) - Math.min(...values));

/**
 * Ground clearance is measured against the lowest point the figure ever
 * reaches: that is the ground line. A correct run has a chain of frames at
 * clearance 0 for the whole stance window.
 */
export function buildCycleReport(
  label: string,
  frames: readonly FrameLandmark[],
  duplicateThreshold = DUPLICATE_THRESHOLD,
): CycleReport {
  const groups = findDuplicates(frames, duplicateThreshold);
  const uniquePoses =
    groups.length > 0 ? groups.length + frames.length - groups.reduce((sum, group) => sum + group.frames.length, 0) : frames.length;
  const groundLine = Math.max(0, ...frames.map((frame) => frame.lowestY));
  const clearances = frames.map((frame) => groundLine - frame.lowestY);
  const separations = frames.map((frame) => frame.footSeparation).filter((value): value is number => value !== null);
  return {
    label,
    frameCount: frames.length,
    uniquePoses,
    duplicateGroups: groups,
    halfCycleDistance: meanHalfCycleDistance(frames),
    adjacentDistance: meanAdjacentDistance(frames),
    headDriftPx: range(frames.map((frame) => frame.headX)),
    groundLineVariationPx: range(frames.map((frame) => frame.lowestY)),
    figureHeightRangePx: range(frames.map((frame) => frame.height)),
    framesOnGround: clearances.filter((value) => value <= 2).length,
    meanGroundClearancePx: mean(clearances),
    maxGroundClearancePx: Math.max(0, ...clearances),
    footSeparationRangePx: separations.length >= 2 ? range(separations) : null,
    frames,
  };
}

export function reportToMarkdown(report: CycleReport, pixelsPerBody: number): string {
  const bodies = (value: number) => (value / pixelsPerBody).toFixed(2);
  return [
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Frames analysed | ${report.frameCount} |`,
    `| Unique poses | **${report.uniquePoses}** |`,
    `| Repeated-pose groups | ${report.duplicateGroups.length} |`,
    `| Mean pose distance, frame i vs i+n/2 | **${report.halfCycleDistance.toFixed(3)}** |`,
    `| Mean pose distance, neighbouring frames | ${report.adjacentDistance.toFixed(3)} |`,
    `| Head drift across the cycle | ${report.headDriftPx.toFixed(1)} px (${bodies(report.headDriftPx)} body heights) |`,
    `| Ground line variation | ${report.groundLineVariationPx.toFixed(1)} px |`,
    `| Figure height range | ${report.figureHeightRangePx.toFixed(1)} px |`,
    `| Frames touching the ground | **${report.framesOnGround} of ${report.frameCount}** |`,
    `| Mean ground clearance | ${report.meanGroundClearancePx.toFixed(1)} px |`,
    `| Maximum ground clearance | ${report.maxGroundClearancePx.toFixed(1)} px |`,
    `| Foot separation range | ${report.footSeparationRangePx === null ? "n/a" : `${report.footSeparationRangePx.toFixed(1)} px`} |`,
  ].join("\n");
}

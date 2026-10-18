/**
 * Every acceptance threshold lives here so that a gate report can quote the
 * numbers it was judged against, and so that loosening a gate is one visible
 * diff rather than a scattered argument.
 */
export const GATE_THRESHOLDS = {
  /** Generated silhouette vs. deterministic control plate. */
  controlIoU: 0.92,
  /** Adjacent frames of the same cycle must be at least this similar. */
  adjacentIouMin: 0.55,
  /**
   * A *change* this large in adjacent-frame IoU between neighbouring pairs means
   * one pair disagrees with the trend — a visible pop. A large but smooth step is
   * normal in a 16-frame run and is not a defect. The heel-strike transition is
   * the fastest silhouette event in the cycle (a whole shoe enters the contour in
   * one frame step) and measures 0.118 at 16 frames, so the budget is 0.15. The
   * continuity of the strike itself is enforced geometrically in
   * `src/rig/rig.test.ts`, where the tolerance is half a pixel, not a percentage.
   */
  adjacentIouDropMax: 0.15,
  /** Centroid drift, in px, allowed between adjacent frames. */
  centroidJitterPx: 1.5,
  /** Contact-frame sole must sit within this distance of the ground line. */
  groundDeltaPx: 1,
  /** Any detached opaque speck is a defect. */
  maxIslands: 0,
  /** Any chroma-key fringe is a defect. */
  maxSpillPixels: 0,
  /** Arms and legs must both be present and separated. */
  requiredLimbs: 4,
} as const;

export interface GateResult {
  readonly name: string;
  readonly value: number;
  readonly threshold: number;
  readonly comparison: 'min' | 'max' | 'equal';
  readonly passed: boolean;
}

export function minGate(name: string, value: number, threshold: number): GateResult {
  return { name, value, threshold, comparison: 'min', passed: value >= threshold };
}

export function maxGate(name: string, value: number, threshold: number): GateResult {
  return { name, value, threshold, comparison: 'max', passed: value <= threshold };
}

export function allPassed(results: readonly GateResult[]): boolean {
  return results.every((result) => result.passed);
}

export function summarizeFailures(results: readonly GateResult[]): string[] {
  return results
    .filter((result) => !result.passed)
    .map((result) => `${result.name}: ${result.value.toFixed(3)} (${result.comparison} ${result.threshold})`);
}

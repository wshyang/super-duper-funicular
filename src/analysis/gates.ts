import type { RasterImage } from '../core/types.js';
import {
  countChromaSpill,
  countOpaqueIslands,
  lowestOpaqueRow,
  silhouetteIou,
  silhouetteStats,
} from './silhouette.js';
import { GATE_THRESHOLDS, maxGate, minGate, type GateResult } from './thresholds.js';

const KEY_MAGENTA = { r: 255, g: 0, b: 255 };

export interface FrameGateInput {
  readonly candidate: RasterImage;
  readonly control: RasterImage;
  readonly expectedGroundY: number;
  readonly isContactFrame: boolean;
}

/** Numeric acceptance for one generated frame against its control plate. */
export function evaluateFrameGates(input: FrameGateInput): GateResult[] {
  const results: GateResult[] = [];
  results.push(minGate('controlIoU', silhouetteIou(input.candidate, input.control), GATE_THRESHOLDS.controlIoU));
  results.push(maxGate('islands', countOpaqueIslands(input.candidate, 2), GATE_THRESHOLDS.maxIslands));
  results.push(maxGate('chromaSpill', countChromaSpill(input.candidate, KEY_MAGENTA), GATE_THRESHOLDS.maxSpillPixels));
  const groundDelta = lowestOpaqueRow(input.candidate) - input.expectedGroundY;
  if (input.isContactFrame) {
    results.push(maxGate('groundDeltaPx', Math.abs(groundDelta), GATE_THRESHOLDS.groundDeltaPx));
  }
  return results;
}

/**
 * Horizontal centre of the head: the top 12 % of the silhouette. The full
 * silhouette centroid legitimately moves when a limb swings; the head must not,
 * and head drift is exactly what a viewer reads as the character sliding.
 */
export function headCentreX(frame: RasterImage): number {
  const stats = silhouetteStats(frame);
  if (!stats.bounds) return 0;
  const height = stats.bounds.maxY - stats.bounds.minY;
  const limit = stats.bounds.minY + Math.max(4, Math.round(height * 0.12));
  let sum = 0;
  let count = 0;
  for (let y = stats.bounds.minY; y <= limit; y++) {
    for (let x = 0; x < frame.width; x++) {
      if ((frame.data[(y * frame.width + x) * 4 + 3] ?? 0) <= 16) continue;
      sum += x;
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

/** Cross-frame gates: a cycle is judged as a sequence, not as isolated stills. */
export function evaluateCycleGates(
  frames: readonly RasterImage[],
  contactFrames?: readonly boolean[],
): GateResult[] {
  const results: GateResult[] = [];
  // Pop is a *discontinuity*, not a large step. A 16-frame run genuinely changes
  // a third of its silhouette between neighbouring phases; what a viewer sees as
  // popping is one pair disagreeing with the trend of its neighbours. So the
  // metric is the largest change in adjacent-frame IoU around the loop, which is
  // frame-count independent, rather than the largest single drop.
  const adjacent = frames.map((frame, index) =>
    silhouetteIou(frame, frames[(index + 1) % frames.length] as RasterImage),
  );
  let pop = 0;
  let worstJitter = 0;
  for (let i = 0; i < adjacent.length; i++) {
    const previous = adjacent[(i - 1 + adjacent.length) % adjacent.length] as number;
    pop = Math.max(pop, Math.abs((adjacent[i] as number) - previous));
    worstJitter = Math.max(
      worstJitter,
      Math.abs(headCentreX(frames[i] as RasterImage) - headCentreX(frames[(i + 1) % frames.length] as RasterImage)),
    );
  }
  results.push(maxGate('adjacentPop', pop, GATE_THRESHOLDS.adjacentIouDropMax));
  results.push(maxGate('centroidJitterPx', worstJitter, GATE_THRESHOLDS.centroidJitterPx));
  const contactRows = frames
    .map((frame, index) => ({ frame, contact: contactFrames?.[index] ?? true }))
    .filter((entry) => entry.contact)
    .map((entry) => lowestOpaqueRow(entry.frame));
  if (contactRows.length > 0) {
    const spread = Math.max(...contactRows) - Math.min(...contactRows);
    results.push(maxGate('contactGroundSpreadPx', spread, 2));
  }
  return results;
}

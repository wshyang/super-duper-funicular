import type { FlawFinding, FlawReport, Raster } from '../../shared/types.ts';
import type { RawCellStats } from '../pipeline/extract.ts';
import { alignedIou, bottomBandRuns, silhouetteOf, type Silhouette } from './silhouette.ts';

const HALF_CYCLE_DUPLICATE_IOU = 0.75;
const CROSSOVER_FRACTION = 0.2;
const DRIFT_PX = 8;

/**
 * FLAW-01..05 forensics over the extracted frames + raw cell stats
 * (FDS #feat-flaw-analysis). Frames are ordered palette-major, 8 per palette;
 * the red (crimson) row is the published reference row.
 */
export function analyseSourceFlaws(
  framesByRow: readonly (readonly Raster[])[],
  rawStats: readonly RawCellStats[],
  sourceSha256: string,
): FlawReport {
  const row = framesByRow[0] ?? [];
  const silhouettes = row.map(silhouetteOf);
  const halfCycleIou = pairs(silhouettes, 4);
  const adjacentIou = pairs(silhouettes, 1);
  const meanHalf = mean(halfCycleIou);
  const meanAdjacent = mean(adjacentIou);
  const stats = rawStats.filter((s) => s.palette === (rawStats[0]?.palette ?? 'crimson'));
  const groundJitter = spread(stats.map((s) => s.rawGroundY));
  const centroidDrift = spread(stats.map((s) => s.rawCentroidX));
  const heightVariance = spread(stats.map((s) => s.rawBounds.h));
  const separations = silhouettes.map((s) => footSeparation(s));
  const minSeparation = Math.min(...separations);
  const figureWidth = Math.max(...silhouettes.map((s) => runWidth(s)));
  const leadSigns = row.map((raster, i) => leadSign(raster, silhouettes[i] as (typeof silhouettes)[number]));
  const leadSwaps = signChanges(leadSigns);
  const naiveTotal = stats.reduce((sum, s) => sum + s.naiveResidue, 0);
  const keyedTotal = stats.reduce((sum, s) => sum + s.keyedResidue, 0);
  const flaws: FlawFinding[] = [
    flaw01(meanHalf),
    flaw02(leadSwaps, leadSigns),
    flaw03(minSeparation, figureWidth),
    flaw04(groundJitter, heightVariance),
    flaw05(naiveTotal, keyedTotal),
  ];
  return {
    version: 1,
    sourceSha256,
    flaws,
    halfCycleIou: halfCycleIou.map(round3),
    meanHalfCycleIou: round3(meanHalf),
    meanAdjacentIou: round3(meanAdjacent),
    groundJitterPx: groundJitter,
    centroidDriftPx: round2(centroidDrift),
    heightVariancePx: heightVariance,
    minFootSeparationPx: minSeparation,
    leadSwaps,
  };
}

function pairs(silhouettes: readonly ReturnType<typeof silhouetteOf>[], offset: number): number[] {
  const out: number[] = [];
  for (let i = 0; i + offset < silhouettes.length; i += 1) {
    out.push(alignedIou(silhouettes[i] as (typeof silhouettes)[number], silhouettes[i + offset] as (typeof silhouettes)[number]));
  }
  return out;
}

function footSeparation(s: ReturnType<typeof silhouetteOf>): number {
  const runs = bottomBandRuns(s, 0.12);
  if (runs.length < 2) return runWidth(s);
  const first = runs[0] as { start: number; end: number };
  const last = runs[runs.length - 1] as { start: number; end: number };
  return last.start - first.end;
}

/**
 * Lead-leg identity from limb shading: the sheet draws far limbs in a darker
 * tone, so the darker bottom-band run is the far leg. +1 = far leg leads.
 * An alternating cycle flips this sign twice per loop; the flawed sheet never
 * flips it (FLAW-02).
 */
function leadSign(raster: Raster, s: ReturnType<typeof silhouetteOf>): number {
  const runs = bottomBandRuns(s, 0.12);
  if (runs.length < 2) return 0;
  const first = runs[0] as { start: number; end: number };
  const last = runs[runs.length - 1] as { start: number; end: number };
  const rearLum = runLuminance(raster, s, first);
  const frontLum = runLuminance(raster, s, last);
  if (rearLum === frontLum) return 0;
  return frontLum < rearLum ? 1 : -1;
}

function runLuminance(raster: Raster, s: Silhouette, run: { start: number; end: number }): number {
  const top = Math.floor(s.height * 0.88);
  let sum = 0;
  let n = 0;
  for (let y = top; y < s.height; y += 1) {
    for (let x = run.start; x <= run.end; x += 1) {
      if ((s.mask[y * s.width + x] ?? 0) !== 1) continue;
      const i = (y * raster.width + x) * 4;
      sum += 0.299 * (raster.data[i] ?? 0) + 0.587 * (raster.data[i + 1] ?? 0) + 0.114 * (raster.data[i + 2] ?? 0);
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

function runWidth(s: ReturnType<typeof silhouetteOf>): number {
  const runs = bottomBandRuns(s, 0.5);
  return runs.length === 0 ? 0 : ((runs[runs.length - 1] as { end: number }).end - (runs[0] as { start: number }).start);
}

function signChanges(values: readonly number[]): number {
  let changes = 0;
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1] ?? 0;
    const curr = values[i] ?? 0;
    if (prev !== 0 && curr !== 0 && prev !== curr) changes += 1;
  }
  return changes;
}

const flaw01 = (meanHalf: number): FlawFinding => ({
  id: 'FLAW-01',
  severity: 'critical',
  title: 'Half-cycle frame duplication',
  detected: meanHalf >= HALF_CYCLE_DUPLICATE_IOU,
  evidence: `mean IoU(frame k, k+4) = ${round3(meanHalf)} (threshold ${HALF_CYCLE_DUPLICATE_IOU})`,
});

const flaw02 = (leadSwaps: number, signs: readonly number[]): FlawFinding => ({
  id: 'FLAW-02',
  severity: 'critical',
  title: 'Missing alternating gait (unilateral lead)',
  detected: leadSwaps === 0,
  evidence: `lead-sign sequence [${signs.join(',')}] with ${leadSwaps} swaps across 8 frames`,
});

const flaw03 = (minSeparation: number, figureWidth: number): FlawFinding => ({
  id: 'FLAW-03',
  severity: 'critical',
  title: 'Zero leg crossover (no pass phase)',
  detected: minSeparation > figureWidth * CROSSOVER_FRACTION,
  evidence: `min foot separation ${minSeparation}px vs figure width ${figureWidth}px (crossover needs < ${round2(figureWidth * CROSSOVER_FRACTION)}px)`,
});

const flaw04 = (groundJitter: number, heightVariance: number): FlawFinding => ({
  id: 'FLAW-04',
  severity: 'major',
  title: 'Unregistered pivot and scale jitter',
  detected: groundJitter > DRIFT_PX || heightVariance > DRIFT_PX,
  evidence: `raw ground-line jitter ${groundJitter}px, height spread ${heightVariance}px (threshold ${DRIFT_PX}px)`,
});

const flaw05 = (naive: number, keyed: number): FlawFinding => ({
  id: 'FLAW-05',
  severity: 'moderate',
  title: 'Two-tone magenta + JPEG chroma spill',
  detected: naive > 0,
  evidence: `naive single-tone key leaves ${naive} magenta-like px; flood+despill key leaves ${keyed}`,
});

function spread(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

const round3 = (v: number): number => Math.round(v * 1000) / 1000;
const round2 = (v: number): number => Math.round(v * 100) / 100;

import type { DuplicatePair, FlawAnalysis } from '../shared/types.ts';
import type { ExtractedFrame, ExtractionSet } from './extractor.ts';
import { centroidAlignedIou, footClusters } from './silhouette.ts';

export const NEAR_DUPLICATE_IOU = 0.78;
export const DUPLICATE_IOU = 0.9;

const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

const computePairs = (frames: readonly ExtractedFrame[]): DuplicatePair[] => {
  const pairs: DuplicatePair[] = [];
  const byPalette = new Map<string, ExtractedFrame[]>();
  for (const frame of frames) {
    const list = byPalette.get(frame.palette) ?? [];
    list.push(frame);
    byPalette.set(frame.palette, list);
  }
  for (const list of byPalette.values()) {
    for (let index = 0; index < list.length; index += 1) {
      for (let other = index + 1; other < list.length; other += 1) {
        const a = list[index] as ExtractedFrame;
        const b = list[other] as ExtractedFrame;
        const iou = centroidAlignedIou(a.silhouette, b.silhouette);
        if (iou >= NEAR_DUPLICATE_IOU) {
          pairs.push({ a: a.id, b: b.id, iou: Number(iou.toFixed(4)) });
        }
      }
    }
  }
  return pairs.sort((left, right) => right.iou - left.iou);
};

interface FootEvidence {
  readonly separation: number;
  readonly stanceSide: 'front' | 'back' | 'single' | 'none';
}

const footEvidence = (frames: readonly ExtractedFrame[]): FootEvidence[] =>
  frames.map((frame) => {
    const clusters = footClusters(frame.silhouette);
    return { separation: clusters.separation, stanceSide: clusters.stanceSide };
  });

const jitter = (
  frames: readonly ExtractedFrame[],
  pick: (frame: ExtractedFrame) => number,
): number => {
  const byPalette = new Map<string, number[]>();
  for (const frame of frames) {
    const list = byPalette.get(frame.palette) ?? [];
    list.push(pick(frame));
    byPalette.set(frame.palette, list);
  }
  const ranges = [...byPalette.values()].map((values) => Math.max(...values) - Math.min(...values));
  return ranges.reduce((sum, value) => sum + value, 0) / Math.max(1, ranges.length);
};

const uniquePairCount = (pairs: readonly DuplicatePair[]): number =>
  new Set(pairs.map((pair) => pairKey(pair.a, pair.b))).size;

const duplicateStatistics = (
  frames: ExtractionSet['frames'],
): {
  readonly nearDuplicates: readonly DuplicatePair[];
  readonly duplicatePairs: readonly DuplicatePair[];
  readonly quarterPairs: readonly DuplicatePair[];
  readonly meanDuplicateIou: number;
  readonly maxDuplicateIou: number;
} => {
  const nearDuplicates = computePairs(frames);
  const duplicatePairs = nearDuplicates.filter((pair) => pair.iou >= DUPLICATE_IOU);
  const quarterPairs = duplicatePairs.filter(
    (pair) => Math.abs(Number(pair.a.slice(-2)) - Number(pair.b.slice(-2))) === 4,
  );
  const meanDuplicateIou =
    duplicatePairs.reduce((sum, pair) => sum + pair.iou, 0) / Math.max(1, duplicatePairs.length);
  const maxDuplicateIou = Math.max(0, ...duplicatePairs.map((pair) => pair.iou));
  return { nearDuplicates, duplicatePairs, quarterPairs, meanDuplicateIou, maxDuplicateIou };
};

const stanceStatistics = (
  frames: ExtractionSet['frames'],
): {
  readonly separations: readonly number[];
  readonly fronts: number;
  readonly backs: number;
  readonly lockRatio: number;
  readonly crossoverFrames: number;
} => {
  const evidence = footEvidence(frames);
  const separations = evidence.map((item) => item.separation).filter((value) => value > 0);
  const stated = evidence.filter(
    (item) => item.stanceSide === 'front' || item.stanceSide === 'back',
  );
  const fronts = stated.filter((item) => item.stanceSide === 'front').length;
  const backs = stated.filter((item) => item.stanceSide === 'back').length;
  const lockRatio = stated.length === 0 ? 0 : Math.max(fronts, backs) / stated.length;
  const crossoverFrames = evidence.filter(
    (item) => item.stanceSide === 'single' || item.separation < 12,
  ).length;
  return { separations, fronts, backs, lockRatio, crossoverFrames };
};

interface AnalysisNumbers {
  readonly duplicatePairs: readonly DuplicatePair[];
  readonly quarterPairs: readonly DuplicatePair[];
  readonly fronts: number;
  readonly backs: number;
  readonly meanDuplicateIou: number;
  readonly maxDuplicateIou: number;
  readonly minFootSeparationPx: number;
  readonly maxFootSeparationPx: number;
  readonly lockRatio: number;
  readonly crossoverFrames: number;
  readonly scaleJitterPx: number;
  readonly baselineJitterPx: number;
}

const summarizeFlaws = (set: ExtractionSet): AnalysisNumbers => {
  const { frames } = set;
  const { duplicatePairs, quarterPairs, meanDuplicateIou, maxDuplicateIou } =
    duplicateStatistics(frames);
  const { separations, fronts, backs, lockRatio, crossoverFrames } = stanceStatistics(frames);
  const minFootSeparationPx = separations.length === 0 ? 0 : Math.min(...separations);
  const maxFootSeparationPx = separations.length === 0 ? 0 : Math.max(...separations);
  const scaleJitterPx = jitter(
    frames,
    (frame) => frame.silhouette.bounds.maxY - frame.silhouette.bounds.minY,
  );
  const baselineJitterPx = jitter(frames, (frame) => frame.silhouette.bounds.maxY);
  return {
    duplicatePairs,
    quarterPairs,
    fronts,
    backs,
    meanDuplicateIou,
    maxDuplicateIou,
    minFootSeparationPx,
    maxFootSeparationPx,
    lockRatio,
    crossoverFrames,
    scaleJitterPx,
    baselineJitterPx,
  };
};

const meanIou = (pairs: readonly DuplicatePair[]): number =>
  pairs.reduce((sum, pair) => sum + pair.iou, 0) / Math.max(1, pairs.length);

const duplicateFinding = (numbers: AnalysisNumbers): string =>
  `${uniquePairCount(numbers.duplicatePairs)} frame pairs across the six colourways exceed ${(DUPLICATE_IOU * 100).toFixed(0)}% centroid-aligned silhouette IoU (mean ${(numbers.meanDuplicateIou * 100).toFixed(1)}%).`;

const replayFinding = (numbers: AnalysisNumbers): string => {
  const relevant = numbers.quarterPairs.length > 0 ? numbers.quarterPairs : numbers.duplicatePairs;
  if (numbers.quarterPairs.length === 0)
    return 'No four-column duplicate pattern was detected in this sheet.';
  return `${relevant.length} of those pairs are four columns apart, evidence that frames 5–8 replay frames 1–4 (mean ${(meanIou(relevant) * 100).toFixed(1)}% IoU).`;
};

const feetFinding = (numbers: AnalysisNumbers): string =>
  `Foot separation ranges from ${numbers.minFootSeparationPx.toFixed(1)} px to ${numbers.maxFootSeparationPx.toFixed(1)} px; ${numbers.crossoverFrames} frame(s) show crossed or merged feet.`;

const stanceFinding = (numbers: AnalysisNumbers): string =>
  `The lower (stance) foot sits on the same front/back side in ${(numbers.lockRatio * 100).toFixed(0)}% of resolved frames (${numbers.fronts} front, ${numbers.backs} back) — a high value indicates unilateral lead-leg lock.`;

const jitterFinding = (numbers: AnalysisNumbers): string =>
  `Mean row bounding-box height range is ${numbers.scaleJitterPx.toFixed(1)} px and mean baseline range is ${numbers.baselineJitterPx.toFixed(1)} px, quantifying scale and ground-drift jitter.`;

const buildFindings = (numbers: AnalysisNumbers): readonly string[] => [
  duplicateFinding(numbers),
  replayFinding(numbers),
  feetFinding(numbers),
  stanceFinding(numbers),
  jitterFinding(numbers),
];

export const analyseExtraction = (set: ExtractionSet): FlawAnalysis => {
  const { frames } = set;
  const numbers = summarizeFlaws(set);
  const duplicatePairs = numbers.duplicatePairs;
  const findings = buildFindings(numbers);
  return {
    generatedBy: 'npm run sprites:analyse',
    frameCount: frames.length,
    uniqueCount: frames.length - duplicatePairs.length,
    duplicateThreshold: DUPLICATE_IOU,
    meanDuplicateIou: Number(numbers.meanDuplicateIou.toFixed(4)),
    maxDuplicateIou: Number(numbers.maxDuplicateIou.toFixed(4)),
    duplicatePairs,
    nearDuplicates: computePairs(frames),
    scaleJitterPx: Number(numbers.scaleJitterPx.toFixed(2)),
    baselineJitterPx: Number(numbers.baselineJitterPx.toFixed(2)),
    minFootSeparationPx: Number(numbers.minFootSeparationPx.toFixed(2)),
    maxFootSeparationPx: Number(numbers.maxFootSeparationPx.toFixed(2)),
    leadLegLockRatio: Number(numbers.lockRatio.toFixed(3)),
    crossoverFrames: numbers.crossoverFrames,
    findings,
  };
};

export const renderAnalysisMarkdown = (analysis: FlawAnalysis, sourceLabel: string): string => {
  const lines: string[] = [
    '# Sprite-sheet flaw analysis',
    '',
    '> Generated by `npm run sprites:analyse`. Do not hand-edit; regenerate instead.',
    '',
    `Source: \`${sourceLabel}\` — ${analysis.frameCount} extracted frames, ${analysis.uniqueCount} not duplicate-classified.`,
    '',
    '## Method',
    '',
    'Silhouettes are alpha > 127 from the magenta-keyed cells. IoU is measured after translating the',
    'second silhouette so its centroid matches the first; no rescaling or per-frame re-centring is applied',
    'to the stored frames. Foot contact is estimated from the lowest 16% band of each silhouette and is a',
    'silhouette proxy, not limb tracking.',
    '',
    '## Findings',
    '',
    ...analysis.findings.map((finding) => `- ${finding}`),
    '',
    '## Measurements',
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Duplicate threshold | ${(analysis.duplicateThreshold * 100).toFixed(0)}% IoU |`,
    `| Duplicate pairs | ${analysis.duplicatePairs.length} |`,
    `| Near-duplicate pairs (≥78%) | ${analysis.nearDuplicates.length} |`,
    `| Mean duplicate IoU | ${(analysis.meanDuplicateIou * 100).toFixed(1)}% |`,
    `| Maximum duplicate IoU | ${(analysis.maxDuplicateIou * 100).toFixed(1)}% |`,
    `| Mean row scale jitter | ${analysis.scaleJitterPx.toFixed(1)} px |`,
    `| Mean row baseline jitter | ${analysis.baselineJitterPx.toFixed(1)} px |`,
    `| Foot separation range | ${analysis.minFootSeparationPx.toFixed(1)}–${analysis.maxFootSeparationPx.toFixed(1)} px |`,
    `| Stance-side lock ratio | ${(analysis.leadLegLockRatio * 100).toFixed(0)}% |`,
    `| Crossed / merged-foot frames | ${analysis.crossoverFrames} |`,
    '',
    '## Limits',
    '',
    '- IoU proves silhouette repetition, not pose identity: a duplicated drawing and a genuinely repeated',
    '  pose look the same to this metric.',
    '- The foot proxy can merge both shoes into one run when they overlap in profile; those frames are',
    '  counted as crossed/merged rather than silently assigned a side.',
    '- The analysis says nothing about colour separation between jersey and magenta backdrop beyond the',
    '  extraction spill gate reported in the manifest pipeline.',
    '',
  ];
  return lines.join('\n');
};

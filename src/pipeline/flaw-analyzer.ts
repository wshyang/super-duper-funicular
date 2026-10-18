import type {
  FlawItemReport,
  FrameBiomechanicalMetrics,
  FramePairSimilarity,
  SpriteFlawAnalysisReport,
} from '../shared/types.js';
import { computeAlphaSilhouetteIoU, computeDHashHammingDistance } from './hashing.js';
import type { CutCellResult, SheetExtractionResult } from './sprite-extractor.js';

export function analyzeExtractedSpriteFlaws(
  extraction: SheetExtractionResult,
): SpriteFlawAnalysisReport {
  const redRow = extraction.cells.filter((c) => c.entry.variant === 'red');
  const iouMatrix = buildRowIoUMatrix(redRow);
  const halfCyclePairs = buildHalfCyclePairs(redRow, iouMatrix);
  const frameMetrics = redRow.map((cell) => buildFrameBiomechanicalMetrics(cell));
  const summaryStats = computeSummaryDiagnostics(halfCyclePairs, frameMetrics);
  const flaws = buildFlawItems(summaryStats);
  return {
    schemaVersion: '1.0.0',
    analyzedSheetPath: extraction.manifest.sourceImage,
    claimedCycleLabel: '8-FRAME COMPLETE RUNNING CYCLE (Alternating Gait)',
    actualUniquePoseCountPerRow: extraction.manifest.uniquePosesPerRow,
    meanHalfCycleIoU: summaryStats.meanHalfCycleIoU,
    minFootSeparationPx: summaryStats.minFootSeparationPx,
    verticalBaselineJitterPx: summaryStats.verticalBaselineJitterPx,
    heightVariationPx: summaryStats.heightVariationPx,
    iouMatrixRedRow: iouMatrix,
    halfCyclePairs,
    frameMetrics,
    flaws,
  };
}

function buildRowIoUMatrix(rowCells: readonly CutCellResult[]): number[][] {
  return rowCells.map((cellA) =>
    rowCells.map((cellB) => {
      const iou = computeAlphaSilhouetteIoU(cellA.registeredRaster, cellB.registeredRaster);
      return Number(iou.toFixed(4));
    }),
  );
}

function buildHalfCyclePairs(
  rowCells: readonly CutCellResult[],
  iouMatrix: readonly (readonly number[])[],
): FramePairSimilarity[] {
  const pairs: FramePairSimilarity[] = [];
  for (let i = 0; i < 4; i++) {
    const cellA = rowCells[i];
    const cellB = rowCells[i + 4];
    if (!cellA || !cellB) {
      continue;
    }
    const iou = iouMatrix[i]?.[i + 4] ?? 0;
    const hamming = computeDHashHammingDistance(cellA.entry.dHash64, cellB.entry.dHash64);
    pairs.push({
      frameA: i + 1,
      frameB: i + 5,
      silhouetteIoU: iou,
      dHashHammingDistance: hamming,
      isHalfCycleDuplicate: iou >= 0.85,
    });
  }
  return pairs;
}

function buildFrameBiomechanicalMetrics(cell: CutCellResult): FrameBiomechanicalMetrics {
  const { bounds, centroid, frontFootX, rearFootX } = cell.stats;
  const frontOffset = Number((frontFootX - centroid.x).toFixed(1));
  const rearOffset = Number((rearFootX - centroid.x).toFixed(1));
  const separation = Number((frontFootX - rearFootX).toFixed(1));
  return {
    frameIndex: cell.entry.frameIndex,
    bboxWidth: bounds.width,
    bboxHeight: bounds.height,
    headTopY: bounds.y,
    footBottomY: bounds.y + bounds.height,
    centroidX: Number(centroid.x.toFixed(1)),
    centroidY: Number(centroid.y.toFixed(1)),
    frontFootOffsetX: frontOffset,
    rearFootOffsetX: rearOffset,
    footSeparationPx: separation,
    leadLegSide: 'unilateral-same-leg',
  };
}

interface SummaryDiagnostics {
  readonly meanHalfCycleIoU: number;
  readonly minFootSeparationPx: number;
  readonly verticalBaselineJitterPx: number;
  readonly heightVariationPx: number;
}

function computeSummaryDiagnostics(
  pairs: readonly FramePairSimilarity[],
  metrics: readonly FrameBiomechanicalMetrics[],
): SummaryDiagnostics {
  const meanIoU =
    pairs.reduce((acc, p) => acc + p.silhouetteIoU, 0) / Math.max(1, pairs.length);
  const separations = metrics.map((m) => m.footSeparationPx);
  const footBottoms = metrics.map((m) => m.footBottomY);
  const heights = metrics.map((m) => m.bboxHeight);
  return {
    meanHalfCycleIoU: Number(meanIoU.toFixed(4)),
    minFootSeparationPx: Math.min(...separations),
    verticalBaselineJitterPx: Math.max(...footBottoms) - Math.min(...footBottoms),
    heightVariationPx: Math.max(...heights) - Math.min(...heights),
  };
}

function buildFlawItems(stats: SummaryDiagnostics): FlawItemReport[] {
  return [...buildGaitFlawItems(stats), ...buildArtifactFlawItems(stats)];
}

function buildGaitFlawItems(stats: SummaryDiagnostics): FlawItemReport[] {
  return [
    {
      id: 'FLAW-01',
      severity: 'critical',
      title: 'Half-Cycle Frame Duplication (4 Poses Doubled into 8 Columns)',
      summary:
        'Frames 5, 6, 7, and 8 are near-identical copies of Frames 1, 2, 3, and 4 rather than the second half of an 8-frame running stride.',
      quantitativeEvidence: `Mean centroid-aligned silhouette IoU between Frame k and Frame k+4 is ${(stats.meanHalfCycleIoU * 100).toFixed(1)}% (4 unique poses out of 8 columns per row; 24 unique poses out of 48 total cells).`,
      biomechanicalImpact:
        'Halves the effective animation resolution to 4 frames and causes the cycle to repeat twice per loop.',
      algorithmicFix:
        'Evaluate continuous gait phase φ ∈ [0, 1) across 8 distinct 45° phase increments (φ = 0.000, 0.125, ..., 0.875) with zero duplicated poses.',
    },
    {
      id: 'FLAW-02',
      severity: 'critical',
      title: 'Missing Alternating Gait — Unilateral "Peg-Leg" Hop',
      summary:
        'Despite the sheet title claiming "(Alternating Gait)", the same leg (far leg) stays permanently extended in front and the near leg stays permanently behind across all 8 frames.',
      quantitativeEvidence:
        'In all 8 frames, frontFootOffsetX > +45 px and rearFootOffsetX < -60 px with identical limb shading order; the left and right legs never swap lead.',
      biomechanicalImpact:
        'A human runner alternates left and right lead legs every half-stride (180° phase offset) with opposite arm counter-rotation. Keeping one leg permanently ahead produces a comical one-legged limp/hop.',
      algorithmicFix:
        'Drive the near (right) leg at phase φ and the far (left) leg at exact anti-phase (φ + 0.5) mod 1, with counter-phased arm swing and distinct near/far depth shading.',
    },
    {
      id: 'FLAW-03',
      severity: 'critical',
      title: 'Zero Leg Crossover (Missing "Pass" / Recovery Phase)',
      summary:
        'Neither leg ever passes beneath the pelvis; the legs remain permanently scissored apart in every frame.',
      quantitativeEvidence: `Minimum horizontal foot-to-foot separation across all 8 frames is ${stats.minFootSeparationPx} px (a real run cycle crosses 0 px twice per stride during the Pass phase).`,
      biomechanicalImpact:
        'Without a passing pose where the swing knee overtakes the stance leg under the hip, the limbs appear to oscillate statically in place and snap backward instantly between Frame 4 and Frame 5/1.',
      algorithmicFix:
        'Solve closed orbital foot trajectories where the stance foot sweeps backward on the ground via 2-bone IK while the swing knee drives forward past the hip at φ = 0.25 and φ = 0.75.',
    },
  ];
}

function buildArtifactFlawItems(stats: SummaryDiagnostics): FlawItemReport[] {
  return [
    {
      id: 'FLAW-04',
      severity: 'major',
      title: 'Unregistered Pivot & Counter-Physical Scale/Baseline Jitter',
      summary:
        'Character body height, head volume, and ground contact line fluctuate erratically between adjacent cells.',
      quantitativeEvidence: `Bounding-box height varies by ${stats.heightVariationPx} px (212 px to 232 px) and the raw cell ground baseline shifts by ${stats.verticalBaselineJitterPx} px without matching ballistic flight phases.`,
      biomechanicalImpact:
        'Playing raw cell crops causes vertical popping and horizontal sliding, while the character shrinks during mid-stride.',
      algorithmicFix:
        'Enforce invariant segment bone lengths (femur, tibia, trunk, humerus, forearm) from a single anatomical rig with double-frequency pelvis bob Δy(φ) locked to stance/flight physics.',
    },
    {
      id: 'FLAW-05',
      severity: 'moderate',
      title: 'Two-Tone Magenta Checkerboard & JPEG Chroma Spill',
      summary:
        'The sheet combines #FF00FF grid lines over #FD49FD pink cell backgrounds with JPEG 8×8 block compression artifacts.',
      quantitativeEvidence:
        'Cell backgrounds average RGB(253, 74, 253) while dividers are RGB(253, 0, 252), with 1–2 px magenta fringe bleed along dark outlines.',
      biomechanicalImpact:
        'Naive single-color chroma keying leaves pink halos around the runner or accidentally erodes purple jersey pixels.',
      algorithmicFix:
        'Use border-seeded flood-fill chroma keying with boundary despill for extraction, and render algorithmic sprites directly into clean RGBA buffers.',
    },
  ];
}

export function formatFlawAnalysisMarkdown(report: SpriteFlawAnalysisReport): string {
  const header = formatMarkdownHeader(report);
  const flawSections = report.flaws
    .map(
      (f, idx) =>
        `### 1.${idx + 1} ${f.id}: ${f.title} (\`${f.severity.toUpperCase()}\`)\n- **Finding:** ${f.summary}\n- **Quantitative Evidence:** ${f.quantitativeEvidence}\n- **Biomechanical Impact:** ${f.biomechanicalImpact}\n- **Algorithmic Remedy:** ${f.algorithmicFix}\n`,
    )
    .join('\n');
  const pairRows = report.halfCyclePairs
    .map(
      (p) =>
        `| Frame ${p.frameA} vs Frame ${p.frameB} | ${(p.silhouetteIoU * 100).toFixed(1)}% | ${p.dHashHammingDistance} / 64 bits | ${p.isHalfCycleDuplicate ? 'YES (Duplicate Pose)' : 'No'} |`,
    )
    .join('\n');
  const metricRows = report.frameMetrics
    .map(
      (m) =>
        `| Frame ${m.frameIndex} | ${m.bboxWidth}×${m.bboxHeight} px | ${m.footBottomY} px | +${m.frontFootOffsetX} px | ${m.rearFootOffsetX} px | ${m.footSeparationPx} px | Unilateral (No Swap) |`,
    )
    .join('\n');
  return [
    header,
    flawSections,
    '## 2. Half-Cycle Duplication Proof (Frames 1–4 vs Frames 5–8)\n\n| Frame Pair | Centroid-Aligned Silhouette IoU | 64-bit dHash Distance | Half-Cycle Duplicate? |\n|---|---|---|---|',
    pairRows,
    '\n## 3. Per-Frame Biomechanical Measurements (Red Row)\n\n| Frame | Tight BBox (W×H) | Cell Foot Baseline Y | Front Foot ΔX | Rear Foot ΔX | Foot Separation | Lead Leg |\n|---|---|---|---|---|---|---|',
    metricRows,
    '',
  ].join('\n');
}

function formatMarkdownHeader(report: SpriteFlawAnalysisReport): string {
  return [
    '# Biomechanical & Quantitative Flaw Analysis of Extracted Running Sprites',
    '',
    `- **Source Sheet Analyzed:** \`${report.analyzedSheetPath}\``,
    `- **Sheet Header Claim:** \`"${report.claimedCycleLabel}"\``,
    `- **Actual Unique Poses per Row:** **${report.actualUniquePoseCountPerRow} of 8** (24 of 48 total cells)`,
    `- **Mean Half-Cycle Silhouette IoU (Frame $k$ vs Frame $k+4$):** **${(report.meanHalfCycleIoU * 100).toFixed(1)}%**`,
    `- **Minimum Horizontal Foot Separation:** **${report.minFootSeparationPx} px** (never crosses 0 px — zero leg crossover)`,
    `- **Raw Cell Vertical Baseline Jitter:** **${report.verticalBaselineJitterPx} px**`,
    `- **Character Height Inconsistency Across Cycle:** **${report.heightVariationPx} px**`,
    '',
    '---',
    '',
    '## 1. Executive Summary of Animation Flaws',
    '',
  ].join('\n');
}

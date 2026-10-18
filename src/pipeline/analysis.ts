import { NEAR_DUPLICATE_THRESHOLD } from '../shared/constants';
import type {
  DuplicateMeasurement,
  FrameMeasurement,
  PaletteId,
  RowMeasurement,
  SourceAnalysis,
} from '../shared/types';
import type { ExtractionResult, ExtractedFrame } from './extractor';

interface Silhouette {
  readonly width: number;
  readonly height: number;
  readonly mask: Uint8Array;
  readonly area: number;
  readonly centroidX: number;
  readonly centroidY: number;
  readonly bounds: readonly [number, number, number, number];
}

const silhouetteOf = (frame: ExtractedFrame): Silhouette => {
  const { image, record } = frame;
  const mask = new Uint8Array(image.width * image.height);
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) < 128) continue;
      mask[y * image.width + x] = 1;
      area += 1;
      sumX += x;
      sumY += y;
    }
  }
  return {
    width: image.width,
    height: image.height,
    mask,
    area,
    centroidX: area === 0 ? 0 : sumX / area,
    centroidY: area === 0 ? 0 : sumY / area,
    bounds: record.bounds,
  };
};

const alignedIoU = (first: Silhouette, second: Silhouette): number => {
  const shiftX = Math.round(first.centroidX - second.centroidX);
  const shiftY = Math.round(first.centroidY - second.centroidY);
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < first.height; y += 1) {
    const otherY = y - shiftY;
    for (let x = 0; x < first.width; x += 1) {
      const inFirst = first.mask[y * first.width + x] === 1;
      const otherX = x - shiftX;
      const inSecond =
        otherX >= 0 &&
        otherY >= 0 &&
        otherX < second.width &&
        otherY < second.height &&
        second.mask[otherY * second.width + otherX] === 1;
      if (inFirst && inSecond) intersection += 1;
      if (inFirst || inSecond) union += 1;
    }
  }
  return union === 0 ? 0 : intersection / union;
};

const lowerBand = (frame: ExtractedFrame): { count: number; separation: number } => {
  const { image, record } = frame;
  const bandTop = Math.max(0, record.bounds[3] - Math.floor(image.height * 0.16));
  const occupied = new Uint8Array(image.width);
  for (let y = bandTop; y <= record.bounds[3]; y += 1) {
    for (let x = record.bounds[0]; x <= record.bounds[2]; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) >= 128) occupied[x] = 1;
    }
  }
  const clusters: Array<readonly [number, number]> = [];
  let start = -1;
  for (let x = 0; x <= occupied.length; x += 1) {
    const active = x < occupied.length && occupied[x] === 1;
    if (active && start < 0) start = x;
    if (!active && start >= 0) {
      const previous = clusters.at(-1);
      if (previous && start - previous[1] <= 5)
        clusters[clusters.length - 1] = [previous[0], x - 1];
      else clusters.push([start, x - 1]);
      start = -1;
    }
  }
  const centers = clusters.map(([left, right]) => (left + right) / 2);
  return {
    count: centers.length,
    separation: centers.length < 2 ? 0 : (centers.at(-1) ?? 0) - (centers[0] ?? 0),
  };
};

const measureFrame = (frame: ExtractedFrame, silhouette: Silhouette): FrameMeasurement => {
  const lower = lowerBand(frame);
  return {
    id: frame.record.id,
    palette: frame.record.palette,
    column: frame.record.column,
    silhouettePixels: silhouette.area,
    bounds: frame.record.bounds,
    centroid: {
      x: Number(silhouette.centroidX.toFixed(2)),
      y: Number(silhouette.centroidY.toFixed(2)),
    },
    lowerBandClusterCount: lower.count,
    lowerBandSeparationPx: Number(lower.separation.toFixed(2)),
  };
};

const comparePair = (
  first: ExtractedFrame,
  second: ExtractedFrame,
  silhouettes: ReadonlyMap<string, Silhouette>,
): DuplicateMeasurement => ({
  first: first.record.id,
  second: second.record.id,
  centroidAlignedIoU: Number(
    alignedIoU(silhouettes.get(first.record.id)!, silhouettes.get(second.record.id)!).toFixed(4),
  ),
});

const range = (values: readonly number[]): number =>
  values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);

const analyseRow = (
  palette: PaletteId,
  frames: readonly ExtractedFrame[],
  silhouettes: ReadonlyMap<string, Silhouette>,
): RowMeasurement => {
  const ordered = [...frames].sort((left, right) => left.record.column - right.record.column);
  const pairs: DuplicateMeasurement[] = [];
  for (let first = 0; first < ordered.length; first += 1) {
    for (let second = first + 1; second < ordered.length; second += 1) {
      const measurement = comparePair(ordered[first]!, ordered[second]!, silhouettes);
      if (measurement.centroidAlignedIoU >= NEAR_DUPLICATE_THRESHOLD) pairs.push(measurement);
    }
  }
  const quarterCyclePairs = ordered
    .slice(0, 4)
    .map((frame, index) => comparePair(frame, ordered[index + 4]!, silhouettes));
  const bounds = ordered.map(({ record }) => record.bounds);
  return {
    palette,
    frameHeightRangePx: Number(range(bounds.map((box) => box[3] - box[1])).toFixed(2)),
    baselineRangePx: Number(range(bounds.map((box) => box[3])).toFixed(2)),
    nearDuplicatePairs: pairs,
    quarterCyclePairs,
  };
};

export const analyseExtraction = (result: ExtractionResult): SourceAnalysis => {
  const silhouettes = new Map(result.frames.map((frame) => [frame.record.id, silhouetteOf(frame)]));
  const measurements = result.frames.map((frame) =>
    measureFrame(frame, silhouettes.get(frame.record.id)!),
  );
  const palettes = [...new Set(result.frames.map(({ record }) => record.palette))];
  const rows = palettes.map((palette) =>
    analyseRow(
      palette,
      result.frames.filter(({ record }) => record.palette === palette),
      silhouettes,
    ),
  );
  return {
    sourceSha256: result.sourceSha256,
    frameCount: result.frames.length,
    paletteCount: palettes.length,
    nearDuplicateThreshold: NEAR_DUPLICATE_THRESHOLD,
    exactDuplicateCount: result.frames.filter(({ record }) => record.exactDuplicateOf !== null)
      .length,
    magentaSpillPixels: result.frames.reduce((sum, { record }) => sum + record.magentaSpill, 0),
    frames: measurements,
    rows,
  };
};

export const renderAnalysisMarkdown = (analysis: SourceAnalysis): string => {
  const lines = [
    '# Source-sheet analysis',
    '',
    '> Generated by `npm run pipeline`. Re-run the pipeline rather than editing this report.',
    '',
    `- Source SHA-256: \`${analysis.sourceSha256}\``,
    `- Extracted cells: ${analysis.frameCount} (${analysis.paletteCount} colorways)`,
    `- Exact pixel duplicates: ${analysis.exactDuplicateCount} (retained; no similar frames are deleted)`,
    `- Opaque strong-magenta or residual edge-fringe pixels: ${analysis.magentaSpillPixels}`,
    '',
    '## Measurement method and limits',
    '',
    `Centroid-aligned silhouette IoU uses alpha ≥128 and a ${analysis.nearDuplicateThreshold.toFixed(2)} near-duplicate threshold. Alignment translates the second mask by the rounded centroid offset; it does not scale or otherwise normalize the image. Height and baseline ranges are measured from the keyed alpha bounds within each color row. The spill diagnostic counts opaque strong-magenta pixels (R>205, B>195, G<75, with R−G>120 and B−G>115) and magenta-hued pixels (R/B>110, G<155, both excesses>40, |R−B|<80) still touching the cleared matte in an 8-neighbourhood. Edge cleanup expands through at most eight such layers and stops at non-fringe pixels, typically the dark outline; it is a heuristic, not semantic segmentation. The lower-band cluster/separation proxy uses opaque pixels in the lowest 16% of each registered cell; it is not semantic foot or limb tracking. These are source-sheet diagnostics, not evidence of clinical biomechanics or general gait realism.`,
    '',
    '## Per-colorway measurements',
    '',
    '| Colorway | Height range (px) | Baseline range (px) | Near-duplicate pairs | Frames 1–4 vs 5–8 IoU |',
    '|---|---:|---:|---:|---|',
    ...analysis.rows.map(
      (row) =>
        `| ${row.palette} | ${row.frameHeightRangePx.toFixed(2)} | ${row.baselineRangePx.toFixed(2)} | ${row.nearDuplicatePairs.length} | ${row.quarterCyclePairs.map((pair) => pair.centroidAlignedIoU.toFixed(3)).join(', ')} |`,
    ),
    '',
    '## Per-frame evidence',
    '',
    '| Frame | Bounds (x1,y1–x2,y2) | Alpha pixels | Centroid (x,y) | Lower-band clusters | Lower-band separation (px) |',
    '|---|---|---:|---|---:|---:|',
    ...analysis.frames.map(
      (frame) =>
        `| ${frame.id} | ${frame.bounds.join(', ')} | ${frame.silhouettePixels} | ${frame.centroid.x.toFixed(2)}, ${frame.centroid.y.toFixed(2)} | ${frame.lowerBandClusterCount} | ${frame.lowerBandSeparationPx.toFixed(2)} |`,
    ),
    '',
  ];
  return `${lines.join('\n')}\n`;
};

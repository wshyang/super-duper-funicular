import type { SilhouetteMask } from './pose-material-types.js';

export interface MaskDescriptor {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  readonly filled: number;
}

export interface DiversitySummary {
  readonly labels: readonly string[];
  readonly meanPairIou: number;
  readonly maxPairIou: number;
  readonly worstPair: readonly [string, string] | null;
  readonly duplicatePairs: readonly (readonly [string, string, number])[];
  readonly clusters: number;
}

const DESCRIPTOR_SIZE = { width: 96, height: 128 } as const;

/**
 * Pose-invariant descriptor: every silhouette is rescaled to a common height and
 * anchored on its head crown + head centroid. Two frames that differ only by
 * translation or scale therefore score high, and the residual difference is
 * actual pose difference.
 */
export function describeSilhouette(id: string, mask: SilhouetteMask): MaskDescriptor {
  const cells = new Uint8Array(DESCRIPTOR_SIZE.width * DESCRIPTOR_SIZE.height);
  const figureHeight = Math.max(1, mask.maxY - mask.minY + 1);
  const scale = (DESCRIPTOR_SIZE.height * 0.92) / figureHeight;
  let filled = 0;
  for (let y = mask.minY; y <= mask.maxY; y++) {
    for (let x = mask.minX; x <= mask.maxX; x++) {
      if (!mask.data[y * mask.width + x]) continue;
      const dx = x - mask.headCentroid.x;
      const dy = y - mask.minY;
      const cx = Math.round(DESCRIPTOR_SIZE.width / 2 + dx * scale);
      const cy = Math.round(4 + dy * scale);
      if (cx < 0 || cy < 0 || cx >= DESCRIPTOR_SIZE.width || cy >= DESCRIPTOR_SIZE.height) continue;
      const index = cy * DESCRIPTOR_SIZE.width + cx;
      if (!cells[index]) {
        cells[index] = 1;
        filled++;
      }
    }
  }
  return { id, width: DESCRIPTOR_SIZE.width, height: DESCRIPTOR_SIZE.height, cells, filled };
}

export function descriptorIou(a: MaskDescriptor, b: MaskDescriptor): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < a.cells.length; i++) {
    const inA = a.cells[i] === 1;
    const inB = b.cells[i] === 1;
    if (inA && inB) intersection++;
    if (inA || inB) union++;
  }
  return union === 0 ? 0 : intersection / union;
}

export function summarizeDiversity(descriptors: readonly MaskDescriptor[]): DiversitySummary {
  const pairs: Array<[string, string, number]> = [];
  let total = 0;
  let count = 0;
  for (let i = 0; i < descriptors.length; i++) {
    for (let j = i + 1; j < descriptors.length; j++) {
      const a = descriptors[i];
      const b = descriptors[j];
      if (!a || !b) continue;
      const iou = descriptorIou(a, b);
      pairs.push([a.id, b.id, iou]);
      total += iou;
      count++;
    }
  }
  const sorted = [...pairs].sort((x, y) => y[2] - x[2]);
  const duplicates = pairs.filter((entry) => entry[2] >= 0.95);
  return {
    labels: descriptors.map((entry) => entry.id),
    meanPairIou: count === 0 ? 0 : total / count,
    maxPairIou: sorted[0]?.[2] ?? 0,
    worstPair: sorted[0] ? [sorted[0][0], sorted[0][1]] : null,
    duplicatePairs: duplicates,
    clusters: countDuplicateClusters(descriptors, duplicates),
  };
}

function countDuplicateClusters(
  descriptors: readonly MaskDescriptor[],
  duplicates: readonly (readonly [string, string, number])[],
): number {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) && parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };
  for (const entry of descriptors) parent.set(entry.id, entry.id);
  for (const [a, b] of duplicates) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  }
  const roots = new Set(descriptors.map((entry) => find(entry.id)));
  return roots.size;
}

/** Exact IoU for two masks that already share a canvas (rendered frames). */
export function maskIouSharedCanvas(
  a: { readonly width: number; readonly height: number; readonly data: Uint8Array },
  b: { readonly width: number; readonly height: number; readonly data: Uint8Array },
): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < a.data.length; i++) {
    const inA = (a.data[i] ?? 0) === 1;
    const inB = (b.data[i] ?? 0) === 1;
    if (inA && inB) intersection++;
    if (inA || inB) union++;
  }
  return union === 0 ? 0 : intersection / union;
}

export function summarizeSharedCanvas(masks: readonly { readonly id: string; readonly mask: { readonly width: number; readonly height: number; readonly data: Uint8Array } }[]): DiversitySummary {
  const pairs: Array<[string, string, number]> = [];
  let total = 0;
  let count = 0;
  for (let i = 0; i < masks.length; i++) {
    for (let j = i + 1; j < masks.length; j++) {
      const a = masks[i];
      const b = masks[j];
      if (!a || !b) continue;
      const iou = maskIouSharedCanvas(a.mask, b.mask);
      pairs.push([a.id, b.id, iou]);
      total += iou;
      count++;
    }
  }
  const sorted = [...pairs].sort((x, y) => y[2] - x[2]);
  return {
    labels: masks.map((entry) => entry.id),
    meanPairIou: count === 0 ? 0 : total / count,
    maxPairIou: sorted[0]?.[2] ?? 0,
    worstPair: sorted[0] ? [sorted[0][0], sorted[0][1]] : null,
    duplicatePairs: pairs.filter((entry) => entry[2] >= 0.95),
    clusters: countDuplicateClusters(
      masks.map((entry) => ({
        id: entry.id,
        width: entry.mask.width,
        height: entry.mask.height,
        cells: entry.mask.data,
        filled: 0,
      })),
      pairs.filter((entry) => entry[2] >= 0.95),
    ),
  };
}

export function halfCycleIou(
  masks: readonly { readonly id: string; readonly mask: { readonly width: number; readonly height: number; readonly data: Uint8Array } }[],
  offset: number,
): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i + offset < masks.length; i++) {
    const a = masks[i];
    const b = masks[i + offset];
    if (!a || !b) continue;
    total += maskIouSharedCanvas(a.mask, b.mask);
    count++;
  }
  return count === 0 ? 0 : total / count;
}

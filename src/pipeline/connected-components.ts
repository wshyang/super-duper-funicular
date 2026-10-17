export interface Component {
  readonly label: number;
  readonly size: number;
}

export interface LabelledMask {
  /** 0 = background; otherwise a 1-based component label. */
  readonly labels: Int32Array;
  readonly components: readonly Component[];
}

const NEIGHBOUR_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** 4-connected component labelling by iterative flood fill (no recursion). */
export function labelComponents(mask: Uint8Array, width: number, height: number): LabelledMask {
  const labels = new Int32Array(width * height);
  const components: Component[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || labels[start] !== 0) continue;
    const label = components.length + 1;
    const size = floodFill(mask, labels, { width, height, start, label });
    components.push({ label, size });
  }
  return { labels, components };
}

interface FillRequest {
  readonly width: number;
  readonly height: number;
  readonly start: number;
  readonly label: number;
}

function floodFill(mask: Uint8Array, labels: Int32Array, request: FillRequest): number {
  const stack: number[] = [request.start];
  labels[request.start] = request.label;
  let size = 0;
  while (stack.length > 0) {
    const index = stack.pop()!;
    size += 1;
    for (const neighbour of neighboursOf(index, request.width, request.height)) {
      if (mask[neighbour] === 0 || labels[neighbour] !== 0) continue;
      labels[neighbour] = request.label;
      stack.push(neighbour);
    }
  }
  return size;
}

function neighboursOf(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  for (const [dx, dy] of NEIGHBOUR_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) result.push(ny * width + nx);
  }
  return result;
}

/** Returns a copy of the mask keeping only components at least `minimumShare` of the largest. */
export function keepSignificantComponents(mask: Uint8Array, width: number, height: number, minimumShare: number): Uint8Array {
  const labelled = labelComponents(mask, width, height);
  const largest = Math.max(0, ...labelled.components.map((component) => component.size));
  const kept = new Set(
    labelled.components.filter((component) => component.size >= largest * minimumShare).map((c) => c.label),
  );
  return Uint8Array.from(labelled.labels, (label) => (kept.has(label) ? 1 : 0));
}

import type { Vec2 } from "../geometry/vec.ts";

/**
 * Raster-to-vector tracing for cut-out sprites.
 *
 * The alpha matte of a photographic cut-out arrives as a pixel staircase with
 * a feathered rim. Both are artefacts of the camera, not of the body: they
 * show as a dotted seam wherever two parts meet, and they blur when the rig is
 * scaled. This module turns that matte into one smooth closed path per
 * silhouette, so a part can be clipped analytically at any size.
 *
 * Pipeline: marching squares (sub-pixel crossings) -> loop stitching ->
 * Ramer-Douglas-Peucker simplification -> corner-aware Catmull-Rom smoothing.
 */

export interface TraceOptions {
  /** Matte coverage at which a pixel counts as inside. */
  readonly threshold?: number;
  /** Simplification tolerance in pixels; larger removes more staircase. */
  readonly tolerance?: number;
  /** Turn angle, in degrees, sharper than which a vertex stays a corner. */
  readonly cornerDegrees?: number;
}

export type PathCommand =
  | { readonly kind: "line"; readonly to: Vec2 }
  | { readonly kind: "curve"; readonly c1: Vec2; readonly c2: Vec2; readonly to: Vec2 };

export interface TracedShape {
  /** SVG path data in source pixels, fill-rule even-odd. */
  readonly d: string;
  /** One entry per closed loop; commands run from the loop's first point. */
  readonly loops: readonly (readonly PathCommand[])[];
  /** First point of every loop, so a renderer can `moveTo` before each. */
  readonly starts: readonly Vec2[];
  readonly contours: number;
  readonly nodes: number;
}

interface Grid {
  readonly values: Float32Array;
  readonly width: number;
  readonly height: number;
}

const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_TOLERANCE = 0.5;
const DEFAULT_CORNER_DEGREES = 55;
const TENSION = 0.5;

const sample = (grid: Grid, x: number, y: number): number => {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return 0;
  return grid.values[y * grid.width + x] ?? 0;
};

type Edge = "top" | "right" | "bottom" | "left";

interface Crossing {
  readonly key: string;
  readonly point: Vec2;
}

/**
 * Sub-pixel crossing on one grid edge. Keyed by the edge's own identity, so the
 * two cells that share an edge always produce the identical point.
 */
function crossing(grid: Grid, edge: Edge, x: number, y: number, threshold: number): Crossing {
  // Canonicalise to the edge's own origin: the bottom edge of one cell is the
  // top edge of the cell below it, and both must produce the same key.
  const originX = edge === "right" ? x + 1 : x;
  const originY = edge === "bottom" ? y + 1 : y;
  const horizontal = edge === "top" || edge === "bottom";
  const a = sample(grid, originX, originY);
  const b = horizontal ? sample(grid, originX + 1, originY) : sample(grid, originX, originY + 1);
  const raw = b === a ? 0.5 : (threshold - a) / (b - a);
  const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  // Alpha samples sit at pixel centres, so every crossing is half a pixel into
  // the pixel-corner space the rest of the renderer works in.
  const point = horizontal
    ? { x: originX + t + 0.5, y: originY + 0.5 }
    : { x: originX + 0.5, y: originY + t + 0.5 };
  return { key: `${horizontal ? "h" : "v"}${originX},${originY}`, point };
}

/** Boundary segments for each of the 16 corner combinations. */
const CASE_SEGMENTS: readonly (readonly (readonly [Edge, Edge])[])[] = [
  [],
  [["top", "left"]],
  [["top", "right"]],
  [["left", "right"]],
  [["right", "bottom"]],
  [["top", "right"], ["left", "bottom"]],
  [["top", "bottom"]],
  [["left", "bottom"]],
  [["bottom", "left"]],
  [["top", "bottom"]],
  [["top", "left"], ["right", "bottom"]],
  [["right", "bottom"]],
  [["right", "left"]],
  [["top", "right"]],
  [["top", "left"]],
  [],
];

/** Saddle cells: connect the inside corners only when the cell centre is inside. */
function saddleSegments(mask: number, centre: number, threshold: number): readonly (readonly [Edge, Edge])[] {
  const connected = centre >= threshold;
  if (mask === 5) {
    return connected ? [["top", "right"], ["left", "bottom"]] : [["top", "left"], ["right", "bottom"]];
  }
  return connected ? [["top", "left"], ["right", "bottom"]] : [["top", "right"], ["left", "bottom"]];
}

function cellSegments(grid: Grid, x: number, y: number, threshold: number): readonly (readonly [Edge, Edge])[] {
  const inside = (offsetX: number, offsetY: number): number =>
    sample(grid, x + offsetX, y + offsetY) >= threshold ? 1 : 0;
  const mask = inside(0, 0) | (inside(1, 0) << 1) | (inside(1, 1) << 2) | (inside(0, 1) << 3);
  if (mask === 5 || mask === 10) {
    const centre =
      (sample(grid, x, y) + sample(grid, x + 1, y) + sample(grid, x + 1, y + 1) + sample(grid, x, y + 1)) / 4;
    return saddleSegments(mask, centre, threshold);
  }
  return CASE_SEGMENTS[mask] ?? [];
}

/** Stitches every cell's segments into closed loops of sub-pixel points. */
function stitch(grid: Grid, threshold: number): Vec2[][] {
  const points = new Map<string, Vec2>();
  const ends = new Map<string, string[]>();
  const link = (from: Crossing, to: Crossing): void => {
    points.set(from.key, from.point);
    points.set(to.key, to.point);
    const forward = ends.get(from.key) ?? [];
    forward.push(to.key);
    ends.set(from.key, forward);
    const backward = ends.get(to.key) ?? [];
    backward.push(from.key);
    ends.set(to.key, backward);
  };
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      for (const [first, second] of cellSegments(grid, x, y, threshold)) {
        link(crossing(grid, first, x, y, threshold), crossing(grid, second, x, y, threshold));
      }
    }
  }
  const loops: Vec2[][] = [];
  const walked = new Set<string>();
  const edgeKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const start of ends.keys()) {
    const neighbours = ends.get(start) ?? [];
    if (neighbours.length !== 2) continue;
    const first = neighbours[0] as string;
    if (walked.has(edgeKey(start, first))) continue;
    const loop: Vec2[] = [];
    let previous = start;
    let current = first;
    while (!walked.has(edgeKey(previous, current))) {
      walked.add(edgeKey(previous, current));
      loop.push(points.get(current) as Vec2);
      const next = (ends.get(current) ?? []).find((candidate) => candidate !== previous);
      if (next === undefined) break;
      previous = current;
      current = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

const distanceToSegment = (point: Vec2, from: Vec2, to: Vec2): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 1e-12) return Math.hypot(point.x - from.x, point.y - from.y);
  let t = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
};

/** Ramer-Douglas-Peucker over an open chain. */
function simplifyChain(points: readonly Vec2[], tolerance: number): Vec2[] {
  if (points.length <= 2) return [...points];
  const first = points[0] as Vec2;
  const last = points[points.length - 1] as Vec2;
  let index = -1;
  let worst = tolerance;
  for (let step = 1; step < points.length - 1; step += 1) {
    const deviation = distanceToSegment(points[step] as Vec2, first, last);
    if (deviation > worst) {
      worst = deviation;
      index = step;
    }
  }
  if (index < 0) return [first, last];
  return [
    ...simplifyChain(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifyChain(points.slice(index), tolerance),
  ];
}

/** Simplifies a closed loop by splitting it at its farthest point from the start. */
function simplifyLoop(points: readonly Vec2[], tolerance: number): Vec2[] {
  if (points.length < 4) return [...points];
  const start = points[0] as Vec2;
  let split = 1;
  let largest = -1;
  for (let step = 1; step < points.length; step += 1) {
    const point = points[step] as Vec2;
    const span = Math.hypot(point.x - start.x, point.y - start.y);
    if (span > largest) {
      largest = span;
      split = step;
    }
  }
  const head = simplifyChain(points.slice(0, split + 1), tolerance);
  const tail = simplifyChain([...points.slice(split), start], tolerance);
  return [...head.slice(0, -1), ...tail.slice(0, -1)];
}

const turnDegrees = (before: Vec2, vertex: Vec2, after: Vec2): number => {
  const ax = vertex.x - before.x;
  const ay = vertex.y - before.y;
  const bx = after.x - vertex.x;
  const by = after.y - vertex.y;
  const lengthA = Math.hypot(ax, ay);
  const lengthB = Math.hypot(bx, by);
  if (lengthA < 1e-9 || lengthB < 1e-9) return 0;
  const cosine = (ax * bx + ay * by) / (lengthA * lengthB);
  return (Math.acos(cosine < -1 ? -1 : cosine > 1 ? 1 : cosine) * 180) / Math.PI;
};

const lerp = (from: Vec2, to: Vec2, t: number): Vec2 => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

/**
 * One Catmull-Rom segment from `vertex` to `after`, clamped so a sharp run of
 * vertices cannot overshoot the silhouette it is meant to trace.
 */
function curveSegment(previous: Vec2, vertex: Vec2, after: Vec2, beyond: Vec2): { c1: Vec2; c2: Vec2 } {
  const limit = Math.hypot(after.x - vertex.x, after.y - vertex.y) * 0.66;
  const pull = (target: Vec2, from: Vec2): Vec2 => {
    const span = Math.hypot(target.x - from.x, target.y - from.y);
    return span > limit && span > 1e-9 ? lerp(from, target, limit / span) : target;
  };
  const raw1 = {
    x: vertex.x + ((after.x - previous.x) * TENSION) / 6,
    y: vertex.y + ((after.y - previous.y) * TENSION) / 6,
  };
  const raw2 = {
    x: after.x - ((beyond.x - vertex.x) * TENSION) / 6,
    y: after.y - ((beyond.y - vertex.y) * TENSION) / 6,
  };
  return { c1: pull(raw1, vertex), c2: pull(raw2, after) };
}

/** Turns one simplified loop into line and cubic commands. */
function loopCommands(points: readonly Vec2[], cornerDegrees: number): PathCommand[] {
  const count = points.length;
  const corner = points.map((vertex, index) =>
    turnDegrees(
      points[(index - 1 + count) % count] as Vec2,
      vertex,
      points[(index + 1) % count] as Vec2,
    ) > cornerDegrees,
  );
  const commands: PathCommand[] = [];
  for (let index = 0; index < count; index += 1) {
    const vertex = points[index] as Vec2;
    const after = points[(index + 1) % count] as Vec2;
    const straight = corner[index] === true || corner[(index + 1) % count] === true;
    if (straight) {
      commands.push({ kind: "line", to: after });
      continue;
    }
    const curve = curveSegment(
      points[(index - 1 + count) % count] as Vec2,
      vertex,
      after,
      points[(index + 2) % count] as Vec2,
    );
    commands.push({ kind: "curve", c1: curve.c1, c2: curve.c2, to: after });
  }
  return commands;
}

const round = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
};

const formatCommands = (commands: readonly PathCommand[], start: Vec2): string => {
  const parts = [`M${round(start.x)} ${round(start.y)}`];
  for (const command of commands) {
    if (command.kind === "line") {
      parts.push(`L${round(command.to.x)} ${round(command.to.y)}`);
    } else {
      parts.push(
        `C${round(command.c1.x)} ${round(command.c1.y)} ${round(command.c2.x)} ${round(command.c2.y)} ${round(command.to.x)} ${round(command.to.y)}`,
      );
    }
  }
  parts.push("Z");
  return parts.join("");
};

/** Traces an alpha matte into SVG path data plus the loops it came from. */
export function traceAlpha(
  alpha: Float32Array,
  width: number,
  height: number,
  options: TraceOptions = {},
): TracedShape {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const cornerDegrees = options.cornerDegrees ?? DEFAULT_CORNER_DEGREES;
  const loops: PathCommand[][] = [];
  const starts: Vec2[] = [];
  let nodes = 0;
  for (const raw of stitch({ values: alpha, width, height }, threshold)) {
    const simplified = simplifyLoop(raw, tolerance);
    if (simplified.length < 3) continue;
    nodes += simplified.length;
    starts.push(simplified[0] as Vec2);
    loops.push(loopCommands(simplified, cornerDegrees));
  }
  const d = loops.map((commands, index) => formatCommands(commands, starts[index] as Vec2)).join("");
  return { d, loops, starts, contours: loops.length, nodes };
}

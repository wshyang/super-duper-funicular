import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { bleedAlpha, greenKey } from "../src/lib/photo/chroma.ts";
import { clipBelow, cutPart, tintFar, widestRow, type CutPart } from "../src/lib/photo/cut.ts";
import { resamplePart, type Scale } from "../src/lib/photo/resample.ts";
import { readImage } from "../src/lib/pipeline/decode.ts";
import { encodePng } from "../src/lib/pipeline/png.ts";
import { FAR_SOURCES, type FarPiece } from "./photo-far-spec.ts";

const MANIFEST = resolve("public/sprites/photo/female-rig.json");
const OUTPUT = "sg-chinese-female-photo-far";

interface Tone {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Mean colour of the opaque core of an image, for cross-shot tone matching. */
function meanTone(data: Uint8ClampedArray): Tone {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if ((data[index + 3] ?? 0) < 200) continue;
    red += data[index] ?? 0;
    green += data[index + 1] ?? 0;
    blue += data[index + 2] ?? 0;
    count += 1;
  }
  if (count === 0) return { r: 128, g: 128, b: 128 };
  return { r: red / count, g: green / count, b: blue / count };
}

/** Multiplies a part towards a reference shot's mean colour. */
function matchTone(part: CutPart, reference: Tone): CutPart {
  const own = meanTone(part.pixels);
  const ratio = (from: number, to: number): number => Math.min(1.35, Math.max(0.7, to / Math.max(1, from)));
  const factors = [ratio(own.r, reference.r), ratio(own.g, reference.g), ratio(own.b, reference.b)];
  const pixels = new Uint8ClampedArray(part.pixels);
  for (let index = 0; index < pixels.length; index += 4) {
    if ((pixels[index + 3] ?? 0) === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[index + channel] = Math.round((pixels[index + channel] ?? 0) * (factors[channel] ?? 1));
    }
  }
  return { ...part, pixels };
}

const distance = (a: readonly [number, number], b: readonly [number, number]): number =>
  Math.hypot(b[0] - a[0], b[1] - a[1]);

const neutralAngle = (piece: FarPiece): number =>
  piece.neutral ?? Math.atan2(piece.jointB[0] - piece.jointA[0], piece.jointB[1] - piece.jointA[1]);

/**
 * Region mask: a rectangle of the reference plate, plus an optional disc of
 * pixels around the pivot. The disc turns with the child bone and keeps the
 * joint filled at any bend, where two straight cuts would open a wedge.
 */
function pieceRegion(width: number, height: number, piece: FarPiece): Uint8Array {
  const region = new Uint8Array(width * height);
  const [x0, y0, x1, y1] = piece.box;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y += 1) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x += 1) {
      region[y * width + x] = 1;
    }
  }
  const radius = piece.capPx ?? 0;
  if (radius <= 0) return region;
  for (let y = Math.max(0, piece.pivot[1] - radius); y <= Math.min(height - 1, piece.pivot[1] + radius); y += 1) {
    for (let x = Math.max(0, piece.pivot[0] - radius); x <= Math.min(width - 1, piece.pivot[0] + radius); x += 1) {
      if (Math.hypot(x - piece.pivot[0], y - piece.pivot[1]) <= radius) region[y * width + x] = 1;
    }
  }
  return region;
}

/**
 * Base scale from the bone length in the reference shot. Pieces cut from the
 * same photograph share it, so a joint keeps one thickness across the seam.
 */
function scaleFor(piece: FarPiece, scales: ReadonlyMap<string, Scale>): Scale {
  const reused = piece.scaleFrom === undefined ? undefined : scales.get(piece.scaleFrom);
  if (reused !== undefined) return reused;
  const uniform = piece.target / distance(piece.jointA, piece.jointB);
  return { x: uniform * (piece.stretchX ?? 1), y: uniform };
}

/**
 * A second pass over the cut-out: stretches it so its silhouette matches the
 * near part it abuts. Reference shots are framed differently, so without this
 * the far thigh reads as a slab and the far shoe as a pancake.
 */
function fitScale(part: CutPart, piece: FarPiece): Scale {
  const base = { x: 1, y: 1 };
  if (piece.fit?.width === undefined && piece.fit?.height === undefined && piece.reachBelowPivot === undefined) {
    return base;
  }
  const width = piece.fit?.width === undefined ? 1 : piece.fit.width / Math.max(1, widestRow(part));
  if (piece.fit?.uniform === true) {
    const uniform = Math.min(1.8, Math.max(0.5, width));
    return { x: uniform, y: uniform };
  }
  const pivotY = piece.pivot[1] - part.y;
  const height =
    piece.reachBelowPivot !== undefined
      ? (pivotY + piece.reachBelowPivot) / Math.max(1, part.height)
      : piece.fit?.height === undefined
        ? 1
        : piece.fit.height / Math.max(1, part.height);
  return { x: Math.min(1.8, Math.max(0.5, width)), y: Math.min(1.8, Math.max(0.5, height)) };
}

async function cutPieces(): Promise<Map<string, { part: CutPart; piece: FarPiece; scale: Scale }>> {
  const results = new Map<string, { part: CutPart; piece: FarPiece; scale: Scale }>();
  for (const source of FAR_SOURCES) {
    const image = await readImage(source.source);
    const keyed = greenKey(image);
    bleedAlpha(keyed, 2);
    const scales = new Map<string, Scale>();
    for (const piece of source.pieces) {
      const scale = scaleFor(piece, scales);
      scales.set(piece.id, scale);
      const region = pieceRegion(image.width, image.height, piece);
      results.set(piece.id, { part: cutPart(keyed, region, piece.id), piece, scale });
    }
  }
  return results;
}

function record(
  scaled: CutPart,
  origin: CutPart,
  piece: FarPiece,
  scale: Scale,
): { file: string; width: number; height: number; pivot: readonly [number, number]; neutral: number } {
  const file = `${OUTPUT}/${piece.id}.png`;
  mkdirSync(resolve("public/sprites/photo", OUTPUT), { recursive: true });
  writeFileSync(resolve("public/sprites/photo", file), encodePng(scaled.pixels, scaled.width, scaled.height));
  const pivot: readonly [number, number] = [
    Math.round((piece.pivot[0] - origin.x) * scale.x),
    Math.round((piece.pivot[1] - origin.y) * scale.y),
  ];
  return { file, width: scaled.width, height: scaled.height, pivot, neutral: neutralAngle(piece) };
}

async function main(): Promise<void> {
  const cuts = await cutPieces();
  const rig = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    parts: Array<{ id: string; far?: Record<string, unknown> } & Record<string, unknown>>;
  };
  for (const [id, { part, piece, scale }] of cuts) {
    const entry = rig.parts.find((candidate) => candidate.id === id);
    if (entry === undefined) throw new Error(`Near rig has no part ${id}`);
    const nearImage = await readImage(resolve("public/sprites/photo", String(entry.file)));
    const base = resamplePart(part, scale);
    const fit = fitScale(base, piece);
    let fitted = resamplePart(base, fit);
    const finalScale = { x: scale.x * fit.x, y: scale.y * fit.y };
    if (piece.soleBelowPivot !== undefined) {
      const pivotY = (piece.pivot[1] - part.y) * finalScale.y;
      fitted = clipBelow(fitted, pivotY + piece.soleBelowPivot);
    }
    const shadowed = tintFar(matchTone(fitted, meanTone(nearImage.data)));
    const far = record(shadowed, part, piece, finalScale);
    entry.far = far;
    console.log(
      `far ${id}: ${far.width}x${far.height} pivot ${far.pivot.join(",")} neutral ${far.neutral.toFixed(3)}`,
    );
  }
  writeFileSync(MANIFEST, `${JSON.stringify(rig, null, 2)}\n`);
}

await main();

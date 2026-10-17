/**
 * Proof sheet for the raster-to-vector converter: one cut-out rendered at 4x
 * from its feathered raster matte beside the same texture clipped by its traced
 * path. Run with: npx tsx tools/render-vector-zoom.ts [part]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readImage } from "../src/lib/pipeline/decode.ts";
import { encodePng } from "../src/lib/pipeline/png.ts";
import type { PhotoPart } from "../src/lib/photo/rig.ts";
import { traceAlpha, type TracedShape } from "../src/lib/vector/trace.ts";
import { rasteriseShape } from "../src/lib/vector/raster.ts";

const FACTOR = 4;
const GAP = 8;
const BACKDROP: readonly [number, number, number] = [18, 22, 28];

const rig = JSON.parse(readFileSync("public/sprites/photo/female-rig.json", "utf8"));
const wanted = process.argv[2] ?? "shoe";
const part = (rig.parts as PhotoPart[]).find((entry) => entry.id === wanted);
if (part === undefined) throw new Error(`No part ${wanted} in the manifest`);

const image = await readImage(`public/sprites/photo/${part.file}`);
const alpha = new Float32Array(image.width * image.height);
for (let index = 0; index < alpha.length; index += 1) alpha[index] = (image.data[index * 4 + 3] ?? 0) / 255;
const tolerance = Number(process.argv[3] ?? "0.5");
const shape = traceAlpha(alpha, image.width, image.height, { tolerance });

/** Scales a traced shape about the origin, so it can be rasterised at any zoom. */
function scaleShape(source: TracedShape, factor: number): TracedShape {
  const scalePoint = (point: { x: number; y: number }) => ({ x: point.x * factor, y: point.y * factor });
  const loops = source.loops.map((commands) =>
    commands.map((command) =>
      command.kind === "line"
        ? { kind: "line" as const, to: scalePoint(command.to) }
        : { kind: "curve" as const, c1: scalePoint(command.c1), c2: scalePoint(command.c2), to: scalePoint(command.to) },
    ),
  );
  return { ...source, loops, starts: source.starts.map(scalePoint) };
}

const width = image.width * FACTOR;
const height = image.height * FACTOR;
const coverage = rasteriseShape(scaleShape(shape, FACTOR), width, height, 2);
const panels = width * 2 + GAP;
const pixels = new Uint8ClampedArray(panels * height * 4);

const source = (x: number, y: number, channel: number): number =>
  image.data[(Math.floor(y / FACTOR) * image.width + Math.floor(x / FACTOR)) * 4 + channel] ?? 0;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < panels; x += 1) {
    const offset = (y * panels + x) * 4;
    const panel = x < width ? 0 : x > width + GAP ? 1 : -1;
    if (panel < 0) {
      pixels.set([60, 66, 74, 255], offset);
      continue;
    }
    const localX = panel === 0 ? x : x - width - GAP;
    const matte = panel === 0 ? (source(localX, y, 3) / 255) : (coverage[y * width + localX] ?? 0);
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[offset + channel] = Math.round(source(localX, y, channel) * matte + BACKDROP[channel]! * (1 - matte));
    }
    pixels[offset + 3] = 255;
  }
}

mkdirSync("reports", { recursive: true });
writeFileSync(`reports/vector-zoom-${wanted}-${tolerance}.png`, encodePng(pixels, panels, height));
console.log(`wrote reports/vector-zoom-${wanted}-${tolerance}.png ${panels}x${height} (${shape.contours} contours, ${shape.nodes} nodes)`);

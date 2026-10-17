/**
 * Cuts a photographic plate into articulated sprite parts and writes the rig
 * manifest the app loads at runtime.
 *
 * Pipeline: green key -> barrier cuts -> seeded flood fill per part -> grow the
 * mask into opaque neighbours (joint overlap) -> crop -> PNG, plus a darker
 * variant of every part for the far side.
 *
 * Run with: npm run photo:extract
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { encodePng } from "../src/lib/pipeline/png.ts";
import { readImage } from "../src/lib/pipeline/decode.ts";
import { alphaBounds, bleedAlpha, greenKey } from "../src/lib/photo/chroma.ts";
import {
  cutPart,
  erasePolygon,
  extendRegion,
  fillUnassigned,
  floodRegion,
  rasteriseBarriers,
  tintFar,
  type CutPart,
} from "../src/lib/photo/cut.ts";
import { FEMALE_PHOTO, type PhotoPlateSpec } from "./photo-rig-spec.ts";

const OUTPUT_ROOT = "public/sprites/photo";

export interface ExtractedRig {
  readonly id: string;
  readonly label: string;
  readonly image: string;
  readonly pixelsPerBody: number;
  readonly scale: { readonly soleY: number; readonly crownY: number };
  readonly joints: Record<string, readonly [number, number]>;
  readonly neutralAngles: Record<string, number>;
  readonly pose: Record<string, number>;
  readonly parts: readonly {
    readonly id: string;
    readonly file: string;
    readonly fileFar: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly pivot: readonly [number, number];
  }[];
}

async function extract(spec: PhotoPlateSpec): Promise<ExtractedRig> {
  const source = await readImage(spec.source);
  const keyed = greenKey(source);
  bleedAlpha(keyed, 2);
  const bounds = alphaBounds(keyed);
  const blocked = rasteriseBarriers(source.width, source.height, spec.barriers);
  const directory = resolve(OUTPUT_ROOT, spec.id);
  mkdirSync(directory, { recursive: true });

  const parts: Array<ExtractedRig["parts"][number]> = [];
  const cut: CutPart[] = [];
  const regions = spec.parts.map((part) => floodRegion(keyed, blocked, part.seed));
  spec.parts.forEach((part, index) => {
    let region = extendRegion(keyed, regions[index] as Uint8Array, part.extension);
    for (const polygon of part.erase ?? []) erasePolygon(region, source.width, polygon);
    regions[index] = region;
  });
  const erasures = new Uint8Array(source.width * source.height).fill(1);
  for (const part of spec.parts) {
    for (const polygon of part.erase ?? []) erasePolygon(erasures, source.width, polygon);
  }
  fillUnassigned(keyed, regions, erasures);
  spec.parts.forEach((part, index) => {
    const cropped = cutPart(keyed, regions[index] as Uint8Array, part.id);
    cut.push(cropped);
    writeFileSync(resolve(directory, `${part.id}.png`), encodePng(cropped.pixels, cropped.width, cropped.height));
    writeFileSync(resolve(directory, `${part.id}-far.png`), encodePng(tintFar(cropped).pixels, cropped.width, cropped.height));
    const pivot = pivotFor(spec, part.id);
    parts.push({
      id: part.id,
      file: `${spec.id}/${part.id}.png`,
      fileFar: `${spec.id}/${part.id}-far.png`,
      x: cropped.x,
      y: cropped.y,
      width: cropped.width,
      height: cropped.height,
      pivot: [pivot[0] - cropped.x, pivot[1] - cropped.y],
    });
  });

  return {
    id: spec.id,
    label: spec.label,
    image: spec.source.split("/").pop() ?? spec.source,
    pixelsPerBody: spec.soleY - spec.crownY,
    scale: { soleY: spec.soleY, crownY: spec.crownY },
    joints: spec.joints as unknown as Record<string, readonly [number, number]>,
    neutralAngles: spec.neutralAngles as unknown as Record<string, number>,
    pose: spec.pose as unknown as Record<string, number>,
    parts,
  };
}

function pivotFor(spec: PhotoPlateSpec, id: string): readonly [number, number] {
  const { joints } = spec;
  switch (id) {
    case "head":
      return joints.headBase;
    case "neck":
      return joints.neckBase;
    case "torso":
      return joints.hip;
    case "upperArm":
      return joints.shoulder;
    case "forearm":
      return joints.elbow;
    case "thigh":
      return joints.hip;
    case "shin":
      return joints.knee;
    case "shoe":
      return joints.ankle;
    case "shoeToe":
      return joints.ball;
    default:
      throw new Error(`Unmapped part ${id}`);
  }
}

/** Contact sheet of every cut part on a dark field, for visual QA. */
function montage(parts: readonly CutPart[]): Buffer {
  const cell = 260;
  const columns = 3;
  const rows = Math.ceil(parts.length / columns);
  const width = cell * columns;
  const height = cell * rows;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 18;
    pixels[index + 1] = 22;
    pixels[index + 2] = 28;
    pixels[index + 3] = 255;
  }
  parts.forEach((part, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const scale = Math.min((cell * 0.86) / part.height, (cell * 0.86) / part.width);
    const offsetX = column * cell + (cell - part.width * scale) / 2;
    const offsetY = row * cell + (cell - part.height * scale) / 2;
    for (let y = 0; y < part.height * scale; y += 1) {
      for (let x = 0; x < part.width * scale; x += 1) {
        const sx = Math.floor(x / scale);
        const sy = Math.floor(y / scale);
        const source = (sy * part.width + sx) * 4;
        const alpha = (part.pixels[source + 3] ?? 0) / 255;
        if (alpha < 0.02) continue;
        const target = ((Math.floor(offsetY) + y) * width + Math.floor(offsetX) + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          pixels[target + channel] = Math.round((part.pixels[source + channel] ?? 0) * alpha + (pixels[target + channel] ?? 0) * (1 - alpha));
        }
      }
    }
  });
  return encodePng(pixels, width, height);
}

const rig = await extract(FEMALE_PHOTO);
writeFileSync(resolve(OUTPUT_ROOT, "female-rig.json"), `${JSON.stringify(rig, null, 2)}\n`);
const source = await readImage(FEMALE_PHOTO.source);
const keyed = greenKey(source);
bleedAlpha(keyed, 2);
const blocked = rasteriseBarriers(source.width, source.height, FEMALE_PHOTO.barriers);
const cut: CutPart[] = [];
for (const part of FEMALE_PHOTO.parts) {
  let region = floodRegion(keyed, blocked, part.seed);
  region = extendRegion(keyed, region, part.extension);
  for (const polygon of part.erase ?? []) erasePolygon(region, source.width, polygon);
  cut.push(cutPart(keyed, region, part.id));
}
mkdirSync(resolve("reports"), { recursive: true });
writeFileSync(resolve("reports/photo-parts.png"), montage(cut));
console.log(`wrote ${OUTPUT_ROOT}/female-rig.json with ${rig.parts.length} parts`);
console.log("wrote reports/photo-parts.png");

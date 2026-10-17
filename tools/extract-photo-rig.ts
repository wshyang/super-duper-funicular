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
import { alphaBounds, bleedAlpha, dropSpecks, greenKey, type KeyedImage } from "../src/lib/photo/chroma.ts";
import {
  cutPart,
  erasePolygon,
  extendRegion,
  fillUnassigned,
  growRegions,
  floodRegion,
  matteBlocked,
  rasteriseBarriers,
  tintFar,
  type CutPart,
} from "../src/lib/photo/cut.ts";
import { BALL_OVERHANG, cutJoint, sealBall } from "../src/lib/photo/round-cut.ts";
import { capArc } from "../src/lib/photo/arc-cap.ts";
import { applyEndCuts, type Bone, type PartEndCuts } from "../src/lib/photo/end-cap.ts";
import { fabricOnly, purgeMatte, refillMatted } from "../src/lib/photo/matte.ts";
import { compositeKeyed, fitSimilarity, warpKeyed, type PatchPlate } from "../src/lib/photo/patch.ts";
import { traceAlpha, type TracedShape } from "../src/lib/vector/trace.ts";
import { rasteriseShape, silhouetteIou } from "../src/lib/vector/raster.ts";
import { svgDocument } from "../src/lib/vector/svg.ts";
import { FEMALE_PHOTO, MALE_PHOTO, type PhotoPlateSpec } from "./photo-rig-spec.ts";

const OUTPUT_ROOT = "public/sprites/photo";

export interface ExtractedRig {
  readonly id: string;
  readonly label: string;
  readonly image: string;
  readonly statureMetres: number;
  readonly pixelsPerBody: number;
  readonly scale: { readonly soleY: number; readonly crownY: number };
  readonly joints: Record<string, readonly [number, number]>;
  readonly neutralAngles: Record<string, number>;
  readonly links: readonly {
    readonly joint: string;
    readonly parent: string;
    readonly child: string | null;
    readonly radius: number;
  }[];
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
    readonly shape: string;
  }[];
}

/** The cut-out's own coverage, as the tracer wants it. */
function alphaOf(part: CutPart): Float32Array {
  const alpha = new Float32Array(part.width * part.height);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = (part.pixels[index * 4 + 3] ?? 0) / 255;
  return alpha;
}

/** Cuts every ball-and-socket joint, after growth has settled the seams. */
function roundJoints(
  spec: PhotoPlateSpec,
  keyed: { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray; readonly alpha: Float32Array },
  regions: readonly Uint8Array[],
): void {
  const indexOf = new Map(spec.parts.map((part, index) => [part.id, index]));
  for (const link of spec.links) {
    const parent = indexOf.get(link.parent);
    const child = link.child === null ? null : indexOf.get(link.child);
    if (parent === undefined) throw new Error(`joint parent ${link.parent} is not a part`);
    if (child === undefined) throw new Error(`joint child ${link.child ?? ""} is not a part`);
    cutJoint(
      keyed,
      regions,
      { parent, child: child ?? null },
      { pivot: spec.joints[link.joint] as readonly [number, number], radius: link.radius },
    );
  }
}

/**
 * Floods every part, honouring its cut lines and colour matte, then grows it
 * into its neighbours so the seam shares a band of texture. Shared by the
 * extraction and the QA contact sheet, which must show the same cuts.
 */
function partRegions(spec: PhotoPlateSpec, keyed: KeyedImage): Uint8Array[] {
  const blocked = rasteriseBarriers(keyed.width, keyed.height, spec.barriers);
  return spec.parts.map((part) => {
    const fences = part.matte === undefined ? blocked : matteBlocked(blocked, keyed.data, part.matte);
    const region = extendRegion(keyed, floodRegion(keyed, fences, part.seed), part.extension);
    for (const polygon of part.erase ?? []) erasePolygon(region, keyed.width, polygon);
    return region;
  });
}

/** Folds every patch plate into the base plate before any cutting happens. */
async function withPatches(spec: PhotoPlateSpec, base: KeyedImage): Promise<KeyedImage> {
  let image = base;
  for (const patch of spec.patches ?? []) image = await applyPatch(patch, image);
  return image;
}

/** Registers one patch plate and lets its opaque fabric replace the base. */
async function applyPatch(patch: PatchPlate, base: KeyedImage): Promise<KeyedImage> {
  const plate = greenKey(await readImage(patch.source));
  const sim = fitSimilarity(patch.from, patch.to);
  // The patch contributes fabric only: its baked-in shoulder sockets are skin
  // the base plate already owns, and a fabric part may never carry skin.
  const fabric = fabricOnly(warpKeyed(plate, sim, base.width, base.height));
  return compositeKeyed(base, fabric, patch.clip);
}

/** Trims every declared end to an arc about its rotation axis. */
function applyCaps(spec: PhotoPlateSpec, width: number, height: number, regions: Uint8Array[]): void {
  const indexOf = new Map(spec.parts.map((part, index) => [part.id, index]));
  for (const cap of spec.caps ?? []) {
    const index = indexOf.get(cap.part);
    if (index === undefined) throw new Error(`cap part ${cap.part} is not a part`);
    const capped = capArc({ width, height, region: regions[index] as Uint8Array }, {
      pivot: spec.joints[cap.joint] as readonly [number, number],
      radiusX: cap.radiusX,
      radiusY: cap.radiusY,
      side: cap.side,
    });
    regions[index] = capped.region;
  }
}

/** Resolves one part's declared bone-local end caps to plate joints. */
function boneCutsFor(
  spec: PhotoPlateSpec,
  id: PhotoPlateSpec["parts"][number]["id"],
): { bone: Bone; cuts: PartEndCuts } | undefined {
  const declared = (spec.endCuts ?? []).find((entry) => entry.part === id);
  if (declared === undefined) return undefined;
  return {
    bone: {
      from: spec.joints[declared.bone.from] as readonly [number, number],
      to: spec.joints[declared.bone.to] as readonly [number, number],
    },
    cuts: declared.cuts,
  };
}

async function extract(spec: PhotoPlateSpec): Promise<{ rig: ExtractedRig; cut: CutPart[] }> {
  const source = await readImage(spec.source);
  const keyed = await withPatches(spec, greenKey(source));
  const specks = dropSpecks(keyed);
  bleedAlpha(keyed, 2);
  const bounds = alphaBounds(keyed);
  if (specks > 0) console.log(`  ${spec.rig}: dropped ${specks} px of detached specks`);
  const directory = resolve(OUTPUT_ROOT, spec.id);
  mkdirSync(directory, { recursive: true });

  const parts: Array<ExtractedRig["parts"][number]> = [];
  const cut: CutPart[] = [];
  const vectorQc: Array<{ id: string; nodes: number; iou: number }> = [];
  const regions = partRegions(spec, keyed);
  const erasures = new Uint8Array(source.width * source.height).fill(1);
  for (const part of spec.parts) {
    for (const polygon of part.erase ?? []) erasePolygon(erasures, source.width, polygon);
  }
  fillUnassigned(keyed, regions, erasures);
  // A shared band of pixels between neighbours, so no dotted cut line shows.
  growRegions(keyed, regions, 2, erasures);
  // Then replace every straight seam at a hinge with a ball-and-socket pair.
  roundJoints(spec, keyed, regions);
  // Every end a ball does not reach becomes an arc about its rotation axis.
  applyCaps(spec, keyed.width, keyed.height, regions);
  // Colour mattes are a hard invariant: growth and leftovers cannot smuggle a
  // strap into a skin part or a socket's skin into a fabric part. Anything the
  // purge orphans is re-homed to a matte-compatible neighbour, so the armhole
  // skin islands land on the skin parts instead of becoming holes.
  const mattes = spec.parts.map((part) => part.matte);
  purgeMatte(keyed, regions, mattes);
  refillMatted(keyed, regions, { mattes, blocked: erasures });
  // Fresh balls have fresh edges, so carry their colour outwards again: the
  // renderer filters these crops, and transparent black would darken the rim.
  bleedAlpha(keyed, 2);
  // Every ball is re-sealed after feathering, or its rim shows the parent's
  // socket through as a hairline.
  const ballsFor = (id: string): Array<{ pivot: readonly [number, number]; radius: number }> =>
    spec.links
      .filter((link) => link.child === id)
      .map((link) => ({
        pivot: spec.joints[link.joint] as readonly [number, number],
        radius: link.radius + BALL_OVERHANG,
      }));
  spec.parts.forEach((part, index) => {
    const raw = cutPart(keyed, regions[index] as Uint8Array, part.id);
    const declared = boneCutsFor(spec, part.id);
    // Ends are rounded before any ball is sealed: the ball is the socket's own
    // membrane and has to stay whole, while the cap only shapes the corners
    // that would otherwise protrude past it as the part swings.
    const cropped = declared === undefined ? raw : applyEndCuts(raw, declared.bone, declared.cuts);
    for (const ball of ballsFor(part.id)) {
      sealBall(cropped, { pivot: [ball.pivot[0] - cropped.x, ball.pivot[1] - cropped.y], radius: ball.radius });
    }
    cut.push(cropped);
    const matte = alphaOf(cropped);
    const traced = traceAlpha(matte, cropped.width, cropped.height);
    vectorQc.push({ id: part.id, nodes: traced.nodes, iou: silhouetteIou(traced, matte, cropped.width, cropped.height) });
    const texture = encodePng(cropped.pixels, cropped.width, cropped.height);
    writeFileSync(resolve(directory, `${part.id}.png`), texture);
    mkdirSync(resolve(directory, "svg"), { recursive: true });
    writeFileSync(
      resolve(directory, "svg", `${part.id}.svg`),
      svgDocument(traced.d, cropped.width, cropped.height, `data:image/png;base64,${texture.toString("base64")}`),
    );
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
      shape: traced.d,
    });
  });

  for (const entry of vectorQc) {
    console.log(`  ${spec.rig} ${entry.id.padEnd(9)} ${String(entry.nodes).padStart(3)} nodes  matte overlap ${entry.iou.toFixed(4)}`);
  }

  const rig: ExtractedRig = {
    id: spec.id,
    label: spec.label,
    image: spec.source.split("/").pop() ?? spec.source,
    statureMetres: spec.statureMetres,
    pixelsPerBody: spec.soleY - spec.crownY,
    scale: { soleY: spec.soleY, crownY: spec.crownY },
    joints: spec.joints as unknown as Record<string, readonly [number, number]>,
    neutralAngles: spec.neutralAngles as unknown as Record<string, number>,
    links: spec.links.map((link) => ({ ...link })),
    pose: spec.pose as unknown as Record<string, number>,
    parts,
  };
  return { rig, cut };
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

/** Paints the traced silhouette over the texture, so a drift is visible. */
function outlined(part: CutPart): CutPart {
  const coverage = rasteriseShape(traceAlpha(alphaOf(part), part.width, part.height), part.width, part.height);
  const pixels = new Uint8ClampedArray(part.pixels);
  for (let index = 0; index < coverage.length; index += 1) {
    const value = coverage[index] ?? 0;
    if (value < 0.15 || value > 0.85) continue;
    const offset = index * 4;
    pixels[offset] = 255;
    pixels[offset + 1] = 48;
    pixels[offset + 2] = 96;
    pixels[offset + 3] = 255;
  }
  return { ...part, pixels };
}

const requested = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
const available = [FEMALE_PHOTO, MALE_PHOTO];
const specs =
  requested.length === 0
    ? [FEMALE_PHOTO]
    : available.filter((spec) => requested.includes(spec.rig));
if (specs.length === 0) throw new Error(`No photo plate matches ${requested.join(", ")}`);

for (const spec of specs) {
  const { rig, cut } = await extract(spec);
  writeFileSync(resolve(OUTPUT_ROOT, `${spec.rig}.json`), `${JSON.stringify(rig, null, 2)}\n`);
  mkdirSync(resolve("reports"), { recursive: true });
  writeFileSync(resolve(`reports/photo-parts-${spec.rig}.png`), montage(cut.map(outlined)));
  console.log(`wrote ${OUTPUT_ROOT}/${spec.rig}.json with ${rig.parts.length} parts`);
  console.log(`wrote reports/photo-parts-${spec.rig}.png`);
}

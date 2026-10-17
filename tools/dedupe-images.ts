/**
 * Reports duplicate images across every art directory, by decoded pixels.
 * Run with: npm run images:dedupe [-- --apply]
 *
 * The repository ships one source image, so file-level dedupe finds nothing.
 * The useful dedupe is *pose-level*: the sheet contains 48 frames, and 24 of
 * them are pixel-equivalent re-draws of another frame. This tool reports both,
 * and with `--apply` deletes byte-identical duplicate files (never generated
 * frame sets, which are reproduced by `npm run sprites:extract`).
 */
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, relative, resolve } from "node:path";
import { readImage } from "../src/lib/pipeline/decode.ts";
import { poseSignatureVector, signatureDistance } from "../src/lib/pipeline/sprite-cut.ts";
import manifest from "../public/sprites/manifest.json" with { type: "json" };

const ROOTS = ["src/images", "public/sprites"];
const EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);
const APPLY = process.argv.includes("--apply");
const PIXEL_DUPLICATE_THRESHOLD = 0.02;

interface ImageRecord {
  readonly path: string;
  readonly digest: string;
  readonly signature: readonly number[];
  readonly width: number;
  readonly height: number;
}

const files = ROOTS.flatMap((root) => (existsSync(root) ? walk(resolve(root)) : []));
const records: ImageRecord[] = [];

for (const file of files) {
  const bytes = readFileSync(file);
  const digest = createHash("sha256").update(bytes).digest("hex");
  try {
    const image = await readImage(file);
    records.push({
      path: file,
      digest,
      signature: poseSignatureVector(image.data, image.width, image.height, 16),
      width: image.width,
      height: image.height,
    });
  } catch {
    console.warn(`skipped (not decodable): ${relative(process.cwd(), file)}`);
  }
}

const byDigest = new Map<string, ImageRecord[]>();
for (const record of records) {
  const bucket = byDigest.get(record.digest) ?? [];
  bucket.push(record);
  byDigest.set(record.digest, bucket);
}
const byteDuplicates = [...byDigest.values()].filter((bucket) => bucket.length > 1);

const clusters = clusterBySignature(records, PIXEL_DUPLICATE_THRESHOLD);
const poseGroups = clusters.filter((cluster) => cluster.length > 1);

console.log(`scanned ${records.length} images under ${ROOTS.join(", ")}`);
console.log(`byte-identical groups: ${byteDuplicates.length}`);
for (const bucket of byteDuplicates) {
  console.log(`  ${bucket.map((record) => relative(process.cwd(), record.path)).join("\n  == ")}`);
}
console.log(
  `silhouette clusters (tolerance ${PIXEL_DUPLICATE_THRESHOLD}): ${poseGroups.length} groups covering ` +
    `${poseGroups.reduce((sum, group) => sum + group.length, 0)} images`,
);
for (const group of poseGroups.sort((a, b) => b.length - a.length)) {
  console.log(`  ${group.length} images share one silhouette, e.g. ${relative(process.cwd(), group[0]?.path ?? "")}`);
}
console.log(`manifest reports ${manifest.duplicateGroups.length} repeated poses across ${manifest.frames.length} frames`);

if (APPLY && byteDuplicates.length > 0) {
  let removed = 0;
  for (const bucket of byteDuplicates) {
    const [keep, ...rest] = bucket;
    void keep;
    for (const duplicate of rest) {
      if (duplicate.path.includes("/sprites/")) continue;
      rmSync(duplicate.path);
      removed += 1;
      console.log(`removed ${relative(process.cwd(), duplicate.path)}`);
    }
  }
  console.log(`removed ${removed} files`);
}

/**
 * Union-find over pairwise pose distance, so a chain of near-identical frames
 * collapses into one group instead of fragmenting around a single leader.
 */
function clusterBySignature(records: readonly ImageRecord[], threshold: number): ImageRecord[][] {
  const parent = records.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root] as number;
    return root;
  };
  for (let a = 0; a < records.length; a += 1) {
    for (let b = a + 1; b < records.length; b += 1) {
      if (signatureDistance(records[a]?.signature ?? [], records[b]?.signature ?? []) > threshold) continue;
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootB] = rootA;
    }
  }
  const buckets = new Map<number, ImageRecord[]>();
  records.forEach((record, index) => {
    const root = find(index);
    const bucket = buckets.get(root) ?? [];
    bucket.push(record);
    buckets.set(root, bucket);
  });
  return [...buckets.values()];
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) return walk(full);
    return EXTENSIONS.has(extname(full).toLowerCase()) ? [full] : [];
  });
}

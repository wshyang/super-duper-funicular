import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { decodeImage } from './image-codec.ts';
import { dHash64, pixelSha256, sha256 } from './hashes.ts';

export interface AssetEntry {
  readonly path: string;
  readonly byteSha256: string;
  readonly pixelSha256: string;
  readonly dHash64: string;
  readonly width: number;
  readonly height: number;
  readonly duplicateOf: string | null;
  readonly status: 'active' | 'deprecated';
}

export interface ImageManifest {
  readonly generatedBy: string;
  readonly files: readonly AssetEntry[];
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpeg', '.jpg']);

const walk = (directory: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path));
    } else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      found.push(path);
    }
  }
  return found;
};

const toPosix = (path: string): string => path.split(sep).join('/');

/** Byte + decoded-pixel dedupe; duplicates are soft-tagged, never deleted. */
export const dedupeImages = (root: string): ImageManifest => {
  const imageRoot = join(root, 'src', 'images');
  const manifests: AssetEntry[] = [];
  const byPixel = new Map<string, string>();
  for (const path of walk(imageRoot).sort()) {
    const buffer = readFileSync(path);
    const extension =
      extname(path).toLowerCase().replace('.', '') === 'jpg'
        ? 'jpeg'
        : extname(path).toLowerCase().replace('.', '');
    const image = decodeImage(buffer, extension as 'png' | 'jpeg');
    const pixelHash = pixelSha256(image);
    const duplicateOf = byPixel.get(pixelHash) ?? null;
    const canonical = duplicateOf ?? toPosix(relative(root, path));
    if (!duplicateOf) byPixel.set(pixelHash, canonical);
    manifests.push({
      path: toPosix(relative(root, path)),
      byteSha256: sha256(buffer),
      pixelSha256: pixelHash,
      dHash64: dHash64(image),
      width: image.width,
      height: image.height,
      duplicateOf,
      status: duplicateOf ? 'deprecated' : 'active',
    });
  }
  const manifest: ImageManifest = { generatedBy: 'npm run images:dedupe', files: manifests };
  mkdirSync(imageRoot, { recursive: true });
  writeFileSync(join(imageRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
};

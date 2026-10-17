import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { findDuplicateGroups, hashRasterPixels, type HashedArtefact } from "./hashing.ts";
import { loadRaster } from "./image-io.ts";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

/** Recursively lists image files under a directory, sorted for stable output. Missing directories yield []. */
export async function listImageFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => null);
  if (entries === null) return [];
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return listImageFiles(path);
      return IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()) ? [path] : [];
    }),
  );
  return nested.flat().sort();
}

/** Hashes decoded pixels, so a re-encoded copy of the same picture is still a duplicate. */
export async function hashImageFiles(paths: readonly string[]): Promise<HashedArtefact[]> {
  return Promise.all(
    paths.map(async (path) => ({ path, hash: hashRasterPixels(await loadRaster(path)) })),
  );
}

/** For each duplicate group, keeps the first path and returns the rest for removal. */
export function planRemovals(groups: readonly string[][]): string[] {
  return groups.flatMap((group) => [...group].sort().slice(1));
}

export interface DedupeReport {
  readonly scanned: number;
  readonly duplicateGroups: string[][];
  readonly removed: string[];
}

export async function scanForDuplicates(directories: readonly string[]): Promise<DedupeReport> {
  const files = (await Promise.all(directories.map(listImageFiles))).flat();
  const artefacts = await hashImageFiles(files);
  const duplicateGroups = findDuplicateGroups(artefacts);
  return { scanned: files.length, duplicateGroups, removed: [] };
}

/** Deletes the redundant copies in `duplicateGroups`. Only call on files you own (source artwork). */
export async function removeRedundantCopies(groups: readonly string[][]): Promise<string[]> {
  const doomed = planRemovals(groups);
  for (const path of doomed) {
    await stat(path);
    await unlink(path);
  }
  return doomed;
}

import { createHash } from "node:crypto";
import type { Raster } from "./raster.ts";

/** Hash of decoded pixels plus dimensions. Independent of file container or encoder settings. */
export function hashRasterPixels(raster: Raster): string {
  const hash = createHash("sha256");
  hash.update(`${raster.width}x${raster.height}:`);
  hash.update(raster.data);
  return hash.digest("hex");
}

export interface HashedArtefact {
  readonly path: string;
  readonly hash: string;
}

/** Groups artefacts that share a hash. Only groups with more than one member are returned. */
export function findDuplicateGroups(artefacts: readonly HashedArtefact[]): string[][] {
  const byHash = new Map<string, string[]>();
  for (const artefact of artefacts) {
    byHash.set(artefact.hash, [...(byHash.get(artefact.hash) ?? []), artefact.path]);
  }
  return [...byHash.values()].filter((paths) => paths.length > 1);
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { framesForVariant, type PublishedManifest } from "./sprite-manifest.ts";

const MANIFEST_PATH = resolve(import.meta.dirname, "../../public/sprites/running-cycle-8frame/manifest.json");

describe("published sprite manifest", () => {
  it("lists 48 frames, 8 per variant, each with a public URL", async () => {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as PublishedManifest;
    expect(manifest.frames).toHaveLength(48);
    const red = framesForVariant(manifest, "red");
    expect(red.map((frame) => frame.frame)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(red[0]!.url).toBe("/sprites/running-cycle-8frame/red/frame-01.png");
  });
});

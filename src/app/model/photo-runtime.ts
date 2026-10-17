import type { BodyMetrics } from "../../lib/rig/body.ts";
import { parsePhotoRig, photoBodyMetrics, type PhotoRig } from "../../lib/photo/rig.ts";
import { photoAssetFiles } from "../../lib/photo/scene.ts";
import type { BitmapImage, PhotoAssets } from "../../lib/render/photo-paint.ts";

export interface PhotoRuntime {
  readonly rig: PhotoRig;
  readonly body: BodyMetrics;
  readonly assets: PhotoAssets;
}

const cache = new Map<string, Promise<PhotoRuntime>>();

const absolute = (url: string): string => new URL(url, window.location.href).href;

const loadBitmap = async (url: string): Promise<BitmapImage> => {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
};

async function load(manifestUrl: string): Promise<PhotoRuntime> {
  const response = await fetch(absolute(manifestUrl));
  if (!response.ok) throw new Error(`Photo manifest HTTP ${response.status}`);
  const rig = parsePhotoRig(await response.json());
  const bitmaps = new Map<string, BitmapImage>();
  await Promise.all(
    photoAssetFiles(rig).map(async (file) => {
      bitmaps.set(file, await loadBitmap(absolute(`/sprites/photo/${file}`)));
    }),
  );
  return {
    rig,
    body: photoBodyMetrics(rig),
    assets: { get: (file) => bitmaps.get(file) },
  };
}

/** Loads and caches one persona's photo rig; repeated calls share a promise. */
export function photoRuntime(manifestUrl: string): Promise<PhotoRuntime> {
  const existing = cache.get(manifestUrl);
  if (existing !== undefined) return existing;
  const created = load(manifestUrl);
  cache.set(manifestUrl, created);
  return created;
}

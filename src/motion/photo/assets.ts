import manifest from "../../../public/photo-runner/manifest.json";
export type PhotoPart = keyof typeof manifest.parts;
export type PhotoStatus = "idle" | "loading" | "ready" | "error";
export const photoParts = manifest.parts;
let images: Partial<Record<PhotoPart, HTMLImageElement>> = {};
let pending: Promise<void> | undefined;
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${url}`));
    image.src = url;
  });
}
export function loadPhotoAssets(): Promise<void> {
  if (pending) return pending;
  pending = Promise.all(
    Object.entries(photoParts).map(
      async ([name, part]) => [name, await loadImage(part.url)] as const,
    ),
  )
    .then((entries) => {
      images = Object.fromEntries(entries);
    })
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
export function getPhotoImage(name: PhotoPart) {
  return images[name];
}
export function hasPhotoAssets() {
  return Object.keys(images).length === Object.keys(photoParts).length;
}

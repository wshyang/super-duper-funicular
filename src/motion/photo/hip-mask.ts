import { getPhotoImage, photoParts } from "./assets";
import { hipMaskAlpha, type HipCut } from "./hip-cut";
import { getPartTransform, applyTransform } from "./transform";
type HipPart = "pelvis" | "torso";
const cache = new Map<
  string,
  { image: HTMLImageElement; canvas: HTMLCanvasElement }
>();
export function getMaskedHipPart(
  name: HipPart,
  cut: HipCut,
): HTMLCanvasElement | undefined {
  const image = getPhotoImage(name);
  if (!image) return;
  const key = JSON.stringify([name, cut]);
  const previous = cache.get(key);
  if (previous?.image === image) return previous.canvas;
  const canvas = createHipMask({ name, image, cut });
  if (cache.size >= 8) cache.delete(cache.keys().next().value!);
  cache.set(key, { image, canvas });
  return canvas;
}
function createHipMask(options: {
  name: HipPart;
  image: HTMLImageElement;
  cut: HipCut;
}) {
  const { name, image, cut } = options;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const matrix = getPartTransform({
    part: photoParts[name],
    target: {
      start: { x: 0, y: 0 },
      end: { x: 0, y: name === "pelvis" ? 5 : -31 },
    },
    width: 1,
  });
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4 + 3;
      pixels.data[index] = Math.round(
        pixels.data[index] * hipMaskAlpha(applyTransform(matrix, [x, y]), cut),
      );
    }
  context.putImageData(pixels, 0, 0);
  return canvas;
}
export function downloadHipMask(cut: HipCut) {
  const canvas = getMaskedHipPart("pelvis", cut);
  if (!canvas) return;
  const anchor = document.createElement("a");
  anchor.download = "mei-lin-rounded-pelvis.png";
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}
export function downloadHipSettings(cut: HipCut) {
  const content = {
    version: 1,
    units: "rig-pixels-relative-to-hip",
    hipCut: cut,
    source: "/photo-runner/pelvis.png",
    anchors: photoParts.pelvis,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.download = "mei-lin-hip-cut.json";
  anchor.href = url;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

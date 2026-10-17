import { getPhotoImage, photoParts } from "./assets";
import { getPartTransform, applyTransform } from "./transform";
import {
  endCutAlpha,
  getLimbGeometry,
  type RoundablePart,
  type PartEndCut,
  type EndCuts,
} from "./end-cuts";
const cache = new Map<
  string,
  { image: HTMLImageElement; canvas: HTMLCanvasElement }
>();
export function getRoundedLimb(name: RoundablePart, cut: PartEndCut) {
  const image = getPhotoImage(name);
  if (!image) return;
  const key = JSON.stringify([name, cut]);
  const previous = cache.get(key);
  if (previous?.image === image) return previous.canvas;
  const canvas = makeRoundedLimb({ name, image, cut });
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, { image, canvas });
  return canvas;
}
function makeRoundedLimb(options: {
  name: RoundablePart;
  image: HTMLImageElement;
  cut: PartEndCut;
}) {
  const { name, image, cut } = options,
    geometry = getLimbGeometry(name);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const transform = getPartTransform({
    part: photoParts[name],
    target: { start: { x: 0, y: 0 }, end: { x: 0, y: geometry.length } },
    width: geometry.width,
  });
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4 + 3;
      pixels.data[index] = Math.round(
        pixels.data[index] *
          endCutAlpha(applyTransform(transform, [x, y]), geometry.length, cut),
      );
    }
  context.putImageData(pixels, 0, 0);
  return canvas;
}
export function downloadRoundedLimb(name: RoundablePart, cut: PartEndCut) {
  const canvas = getRoundedLimb(name, cut);
  if (!canvas) return;
  const anchor = document.createElement("a");
  anchor.download = `${name}-rounded.png`;
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}
export function downloadEndCuts(cuts: EndCuts) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            units: "bone-local rig pixels",
            cuts,
            parts: photoParts,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  const anchor = document.createElement("a");
  anchor.download = "articulated-end-cuts.json";
  anchor.href = url;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

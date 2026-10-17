import type { PhotoPart, PhotoRig } from "../../lib/photo/rig.ts";
import { PHOTO_PART_LABELS, PHOTO_PART_ORDER } from "../../lib/photo/rig.ts";
import type { BitmapImage, PhotoAssets } from "../../lib/render/photo-paint.ts";

/**
 * The photographic twin of the vector parts atlas: one cell per articulated
 * cut-out, each drawn in its own joint frame so the pivot sits at the cell's
 * centre. That is what makes a decomposition legible - you can see which end of
 * a limb is the hinge, and how far the texture runs past it.
 */
export interface AtlasView {
  /** Crop pixels to cell pixels. */
  readonly scale: number;
  /** Where the crop's top-left corner lands, in cell pixels. */
  readonly x: number;
  readonly y: number;
}

/** Fits a crop inside the cell, centred, so every part reads at a usable size. */
export function atlasView(part: PhotoPart, cell: number, padding: number): AtlasView {
  const span = Math.max(1, cell - padding * 2);
  const scale = Math.min(span / part.width, span / part.height);
  return {
    scale,
    x: (cell - part.width * scale) / 2,
    y: (cell - part.height * scale) / 2,
  };
}

/** Where the joint lands in the cell; may fall outside the crop, e.g. a hip. */
export function pivotPoint(part: PhotoPart, view: AtlasView): { x: number; y: number } {
  return { x: view.x + part.pivot[0] * view.scale, y: view.y + part.pivot[1] * view.scale };
}

export interface PhotoAtlas {
  readonly element: HTMLElement;
  setRig(rig: PhotoRig, assets: PhotoAssets): void;
}

const CELL = 132;
const PADDING = 14;

const clipFor = (shape: string | undefined): Path2D | undefined => {
  if (shape === undefined || typeof Path2D === "undefined") return undefined;
  return new Path2D(shape);
};

export function paintAtlasCell(
  context: CanvasRenderingContext2D,
  part: PhotoPart,
  image: BitmapImage | undefined,
): void {
  context.clearRect(0, 0, CELL, CELL);
  context.fillStyle = "#0b0f15";
  context.fillRect(0, 0, CELL, CELL);
  context.strokeStyle = "rgba(255,255,255,0.06)";
  context.strokeRect(0.5, 0.5, CELL - 1, CELL - 1);
  if (image !== undefined) {
    const view = atlasView(part, CELL, PADDING);
    context.save();
    context.translate(view.x, view.y);
    context.scale(view.scale, view.scale);
    const clip = clipFor(part.shape);
    if (clip !== undefined) context.clip(clip);
    context.drawImage(image as unknown as CanvasImageSource, 0, 0, part.width, part.height);
    context.restore();
  }
  // The ring marks the joint the part turns about. A few pivots sit outside
  // their own crop (the thigh turns about the hip, which is above it), so the
  // marker is clamped to the cell edge and drawn as a chevron in that case.
  const joint = pivotPoint(part, atlasView(part, CELL, PADDING));
  const edge = 9;
  const x = Math.min(CELL - edge, Math.max(edge, joint.x));
  const y = Math.min(CELL - edge, Math.max(edge, joint.y));
  const outside = x !== joint.x || y !== joint.y;
  context.strokeStyle = "#ffb347";
  context.fillStyle = "#ffb347";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(x, y, 5.5, 0, Math.PI * 2);
  context.moveTo(x - 11, y);
  context.lineTo(x - 7, y);
  context.moveTo(x + 7, y);
  context.lineTo(x + 11, y);
  context.moveTo(x, y - 11);
  context.lineTo(x, y - 7);
  context.stroke();
  if (!outside) return;
  context.beginPath();
  context.arc(x, y, 3, 0, Math.PI * 2);
  context.fill();
}

export function createPhotoAtlas(): PhotoAtlas {
  const element = document.createElement("section");
  element.className = "panel atlas";
  element.dataset.testid = "atlas__panel";

  const header = document.createElement("header");
  header.className = "panel__header";
  const title = document.createElement("h2");
  title.textContent = "Rig decomposition";
  const subtitle = document.createElement("p");
  subtitle.textContent =
    "Nine photographic cut-outs, each cell centred on the joint it turns about (amber ring). The clip is the silhouette traced from the matte.";
  header.append(title, subtitle);
  element.append(header);

  const grid = document.createElement("div");
  grid.className = "atlas__grid";
  const cells = new Map<string, { context: CanvasRenderingContext2D; note: HTMLElement }>();

  for (const id of PHOTO_PART_ORDER) {
    const figure = document.createElement("figure");
    figure.className = "atlas__item";
    const canvas = document.createElement("canvas");
    canvas.width = CELL;
    canvas.height = CELL;
    canvas.dataset.testid = `atlas__canvas-${id}`;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("2D canvas is not available");
    const caption = document.createElement("figcaption");
    const name = document.createElement("strong");
    name.textContent = PHOTO_PART_LABELS[id];
    const note = document.createElement("span");
    note.textContent = "waiting for the plate";
    caption.append(name, note);
    figure.append(canvas, caption);
    grid.append(figure);
    cells.set(id, { context, note });
  }
  element.append(grid);

  return {
    element,
    setRig(rig: PhotoRig, assets: PhotoAssets): void {
      for (const part of rig.parts) {
        const cell = cells.get(part.id);
        if (cell === undefined) continue;
        const pivot = `${Math.round(part.pivot[0])},${Math.round(part.pivot[1])}`;
        const far = part.far === undefined ? "" : " · far: medial photo";
        cell.note.textContent = `${part.width}×${part.height} · pivot ${pivot}${far}`;
        paintAtlasCell(cell.context, part, assets.get(part.file));
      }
    },
  };
}

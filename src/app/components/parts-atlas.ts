import type { PartGeometry } from "../../lib/rig/parts/index.ts";
import { partsFor, type SpriteLook } from "../../lib/rig/persona.ts";
import { singlePartScene } from "../../lib/render/scene.ts";
import { paintScene, type View } from "../../lib/render/paint.ts";
import { polygonBounds } from "../../lib/geometry/poly.ts";
import type { Palette } from "../../lib/rig/palette.ts";

export interface PartsAtlas {
  readonly element: HTMLElement;
  setLook(look: SpriteLook): void;
}

const CELL = 132;

const PART_NOTES: Record<string, string> = {
  torso: "Ribcage taper, singlet hem, shorts block and waistband. Pivot: hip joint.",
  neck: "Its own segment. Counter-rotates the trunk lean to keep the head level.",
  head: "Profile silhouette: brow, nose, lips, chin. Hair silhouette comes from the skin.",
  thigh: "Skin capsule plus shorts band and hem shadow. Pivot: hip.",
  shin: "Skin capsule plus sock, cuff shadow and hem. Pivot: knee.",
  shoe: "Hindfoot: heel counter, midsole, lace band. Pivot: ankle.",
  shoeToe: "Forefoot: toe cap and sole. Pivot: the ball of the foot, so the heel can peel.",
  upperArm: "Skin capsule plus sleeve that overlaps the torso. Pivot: shoulder.",
  forearm: "Tapered forearm, wrist crease and fist. Pivot: elbow.",
};

export function createPartsAtlas(initial: SpriteLook): PartsAtlas {
  let parts = partsFor(initial);
  const element = document.createElement("section");
  element.className = "panel atlas";
  element.dataset.testid = "atlas__panel";
  const header = document.createElement("header");
  header.className = "panel__header";
  const title = document.createElement("h2");
  title.textContent = "Rig decomposition";
  const subtitle = document.createElement("p");
  subtitle.textContent =
    "Nine articulated parts generated from capsules and profiles, each in its own joint frame. No bitmap art.";
  header.append(title, subtitle);
  element.append(header);

  const grid = document.createElement("div");
  grid.className = "atlas__grid";
  const canvases: Array<{ context: CanvasRenderingContext2D; part: PartGeometry }> = [];

  for (const part of parts) {
    const figure = document.createElement("figure");
    figure.className = "atlas__item";
    const canvas = document.createElement("canvas");
    canvas.width = CELL;
    canvas.height = CELL;
    canvas.dataset.testid = `atlas__canvas-${part.id}`;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("2D canvas is not available");
    const caption = document.createElement("figcaption");
    const name = document.createElement("strong");
    name.textContent = part.label;
    const note = document.createElement("span");
    note.textContent = PART_NOTES[part.id] ?? "";
    caption.append(name, note);
    figure.append(canvas, caption);
    grid.append(figure);
    canvases.push({ context, part });
  }
  element.append(grid);

  const draw = (look: SpriteLook) => {
    parts = partsFor(look);
    const byId = new Map(parts.map((part) => [part.id, part]));
    for (const entry of canvases) {
      const part = byId.get(entry.part.id) ?? entry.part;
      entry.part = part;
      drawPart(entry.context, part, look.palette);
    }
  };
  draw(initial);
  return { element, setLook: draw };
}

function drawPart(context: CanvasRenderingContext2D, part: PartGeometry, palette: Palette): void {
  const scene = singlePartScene(part, palette);
  const bounds = polygonBounds([...scene.groups.flatMap((group) => group.shapes.flatMap((shape) => shape.points))]);
  context.clearRect(0, 0, CELL, CELL);
  context.fillStyle = "#0b0f15";
  context.fillRect(0, 0, CELL, CELL);
  context.strokeStyle = "rgba(255,255,255,0.06)";
  context.strokeRect(0.5, 0.5, CELL - 1, CELL - 1);
  const spanX = Math.max(0.06, bounds.maxX - bounds.minX);
  const spanY = Math.max(0.06, bounds.maxY - bounds.minY);
  const scale = Math.min((CELL * 0.74) / spanX, (CELL * 0.74) / spanY);
  const view: View = {
    scale,
    originX: CELL / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
    groundY: CELL / 2 + ((bounds.minY + bounds.maxY) / 2) * scale,
  };
  paintScene(context, scene, view);
}

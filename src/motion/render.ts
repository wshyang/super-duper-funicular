import type { EndCuts } from "./photo/end-cuts";
import type { HipCut } from "./photo/hip-cut";
import { drawPhotoRunner } from "./photo/render-photo";
import { hasPhotoAssets, type PhotoStatus } from "./photo/assets";
import {
  personas,
  getPonytailAngle,
  type PersonaId,
  type Persona,
} from "./personas";
import {
  getArm,
  getPose,
  type Gait,
  type Point,
  type Pose,
  type Leg,
} from "./gait";
export const palettes = [
  { name: "Violet", color: "#8661d6", dark: "#59418f" },
  { name: "Coral", color: "#e86753", dark: "#9c3d3b" },
  { name: "Ocean", color: "#5288df", dark: "#345593" },
  { name: "Fern", color: "#5e9e78", dark: "#38634f" },
  { name: "Honey", color: "#e5b94a", dark: "#9e7930" },
  { name: "Ink", color: "#545b70", dark: "#323848" },
];
export interface RenderOptions {
  photoStatus?: PhotoStatus;
  hipCut?: HipCut;
  endCuts?: EndCuts;
  persona: PersonaId;
  gait: Gait;
  phase: number;
  palette: number;
  skeleton: boolean;
}
type Context = CanvasRenderingContext2D;
const ink = "#292c3d";

function line(
  context: Context,
  points: Point[],
  style: { color: string; width: number },
) {
  context.strokeStyle = style.color;
  context.lineWidth = style.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  points.forEach((point, index) =>
    index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y),
  );
  context.stroke();
}
function segment(
  context: Context,
  points: Point[],
  style: { color: string; width: number },
) {
  line(context, points, { color: ink, width: style.width + 3 });
  line(context, points, style);
}
function drawLeg(
  context: Context,
  leg: Leg,
  style: { hip: Point; color: string; skin: string; character: Persona },
) {
  segment(context, [style.hip, leg.knee], { color: style.skin, width: 9 });
  const shortsEnd = {
    x: style.hip.x + (leg.knee.x - style.hip.x) * style.character.shortsLength,
    y: style.hip.y + (leg.knee.y - style.hip.y) * style.character.shortsLength,
  };
  segment(context, [style.hip, shortsEnd], {
    color: style.color,
    width: style.character.shortsWidth,
  });
  segment(context, [leg.knee, leg.foot], { color: style.skin, width: 7 });
  const sock = {
    x: leg.foot.x + (leg.knee.x - leg.foot.x) * 0.3,
    y: leg.foot.y + (leg.knee.y - leg.foot.y) * 0.3,
  };
  segment(context, [sock, leg.foot], { color: "#eee9df", width: 7 });
  drawShoe(context, leg);
}
function drawShoe(context: Context, leg: Leg) {
  context.save();
  context.translate(leg.shoe.toe.x, leg.shoe.toe.y);
  context.rotate(leg.shoe.angle);
  context.fillStyle = ink;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-16, 0);
  context.lineTo(-17, -5);
  context.lineTo(-12, -8);
  context.lineTo(-7, -7);
  context.lineTo(-4, -4);
  context.lineTo(0, -3);
  context.closePath();
  context.fill();
  context.fillStyle = "#485469";
  context.fillRect(-14, -5, 10, 3);
  context.fillStyle = "#cbd1d3";
  context.fillRect(-16, -2, 16, 2);
  context.restore();
}
function drawArm(context: Context, points: Point[], color: string) {
  segment(context, points, { color, width: 6 });
}
function drawTorso(context: Context, pose: Pose, options: RenderOptions) {
  const character = personas[options.persona];
  const colors = palettes[options.palette];
  const collar = {
    x: pose.shoulder.x - Math.sin(pose.torsoAngle) * 7,
    y: pose.shoulder.y + Math.cos(pose.torsoAngle) * 7,
  };
  segment(context, [pose.shoulder, pose.neck], {
    color: character.skin,
    width: 5,
  });
  segment(context, [pose.hip, collar], {
    color: colors.color,
    width: character.torsoWidth,
  });
  line(
    context,
    [
      { x: pose.hip.x - 7, y: pose.hip.y - 4 },
      { x: pose.shoulder.x - 7, y: pose.shoulder.y + 6 },
    ],
    { color: colors.dark, width: 5 },
  );
  context.fillStyle = "#f2eaf8";
  context.fillRect(pose.shoulder.x + 2, pose.shoulder.y + 8, 7, 2);
}
function drawHead(context: Context, pose: Pose, character: Persona) {
  context.save();
  context.translate(pose.neck.x, pose.neck.y);
  context.rotate(pose.headAngle);
  if (character.hairstyle === "ponytail")
    drawPonytail(context, pose, character);
  const x = 1,
    y = -23;
  context.fillStyle = ink;
  context.fillRect(x - 7, y + 1, 20, 23);
  context.fillStyle = character.skin;
  context.fillRect(x - 4, y + 4, 15, 17);
  context.fillRect(x + 10, y + 10, 4, 6);
  context.fillStyle = character.shade;
  context.fillRect(x - 3, y + 18, 9, 6);
  context.fillStyle = character.hair;
  context.fillRect(x - 8, y - 1, 20, 8);
  context.fillRect(x - 8, y + 4, 7, 9);
  context.fillStyle = character.hairHighlight;
  context.fillRect(x - 6, y, 13, 3);
  context.fillStyle = ink;
  context.fillRect(x + 8, y + 8, 2, 3);
  context.restore();
}
function drawSkeleton(context: Context, pose: Pose) {
  const paths = [
    [pose.hip, pose.near.knee, pose.near.foot],
    [pose.hip, pose.far.knee, pose.far.foot],
    [pose.hip, pose.shoulder, pose.neck, pose.head],
    [pose.near.shoe.heel, pose.near.shoe.toe],
    [pose.far.shoe.heel, pose.far.shoe.toe],
    getArm(pose, pose.phase),
    getArm(pose, pose.phase + 0.5),
  ];
  paths.forEach((points) => {
    line(context, points, { color: "#cef778", width: 1 });
    points.forEach((point) => {
      context.fillStyle = "#232d3b";
      context.fillRect(point.x - 2, point.y - 2, 5, 5);
      context.fillStyle = "#cef778";
      context.fillRect(point.x - 1, point.y - 1, 3, 3);
    });
  });
}
export function drawRunner(context: Context, options: RenderOptions) {
  const pose = getPose(options.phase, options.gait);
  const character = personas[options.persona];
  if (character.renderStyle === "photo") {
    drawPhotoRunner(context, pose, {
      hipCut: options.hipCut,
      endCuts: options.endCuts,
    });
    if (options.skeleton && hasPhotoAssets()) drawSkeleton(context, pose);
    return;
  }
  const { skin, shade } = character;
  drawArm(context, getArm(pose, pose.phase), shade);
  drawLeg(context, pose.far, {
    hip: pose.hip,
    color: "#31384a",
    skin: shade,
    character,
  });
  drawTorso(context, pose, options);
  drawHead(context, pose, character);
  drawLeg(context, pose.near, {
    hip: pose.hip,
    color: "#414a60",
    skin,
    character,
  });
  drawArm(context, getArm(pose, pose.phase + 0.5), skin);
  if (options.skeleton) drawSkeleton(context, pose);
}
export function downloadSheet(options: RenderOptions) {
  const canvas = document.createElement("canvas");
  const scale = personas[options.persona].renderStyle === "photo" ? 4 : 1;
  if (scale === 4 && !hasPhotoAssets()) return;
  canvas.width = 160 * 8 * scale;
  canvas.height = 160 * scale;
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);
  for (let index = 0; index < 8; index++) {
    context.save();
    context.translate(index * 160 + 75, 138);
    drawRunner(context, { ...options, phase: index / 8 });
    context.restore();
  }
  const anchor = document.createElement("a");
  const motion = options.gait.motion ?? "run";
  const name =
    motion === "run"
      ? "running"
      : motion === "walk"
        ? "walking"
        : "brisk-walking";
  anchor.download = `stride-lab-${options.persona}-${name}-cycle.png`;
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}

function drawPonytail(context: Context, pose: Pose, character: Persona) {
  context.save();
  context.translate(-7, -18);
  context.rotate(getPonytailAngle(pose.phase));
  segment(
    context,
    [
      { x: 0, y: 0 },
      { x: -9, y: 4 },
      { x: -14, y: 16 },
    ],
    { color: character.hair, width: 6 },
  );
  line(
    context,
    [
      { x: -9, y: 5 },
      { x: -13, y: 12 },
    ],
    { color: character.hairHighlight, width: 2 },
  );
  context.fillStyle = "#e87478";
  context.fillRect(-4, -2, 4, 5);
  context.restore();
}

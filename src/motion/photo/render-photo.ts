import {
  defaultEndCuts,
  type EndCuts,
  type PartEndCut,
  type RoundablePart,
} from "./end-cuts";
import { getRoundedLimb } from "./end-mask";
import { getLimbPlacement } from "./limb-placement";
import {
  defaultHipCut,
  PHOTO_LAYER_ORDER,
  ORIGINAL_LAYER_ORDER,
  type PhotoLayer,
  type HipCut,
} from "./hip-cut";
import { getMaskedHipPart } from "./hip-mask";
import { type Point, type Pose } from "../gait";
import {
  getPhotoImage,
  hasPhotoAssets,
  photoParts,
  type PhotoPart,
} from "./assets";
import { getPartTransform } from "./transform";
type Context = CanvasRenderingContext2D;
type Side = "near" | "far";
interface Placement {
  start: Point;
  end: Point;
  width?: number;
  hipCut?: HipCut;
  endCut?: PartEndCut;
}
function drawPart(context: Context, name: PhotoPart, placement: Placement) {
  const image =
    placement.hipCut && (name === "pelvis" || name === "torso")
      ? getMaskedHipPart(name, placement.hipCut)
      : placement.endCut
        ? getRoundedLimb(name as RoundablePart, placement.endCut)
        : getPhotoImage(name);
  if (!image) return;
  const matrix = getPartTransform({
    part: photoParts[name],
    target: placement,
    width: placement.width ?? 1,
  });
  context.save();
  context.transform(...matrix);
  context.drawImage(image, 0, 0);
  context.restore();
}
function resolveEndCut(name: RoundablePart, settings: PhotoRenderSettings) {
  if (settings.comparison === "original" || settings.uncappedPart === name)
    return undefined;
  return (settings.endCuts ?? defaultEndCuts)[name];
}
function drawPhotoArm(
  context: Context,
  pose: Pose,
  settings: PhotoRenderSettings & { side: Side },
) {
  for (const kind of ["upper-arm", "forearm", "hand"] as const) {
    const name: RoundablePart = `${settings.side}-${kind}`;
    drawPart(context, name, {
      ...getLimbPlacement(name, pose),
      endCut: resolveEndCut(name, settings),
    });
  }
}
function drawPhotoLeg(
  context: Context,
  pose: Pose,
  settings: PhotoRenderSettings & { side: Side },
) {
  for (const kind of ["thigh", "shin"] as const) {
    const name: RoundablePart = `${settings.side}-${kind}`;
    drawPart(context, name, {
      ...getLimbPlacement(name, pose),
      endCut: resolveEndCut(name, settings),
    });
  }
  const shoe = pose[settings.side].shoe;
  drawPart(context, `${settings.side}-shoe`, {
    start: shoe.heel,
    end: shoe.toe,
  });
}
export interface PhotoRenderSettings {
  endCuts?: EndCuts;
  uncappedPart?: RoundablePart;
  hipCut?: HipCut;
  comparison?: "original" | "rounded";
}
function drawBodyLayer(
  context: Context,
  pose: Pose,
  settings: { layer: PhotoLayer; hipCut?: HipCut },
) {
  const { layer, hipCut } = settings;
  if (layer === "pelvis") {
    const end = {
      x: pose.hip.x - Math.sin(pose.torsoAngle * 0.3) * 5,
      y: pose.hip.y + Math.cos(pose.torsoAngle * 0.3) * 5,
    };
    drawPart(context, "pelvis", { start: pose.hip, end, hipCut });
    return;
  }
  if (layer === "torso") {
    drawPart(context, "torso", { start: pose.hip, end: pose.shoulder, hipCut });
    return;
  }
  if (layer === "neck") {
    drawPart(context, "neck", {
      start: pose.shoulder,
      end: pose.neck,
      width: 0.85,
    });
    return;
  }
  const end = {
    x: pose.neck.x + Math.sin(pose.headAngle) * 18,
    y: pose.neck.y - Math.cos(pose.headAngle) * 18,
  };
  drawPart(context, "head", { start: pose.neck, end });
}
export function drawPhotoRunner(
  context: Context,
  pose: Pose,
  settings: PhotoRenderSettings = {},
) {
  if (!hasPhotoAssets()) return;
  const isOriginal = settings.comparison === "original";
  const hipCut = isOriginal ? undefined : (settings.hipCut ?? defaultHipCut);
  const layers = isOriginal ? ORIGINAL_LAYER_ORDER : PHOTO_LAYER_ORDER;
  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  for (const layer of layers) {
    if (layer === "far-arm" || layer === "near-arm")
      drawPhotoArm(context, pose, {
        ...settings,
        side: layer === "far-arm" ? "far" : "near",
      });
    else if (layer === "far-leg" || layer === "near-leg")
      drawPhotoLeg(context, pose, {
        ...settings,
        side: layer === "far-leg" ? "far" : "near",
      });
    else drawBodyLayer(context, pose, { layer, hipCut });
  }
  context.restore();
}

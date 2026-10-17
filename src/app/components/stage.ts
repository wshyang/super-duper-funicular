import { resolveGait } from "../../lib/gait/gait.ts";
import { solvePose, type RunnerPose } from "../../lib/gait/pose.ts";
import { composeRunner } from "../../lib/render/scene.ts";
import {
  paintGround,
  paintScene,
  paintShadow,
  paintSkeleton,
  worldToScreen,
  type View,
} from "../../lib/render/paint.ts";
import { findRunnerOption, lookFor, type PhotoPersona, type SpriteLook } from "../../lib/rig/persona.ts";
import { composePhotoRunner } from "../../lib/photo/scene.ts";
import { photoGait } from "../../lib/photo/rig.ts";
import { paintPhotoRunner } from "../../lib/render/photo-paint.ts";
import { photoRuntime, type PhotoRuntime } from "../model/photo-runtime.ts";
import { lookForSettings, type AppSettings } from "../state/settings.ts";
import {
  EMPTY_TRAIL,
  advanceTrail,
  bodyHeightPixels,
  footprintScreenX,
  viewForCanvas,
  type TrailState,
} from "../model/stage-model.ts";

export interface Stage {
  readonly element: HTMLCanvasElement;
  render(phase: number, settings: AppSettings): void;
  resize(): void;
}

export function createStage(): Stage {
  const canvas = document.createElement("canvas");
  canvas.className = "stage__canvas";
  canvas.dataset.testid = "stage__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Procedurally generated runner, animated");
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("2D canvas is not available");

  const cache: { look: SpriteLook; key: string } = {
    look: lookFor("sg-chinese-male", "red"),
    key: "sg-chinese-male:red",
  };
  let trail: TrailState = EMPTY_TRAIL;
  let lastPhase = 0;
  const photo: { personaId: string; runtime?: PhotoRuntime } = { personaId: "" };

  /**
   * Starts the photo rig loading the first time a photo persona is selected and
   * returns it once ready; frames before that simply skip the figure.
   */
  const photoFor = (persona: PhotoPersona): PhotoRuntime | undefined => {
    if (photo.personaId !== persona.id) {
      photo.personaId = persona.id;
      photo.runtime = undefined;
      void photoRuntime(persona.manifest)
        .then((runtime) => {
          if (photo.personaId === persona.id) photo.runtime = runtime;
        })
        .catch(() => {
          if (photo.personaId === persona.id) photo.runtime = undefined;
        });
    }
    return photo.runtime;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.max(320, Math.round(rect.width * ratio));
    canvas.height = Math.max(320, Math.round(rect.height * ratio));
    trail = EMPTY_TRAIL;
  };

  const render = (phase: number, settings: AppSettings) => {
    const persona = findRunnerOption(settings.personaId);
    const gait = resolveGait(settings.gait);
    const view = viewForCanvas(canvas.width, canvas.height);
    const deltaSeconds = ((phase - lastPhase + 1) % 1) * gait.cycleSeconds;
    trail = advanceTrail(trail, gait, phase, deltaSeconds);
    lastPhase = phase;

    paintBackground(context, canvas.width, canvas.height);
    paintGround(context, view, canvas.width, "rgba(255, 255, 255, 0.12)");
    if (settings.display.showGroundMarkers) paintFootprints(context, trail, view);
    if (settings.display.showTrail) paintBodyRuler(context, view, "1 body height");

    if (persona.kind === "photo") {
      const runtime = photoFor(persona);
      if (runtime !== undefined) {
        const pose = solvePose(photoGait(gait, runtime.rig), phase, runtime.body);
        if (settings.display.showShadow) paintShadow(context, pose, view);
        paintPhotoRunner(
          context as never,
          composePhotoRunner(pose, runtime.rig),
          runtime.rig,
          runtime.assets,
          view,
        );
        if (settings.display.showSkeleton) paintSkeleton(context, pose, view);
      }
      return;
    }

    const lookKey = `${settings.personaId}:${settings.colorwayId}`;
    if (cache.key !== lookKey) {
      cache.look = lookForSettings(settings);
      cache.key = lookKey;
    }
    const pose = solvePose(gait, phase, cache.look.body);
    if (settings.display.showShadow) paintShadow(context, pose, view);
    paintScene(context, composeRunner(pose, cache.look), view);
    if (settings.display.showSkeleton) paintSkeleton(context, pose, view);
  };

  return { element: canvas, render, resize };
}

function paintBackground(context: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#111720");
  gradient.addColorStop(0.6, "#0d131b");
  gradient.addColorStop(1, "#0a0f16");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(width * 0.46, height * 0.4, 0, width * 0.46, height * 0.4, height * 0.75);
  glow.addColorStop(0, "rgba(90, 130, 175, 0.16)");
  glow.addColorStop(1, "rgba(90, 130, 175, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function paintFootprints(context: CanvasRenderingContext2D, trail: TrailState, view: View): void {
  context.save();
  for (const footprint of trail.footprints) {
    const x = footprintScreenX(footprint, trail, view);
    const fade = 1 - Math.min(1, (trail.distance - footprint.bornDistance) / 1.4);
    context.globalAlpha = Math.max(0, fade) * 0.75;
    context.fillStyle = "#f7c948";
    context.beginPath();
    context.ellipse(x, view.groundY + view.scale * 0.012, view.scale * 0.035, view.scale * 0.009, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function paintBodyRuler(context: CanvasRenderingContext2D, view: View, label: string): void {
  const x = view.originX - view.scale * 0.42;
  const top = view.groundY - bodyHeightPixels(view);
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.16)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x, view.groundY);
  context.lineTo(x, top);
  context.moveTo(x - 5, view.groundY);
  context.lineTo(x + 5, view.groundY);
  context.moveTo(x - 5, top);
  context.lineTo(x + 5, top);
  context.stroke();
  context.fillStyle = "rgba(255, 255, 255, 0.34)";
  context.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.save();
  context.translate(x - 8, (view.groundY + top) / 2);
  context.rotate(-Math.PI / 2);
  context.textAlign = "center";
  context.fillText(label, 0, 0);
  context.restore();
  context.restore();
}

export function paintContactDot(context: CanvasRenderingContext2D, pose: RunnerPose, view: View): void {
  const planted = [pose.near.leg, pose.far.leg].filter((leg) => leg.isStance);
  for (const leg of planted) {
    const point = worldToScreen({ x: leg.foot.contact.x, y: 0 }, view);
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fillStyle = "rgba(247, 201, 72, 0.9)";
    context.fill();
  }
}

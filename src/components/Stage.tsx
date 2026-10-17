import { personas } from "../motion/personas";
import { useEffect, useRef } from "react";
import { drawRunner, type RenderOptions } from "../motion/render";
import { getPose, getPhaseLabel, getStance } from "../motion/gait";

interface StageProps extends RenderOptions {
  onion: boolean;
  ground: boolean;
  mode: string;
  cycles: number;
  retryPhoto: () => void;
}
function drawGround(context: CanvasRenderingContext2D, props: StageProps) {
  context.strokeStyle = "#dcdde5";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, 180.5);
  context.lineTo(480, 180.5);
  context.stroke();
  const zoom =
    personas[props.persona].renderStyle === "photo" &&
    props.mode === "procedural"
      ? 1.25
      : 1;
  const duty = props.mode === "original" ? 0.36 : getStance(props.gait);
  const offset = (props.cycles * props.gait.stride * zoom) / duty;
  for (let index = -2; index < 18; index++) {
    const x = ((((index * 40 - offset) % 560) + 560) % 560) - 40;
    context.fillStyle = "#dcdde5";
    context.fillRect(x, 194, 13, 1);
  }
  context.fillStyle = "#d7d5e1";
  context.beginPath();
  context.ellipse(240, 182, 36, 4, 0, 0, Math.PI * 2);
  context.fill();
}
export function Stage(props: StageProps) {
  const isPhoto = personas[props.persona].renderStyle === "photo";
  const resolution = isPhoto ? 3 : 1;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    context.clearRect(0, 0, 480, 240);
    if (props.ground) drawGround(context, props);
    context.save();
    context.translate(240, 180);
    if (isPhoto && props.mode === "procedural") context.scale(1.25, 1.25);
    if (props.onion && props.mode === "procedural") {
      context.globalAlpha = 0.12;
      context.save();
      context.translate(-42, 0);
      drawRunner(context, { ...props, phase: props.phase - 0.12 });
      context.restore();
      context.globalAlpha = 0.07;
      context.save();
      context.translate(-78, 0);
      drawRunner(context, { ...props, phase: props.phase - 0.24 });
      context.restore();
      context.globalAlpha = 1;
    }
    if (props.mode === "procedural") drawRunner(context, props);
    context.restore();
  }, [props]);
  const pose = getPose(props.phase, props.gait);
  const contact =
    pose.near.isContact && pose.far.isContact
      ? "DOUBLE SUPPORT"
      : pose.near.isContact
        ? "NEAR FOOT"
        : pose.far.isContact
          ? "FAR FOOT"
          : "AIRBORNE";
  const frame = (Math.floor(props.phase * 8) % 8) + 1;
  const source = `/sprites/runner-violet-${String(frame).padStart(2, "0")}.png`;
  return (
    <div className={isPhoto ? "stage photo-stage" : "stage"}>
      <div className="stage-top">
        <span>
          <i className="live-dot" /> LIVE PREVIEW
        </span>
        <span>
          {props.mode === "procedural"
            ? isPhoto
              ? "AI PHOTOGRAPHIC RIG"
              : "PROCEDURAL RIG"
            : "ORIGINAL FRAMES"}{" "}
          <span className="stage-cross">+</span>
        </span>
      </div>
      <div className="stage-mark top-left" />
      <div className="stage-mark bottom-right" />
      <canvas
        ref={canvas}
        width={480 * resolution}
        height={240 * resolution}
        aria-label="Animated side-view character"
        data-testid="stage__canvas"
      />
      {isPhoto &&
        props.mode === "procedural" &&
        props.photoStatus !== "ready" && (
          <div className="photo-loading" role="status">
            {props.photoStatus === "error" ? (
              <>
                <b>Photographic parts could not load.</b>
                <button data-testid="photo__retry" onClick={props.retryPhoto}>
                  Retry loading
                </button>
              </>
            ) : (
              "Loading photographic parts…"
            )}
          </div>
        )}
      {props.mode === "original" && (
        <img
          className="source-runner"
          src={source}
          alt={`Original running frame ${frame}`}
        />
      )}
      <div className="stage-bottom">
        <span>
          <b>
            {props.mode === "procedural"
              ? getPhaseLabel(props.phase, props.gait.motion)
              : `Source frame ${frame}`}
          </b>
          <small>
            {props.mode === "procedural" ? contact : "UNMODIFIED POSE SEQUENCE"}
          </small>
        </span>
        <span className="stage-coordinates">
          X 0.00 &nbsp; Y 0.00
          <br />
          {isPhoto && props.mode === "procedural"
            ? "SIDE VIEW · 1.25×"
            : "SIDE VIEW · 1×"}
        </span>
      </div>
    </div>
  );
}
export function PoseThumbnail(props: RenderOptions) {
  const isPhoto = personas[props.persona].renderStyle === "photo";
  const resolution = isPhoto ? 3 : 1;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    context.clearRect(0, 0, 120, 150);
    context.save();
    context.translate(57, 134);
    drawRunner(context, props);
    context.restore();
  }, [props]);
  return (
    <canvas
      ref={canvas}
      className={isPhoto ? "photo-thumbnail" : ""}
      width={120 * resolution}
      height={150 * resolution}
      aria-label="Running cycle pose"
    />
  );
}

import { motions, getMotionDefaults } from "../motion/motions";
import { personas, personaList, type PersonaId } from "../motion/personas";
import {
  RotateCcw,
  SlidersHorizontal,
  PersonStanding,
  Layers,
} from "lucide-react";
import { palettes } from "../motion/render";
import { type Gait } from "../motion/gait";
interface Props {
  persona: PersonaId;
  selectPersona: (value: PersonaId) => void;
  gait: Gait;
  setGait: (gait: Gait) => void;
  palette: number;
  setPalette: (value: number) => void;
  skeleton: boolean;
  setSkeleton: (value: boolean) => void;
  onion: boolean;
  setOnion: (value: boolean) => void;
  ground: boolean;
  setGround: (value: boolean) => void;
}
interface SliderProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}
function Slider(props: SliderProps) {
  return (
    <label className="slider-field">
      <span>
        {props.label}
        <b>
          {props.value}
          <small>{props.unit}</small>
        </b>
      </span>
      <input
        data-testid={`gait__${props.label.toLowerCase().replaceAll(" ", "-")}`}
        type="range"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <span className="range-extremes">
        <small>{props.min}</small>
        <small>{props.max}</small>
      </span>
    </label>
  );
}
function Toggle(props: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
  id: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        {props.label}
        <small>{props.detail}</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        data-testid={`overlays__${props.id}`}
        checked={props.value}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span className="switch" />
    </label>
  );
}
export function Controls(props: Props) {
  return (
    <aside className="controls panel">
      <div className="panel-heading">
        <span>
          <SlidersHorizontal size={16} /> Motion controls
        </span>
        <button
          className="icon-button"
          data-testid="gait__reset"
          title="Reset motion controls"
          onClick={() =>
            props.setGait(getMotionDefaults(props.gait.motion ?? "run"))
          }
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <CharacterControls {...props} />
      <GaitControls {...props} />
      <OverlayControls {...props} />
      <div className="control-note">
        <span>✧</span> One rig. Infinite in-between frames.
      </div>
    </aside>
  );
}

function CharacterControls(props: Props) {
  const character = personas[props.persona];
  const isPhoto = character.renderStyle === "photo";
  return (
    <section>
      <h3>
        <PersonStanding size={15} /> CHARACTER <span>01</span>
      </h3>
      <div
        className="persona-selector"
        role="group"
        aria-label="Runner persona"
      >
        {personaList.map((persona) => (
          <button
            key={persona.id}
            className={persona.renderStyle === "photo" ? "photo-persona" : ""}
            data-testid={`character__${persona.id}`}
            aria-pressed={props.persona === persona.id}
            onClick={() => props.selectPersona(persona.id)}
          >
            <b>{persona.name}</b>
            <small>{persona.label}</small>
          </button>
        ))}
      </div>
      <div className="character-name">
        <div className="character-dot">
          <PersonStanding size={22} />
        </div>
        <span>
          {character.name}
          <small>
            {isPhoto
              ? "AI-generated photographic parts"
              : "Singaporean Chinese · Adult"}
          </small>
        </span>
        <span className="tiny-tag">2D</span>
      </div>
      {isPhoto && (
        <p className="photo-persona-note">
          Singaporean Chinese adult · 16 articulated parts. Inner and outer
          limbs generated separately. Fixed teal kit.
        </p>
      )}
      <div className="palette-label">
        Shirt palette{" "}
        <span>
          {isPhoto
            ? "Original photographic fabric"
            : palettes[props.palette].name}
        </span>
      </div>
      <div className="swatches">
        {palettes.map((palette, index) => (
          <button
            key={palette.name}
            disabled={isPhoto}
            title={
              isPhoto
                ? "Photographic kit retains its generated colours"
                : palette.name
            }
            aria-label={`${palette.name} shirt`}
            aria-pressed={props.palette === index}
            data-testid="character__palette"
            style={{ "--swatch": palette.color } as React.CSSProperties}
            className={props.palette === index ? "selected" : ""}
            onClick={() => props.setPalette(index)}
          />
        ))}
      </div>
    </section>
  );
}

function GaitControls(props: Props) {
  const { limits } = motions[props.gait.motion ?? "run"];
  function update(field: keyof Gait, value: number) {
    props.setGait({ ...props.gait, [field]: value });
  }
  return (
    <section>
      <h3>
        <SlidersHorizontal size={14} /> GAIT PARAMETERS
      </h3>
      <Slider
        label="Cadence"
        value={props.gait.cadence}
        unit="spm"
        min={limits.cadence[0]}
        max={limits.cadence[1]}
        onChange={(value) => update("cadence", value)}
      />
      <Slider
        label="Stride length"
        value={props.gait.stride}
        unit="px"
        min={limits.stride[0]}
        max={limits.stride[1]}
        onChange={(value) => update("stride", value)}
      />
      <Slider
        label="Foot lift"
        value={props.gait.lift}
        unit="px"
        min={limits.lift[0]}
        max={limits.lift[1]}
        onChange={(value) => update("lift", value)}
      />
      <Slider
        label="Forward lean"
        value={props.gait.lean}
        unit="°"
        min={limits.lean[0]}
        max={limits.lean[1]}
        onChange={(value) => update("lean", value)}
      />
    </section>
  );
}

function OverlayControls(props: Props) {
  return (
    <section className="overlays">
      <h3>
        <Layers size={14} /> VIEW OVERLAYS
      </h3>
      <Toggle
        label="Skeleton"
        detail="See joints & limb connections"
        value={props.skeleton}
        onChange={props.setSkeleton}
        id="skeleton"
      />
      <Toggle
        label="Onion skin"
        detail="Trace the previous poses"
        value={props.onion}
        onChange={props.setOnion}
        id="onion"
      />
      <Toggle
        label="Ground plane"
        detail="Track foot contact"
        value={props.ground}
        onChange={props.setGround}
        id="ground"
      />
    </section>
  );
}

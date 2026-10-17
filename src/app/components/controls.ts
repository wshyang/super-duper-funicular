import { COLORWAYS } from "../../lib/rig/palette.ts";
import { GAIT_LIMITS, type GaitControls } from "../../lib/gait/gait.ts";
import { PERSONAS } from "../../lib/rig/persona.ts";
import {
  PLAYBACK_LIMITS,
  withGaitValue,
  withPersona,
  type AppSettings,
  type SettingsStore,
} from "../state/settings.ts";

interface SliderSpec {
  readonly key: keyof GaitControls;
  readonly label: string;
  readonly hint: string;
  readonly format: (value: number) => string;
  readonly step: number;
}

const SLIDERS: readonly SliderSpec[] = [
  { key: "cadence", label: "Cadence", hint: "steps per minute", format: (v) => `${v.toFixed(0)} spm`, step: 1 },
  { key: "strideLength", label: "Stride length", hint: "per full cycle", format: (v) => `${v.toFixed(2)} body heights`, step: 0.01 },
  { key: "dutyFactor", label: "Ground contact", hint: "share of the cycle per foot", format: (v) => `${(v * 100).toFixed(0)}%`, step: 0.005 },
  { key: "lean", label: "Torso lean", hint: "forward lean of the trunk", format: (v) => `${((v * 180) / Math.PI).toFixed(0)}°`, step: 0.005 },
  { key: "armSwing", label: "Arm swing", hint: "shoulder range", format: (v) => `${((v * 180) / Math.PI).toFixed(0)}°`, step: 0.01 },
  { key: "bobGain", label: "Vertical travel", hint: "scales the pelvis bob", format: (v) => `${v.toFixed(2)}×`, step: 0.01 },
];

export interface ControlsPanel {
  readonly element: HTMLElement;
}

export function createControls(store: SettingsStore): ControlsPanel {
  const element = document.createElement("section");
  element.className = "panel controls";
  element.dataset.testid = "controls__panel";
  element.append(heading("Gait controls", "Every value feeds the same biomechanical model."));

  element.append(createPersonaRow(store));
  element.append(createColorwayRow(store));
  for (const spec of SLIDERS) element.append(createSlider(store, spec));
  element.append(createToggleRow(store));
  element.append(createPlayback(store));
  return { element };
}

function heading(title: string, subtitle: string): HTMLElement {
  const wrapper = document.createElement("header");
  wrapper.className = "panel__header";
  const headingElement = document.createElement("h2");
  headingElement.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = subtitle;
  wrapper.append(headingElement, paragraph);
  return wrapper;
}

/**
 * Persona switch. Each persona owns its anatomy and its default kit; the gait
 * model and every joint limit are shared, so the two sprites are directly
 * comparable in motion.
 */
function createPersonaRow(store: SettingsStore): HTMLElement {
  const row = document.createElement("div");
  row.className = "field field--personas";
  const label = document.createElement("span");
  label.className = "field__label";
  label.textContent = "Runner";
  const group = document.createElement("div");
  group.className = "segmented";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Runner persona");
  const note = document.createElement("span");
  note.className = "field__hint";
  note.dataset.testid = "controls__persona-note";
  for (const persona of PERSONAS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill segmented__option";
    button.textContent = persona.label;
    button.dataset.testid = `controls__persona-${persona.id}`;
    button.addEventListener("click", () => store.update((current) => withPersona(current, persona.id)));
    group.append(button);
  }
  store.subscribe((settings) => {
    [...group.children].forEach((child, index) => {
      const active = PERSONAS[index]?.id === settings.personaId;
      child.classList.toggle("pill--active", active);
      child.setAttribute("aria-pressed", String(active));
    });
    note.textContent = PERSONAS.find((persona) => persona.id === settings.personaId)?.blurb ?? "";
  });
  row.append(label, group, note);
  return row;
}

function createColorwayRow(store: SettingsStore): HTMLElement {
  const row = document.createElement("div");
  row.className = "field field--colorways";
  const label = document.createElement("span");
  label.className = "field__label";
  label.textContent = "Kit colour";
  const swatches = document.createElement("div");
  swatches.className = "swatches";
  for (const colorway of COLORWAYS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.style.setProperty("--swatch", `rgb(${colorway.shirt.r} ${colorway.shirt.g} ${colorway.shirt.b})`);
    button.title = colorway.label;
    button.setAttribute("aria-label", `${colorway.label} kit`);
    button.dataset.testid = `controls__swatch-${colorway.id}`;
    button.addEventListener("click", () => store.update((current) => ({ ...current, colorwayId: colorway.id })));
    swatches.append(button);
  }
  store.subscribe((settings) => {
    [...swatches.children].forEach((child, index) => {
      child.classList.toggle("swatch--active", COLORWAYS[index]?.id === settings.colorwayId);
    });
  });
  row.append(label, swatches);
  return row;
}

function createSlider(store: SettingsStore, spec: SliderSpec): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "field field--slider";
  wrapper.dataset.testid = `controls__slider-${spec.key}`;
  const header = document.createElement("span");
  header.className = "field__row";
  const label = document.createElement("span");
  label.className = "field__label";
  label.textContent = spec.label;
  const value = document.createElement("output");
  value.className = "field__value";
  header.append(label, value);
  const hint = document.createElement("span");
  hint.className = "field__hint";
  hint.textContent = spec.hint;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(GAIT_LIMITS[spec.key].min);
  input.max = String(GAIT_LIMITS[spec.key].max);
  input.step = String(spec.step);
  input.addEventListener("input", () => {
    store.update((current) => withGaitValue(current, spec.key, Number(input.value)));
  });
  store.subscribe((settings) => {
    const current = settings.gait[spec.key];
    if (document.activeElement !== input) input.value = String(current);
    value.textContent = spec.format(current);
  });
  wrapper.append(header, hint, input);
  return wrapper;
}

function createToggleRow(store: SettingsStore): HTMLElement {
  const row = document.createElement("div");
  row.className = "field field--toggles";
  const toggles: Array<{ key: "showSkeleton" | "showGroundMarkers" | "showShadow" | "showTrail"; label: string }> = [
    { key: "showSkeleton", label: "Rig" },
    { key: "showGroundMarkers", label: "Footprints" },
    { key: "showShadow", label: "Shadow" },
    { key: "showTrail", label: "Ruler" },
  ];
  for (const toggle of toggles) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.textContent = toggle.label;
    button.dataset.testid = `controls__toggle-${toggle.key}`;
    button.addEventListener("click", () => {
      store.update((current) => ({
        ...current,
        display: { ...current.display, [toggle.key]: !current.display[toggle.key] },
      }));
    });
    store.subscribe((settings) => button.classList.toggle("pill--active", settings.display[toggle.key]));
    row.append(button);
  }
  return row;
}

function createPlayback(store: SettingsStore): HTMLElement {
  const row = document.createElement("div");
  row.className = "field field--playback";
  const play = document.createElement("button");
  play.type = "button";
  play.className = "pill pill--strong";
  play.dataset.testid = "controls__play";
  play.addEventListener("click", () => store.update((current) => ({ ...current, paused: !current.paused })));
  store.subscribe((settings) => {
    play.textContent = settings.paused ? "Play" : "Pause";
  });
  const speedLabel = document.createElement("span");
  speedLabel.className = "field__label";
  speedLabel.textContent = "Speed";
  const speed = document.createElement("input");
  speed.type = "range";
  speed.min = String(PLAYBACK_LIMITS.min);
  speed.max = String(PLAYBACK_LIMITS.max);
  speed.step = "0.05";
  speed.dataset.testid = "controls__speed";
  speed.addEventListener("input", () =>
    store.update((current) => ({ ...current, playbackRate: Number(speed.value) })),
  );
  const speedValue = document.createElement("output");
  speedValue.className = "field__value";
  store.subscribe((settings) => {
    if (document.activeElement !== speed) speed.value = String(settings.playbackRate);
    speedValue.textContent = `${settings.playbackRate.toFixed(2)}×`;
  });
  row.append(play, speedLabel, speed, speedValue);
  return row;
}

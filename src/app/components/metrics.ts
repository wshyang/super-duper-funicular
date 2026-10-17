import { resolveGait, type GaitParameters } from "../../lib/gait/gait.ts";
import { findRunnerOption } from "../../lib/rig/persona.ts";
import { FEMALE_BODY } from "../../lib/rig/body.ts";
import type { BodyMetrics } from "../../lib/rig/body.ts";
import type { AppSettings } from "../state/settings.ts";

export interface MetricsPanel {
  readonly element: HTMLElement;
  update(settings: AppSettings): void;
}

interface MetricSpec {
  readonly id: string;
  readonly label: string;
  readonly read: (gait: GaitParameters, body: BodyMetrics) => string;
}

const SPECS: readonly MetricSpec[] = [
  {
    id: "persona",
    label: "Persona",
    read: (_gait, body) => `${body.statureMetres.toFixed(2)} m`,
  },
  {
    id: "speed",
    label: "Ground speed",
    read: (gait, body) =>
      `${((gait.strideLength / gait.cycleSeconds) * body.statureMetres * 3.6).toFixed(1)} km/h`,
  },
  {
    id: "cycle",
    label: "Cycle",
    read: (gait) => `${(gait.cycleSeconds * 1000).toFixed(0)} ms`,
  },
  {
    id: "stride",
    label: "Stride",
    read: (gait, body) => `${(gait.strideLength * body.statureMetres).toFixed(2)} m`,
  },
  {
    id: "stance",
    label: "Stance / flight",
    read: (gait) => `${Math.round(gait.dutyFactor * 100)}% / ${Math.round((1 - 2 * gait.dutyFactor) * 100)}%`,
  },
  {
    id: "bob",
    label: "Pelvis travel",
    read: (gait, body) =>
      `${(((gait.stanceCompression + gait.flightRise) * gait.bobGain * body.statureMetres) * 100).toFixed(1)} cm`,
  },
  {
    id: "step",
    label: "Step length",
    read: (gait, body) => `${((gait.strideLength / 2) * body.statureMetres).toFixed(2)} m`,
  },
];

export function createMetrics(): MetricsPanel {
  const element = document.createElement("div");
  element.className = "metrics";
  element.dataset.testid = "metrics__panel";
  const outputs = new Map<string, HTMLElement>();
  for (const spec of SPECS) {
    const cell = document.createElement("div");
    cell.className = "metric";
    const value = document.createElement("span");
    value.className = "metric__value";
    value.dataset.testid = `metrics__value-${spec.id}`;
    const label = document.createElement("span");
    label.className = "metric__label";
    label.textContent = spec.label;
    cell.append(value, label);
    outputs.set(spec.id, value);
    element.append(cell);
  }
  const update = (settings: AppSettings) => {
    const gait = resolveGait(settings.gait);
    const persona = findRunnerOption(settings.personaId);
    // The photo rig loads asynchronously; its readouts use the female stature
    // until the manifest is in, and the pose itself comes from the rig.
    const body = persona.kind === "vector" ? persona.body : FEMALE_BODY;
    for (const spec of SPECS) {
      const output = outputs.get(spec.id);
      if (output !== undefined) output.textContent = spec.read(gait, body);
    }
  };
  return { element, update };
}

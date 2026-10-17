import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  colorwayFor,
  createSettingsStore,
  lookForSettings,
  withGaitValue,
  withPersona,
} from "../src/app/state/settings.ts";
import { MALE_BODY } from "../src/lib/rig/body.ts";
import { EMPTY_TRAIL, advanceTrail, footprintScreenX, viewForCanvas } from "../src/app/model/stage-model.ts";
import { GAIT_LIMITS, DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";

describe("settings store", () => {
  it("never mutates the previous settings object", () => {
    const store = createSettingsStore();
    const before = store.get();
    store.update((current) => ({ ...current, colorwayId: "blue" }));
    expect(before.colorwayId).toBe("red");
    expect(store.get().colorwayId).toBe("blue");
  });

  it("notifies subscribers with the new value and stops after unsubscribe", () => {
    const store = createSettingsStore();
    const seen: string[] = [];
    const unsubscribe = store.subscribe((settings) => seen.push(settings.colorwayId));
    store.update((current) => ({ ...current, colorwayId: "green" }));
    unsubscribe();
    store.update((current) => ({ ...current, colorwayId: "orange" }));
    expect(seen).toEqual(["red", "green"]);
  });

  it("clamps a gait control to its documented limits", () => {
    const high = withGaitValue(DEFAULT_SETTINGS, "cadence", 1000);
    expect(high.gait.cadence).toBe(GAIT_LIMITS.cadence.max);
    const low = withGaitValue(DEFAULT_SETTINGS, "lean", -1);
    expect(low.gait.lean).toBe(GAIT_LIMITS.lean.min);
  });

  it("falls back to the first colourway for an unknown id", () => {
    expect(colorwayFor({ ...DEFAULT_SETTINGS, colorwayId: "chartreuse" }).id).toBe("red");
  });
});

describe("stage model", () => {
  const gait = resolveGait(DEFAULT_CONTROLS);

  it("advances the world distance at the modelled ground speed", () => {
    const next = advanceTrail(EMPTY_TRAIL, gait, 0.1, 0.5);
    expect(next.distance).toBeGreaterThan(0);
  });

  it("retires old footprints so the trail cannot grow without bound", () => {
    let trail = EMPTY_TRAIL;
    for (let step = 0; step < 200; step += 1) {
      trail = advanceTrail(trail, gait, (step * 0.01) % 1, 0.05);
    }
    expect(trail.footprints.length).toBeLessThanOrEqual(18);
  });

  it("scrolls a footprint backwards as the world advances", () => {
    const view = viewForCanvas(800, 600);
    const trail = advanceTrail(EMPTY_TRAIL, gait, 0.02, 0.3);
    const footprint = trail.footprints[0];
    if (footprint === undefined) return;
    const first = footprintScreenX(footprint, trail, view);
    const later = footprintScreenX(footprint, { ...trail, distance: trail.distance + 0.2 }, view);
    expect(later).toBeLessThan(first);
  });

  it("fits the figure inside the canvas", () => {
    const view = viewForCanvas(800, 600);
    expect(view.groundY).toBeLessThan(600);
    expect(view.groundY - view.scale).toBeGreaterThan(0);
  });
});

describe("personas", () => {
  it("defaults to the male Singaporean Chinese runner", () => {
    expect(DEFAULT_SETTINGS.personaId).toBe("sg-chinese-male");
  });

  it("switches persona and adopts that persona's default kit", () => {
    const switched = withPersona(DEFAULT_SETTINGS, "sg-chinese-female");
    expect(switched.personaId).toBe("sg-chinese-female");
    expect(switched.colorwayId).toBe("blue");
    const back = withPersona(switched, "sg-chinese-male");
    expect(back.colorwayId).toBe("red");
  });

  it("builds a look whose body matches the chosen persona", () => {
    const female = lookForSettings({ ...DEFAULT_SETTINGS, personaId: "sg-chinese-female" });
    expect(female.personaId).toBe("sg-chinese-female");
    expect(female.body.statureMetres).toBeLessThan(MALE_BODY.statureMetres);
    expect(female.hair).toBe("ponytail");
    expect(female.palette.skin).not.toEqual(lookForSettings(DEFAULT_SETTINGS).palette.skin);
  });
});

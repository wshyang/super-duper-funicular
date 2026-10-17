import { findRunnerOption } from "../../lib/rig/persona.ts";
import { lookForSettings, type AppSettings } from "../state/settings.ts";
import { photoRuntime } from "../model/photo-runtime.ts";
import { createPartsAtlas } from "./parts-atlas.ts";
import { createPhotoAtlas } from "./photo-atlas.ts";

/**
 * One panel that decomposes whichever runner is selected. The vector personas
 * get the generated parts atlas; the photographic ones get their cut-outs in
 * the same joint frames. The panel owns the swap so the layout has a single,
 * stable slot.
 */
export interface RigAtlas {
  readonly element: HTMLElement;
  update(settings: AppSettings): void;
}

export function createRigAtlas(initial: AppSettings): RigAtlas {
  const element = document.createElement("div");
  element.className = "atlas-host";
  const vector = createPartsAtlas(lookForSettings(initial));
  const photo = createPhotoAtlas();
  let mounted: HTMLElement | undefined;
  let personaId = "";

  const mount = (panel: HTMLElement): void => {
    if (mounted === panel) return;
    mounted = panel;
    element.replaceChildren(panel);
  };

  const update = (settings: AppSettings): void => {
    const option = findRunnerOption(settings.personaId);
    if (option.kind === "vector") {
      personaId = "";
      vector.setLook(lookForSettings(settings));
      mount(vector.element);
      return;
    }
    mount(photo.element);
    if (personaId === option.id) return;
    personaId = option.id;
    void photoRuntime(option.manifest).then((runtime) => {
      if (personaId === option.id) photo.setRig(runtime.rig, runtime.assets);
    });
  };

  update(initial);
  return { element, update };
}

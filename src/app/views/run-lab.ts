import { createControls } from "../components/controls.ts";
import { createFlawPanel } from "../components/flaw-panel.ts";
import { createMetrics } from "../components/metrics.ts";
import { createRigAtlas } from "../components/rig-atlas.ts";
import { createReferenceStrip } from "../components/reference-strip.ts";
import { createStage } from "../components/stage.ts";
import { startLoop } from "../loop.ts";
import { createSettingsStore, lookForSettings, type AppSettings, type SettingsStore } from "../state/settings.ts";
import { findRunnerOption } from "../../lib/rig/persona.ts";

export interface RunLabHandle {
  readonly element: HTMLElement;
  readonly store: SettingsStore;
  start(): void;
  stop(): void;
}

/** Wires the store, the animation loop and the panels together. */
export function createRunLab(): RunLabHandle {
  const store = createSettingsStore();
  const stage = createStage();
  const controls = createControls(store);
  const metrics = createMetrics();
  const partsAtlas = createRigAtlas(store.get());
  const flaws = createFlawPanel(store.get());

  const element = layout(stage.element, controls.element, metrics.element, flaws.element, partsAtlas.element);
  const referenceHost = element.querySelector<HTMLElement>("[data-slot='reference']");
  void createReferenceStrip(fetchManifest).then((strip) => {
    referenceHost?.replaceChildren(strip.element);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) stage.resize();
  });

  store.subscribe((settings) => {
    metrics.update(settings);
    flaws.update(settings);
    partsAtlas.update(settings);
  });

  let phase = 0;
  const handle = startLoop({
    stepSeconds: (delta, now) => {
      const settings = store.get();
      if (!settings.paused) {
        phase = (phase + (delta * settings.playbackRate) / cycleSeconds(settings)) % 1;
      }
      if (!document.hidden) stage.render(phase, settings);
      void now;
    },
  });

  const resize = () => stage.resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(resize);

  return {
    element,
    store,
    start: () => {
      if (!document.hidden) stage.render(phase, store.get());
    },
    stop: () => handle.stop(),
  };
}

function cycleSeconds(settings: AppSettings): number {
  return 120 / Math.max(80, settings.gait.cadence);
}

async function fetchManifest(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function layout(
  stage: HTMLCanvasElement,
  controls: HTMLElement,
  metrics: HTMLElement,
  flaws: HTMLElement,
  atlas: HTMLElement,
): HTMLElement {
  const root = document.createElement("main");
  root.className = "page";

  const header = document.createElement("header");
  header.className = "masthead";
  header.innerHTML = `
    <div class="masthead__titles">
      <p class="eyebrow">Procedural animation study</p>
      <h1>RunLab<span class="masthead__dot">.</span></h1>
      <p class="lede">A running sprite generated from a skeleton and a gait model — no bitmap poses.</p>
    </div>
  `;
  header.append(metrics);

  const deck = document.createElement("section");
  deck.className = "deck";
  const stageFrame = document.createElement("div");
  stageFrame.className = "stage";
  stageFrame.dataset.testid = "stage__frame";
  stageFrame.append(stage);
  const stageCaption = document.createElement("p");
  stageCaption.className = "stage__caption";
  stageCaption.textContent =
    "Fourteen bones, analytic two-bone IK, an articulated neck and a foot that rolls heel-to-toe. The yellow marks are ground contacts scrolling at the modelled ground speed.";
  stageFrame.append(stageCaption);
  deck.append(stageFrame, controls);

  const grid = document.createElement("section");
  grid.className = "grid";
  const referenceSlot = document.createElement("div");
  referenceSlot.dataset.slot = "reference";
  grid.append(flaws, referenceSlot, atlas);

  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML = `
    <p>Reference sheet: 6 colourways × 8 frames, analysed at build time. Generated runner: one rig, continuous phase.</p>
    <p class="footer__meta">npm run sprites:extract · npm run sprites:analyse · npm run runner:preview</p>
  `;

  root.append(header, deck, grid, footer);
  return root;
}

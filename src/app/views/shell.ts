import type { MotionId, PersonaId, SpriteManifest, FlawReport } from '../../shared/types.ts';
import { MOTION_IDS, MOTION_PROFILES, PERSONA_IDS, PERSONAS } from '../../lib/rig/body.ts';
import {
  DEFAULT_SETTINGS,
  SPEEDS,
  advancePhase,
  onionPhasesFor,
  personaOf,
  phaseLabel,
  poseFor,
  profileOf,
  resetSettings,
  stepPhase,
  supportLabel,
  toggleOnion,
  togglePlaying,
  toggleSkeleton,
  viewTransform,
  withMotion,
  withPersona,
  withPhase,
  withSpeed,
  type StageSettings,
} from '../model/stage-model.ts';
import { auditPanels, filmstripPanels, onionOps } from '../model/exporters.ts';
import { poseToOps, skeletonOps } from '../../lib/render/paint-ops.ts';
import { paintOpsToCanvas } from './canvas-painter.ts';
import sourceSheetUrl from '../../images/source/runner-six-palette-eight-frame-flawed-sheet.jpeg';

export interface Shell {
  readonly root: HTMLElement;
  readonly getSettings: () => StageSettings;
  readonly setSettings: (next: StageSettings) => void;
  readonly redraw: () => void;
}

interface Handlers {
  settings: StageSettings;
  set: (next: StageSettings) => void;
}

/** Builds the whole workbench DOM (#surf-workbench). Views wire, models decide. */
export function buildShell(host: HTMLElement, manifest: SpriteManifest | null, flaws: FlawReport | null): Shell {
  const handlers: Handlers = { settings: DEFAULT_SETTINGS, set: (next) => (handlers.settings = next) };
  host.innerHTML = '';
  host.append(header(), stageSection(), controlsSection(handlers), filmstripSection(handlers), librarySection(manifest), diagnosticsSection(flaws), exportSection(handlers));
  return {
    root: host,
    getSettings: () => handlers.settings,
    setSettings: (next) => {
      handlers.set(next);
    },
    redraw: () => {
      drawStage(host, handlers.settings);
      drawFilmstrip(host, handlers.settings);
      drawLabels(host, handlers.settings);
    },
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, testId: string, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.dataset.testid = testId;
  if (text) node.textContent = text;
  return node;
}

function header(): HTMLElement {
  const head = el('header', 'workspace-header');
  head.append(el('h1', 'workspace-header__title', 'Stride Harmonised Lab'));
  head.append(el('p', 'workspace-header__provenance', 'Procedural replacement for the flawed 8-frame sheet · living ledger: docs/N_WAY_COMPARISON.md'));
  return head;
}

function stageSection(): HTMLElement {
  const section = el('section', 'runner-stage');
  const canvas = el('canvas', 'runner-stage__canvas');
  canvas.width = 640;
  canvas.height = 480;
  section.append(canvas, el('div', 'runner-stage__support', '—'), el('div', 'runner-stage__phase', '—'));
  return section;
}

function controlsSection(handlers: Handlers): HTMLElement {
  const section = el('section', 'runner-controls');
  section.append(
    button('runner-controls__play-toggle', 'Pause', () => handlers.set(togglePlaying(handlers.settings))),
    button('runner-controls__step-back', 'Step −', () => handlers.set(stepPhase(handlers.settings, -1))),
    button('runner-controls__step-forward', 'Step +', () => handlers.set(stepPhase(handlers.settings, 1))),
    button('runner-controls__reset', 'Reset', () => handlers.set(resetSettings(handlers.settings))),
  );
  section.append(scrub(handlers), select('runner-controls__speed', 'Speed', SPEEDS.map(String), '1', (v) => handlers.set(withSpeed(handlers.settings, Number(v)))));
  section.append(
    select('runner-controls__motion', 'Motion', MOTION_IDS, 'run', (v) => handlers.set(withMotion(handlers.settings, v as MotionId))),
    select('runner-controls__persona', 'Runner', PERSONA_IDS.map((id) => PERSONAS[id].label), PERSONAS['wei-ming'].label, (v) => {
      const id = PERSONA_IDS.find((pid) => PERSONAS[pid].label === v) as PersonaId;
      handlers.set(withPersona(handlers.settings, id));
    }),
  );
  section.append(
    checkbox('runner-controls__skeleton', 'Skeleton overlay', (checked) => handlers.set(withSkeleton(handlers, checked))),
    checkbox('runner-controls__onion', 'Onion skin', (checked) => handlers.set(withOnion(handlers, checked))),
  );
  return section;
}

function withSkeleton(handlers: Handlers, checked: boolean): StageSettings {
  const current = handlers.settings;
  return current.skeleton === checked ? current : toggleSkeleton(current);
}

function withOnion(handlers: Handlers, checked: boolean): StageSettings {
  const current = handlers.settings;
  return current.onion === checked ? current : toggleOnion(current);
}

function button(testId: string, label: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', testId, label);
  node.type = 'button';
  node.addEventListener('click', () => {
    onClick();
    document.dispatchEvent(new CustomEvent('stride:redraw'));
  });
  return node;
}

function scrub(handlers: Handlers): HTMLElement {
  const input = el('input', 'runner-controls__scrub');
  input.type = 'range';
  input.min = '0';
  input.max = '1000';
  input.value = '0';
  input.addEventListener('input', () => {
    handlers.set(withPhase(handlers.settings, Number(input.value) / 1000));
    document.dispatchEvent(new CustomEvent('stride:redraw'));
  });
  return input;
}

function select(testId: string, label: string, options: readonly string[], value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = el('label', `${testId}-wrap`, `${label} `);
  const node = el('select', testId);
  node.dataset.testid = testId;
  for (const option of options) node.append(el('option', `${testId}__option-${option}`, option));
  node.value = value;
  node.addEventListener('change', () => {
    onChange(node.value);
    document.dispatchEvent(new CustomEvent('stride:redraw'));
  });
  wrap.append(node);
  return wrap;
}

function checkbox(testId: string, label: string, onChange: (checked: boolean) => void): HTMLElement {
  const wrap = el('label', `${testId}-wrap`, ` ${label}`);
  const input = el('input', testId);
  input.type = 'checkbox';
  input.addEventListener('change', () => {
    onChange(input.checked);
    document.dispatchEvent(new CustomEvent('stride:redraw'));
  });
  wrap.prepend(input);
  return wrap;
}

function filmstripSection(handlers: Handlers): HTMLElement {
  const section = el('section', 'filmstrip');
  section.append(el('h2', 'filmstrip__title', 'Eight-phase strip'));
  const strip = el('div', 'filmstrip__strip');
  for (let i = 0; i < 8; i += 1) {
    const cell = el('button', 'filmstrip__frame');
    cell.type = 'button';
    const canvas = el('canvas', 'filmstrip__canvas');
    canvas.width = 140;
    canvas.height = 140;
    cell.append(canvas, el('span', 'filmstrip__label', `phase ${i + 1}`));
    cell.addEventListener('click', () => {
      handlers.set(withPhase(handlers.settings, i / 8));
      document.dispatchEvent(new CustomEvent('stride:redraw'));
    });
    strip.append(cell);
  }
  section.append(strip);
  return section;
}

function librarySection(manifest: SpriteManifest | null): HTMLElement {
  const section = el('section', 'asset-library');
  section.append(el('h2', 'asset-library__title', 'Asset library'));
  const source = el('img', 'asset-library__source-sheet');
  source.src = sourceSheetUrl;
  source.alt = 'Flawed reference sheet: eight columns repeat four poses';
  section.append(source);
  const grid = el('div', 'asset-library__extracted');
  const frames = manifest?.frames.slice(0, 8) ?? [];
  for (const frame of frames) {
    const img = el('img', 'asset-library__frame');
    img.src = frame.url;
    img.alt = `Extracted ${frame.id}`;
    grid.append(img);
  }
  section.append(grid, el('p', 'asset-library__note', manifest ? `${manifest.frames.length} registered cutouts · canvas ${manifest.canvas.width}×${manifest.canvas.height}` : 'Run npm run pipeline to generate cutouts.'));
  return section;
}

function diagnosticsSection(flaws: FlawReport | null): HTMLElement {
  const section = el('section', 'diagnostics');
  section.append(el('h2', 'diagnostics__title', 'Source-sheet forensics'));
  const table = el('table', 'diagnostics__flaw-table');
  for (const flaw of flaws?.flaws ?? []) {
    const row = el('tr', `diagnostics__row-${flaw.id}`);
    row.append(el('td', 'diagnostics__flaw-id', flaw.id), el('td', 'diagnostics__flaw-state', flaw.detected ? 'detected' : 'not detected'), el('td', 'diagnostics__flaw-evidence', flaw.evidence));
    table.append(row);
  }
  section.append(table);
  return section;
}

function exportSection(handlers: Handlers): HTMLElement {
  const section = el('section', 'export-bar');
  section.append(
    button('export-bar__sheet', 'Export 8-frame sheet PNG', () => exportSheet(handlers)),
    button('export-bar__audit', 'Export 16-phase audit PNG', () => exportAudit(handlers)),
  );
  return section;
}

function drawStage(root: HTMLElement, settings: StageSettings): void {
  const canvas = root.querySelector('[data-testid="runner-stage__canvas"]') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const pose = poseFor(settings);
  const persona = personaOf(settings);
  const transform = viewTransform(canvas.width, canvas.height);
  const onion = onionOps(onionPhasesFor(settings), profileOf(settings), persona);
  const ops = [...onion, ...poseToOps(pose, persona), ...(settings.skeleton ? skeletonOps(pose, '#00e5ff') : [])];
  paintOpsToCanvas(ctx, ops, transform, 'light', { x: 0, y: 0, width: canvas.width, height: canvas.height });
}

function drawFilmstrip(root: HTMLElement, settings: StageSettings): void {
  const canvases = root.querySelectorAll('[data-testid="filmstrip__canvas"]');
  const panels = filmstripPanels(profileOf(settings), personaOf(settings), 140);
  canvases.forEach((node: Element, i: number) => {
    const canvas = node as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    const panel = panels[i];
    if (!ctx || !panel) return;
    paintOpsToCanvas(ctx, panel.ops, panel.transform, 'light', { x: 0, y: 0, width: canvas.width, height: canvas.height });
  });
}

function drawLabels(root: HTMLElement, settings: StageSettings): void {
  const pose = poseFor(settings);
  const support = root.querySelector('[data-testid="runner-stage__support"]');
  const phase = root.querySelector('[data-testid="runner-stage__phase"]');
  const play = root.querySelector('[data-testid="runner-controls__play-toggle"]');
  if (support) support.textContent = supportLabel(pose);
  if (phase) phase.textContent = phaseLabel(pose);
  if (play) play.textContent = settings.playing ? 'Pause' : 'Play';
  const scrub = root.querySelector('[data-testid="runner-controls__scrub"]') as HTMLInputElement | null;
  if (scrub) scrub.value = String(Math.round(settings.phase * 1000));
}

function exportSheet(handlers: Handlers): void {
  const panels = filmstripPanels(profileOf(handlers.settings), personaOf(handlers.settings), 160);
  downloadPanels(panels, 8, 1, `${handlers.settings.persona}-${handlers.settings.motion}-cycle.png`);
}

function exportAudit(handlers: Handlers): void {
  const panels = auditPanels(profileOf(handlers.settings), personaOf(handlers.settings), 160);
  downloadPanels(panels, 3, 16, `${handlers.settings.persona}-${handlers.settings.motion}-audit-16phase.png`);
}

function downloadPanels(panels: readonly { ops: readonly import('../../shared/types.ts').PaintOp[]; transform: import('../../lib/render/paint-ops.ts').Transform; background: 'light' | 'dark' | 'transparent' }[], cols: number, rows: number, filename: string): void {
  const cell = 160;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  panels.forEach((panel, i) => {
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    paintOpsToCanvas(ctx, panel.ops, panel.transform, panel.background, { x, y, width: cell, height: cell });
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export { advancePhase, MOTION_PROFILES };

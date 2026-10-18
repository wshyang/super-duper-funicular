import type { FlawReport, SpriteManifest } from '../shared/types.ts';
import { advancePhase, buildShell, type Shell } from './views/shell.ts';
import './styles.css';

async function loadJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) return;
  const [manifest, flaws] = await Promise.all([
    loadJson<SpriteManifest>('/sprites/extracted/manifest.json'),
    loadJson<FlawReport>('/analysis/source-flaws.json'),
  ]);
  const shell: Shell = buildShell(host, manifest, flaws);
  document.addEventListener('stride:redraw', () => shell.redraw());
  shell.redraw();
  requestAnimationFrame(loop(shell));
}

function loop(shell: Shell): (time: number) => void {
  let last = performance.now();
  return (time: number) => {
    const delta = Math.min(0.1, (time - last) / 1000);
    last = time;
    const settings = shell.getSettings();
    const next = advancePhase(settings, delta);
    if (next !== settings) {
      shell.setSettings(next);
      shell.redraw();
    }
    requestAnimationFrame(loop(shell));
  };
}

void boot();

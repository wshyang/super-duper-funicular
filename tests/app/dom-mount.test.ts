// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { installCanvasMock } from './canvas-mock.ts';

const ROOT = join(__dirname, '..', '..');

window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

globalThis.fetch = (async (input: string) => {
  const path = String(input).replace(/^\//, '').split('?')[0] ?? '';
  const json: unknown = JSON.parse(readFileSync(join(ROOT, 'public', path), 'utf8'));
  return { ok: true, status: 200, json: async () => json } as Response;
}) as typeof fetch;

const settle = async (times = 6): Promise<void> => {
  for (let index = 0; index < times; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
};

describe('browser mount', () => {
  it('paints the stage without throwing on any colour', async () => {
    const audit = installCanvasMock();
    const { App } = await import('../../src/app/App.tsx');
    const host = document.createElement('div');
    host.id = 'root';
    document.body.append(host);
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent): void => {
      errors.push(event.error);
    };
    window.addEventListener('error', onError);
    const root = createRoot(host);
    try {
      root.render(createElement(App));
      await settle();
    } finally {
      window.removeEventListener('error', onError);
    }
    expect(errors).toEqual([]);
    expect(host.textContent).toContain('Funicular Motion Lab');
    expect(host.textContent).toContain('Motion studio');
    expect(audit.operations).toBeGreaterThan(50);
    expect(audit.gradients).toBeGreaterThan(10);
    root.unmount();
  });

  it('renders every workspace tab without a crash', async () => {
    installCanvasMock();
    const { App } = await import('../../src/app/App.tsx');
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    root.render(createElement(App));
    await settle(3);
    const tabs = ['inspector', 'diagnostics', 'gallery', 'vectors', 'parity', 'studio'];
    for (const tab of tabs) {
      const button = host.querySelector<HTMLButtonElement>(
        `[data-testid="workspace-tabs__tab-${tab}"]`,
      );
      expect(button, tab).not.toBeNull();
      button?.click();
      await settle(2);
      expect(host.textContent?.length ?? 0, tab).toBeGreaterThan(200);
    }
    root.unmount();
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App.tsx';

describe('app shell', () => {
  it('renders the studio without a browser runtime', () => {
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain('Motion studio');
    expect(html).toContain('data-testid="stage__procedural-canvas"');
    expect(html).toContain('data-testid="playback__play-toggle"');
  });

  it('gives every workspace tab a testid', () => {
    const html = renderToStaticMarkup(createElement(App));
    for (const tab of ['studio', 'inspector', 'diagnostics', 'gallery', 'parity']) {
      expect(html, tab).toContain(`data-testid="workspace-tabs__tab-${tab}"`);
    }
  });
});

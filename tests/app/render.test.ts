import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { VectorsPanel } from '../../src/app/components/VectorsPanel.tsx';

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

const fixtureManifest = {
  generatedBy: 'test',
  options: { maxColors: 14, tolerance: 0.3, minArea: 2 },
  frames: Array.from({ length: 8 }, (_, index) => ({
    id: `red-${String(index + 1).padStart(2, '0')}`,
    file: `red/frame-${String(index + 1).padStart(2, '0')}.svg`,
    width: 316,
    height: 262,
    bands: 12,
    paths: 90,
    points: 5000,
    bytes: 60000,
    maskIou: 0.92,
    colourAgreement: 0.9,
  })),
  meanMaskIou: 0.92,
  meanColourAgreement: 0.9,
};

describe('vector output panel', () => {
  it('lists every traced frame with a download link', () => {
    const html = renderToStaticMarkup(
      createElement(VectorsPanel, {
        manifest: fixtureManifest,
        palette: 'red',
        onPalette: () => undefined,
      }),
    );
    expect(html).toContain('mean mask IoU 0.920');
    expect(html).toContain('src="/vectors/red/frame-01.svg"');
    expect(html).toContain('data-testid="vectors__download-red-08"');
    expect(html).toContain('data-testid="vectors__palette-blue"');
  });
});

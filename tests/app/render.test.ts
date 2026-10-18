import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { VectorsPanel } from '../../src/app/components/VectorsPanel.tsx';
import { CalibrationPanel } from '../../src/app/components/CalibrationPanel.tsx';

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

describe('joint calibration panel', () => {
  const state = {
    calibration: {
      hip: { x: 2, y: -1 },
      shoulder: { x: 0, y: 0 },
      head: { x: -3, y: 4 },
    },
    setOffset: () => undefined,
    reset: () => undefined,
  };

  it('exposes six clamped sliders and registered exports', () => {
    const html = renderToStaticMarkup(
      createElement(CalibrationPanel, {
        state,
        busy: false,
        onExportJson: () => undefined,
        onExportSheet: () => undefined,
      }),
    );
    for (const joint of ['hip', 'shoulder', 'head']) {
      for (const axis of ['x', 'y']) {
        expect(html, `${joint}-${axis}`).toContain(`data-testid="calibration__${joint}-${axis}"`);
      }
    }
    expect(html).toContain('data-testid="calibration__export-json"');
    expect(html).toContain('data-testid="calibration__export-sheet"');
    expect(html).toContain('+2.0 px');
  });
});

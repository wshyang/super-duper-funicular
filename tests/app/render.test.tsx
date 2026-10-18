import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';
import { DEFAULT_SETTINGS } from '../../src/shared/constants';
import { renderRunner } from '../../src/runner/render';
import { solvePose } from '../../src/runner/pose';

type PointTuple = readonly [number, number];
type RecordedStroke = {
  readonly color: string;
  readonly width: number;
  readonly from: PointTuple;
  readonly to: PointTuple;
};

const recordingContext = (): {
  readonly context: CanvasRenderingContext2D;
  readonly strokes: RecordedStroke[];
} => {
  let path: PointTuple[] = [];
  const strokes: RecordedStroke[] = [];
  const context = {
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    beginPath: () => {
      path = [];
    },
    moveTo: (x: number, y: number) => {
      path.push([x, y]);
    },
    lineTo: (x: number, y: number) => {
      path.push([x, y]);
    },
    stroke: () => {
      const from = path[0];
      const to = path.at(-1);
      if (from && to)
        strokes.push({ color: String(context.strokeStyle), width: context.lineWidth, from, to });
    },
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    arc: () => undefined,
    ellipse: () => undefined,
    roundRect: () => undefined,
    quadraticCurveTo: () => undefined,
    closePath: () => undefined,
    fill: () => undefined,
    fillRect: () => undefined,
  } as unknown as CanvasRenderingContext2D;
  return { context, strokes };
};

describe('motion studio shell', () => {
  it('renders accessible playback and source controls without a browser runtime', () => {
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain('Motion studio');
    expect(html).toContain('data-testid="stage__procedural-canvas"');
    expect(html).toContain('data-testid="playback__play-toggle"');
    expect(html).toContain('data-testid="playback__phase-slider"');
    expect(html).toContain('data-testid="source__status"');
    expect(html).toContain('data-testid="views__tab-diagnostics"');
    expect(html).toContain('data-testid="stage__toggle-skeleton"');
    expect(html).toContain('data-testid="stage__toggle-onion"');
    expect(html).toContain('data-testid="export__cycle-audit"');
  });

  it('offers all motion profiles, two personas and six palettes', () => {
    const html = renderToStaticMarkup(createElement(App));
    for (const motion of ['run', 'walk', 'brisk-walk']) {
      expect(html).toContain(`data-testid="motion__select-${motion}"`);
    }
    for (const persona of ['sprinter', 'strider']) {
      expect(html).toContain(`data-testid="settings__persona-${persona}"`);
    }
    for (const palette of ['red', 'blue', 'green', 'yellow', 'purple', 'orange']) {
      expect(html).toContain(`data-testid="settings__palette-${palette}"`);
    }
  });

  it('renders a skin-toned neck between the torso shoulder and head', () => {
    const pose = solvePose(DEFAULT_SETTINGS, 0.25);
    const { context, strokes } = recordingContext();
    renderRunner(context, pose, DEFAULT_SETTINGS, { background: 'transparent', clear: false });
    expect(strokes).toContainEqual({
      color: '#d69a70',
      width: 16,
      from: [pose.shoulder.x, pose.shoulder.y],
      to: [pose.neck.x, pose.neck.y],
    });
  });
});

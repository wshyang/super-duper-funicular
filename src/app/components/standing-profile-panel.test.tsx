import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PHOTOREAL_ASSET_TUNING_DEFAULTS } from '../../runner/body-proportions.js';
import { StandingProfilePanel } from './StandingProfilePanel.js';

describe('Standing profile calibration panel', () => {
  it('labels the estimate and exposes source-to-assembled proportion comparison', () => {
    const markup = renderToStaticMarkup(
      <StandingProfilePanel
        personaId="photo-sg-chinese-female-petite"
        tuning={PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female-petite']}
        photorealStatus="idle"
      />,
    );
    expect(markup).toContain('Standing Profile Calibration');
    expect(markup).toContain('≈ 152 cm');
    expect(markup).toContain('not measured subject data');
    expect(markup).toContain('Original side profile');
    expect(markup).toContain('Assembled default');
    expect(markup).toContain('Horizontal width as percent of standing height');
    expect(markup).toContain('data-testid="standing-profile-panel"');
  });
});

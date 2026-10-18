import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SOURCE_SHA256 } from '../../src/shared/constants';
import {
  createCycleAuditManifest,
  createSpriteSheetManifest,
  EXPORT_LAYOUT,
} from '../../src/app/exporters';

describe('renderer-backed export contracts', () => {
  it('defines eight transparent source phases with registered cell positions', () => {
    const manifest = createSpriteSheetManifest(DEFAULT_SETTINGS);
    expect(manifest.schema).toBe('funicular.sprite-sheet.v1');
    expect(manifest.sourceSha256).toBe(SOURCE_SHA256);
    expect(manifest.cell).toEqual({ width: 460, height: 260 });
    expect(manifest.frames).toHaveLength(8);
    expect(manifest.frames.map((frame) => frame.phase)).toEqual([
      0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875,
    ]);
    expect(manifest.frames.map((frame) => frame.x)).toEqual([
      0, 460, 920, 1380, 1840, 2300, 2760, 3220,
    ]);
  });

  it('defines the 16-phase by three-panel cycle audit without mutating settings', () => {
    const manifest = createCycleAuditManifest(DEFAULT_SETTINGS);
    expect(manifest.schema).toBe('funicular.cycle-audit.v1');
    expect(manifest.sourceSha256).toBe(SOURCE_SHA256);
    expect(manifest.phases).toHaveLength(EXPORT_LAYOUT.auditPhases);
    expect(manifest.phases[0]).toBe(0);
    expect(manifest.phases.at(-1)).toBe(15 / 16);
    expect(manifest.panels).toEqual(['light', 'dark', 'skeleton']);
    expect(manifest.cell).toEqual({ width: 460, height: 260 });
    expect(manifest.settings).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.motion).toBe('run');
  });
});

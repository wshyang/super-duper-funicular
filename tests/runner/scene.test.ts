import { describe, expect, it } from 'vitest';
import { DEFAULT_GAIT, PART_ORDER, PALETTES, PERSONAS } from '../../src/shared/constants.ts';
import type { GaitSettings } from '../../src/shared/types.ts';
import { buildScene } from '../../src/runner/scene.ts';
import { renderSceneToRaster } from '../../src/runner/paint-raster.ts';

const settings: GaitSettings = DEFAULT_GAIT;

describe('render scene', () => {
  it('emits exactly the 17 documented parts in painter order', () => {
    const scene = buildScene(settings, 0.1);
    expect(scene.parts.map((part) => part.part)).toEqual([...PART_ORDER]);
  });

  it('covers every persona and palette without dropping parts', () => {
    for (const persona of PERSONAS) {
      for (const palette of PALETTES) {
        const scene = buildScene({ ...settings, persona: persona.id, palette: palette.id }, 0.4);
        expect(scene.parts).toHaveLength(17);
      }
    }
  });

  it('isolates a requested part without changing the others', () => {
    const full = buildScene(settings, 0.2);
    const isolated = buildScene(settings, 0.2, { visibleParts: ['nearShin'] });
    expect(isolated.parts).toHaveLength(1);
    expect(isolated.parts[0]?.part).toBe('nearShin');
    expect(full.parts.find((part) => part.part === 'nearShin')).toEqual(isolated.parts[0]);
  });

  it('keeps all primitives inside the canvas with finite coordinates', () => {
    for (let index = 0; index < 16; index += 1) {
      const scene = buildScene(settings, index / 16);
      for (const part of scene.parts) {
        for (const primitive of part.primitives) {
          const points = [
            ...(primitive.points ?? []),
            ...(primitive.center ? [primitive.center] : []),
            ...(primitive.a ? [primitive.a] : []),
            ...(primitive.b ? [primitive.b] : []),
          ];
          for (const point of points) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
            expect(point.x).toBeGreaterThan(-40);
            expect(point.x).toBeLessThan(scene.width + 40);
            expect(point.y).toBeGreaterThan(-40);
            expect(point.y).toBeLessThan(scene.height + 40);
          }
        }
      }
    }
  });

  it('produces a non-empty deterministic raster', () => {
    const scene = buildScene(settings, 0.3);
    const first = renderSceneToRaster(scene, { scale: 1 });
    const second = renderSceneToRaster(scene, { scale: 1 });
    expect(first.data).toEqual(second.data);
    let opaque = 0;
    for (let index = 3; index < first.data.length; index += 4) {
      if ((first.data[index] ?? 0) > 100) opaque += 1;
    }
    expect(opaque).toBeGreaterThan(4000);
    expect(opaque).toBeLessThan(40000);
  });

  it('changes pixels between two phases', () => {
    const a = renderSceneToRaster(buildScene(settings, 0), { scale: 1 });
    const b = renderSceneToRaster(buildScene(settings, 0.5), { scale: 1 });
    let differing = 0;
    for (let index = 0; index < a.data.length; index += 4) {
      if (Math.abs((a.data[index] ?? 0) - (b.data[index] ?? 0)) > 12) differing += 1;
    }
    expect(differing).toBeGreaterThan(500);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeJpeg } from '../../src/lib/pipeline/image-io.ts';
import { sha256Hex } from '../../src/lib/pipeline/hashing.ts';
import { extractSheet } from '../../src/lib/pipeline/extract.ts';
import { analyseSourceFlaws } from '../../src/lib/analysis/source-flaws.ts';

function report() {
  const bytes = new Uint8Array(readFileSync('src/images/source/runner-six-palette-eight-frame-flawed-sheet.jpeg'));
  const sha = sha256Hex(bytes);
  const result = extractSheet(decodeJpeg(bytes), sha);
  const rows = ['crimson', 'cobalt', 'leaf', 'sunshine', 'violet', 'tangerine'].map((palette) =>
    Array.from({ length: 8 }, (_, i) => result.frames.get(`${palette}-${String(i + 1).padStart(2, '0')}`)!),
  );
  return analyseSourceFlaws(rows, result.rawStats, sha);
}

describe('FLAW-01..05 forensics on the real sheet', () => {
  const flaws = report();

  it('FLAW-01: half-cycle duplication at the published magnitude', () => {
    const flaw = flaws.flaws.find((f) => f.id === 'FLAW-01')!;
    expect(flaw.detected).toBe(true);
    expect(flaws.meanHalfCycleIou).toBeGreaterThan(0.75);
    expect(flaws.meanHalfCycleIou).toBeLessThan(0.99);
    expect(flaws.meanAdjacentIou).toBeLessThan(flaws.meanHalfCycleIou - 0.2);
  });

  it('FLAW-02: the lead leg never swaps', () => {
    const flaw = flaws.flaws.find((f) => f.id === 'FLAW-02')!;
    expect(flaw.detected).toBe(true);
    expect(flaws.leadSwaps).toBe(0);
  });

  it('FLAW-03: feet never cross under the pelvis', () => {
    const flaw = flaws.flaws.find((f) => f.id === 'FLAW-03')!;
    expect(flaw.detected).toBe(true);
    expect(flaws.minFootSeparationPx).toBeGreaterThan(60);
  });

  it('FLAW-04: unregistered ground line and height jitter', () => {
    const flaw = flaws.flaws.find((f) => f.id === 'FLAW-04')!;
    expect(flaw.detected).toBe(true);
    expect(flaws.groundJitterPx).toBeGreaterThan(8);
  });

  it('FLAW-05: naive single-tone keying leaves spill, our key does not', () => {
    const flaw = flaws.flaws.find((f) => f.id === 'FLAW-05')!;
    expect(flaw.detected).toBe(true);
  });
});

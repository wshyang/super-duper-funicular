import { describe, expect, it } from 'vitest';
import { contractPassed, evaluatePartContract, type ContractContext } from './part-contract.ts';
import { createImage, setPixel, type RgbaImage } from './rgba-image.ts';

function blob(image: RgbaImage, x0: number, y0: number, x1: number, y1: number, color = { r: 180, g: 130, b: 110 }): void {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) setPixel(image, x, y, { ...color, a: 255 });
  }
}

function goodCutout(): RgbaImage {
  const image = createImage(160, 160);
  blob(image, 60, 40, 100, 120);
  return image;
}

function baseCtx(overrides: Partial<ContractContext> = {}): ContractContext {
  return { stage: 'cutout', partId: 'fixture', ...overrides };
}

function failingPc(image: RgbaImage, ctx: ContractContext): string[] {
  return evaluatePartContract(image, ctx).filter((c) => c.applicable && !c.passed).map((c) => c.pcId);
}

describe('Part Contract PC-01..PC-12 (negative fixtures per check)', () => {
  it('accepts a clean cutout with no optional probes', () => {
    expect(failingPc(goodCutout(), baseCtx())).toEqual([]);
  });

  it('PC-01 rejects a second subject on an unoccluded cutout and allows one occluder split', () => {
    const two = goodCutout();
    blob(two, 20, 20, 40, 60);
    expect(failingPc(two, baseCtx())).toContain('PC-01');
    expect(contractPassed(evaluatePartContract(two, baseCtx({ occluderCount: 1 })))).toBe(true);
  });

  it('PC-02 rejects magenta spill inside the subject', () => {
    const image = goodCutout();
    setPixel(image, 80, 80, { r: 253, g: 0, b: 252, a: 255 });
    expect(failingPc(image, baseCtx())).toContain('PC-02');
  });

  it('PC-03 rejects posterior-dominant orientation probes', () => {
    expect(failingPc(goodCutout(), baseCtx({ orientationProbe: { frontCount: 5, backCount: 50 } }))).toContain('PC-03');
  });

  it('PC-04 rejects cutouts touching the canvas border', () => {
    const image = createImage(160, 160);
    blob(image, 60, 0, 100, 120);
    expect(failingPc(image, baseCtx())).toContain('PC-04');
  });

  it('PC-05 rejects contralateral shaft width delta above 15%', () => {
    const narrow = createImage(160, 160);
    blob(narrow, 70, 40, 90, 120);
    const wide = createImage(160, 160);
    blob(wide, 40, 40, 120, 120);
    expect(failingPc(wide, baseCtx({ widthParityPartner: narrow }))).toContain('PC-05');
  });

  it('PC-06 rejects luminance outside the record band', () => {
    expect(failingPc(goodCutout(), baseCtx({ luminanceBand: [10, 20] }))).toContain('PC-06');
  });

  it('PC-08 rejects stripe leakage onto non-owner parts', () => {
    const presence = { torso: 0, pelvis: 0, nearThigh: 0 };
    expect(failingPc(goodCutout(), baseCtx({ stripeOwner: 'torso', stripePresence: presence }))).toContain('PC-08');
    expect(contractPassed(evaluatePartContract(goodCutout(), baseCtx({ stripeOwner: 'torso', stripePresence: { torso: 120, pelvis: 0, nearThigh: 0 } })))).toBe(true);
  });

  it('PC-09 rejects lowest-row drift from the record ground convention', () => {
    expect(failingPc(goodCutout(), baseCtx({ expectedLowestRow: 100 }))).toContain('PC-09');
  });

  it('PC-10 rejects anthropometric ratios outside the body-plan table', () => {
    expect(failingPc(goodCutout(), baseCtx({ planRatioCheck: { measured: 0.4, min: 0.72, max: 0.88 } }))).toContain('PC-10');
  });

  it('PC-11 rejects socket-scale holes unless designed occluder transparency covers them', () => {
    const ring = createImage(160, 160);
    blob(ring, 40, 40, 120, 120);
    blob(ring, 60, 60, 100, 100, { r: 0, g: 0, b: 0 });
    for (let y = 60; y <= 100; y += 1) for (let x = 60; x <= 100; x += 1) setPixel(ring, x, y, { r: 0, g: 0, b: 0, a: 0 });
    expect(failingPc(ring, baseCtx())).toContain('PC-11');
    const designed = createImage(160, 160);
    blob(designed, 60, 60, 100, 100, { r: 255, g: 0, b: 255 });
    expect(contractPassed(evaluatePartContract(ring, baseCtx({ occluderCanvas: designed })))).toBe(true);
  });
});

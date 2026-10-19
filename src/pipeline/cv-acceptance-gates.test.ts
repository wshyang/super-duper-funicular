import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildClassAcceptanceCriteria,
  buildDefaultPlateAcceptanceCriteria,
  buildPhaseFrameAcceptanceCriteria,
  computeDeltaE2000,
  computeNormalizedSilhouetteIoU,
  countForegroundSubjects,
  countLowerRegionComponents,
  keyOutMagentaPlate,
  measureBackdropContractDeviation,
  measureChromaBackgroundUniformity,
  measureMeanSkinLab,
  measureSagittalWidthRatio,
  runPlateAcceptanceGates,
  type LabColor,
} from './cv-acceptance-gates.js';
import { createRaster, writePixel } from './raster.js';
import { readImageFile } from './image-io.js';
import type { RasterImage } from '../shared/types.js';

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 };
const SKIN = { r: 214, g: 158, b: 120, a: 255 };

function fillBackdrop(plate: RasterImage): void {
  for (let y = 0; y < plate.height; y++) {
    for (let x = 0; x < plate.width; x++) {
      writePixel(plate, { x, y }, MAGENTA);
    }
  }
}

function paintVerticalFigure(
  plate: RasterImage,
  figureWidth: number,
): void {
  const left = Math.floor((plate.width - figureWidth) / 2);
  for (let y = 20; y < plate.height - 20; y++) {
    for (let x = left; x < left + figureWidth; x++) {
      writePixel(plate, { x, y }, SKIN);
    }
  }
}

function paintBlock(
  plate: RasterImage,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): void {
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      writePixel(plate, { x, y }, SKIN);
    }
  }
}

function createTallPlate(
  width: number,
  height: number,
  figureWidth: number,
): RasterImage {
  const plate = createRaster(width, height);
  fillBackdrop(plate);
  paintVerticalFigure(plate, figureWidth);
  return plate;
}

describe('CV acceptance gates', () => {
  it('accepts a tall single-subject plate on uniform magenta', () => {
    const plate = createTallPlate(300, 500, 60);
    expect(measureChromaBackgroundUniformity(plate)).toBeGreaterThan(
      0.985,
    );
    expect(measureBackdropContractDeviation(plate)).toBeLessThan(
      60,
    );
    const keyed = keyOutMagentaPlate(plate);
    expect(countForegroundSubjects(keyed, 1000)).toBe(1);
    expect(measureSagittalWidthRatio(keyed)).toBeLessThan(0.62);
    expect(countLowerRegionComponents(keyed, 2500)).toBe(1);
  });

  it('distinguishes a uniform non-canonical violet backdrop from a messy one', () => {
    const violetPlate = createRaster(300, 500);
    for (let y = 0; y < 500; y++) {
      for (let x = 0; x < 300; x++) {
        writePixel(violetPlate, { x, y }, { r: 209, g: 48, b: 169, a: 255 });
      }
    }
    paintVerticalFigure(violetPlate, 60);
    expect(measureChromaBackgroundUniformity(violetPlate)).toBeGreaterThan(
      0.985,
    );
    expect(measureBackdropContractDeviation(violetPlate)).toBeGreaterThan(
      60,
    );
  });

  it('rejects a two-subject plate', () => {
    const plate = createTallPlate(300, 500, 40);
    paintBlock(plate, 200, 240, 20, 480);
    const keyed = keyOutMagentaPlate(plate);
    expect(countForegroundSubjects(keyed, 1000)).toBe(2);
  });

  it('rejects a wide frontal composition via the sagittal proxy', () => {
    const plate = createRaster(400, 300);
    fillBackdrop(plate);
    paintBlock(plate, 60, 340, 60, 240);
    const keyed = keyOutMagentaPlate(plate);
    expect(measureSagittalWidthRatio(keyed)).toBeGreaterThan(0.62);
  });

  it('rejects a ghost second shoe in the lower region', () => {
    const plate = createTallPlate(300, 500, 60);
    paintBlock(plate, 210, 260, 400, 460);
    const keyed = keyOutMagentaPlate(plate);
    expect(countLowerRegionComponents(keyed, 2500)).toBe(2);
  });

  it('computes zero ΔE2000 for identical Lab colors and large ΔE for distinct tones', () => {
    const warm: LabColor = { l: 70, a: 18, b: 22 };
    expect(computeDeltaE2000(warm, warm)).toBeLessThan(1e-9);
    const cool: LabColor = { l: 45, a: -5, b: -15 };
    expect(computeDeltaE2000(warm, cool)).toBeGreaterThan(30);
  });

  it('registers translated silhouences to a high IoU and distinct silhouences to a low one', () => {
    const plateA = createTallPlate(300, 500, 60);
    const plateB = createRaster(300, 500);
    fillBackdrop(plateB);
    paintBlock(plateB, 130, 190, 40, 480);
    const keyedA = keyOutMagentaPlate(plateA);
    const keyedB = keyOutMagentaPlate(plateB);
    expect(computeNormalizedSilhouetteIoU(keyedA, keyedB)).toBeGreaterThan(
      0.9,
    );
    const plateC = createRaster(300, 500);
    fillBackdrop(plateC);
    paintBlock(plateC, 100, 200, 20, 200);
    expect(
      computeNormalizedSilhouetteIoU(
        keyedA,
        keyOutMagentaPlate(plateC),
      ),
    ).toBeLessThan(0.6);
  });

  it('runs the full gate battery and reports per-gate verdicts', () => {
    const master = readImageFile(
      path.join(
        process.cwd(),
        'src/images/photoreal-female/01-master-lateral-profile-reference.png',
      ),
    );
    const criteria = buildDefaultPlateAcceptanceCriteria(master);
    const plate = createRaster(400, 300);
    fillBackdrop(plate);
    paintBlock(plate, 60, 340, 60, 240);
    const report = runPlateAcceptanceGates(
      'synthetic-wide-frontal-figure',
      plate,
      criteria,
    );
    expect(report.gates.length).toBeGreaterThan(0);
    expect(report.failedGateIds).toEqual(
      expect.arrayContaining([
        'sagittal-profile-composition',
        'silhouette-identity-lock',
      ]),
    );
    expect(report.overallPass).toBe(false);
  });

  it('skips the silhouette-lock gate for dynamic phase-frame criteria', () => {
    const master = readImageFile(
      path.join(
        process.cwd(),
        'src/images/photoreal-female/01-master-lateral-profile-reference.png',
      ),
    );
    const criteria = buildPhaseFrameAcceptanceCriteria(master);
    const plate = createTallPlate(300, 500, 60);
    const report = runPlateAcceptanceGates(
      'synthetic-phase-frame',
      plate,
      criteria,
    );
    const lockGate = report.gates.find(
      (gate) => gate.gateId === 'silhouette-identity-lock',
    );
    expect(lockGate?.pass).toBe(true);
    expect(lockGate?.score).toBe(-1);
  });

  it('applies class-specific presets: wide head passes head class, arms skip the sagittal proxy', () => {
    const master = readImageFile(
      path.join(
        process.cwd(),
        'src/images/photoreal-female/01-master-lateral-profile-reference.png',
      ),
    );
    const headCriteria = buildClassAcceptanceCriteria(
      'head',
      master,
    );
    const armCriteria = buildClassAcceptanceCriteria(
      'arm',
      master,
    );
    const wideHead = createRaster(300, 300);
    fillBackdrop(wideHead);
    paintBlock(wideHead, 60, 240, 100, 200);
    const headReport = runPlateAcceptanceGates(
      'synthetic-wide-head',
      wideHead,
      headCriteria,
    );
    const headSagittal = headReport.gates.find(
      (gate) => gate.gateId === 'sagittal-profile-composition',
    );
    expect(headSagittal?.pass).toBe(true);
    const armSagittal = armCriteria.maxSagittalWidthRatio;
    expect(armSagittal).toBeNull();
    const armReport = runPlateAcceptanceGates(
      'synthetic-l-bend-arm',
      wideHead,
      armCriteria,
    );
    const armSagittalGate = armReport.gates.find(
      (gate) => gate.gateId === 'sagittal-profile-composition',
    );
    expect(armSagittalGate?.pass).toBe(true);
    expect(armSagittalGate?.score).toBe(-1);
  });

  it('measures a skin-like mean Lab on a synthetic skin plate', () => {
    const plate = createRaster(100, 100);
    fillBackdrop(plate);
    paintBlock(plate, 10, 90, 10, 90);
    const keyed = keyOutMagentaPlate(plate);
    const skinLab = measureMeanSkinLab(keyed);
    expect(skinLab.l).toBeGreaterThan(50);
    expect(skinLab.a).toBeGreaterThan(0);
  });
});

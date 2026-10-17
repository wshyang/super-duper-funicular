import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectSpriteSheetGrid } from './grid-detection.js';
import {
  computeAlphaSilhouetteIoU,
  computeDHash64,
  computeDHashHammingDistance,
  sha256Raster,
} from './hashing.js';
import { readImageFile } from './image-io.js';
import {
  isMagentaBackdropPixel,
  isPureMagentaDivider,
  keyOutMagentaCell,
} from './magenta-key.js';
import { createRaster, fillRaster, readPixel, writePixel } from './raster.js';
import {
  applyPivotArcRoundedCut,
  cutArticulatedLimbWithRoundedEnds,
  cutHorizontalLimbWithRoundedEnds,
} from './rounded-joint-cutter.js';
import { vectorizeRasterCutoutToSvg } from './svg-vectorizer.js';
import type { ExtractedSheetManifest, SpriteFlawAnalysisReport } from '../shared/types.js';

describe('Magenta chroma-key and raster primitives', () => {
  it('identifies pure #FF00FF dividers and pink cell backdrops while preserving purple jersey pixels', () => {
    expect(isPureMagentaDivider({ r: 253, g: 0, b: 252, a: 255 })).toBe(true);
    expect(isPureMagentaDivider({ r: 253, g: 74, b: 253, a: 255 })).toBe(false);
    expect(isMagentaBackdropPixel({ r: 253, g: 74, b: 253, a: 255 })).toBe(true);
    expect(isMagentaBackdropPixel({ r: 129, g: 51, b: 157, a: 255 })).toBe(false);
  });

  it('keys out border and interior magenta islands while keeping an outlined purple sprite intact', () => {
    const cell = createRaster(24, 24);
    fillRaster(cell, { r: 253, g: 74, b: 253, a: 255 });
    for (let y = 6; y <= 17; y++) {
      for (let x = 6; x <= 17; x++) {
        const isBorder = x === 6 || x === 17 || y === 6 || y === 17;
        const color = isBorder
          ? { r: 15, g: 5, b: 18, a: 255 }
          : { r: 129, g: 51, b: 157, a: 255 };
        writePixel(cell, { x, y }, color);
      }
    }
    const keyed = keyOutMagentaCell(cell);
    expect(readPixel(keyed, 1, 1).a).toBe(0);
    expect(readPixel(keyed, 12, 12)).toEqual({ r: 129, g: 51, b: 157, a: 255 });
  });
});

describe('Real reference sprite sheet grid detection and extraction verification', () => {
  const repoRoot = process.cwd();
  const sheetPath = path.join(
    repoRoot,
    'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
  );

  it('detects the 132px header and 6 rows x 8 columns grid on the real reference sheet', () => {
    const sheet = readImageFile(sheetPath);
    expect(sheet.width).toBe(2528);
    expect(sheet.height).toBe(1696);
    const grid = detectSpriteSheetGrid(sheet);
    expect(grid.headerHeight).toBe(132);
    expect(grid.rowSpans.length).toBe(6);
    expect(grid.colSpans.length).toBe(8);
  });

  it('verifies all 48 extracted PNG sprites and manifest in public/sprites/extracted', () => {
    const manifestPath = path.join(repoRoot, 'public/sprites/extracted/manifest.json');
    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, 'utf8'),
    ) as ExtractedSheetManifest;
    expect(manifest.totalExtractedFrames).toBe(48);
    expect(manifest.uniquePosesPerRow).toBe(4);
    expect(manifest.totalUniquePoses).toBe(24);
    for (const frame of manifest.frames) {
      const absFile = path.join(repoRoot, frame.filePath);
      expect(fs.existsSync(absFile)).toBe(true);
      if (frame.frameIndex <= 4) {
        expect(frame.isDuplicateInRow).toBe(false);
      } else {
        expect(frame.isDuplicateInRow).toBe(true);
        expect(frame.duplicateOfFrame).toBe(frame.frameIndex - 4);
      }
    }
  });

  it('verifies the quantitative flaw analysis report on the extracted sprites', () => {
    const reportPath = path.join(repoRoot, 'public/sprites/extracted/analysis.json');
    const report = JSON.parse(
      fs.readFileSync(reportPath, 'utf8'),
    ) as SpriteFlawAnalysisReport;
    expect(report.actualUniquePoseCountPerRow).toBe(4);
    expect(report.meanHalfCycleIoU).toBeGreaterThan(0.9);
    expect(report.minFootSeparationPx).toBeGreaterThan(100);
    expect(report.flaws.length).toBe(5);
  });

  it('computes deterministic pixel SHA-256, dHash64, and silhouette IoU', () => {
    const frame1 = readImageFile(
      path.join(repoRoot, 'public/sprites/extracted/red/frame-01.png'),
    );
    const frame5 = readImageFile(
      path.join(repoRoot, 'public/sprites/extracted/red/frame-05.png'),
    );
    const frame3 = readImageFile(
      path.join(repoRoot, 'public/sprites/extracted/red/frame-03.png'),
    );
    expect(sha256Raster(frame1)).toHaveLength(64);
    const h1 = computeDHash64(frame1);
    const h5 = computeDHash64(frame5);
    expect(computeDHashHammingDistance(h1, h5)).toBeLessThanOrEqual(4);
    expect(computeAlphaSilhouetteIoU(frame1, frame5)).toBeGreaterThan(0.94);
    expect(computeAlphaSilhouetteIoU(frame1, frame3)).toBeLessThan(0.6);
  });

  it('verifies generated algorithmic sprite sheets and 17-part cutouts for both personas', () => {
    const maleSheet = path.join(
      repoRoot,
      'src/images/spritesheets/runner-8frame-6color-algorithmic-sheet.png',
    );
    const femaleSheet = path.join(
      repoRoot,
      'src/images/spritesheets/runner-8frame-6color-female-algorithmic-sheet.png',
    );
    const photorealFemaleSheet = path.join(
      repoRoot,
      'src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png',
    );
    expect(fs.existsSync(maleSheet)).toBe(true);
    expect(fs.existsSync(femaleSheet)).toBe(true);
    expect(fs.existsSync(photorealFemaleSheet)).toBe(true);

    const photoNearFoot = path.join(
      repoRoot,
      'public/sprites/photoreal/sg-chinese-female/parts/nearFoot.png',
    );
    const photoFarFoot = path.join(
      repoRoot,
      'public/sprites/photoreal/sg-chinese-female/parts/farFoot.png',
    );
    expect(fs.existsSync(photoNearFoot)).toBe(true);
    expect(fs.existsSync(photoFarFoot)).toBe(true);

    const maleNeck = path.join(
      repoRoot,
      'public/sprites/algorithmic/parts/sg-chinese-male/neck.png',
    );
    const femaleNeck = path.join(
      repoRoot,
      'public/sprites/algorithmic/parts/sg-chinese-female/neck.png',
    );
    const femaleHair = path.join(
      repoRoot,
      'public/sprites/algorithmic/parts/sg-chinese-female/hairAccessory.png',
    );
    expect(fs.existsSync(maleNeck)).toBe(true);
    expect(fs.existsSync(femaleNeck)).toBe(true);
    expect(fs.existsSync(femaleHair)).toBe(true);
  });

  it('cuts semicircular rounded ends centered on proximal and distal rotation pivots', () => {
    const src = createRaster(200, 300);
    fillRaster(src, { r: 215, g: 162, b: 124, a: 255 });
    const cut = cutArticulatedLimbWithRoundedEnds(src, {
      srcTopY: 60,
      srcBotY: 240,
      dstRadiusTopPx: 24,
      dstRadiusBotPx: 18,
      roundTopEnd: true,
      roundBotEnd: true,
      shadeScale: 1.0,
    });
    expect(readPixel(cut, 80, 36).a).toBe(255);
    expect(readPixel(cut, 80, 124).a).toBe(255);
    expect(readPixel(cut, 80, 36 - 20).a).toBeGreaterThan(200);
    expect(readPixel(cut, 80 - 22, 36 - 22).a).toBe(0);
    expect(readPixel(cut, 80 + 16, 124 + 16).a).toBe(0);

    const arcCut = applyPivotArcRoundedCut(cut, {
      pivot: { x: 80, y: 120 },
      radiusX: 16,
      radiusY: 12,
      cutSide: 'below',
      featherPx: 2.0,
    });
    expect(readPixel(arcCut, 80, 138).a).toBe(0);

    const horizCut = cutHorizontalLimbWithRoundedEnds(src, {
      srcLeftX: 40,
      srcRightX: 160,
      srcMinY: 120,
      dstRadiusTopPx: 18,
      dstRadiusBotPx: 15,
      shadeScale: 0.9,
    });
    expect(readPixel(horizCut, 80, 36).a).toBe(255);
    expect(readPixel(horizCut, 80, 124).a).toBe(255);
    expect(readPixel(horizCut, 80 - 16, 36 - 16).a).toBe(0);

    const vecSvg = vectorizeRasterCutoutToSvg(horizCut, {
      partId: 'farForearm',
      proximalPivot: { x: 80, y: 36 },
      distalPivot: { x: 80, y: 124 },
      quantStep: 24,
      gridStepPx: 4,
    });
    expect(vecSvg.fullSvgDocument).toContain('clipPath id="rounded-mask-farForearm"');
    expect(vecSvg.silhouettePathD.startsWith('M ')).toBe(true);
    expect(vecSvg.regionPaths.length).toBeGreaterThan(0);
  });
});

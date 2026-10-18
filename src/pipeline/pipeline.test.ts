import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { dumpFullGaitCycleToTempDir } from './cycle-frame-dumper.js';
import { detectSpriteSheetGrid } from './grid-detection.js';
import {
  countBrightSingletPixels,
  measureNearFarLimbWidthParity,
} from './photoreal-matte-and-qc.js';
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
import { extractArmSegmentsFromMasterSideProfile } from './side-profile-arm-extractor.js';
import {
  raiseAthleticBustLandmark,
  sealAthleticTorsoShoulderBulge,
} from './athletic-reference-extractor.js';
import { vectorizeRasterCutoutToSvg } from './svg-vectorizer.js';
import type { ExtractedSheetManifest, SpriteFlawAnalysisReport } from '../shared/types.js';

describe('Magenta chroma-key and raster primitives', () => {
  it('removes the collarbone shoulder bulb but keeps a solid singlet stump', () => {
    const torso = createRaster(160, 160);
    for (let y = 20; y <= 56; y++) {
      for (let x = 40; x <= 64; x++) writePixel(torso, { x, y }, { r: 150, g: 25, b: 40, a: 255 });
      for (let x = 65; x <= 115; x++) writePixel(torso, { x, y }, { r: 205, g: 145, b: 112, a: 255 });
    }
    const corrected = sealAthleticTorsoShoulderBulge(torso);
    const filledShoulder = readPixel(corrected, 91, 36);
    expect(filledShoulder.a).toBe(255);
    expect(filledShoulder.r).toBeGreaterThan(filledShoulder.g * 1.35);
    expect(readPixel(corrected, 101, 36).a).toBe(0);
    expect(readPixel(corrected, 70, 36)).toEqual({ r: 150, g: 25, b: 40, a: 255 });
  });

  it('raises the athletic torso bust landmark while preserving the waist anchor', () => {
    const torso = createRaster(160, 160);
    for (let x = 50; x <= 110; x++) {
      writePixel(torso, { x, y: 67 }, { r: 220, g: 40, b: 50, a: 255 });
      writePixel(torso, { x, y: 122 }, { r: 30, g: 40, b: 220, a: 255 });
    }
    const corrected = raiseAthleticBustLandmark(torso);
    expect(readPixel(corrected, 80, 57)).toEqual({ r: 220, g: 40, b: 50, a: 255 });
    expect(readPixel(corrected, 56, 57).a).toBeLessThan(128);
    expect(readPixel(corrected, 57, 57).a).toBeGreaterThan(128);
    expect(readPixel(corrected, 50, 122)).toEqual({ r: 30, g: 40, b: 220, a: 255 });
  });
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

  it('keeps the athletic neck isolated, the armhole filled, and the left-thumb/fingers intact', () => {
    const partsDir = path.join(repoRoot, 'public/sprites/photoreal/sg-chinese-female/parts');
    const neck = readImageFile(path.join(partsDir, 'neck.png'));
    const torso = readImageFile(path.join(partsDir, 'torso.png'));
    const farHand = readImageFile(path.join(partsDir, 'farHand.png'));

    // The revised neck crop is skin-only: a red/white singlet fragment or
    // dark ponytail pixels here would signal a crop spill from the full portrait.
    let clothingOrHairPixels = 0;
    for (let y = 0; y < neck.height; y++) {
      for (let x = 0; x < neck.width; x++) {
        const p = readPixel(neck, x, y);
        if (p.a < 128) continue;
        if ((p.r > 135 && p.g < 52 && p.b < 65) || (p.r < 45 && p.g < 45 && p.b < 45)) {
          clothingOrHairPixels++;
        }
      }
    }
    expect(clothingOrHairPixels).toBe(0);
    expect(readPixel(neck, 80, 100).a).toBeGreaterThan(200);

    // A solid jersey pixel inside the shoulder closure guards against reopening
    // the armhole and exposing the inner lining.
    expect(readPixel(torso, 90, 60).a).toBeGreaterThan(128);

    // In the left-palm plate the thumb is the lateral projection, while the
    // four fingers continue down the hand. Both must survive extraction.
    const thumbSidePixels = Array.from({ length: 73 }, (_, i) => i + 55)
      .filter((x) => readPixel(farHand, x, 75).a > 128);
    expect(Math.max(...thumbSidePixels)).toBeGreaterThanOrEqual(98);
    expect(readPixel(farHand, 82, 122).a).toBeGreaterThan(128);
  });

  it('generates cropped alpha-keyed standing reference profiles for all three photoreal personas', () => {
    const folders = ['sg-chinese-female-petite', 'sg-chinese-female', 'sg-chinese-female-average'];
    for (const folder of folders) {
      const profile = readImageFile(path.join(repoRoot, 'public/sprites/photoreal', folder, 'reference-profile.png'));
      expect(profile.height).toBeGreaterThan(650);
      expect(profile.width).toBeLessThan(300);
      expect(profile.width).toBeLessThan(profile.height);
      const corner = readPixel(profile, 0, 0);
      expect(corner.a).toBeLessThan(32);
    }
  });

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
    const photorealAverageFemaleSheet = path.join(
      repoRoot,
      'src/images/spritesheets/runner-8frame-6color-photoreal-female-average-sheet.png',
    );
    expect(fs.existsSync(maleSheet)).toBe(true);
    expect(fs.existsSync(femaleSheet)).toBe(true);
    expect(fs.existsSync(photorealFemaleSheet)).toBe(true);
    expect(fs.existsSync(photorealAverageFemaleSheet)).toBe(true);

    const photoNearFoot = path.join(
      repoRoot,
      'public/sprites/photoreal/sg-chinese-female/parts/nearFoot.png',
    );
    const photoAvgHair = path.join(
      repoRoot,
      'public/sprites/photoreal/sg-chinese-female-average/parts/hairAccessory.png',
    );
    const photoFarFoot = path.join(
      repoRoot,
      'public/sprites/photoreal/sg-chinese-female/parts/farFoot.png',
    );
    expect(fs.existsSync(photoNearFoot)).toBe(true);
    expect(fs.existsSync(photoAvgHair)).toBe(true);
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

    const shortsSrc = createRaster(200, 300);
    fillRaster(shortsSrc, { r: 28, g: 32, b: 38, a: 255 });
    const thighWithShorts = cutArticulatedLimbWithRoundedEnds(src, {
      srcTopY: 60,
      srcBotY: 240,
      dstRadiusTopPx: 26,
      dstRadiusBotPx: 20,
      roundTopEnd: true,
      roundBotEnd: true,
      shadeScale: 1.0,
      endCapComposite: {
        compositeSource: shortsSrc,
        end: 'top',
        srcTopY: 140,
        srcBotY: 260,
        dstStraightCutY: 66,
        sideStripeMode: 'with-stripe',
        shadeScale: 1.0,
      },
    });
    expect(readPixel(thighWithShorts, 80, 40).r).toBeLessThan(50);
    expect(readPixel(thighWithShorts, 80, 90).r).toBeGreaterThan(180);
  });

  it('dumps a full gait cycle with 3-panel diagnostic plates and zero detached islands to a temp directory', () => {
    const tmpAuditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cycle-audit-test-'));
    const report = dumpFullGaitCycleToTempDir({
      outDir: tmpAuditDir,
      frameCount: 8,
      personaId: 'photo-sg-chinese-female',
      variant: 'red',
    });
    expect(report.frameCount).toBe(8);
    expect(report.totalDisconnectedIslands).toBe(0);
    expect(report.totalMagentaSpillPixels).toBe(0);
    expect(report.resolvedAssetTuning?.personaId).toBe('photo-sg-chinese-female');
    expect(report.effectiveRigLengths.torsoLength).toBeGreaterThan(0);
    expect(report.standingProfileAuditPath).not.toBeNull();
    expect(fs.existsSync(report.contactSheetPath)).toBe(true);
    expect(fs.existsSync(report.jointCropsSheetPath)).toBe(true);
    expect(fs.existsSync(report.standingProfileAuditPath!)).toBe(true);
    fs.rmSync(tmpAuditDir, { recursive: true, force: true });
  });

  it('records per-persona tuning overrides in the audit report', () => {
    const tmpAuditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cycle-tuning-audit-test-'));
    const report = dumpFullGaitCycleToTempDir({
      outDir: tmpAuditDir,
      frameCount: 4,
      personaId: 'photo-sg-chinese-female-petite',
      variant: 'red',
      assetTuning: { torsoLengthScale: 1.12 },
    });
    expect(report.resolvedAssetTuning?.torsoLengthScale).toBe(1.12);
    expect(report.standingProfileAuditPath).toBe(path.join(tmpAuditDir, 'standing-profile-audit.png'));
    fs.rmSync(tmpAuditDir, { recursive: true, force: true });
  });

  it('enforces 0 bright singlet fabric pixels on skin-matted parts and < 15% near/far limb width delta', () => {
    const partsDir = path.join(
      process.cwd(),
      'public/sprites/photoreal/sg-chinese-female/parts',
    );
    const skinPartNames = [
      'nearUpperArm',
      'nearForearm',
      'farUpperArm',
      'farForearm',
      'neck',
    ] as const;
    for (const partId of skinPartNames) {
      const partImg = readImageFile(path.join(partsDir, `${partId}.png`));
      expect(countBrightSingletPixels(partImg)).toBe(0);
    }
    const bank = Object.fromEntries(
      [
        'head',
        'hairAccessory',
        'neck',
        'torso',
        'pelvis',
        'nearUpperArm',
        'nearForearm',
        'nearHand',
        'farUpperArm',
        'farForearm',
        'farHand',
        'nearThigh',
        'nearShin',
        'nearFoot',
        'farThigh',
        'farShin',
        'farFoot',
      ].map((id) => [id, readImageFile(path.join(partsDir, `${id}.png`))]),
    ) as Parameters<typeof measureNearFarLimbWidthParity>[0];
    const parity = measureNearFarLimbWidthParity(bank);
    for (const entry of parity) {
      expect(entry.relativeDeltaPct).toBeLessThan(15);
    }
  });

  it('extracts arm segments and checks build-tier coverage plus the rebuilt Athletic torso', () => {
    const masterRaw = readImageFile(
      path.join(
        process.cwd(),
        'src/images/photoreal-female-average/01-master-lateral-profile-reference.png',
      ),
    );
    const keyedMaster = keyOutMagentaCell(masterRaw);
    const extracted = extractArmSegmentsFromMasterSideProfile(keyedMaster);
    expect(extracted.shoulderTopY).toBeLessThan(extracted.elbowY);
    expect(extracted.elbowY).toBeLessThan(extracted.wristY);
    expect(extracted.wristY).toBeLessThan(extracted.handBotY);
    expect(readPixel(extracted.nearUpperArm, 80, 80).a).toBeGreaterThan(200);
    expect(readPixel(extracted.nearForearm, 80, 80).a).toBeGreaterThan(200);

    const petDir = path.join(
      process.cwd(),
      'public/sprites/photoreal/sg-chinese-female-petite/parts',
    );
    const athDir = path.join(process.cwd(), 'public/sprites/photoreal/sg-chinese-female/parts');
    const avgDir = path.join(
      process.cwd(),
      'public/sprites/photoreal/sg-chinese-female-average/parts',
    );
    for (const partId of ['neck', 'pelvis', 'nearUpperArm', 'nearThigh'] as const) {
      const petImg = readImageFile(path.join(petDir, `${partId}.png`));
      const athImg = readImageFile(path.join(athDir, `${partId}.png`));
      const avgImg = readImageFile(path.join(avgDir, `${partId}.png`));
      expect(countOpaquePixels(petImg), `${partId} petite source is present`).toBeGreaterThan(0);
      expect(countOpaquePixels(avgImg), `${partId} average > athletic`).toBeGreaterThan(
        countOpaquePixels(athImg),
      );
    }
    const athleticTorso = readImageFile(path.join(athDir, 'torso.png'));
    const averageTorso = readImageFile(path.join(avgDir, 'torso.png'));
    const athleticTorsoPixels = countOpaquePixels(athleticTorso);
    expect(athleticTorsoPixels).toBeGreaterThan(3000);
    expect(athleticTorsoPixels).toBeLessThan(countOpaquePixels(averageTorso));
  });
});

function countOpaquePixels(img: { width: number; height: number; data: Uint8ClampedArray }): number {
  let count = 0;
  for (let i = 3; i < img.data.length; i += 4) {
    if ((img.data[i] ?? 0) >= 128) count++;
  }
  return count;
}

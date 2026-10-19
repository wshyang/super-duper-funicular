import { describe, expect, it } from 'vitest';
import { createRaster, writePixel } from './raster.js';
import { estimateBackdropModel, backdropMembership, keyPhotoPlate, backdropRow } from './photo-matte.js';
import { buildSilhouetteMask, registerSilhouette, buildTargetGeometry, measurePoseExtent } from './pose-silhouette.js';
import { bucketOfAngle, sideOfPart } from './pose-part-fitting.js';
import { computeGradientField, searchLimbTube } from './pose-limb-probe.js';
import { rectifyTube, isotropicLateralExtent, angleBucket } from './pose-material-harvest.js';
import { verifyRoundTrip } from './pose-material-verify.js';
import { describeSilhouette, descriptorIou } from './pose-diversity.js';
import { solveArticulatedPose } from '../runner/gait.js';
import { solveStandingUprightPose } from '../runner/standing-pose.js';
import {
  applyAssetTuningToRigSpec,
  DEFAULT_RIG_SPEC,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
} from '../runner/body-proportions.js';
import { readImageFile } from './image-io.js';

const TUNING = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
const RIG = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, TUNING);

/**
 * Opaque limb on a transparent plate. Background must be *transparent*, not
 * merely light: the silhouette mask is alpha-based, and an opaque pale
 * background would make the whole canvas "subject".
 */
function limbPlate() {
  const plate = paintedPlate(260, 300, (x, y) => {
    const inLimb = x > 110 && x < 150 && y > 40;
    return inLimb ? [200, 150, 120] : [239, 242, 247];
  });
  for (let y = 0; y < plate.height; y++) {
    for (let x = 0; x < plate.width; x++) {
      const inLimb = x > 110 && x < 150 && y > 40;
      if (!inLimb) writePixel(plate, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
    }
  }
  return plate;
}

function paintedPlate(width: number, height: number, paint: (x: number, y: number) => [number, number, number]) {
  const raster = createRaster(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      writePixel(raster, { x, y }, { r, g, b, a: 255 });
    }
  }
  return raster;
}

describe('photo matte', () => {
  it('keys the studio magenta backdrop but keeps skin and garment', () => {
    const plate = paintedPlate(200, 200, (x) =>
      x > 80 && x < 120 ? [214, 158, 122] : [221, 72, 164],
    );
    const keyed = keyPhotoPlate(plate);
    expect(keyed.stats.foregroundPixels).toBeGreaterThan(39 * 190);
    expect(keyed.stats.interiorLeakRatio).toBe(0);
    const mask = buildSilhouetteMask(keyed.image);
    expect(mask.minX).toBeGreaterThanOrEqual(79);
    expect(mask.maxX).toBeLessThanOrEqual(121);
  });

  it('keys darkened backdrop (cast shadow) instead of treating it as subject', () => {
    const plate = paintedPlate(160, 160, (_x, y) => {
      const shadow = y > 120;
      return shadow ? [126, 41, 94] : [221, 72, 164];
    });
    const model = estimateBackdropModel(plate);
    const shadowRow = backdropRow(model, 150);
    const membership = backdropMembership({ r: 126, g: 41, b: 94, a: 255 }, shadowRow);
    expect(membership).toBe(1);
  });

  it('reports row-wise backdrop noise so tolerances can be evidence-based', () => {
    const plate = paintedPlate(120, 120, (_x, y) => [218 + (y % 6), 70, 162]);
    const model = estimateBackdropModel(plate);
    expect(model.noise).toBeLessThanOrEqual(3);
  });
});

describe('registration and pose targets', () => {
  it('measures a standing figure extent close to the rig standing height', () => {
    const pose = solveStandingUprightPose(RIG);
    const extent = measurePoseExtent(pose, RIG, TUNING);
    expect(extent.height).toBeGreaterThan(180);
    expect(extent.height).toBeLessThan(210);
  });

  it('registers a real plate onto the master pose within a few percent', () => {
    const master = readImageFile('src/images/photoreal-female/01-master-lateral-profile-reference.png');
    const keyed = keyPhotoPlate(master);
    const mask = buildSilhouetteMask(keyed.image);
    const target = buildTargetGeometry(solveArticulatedPose(0, undefined, RIG), RIG, TUNING);
    const registration = registerSilhouette(mask, target);
    expect(registration.scale).toBeGreaterThan(2);
    expect(registration.figureHeightPx).toBeGreaterThan(650);
  });
});

describe('limb probe', () => {
  it('finds a vertical limb inside a uniform plate and reports a vertical angle', () => {
    const plate = limbPlate();
    const mask = buildSilhouetteMask(plate);
    const field = computeGradientField(plate);
    const result = searchLimbTube(mask, field, { x: 130, y: 60 }, { x: 130, y: 250 }, 22);
    expect(Math.abs(result.angleRad - Math.PI / 2)).toBeLessThan(0.18);
    expect(result.fill).toBeGreaterThan(0.7);
  });

  it('prefers the limb tube over an identical tube shifted into empty space', () => {
    const plate = limbPlate();
    const mask = buildSilhouetteMask(plate);
    const field = computeGradientField(plate);
    const onLimb = searchLimbTube(mask, field, { x: 130, y: 60 }, { x: 130, y: 250 }, 22);
    const offLimb = searchLimbTube(mask, field, { x: 210, y: 60 }, { x: 210, y: 250 }, 22);
    expect(onLimb.score).toBeGreaterThan(offLimb.score);
  });
});

describe('material rectification', () => {
  it('round-trips an asymmetric limb without mirroring', () => {
    const plate = createRaster(400, 400);
    for (let y = 50; y < 350; y++) {
      for (let x = 150; x < 250; x++) {
        const left = x < 200;
        writePixel(plate, { x, y }, left
          ? { r: 220, g: 60, b: 60, a: 255 }
          : { r: 240, g: 240, b: 240, a: 255 });
      }
    }
    for (let y = 150; y < 210; y++) {
      for (let x = 210; x < 250; x++) writePixel(plate, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
    }
    const start = { x: 200, y: 50 };
    const end = { x: 200, y: 350 };
    const cutout = rectifyTube(plate, {
      sourceStart: start,
      sourceEnd: end,
      lateralHalfExtentPx: isotropicLateralExtent(300),
      capRadiusPx: 8,
      capRadiusTopPx: 4,
      proximalTrimFraction: 0,
    });
    const result = verifyRoundTrip({
      cutout,
      source: plate,
      tubeStart: start,
      tubeEnd: end,
      halfWidthPx: isotropicLateralExtent(300),
    });
    expect(result.alphaIou).toBeGreaterThan(0.85);
    expect(result.passed).toBe(true);
  });

  it('keeps the cutout isotropic for a long bone', () => {
    const extent = isotropicLateralExtent(88);
    expect(extent).toBeCloseTo(80, 5);
    expect(isotropicLateralExtent(176)).toBeCloseTo(160, 5);
  });

  it('buckets angles on a 15 degree lattice, normalised to (-180, 180]', () => {
    expect(angleBucket(97)).toBe(90);
    expect(angleBucket(-97)).toBe(-90);
    expect(angleBucket(183)).toBe(-180);
    expect(bucketOfAngle(Math.PI / 2)).toBe(90);
  });

  it('assigns anatomical side from the part id', () => {
    expect(sideOfPart('nearThigh')).toBe('near');
    expect(sideOfPart('farForearm')).toBe('far');
    expect(sideOfPart('torso')).toBe('midline');
  });
});

describe('pose diversity descriptor', () => {
  it('scores identical silhouettes at 1 and a vertical/horizontal pair lower', () => {
    const vertical = paintedPlate(120, 160, (x) => (x > 50 && x < 70 ? [10, 10, 10] : [0, 0, 0]));
    const horizontal = paintedPlate(120, 160, (_x, y) => (y > 40 && y < 60 ? [245, 245, 245] : [0, 0, 0]));
    for (const image of [vertical, horizontal]) {
      for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i] === 0 && image.data[i + 1] === 0) image.data[i + 3] = 0;
      }
    }
    const a = buildSilhouetteMask(vertical);
    const b = buildSilhouetteMask(horizontal);
    const da = describeSilhouette('a', a);
    const db = describeSilhouette('b', b);
    expect(descriptorIou(da, da)).toBeCloseTo(1, 5);
    expect(descriptorIou(da, db)).toBeLessThan(0.95);
  });
});

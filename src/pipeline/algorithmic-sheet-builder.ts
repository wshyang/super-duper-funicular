import fs from 'node:fs';
import path from 'node:path';
import type {
  AlgorithmicManifest,
  BodyPartId,
  PhotorealPersonaId,
  RasterImage,
  RunnerPersonaId,
  RunnerVariantId,
} from '../shared/types.js';
import {
  applyAssetTuningToRigSpec,
  ARTICULATED_BODY_PARTS,
  DEFAULT_GAIT_CONFIG,
  DEFAULT_RIG_SPEC,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
} from '../runner/body-proportions.js';
import { solveArticulatedPose } from '../runner/gait.js';
import { RUNNER_PALETTES } from '../runner/palette.js';
import { getPhotorealPartBankForPersona } from '../runner/photoreal-rig.js';
import {
  renderIsolatedBodyPartToRaster,
  renderRunnerPoseToRaster,
} from '../runner/rasterizer.js';
import { stitchArticulatedSvgRig } from '../runner/svg-rig-stitcher.js';
import { writePngFile } from './image-io.js';
import { extractAndLoadPhotorealFemaleParts } from './photoreal-extractor.js';
import { blitRaster, createRaster, fillRaster } from './raster.js';
import { VARIANT_ORDER } from './sprite-extractor.js';
import {
  type VectorizedPartSvg,
  vectorizeRasterCutoutToSvg,
} from './svg-vectorizer.js';

export interface AlgorithmicGenerationPaths {
  readonly srcImagesDir: string;
  readonly publicAlgorithmicDir: string;
  readonly publicUrlPrefix: string;
}

export function generateAlgorithmicSpritesAndSheet(
  paths: AlgorithmicGenerationPaths,
): AlgorithmicManifest {
  const photorealParts = extractAndLoadPhotorealFemaleParts(process.cwd());
  exportVectorizedSvgPartsAndFrames(photorealParts, process.cwd());
  const maleResult = renderPersonaSheetAndFrames('sg-chinese-male', paths);
  const femaleResult = renderPersonaSheetAndFrames('sg-chinese-female', paths);
  renderPersonaSheetAndFrames('photo-sg-chinese-female', paths);
  renderPersonaSheetAndFrames('photo-sg-chinese-female-average', paths);
  renderPersonaSheetAndFrames('photo-sg-chinese-female-petite', paths);
  renderAllBodyPartCutouts(paths.publicAlgorithmicDir, 'sg-chinese-male');
  renderAllBodyPartCutouts(paths.publicAlgorithmicDir, 'sg-chinese-female');
  renderAllBodyPartCutouts(paths.publicAlgorithmicDir, 'photo-sg-chinese-female');
  renderAllBodyPartCutouts(paths.publicAlgorithmicDir, 'photo-sg-chinese-female-average');
  renderAllBodyPartCutouts(paths.publicAlgorithmicDir, 'photo-sg-chinese-female-petite');
  const manifest = buildAlgorithmicManifest(paths, maleResult, femaleResult);
  const manifestPath = path.join(paths.publicAlgorithmicDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

interface PersonaSheetResult {
  readonly srcSheetPath: string;
  readonly publicSheetUrl: string;
  readonly urlsByVariant: Record<RunnerVariantId, string[]>;
}

function renderPersonaSheetAndFrames(
  personaId: RunnerPersonaId,
  paths: AlgorithmicGenerationPaths,
): PersonaSheetResult {
  const frameWidth = DEFAULT_RIG_SPEC.canvasWidth;
  const frameHeight = DEFAULT_RIG_SPEC.canvasHeight;
  const sheet = createRaster(8 * frameWidth, VARIANT_ORDER.length * frameHeight);
  fillRaster(sheet, { r: 255, g: 0, b: 255, a: 255 });
  const urlsByVariant = renderAllVariantFrames(sheet, personaId, paths);
  const sheetFileName =
    personaId === 'photo-sg-chinese-female-petite'
      ? 'runner-8frame-6color-photoreal-female-petite-sheet.png'
      : personaId === 'photo-sg-chinese-female-average'
        ? 'runner-8frame-6color-photoreal-female-average-sheet.png'
        : personaId === 'photo-sg-chinese-female'
          ? 'runner-8frame-6color-photoreal-female-sheet.png'
          : personaId === 'sg-chinese-female'
            ? 'runner-8frame-6color-female-algorithmic-sheet.png'
            : 'runner-8frame-6color-algorithmic-sheet.png';
  const srcSheetPath = path.join(paths.srcImagesDir, 'spritesheets', sheetFileName);
  const pubSheetPath = path.join(paths.publicAlgorithmicDir, sheetFileName);
  writePngFile(srcSheetPath, sheet);
  writePngFile(pubSheetPath, sheet);
  return {
    srcSheetPath,
    publicSheetUrl: `${paths.publicUrlPrefix}/${sheetFileName}`,
    urlsByVariant,
  };
}

function renderAllVariantFrames(
  sheet: RasterImage,
  personaId: RunnerPersonaId,
  paths: AlgorithmicGenerationPaths,
): Record<RunnerVariantId, string[]> {
  const urlsByVariant: Record<RunnerVariantId, string[]> = {
    red: [],
    blue: [],
    green: [],
    yellow: [],
    purple: [],
    orange: [],
  };
  for (let row = 0; row < VARIANT_ORDER.length; row++) {
    const variant = VARIANT_ORDER[row] ?? 'red';
    urlsByVariant[variant] = renderSingleVariantRow(sheet, {
      row,
      variant,
      personaId,
      paths,
    });
  }
  return urlsByVariant;
}

interface VariantRowJob {
  readonly row: number;
  readonly variant: RunnerVariantId;
  readonly personaId: RunnerPersonaId;
  readonly paths: AlgorithmicGenerationPaths;
}

function renderSingleVariantRow(sheet: RasterImage, job: VariantRowJob): string[] {
  const palette = RUNNER_PALETTES[job.variant];
  const urls: string[] = [];
  const tuning =
    job.personaId === 'photo-sg-chinese-female-petite'
      ? PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female-petite']
      : job.personaId === 'photo-sg-chinese-female-average'
        ? PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female-average']
        : job.personaId === 'photo-sg-chinese-female'
          ? PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female']
          : undefined;
  const gaitCfg = tuning
    ? {
        ...DEFAULT_GAIT_CONFIG,
        armCarryFlexDeg: tuning.defaultArmCarryFlexDeg,
        armChestBiasDeg: tuning.defaultArmChestBiasDeg,
        hairStyleMode: tuning.defaultHairStyleMode,
      }
    : DEFAULT_GAIT_CONFIG;
  const rigSpec = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning);
  for (let col = 0; col < 8; col++) {
    const pose = solveArticulatedPose(col / 8, gaitCfg, rigSpec);
    const frameRaster = renderRunnerPoseToRaster({
      pose,
      palette,
      pixelScale: 1,
      personaId: job.personaId,
      assetTuning: tuning,
    });
    const fileName = `frame-${String(col + 1).padStart(2, '0')}.png`;
    const personaRel = `${job.personaId}/${job.variant}/${fileName}`;
    writePngFile(path.join(job.paths.publicAlgorithmicDir, personaRel), frameRaster);
    if (job.personaId === 'sg-chinese-male') {
      const legacyPath = path.join(job.paths.publicAlgorithmicDir, job.variant, fileName);
      writePngFile(legacyPath, frameRaster);
    }
    blitRaster(sheet, frameRaster, {
      x: col * DEFAULT_RIG_SPEC.canvasWidth,
      y: job.row * DEFAULT_RIG_SPEC.canvasHeight,
    });
    urls.push(`${job.paths.publicUrlPrefix}/${personaRel}`);
  }
  return urls;
}

function renderAllBodyPartCutouts(
  publicAlgorithmicDir: string,
  personaId: RunnerPersonaId,
): void {
  const redPalette = RUNNER_PALETTES.red;
  for (const part of ARTICULATED_BODY_PARTS) {
    const partRaster = renderIsolatedBodyPartToRaster(part.partId, redPalette, personaId);
    const personaPartPath = path.join(
      publicAlgorithmicDir,
      'parts',
      personaId,
      `${part.partId}.png`,
    );
    writePngFile(personaPartPath, partRaster);
    if (personaId === 'sg-chinese-male') {
      const legacyPartPath = path.join(publicAlgorithmicDir, 'parts', `${part.partId}.png`);
      writePngFile(legacyPartPath, partRaster);
    }
  }
}

function resolvePhotorealOutputSlug(personaId: PhotorealPersonaId): string {
  if (personaId === 'photo-sg-chinese-female-average') {
    return 'sg-chinese-female-average';
  }
  if (personaId === 'photo-sg-chinese-female-petite') {
    return 'sg-chinese-female-petite';
  }
  return 'sg-chinese-female';
}

function exportVectorizedSvgPartsAndFrames(
  photorealParts: Readonly<Partial<Record<BodyPartId, RasterImage>>>,
  repoRoot: string,
): void {
  const personas: readonly PhotorealPersonaId[] = [
    'photo-sg-chinese-female',
    'photo-sg-chinese-female-average',
    'photo-sg-chinese-female-petite',
  ];
  for (const personaId of personas) {
    const bank =
      personaId === 'photo-sg-chinese-female'
        ? photorealParts
        : (getPhotorealPartBankForPersona(personaId) ?? photorealParts);
    exportSinglePersonaSvgPartsAndFrames(personaId, bank, repoRoot);
  }
}

function exportSinglePersonaSvgPartsAndFrames(
  personaId: PhotorealPersonaId,
  photorealParts: Readonly<Partial<Record<BodyPartId, RasterImage>>>,
  repoRoot: string,
): void {
  const slug = resolvePhotorealOutputSlug(personaId);
  const svgPartsDir = path.join(repoRoot, 'public/sprites/photoreal', slug, 'svg-parts');
  const svgFramesDir = path.join(repoRoot, 'public/sprites/photoreal', slug, 'svg-frames');
  fs.mkdirSync(svgPartsDir, { recursive: true });
  fs.mkdirSync(svgFramesDir, { recursive: true });
  const upwardIds = new Set<BodyPartId>(['head', 'hairAccessory', 'torso', 'pelvis']);
  const vectorParts = {} as Record<BodyPartId, VectorizedPartSvg>;
  for (const part of ARTICULATED_BODY_PARTS) {
    const raster = photorealParts[part.partId];
    if (!raster) return;
    const isUpward = upwardIds.has(part.partId);
    const vec = vectorizeRasterCutoutToSvg(raster, {
      partId: part.partId,
      proximalPivot: { x: 80, y: isUpward ? 136 : 36 },
      distalPivot: { x: 80, y: isUpward ? 24 : 124 },
      quantStep: 24,
      gridStepPx: 2,
    });
    vectorParts[part.partId] = vec;
    fs.writeFileSync(path.join(svgPartsDir, `${part.partId}.svg`), `${vec.fullSvgDocument}\n`, 'utf8');
  }
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS[personaId];
  const gaitCfg = {
    ...DEFAULT_GAIT_CONFIG,
    armCarryFlexDeg: tuning.defaultArmCarryFlexDeg,
    armChestBiasDeg: tuning.defaultArmChestBiasDeg,
    hairStyleMode: tuning.defaultHairStyleMode,
  };
  const rigSpec = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning);
  for (let col = 0; col < 8; col++) {
    const pose = solveArticulatedPose(col / 8, gaitCfg, rigSpec);
    const stitched = stitchArticulatedSvgRig(
      pose,
      vectorParts,
      { width: rigSpec.canvasWidth, height: rigSpec.canvasHeight },
      tuning,
    );
    const fileName = `frame-${String(col + 1).padStart(2, '0')}.svg`;
    fs.writeFileSync(path.join(svgFramesDir, fileName), `${stitched}\n`, 'utf8');
  }
}

function buildAlgorithmicManifest(
  paths: AlgorithmicGenerationPaths,
  male: PersonaSheetResult,
  female: PersonaSheetResult,
): AlgorithmicManifest {
  void paths;
  return {
    schemaVersion: '1.1.0',
    sheetPath: path.relative(process.cwd(), male.srcSheetPath),
    publicSheetUrl: male.publicSheetUrl,
    femaleSheetPath: path.relative(process.cwd(), female.srcSheetPath),
    femalePublicSheetUrl: female.publicSheetUrl,
    frameCount: 8,
    frameWidth: DEFAULT_RIG_SPEC.canvasWidth,
    frameHeight: DEFAULT_RIG_SPEC.canvasHeight,
    personas: ['sg-chinese-male', 'sg-chinese-female'],
    variants: VARIANT_ORDER,
    frameUrlsByVariant: male.urlsByVariant,
    femaleFrameUrlsByVariant: female.urlsByVariant,
    bodyParts: ARTICULATED_BODY_PARTS,
  };
}

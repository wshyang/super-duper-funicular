import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { BodyPartId, RasterImage } from '../shared/types.js';
import { encodePngBuffer, readImageFile } from './image-io.js';
import { keyPhotoPlate } from './photo-matte.js';
import {
  ANGLE_TOLERANCE_DEG,
  type PoseMaterialBank,
  type RenderedPartMaterial,
  type VisibilityScore,
} from './pose-material-types.js';
import {
  LIMB_PARTS,
  MATERIAL_SIZE,
  angleBucket,
  angleOf,
  isotropicLateralExtent,
  rectifyTube,

  trimmedTubeStart,
} from './pose-material-harvest.js';
import { proximalTrimFor, SKIN_DOMINANT_MIN, skinFractionInCapsule, verifyRoundTrip } from './pose-material-verify.js';
import {
  buildSilhouetteMask,
  buildTargetGeometry,
  projectPointToImage,
  refineRegistration,
  registerSilhouette,
} from './pose-silhouette.js';
import { measureIsolation, bucketOfAngle } from './pose-part-fitting.js';
import {
  computeGradientField,
  searchLimbTube,
} from './pose-limb-probe.js';
import { solveArticulatedPose } from '../runner/gait.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import type { PhotorealAssetTuningSpec } from '../shared/types.js';

export interface MaterialHarvestConfig {
  readonly repoRoot: string;
  readonly rootByGroup: Readonly<Record<string, string>>;
  readonly masterSourceId: string;
  readonly personaId: string;
  readonly rig: AnatomicalRigSpec;
  readonly tuning: PhotorealAssetTuningSpec;
  readonly outputDirectory: string;
  readonly sources: readonly MaterialHarvestSource[];
}

export interface MaterialHarvestSource {
  readonly sourceId: string;
  readonly group: string;
  readonly relativePath: string;
  readonly declaredPhase: number;
  readonly accepted: boolean;
  readonly poseMatchRatio: number;
  /** Part verdicts from the audit; when present, the harvest is a strict subset. */
  readonly eligibleParts?: readonly BodyPartId[];
  /** Anatomy-study plates are angle evidence only; they never supply material. */
  readonly wardrobe?: 'clothed' | 'anatomy-study';
}

export interface HarvestOutcome {
  readonly bank: PoseMaterialBank;
  readonly rejected: readonly { readonly sourceId: string; readonly partId: BodyPartId; readonly reason: string }[];
  readonly writtenFiles: readonly string[];
}

const LIMB_ACCEPT = { fill: 0.72, wallContrast: 0.42, widthAgreement: 0.35, isolation: 0.2 } as const;

interface SourceContext {
  readonly source: MaterialHarvestSource;
  readonly absolutePath: string;
  readonly image: RasterImage;
  readonly mask: ReturnType<typeof buildSilhouetteMask>;
  readonly sha256: string;
}

function loadContext(config: MaterialHarvestConfig, source: MaterialHarvestSource): SourceContext | null {
  const root = config.rootByGroup[source.group] ?? config.repoRoot;
  const absolutePath = path.resolve(root, source.relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  const keyed = keyPhotoPlate(readImageFile(absolutePath));
  return {
    source,
    absolutePath,
    image: keyed.image,
    mask: buildSilhouetteMask(keyed.image),
    sha256: crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex'),
  };
}

function targetFor(config: MaterialHarvestConfig, phase: number) {
  const pose = solveArticulatedPose(phase, undefined, config.rig);
  return buildTargetGeometry(pose, config.rig, config.tuning);
}

function materialId(sourceId: string, partId: BodyPartId): string {
  return `${sourceId}--${partId}`;
}

function registerFor(config: MaterialHarvestConfig, context: SourceContext) {
  const target = targetFor(config, context.source.declaredPhase);
  return refineRegistration(context.mask, registerSilhouette(context.mask, target), target);
}

interface LimbHarvest {
  readonly material: RenderedPartMaterial;
  readonly image: RasterImage;
}

/**
 * Harvests a limb by probing for the tube that actually explains the pixels, so
 * the recorded angle is a measured angle rather than the angle the prompt asked
 * for. A limb whose axis cannot be resolved is refused, never guessed.
 */
function harvestLimb(
  config: MaterialHarvestConfig,
  context: SourceContext,
  field: ReturnType<typeof computeGradientField>,
  partId: BodyPartId,
): LimbHarvest | { readonly reason: string } {
  const target = targetFor(config, context.source.declaredPhase);
  const registration = registerFor(config, context);
  const part = target.parts.find((entry) => entry.partId === partId);
  if (!part) return { reason: 'part-not-in-rig' };
  const root = projectPointToImage(part.capsule.start, registration);
  const tip = projectPointToImage(part.capsule.end, registration);
  const halfWidth = Math.max(3, part.capsule.halfWidth * registration.scale);
  const probe = searchLimbTube(context.mask, field, root, tip, halfWidth);
  const isolation = measureIsolation(context.mask, probe.tube.start, probe.tube.end, halfWidth, 9);
  const reason = limbRejection(probe, isolation);
  if (reason) return { reason };
  const trim = proximalTrimFor(partId);
  const tubeLength = Math.hypot(probe.tube.end.x - probe.tube.start.x, probe.tube.end.y - probe.tube.start.y);
  const lateralExtent = isotropicLateralExtent(tubeLength);
  const rectified = rectifyTube(context.image, {
    sourceStart: probe.tube.start,
    sourceEnd: probe.tube.end,
    lateralHalfExtentPx: lateralExtent,
    capRadiusPx: Math.max(6, Math.min(12, halfWidth * 0.28)),
    capRadiusTopPx: 3,
    proximalTrimFraction: trim,
  });
  const image = rectified;
  // Same gate, same function, same threshold as the audit: the region measured
  // in the plate must be skin, not singlet fabric.
  const skin = skinFractionInCapsule(context.image, probe.tube.start, probe.tube.end, halfWidth);
  if (skin < SKIN_DOMINANT_MIN) {
    return { reason: `wrong-material:skin=${skin.toFixed(2)}` };
  }
  const verification = verifyRoundTrip({
    cutout: image,
    source: context.image,
    tubeStart: trimmedTubeStart(probe.tube.start, probe.tube.end, trim),
    tubeEnd: probe.tube.end,
    halfWidthPx: lateralExtent,
  });
  if (!verification.passed) {
    return { reason: `round-trip:${verification.alphaIou.toFixed(2)}/${verification.meanColorDelta.toFixed(0)}` };
  }
  const measuredAngle = angleOf(probe.tube.start, probe.tube.end);
  const cutoutFile = path.join(
    config.outputDirectory,
    'parts',
    `${materialId(context.source.sourceId, partId)}.png`,
  );
  // Store repo-relative paths: the bank is a committed artifact and machine-
  // absolute paths would not survive a clone.
  const cutoutPath = path.relative(config.repoRoot, cutoutFile);
  return {
    image,
    material: {
      materialId: materialId(context.source.sourceId, partId),
      partId,
      sourceId: context.source.sourceId,
      sourceSha256: context.sha256,
      sourcePath: path.relative(config.repoRoot, context.absolutePath),
      measuredAngleDeg: Number(measuredAngle.toFixed(1)),
      bucketDeg: angleBucket(measuredAngle),
      halfWidthPx: Number(halfWidth.toFixed(1)),
      visibility: toVisibility(probe.fill, isolation),
      sideProvenance: 'guide-derived',
      skinFraction: Number(skin.toFixed(3)),
      roundTrip: {
        alphaIou: Number(verification.alphaIou.toFixed(4)),
        meanColorDelta: Number(verification.meanColorDelta.toFixed(2)),
        passed: verification.passed,
      },
      cutoutPath,
      cutoutSha256: '',
    },
  };
}

function limbRejection(
  probe: { readonly fill: number; readonly wallContrast: number; readonly widthAgreement: number },
  isolation: number,
): string | null {
  if (probe.fill < LIMB_ACCEPT.fill) return `low-fill:${probe.fill.toFixed(2)}`;
  if (probe.wallContrast < LIMB_ACCEPT.wallContrast) return `weak-walls:${probe.wallContrast.toFixed(2)}`;
  if (probe.widthAgreement < LIMB_ACCEPT.widthAgreement) return `width-mismatch:${probe.widthAgreement.toFixed(2)}`;
  if (isolation < LIMB_ACCEPT.isolation) return `merged:${isolation.toFixed(2)}`;
  return null;
}

function toVisibility(fill: number, isolation: number): VisibilityScore {
  if (fill >= 0.9 && isolation >= 0.5) return 3;
  if (fill >= 0.78 && isolation >= 0.25) return 2;
  if (fill >= 0.4) return 1;
  return 0;
}

export function harvestMaterial(config: MaterialHarvestConfig): HarvestOutcome {
  fs.mkdirSync(path.join(config.outputDirectory, 'parts'), { recursive: true });
  const materials: RenderedPartMaterial[] = [];
  const rejected: Array<{ sourceId: string; partId: BodyPartId; reason: string }> = [];
  const writtenFiles: string[] = [];
  for (const source of config.sources) {
    const context = loadContext(config, source);
    if (!context) {
      rejected.push({ sourceId: source.sourceId, partId: 'torso', reason: 'file-missing' });
      continue;
    }
    const limbs = harvestSource(config, source, context, computeGradientField(context.image));
    for (const [partId, result] of limbs) {
      if ('material' in result) {
        writeMaterial(config.repoRoot, result.material, result.image, writtenFiles);
        materials.push(result.material);
      } else {
        rejected.push({ sourceId: source.sourceId, partId, reason: result.reason });
      }
    }
  }
  return {
    bank: {
      schemaVersion: 1,
      personaId: 'photo-sg-chinese-female',
      masterPath: '',
      materials,
    },
    rejected,
    writtenFiles,
  };
}

/**
 * Harvests one source. Three rules decide what is even attempted: the master is a
 * standing identity plate (its limbs come from the studio extractor, never here),
 * anatomy-study plates are angle evidence only, and when the audit supplied
 * per-part verdicts only those parts are attempted. The last rule is what stops
 * the audit and the bank drifting apart.
 */
function harvestSource(
  config: MaterialHarvestConfig,
  source: MaterialHarvestSource,
  context: SourceContext,
  field: ReturnType<typeof computeGradientField>,
): ReadonlyArray<readonly [BodyPartId, LimbHarvest | { readonly reason: string }]> {
  const allowed = source.eligibleParts
    ? LIMB_PARTS.filter((partId) => source.eligibleParts?.includes(partId))
    : LIMB_PARTS;
  if (source.wardrobe === 'anatomy-study') {
    return allowed.map((partId) => [partId, { reason: 'wardrobe:anatomy-study' }] as const);
  }
  const usable = source.accepted && source.sourceId !== config.masterSourceId && source.poseMatchRatio >= 0.75;
  if (!usable) return [];
  return allowed.map((partId) => [partId, harvestLimb(config, context, field, partId)] as const);
}

function writeMaterial(
  repoRoot: string,
  material: RenderedPartMaterial,
  image: RasterImage,
  written: string[],
): void {
  const absolute = path.resolve(repoRoot, material.cutoutPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const buffer = encodePngBuffer(image);
  fs.writeFileSync(absolute, buffer);
  (material as { cutoutSha256: string }).cutoutSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  written.push(absolute);
}

/**
 * Angle-aware selection: the rig supplies geometry, material supplies appearance.
 * A part is only satisfied by material measured within the tolerance; if none
 * exists the caller must record a gap instead of silently reusing a standing
 * cutout at an angle nobody measured.
 */
export function selectMaterialForAngle(
  materials: readonly RenderedPartMaterial[],
  partId: BodyPartId,
  targetAngleDeg: number,
): RenderedPartMaterial | null {
  const candidates = materials
    .filter((entry) => entry.partId === partId)
    .map((entry) => ({ entry, delta: angleDelta(entry.measuredAngleDeg, targetAngleDeg) }))
    .filter((candidate) => candidate.delta <= ANGLE_TOLERANCE_DEG)
    .sort((a, b) => a.delta - b.delta);
  return candidates[0]?.entry ?? null;
}

function angleDelta(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function bucketOfEntry(entry: RenderedPartMaterial): number {
  return bucketOfAngle((entry.measuredAngleDeg * Math.PI) / 180);
}

export function materialSize(): number {
  return MATERIAL_SIZE;
}

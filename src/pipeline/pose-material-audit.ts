import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  BodyPartId,
  PhotorealAssetTuningSpec,
  RasterImage,
} from '../shared/types.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import { solveArticulatedPose } from '../runner/gait.js';
import { keyPhotoPlate, type MatteStats } from './photo-matte.js';
import { readImageFile } from './image-io.js';
import {
  buildSilhouetteMask,
  buildTargetGeometry,
  measurePoseF1,
  projectPointToImage,
  refineRegistration,
  registerSilhouette,
} from './pose-silhouette.js';
import { evaluatePart, bucketOfAngle, sideOfPart } from './pose-part-fitting.js';
import { describeSilhouette, summarizeDiversity, type DiversitySummary } from './pose-diversity.js';
import { calibratePoseCeilings, type PoseCalibrationEntry } from './pose-calibration.js';
import { SKIN_DOMINANT_MIN, skinFractionInCapsule } from './pose-material-verify.js';
import { computeGradientField, searchLimbTube, type GradientField } from './pose-limb-probe.js';
import { measureIsolation } from './pose-part-fitting.js';
import type {
  BucketCoverageEntry,
  Registration,
  MaterialGap,
  MaterialStatus,
  PartEligibility,
  PoseMaterialAuditReport,
  PoseTargetGeometry,
  SilhouetteMask,
  SourceEvidence,
} from './pose-material-types.js';

export interface PoseMaterialSourceDeclaration {
  readonly sourceId: string;
  readonly group: string;
  readonly relativePath: string;
  readonly role: 'master' | 'pose-bank' | 'phase-harvest';
  readonly wardrobe: 'clothed' | 'anatomy-study';
  readonly declaredPhase: number;
}

export interface PoseMaterialAuditConfig {
  readonly repoRoot: string;
  readonly rootByGroup: Readonly<Record<string, string>>;
  readonly masterPath: string;
  readonly personaId: import('../shared/types.js').RunnerPersonaId;
  readonly tuning: PhotorealAssetTuningSpec;
  readonly rig: AnatomicalRigSpec;
  readonly sources: readonly PoseMaterialSourceDeclaration[];
  readonly canonicalPhaseCount?: number;
  readonly pixelsPerRigUnit: number;
  readonly variant?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
}

export const AUDITED_PARTS: readonly BodyPartId[] = [
  'head', 'neck', 'torso', 'pelvis',
  'nearUpperArm', 'nearForearm', 'nearHand',
  'farUpperArm', 'farForearm', 'farHand',
  'nearThigh', 'nearShin', 'nearFoot',
  'farThigh', 'farShin', 'farFoot',
];

const IDENTITY_TOLERANCE = 0.1;
const LEAK_SOFT_LIMIT = 0.006;
const LEAK_HARD_LIMIT = 0.014;
const SHADOW_SOFT_LIMIT = 0.1;
/**
 * A limb cut is taken along the *registered* bone axis, so the registration has
 * to be trustworthy before any limb may donate material. Static parts (head,
 * neck, torso, pelvis) are exempt: their axis is anatomical and does not depend
 * on how well the plate matches the prompt.
 */
const POSE_GATE_RATIO = 0.8;
const LIMB_PARTS: readonly BodyPartId[] = [
  'nearUpperArm', 'nearForearm', 'nearHand',
  'farUpperArm', 'farForearm', 'farHand',
  'nearThigh', 'nearShin', 'nearFoot',
  'farThigh', 'farShin', 'farFoot',
];
const POSE_F1_FLOOR = 0.6;
const BUCKET_TOLERANCE_DEG = 12;

export function buildPhaseTargets(
  config: PoseMaterialAuditConfig,
  count: number,
): PoseTargetGeometry[] {
  const targets: PoseTargetGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const pose = solveArticulatedPose(i / count, undefined, config.rig);
    targets.push(buildTargetGeometry(pose, config.rig, config.tuning));
  }
  return targets;
}

interface LoadedSource {
  readonly declaration: PoseMaterialSourceDeclaration;
  readonly absolutePath: string;
  readonly image: RasterImage;
  readonly stats: MatteStats;
  readonly mask: SilhouetteMask;
  readonly sha256: string;
}

function resolveSourcePath(config: PoseMaterialAuditConfig, declaration: PoseMaterialSourceDeclaration): string {
  const root = config.rootByGroup[declaration.group] ?? config.repoRoot;
  return path.resolve(root, declaration.relativePath);
}

function loadSource(
  config: PoseMaterialAuditConfig,
  declaration: PoseMaterialSourceDeclaration,
): LoadedSource | null {
  const absolutePath = resolveSourcePath(config, declaration);
  if (!fs.existsSync(absolutePath)) return null;
  const plate = readImageFile(absolutePath);
  const keyed = keyPhotoPlate(plate);
  return {
    declaration,
    absolutePath,
    image: keyed.image,
    stats: keyed.stats,
    mask: buildSilhouetteMask(keyed.image),
    sha256: crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex'),
  };
}

function bestPhaseFor(
  mask: SilhouetteMask,
  targets: readonly PoseTargetGeometry[],
): { readonly index: number; readonly f1: number } {
  let best = { index: -1, f1: 0 };
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    if (!target) continue;
    const local = refineRegistration(mask, registerSilhouette(mask, target), target, 24);
    const f1 = local.poseF1 === 0 ? measurePoseF1(mask, local, target) : local.poseF1;
    if (f1 > best.f1) best = { index: i, f1 };
  }
  return best;
}

function assessHardGates(
  faceScaleRatio: number,
  parts: readonly PartEligibility[],
  interiorLeakRatio: number,
): string[] {
  const reasons: string[] = [];
  if (Math.abs(faceScaleRatio - 1) > IDENTITY_TOLERANCE) reasons.push('identity-drift');
  if (interiorLeakRatio > LEAK_HARD_LIMIT) reasons.push('matte-impure');
  if (parts.length > 0 && !parts.some((part) => part.eligible)) reasons.push('no-eligible-parts');
  return reasons;
}

function assessSoftGates(
  stats: MatteStats,
  poseF1: number,
  wardrobe: 'clothed' | 'anatomy-study',
): string[] {
  const reasons: string[] = [];
  if (stats.interiorLeakRatio > LEAK_SOFT_LIMIT) reasons.push('spill-elevated');
  if (stats.shadowFraction > SHADOW_SOFT_LIMIT) reasons.push('shadow-contaminated');
  if (poseF1 < POSE_F1_FLOOR) reasons.push('pose-drift');
  if (wardrobe === 'anatomy-study') reasons.push('anatomy-study');
  return reasons;
}

function statusFrom(hard: readonly string[], soft: readonly string[]): MaterialStatus {
  if (hard.length > 0) return 'rejected';
  return soft.length > 0 ? 'conditional' : 'accepted';
}

interface SourceAnalysis {
  readonly evidence: SourceEvidence;
  readonly descriptorId: string;
  readonly mask: SilhouetteMask;
}

function analyseSource(
  config: PoseMaterialAuditConfig,
  loaded: LoadedSource,
  targets: readonly PoseTargetGeometry[],
  masterFaceWidthPx: number,
  ceilings: readonly PoseCalibrationEntry[],
): SourceAnalysis {
  const { declaration, mask } = loaded;
  const declaredIndex = Math.round(declaration.declaredPhase * (targets.length || 1)) % Math.max(1, targets.length);
  const declaredTarget = targets[declaredIndex];
  const registration = declaredTarget
    ? refineRegistration(mask, registerSilhouette(mask, declaredTarget), declaredTarget)
    : null;
  const poseF1 = declaredTarget && registration ? measurePoseF1(mask, registration, declaredTarget) : 0;
  const parts = declaredTarget && registration
    ? measureAllParts(loaded.image, computeGradientField(loaded.image), mask, registration, declaredTarget)
    : [];
  if (declaration.role === 'master') {
    // The master is the identity anchor and the source of static anatomy; it is
    // a standing pose, so it is not expected to match a gait phase.
    return masterEvidence(config, loaded, parts, registration, mask);
  }
  return {
    evidence: scoreSource(config, loaded, parts, registration, poseF1, targets, masterFaceWidthPx, ceilings[declaredIndex]),
    descriptorId: declaration.sourceId,
    mask,
  };
}

/**
 * Applies the hard/soft gate stack to an already-measured source and assembles its
 * evidence record. Split from `analyseSource` so both stay inside the project's
 * 50-line function budget.
 */
function scoreSource(
  config: PoseMaterialAuditConfig,
  loaded: LoadedSource,
  parts: readonly PartEligibility[],
  registration: Registration | null,
  poseF1: number,
  targets: readonly PoseTargetGeometry[],
  masterFaceWidthPx: number,
  ceiling: PoseCalibrationEntry | undefined,
): SourceEvidence {
  const { declaration, stats, mask } = loaded;
  const faceScaleRatio = masterFaceWidthPx === 0 ? 1 : mask.faceWidthPx / Math.max(1, masterFaceWidthPx);
  const ceilingF1 = ceiling?.ceilingF1 ?? 1;
  const poseMatchRatio = ceilingF1 <= 0 ? 0 : poseF1 / ceilingF1;
  const gatedParts = applyAppearanceGate(loaded.image, applyPoseGate(parts, poseMatchRatio));
  const hard = assessHardGates(faceScaleRatio, gatedParts, stats.interiorLeakRatio);
  const soft = assessSoftGates(stats, poseMatchRatio, declaration.wardrobe);
  const best = registration ? bestPhaseFor(mask, targets) : { index: -1, f1: 0 };
  if (best.index >= 0 && Math.abs(best.index / Math.max(1, targets.length) - declaration.declaredPhase) > 0.07) {
    soft.push('declared-phase-mismatch');
  }
  return {
    sourceId: declaration.sourceId,
    path: path.relative(config.repoRoot, loaded.absolutePath),
    sha256: loaded.sha256,
    role: declaration.role,
    wardrobe: declaration.wardrobe,
    width: loaded.image.width,
    height: loaded.image.height,
    figureHeightPx: registration?.figureHeightPx ?? 0,
    faceWidthPx: mask.faceWidthPx,
    faceScaleRatio,
    backgroundNoise: stats.backdropNoise,
    fringeRatio: stats.fringeRatio,
    interiorLeakRatio: stats.interiorLeakRatio,
    magentaLeakPixels: stats.magentaLeakPixels,
    shadowFraction: stats.shadowFraction,
    registration: registration ? { ...registration, poseF1 } : null,
    poseMatchRatio,
    parts: gatedParts,
    status: statusFrom(hard, soft),
    reasonCodes: [...hard, ...soft],
  };
}
/**
 * A source whose pose match falls below the gate cannot support part-level
 * claims: the silhouette is not the pose we think it is, so any capsule fitted
 * inside it is unverified. Demote rather than delete, so the reason survives in
 * the report.
 */
function applyPoseGate(
  parts: readonly PartEligibility[],
  poseMatchRatio: number,
): PartEligibility[] {
  if (poseMatchRatio >= POSE_GATE_RATIO) return [...parts];
  return parts.map((part) =>
    part.eligible
      ? {
          ...part,
          eligible: false,
          reasonCodes: [...part.reasonCodes, `pose-unverified:${poseMatchRatio.toFixed(2)}`],
        }
      : part,
  );
}

function masterEvidence(
  config: PoseMaterialAuditConfig,
  loaded: LoadedSource,
  parts: readonly PartEligibility[],
  registration: ReturnType<typeof registerSilhouette> | null,
  mask: SilhouetteMask,
): SourceAnalysis {
  const { declaration, stats } = loaded;
  return {
    evidence: {
      sourceId: declaration.sourceId,
      path: path.relative(config.repoRoot, loaded.absolutePath),
      sha256: loaded.sha256,
      role: 'master',
      wardrobe: declaration.wardrobe,
      width: loaded.image.width,
      height: loaded.image.height,
      figureHeightPx: registration?.figureHeightPx ?? 0,
      faceWidthPx: mask.faceWidthPx,
      faceScaleRatio: 1,
      backgroundNoise: stats.backdropNoise,
      fringeRatio: stats.fringeRatio,
      interiorLeakRatio: stats.interiorLeakRatio,
      magentaLeakPixels: stats.magentaLeakPixels,
      shadowFraction: stats.shadowFraction,
      registration: registration ? { ...registration, poseF1: 0 } : null,
      poseMatchRatio: 1,
      parts: [...parts],
      status: 'accepted',
      reasonCodes: [],
    },
    descriptorId: declaration.sourceId,
    mask,
  };
}

/**
 * Limbs are measured with the same tube probe the harvester uses, so the audit
 * and the material bank cannot disagree about whether a part is harvestable.
 * Static parts (head, neck, torso, pelvis) have no joint to search and keep the
 * anchored capsule measurement.
 */
function measureAllParts(
  image: ReturnType<typeof readImageFile>,
  gradient: GradientField,
  mask: SilhouetteMask,
  registration: Registration,
  target: PoseTargetGeometry,
): PartEligibility[] {
  return AUDITED_PARTS.map((partId) => {
    if (!LIMB_PARTS.includes(partId)) return evaluatePart(mask, registration, target, partId);
    const part = target.parts.find((entry) => entry.partId === partId);
    if (!part) return evaluatePart(mask, registration, target, partId);
    const root = projectPointToImage(part.capsule.start, registration);
    const tip = projectPointToImage(part.capsule.end, registration);
    const halfWidth = Math.max(3, part.capsule.halfWidth * registration.scale);
    const probe = searchLimbTube(mask, gradient, root, tip, halfWidth);
    const isolation = measureIsolation(mask, probe.tube.start, probe.tube.end, halfWidth, 9);
    const skin = skinFractionInCapsule(image, probe.tube.start, probe.tube.end, halfWidth);
    const codes: string[] = [];
    if (probe.fill < 0.72) codes.push(`low-fill:${probe.fill.toFixed(2)}`);
    if (probe.wallContrast < 0.42) codes.push(`weak-walls:${probe.wallContrast.toFixed(2)}`);
    if (probe.widthAgreement < 0.35) codes.push(`width-mismatch:${probe.widthAgreement.toFixed(2)}`);
    if (isolation < 0.2) codes.push(`merged:${isolation.toFixed(2)}`);
    if (skin < SKIN_DOMINANT_MIN) codes.push(`wrong-material:skin=${skin.toFixed(2)}`);
    const angleRad = probe.angleRad;
    return {
      partId,
      side: sideOfPart(partId),
      fit: {
        partId,
        found: probe.fill >= 0.4,
        angleRad,
        targetAngleRad: Math.atan2(tip.y - root.y, tip.x - root.x),
        angleErrorRad: 0,
        deviationRad: probe.angleDeltaRad,
        start: probe.tube.start,
        end: probe.tube.end,
        halfWidthPx: halfWidth,
        coverage: probe.fill,
        isolation,
        widthAgreement: probe.widthAgreement,
        visibility: probe.fill >= 0.9 && isolation >= 0.5 ? 3 : probe.fill >= 0.72 ? 2 : probe.fill >= 0.4 ? 1 : 0,
      },
      eligible: codes.length === 0,
      reasonCodes: codes,
      bucketDeg: bucketOfAngle(angleRad),
    };
  });
}

/**
 * Reuses the harvester's appearance rule inside the audit. A part whose measured
 * region is singlet or shorts is not limb material, however well its capsule
 * fits the silhouette; without this shared gate the audit reported "eligible"
 * for a near upper arm that the harvester (correctly) refused to cut.
 */
function applyAppearanceGate(
  image: ReturnType<typeof readImageFile>,
  parts: readonly PartEligibility[],
): PartEligibility[] {
  return parts.map((part) => {
    if (!part.eligible || !LIMB_PARTS.includes(part.partId)) return part;
    const skin = skinFractionInCapsule(image, part.fit.start, part.fit.end, part.fit.halfWidthPx);
    if (skin >= SKIN_DOMINANT_MIN) return part;
    return {
      ...part,
      eligible: false,
      reasonCodes: [...part.reasonCodes, `wrong-material:skin=${skin.toFixed(2)}`],
    };
  });
}

function collectBuckets(sources: readonly SourceEvidence[]): BucketCoverageEntry[] {
  const map = new Map<string, { partId: BodyPartId; bucketDeg: number; sources: string[] }>();
  for (const source of sources) {
    if (source.status === 'rejected') continue;
    for (const part of source.parts) {
      if (!part.eligible || part.bucketDeg === null) continue;
      const key = `${part.partId}@${part.bucketDeg}`;
      const entry = map.get(key) ?? { partId: part.partId, bucketDeg: part.bucketDeg, sources: [] };
      entry.sources.push(source.sourceId);
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.partId.localeCompare(b.partId) || a.bucketDeg - b.bucketDeg,
  );
}

function targetAngleFor(
  targets: readonly PoseTargetGeometry[],
  phaseIndex: number,
  partId: BodyPartId,
): number | null {
  const target = targets[phaseIndex];
  const entry = target?.parts.find((part) => part.partId === partId);
  if (!entry) return null;
  const degrees = (Math.atan2(entry.capsule.end.y - entry.capsule.start.y, entry.capsule.end.x - entry.capsule.start.x) * 180) / Math.PI;
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

function collectGaps(
  sources: readonly SourceEvidence[],
  targets: readonly PoseTargetGeometry[],
): MaterialGap[] {
  const gaps: MaterialGap[] = [];
  for (let phaseIndex = 0; phaseIndex < 8; phaseIndex++) {
    for (const partId of AUDITED_PARTS) {
      const targetAngle = targetAngleFor(targets, phaseIndex, partId);
      if (targetAngle === null) continue;
      const targetBucket = bucketOfAngle((targetAngle * Math.PI) / 180);
      const covered = sources.some((source) => {
        if (source.status === 'rejected') return false;
        return source.parts.some((part) => {
          if (part.partId !== partId || !part.eligible) return false;
          const measured = (part.fit.angleRad * 180) / Math.PI;
          return Math.abs(normalizeDelta(measured - targetAngle)) <= BUCKET_TOLERANCE_DEG;
        });
      });
      if (!covered) {
        gaps.push({
          partId,
          phaseIndex,
          targetAngleDeg: Number(targetAngle.toFixed(1)),
          targetBucketDeg: targetBucket,
          reason: 'no eligible material within 12 degrees of the solved target bone',
        });
      }
    }
  }
  return gaps;
}

function normalizeDelta(degrees: number): number {
  let value = degrees;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

export interface PoseMaterialAuditResult {
  readonly report: PoseMaterialAuditReport;
  readonly diversity: DiversitySummary;
  readonly masks: Readonly<Record<string, SilhouetteMask>>;
}

export function runPoseMaterialAudit(config: PoseMaterialAuditConfig): PoseMaterialAuditResult {
  const phaseCount = config.canonicalPhaseCount ?? 16;
  const targets = buildPhaseTargets(config, phaseCount);
  const loaded = config.sources
    .map((declaration) => loadSource(config, declaration))
    .filter((entry): entry is LoadedSource => entry !== null);
  const master = loaded.find((entry) => entry.declaration.role === 'master');
  const masterFaceWidthPx = master ? master.mask.faceWidthPx : 0;
  const ceilings = calibratePoseCeilings({
    targets,
    rig: config.rig,
    tuning: config.tuning,
    personaId: config.personaId,
    variant: config.variant ?? 'red',
  });
  const analyses = loaded.map((source) =>
    analyseSource(config, source, targets, masterFaceWidthPx, ceilings),
  );
  const sources = analyses.map((entry) => entry.evidence);
  const gaps = collectGaps(sources, targets);
  const buckets = collectBuckets(sources);
  const diversity = summarizeDiversity(analyses.map((entry) => describeSilhouette(entry.descriptorId, entry.mask)));
  const eligibilityCounts = countEligibility(sources);
  const report: PoseMaterialAuditReport = {
    generatedAt: new Date().toISOString(),
    masterPath: config.masterPath,
    sources,
    buckets,
    gaps,
    eligibilityCounts,
  };
  return {
    report,
    diversity,
    masks: Object.fromEntries(analyses.map((entry) => [entry.descriptorId, entry.mask])),
  };
}

function countEligibility(sources: readonly SourceEvidence[]): Record<string, number> {
  const counts: Record<string, number> = { accepted: 0, conditional: 0, rejected: 0, 'material-gap': 0 };
  for (const source of sources) counts[source.status] = (counts[source.status] ?? 0) + 1;
  for (const partId of AUDITED_PARTS) {
    counts[`eligible:${partId}`] = sources.reduce(
      (sum, source) => sum + source.parts.filter((part) => part.partId === partId && part.eligible).length,
      0,
    );
  }
  return counts;
}

export function summarizeEligibleParts(source: SourceEvidence): readonly PartEligibility[] {
  return source.parts.filter((part) => part.eligible);
}

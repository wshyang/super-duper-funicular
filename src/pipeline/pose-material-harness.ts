import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_RIG_SPEC, PHOTOREAL_ASSET_TUNING_DEFAULTS, applyAssetTuningToRigSpec } from '../runner/body-proportions.js';
import { runPoseMaterialAudit, type PoseMaterialAuditResult, type PoseMaterialSourceDeclaration } from './pose-material-audit.js';
import { readImageFile } from './image-io.js';
import { backdropRow, estimateBackdropModel } from './photo-matte.js';

export interface SourceManifest {
  readonly master: PoseMaterialSourceDeclaration;
  readonly sources: readonly PoseMaterialSourceDeclaration[];
}

/**
 * Shared harness for scripts and tests so that the audited pipeline and the
 * asserted pipeline cannot drift: there is exactly one way to build the config.
 */
export function readSourceManifest(repoRoot: string): SourceManifest {
  const manifestPath = path.join(repoRoot, 'src/images/pose-material/sources.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as SourceManifest;
}

export function runFullAudit(repoRoot: string, pr1Root = process.env['POSE_MATERIAL_PR1_ROOT'] ?? '/tmp/pr1'): PoseMaterialAuditResult {
  const manifest = readSourceManifest(repoRoot);
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
  return runPoseMaterialAudit({
    repoRoot,
    rootByGroup: { repo: repoRoot, pr1: pr1Root },
    masterPath: manifest.master.relativePath,
    personaId: tuning.personaId,
    tuning,
    rig: applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning),
    sources: [manifest.master, ...manifest.sources],
    pixelsPerRigUnit: 3.628,
  });
}

export function emitBackdropRow(repoRoot: string): { readonly r: number; readonly g: number; readonly b: number } {
  const plate = readImageFile(path.join(repoRoot, 'src/images/photoreal-female/01-master-lateral-profile-reference.png'));
  const model = estimateBackdropModel(plate);
  const row = backdropRow(model, Math.round(plate.height / 2));
  return { r: row.r, g: row.g, b: row.b };
}

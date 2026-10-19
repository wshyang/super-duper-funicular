import fs from 'node:fs';
import path from 'node:path';
import { PHOTOREAL_ASSET_TUNING_DEFAULTS, applyAssetTuningToRigSpec, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import { harvestMaterial, type MaterialHarvestSource } from '../src/pipeline/pose-material-bank.js';

interface Manifest {
  readonly master: { readonly sourceId: string; readonly group: string; readonly relativePath: string; readonly declaredPhase: number };
  readonly sources: readonly MaterialHarvestSource[];
}

function parseArgs(argv: readonly string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args[match[1] ?? ''] = match[2] ?? '';
  }
  return args;
}

interface AuditedSource {
  readonly sourceId: string;
  readonly status: string;
  readonly poseMatchRatio: number;
  readonly wardrobe: 'clothed' | 'anatomy-study';
  readonly parts: ReadonlyArray<{ readonly partId: string; readonly eligible: boolean }>;
}

function readAudit(auditPath: string): Map<string, AuditedSource> | null {
  if (!fs.existsSync(auditPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(auditPath, 'utf8')) as { report: { sources: ReadonlyArray<AuditedSource> } };
  return new Map(parsed.report.sources.map((source) => [source.sourceId, source]));
}

/** Joins the manifest with the audit's per-part verdicts; the audit is optional. */
function buildSources(manifest: Manifest, audit: Map<string, AuditedSource> | null): MaterialHarvestSource[] {
  return [manifest.master, ...manifest.sources].map((entry) => {
    const audited = audit?.get(entry.sourceId);
    return {
      sourceId: entry.sourceId,
      group: entry.group,
      relativePath: entry.relativePath,
      declaredPhase: entry.declaredPhase,
      accepted: audited ? audited.status !== 'rejected' : false,
      poseMatchRatio: audited?.poseMatchRatio ?? 0,
      eligibleParts: audited?.parts.filter((part) => part.eligible).map((part) => part.partId) as never,
      wardrobe: audited?.wardrobe,
    };
  });
}

function main(): void {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const pr1Root = args['pr1-root'] ?? '/tmp/pr1';
  const auditPath = args.audit ?? path.join(repoRoot, 'public/sprites/material/audit.json');
  const outputDirectory = args.out ?? path.join(repoRoot, 'src/images/pose-material/bank');
  const audit = readAudit(auditPath);
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/images/pose-material/sources.json'), 'utf8')) as Manifest;
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
  const sources = buildSources(manifest, audit);
  const outcome = harvestMaterial({
    repoRoot,
    rootByGroup: { repo: repoRoot, pr1: pr1Root },
    masterSourceId: manifest.master.sourceId,
    personaId: tuning.personaId,
    rig: applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning),
    tuning,
    outputDirectory,
    sources,
  });
  const bankPath = path.join(repoRoot, 'src/images/pose-material/bank.json');
  fs.writeFileSync(bankPath, `${JSON.stringify(outcome.bank, null, 2)}\n`);
  process.stdout.write(`Wrote ${outcome.bank.materials.length} materials to ${outputDirectory}\n`);
  process.stdout.write(`Rejected ${outcome.rejected.length} part attempts\n`);
  const byPart = new Map<string, number>();
  for (const material of outcome.bank.materials) byPart.set(material.partId, (byPart.get(material.partId) ?? 0) + 1);
  for (const [part, count] of [...byPart.entries()].sort()) process.stdout.write(`  ${part}: ${count}\n`);
  fs.writeFileSync(path.join(repoRoot, 'src/images/pose-material/harvest-report.json'), `${JSON.stringify(outcome.rejected, null, 2)}\n`);
}

main();

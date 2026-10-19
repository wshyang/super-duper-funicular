import fs from 'node:fs';
import path from 'node:path';
import { PHOTOREAL_ASSET_TUNING_DEFAULTS, applyAssetTuningToRigSpec, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import {
  runPoseMaterialAudit,
  type PoseMaterialSourceDeclaration,
} from '../src/pipeline/pose-material-audit.js';
import {
  renderPoseMaterialMarkdown,
  writePoseMaterialReport,
} from '../src/pipeline/pose-material-report.js';

interface SourceManifest {
  readonly master: PoseMaterialSourceDeclaration;
  readonly sources: readonly PoseMaterialSourceDeclaration[];
}

const PIXELS_PER_RIG_UNIT = 3.628;

function readManifest(repoRoot: string): SourceManifest {
  const manifestPath = path.join(repoRoot, 'src/images/pose-material/sources.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as SourceManifest;
}

function parseArgs(argv: readonly string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args[match[1] ?? ''] = match[2] ?? '';
  }
  return args;
}

function main(): void {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const pr1Root = args['pr1-root'] ?? '/tmp/pr1';
  const outDir = args.out ?? path.join(repoRoot, 'docs');
  const jsonPath = args.json ?? path.join(repoRoot, 'public/sprites/material/audit.json');
  const manifest = readManifest(repoRoot);
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
  const result = runPoseMaterialAudit({
    repoRoot,
    rootByGroup: { repo: repoRoot, pr1: pr1Root },
    masterPath: manifest.master.relativePath,
    personaId: tuning.personaId,
    tuning,
    rig: applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning),
    sources: [manifest.master, ...manifest.sources],
    pixelsPerRigUnit: PIXELS_PER_RIG_UNIT,
  });
  writePoseMaterialReport(result, { outDir, jsonPath });
  const markdown = renderPoseMaterialMarkdown(result);
  process.stdout.write(markdown.split('\n').slice(0, 40).join('\n'));
  process.stdout.write('\n...\n');
}

main();

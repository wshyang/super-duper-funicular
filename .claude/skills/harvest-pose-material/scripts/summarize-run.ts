/**
 * Writes the run report required by the skill's output format.
 *
 * Usage:
 *   npx tsx .claude/skills/harvest-pose-material/scripts/summarize-run.ts \
 *     [--repo=.] [--out=docs/POSE_MATERIAL_RUN.md]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  type AuditReport,
  type BankFile,
  type DemoReport,
  type HarvestRejection,
  countBy,
  fixed,
  mdTable,
  parseFlags,
  readJson,
  resolvePaths,
} from './lib.js';

function gitCommit(repoRoot: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function corpusSection(audit: AuditReport): string {
  const sources = audit.report.sources;
  const byStatus = countBy(sources, (source) => source.status);
  const byRole = countBy(sources, (source) => source.role);
  const rows = [
    ['sources', String(sources.length)],
    ['master / pose-bank / phase', `${byRole['master'] ?? 0} / ${byRole['pose-bank'] ?? 0} / ${byRole['phase-harvest'] ?? 0}`],
    ['accepted / conditional / rejected', `${byStatus['accepted'] ?? 0} / ${byStatus['conditional'] ?? 0} / ${byStatus['rejected'] ?? 0}`],
    ['angle buckets', String(audit.report.buckets.length)],
    ['material gaps', `${audit.report.gaps.length} of 128`],
    ['mean silhouette IoU', fixed(audit.diversity?.meanPairIou ?? Number.NaN)],
    ['duplicate pairs', String(audit.diversity?.duplicatePairs.length ?? 0)],
  ];
  return `${mdTable(['quantity', 'value'], rows)}\n`;
}

function bucketSection(audit: AuditReport): string {
  const rows = [...audit.report.buckets]
    .sort((a, b) => (a.partId === b.partId ? a.bucketDeg - b.bucketDeg : a.partId.localeCompare(b.partId)))
    .map((bucket) => [bucket.partId, `${bucket.bucketDeg}°`, String(bucket.sources.length), bucket.sources.join(', ')]);
  return `### Angle buckets\n\n${mdTable(['part', 'bucket', 'sources', 'supplied by'], rows)}\n`;
}

function materialSection(bank: BankFile): string {
  const rows = bank.materials.map((material) => [
    material.partId,
    `${material.measuredAngleDeg}°`,
    `${material.bucketDeg}°`,
    fixed(material.skinFraction ?? Number.NaN, 2),
    fixed(material.roundTrip?.alphaIou ?? Number.NaN, 3),
    fixed(material.roundTrip?.meanColorDelta ?? Number.NaN, 2),
    material.sourceId,
  ]);
  return `## 2. Materials (${bank.materials.length})\n\n${mdTable(
    ['part', 'measured', 'bucket', 'skin', 'α-IoU', 'Δcolour', 'source'],
    rows,
  )}\n`;
}

function rejectionSection(rejections: readonly HarvestRejection[]): string {
  const counts = countBy(rejections, (item) => item.reason.split(':')[0] ?? 'unknown');
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => [reason, String(count)]);
  return `## 3. Rejections (${rejections.length})\n\n${mdTable(['reason', 'count'], rows)}\n`;
}

function cycleSection(demo: DemoReport | null): string {
  if (!demo) return '## 4. Cycle\n\nNot rendered in this run.\n';
  const rows = [
    ['frames', String(demo.framesRendered), '= 16', demo.framesRendered === 16],
    ['detached islands', String(demo.detachedIslands), '= 0', demo.detachedIslands === 0],
    ['material-induced ground Δ', `${demo.groundDeltaMaxPx} px`, '≤ 2 px', demo.groundDeltaMaxPx <= 2],
    ['mean pairwise IoU', fixed(demo.meanPairIou), '≤ 0.85', demo.meanPairIou <= 0.85],
    ['worst pair IoU', fixed(demo.maxPairIou), '≤ 0.95', demo.maxPairIou <= 0.95],
    ['half-cycle IoU', fixed(demo.halfCycleIou), '≤ 0.90', demo.halfCycleIou <= 0.90],
  ].map(([name, value, limit, ok]) => [String(name), String(value), String(limit), ok === true ? 'pass' : '**fail**']);
  if (demo.stanceSoleSpreadPx !== undefined) {
    rows.push(['stance sole spread', `${demo.stanceSoleSpreadPx} px`, 'rig-owned', 'n/a']);
  }
  return `## 4. Cycle\n\n${mdTable(['metric', 'value', 'limit', 'verdict'], rows)}\n`;
}

function gapSection(audit: AuditReport): string {
  const byPart = new Map<string, number[]>();
  for (const gap of audit.report.gaps) {
    const phases = byPart.get(gap.partId) ?? [];
    phases.push(gap.phaseIndex);
    byPart.set(gap.partId, phases);
  }
  const rows = [...byPart.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([part, phases]) => [part, String(phases.length), [...new Set(phases)].sort((a, b) => a - b).join(', '), 'TODO']);
  return `## 7. Gap classification\n\nFill the last column from \`references/objective-register.md\`:
**pose gap** (visible somewhere, angle missing) or **camera gap** (occluded from this
viewpoint for every pose). Only pose gaps may enter a generation queue.\n\n${mdTable(
    ['part', 'gaps', 'phases', 'class'],
    rows,
  )}\n`;
}

function buildReport(repoRoot: string, audit: AuditReport, bank: BankFile, rejections: readonly HarvestRejection[], demo: DemoReport | null): string {
  return [
    '# Pose-Material Run',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Commit: \`${gitCommit(repoRoot)}\``,
    `Audit: \`${audit.report.generatedAt}\``,
    '',
    '## 1. Corpus and audit',
    '',
    'Produced by `npm run pose-material:audit` → `:harvest` → `:demo`.',
    '',
    corpusSection(audit),
    bucketSection(audit),
    materialSection(bank),
    rejectionSection(rejections),
    cycleSection(demo),
    '## 6. Visual review',
    '',
    'Inspect `/tmp/pose-material-demo/contact-sheet-material.png` and record what it',
    'actually shows. Metrics can pass while the picture is wrong.',
    '',
    gapSection(audit),
    '## 8. Decision',
    '',
    'Record the `TURN-LNN` / `ADD-NNN` entries, or state "no change; measured only".',
    '',
  ].join('\n');
}

function main(): void {
  const flags = parseFlags(process.argv.slice(2));
  const paths = resolvePaths(flags);
  const audit = readJson<AuditReport>(paths.audit, 'audit report');
  const bank = readJson<BankFile>(paths.bank, 'material bank');
  const rejections = fs.existsSync(paths.harvest) ? readJson<HarvestRejection[]>(paths.harvest, 'harvest report') : [];
  const demo = fs.existsSync(paths.demo) ? readJson<DemoReport>(paths.demo, 'demo report') : null;
  const markdown = buildReport(paths.repoRoot, audit, bank, rejections, demo);
  const out = flags.out ?? path.join(paths.repoRoot, 'docs/POSE_MATERIAL_RUN.md');
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), markdown);
  process.stdout.write(`Wrote ${out}\n`);
}

main();

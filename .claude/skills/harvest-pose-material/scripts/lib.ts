import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface GateResult {
  readonly id: string;
  readonly title: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface AuditSourcePart {
  readonly partId: string;
  readonly eligible: boolean;
  readonly reasonCodes: readonly string[];
}

export interface AuditSource {
  readonly sourceId: string;
  readonly sha256: string;
  readonly role: 'master' | 'pose-bank' | 'phase-harvest';
  readonly wardrobe: 'clothed' | 'anatomy-study';
  readonly fringeRatio: number;
  readonly interiorLeakRatio: number;
  readonly magentaLeakPixels: number;
  readonly poseMatchRatio: number;
  readonly status: 'accepted' | 'conditional' | 'rejected' | 'material-gap';
  readonly parts: readonly AuditSourcePart[];
}

export interface AuditReport {
  readonly report: {
    readonly generatedAt: string;
    readonly sources: readonly AuditSource[];
    readonly buckets: readonly { partId: string; bucketDeg: number; sources: readonly string[] }[];
    readonly gaps: readonly {
      partId: string;
      phaseIndex: number;
      targetAngleDeg: number;
      targetBucketDeg: number;
      reason: string;
    }[];
  };
  readonly diversity?: { readonly meanPairIou: number; readonly duplicatePairs: readonly unknown[] };
}

export interface BankMaterial {
  readonly materialId: string;
  readonly partId: string;
  readonly sourceId: string;
  readonly sourceSha256: string;
  readonly measuredAngleDeg: number;
  readonly bucketDeg: number;
  readonly visibility: number;
  readonly sideProvenance: string;
  readonly skinFraction?: number;
  readonly roundTrip?: { alphaIou: number; meanColorDelta: number; passed: boolean };
  readonly cutoutPath: string;
  readonly cutoutSha256: string;
}

export interface BankFile {
  readonly schemaVersion: number;
  readonly personaId: string;
  readonly materials: readonly BankMaterial[];
}

export interface HarvestRejection {
  readonly sourceId: string;
  readonly partId: string;
  readonly reason: string;
}

export interface DemoReport {
  readonly framesRendered: number;
  readonly detachedIslands: number;
  readonly groundDeltaMaxPx: number;
  readonly stanceSoleSpreadPx?: number;
  readonly meanPairIou: number;
  readonly maxPairIou: number;
  readonly halfCycleIou: number;
  readonly covered: Record<string, number>;
  readonly gaps: readonly unknown[];
}

export interface RunPaths {
  readonly repoRoot: string;
  readonly audit: string;
  readonly bank: string;
  readonly harvest: string;
  readonly demo: string;
  readonly pr1Root: string;
}

export const DEFAULTS = {
  audit: 'public/sprites/material/audit.json',
  bank: 'src/images/pose-material/bank.json',
  harvest: 'src/images/pose-material/harvest-report.json',
  demo: path.join('/tmp', 'pose-material-demo', 'material-demo-report.json'),
  pr1Root: '/tmp/pr1',
} as const;

export function readJson<T>(file: string, label: string): T {
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing ${label}: ${file}\nRun \`bash .claude/skills/harvest-pose-material/scripts/run-pipeline.sh\` first.`,
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function sha256File(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function parseFlags(argv: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) flags[match[1] ?? ''] = match[2] ?? '';
  }
  return flags;
}

export function resolvePaths(flags: Record<string, string>): RunPaths {
  const repoRoot = path.resolve(flags.repo ?? process.cwd());
  return {
    repoRoot,
    audit: path.resolve(repoRoot, flags.audit ?? DEFAULTS.audit),
    bank: path.resolve(repoRoot, flags.bank ?? DEFAULTS.bank),
    harvest: path.resolve(repoRoot, flags.harvest ?? DEFAULTS.harvest),
    demo: path.resolve(repoRoot, flags.demo ?? DEFAULTS.demo),
    pr1Root: path.resolve(flags['pr1-root'] ?? DEFAULTS.pr1Root),
  };
}

export function formatGate(gate: GateResult): string {
  const status = gate.ok ? 'PASS' : 'FAIL';
  return `${gate.ok ? '  ok ' : '  !! '}${gate.id.padEnd(3)} ${status.padEnd(5)} ${gate.title.padEnd(26)} ${gate.detail}`;
}

export function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const name = key(item);
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

export function mdTable(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const head = `| ${headers.join(' | ')} |`;
  const rule = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return `${head}\n${rule}\n${body}`;
}

export function fixed(value: number, digits = 3): string {
  return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

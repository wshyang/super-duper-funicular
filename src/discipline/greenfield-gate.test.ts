import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

function measureFunctionLengths(sourceText: string): Array<{ name: string; lines: number }> {
  const lines = sourceText.split('\n');
  const results: Array<{ name: string; lines: number }> = [];
  const fnPattern = /^(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/;
  for (let i = 0; i < lines.length; i++) {
    const match = fnPattern.exec(lines[i] ?? '');
    if (match) {
      const span = findClosingBraceLine(lines, i) - i + 1;
      results.push({ name: match[1] ?? 'anonymous', lines: span });
    }
  }
  return results;
}

function findClosingBraceLine(lines: readonly string[], startLine: number): number {
  let depth = 0;
  let opened = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const ch of line) {
      if (ch === '{') {
        depth++;
        opened = true;
      } else if (ch === '}') {
        depth--;
        if (opened && depth === 0) {
          return i;
        }
      }
    }
  }
  return lines.length - 1;
}

describe('GREENFIELD.md Coding Discipline Automated Gates', () => {
  const repoRoot = process.cwd();

  it('verifies the adopted discipline corpus, living specs, and design-of-record docs exist', () => {
    const requiredDocs = [
      'GREENFIELD.md',
      'docs/greenfield/GREENFIELD.md',
      'FDS_BUILDER.md',
      'CLAUDE.md',
      'CLAUDE-decisions.md',
      'CLAUDE-testing.md',
      'CLAUDE-database.md',
      'CLAUDE-conventions.md',
      'CLAUDE-function-design.md',
      'CLAUDE-validation.md',
      'CLAUDE-deployment.md',
      'CLAUDE-checklist.md',
      'docs/FDS.md',
      'docs/SPEC.md',
      'docs/ADDENDA.md',
      'docs/VALIDATION.md',
      'docs/PIPELINE_REVISION_PROPOSAL.md',
      'docs/BRANCH_ASSESSMENT_PR1_PR8.md',
      'src/images/manifest.json',
      '.claude/skills/audit-gait-cycle/SKILL.md',
    ];
    for (const rel of requiredDocs) {
      expect(fs.existsSync(path.join(repoRoot, rel)), `Missing ${rel}`).toBe(true);
    }
    const claudeMd = fs.readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8');
    const fdsMd = fs.readFileSync(path.join(repoRoot, 'docs/FDS.md'), 'utf8');
    const proposalMd = fs.readFileSync(
      path.join(repoRoot, 'docs/PIPELINE_REVISION_PROPOSAL.md'),
      'utf8',
    );
    const assessmentMd = fs.readFileSync(
      path.join(repoRoot, 'docs/BRANCH_ASSESSMENT_PR1_PR8.md'),
      'utf8',
    );
    expect(claudeMd).toContain('#image-prompt-log');
    expect(claudeMd).toContain('Post-Generation Asset Examination');
    expect(claudeMd).toContain('Regeneration Justification');
    expect(claudeMd).toContain('#continuous-learning-log');
    expect(fdsMd).toContain('#image-prompt-log');
    expect(fdsMd).toContain('#continuous-learning-log');
    expect(fdsMd).toMatch(/TURN-L\d{2}/);
    expect(proposalMd).toContain('#revised-pipeline');
    expect(proposalMd).toContain('IMG-ERR-01');
    expect(proposalMd).toContain('PIPE-ERR-08');
    expect(assessmentMd).toContain('936f37ce07f18e38fc4f5b3880c80029ec9f55cf');
    expect(assessmentMd).toContain('04d5caf432ff81be0307a3ec79e894da1b60045c');
    expect(assessmentMd).toContain('#branch-assessment');
  });

  it('enforces sequential ADD-NNN numbering in docs/ADDENDA.md without gaps', () => {
    const addenda = fs.readFileSync(path.join(repoRoot, 'docs/ADDENDA.md'), 'utf8');
    const ids = [...addenda.matchAll(/^## `ADD-(\d+)`/gm)].map((m) => Number(m[1]));
    expect(ids.length, 'ADDENDA must contain at least ADD-001').toBeGreaterThan(0);
    ids.forEach((id, index) => {
      expect(id, `ADDENDA numbering gap before ADD-${id}`).toBe(index + 1);
    });
  });

  it('verifies every filed asset in src/images/manifest.json exists and matches its SHA-256', () => {
    const manifestPath = path.join(repoRoot, 'src/images/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      assets: Array<{ path: string; sha256: string }>;
    };
    for (const asset of manifest.assets) {
      const full = path.join(repoRoot, asset.path);
      expect(fs.existsSync(full), `Missing filed asset ${asset.path}`).toBe(true);
      const digest = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      expect(digest, `SHA-256 drift for ${asset.path}`).toBe(asset.sha256);
    }
  });

  it('enforces file <= 800 LOC and named function <= 50 LOC across all TypeScript files', () => {
    const files = [
      ...collectSourceFiles(path.join(repoRoot, 'src')),
      ...collectSourceFiles(path.join(repoRoot, 'scripts')),
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lineCount = content.split('\n').length;
      expect(lineCount, `${file} exceeds 800 LOC`).toBeLessThanOrEqual(800);
      for (const fn of measureFunctionLengths(content)) {
        expect(
          fn.lines,
          `Function ${fn.name} in ${path.relative(repoRoot, file)} is ${fn.lines} lines (> 50)`,
        ).toBeLessThanOrEqual(50);
      }
    }
  });

  it('enforces presentation-only JSX interior and data-testid attributes on components', () => {
    const compDir = path.join(repoRoot, 'src/app/components');
    const tsxFiles = collectSourceFiles(compDir).filter((f) => f.endsWith('.tsx'));
    const bannedInJsx = /\.(filter|reduce|sort|find|some|every|toFixed)\(|new Date\(|JSON\.parse\(/;
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('data-testid=');
      const returns = content.split('return (').slice(1);
      for (const block of returns) {
        expect(bannedInJsx.test(block), `Banned derivation in JSX of ${file}`).toBe(false);
      }
    }
  });

  it('verifies Dockerfile contract (0.0.0.0:3000, numeric non-root USER, HEALTHCHECK)', () => {
    const dockerfile = fs.readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8');
    expect(dockerfile).toContain('PORT=3000');
    expect(dockerfile).toContain('0.0.0.0');
    expect(dockerfile).toContain('USER 1001:1001');
    expect(dockerfile).toContain('HEALTHCHECK');
  });

  it('activates inert .shiphats files cleanly in a scratch directory using activate-shiphats.sh', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiphats-test-'));
    const inertFiles = [
      '.gitlab-ci.yml.shiphats',
      '.gitlab/ci/pipeline.gitlab-ci.yml.shiphats',
      'sonar-project.properties.shiphats',
      '.gitlab/CODEOWNERS.shiphats',
      '.gitlab/merge_request_templates/Default.md.shiphats',
    ];
    for (const rel of inertFiles) {
      const dst = path.join(tmpDir, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(path.join(repoRoot, rel), dst);
    }
    const scriptPath = path.join(repoRoot, 'activate-shiphats.sh');
    execFileSync('/bin/bash', [scriptPath, '--non-interactive', '--root', tmpDir]);
    for (const rel of inertFiles) {
      const activePath = path.join(tmpDir, rel.replace(/\.shiphats$/, ''));
      expect(fs.existsSync(activePath)).toBe(true);
      const rendered = fs.readFileSync(activePath, 'utf8');
      expect(rendered).not.toContain('@@SHIPHATS_');
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

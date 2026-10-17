import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
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

  it('verifies CLAUDE.md index, split CLAUDE-*.md files, FDS.md, and ADDENDA.md exist', () => {
    const requiredDocs = [
      'GREENFIELD.md',
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
      'docs/ADDENDA.md',
      'docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md',
    ];
    for (const rel of requiredDocs) {
      expect(fs.existsSync(path.join(repoRoot, rel)), `Missing ${rel}`).toBe(true);
    }
    const claudeMd = fs.readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8');
    const fdsMd = fs.readFileSync(path.join(repoRoot, 'docs/FDS.md'), 'utf8');
    expect(claudeMd).toContain('#image-prompt-log');
    expect(claudeMd).toContain('Regeneration Justification');
    expect(fdsMd).toContain('Call `#01`');
    expect(fdsMd).toContain('Call `#21`');
    expect(fdsMd).toContain('Regeneration Justification:');
    expect(fdsMd).toContain('#svg-vector-assessment');
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

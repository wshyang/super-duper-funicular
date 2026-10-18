import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const SESSION_BRANCH = 'arena/5ae6f17a-super-duper-funicular';

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const abs = join(ROOT, dir, entry);
    if (statSync(abs).isDirectory()) listSourceFiles(join(dir, entry), acc);
    else if (entry.endsWith('.ts')) acc.push(join(dir, entry));
  }
  return acc;
}

function topLevelFunctionSpans(source: string): number[] {
  const lines = source.split('\n');
  const starts: number[] = [];
  const decl = /^(export\s+)?(async\s+)?(function\s+\w+|const\s+\w+\s*=\s*(\(|async\s*\())/;
  lines.forEach((line, i) => {
    if (decl.test(line)) starts.push(i);
  });
  return starts.map((start) => {
    let end = lines.length - 1;
    for (let i = start + 1; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      if (/^};?$/.test(line)) { end = i; break; }
    }
    return end - start + 1;
  });
}

describe('Greenfield discipline gate (documentation & code invariants, ADD-006)', () => {
  it('preserves the verbatim upstream discipline corpus', () => {
    expect(read('GREENFIELD.md')).toContain('# GREENFIELD.md — CLAUDE.md template for new projects');
    expect(read('GREENFIELD.md')).toContain('## 10. Deployment and CI/CD from day one');
    expect(read('FDS_BUILDER.md')).toContain('# FUNCTIONAL DESIGN SPEC — CONSTRUCTION GUIDE');
  });

  it('keeps the CLAUDE.md index bound to the active session branch with all six core rules', () => {
    const index = read('CLAUDE.md');
    expect(index).toContain(SESSION_BRANCH);
    for (const rule of [
      'Record Every Decision Up Front',
      'Mandatory Image Generation Prompt Log',
      'Continuous Per-Turn Learning',
      'Real Tests First',
      'Strict Function, Module, and Frontend Design',
      'Full-Cycle Visual Audit',
    ]) expect(index).toContain(rule);
    for (const section of ['CLAUDE-decisions.md', 'CLAUDE-testing.md', 'CLAUDE-validation.md', 'CLAUDE-function-design.md']) {
      expect(existsSync(join(ROOT, section)), section).toBe(true);
    }
  });

  it('keeps the living FDS prompt log and a non-empty continuous learning register', () => {
    const fds = read('docs/FDS.md');
    expect(fds).toContain('#image-prompt-log');
    expect(fds).toContain('#continuous-learning-log');
    expect(fds).toMatch(/TURN-L\d+/);
  });

  it('keeps the addenda register sequentially numbered without gaps', () => {
    const nums = [...read('docs/ADDENDA.md').matchAll(/^## `ADD-(\d+)`/gm)].map((m) => Number(m[1]));
    expect(nums.length).toBeGreaterThan(0);
    nums.forEach((n, i) => expect(n, `ADD gap at index ${i}`).toBe(i + 1));
  });

  it('keeps the design & assessment records present', () => {
    for (const doc of ['docs/PIPELINE_REV2.md', 'docs/BRANCH_ASSESSMENT.md', 'docs/VALIDATION.md', 'docs/SPEC.md']) {
      expect(read(doc).length, doc).toBeGreaterThan(500);
    }
  });

  it('enforces file and function size limits on source files', () => {
    for (const file of listSourceFiles('src')) {
      const source = read(file);
      expect(source.split('\n').length, `${file} <= 800 LOC`).toBeLessThanOrEqual(800);
      for (const span of topLevelFunctionSpans(source)) {
        expect(span, `${file} function <= 50 LOC`).toBeLessThanOrEqual(50);
      }
    }
  });
});

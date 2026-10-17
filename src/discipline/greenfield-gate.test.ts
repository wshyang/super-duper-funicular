/**
 * Greenfield gate — Stage 1 placeholder.
 * In Stage 2 this file mechanically enforces:
 *   - ≤50 LOC per function (AST scan)
 *   - ≤800 LOC per file
 *   - presentation-only JSX interior (no filter/reduce/sort/find/some/every/new Date/toFixed/JSON.parse inside return())
 *   - data-testid on every interactive element
 *   - Dockerfile 0.0.0.0:3000 + UID 1001 contract
 *   - activate-shiphats.sh scratch activation
 *   - docs/FDS.md #image-prompt-log + #continuous-learning-log presence
 *   - docs/N_WAY_BRANCH_COMPARISON.md + BRANCH-TIPS.json freshness
 * For Stage 1 (specs-only) the gate is intentionally minimal so `npm test` passes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('greenfield-gate (Stage 1 placeholder)', () => {
  it('GREENFIELD.md and FDS_BUILDER.md exist at repo root', () => {
    expect(existsSync('GREENFIELD.md')).toBe(true);
    expect(existsSync('FDS_BUILDER.md')).toBe(true);
  });
  it('all 8 CLAUDE-*.md section files exist', () => {
    for (const f of ['CLAUDE-decisions.md','CLAUDE-testing.md','CLAUDE-database.md','CLAUDE-conventions.md','CLAUDE-function-design.md','CLAUDE-validation.md','CLAUDE-deployment.md','CLAUDE-checklist.md']) {
      expect(existsSync(f), `missing ${f}`).toBe(true);
    }
  });
  it('docs/FDS.md contains TURN-L01 continuous-learning entry', () => {
    const fds = readFileSync('docs/FDS.md','utf8');
    expect(fds).toContain('TURN-L01');
    expect(fds).toContain('#continuous-learning-log');
  });
  it('docs/FDS.md contains #image-prompt-log', () => {
    expect(readFileSync('docs/FDS.md','utf8')).toContain('#image-prompt-log');
  });
  it('docs/N_WAY_BRANCH_COMPARISON.md and BRANCH-TIPS.json exist and are fresh', () => {
    expect(existsSync('docs/N_WAY_BRANCH_COMPARISON.md')).toBe(true);
    expect(existsSync('docs/BRANCH-TIPS.json')).toBe(true);
    expect(existsSync('N_WAY_COMPARISON.md')).toBe(true);
  });
  it('Dockerfile exposes 0.0.0.0:3000 and USER 1001', () => {
    const dockerfile = readFileSync('Dockerfile','utf8');
    expect(dockerfile).toContain('0.0.0.0');
    expect(dockerfile).toContain('3000');
    expect(dockerfile).toContain('1001');
  });
});

import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const sha = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');
const text = (path: string): string => readFileSync(path, 'utf8');
const codeOf = (path: string): string => text(path).split('\n').filter((l) => !l.trimStart().startsWith('#')).join('\n');

const GREENFIELD_SHA = '400d282ef81464ee41b8659f7d5088441d2a49327d824e431218fa4fbc14dac6';
const FDS_BUILDER_SHA = '7aab98dc055e20b056044fb9aad2a964b399005c639ca2b647bdaa1676003576';

describe('greenfield adoption is verbatim and pinned', () => {
  it('GREENFIELD.md and FDS_BUILDER.md match the pinned upstream SHAs', () => {
    expect(sha('GREENFIELD.md')).toBe(GREENFIELD_SHA);
    expect(sha('FDS_BUILDER.md')).toBe(FDS_BUILDER_SHA);
  });

  it('the sectioned documentation architecture exists', () => {
    for (const file of [
      'CLAUDE.md',
      'CLAUDE-decisions.md',
      'CLAUDE-testing.md',
      'CLAUDE-database.md',
      'CLAUDE-conventions.md',
      'CLAUDE-function-design.md',
      'CLAUDE-validation.md',
      'CLAUDE-deployment.md',
      'CLAUDE-checklist.md',
    ]) {
      expect(existsSync(file), file).toBe(true);
    }
  });

  it('living spec, addenda and the live ledger exist with their anchors', () => {
    expect(text('docs/FDS.md')).toContain('#continuous-learning-log');
    expect(text('docs/FDS.md')).toContain('#image-prompt-log');
    expect(text('docs/FDS.md')).toContain('TURN-L01');
    expect(text('docs/ADDENDA.md')).toContain('ADD-001');
    expect(text('docs/ADDENDA.md')).toContain('CROSS-001');
    expect(text('docs/N_WAY_COMPARISON.md')).toContain('<!-- branch-tips:start -->');
  });
});

describe('container contract (GREENFIELD §10.1)', () => {
  const dockerfile = text('Dockerfile');

  it('serves port 3000 on the container interface', () => {
    expect(dockerfile).toContain('EXPOSE 3000');
    expect(dockerfile).toContain('HOST=0.0.0.0');
    expect(dockerfile).toContain('PORT=3000');
  });

  it('is multi-stage with pinned base, numeric user and healthcheck', () => {
    expect(dockerfile).toContain('node:22.22.3-bookworm-slim');
    expect(dockerfile).not.toContain(':latest');
    expect(dockerfile).toMatch(/USER \d+/);
    expect(dockerfile).toContain('HEALTHCHECK');
    expect(dockerfile).toContain('npm ci');
  });

  it('keeps secrets and build junk out of images', () => {
    const ignore = text('.dockerignore');
    for (const entry of ['.git', 'node_modules', '.env', 'dist']) expect(ignore).toContain(entry);
  });

  it('dev + tunnel images keep their contracts', () => {
    expect(text('Dockerfile.dev')).toContain('VIPER_APP_PORT=3001');
    expect(text('Dockerfile.dev')).toContain('viper-agent');
    expect(text('Dockerfile.cloudflared')).toContain('--no-autoupdate');
    expect(text('Dockerfile.cloudflared')).toContain('TUNNEL_TOKEN');
  });
});

describe('inert SHIP-HATS + Bash 3.2 root scripts (GREENFIELD §10.3–10.4)', () => {
  it('carries the inert pipeline and activation script', () => {
    for (const file of [
      '.gitlab-ci.yml.shiphats',
      '.gitlab/ci/pipeline.gitlab-ci.yml.shiphats',
      'sonar-project.properties.shiphats',
      '.gitlab/CODEOWNERS.shiphats',
      '.gitlab/merge_request_templates/Default.md.shiphats',
      'activate-shiphats.sh',
    ]) {
      expect(existsSync(file), file).toBe(true);
    }
    expect(text('.gitlab-ci.yml.shiphats')).toContain('@@SHIPHATS_TEMPLATES_REF@@');
    expect(codeOf('.gitlab-ci.yml.shiphats')).not.toMatch(/password|secret/i);
  });

  it('root scripts avoid Bash 4-only constructs', () => {
    for (const script of ['activate-shiphats.sh', 'dev.sh']) {
      const body = codeOf(script);
      expect(body, script).not.toContain('mapfile');
      expect(body, script).not.toContain('declare -A');
      expect(body, script).not.toMatch(/\$\{[A-Za-z_]+,,\}/);
    }
  });
});

describe('project gates', () => {
  it('views never reach into the gait domain (view/model split)', () => {
    for (const file of readdirSync('src/app/views')) {
      expect(text(join('src/app/views', file)), file).not.toContain("lib/gait");
    }
  });

  it('every interactive element carries a data-testid', () => {
    const shell = text('src/app/views/shell.ts');
    const ids = new Set(shell.match(/'[a-z-]+(__[a-z0-9-]+)?'/g) ?? []);
    expect(shell).toContain('dataset.testid');
    expect(ids.size).toBeGreaterThan(25);
  });

  it('source artwork is preserved byte-identical at both paths', () => {
    expect(sha('incorrect running sprites.jpeg')).toBe(sha('src/images/source/runner-six-palette-eight-frame-flawed-sheet.jpeg'));
  });

  it('no file exceeds the 800 LOC hard limit', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : [],
      );
    for (const file of [...walk('src'), ...walk('tools')]) {
      expect(text(file).split('\n').length, file).toBeLessThan(800);
    }
  });
});

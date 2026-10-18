import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { PARITY_ROWS } from '../../src/shared/parity.ts';

const ROOT = join(__dirname, '..', '..');

const walk = (directory: string, extensions: readonly string[]): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path, extensions));
    else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(path);
  }
  return files;
};

const sourceFiles = walk(join(ROOT, 'src'), ['.ts', '.tsx']);
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const parse = (path: string): ts.SourceFile => {
  const text = readFileSync(path, 'utf8');
  return ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
};

const lineOf = (source: ts.SourceFile, position: number): number =>
  source.getLineAndCharacterOfPosition(position).line + 1;

const lineSpan = (source: ts.SourceFile, node: ts.Node): number =>
  lineOf(source, node.getEnd()) - lineOf(source, node.getStart(source)) + 1;

const nameOf = (node: ts.Node): string => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  return '(anonymous)';
};

const FUNCTIONS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.MethodDeclaration,
]);

const functionDeclarations = (
  source: ts.SourceFile,
): { name: string; lines: number; line: number }[] => {
  const found: { name: string; lines: number; line: number }[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      FUNCTIONS.has(node.initializer.kind)
    ) {
      found.push({
        name: nameOf(node),
        lines: lineSpan(source, node.initializer),
        line: lineOf(source, node.getStart(source)),
      });
    } else if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.body) {
      found.push({
        name: nameOf(node),
        lines: lineSpan(source, node.body),
        line: lineOf(source, node.getStart(source)),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

const INTERACTIVE_TAGS = new Set(['button', 'input', 'select', 'textarea']);

const tagNameOf = (node: ts.JsxOpeningLikeElement): string =>
  ts.isIdentifier(node.tagName) ? node.tagName.text : node.tagName.getText();

const interactiveElements = (
  source: ts.SourceFile,
): { tag: string; line: number; hasTestId: boolean }[] => {
  const found: { tag: string; line: number; hasTestId: boolean }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagNameOf(node);
      if (INTERACTIVE_TAGS.has(tag)) {
        const hasTestId = node.attributes.properties.some(
          (property) =>
            ts.isJsxAttribute(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === 'data-testid',
        );
        found.push({ tag, line: lineOf(source, node.getStart(source)), hasTestId });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

const BANNED_JSX_CALLS = new Set([
  'filter',
  'reduce',
  'sort',
  'find',
  'some',
  'every',
  'toFixed',
  'parse',
  'parseInt',
  'parseFloat',
  'stringify',
]);

const jsxImpurities = (source: ts.SourceFile): { line: number; text: string }[] => {
  const found: { line: number; text: string }[] = [];
  const visit = (node: ts.Node, insideJsx: boolean): void => {
    const nowInsideJsx =
      insideJsx ||
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node) ||
      ts.isJsxExpression(node);
    if (insideJsx && ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee) && BANNED_JSX_CALLS.has(callee.name.text)) {
        found.push({
          line: lineOf(source, node.getStart(source)),
          text: node.getText(source).slice(0, 70),
        });
      }
    }
    if (insideJsx && ts.isNewExpression(node) && node.expression.getText(source) === 'Date') {
      found.push({ line: lineOf(source, node.getStart(source)), text: 'new Date()' });
    }
    ts.forEachChild(node, (child) => visit(child, nowInsideJsx));
  };
  visit(source, false);
  return found;
};

describe('GREENFIELD discipline gate', () => {
  it('keeps every file under the 800-line hard limit and 400-line target', () => {
    const offenders: string[] = [];
    const warn: string[] = [];
    for (const path of sourceFiles) {
      const count = readFileSync(path, 'utf8').split('\n').length;
      if (count > 800) offenders.push(`${relative(ROOT, path)} (${count})`);
      else if (count > 400) warn.push(`${relative(ROOT, path)} (${count})`);
    }
    expect(offenders).toEqual([]);
    expect(warn).toEqual([]);
  });

  it('keeps functions under the 50-line hard limit', () => {
    const offenders: string[] = [];
    for (const path of sourceFiles) {
      const source = parse(path);
      for (const fn of functionDeclarations(source)) {
        if (fn.lines > 50)
          offenders.push(`${relative(ROOT, path)}:${fn.line} :: ${fn.name} (${fn.lines} lines)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps JSX interiors presentation-only', () => {
    const offenders: string[] = [];
    for (const path of sourceFiles.filter((file) => file.endsWith('.tsx'))) {
      const source = parse(path);
      for (const impurity of jsxImpurities(source)) {
        offenders.push(`${relative(ROOT, path)}:${impurity.line} :: ${impurity.text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('gives every interactive element a testid', () => {
    const offenders: string[] = [];
    for (const path of sourceFiles.filter((file) => file.endsWith('.tsx'))) {
      const source = parse(path);
      for (const element of interactiveElements(source)) {
        if (!element.hasTestId)
          offenders.push(`${relative(ROOT, path)}:${element.line} :: <${element.tag}>`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('documents no server import in components', () => {
    const offenders = sourceFiles
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => /from ['"]node:/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });

  it('keeps the container contract at 0.0.0.0:3000 with a numeric user', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toMatch(/EXPOSE 3000/);
    expect(dockerfile).toMatch(/ENV[^\n]*HOST=0\.0\.0\.0/);
    expect(dockerfile).toMatch(/USER\s+1001:1001/);
    expect(dockerfile).toMatch(/HEALTHCHECK/);
    expect(dockerfile).toMatch(/FROM node:22\.\d+\.\d+-alpine/);
    expect(read('Dockerfile.dev')).toMatch(/VIPER_APP_PORT=3001/);
    expect(read('Dockerfile.cloudflared')).toMatch(/--no-autoupdate/);
    expect(read('.dockerignore')).toContain('node_modules');
    const ignored = read('.dockerignore')
      .split('\n')
      .map((line) => line.trim());
    expect(ignored).not.toContain('viper-agent');
  });

  it('keeps the SHIP-HATS pipeline inert and activatable', () => {
    expect(read('.gitlab-ci.yml.shiphats')).toMatch(/@@SHIPHATS_[A-Z_]+@@/);
    const script = read('activate-shiphats.sh');
    expect(script).toMatch(/--non-interactive/);
    expect(script).toMatch(/--force/);
    expect(script).not.toMatch(/mapfile|\$\{[a-z_]+,,\}/);
  });

  it('keeps the documented discipline files in place', () => {
    for (const file of [
      'CLAUDE.md',
      'CLAUDE-decisions.md',
      'CLAUDE-testing.md',
      'CLAUDE-function-design.md',
      'CLAUDE-conventions.md',
      'CLAUDE-validation.md',
      'CLAUDE-deployment.md',
      'CLAUDE-database.md',
      'CLAUDE-checklist.md',
      'CLAUDE-branches.md',
      'docs/FDS.md',
      'docs/ADDENDA.md',
      'docs/N_WAY_COMPARISON.md',
      'docs/VALIDATION.md',
      'docs/greenfield/GREENFIELD.md',
      'docs/greenfield/FDS_BUILDER.md',
    ]) {
      expect(read(file).length, file).toBeGreaterThan(200);
    }
  });

  it('keeps the n-way ledger in sync with the in-app parity matrix', () => {
    const ledger = read('docs/N_WAY_COMPARISON.md');
    for (const row of PARITY_ROWS) {
      expect(ledger, `missing capability: ${row.capability}`).toContain(row.capability);
    }
    const tips = JSON.parse(read('src/generated/branch-tips.json')) as {
      tips: { branch: string; hash: string }[];
    };
    expect(tips.tips.length).toBeGreaterThanOrEqual(5);
    for (const tip of tips.tips) {
      expect(tip.hash).toMatch(/^[0-9a-f]{40}$/);
      expect(ledger).toContain(tip.branch);
    }
  });

  it('records per-turn learning entries in the FDS', () => {
    const fds = read('docs/FDS.md');
    const entries = fds.match(/^### TURN-L\d+/gm) ?? [];
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(fds).toContain('Continuous learning register');
  });
});

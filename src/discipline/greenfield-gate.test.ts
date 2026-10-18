import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOTS = ['src', 'scripts'];
const MAX_FUNCTION_LINES = 50;
const MAX_FILE_LINES = 800;

function listSourceFiles(): string[] {
  const files: string[] = [];
  for (const root of ROOTS) {
    const absoluteRoot = path.resolve(root);
    for (const entry of walk(absoluteRoot)) {
      if (/\.tsx?$/.test(entry)) files.push(entry);
    }
  }
  return files;
}

function walk(directory: string): string[] {
  const entries: string[] = [];
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) entries.push(...walk(fullPath));
    else entries.push(fullPath);
  }
  return entries;
}

function countFunctionBodyLines(sourceFile: ts.SourceFile): { lines: number; name: string }[] {
  const measurements: { lines: number; name: string }[] = [];
  const visit = (node: ts.Node): void => {
    const body = functionBodyOf(node);
    if (body) {
      const start = ts.getLineAndCharacterOfPosition(sourceFile, body.getStart());
      const end = ts.getLineAndCharacterOfPosition(sourceFile, body.getEnd());
      measurements.push({ lines: end.line - start.line + 1, name: nodeName(node) });
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return measurements;
}

function functionBodyOf(node: ts.Node): ts.Block | ts.Expression | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node.body;
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return node.body;
  return undefined;
}

function nodeName(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.getText();
  if (ts.isMethodDeclaration(node) && node.name) return node.name.getText();
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent)) return parent.name.getText();
    if (ts.isPropertyAssignment(parent)) return parent.name.getText();
  }
  return '(anonymous)';
}

function booleanFlagParameters(sourceFile: ts.SourceFile): string[] {
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isParameter(node) && node.type && node.type.getText() === 'boolean') {
      if (!ts.isPropertySignature(node.parent)) {
        violations.push(node.name.getText());
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return violations;
}

describe('greenfield discipline gate', () => {
  const files = listSourceFiles();

  it('collects source files from src/ and scripts/', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('keeps every file at or below the 800-line hard limit', () => {
    const violations = files.filter((file) => fs.readFileSync(file, 'utf8').split('\n').length > MAX_FILE_LINES);
    expect(violations).toEqual([]);
  });

  it('keeps every function body at or below the 50-line hard limit (declarative test suites exempt)', () => {
    const violations: string[] = [];
    const productionFiles = files.filter((file) => !/\.test\.tsx?$/.test(file));
    for (const file of productionFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
      for (const measurement of countFunctionBodyLines(sourceFile)) {
        if (measurement.lines > MAX_FUNCTION_LINES) {
          violations.push(`${file}:${measurement.name}=${measurement.lines} lines`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('forbids boolean flag parameters in function signatures', () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
      for (const name of booleanFlagParameters(sourceFile)) {
        violations.push(`${file}:${name}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

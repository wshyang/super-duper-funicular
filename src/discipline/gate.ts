import fs from 'node:fs';
import path from 'node:path';

export interface GateViolation {
  readonly file: string;
  readonly rule: string;
  readonly detail: string;
}

export interface GateReport {
  readonly files: number;
  readonly violations: readonly GateViolation[];
}

const MAX_FILE_LINES = 800;
const MAX_FUNCTION_LINES = 50;
/** Modules that must stay deterministic: no clock, no randomness, no env. */
const PURE_DIRECTORIES = ['src/core', 'src/rig', 'src/atlas', 'src/control', 'src/analysis', 'src/profile', 'src/render'];
const BANNED_IN_PURE = /\b(Date\.now|Math\.random|process\.env|new Date\()/;

export function listSourceFiles(root: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

/** Length of the function whose opening brace is on `startLine`, by brace balance. */
export function functionLength(lines: readonly string[], startLine: number): number {
  let depth = 0;
  let opened = false;
  for (let i = startLine; i < lines.length; i++) {
    for (const character of lines[i] ?? '') {
      if (character === '{') {
        depth++;
        opened = true;
      } else if (character === '}') {
        depth--;
        if (opened && depth === 0) return i - startLine + 1;
      }
    }
  }
  return lines.length - startLine;
}

export function namedFunctionLengths(source: string): Array<{ name: string; lines: number }> {
  const lines = source.split('\n');
  const pattern = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*[(<]/;
  const results: Array<{ name: string; lines: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const match = pattern.exec(lines[i] ?? '');
    if (!match) continue;
    results.push({ name: match[1] ?? 'anonymous', lines: functionLength(lines, i) });
  }
  return results;
}

export function verifyAll(root = process.cwd()): GateReport {
  const files = listSourceFiles(path.join(root, 'src'));
  const violations: GateViolation[] = [];
  for (const file of files) {
    const relative = path.relative(root, file);
    if (relative.endsWith('.test.ts')) continue;
    const source = fs.readFileSync(file, 'utf8');
    const lineCount = source.split('\n').length;
    if (lineCount > MAX_FILE_LINES) {
      violations.push({ file: relative, rule: 'maxFileLines', detail: `${lineCount} > ${MAX_FILE_LINES}` });
    }
    for (const fn of namedFunctionLengths(source)) {
      if (fn.lines > MAX_FUNCTION_LINES) {
        violations.push({ file: relative, rule: 'maxFunctionLines', detail: `${fn.name} is ${fn.lines} lines` });
      }
    }
    const isPure = PURE_DIRECTORIES.some((prefix) => relative.startsWith(prefix));
    const banned = BANNED_IN_PURE.exec(stripComments(source));
    if (isPure && banned) {
      violations.push({ file: relative, rule: 'determinism', detail: `banned token ${banned[1]}` });
    }
  }
  return { files: files.length, violations };
}

/** Removes block and line comments so documentation prose cannot trip the token check. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function writeFileTree(root: string, files: Readonly<Record<string, string>>): void {
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

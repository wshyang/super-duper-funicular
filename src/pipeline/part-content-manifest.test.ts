import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildPartContentManifest,
  computeFileContentHash,
  writePartContentManifest,
} from './part-content-manifest.js';

function writeFixturePart(
  dir: string,
  name: string,
  payload: string,
): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, payload);
  return filePath;
}

describe('content-addressed part manifests', () => {
  it('hashes part files deterministically', () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'part-hash-'),
    );
    const filePath = writeFixturePart(
      tmpDir,
      'torso.png',
      'fixture-bytes',
    );
    expect(computeFileContentHash(filePath)).toBe(
      computeFileContentHash(filePath),
    );
    expect(computeFileContentHash(filePath)).toMatch(
      /^[0-9a-f]{16}$/,
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('builds a manifest keyed by part id for every png in the bank', () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'part-manifest-'),
    );
    writeFixturePart(tmpDir, 'head.png', 'head-bytes');
    writeFixturePart(tmpDir, 'torso.png', 'torso-bytes');
    writeFixturePart(tmpDir, 'notes.txt', 'ignored');
    const manifest = buildPartContentManifest(
      'sg-chinese-female',
      tmpDir,
    );
    expect(Object.keys(manifest.parts).sort()).toEqual([
      'head',
      'torso',
    ]);
    expect(manifest.personaFolder).toBe('sg-chinese-female');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('round-trips a written manifest through JSON', () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'part-write-'),
    );
    writeFixturePart(tmpDir, 'nearFoot.png', 'foot-bytes');
    const manifestPath = writePartContentManifest(
      'sg-chinese-female-petite',
      tmpDir,
    );
    const written = JSON.parse(
      fs.readFileSync(manifestPath, 'utf8'),
    );
    expect(written.parts.nearFoot).toBe(
      computeFileContentHash(
        path.join(tmpDir, 'nearFoot.png'),
      ),
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

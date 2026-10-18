import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng } from '../src/lib/pipeline/image-io.ts';
import { dHash64, hamming64, rgbaSha256, sha256Hex } from '../src/lib/pipeline/hashing.ts';

const DIR = 'public/sprites/extracted';
const OUT = 'public/analysis/dedupe-report.json';
const DHASH_CLOSE = 6;

interface Entry {
  readonly file: string;
  readonly byteSha256: string;
  readonly rgbaSha256: string;
  readonly dHash64: string;
}

function main(): void {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.png')).sort();
  const entries: Entry[] = files.map((file) => {
    const bytes = readFileSync(join(DIR, file));
    const raster = decodePng(bytes);
    return { file, byteSha256: sha256Hex(bytes), rgbaSha256: rgbaSha256(raster), dHash64: dHash64(raster) };
  });
  const candidates = pairs(entries);
  mkdirSync('public/analysis', { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ version: 1, entries, duplicateCandidates: candidates }, null, 2)}\n`);
  console.log(`${entries.length} assets · ${candidates.length} duplicate candidates (report-only, never deleted)`);
  for (const candidate of candidates.slice(0, 8)) console.log(`  ${candidate.a} ~ ${candidate.b} dHash ${candidate.distance}/64`);
}

function pairs(entries: readonly Entry[]): Array<{ a: string; b: string; distance: number }> {
  const out: Array<{ a: string; b: string; distance: number }> = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i] as Entry;
      const b = entries[j] as Entry;
      if (a.byteSha256 === b.byteSha256) out.push({ a: a.file, b: b.file, distance: 0 });
      else {
        const distance = hamming64(a.dHash64, b.dHash64);
        if (distance <= DHASH_CLOSE) out.push({ a: a.file, b: b.file, distance });
      }
    }
  }
  return out;
}

main();

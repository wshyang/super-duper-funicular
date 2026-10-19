import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Content-Addressed Part Manifests (revised pipeline).
 *
 * Each photoreal part bank ships a `parts-manifest.json` mapping every
 * `partId` to the SHA-256 content hash of its PNG. The browser hook
 * builds part URLs as `.../{partId}.png?v={contentHash}`, so a changed
 * part always fetches fresh while unchanged parts stay cached forever.
 * This replaces the `Date.now()` per-load revision (which defeated
 * caching on every load) and the manual `?v=` bumps (which went stale —
 * `ADD-037`'s cache bug class).
 */

export interface PartContentManifest {
  readonly personaFolder: string;
  readonly generatedAtIso: string;
  readonly parts: Readonly<Record<string, string>>;
}

export function computeFileContentHash(filePath: string): string {
  const bytes = fs.readFileSync(filePath);
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}

export function buildPartContentManifest(
  personaFolder: string,
  partsDir: string,
): PartContentManifest {
  const parts: Record<string, string> = {};
  for (const entry of fs.readdirSync(partsDir)) {
    const partId = stripPngSuffix(entry);
    if (partId === null) {
      continue;
    }
    parts[partId] = computeFileContentHash(
      path.join(partsDir, entry),
    );
  }
  return {
    personaFolder,
    generatedAtIso: new Date().toISOString(),
    parts,
  };
}

function stripPngSuffix(fileName: string): string | null {
  if (!fileName.endsWith('.png')) {
    return null;
  }
  return fileName.slice(0, -'.png'.length);
}

export function writePartContentManifest(
  personaFolder: string,
  partsDir: string,
): string {
  const manifest = buildPartContentManifest(
    personaFolder,
    partsDir,
  );
  const manifestPath = path.join(partsDir, 'parts-manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

export function listPhotorealPartBankDirs(
  photorealRoot: string,
): Array<{ readonly personaFolder: string; readonly partsDir: string }> {
  return fs
    .readdirSync(photorealRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      personaFolder: entry.name,
      partsDir: path.join(photorealRoot, entry.name, 'parts'),
    }))
    .filter((candidate) => fs.existsSync(candidate.partsDir));
}

export function writeAllPartContentManifests(
  photorealRoot: string,
): readonly string[] {
  return listPhotorealPartBankDirs(photorealRoot).map(
    (bank) =>
      writePartContentManifest(bank.personaFolder, bank.partsDir),
  );
}

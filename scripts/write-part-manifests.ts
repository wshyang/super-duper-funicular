import path from 'node:path';
import { writeAllPartContentManifests } from '../src/pipeline/part-content-manifest.js';

function main(): void {
  const repoRoot = process.cwd();
  const photorealRoot = path.join(
    repoRoot,
    'public',
    'sprites',
    'photoreal',
  );
  const manifestPaths = writeAllPartContentManifests(
    photorealRoot,
  );
  for (const manifestPath of manifestPaths) {
    process.stdout.write(
      `wrote ${path.relative(repoRoot, manifestPath)}\n`,
    );
  }
  process.stdout.write(
    `${manifestPaths.length} content-addressed part manifest(s) written\n`,
  );
}

main();

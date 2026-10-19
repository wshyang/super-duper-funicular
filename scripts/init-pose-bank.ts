import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createPoseBankScaffold, type PoseBankCharacterProfile } from '../src/pipeline/pose-bank-pipeline.js';

interface PoseBankConfig extends PoseBankCharacterProfile {
  readonly outputDirectory: string;
  readonly guideDirectory?: string;
  readonly promptDirectory?: string;
}

const args = process.argv.slice(2);
const configPath = args.find((arg) => !arg.startsWith('--'));
const force = args.includes('--force');
if (!configPath) {
  throw new Error('Usage: npm run pose-bank:init -- <character-profile.json> [--force]');
}
const absoluteConfigPath = path.resolve(configPath);
const config = JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf8')) as PoseBankConfig;
const repoRoot = process.cwd();
const resolveRepoPath = (candidate: string) => path.isAbsolute(candidate) ? candidate : path.resolve(repoRoot, candidate);
const masterPath = resolveRepoPath(config.masterImagePath);
if (!fs.existsSync(masterPath)) throw new Error(`Identity master does not exist: ${masterPath}`);
if (!config.characterId.trim() || !config.identityLock.trim() || !config.wardrobeLock.trim()) {
  throw new Error('characterId, identityLock, and wardrobeLock are required in the profile JSON.');
}
const outputDirectory = resolveRepoPath(config.outputDirectory);
const guideDirectory = config.guideDirectory ?? path.join(config.outputDirectory, 'guides/skeleton');
const promptDirectory = config.promptDirectory ?? path.join(config.outputDirectory, 'prompts');
const scaffold = createPoseBankScaffold(
  { ...config, masterImagePath: path.relative(repoRoot, masterPath) },
  crypto.createHash('sha256').update(fs.readFileSync(masterPath)).digest('hex'),
  guideDirectory,
  promptDirectory,
);
const resolvedPromptsDirectory = resolveRepoPath(promptDirectory);
const manifestPath = path.join(outputDirectory, 'pose-bank.json');
if (fs.existsSync(manifestPath) && !force) {
  throw new Error(`Refusing to overwrite ${manifestPath}; pass --force only if its review/attempt state is backed up.`);
}
fs.mkdirSync(resolvedPromptsDirectory, { recursive: true });
fs.mkdirSync(outputDirectory, { recursive: true });
for (const [frameKey, prompt] of Object.entries(scaffold.prompts)) {
  fs.writeFileSync(path.join(resolvedPromptsDirectory, `${frameKey}.txt`), `${prompt}\n`, 'utf8');
}
fs.writeFileSync(manifestPath, `${JSON.stringify(scaffold.manifest, null, 2)}\n`, 'utf8');
console.log(`[pose-bank:init] Created ${Object.keys(scaffold.prompts).length} prompt files and a nine-frame manifest for ${config.characterId}.`);
console.log(`[pose-bank:init] Review each prompt, generate candidates against the master + pose guide, then record every outcome before harvesting any crop.`);

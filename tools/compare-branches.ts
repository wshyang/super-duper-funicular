import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BranchTip, BranchTipsFile } from '../src/shared/types.ts';

interface BranchRef {
  readonly name: string;
  readonly branch: string;
}

export const BRANCH_REFS: readonly BranchRef[] = [
  { name: 'Sprite Motion Lab', branch: 'arena/917ef347-super-duper-funicular' },
  { name: 'Stride Lab', branch: 'arena/263385da-super-duper-funicular' },
  { name: 'Funicular', branch: 'arena/77ffb088-super-duper-funicular' },
  { name: 'Procedural Runner', branch: 'arena/ce6d2a6e-super-duper-funicular' },
  { name: 'Funicular Motion Lab (ours)', branch: 'arena/110272a0-super-duper-funicular' },
];

const git = (args: readonly string[]): string =>
  execFileSync('git', [...args], { encoding: 'utf8' }).trim();

const tipFor = (ref: BranchRef, hash: string, suffix = ''): BranchTip => ({
  name: ref.name,
  branch: ref.branch,
  hash,
  committedAt: git(['show', '-s', '--format=%cI', hash]),
  subject: `${git(['show', '-s', '--format=%s', hash])}${suffix}`,
});

/**
 * Fetch the explicit remote head. Our own session branch may not be published
 * yet, so fall back to the local HEAD and label it as a working delta: a
 * document cannot honestly embed its own future commit hash.
 */
const resolveTip = (ref: BranchRef, isSelf: boolean): BranchTip => {
  try {
    git(['fetch', '--quiet', 'origin', `refs/heads/${ref.branch}`]);
    return tipFor(
      ref,
      git(['rev-parse', 'FETCH_HEAD']),
      isSelf ? ' (remote tip; local delta may be ahead)' : '',
    );
  } catch {
    if (!isSelf) {
      return {
        name: ref.name,
        branch: ref.branch,
        hash: '0'.repeat(40),
        committedAt: 'unavailable',
        subject: 'fetch failed — previous observation retained, treat as stale',
      };
    }
    const local = git(['rev-parse', 'HEAD']);
    return tipFor(ref, local, ' (unpublished working delta — not a remote tip)');
  }
};

const TIPS_PATH = join('src', 'generated', 'branch-tips.json');
const HISTORY_PATH = join('src', 'generated', 'branch-history.json');

const readJson = <T>(path: string): T | null => {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
};

const updateLedger = (snapshot: BranchTipsFile): void => {
  const path = join('docs', 'N_WAY_COMPARISON.md');
  if (!existsSync(path)) return;
  const rows = snapshot.tips.map(
    (tip) => `| ${tip.name} | \`${tip.branch}\` | \`${tip.hash}\` | ${tip.committedAt} |`,
  );
  const table = [
    `Observed (UTC): ${snapshot.observedAt}`,
    '',
    '| Implementation | Branch | Full remote SHA | Commit time |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
  const content = readFileSync(path, 'utf8');
  const next = content.replace(
    /<!-- branch-tips:start -->[\s\S]*?<!-- branch-tips:end -->/,
    `<!-- branch-tips:start -->\n${table}\n<!-- branch-tips:end -->`,
  );
  writeFileSync(path, next);
};

export const compareBranches = (): BranchTipsFile => {
  mkdirSync(join('src', 'generated'), { recursive: true });
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const tips = BRANCH_REFS.map((ref) => resolveTip(ref, ref.branch === currentBranch));
  const snapshot: BranchTipsFile = { observedAt: new Date().toISOString(), tips };
  writeFileSync(TIPS_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  const history = readJson<BranchTipsFile[]>(HISTORY_PATH) ?? [];
  const last = history[history.length - 1];
  const changed =
    JSON.stringify(last?.tips.map((tip) => tip.hash)) !==
    JSON.stringify(tips.map((tip) => tip.hash));
  if (changed) history.push(snapshot);
  writeFileSync(HISTORY_PATH, `${JSON.stringify(history, null, 2)}\n`);
  updateLedger(snapshot);
  return snapshot;
};

const snapshot = compareBranches();
for (const tip of snapshot.tips) {
  console.log(
    `${tip.name.padEnd(30)} ${tip.hash.slice(0, 12)}  ${tip.committedAt}  ${tip.subject.slice(0, 60)}`,
  );
}
console.log(
  '\nHashes refreshed. Review the diffs in a detached /tmp checkout before advancing a reviewed hash.',
);

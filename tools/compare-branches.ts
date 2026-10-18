/**
 * Live n-way ledger refresher (FDS #feat-ledger, CROSS-003).
 * Fetches exact refs without switching branches, snapshots tips, appends an
 * append-only history, and patches the marked region of the ledger.
 * Offline => exit 1 and last-known hashes stay labelled stale.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ROWS = [
  ['0', 'main', '—'],
  ['1', 'arena/917ef347-super-duper-funicular', '#1'],
  ['2', 'arena/263385da-super-duper-funicular', '#2'],
  ['3', 'arena/77ffb088-super-duper-funicular', '#3'],
  ['4', 'arena/ce6d2a6e-super-duper-funicular', 'none'],
  ['5', 'arena/64422739-super-duper-funicular', '#4'],
  ['6', 'arena/8dcf54e8-super-duper-funicular', 'this PR'],
] as const;

const LEDGER = 'docs/N_WAY_COMPARISON.md';
const TIPS = 'docs/BRANCH-TIPS.json';
const HISTORY = 'docs/BRANCH-HISTORY.json';

interface Tip {
  row: string;
  branch: string;
  pr: string;
  sha: string;
  committedAt: string;
  subject: string;
  source: 'remote' | 'local-unpushed';
}
interface Snapshot {
  observedAt: string;
  tips: Tip[];
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function readTip(row: string, branch: string, pr: string): Tip {
  try {
    execFileSync('git', ['fetch', '--quiet', 'origin', `refs/heads/${branch}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return localTip(row, branch, pr);
  }
  const sha = git('rev-parse', 'FETCH_HEAD');
  return { ...describe(sha), row, branch, pr, source: 'remote' };
}

function localTip(row: string, branch: string, pr: string): Tip {
  const sha = git('rev-parse', `refs/heads/${branch}`);
  return { ...describe(sha), row, branch, pr, source: 'local-unpushed' };
}

function describe(sha: string): Pick<Tip, 'sha' | 'committedAt' | 'subject'> {
  return {
    sha,
    committedAt: git('show', '-s', '--format=%cI', sha),
    subject: git('show', '-s', '--format=%s', sha),
  };
}

function prStates(): Map<string, string> {
  const states = new Map<string, string>();
  try {
    const raw = execFileSync(
      'gh',
      ['pr', 'list', '--state', 'all', '--limit', '50', '--json', 'number,headRefName,state'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    for (const pr of JSON.parse(raw) as Array<{ number: number; headRefName: string; state: string }>) {
      states.set(pr.headRefName, `#${pr.number} ${pr.state}`);
    }
  } catch {
    // gh unavailable/offline: ledger keeps its reviewed PR labels.
  }
  return states;
}

function historyWith(snapshot: Snapshot): Snapshot[] {
  const history: Snapshot[] = existsSync(HISTORY)
    ? (JSON.parse(readFileSync(HISTORY, 'utf8')) as Snapshot[])
    : [];
  if (JSON.stringify(history.at(-1)?.tips) !== JSON.stringify(snapshot.tips)) history.push(snapshot);
  return history;
}

function patchLedger(snapshot: Snapshot, states: Map<string, string>): void {
  const lines = snapshot.tips.map((tip) => {
    const pr = states.get(tip.branch) ?? tip.pr;
    const source = tip.source === 'remote' ? '' : ' _(local-unpushed)_';
    return `| ${tip.row} | \`${tip.branch}\` | ${pr} | \`${tip.sha}\` | ${tip.committedAt} | ${tip.subject}${source} |`;
  });
  const table = [
    `Observed (UTC): ${snapshot.observedAt} via \`npm run branches:compare\` (git fetch of exact refs).`,
    '',
    '| # | Branch | PR | Full SHA | Commit time | Subject |',
    '|---|---|---|---|---|---|',
    ...lines,
  ].join('\n');
  const content = readFileSync(LEDGER, 'utf8');
  const patched = content.replace(
    /<!-- branch-tips:start -->[\s\S]*?<!-- branch-tips:end -->/,
    `<!-- branch-tips:start -->\n${table}\n<!-- branch-tips:end -->`,
  );
  if (patched === content) throw new Error('ledger marked region missing');
  writeFileSync(LEDGER, patched);
}

function main(): void {
  const tips: Tip[] = [];
  for (const [row, branch, pr] of ROWS) tips.push(readTip(row, branch, pr));
  const snapshot: Snapshot = { observedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), tips };
  writeFileSync(TIPS, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(HISTORY, `${JSON.stringify(historyWith(snapshot), null, 2)}\n`);
  patchLedger(snapshot, prStates());
  for (const tip of tips) console.log(`${tip.row}\t${tip.branch}\t${tip.sha}\t${tip.committedAt}`);
  console.log('Ledger §1 patched; review §2–§5 and the feature matrix before handoff. Hashes alone are not parity.');
}

try {
  main();
} catch (error) {
  console.error(`OFFLINE/refresh failed: ${String(error)} — retain last-known hashes in ${LEDGER}, labelled stale.`);
  process.exitCode = 1;
}

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface BranchDescriptor {
  readonly role: string;
  readonly branch: string;
  readonly prStatus: string;
}

export interface BranchTipRecord extends BranchDescriptor {
  readonly hash: string;
  readonly shortHash: string;
  readonly committedAt: string;
  readonly subject: string;
  readonly commitCountFromMain: number;
}

export interface BranchTipsSnapshot {
  readonly observedAt: string;
  readonly activeSessionBranch: string;
  readonly tips: readonly BranchTipRecord[];
}

export const REPOSITORY_BRANCHES: readonly BranchDescriptor[] = [
  {
    role: 'Branch 1 (Ours — Sprite Motion Lab)',
    branch: 'arena/917ef347-super-duper-funicular',
    prStatus: 'PR #1 Open (Active Session Branch)',
  },
  {
    role: 'Branch 8 (Closely Watched Reference — Photoreal & Calibration Studio)',
    branch: 'arena/e1300d3c-super-duper-funicular',
    prStatus: 'PR #8 Open (Closely Watched)',
  },
  {
    role: 'Branch 2 (Stride Lab Workbench)',
    branch: 'arena/263385da-super-duper-funicular',
    prStatus: 'PR #2 Open',
  },
  {
    role: 'Branch 3 (Funicular / Photo-Rig & Matte Lab)',
    branch: 'arena/77ffb088-super-duper-funicular',
    prStatus: 'PR #3 Open',
  },
  {
    role: 'Branch 4 (Initial Greenfield Prototype)',
    branch: 'arena/ce6d2a6e-super-duper-funicular',
    prStatus: 'Historical Prototype',
  },
];

function runGit(args: readonly string[]): string {
  return execFileSync('git', [...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function resolveBranchHash(branch: string): string {
  try {
    runGit(['fetch', 'origin', `refs/heads/${branch}`]);
    return runGit(['rev-parse', 'FETCH_HEAD']);
  } catch {
    try {
      return runGit(['rev-parse', `origin/${branch}`]);
    } catch {
      return runGit(['rev-parse', branch]);
    }
  }
}

function inspectSingleBranchTip(desc: BranchDescriptor): BranchTipRecord {
  const hash = resolveBranchHash(desc.branch);
  const shortHash = hash.slice(0, 7);
  const committedAt = runGit(['show', '-s', '--format=%cI', hash]);
  const subject = runGit(['show', '-s', '--format=%s', hash]);
  const countStr = runGit(['rev-list', '--count', `396ce256debcb5bdc2419cc0f3f399730b61ab36..${hash}`]);
  return {
    ...desc,
    hash,
    shortHash,
    committedAt,
    subject,
    commitCountFromMain: Number(countStr) || 0,
  };
}

function buildMarkdownTipsTable(snapshot: BranchTipsSnapshot): string {
  const header = [
    `Observed (UTC): \`${snapshot.observedAt}\` · Active Session Branch: \`${snapshot.activeSessionBranch}\``,
    '',
    '| Branch Role & Codename | Branch (`refs/heads/*`) | PR / Lifecycle Status | Full Observed SHA | Commit Timestamp (ISO) | Commits Ahead of `main` | Latest Commit Subject |',
    '|---|---|---|---|---|---|---|',
  ];
  const rows = snapshot.tips.map(
    (tip) =>
      `| **${tip.role}** | \`${tip.branch}\` | ${tip.prStatus} | \`${tip.hash}\` | \`${tip.committedAt}\` | \`+${tip.commitCountFromMain}\` | ${tip.subject.replace(/\|/g, '\\|')} |`,
  );
  return [...header, ...rows].join('\n');
}

function replaceMarkedTipsSection(filePath: string, tableMarkdown: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const markerRegex = /<!-- branch-tips:start -->[\s\S]*?<!-- branch-tips:end -->/;
  if (!markerRegex.test(content)) {
    return;
  }
  const updated = content.replace(
    markerRegex,
    `<!-- branch-tips:start -->\n${tableMarkdown}\n<!-- branch-tips:end -->`,
  );
  fs.writeFileSync(filePath, updated, 'utf8');
}

function writeSnapshotAndHistory(repoRoot: string, snapshot: BranchTipsSnapshot): void {
  const tipsPath = path.join(repoRoot, 'docs/BRANCH-TIPS.json');
  const historyPath = path.join(repoRoot, 'docs/BRANCH-HISTORY.json');
  fs.writeFileSync(tipsPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  const existingHistory: BranchTipsSnapshot[] = fs.existsSync(historyPath)
    ? (JSON.parse(fs.readFileSync(historyPath, 'utf8')) as BranchTipsSnapshot[])
    : [];
  const lastEntry = existingHistory.at(-1);
  if (JSON.stringify(lastEntry?.tips) !== JSON.stringify(snapshot.tips)) {
    existingHistory.push(snapshot);
  }
  fs.writeFileSync(historyPath, `${JSON.stringify(existingHistory, null, 2)}\n`, 'utf8');
}

export function refreshNWayBranchComparison(repoRoot: string = process.cwd()): BranchTipsSnapshot {
  const tips = REPOSITORY_BRANCHES.map((desc) => inspectSingleBranchTip(desc));
  const snapshot: BranchTipsSnapshot = {
    observedAt: new Date().toISOString(),
    activeSessionBranch: 'arena/917ef347-super-duper-funicular',
    tips,
  };
  writeSnapshotAndHistory(repoRoot, snapshot);
  const tableMarkdown = buildMarkdownTipsTable(snapshot);
  const targetDocs = [
    path.join(repoRoot, 'docs/N_WAY_COMPARISON.md'),
    path.join(repoRoot, 'N_WAY_COMPARISON.md'),
    path.join(repoRoot, 'docs/THREE_WAY_BRANCH_COMPARISON.md'),
    path.join(repoRoot, 'THREE_WAY_COMPARISON.md'),
  ];
  for (const docPath of targetDocs) {
    replaceMarkedTipsSection(docPath, tableMarkdown);
  }
  return snapshot;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const snapshot = refreshNWayBranchComparison();
  console.log(
    `Refreshed ${snapshot.tips.length}-way branch tips in docs/BRANCH-TIPS.json and N_WAY_COMPARISON.md.`,
  );
}

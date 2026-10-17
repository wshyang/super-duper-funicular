import { execSync } from 'node:child_process';
// Live n-way ledger refresher: full SHAs via ls-remote; never switches/edits other branches.
const BRANCHES = ['main','arena/917ef347-super-duper-funicular','arena/263385da-super-duper-funicular','arena/77ffb088-super-duper-funicular','arena/ce6d2a6e-super-duper-funicular','arena/64422739-super-duper-funicular'];
try { const out = execSync('git ls-remote --heads origin', { encoding: 'utf8' });
  for (const b of BRANCHES) { const line = out.split('\n').find(l => l.endsWith(`refs/heads/${b}`)); console.log(`${b}\t${line ? line.split('\t')[0] : 'NOT-ON-REMOTE (local/session)'}`); }
  console.log(`observedAt\t${new Date().toISOString()}\n# Paste rows into docs/N_WAY_COMPARISON.md §1 and append §5 progress log.`);
} catch { console.log('OFFLINE: retain last-known hashes in docs/N_WAY_COMPARISON.md, labelled stale.'); process.exitCode = 1; }

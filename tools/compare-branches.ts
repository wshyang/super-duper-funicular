/** Refresh pinned evidence without switching branches or modifying reference worktrees. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const branches = [
  ["Funicular", "arena/77ffb088-super-duper-funicular"],
  ["Stride Lab", "arena/263385da-super-duper-funicular"],
  ["Sprite Motion Lab", "arena/917ef347-super-duper-funicular"],
] as const;
const git = (...args: string[]): string => execFileSync("git", args, { encoding: "utf8" }).trim();

// Fetch exact refs: the checkout's default fetch refspec may include only this branch.
const tips = branches.map(([name, branch]) => {
  git("fetch", "origin", `refs/heads/${branch}`);
  const hash = git("rev-parse", "FETCH_HEAD");
  return {
    name, branch, hash,
    committedAt: git("show", "-s", "--format=%cI", hash),
    subject: git("show", "-s", "--format=%s", hash),
  };
});
const snapshot = { observedAt: new Date().toISOString(), tips };
writeFileSync("docs/BRANCH-TIPS.json", `${JSON.stringify(snapshot, null, 2)}\n`);
const historyPath = "docs/BRANCH-HISTORY.json";
const history: typeof snapshot[] = existsSync(historyPath)
  ? JSON.parse(readFileSync(historyPath, "utf8")) as typeof snapshot[] : [];
const last = history.at(-1);
if (JSON.stringify(last?.tips) !== JSON.stringify(tips)) history.push(snapshot);
writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`);
const document = "docs/THREE-WAY-COMPARISON.md";
const rows = tips.map((tip) => `| ${tip.name} | ${tip.branch} | \`${tip.hash}\` | ${tip.committedAt} |`);
const table = [
  `Observed (UTC): ${snapshot.observedAt}`, "",
  "| Name | Branch | Full remote SHA | Commit time |",
  "| --- | --- | --- | --- |", ...rows,
].join("\n");
const content = readFileSync(document, "utf8");
writeFileSync(document, content.replace(
  /<!-- branch-tips:start -->[\s\S]*?<!-- branch-tips:end -->/,
  `<!-- branch-tips:start -->\n${table}\n<!-- branch-tips:end -->`,
));
console.log("Updated docs/BRANCH-TIPS.json. Review feature deltas and update THREE-WAY-COMPARISON.md; hashes alone do not prove parity.");

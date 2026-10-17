import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BRANCHES = [
  "arena/24e7b955-super-duper-funicular",
  "arena/917ef347-super-duper-funicular",
  "arena/263385da-super-duper-funicular",
  "arena/77ffb088-super-duper-funicular",
] as const;

interface Head {
  name: string;
  sha: string;
}

function fetchHeads(): Head[] {
  const remote = execSync("git ls-remote --heads origin", { encoding: "utf8" });
  return BRANCHES.map((name) => {
    const line = remote.split("\n").find((entry) => entry.endsWith(`refs/heads/${name}`));
    const sha = line?.split("\t")[0] ?? "UNAVAILABLE";
    return { name, sha };
  });
}

const heads = fetchHeads();
const snapshot = {
  capturedAt: new Date().toISOString(),
  heads,
};
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(join(root, "docs/BRANCH-HISTORY.json"), JSON.stringify(snapshot, null, 2));
console.log(JSON.stringify(snapshot, null, 2));

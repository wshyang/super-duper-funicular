import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import { MALE_BODY } from "../src/lib/rig/body.ts";
import { analyseCycle } from "../src/lib/analysis/cycle.ts";

const gait = resolveGait(DEFAULT_CONTROLS);
const poses = Array.from({ length: 32 }, (_, i) => solvePose(i / 32, gait, MALE_BODY));
const metrics = analyseCycle(poses);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "src/generated"), { recursive: true });
writeFileSync(join(root, "src/generated/cycle-metrics.json"), JSON.stringify(metrics, null, 2));
console.log(metrics);

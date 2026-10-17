import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { keyMagenta } from "../src/lib/pipeline/chroma.ts";
import { sha256 } from "../src/lib/pipeline/hashing.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "src/images/runner-sheet-8frame-6color.jpeg");
const decoded = jpeg.decode(readFileSync(sourcePath), { maxMemoryUsageInMB: 256 });
const keyed = keyMagenta({ width: decoded.width, height: decoded.height, data: decoded.data });
const outDir = join(root, "public/sprites/extracted");
mkdirSync(outDir, { recursive: true });
const png = new PNG({ width: keyed.width, height: keyed.height });
png.data = Buffer.from(keyed.data);
writeFileSync(join(outDir, "sheet-keyed.png"), PNG.sync.write(png));
writeFileSync(
  join(root, "src/generated/source-manifest.json"),
  JSON.stringify(
    {
      source: "src/images/runner-sheet-8frame-6color.jpeg",
      width: decoded.width,
      height: decoded.height,
      sha256: sha256(decoded.data),
    },
    null,
    2,
  ),
);
console.log(`extracted ${decoded.width}x${decoded.height}`);

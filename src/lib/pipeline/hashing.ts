import { createHash } from "node:crypto";

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function dhash64(width: number, height: number, data: Uint8Array): string {
  const cols = 9;
  const rows = 8;
  const samples: number[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const sx = Math.min(width - 1, Math.floor((x / (cols - 1)) * (width - 1)));
      const sy = Math.min(height - 1, Math.floor((y / (rows - 1)) * (height - 1)));
      const i = (sy * width + sx) * 4;
      const luma = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      samples.push(luma);
    }
  }
  let bits = 0n;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols - 1; x += 1) {
      const left = samples[y * cols + x]!;
      const right = samples[y * cols + x + 1]!;
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

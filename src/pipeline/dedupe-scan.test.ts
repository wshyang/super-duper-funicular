import { mkdtemp, copyFile, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listImageFiles, planRemovals, scanForDuplicates } from "./dedupe-scan.ts";
import { RUNNER_SHEET_PATH } from "./sheet-fixture.ts";

let workspace = "";

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "dedupe-test-"));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("scanForDuplicates on real files", () => {
  it("reports a byte-identical copy of the sheet as a duplicate group", async () => {
    await copyFile(RUNNER_SHEET_PATH, join(workspace, "sheet-a.jpeg"));
    await copyFile(RUNNER_SHEET_PATH, join(workspace, "sheet-copy.jpeg"));
    const report = await scanForDuplicates([workspace]);
    expect(report.scanned).toBe(2);
    expect(report.duplicateGroups).toEqual([
      [join(workspace, "sheet-a.jpeg"), join(workspace, "sheet-copy.jpeg")],
    ]);
  }, 60_000);

  it("reports nothing when the only file is unique", async () => {
    await copyFile(RUNNER_SHEET_PATH, join(workspace, "sheet.jpeg"));
    await writeFile(join(workspace, "notes.txt"), "not an image");
    const report = await scanForDuplicates([workspace]);
    expect(report.scanned).toBe(1);
    expect(report.duplicateGroups).toEqual([]);
  }, 60_000);

  it("treats a missing directory as empty", async () => {
    const report = await scanForDuplicates([join(workspace, "does-not-exist")]);
    expect(report.scanned).toBe(0);
  });
});

describe("listImageFiles and planRemovals", () => {
  it("lists nested images only, in sorted order", async () => {
    await mkdir(join(workspace, "nested"));
    await writeFile(join(workspace, "b.png"), "x");
    await writeFile(join(workspace, "nested", "a.jpg"), "x");
    await writeFile(join(workspace, "readme.md"), "x");
    const files = await listImageFiles(workspace);
    expect(files).toEqual([join(workspace, "b.png"), join(workspace, "nested", "a.jpg")]);
  });

  it("keeps the first path of each group and plans the rest for removal", () => {
    expect(planRemovals([["/x/b.png", "/x/a.png", "/x/c.png"]])).toEqual(["/x/b.png", "/x/c.png"]);
  });
});

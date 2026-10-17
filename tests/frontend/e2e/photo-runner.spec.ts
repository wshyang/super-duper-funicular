import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ reducedMotion: "reduce" });
test("photographic persona loads, articulates, and exports high-resolution transparent frames", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByTestId("character__mei-lin-photo").click();
  await expect(page.getByTestId("studio__export")).toBeEnabled();
  await expect(page.locator(".stage-top")).toContainText("AI PHOTOGRAPHIC RIG");
  await expect(page.getByTestId("stage__canvas")).toHaveAttribute(
    "width",
    "1440",
  );
  await expect(page.getByTestId("character__palette").first()).toBeDisabled();
  const before = await page
    .getByTestId("stage__canvas")
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.getByTestId("cycle__frame").nth(2).click();
  const after = await page
    .getByTestId("stage__canvas")
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  expect(after).not.toBe(before);
  await page.getByTestId("overlays__skeleton").check();
  await page.getByTestId("overlays__onion").check();
  const downloaded = page.waitForEvent("download");
  await page.getByTestId("studio__export").click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe(
    "stride-lab-mei-lin-photo-running-cycle.png",
  );
  const buffer = await readFile((await download.path())!);
  expect(buffer.readUInt32BE(16)).toBe(5120);
  expect(buffer.readUInt32BE(20)).toBe(640);
  expect(buffer[25]).toBe(6); // PNG colour type RGBA.
  const manifest = await (
    await request.get("/photo-runner/manifest.json")
  ).json();
  expect(Object.keys(manifest.parts)).toHaveLength(16);
  for (const part of Object.values(manifest.parts) as { url: string }[]) {
    expect((await request.get(part.url)).ok()).toBe(true);
  }
  await page.getByTestId("nav__assets").click();
  await page.getByTestId("photo-assets__far").click();
  await expect(page.getByTestId("photo-assets__part")).toHaveCount(6);
  await expect(
    page.getByAltText("right shoe, inner medial arch panel"),
  ).toBeVisible();
  await page.getByTestId("nav__studio").click();
  await page.getByTestId("character__wei-ming").click();
  await expect(page.getByTestId("stage__canvas")).toHaveAttribute(
    "width",
    "480",
  );
  await expect(page.getByTestId("character__palette").first()).toBeEnabled();
  expect(errors).toEqual([]);
});
test("failed photographic asset loading is explicit and retryable", async ({
  page,
}) => {
  await page.route("**/photo-runner/far-shoe.png", (route) => route.abort());
  await page.goto("/");
  await page.getByTestId("character__mei-lin-photo").click();
  await expect(page.getByTestId("photo__retry")).toBeVisible();
  await expect(page.getByTestId("studio__export")).toBeDisabled();
  await page.unroute("**/photo-runner/far-shoe.png");
  await page.getByTestId("photo__retry").click();
  await expect(page.getByTestId("studio__export")).toBeEnabled();
  await expect(page.getByTestId("photo__retry")).toHaveCount(0);
});
test("photographic controls and parts gallery fit mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByTestId("character__mei-lin-photo").click();
  await expect(page.getByTestId("studio__export")).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByTestId("nav__assets").click();
  await page.getByTestId("photo-assets__far").click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByTestId("photo-assets__sources").click();
  await expect(page.getByTestId("photo-assets__source")).toHaveCount(9);
});

test("hip cut calibration changes the rig, preserves comparison isolation and exports a transparent mask", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("character__mei-lin-photo").click();
  await expect(page.getByTestId("studio__export")).toBeEnabled();
  await page.getByTestId("cycle__frame").nth(2).click();
  const stage = page.getByTestId("stage__canvas");
  const preview = page.getByTestId("hip-cut__preview");
  const originalStage = await stage.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  const rounded = await preview.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page.getByTestId("hip-cut__original").click();
  expect(
    await preview.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(rounded);
  expect(await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    originalStage,
  );
  await page.getByTestId("hip-cut__rounded").click();
  await page.getByTestId("hip-cut__radiusY").fill("9");
  expect(
    await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(originalStage);
  const settingsDownload = page.waitForEvent("download");
  await page.getByTestId("hip-cut__settings").click();
  const settings = JSON.parse(
    await readFile((await (await settingsDownload).path())!, "utf8"),
  );
  expect(settings.hipCut.radiusY).toBe(9);
  expect(settings.units).toBe("rig-pixels-relative-to-hip");
  const imageDownload = page.waitForEvent("download");
  await page.getByTestId("hip-cut__png").click();
  const image = await imageDownload;
  expect(image.suggestedFilename()).toBe("mei-lin-rounded-pelvis.png");
  const buffer = await readFile((await image.path())!);
  expect(buffer.readUInt32BE(16)).toBe(335);
  expect(buffer.readUInt32BE(20)).toBe(370);
  const removedAlpha = await page.evaluate(
    async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      return context.getImageData(170, 330, 1, 1).data[3];
    },
    `data:image/png;base64,${buffer.toString("base64")}`,
  );
  expect(removedAlpha).toBe(0);
  await page.getByTestId("hip-cut__reset").click();
  expect(await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    originalStage,
  );
  await page.getByTestId("character__mei-lin").click();
  await expect(page.getByTestId("hip-cut__preview")).toHaveCount(0);
});

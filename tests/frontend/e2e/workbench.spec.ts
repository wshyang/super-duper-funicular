import { test, expect } from "@playwright/test";
test.use({ reducedMotion: "reduce" });
test("studio controls, source comparison, and export work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByTestId("playback__toggle").click();
  await expect(
    page.getByRole("button", { name: "Pause animation" }),
  ).toBeVisible();
  await page.getByTestId("playback__step").click();
  await expect(
    page.getByRole("button", { name: "Play animation" }),
  ).toBeVisible();
  await page.getByTestId("cycle__frame").nth(3).click();
  await expect(page.locator(".stage-bottom b")).toHaveText("Flight");
  await page.getByTestId("overlays__skeleton").check();
  await page.getByTestId("overlays__onion").check();
  await page.getByTestId("character__palette").nth(2).click();
  await expect(page.locator(".palette-label")).toContainText("Ocean");
  await page.getByTestId("gait__cadence").fill("200");
  await expect(page.locator(".preview-stats")).toContainText("1.67");
  await page.getByTestId("gait__reset").click();
  await expect(page.getByTestId("gait__cadence")).toHaveValue("168");
  await page.getByTestId("studio__original").click();
  await expect(page.locator(".source-runner")).toBeVisible();
  expect(
    await page
      .locator(".source-runner")
      .evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  const download = page.waitForEvent("download");
  await page.getByTestId("studio__export").click();
  expect((await download).suggestedFilename()).toBe(
    "stride-lab-wei-ming-running-cycle.png",
  );
  expect(errors).toEqual([]);
});
test("library serves every unique transparent PNG and a manifest", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByTestId("nav__assets").click();
  await expect(page.getByTestId("assets__download")).toHaveCount(8);
  await page.getByTestId("assets__palette").nth(4).click();
  await expect(page.getByTestId("assets__download").first()).toHaveAttribute(
    "href",
    "/sprites/runner-violet-01.png",
  );
  const response = await request.get("/sprites/manifest.json");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.frames).toHaveLength(48);
  for (const frame of manifest.frames) {
    const asset = await request.get(frame.url);
    expect(asset.ok()).toBe(true);
    expect(asset.headers()["content-type"]).toContain("image/png");
  }
  await page.getByTestId("nav__notes").click();
  await expect(page.getByText("A half-cycle, repeated.")).toBeVisible();
});
test("mobile layout fits and controls do not overlap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const character = await page
    .locator(".controls section")
    .nth(0)
    .boundingBox();
  const overlays = await page.locator(".overlays").boundingBox();
  expect(overlays!.y).toBeGreaterThanOrEqual(
    character!.y + character!.height - 1,
  );
  await page.getByTestId("overlays__ground").uncheck();
  await expect(page.getByTestId("overlays__ground")).not.toBeChecked();
});

test("personas update live art, thumbnails and export without resetting gait", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.getByTestId("stage__canvas");
  const before = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const thumbnail = page.locator(".frame canvas").first();
  const beforeThumb = await thumbnail.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page.getByTestId("gait__cadence").fill("190");
  await page.getByTestId("character__mei-lin").click();
  await expect(page.getByTestId("character__mei-lin")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".character-name")).toContainText("Mei Lin");
  await expect(page.getByTestId("gait__cadence")).toHaveValue("190");
  expect(
    await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(before);
  expect(
    await thumbnail.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(beforeThumb);
  const download = page.waitForEvent("download");
  await page.getByTestId("studio__export").click();
  expect((await download).suggestedFilename()).toBe(
    "stride-lab-mei-lin-running-cycle.png",
  );
  await page.getByTestId("studio__original").click();
  await page.getByTestId("character__wei-ming").click();
  await expect(page.locator(".source-runner")).toHaveCount(0);
  await expect(page.getByTestId("character__wei-ming")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    before,
  );
});

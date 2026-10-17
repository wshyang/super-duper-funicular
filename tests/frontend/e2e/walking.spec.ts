import { test, expect } from "@playwright/test";
test.use({ reducedMotion: "reduce" });
test("motion profiles have independent settings, labels, support states and reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("motion__walk").click();
  await expect(page.getByTestId("gait__cadence")).toHaveValue("108");
  await expect(page.getByTestId("gait__foot-lift")).toHaveValue("7");
  await expect(page.locator(".stage-bottom")).toContainText("Heel strike");
  await expect(page.locator(".stage-bottom")).toContainText("DOUBLE SUPPORT");
  await expect(page.locator(".cycle-panel")).toContainText("Anatomy of a walk");
  await expect(
    page.locator(".frame-name").filter({ hasText: "Flight" }),
  ).toHaveCount(0);
  await page.getByTestId("gait__cadence").fill("120");
  await page.getByTestId("motion__run").click();
  await expect(page.getByTestId("gait__cadence")).toHaveValue("168");
  await page.getByTestId("motion__brisk-walk").click();
  await expect(page.getByTestId("gait__cadence")).toHaveValue("132");
  await expect(page.locator(".preview-stats")).toContainText("Brisk walking");
  await page.getByTestId("motion__walk").click();
  await expect(page.getByTestId("gait__cadence")).toHaveValue("120");
  await page.getByTestId("gait__reset").click();
  await expect(page.getByTestId("gait__cadence")).toHaveValue("108");
  await page.getByTestId("studio__original").click();
  await expect(page.locator(".preview-stats")).toContainText("Source run");
  await page.getByTestId("motion__walk").click();
  await expect(page.locator(".source-runner")).toHaveCount(0);
});
for (const persona of ["wei-ming", "mei-lin", "mei-lin-photo"]) {
  test(`walking renders and exports for ${persona}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.getByTestId(`character__${persona}`).click();
    await page.getByTestId("motion__walk").click();
    await expect(page.getByTestId("studio__export")).toBeEnabled();
    const before = await page
      .getByTestId("stage__canvas")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await page.getByTestId("cycle__frame").nth(2).click();
    expect(
      await page
        .getByTestId("stage__canvas")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
    ).not.toBe(before);
    await page.getByTestId("overlays__skeleton").check();
    const file = page.waitForEvent("download");
    await page.getByTestId("studio__export").click();
    expect((await file).suggestedFilename()).toBe(
      `stride-lab-${persona}-walking-cycle.png`,
    );
    await page.getByTestId("motion__brisk-walk").click();
    const brisk = page.waitForEvent("download");
    await page.getByTestId("studio__export").click();
    expect((await brisk).suggestedFilename()).toBe(
      `stride-lab-${persona}-brisk-walking-cycle.png`,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    expect(errors).toEqual([]);
  });
}

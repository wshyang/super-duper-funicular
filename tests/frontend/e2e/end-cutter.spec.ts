import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ reducedMotion: "reduce" });
test("element end cuts update live rig, compare rotation, and export independent caps", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("character__mei-lin-photo").click();
  await expect(page.getByTestId("studio__export")).toBeEnabled();
  await page.getByTestId("cycle__frame").nth(2).click();
  const stage = page.getByTestId("stage__canvas"),
    preview = page.getByTestId("end-cut__preview");
  const before = await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const initial = await preview.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page.getByTestId("end-cut__angle").fill("-90");
  expect(
    await preview.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(initial);
  expect(await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    before,
  );
  await page.getByTestId("end-cut__base").click();
  expect(await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    before,
  );
  await page.getByTestId("end-cut__rounded").click();
  await page.getByTestId("end-cut__assembled").click();
  await expect(page.getByTestId("end-cut__angle")).toBeDisabled();
  await page.getByTestId("end-cut__radius").fill("2");
  expect(
    await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(before);
  const downloaded = page.waitForEvent("download");
  await page.getByTestId("end-cut__png").click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("near-thigh-rounded.png");
  const buffer = await readFile((await download.path())!);
  expect(buffer.readUInt32BE(16)).toBe(275);
  expect(buffer.readUInt32BE(20)).toBe(555);
  const alpha = await page.evaluate(
    async (url) => {
      async function pixels(src: string) {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      }
      const original = await pixels("/photo-runner/near-thigh.png"),
        cut = await pixels(url);
      let removed = 0,
        added = 0;
      for (let i = 3; i < cut.length; i += 4) {
        if (cut[i] < original[i]) removed++;
        if (cut[i] > original[i]) added++;
      }
      const pivot = (45 * 275 + 135) * 4 + 3;
      return {
        removed,
        added,
        pivot: cut[pivot],
        originalPivot: original[pivot],
      };
    },
    `data:image/png;base64,${buffer.toString("base64")}`,
  );
  expect(alpha.removed).toBeGreaterThan(20);
  expect(alpha.added).toBe(0);
  expect(alpha.pivot).toBe(alpha.originalPivot);
  await page.getByTestId("end-cut__end").selectOption("end");
  await page.getByTestId("end-cut__radius").fill("2.3");
  const settings = page.waitForEvent("download");
  await page.getByTestId("end-cut__settings").click();
  const json = JSON.parse(
    await readFile((await (await settings).path())!, "utf8"),
  );
  expect(json.cuts["near-thigh"].start.radius).toBe(2);
  expect(json.cuts["near-thigh"].end.radius).toBe(2.3);
  expect(json.cuts["far-thigh"].start.radius).toBe(5.2);
  await page.getByTestId("end-cut__reset").click();
  expect(await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    before,
  );
  await page.getByTestId("end-cut__part").selectOption("far-forearm");
  await page.getByTestId("end-cut__end").selectOption("start");
  await expect(page.getByTestId("end-cut__radius")).toHaveValue("2.5");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

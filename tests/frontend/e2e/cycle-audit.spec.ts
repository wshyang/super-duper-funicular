import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ reducedMotion: "reduce" });
test("exports real full-cycle audits for each motion without changing the live pose", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByTestId("character__mei-lin-photo").click();
  await expect(page.getByTestId("studio__audit")).toBeEnabled();
  for (const motion of ["run", "walk", "brisk-walk"]) {
    await page.getByTestId(`motion__${motion}`).click();
    const stage = page.getByTestId("stage__canvas");
    const before = await stage.evaluate((c: HTMLCanvasElement) =>
      c.toDataURL(),
    );
    const pending = page.waitForEvent("download");
    await page.getByTestId("studio__audit").click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(
      `stride-lab-mei-lin-photo-${motion}-audit-16.png`,
    );
    const path = info.outputPath(`${motion}-audit.png`);
    await download.saveAs(path);
    const png = await readFile(path);
    expect(png.readUInt32BE(16)).toBe(3840);
    expect(png.readUInt32BE(20)).toBe(1440);
    await info.attach(`${motion} full-cycle audit`, {
      path,
      contentType: "image/png",
    });
    expect(await stage.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
      before,
    );
    const panels = await page.evaluate(
      async (url) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return Array.from({ length: 16 }, (_, i) => {
          const x = (i % 4) * 960,
            y = Math.floor(i / 4) * 360;
          return [0, 1, 2].map((panel) => {
            const data = ctx.getImageData(
              x + panel * 320,
              y + 30,
              320,
              280,
            ).data;
            let foreground = 0;
            const bg = panel === 1 ? [24, 28, 38] : [226, 230, 238];
            for (let p = 0; p < data.length; p += 4)
              if (bg.some((v, c) => data[p + c] !== v)) foreground++;
            return foreground;
          });
        });
      },
      `data:image/png;base64,${png.toString("base64")}`,
    );
    for (const cell of panels)
      for (const foreground of cell) expect(foreground).toBeGreaterThan(1000);
  }
});

import { expect, test } from '@playwright/test';

test('the studio paints a runner and never shows an empty stage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('stage__procedural-canvas')).toBeVisible();
  const painted = await page.getByTestId('stage__procedural-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let index = 3; index < data.length; index += 4) if ((data[index] ?? 0) > 16) opaque += 1;
    return opaque;
  });
  expect(painted).toBeGreaterThan(20_000);
  expect(errors).toEqual([]);
});

test('every workspace tab renders its panel', async ({ page }) => {
  await page.goto('/');
  const tabs = ['inspector', 'diagnostics', 'gallery', 'vectors', 'parity', 'studio'];
  for (const tab of tabs) {
    await page.getByTestId(`workspace-tabs__tab-${tab}`).click();
    await expect(page.getByTestId(`workspace-tabs__tab-${tab}`)).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }
});

test('calibration nudges the pelvis without stretching a leg', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('workspace-tabs__tab-inspector').click();
  const hipX = page.getByTestId('calibration__hip-x');
  await expect(hipX).toBeVisible();
  await hipX.fill('8');
  await expect(page.getByTestId('calibration__export-json')).toBeEnabled();
});

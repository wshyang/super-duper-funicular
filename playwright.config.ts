import { defineConfig, devices } from '@playwright/test';

/**
 * Video is on by default so a failing run still shows what the browser saw.
 * Browsers are not installed in every environment:
 *   npx playwright install chromium && npm run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    video: process.env.PLAYWRIGHT_NO_VIDEO ? 'off' : 'on',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

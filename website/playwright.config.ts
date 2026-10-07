import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the real production build (`astro preview` serves dist/),
 * on a desktop and a phone viewport. Locally they use the installed Google Chrome;
 * CI installs Playwright's Chromium.
 */
const PORT = 4329;
const channel = process.env.CI ? undefined : 'chrome';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'phone', use: { ...devices['Pixel 7'], channel } },
  ],
});

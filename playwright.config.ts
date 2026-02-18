import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Electron e2e tests.
 *
 * No webServer needed -- tests launch the Electron app directly.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: 0,
  use: {
    trace: 'on-first-retry',
  },
});

import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Electron e2e tests.
 *
 * The compiled main.js connects to localhost:5173 for the renderer,
 * so we start a Vite dev server before running tests.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: 0,
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 15000,
  },
});

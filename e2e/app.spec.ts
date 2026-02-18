import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'node:path';

let app: ElectronApplication;
let page: Page;

/**
 * Launch the Electron app using the development binary and Vite-compiled main.
 *
 * Uses node_modules/electron (no Fuses) with the pre-compiled .vite/build/main.js.
 * Requires `electron-forge start` to have been run at least once to populate .vite/.
 */
test.beforeAll(async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const mainPath = path.join(projectRoot, '.vite', 'build', 'main.js');

  app = await electron.launch({
    args: [mainPath],
    cwd: projectRoot,
    timeout: 20000,
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app?.close();
});

test.describe.configure({ mode: 'serial' });

test('splash screen shows and unlocks audio', async () => {
  // Splash screen should be visible initially
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible({ timeout: 10000 });

  // Click start button to unlock AudioContext
  const startButton = page.getByTestId('start-button');
  await expect(startButton).toBeVisible();
  await startButton.click();

  // Splash should disappear after audio init
  await expect(splash).not.toBeVisible({ timeout: 10000 });

  // Verify AudioContext is running
  const audioState = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__audioContext?.state;
  });
  expect(audioState).toBe('running');
});

test('voice buttons are visible and interactive', async () => {
  // Should have 8 voice buttons
  for (let i = 0; i < 8; i++) {
    const btn = page.getByTestId(`voice-button-${i}`);
    await expect(btn).toBeVisible();
  }
});

test('waveform selector buttons exist', async () => {
  const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
  for (const wf of waveforms) {
    const btn = page.getByTestId(`waveform-${wf}`);
    await expect(btn).toBeVisible();
  }
});

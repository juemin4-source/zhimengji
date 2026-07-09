import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './test-results',

  use: {
    baseURL: 'http://localhost:1420',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    port: 1420,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    /**
     * Tauri project — connects to tauri-driver CDP endpoint.
     * No webServer because Tauri is started externally (by e2e-tauri.ps1 or manually).
     * Tests use chromium.connectOverCDP('http://127.0.0.1:4444') to attach.
     */
    {
      name: 'tauri',
      use: {
        browserName: 'chromium',
        // No baseURL — tests connect via CDP directly
        baseURL: undefined,
      },
    },
  ],
});

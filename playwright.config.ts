import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: ["**/tauri/**"],
      use: {
        browserName: "chromium",
      },
    },
    /* ── tauri-driver E2E (桌面端真实 Tauri 窗口测试) ──
     *
     * 网络: tauri-driver -> 被测 Tauri 应用
     * 端口: tauri-driver 监听 127.0.0.1:4444
     *
     * 运行方式 1 — 手动构建+启动（推荐首次）:
     *   1. npm run tauri build
     *   2. tauri-driver &
     *   3. npx playwright test --project=tauri
     *
     * 运行方式 2 — 一键脚本:
     *   npm run e2e:tauri
     */
    {
      name: "tauri",
      testDir: "./e2e/tauri",
      use: {
        // tauri-driver 启动的 Tauri 窗口通过 CDP 暴露
        // playwright 通过 connectOverCDP 连接
        connectOptions: {
          wsEndpoint: "http://127.0.0.1:4444",
        },
        viewport: { width: 1200, height: 800 },
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? "npx vite preview --port 1420"
      : "npx vite --port 1420",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    cwd: ".",
  },
});

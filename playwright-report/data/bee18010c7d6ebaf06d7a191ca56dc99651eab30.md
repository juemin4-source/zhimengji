# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tauri\smoke.spec.ts >> tauri-driver: 织梦机桌面窗口 >> UI 组件正常渲染
- Location: e2e\tauri\smoke.spec.ts:41:3

# Error details

```
Error: browserType.connectOverCDP: connect ECONNREFUSED 127.0.0.1:4444
Call log:
  - <ws preparing> retrieving websocket url from http://127.0.0.1:4444

```

# Test source

```ts
  1  | import { test, expect, chromium } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * tauri-driver E2E smoke test — 真实 Tauri 窗口路径
  5  |  *
  6  |  * 前置条件:
  7  |  *   1. npm run tauri build       — 构建 Tauri 桌面应用
  8  |  *   2. tauri-driver               — 启动 WebDriver 桥接 (port 4444)
  9  |  *   3. npx playwright test --project=tauri  — 跑本测试
  10 |  *
  11 |  * 本测试验证 Tauri 桌面窗口能正常启动并展示织梦机 UI。
  12 |  * 与 e2e/*.spec.ts (纯浏览器、mock Tauri IPC) 不同，
  13 |  * 这是真正走 tauri-driver WebDriver/CDP 路径的桌面端 E2E。
  14 |  */
  15 | 
  16 | test.describe("tauri-driver: 织梦机桌面窗口", () => {
  17 |   test("窗口加载并展示作品书架", async ({}) => {
  18 |     // 通过 tauri-driver 的 CDP 端点连接 Tauri 窗口
  19 |     const browser = await chromium.connectOverCDP("http://127.0.0.1:4444");
  20 |     const context = browser.contexts()[0];
  21 |     const page = context.pages()[0];
  22 | 
  23 |     await test.step("窗口标题包含织梦机", async () => {
  24 |       await expect(page).toHaveTitle(/织梦机/, { timeout: 15000 });
  25 |     });
  26 | 
  27 |     await test.step("作品书架渲染", async () => {
  28 |       await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  29 |     });
  30 | 
  31 |     await test.step("确认在真实 Tauri 上下文中", async () => {
  32 |       const hasTauriInternals = await page.evaluate(() => {
  33 |         return typeof (window as any).__TAURI_INTERNALS__ !== "undefined";
  34 |       });
  35 |       expect(hasTauriInternals).toBe(true);
  36 |     });
  37 | 
  38 |     await browser.close();
  39 |   });
  40 | 
  41 |   test("UI 组件正常渲染", async ({}) => {
> 42 |     const browser = await chromium.connectOverCDP("http://127.0.0.1:4444");
     |                                    ^ Error: browserType.connectOverCDP: connect ECONNREFUSED 127.0.0.1:4444
  43 |     const context = browser.contexts()[0];
  44 |     const page = context.pages()[0];
  45 | 
  46 |     // 新建作品按钮存在
  47 |     await expect(page.getByLabel("新建作品")).toBeVisible({ timeout: 10000 });
  48 | 
  49 |     // 头部导航或功能按钮存在
  50 |     const hasNav = await page.evaluate(() => {
  51 |       return document.querySelectorAll("nav, header, [role='navigation']").length > 0;
  52 |     });
  53 |     expect(hasNav).toBe(true);
  54 | 
  55 |     await browser.close();
  56 |   });
  57 | });
  58 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\app-loads.spec.ts >> 织梦机冒烟测试 >> 应用加载并显示作品书架
- Location: e2e\smoke\app-loads.spec.ts:4:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:1420/
Call log:
  - navigating to "http://localhost:1420/", waiting until "load"

```

# Test source

```ts
  1  | ﻿import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('织梦机冒烟测试', () => {
  4  |   test('应用加载并显示作品书架', async ({ page }) => {
  5  |     test.setTimeout(120_000);
  6  | 
  7  |     // 导航到 Tauri 应用
> 8  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:1420/
  9  |     await page.waitForLoadState('load');
  10 | 
  11 |     // 验证页面有内容
  12 |     const title = await page.title();
  13 |     expect(title).toBeTruthy();
  14 |     console.log('页面标题:', title);
  15 | 
  16 |     // 保存截图
  17 |     await page.screenshot({ path: 'test-results/smoke-load.png', fullPage: true });
  18 |   });
  19 | });
  20 | 
```
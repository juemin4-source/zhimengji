# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cdp-real.spec.ts >> 织梦机真实应用 >> Bookshelf 显示且有新建按钮
- Location: e2e\cdp-real.spec.ts:32:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: '新建作品' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: '新建作品' })

```

```yaml
- heading "嗯… 无法访问此页面" [level=1]
- paragraph:
  - strong: localhost
  - text: 拒绝连接。
- paragraph: 请尝试：
- list:
  - listitem: •检查连接
  - listitem:
    - text: •
    - link "检查代理和防火墙":
      - /url: "#buttons"
- text: ERR_CONNECTION_REFUSED
- button "刷新"
- text: Microsoft Edge
```

# Test source

```ts
  1  | ﻿/**
  2  |  * 织梦机真实 E2E 测试
  3  |  * 通过 CDP 直接连接桌面窗口，不 mock，全真实后端
  4  |  */
  5  | import { test, expect, chromium } from '@playwright/test';
  6  | 
  7  | test.describe('织梦机真实应用', () => {
  8  |   let browser: any;
  9  |   let page: any;
  10 | 
  11 |   test.beforeAll(async () => {
  12 |     browser = await chromium.connectOverCDP('http://localhost:9222');
  13 |     const context = browser.contexts()[0];
  14 |     page = context.pages()[0];
  15 |   });
  16 | 
  17 |   test.afterAll(async () => {
  18 |     // 不断开连接，让桌面窗口继续运行
  19 |   });
  20 | 
  21 |   test('应用已加载并显示内容', async () => {
  22 |     const title = await page.title();
  23 |     console.log('窗口标题:', title);
  24 |     
  25 |     const bodyText = await page.locator('body').textContent();
  26 |     expect(bodyText.length).toBeGreaterThan(0);
  27 |     console.log('页面内容长度:', bodyText.length);
  28 |     
  29 |     await page.screenshot({ path: 'test-results/cdp-real-app.png' });
  30 |   });
  31 | 
  32 |   test('Bookshelf 显示且有新建按钮', async () => {
  33 |     // 如果是空书架
  34 |     const emptyVisible = await page.getByText('还没有作品').isVisible().catch(() => false);
  35 |     console.log('空书架:', emptyVisible);
  36 |     
  37 |     const newBtn = page.getByRole('button', { name: '新建作品' });
> 38 |     await expect(newBtn).toBeVisible({ timeout: 5000 });
     |                          ^ Error: expect(locator).toBeVisible() failed
  39 |     console.log('新建作品按钮可见 ✅');
  40 |   });
  41 | 
  42 |   test('创建真实项目', async () => {
  43 |     const newBtn = page.getByRole('button', { name: '新建作品' });
  44 |     if (await newBtn.isVisible()) {
  45 |       await newBtn.click();
  46 |       
  47 |       // 填写名称
  48 |       const nameInput = page.getByPlaceholder('输入作品名称...');
  49 |       await expect(nameInput).toBeVisible({ timeout: 3000 });
  50 |       await nameInput.fill('CDP 测试项目');
  51 |       
  52 |       // 选择从零开始
  53 |       await page.getByText('从零开始').first().click();
  54 |       
  55 |       // 下一步 + 开始创作
  56 |       await page.getByRole('button', { name: '下一步' }).click();
  57 |       await page.getByRole('button', { name: '开始创作' }).click();
  58 |       
  59 |       // 验证进入编辑器
  60 |       await expect(page.getByTitle('返回书架')).toBeVisible({ timeout: 5000 });
  61 |       console.log('项目已创建 ✅');
  62 |     }
  63 |   });
  64 | });
  65 | 
```
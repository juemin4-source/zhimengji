import { test, expect } from '@playwright/test';

test.describe('织梦机真实应用测试', () => {
  test('应用启动并加载主页', async ({ page }) => {
    test.setTimeout(120_000);

    // 页面即 WebView2 窗口
    await page.waitForLoadState('load');
    console.log('页面标题:', await page.title());

    // 截图
    await page.screenshot({ path: 'test-results/real-app-loaded.png', fullPage: true });

    // 检查是否有内容
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(0);
    console.log('页面内容长度:', bodyText.length);
  });

  test('作品书架渲染', async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForLoadState('load');

    // 看看页面渲染了什么
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log('按钮数量:', buttonCount);

    for (let i = 0; i < buttonCount; i++) {
      const text = await buttons.nth(i).textContent();
      console.log(`  按钮[${i}]: "${text?.trim()}"`);
    }
  });
});

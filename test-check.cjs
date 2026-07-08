const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  console.log('title:', await page.title());
  console.log('空书架:', await page.getByText('还没有作品').isVisible().catch(() => false));
  const btns = await page.locator('button').all();
  for (const b of btns) {
    const t = await b.textContent();
    if (t && t.trim()) console.log('btn:', t.trim().substring(0, 30));
  }
  // 不断开连接，保持窗口活跃
})();

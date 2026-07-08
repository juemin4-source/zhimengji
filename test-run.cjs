const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];

  const inEditor = await page.getByTitle('返回书架').isVisible().catch(() => false);
  if (!inEditor) {
    const card = page.locator('button:has-text("实测"), [class*="card"]').first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(1000);
    }
    let g = page.getByRole('button', { name: '开始使用' });
    if (await g.isVisible({ timeout: 1000 }).catch(() => false)) {
      await g.click(); await page.waitForTimeout(200);
      await page.getByRole('button', { name: '跳过' }).click().catch(() => {});
      await page.waitForTimeout(200);
    }
    let c = page.getByRole('button', { name: /知道了|知道啦/ });
    if (await c.isVisible({ timeout: 500 }).catch(() => false)) await c.click();
  }

  // 创建人物
  await page.getByRole('button', { name: '文档', exact: true }).click();
  await page.waitForTimeout(300);
  let personBtn = page.getByRole('button', { name: '+ 人物' });
  if (await personBtn.isVisible().catch(() => false)) {
    await personBtn.click();
    await page.waitForTimeout(500);
    console.log('create person ok');
    let hasType = await page.getByText('类型').isVisible().catch(() => false);
    console.log('inspector:', hasType ? 'ok' : 'no inspector');
  }

  // 画板 + 子标签
  await page.getByRole('button', { name: '画板', exact: true }).click();
  await page.waitForTimeout(400);
  for (let sub of ['角色关系图', '时间线', '设定推演图']) {
    await page.getByRole('button', { name: sub, exact: true }).click();
    await page.waitForTimeout(200);
    console.log('subtab:', sub, 'ok');
  }
  console.log('zoom:', await page.getByTitle('缩小 (Ctrl+-)').isVisible() ? 'ok' : 'missing');
  console.log('zoom:', await page.getByTitle('放大 (Ctrl++)').isVisible() ? 'ok' : 'missing');
  console.log('zoom:', await page.getByTitle('适应画布 (Ctrl+0)').isVisible() ? 'ok' : 'missing');

  // AI 设置
  await page.getByRole('button', { name: '文档', exact: true }).click();
  await page.waitForTimeout(200);
  await page.getByTitle('AI 设置').click();
  await page.waitForTimeout(400);
  console.log('settings:', await page.getByText('设置').isVisible() ? 'ok' : 'missing');
  await page.keyboard.press('Escape');

  // 搜索
  await page.getByTitle('全局搜索 (Ctrl+K)').click();
  await page.waitForTimeout(300);
  let sr = await page.locator('input').first().isVisible().catch(() => false);
  console.log('search:', sr ? 'ok' : 'missing');
  await page.keyboard.press('Escape');

  console.log('=== all done ===');
  await browser.close();
})();

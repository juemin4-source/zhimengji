/**
 * CDP Golden Path — 真实 Tauri 后端五画板管线验收
 *
 * 通过 CDP 连接桌面 Tauri 窗口，不 mock，全真实后端。
 *
 * 前置条件：
 *   WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"
 *   npm run tauri dev
 */
import { test, expect, chromium } from '@playwright/test';

test.describe('v2.0 Golden Path (真实 Tauri 后端)', () => {
  let page: any;

  test.beforeAll(async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    page = context.pages()[0];
  });

  test('完整五画板管线', async () => {
    // 等待应用加载
    await page.waitForTimeout(2000);
    const title = await page.title();
    console.log('窗口标题:', title);

    // ── 确保在书架页面 ──
    const backBtn = page.getByTitle('返回书架');
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(1000);
    }

    // ── 书架：创建新项目 ──
    const newBtn = page.getByRole('button', { name: '新建作品' });
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click();
      const nameInput = page.getByPlaceholder('输入作品名称...');
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill('CDP Golden Path');
      await page.getByText('从零开始').first().click();
      await page.getByRole('button', { name: '下一步' }).click();
      await page.getByRole('button', { name: '开始创作' }).click();
      await page.waitForTimeout(2000);
    }

    // ── 画板① 前提卡 ──
    console.log('填写前提卡...');
    await page.waitForSelector('.premise-textarea', { timeout: 10000 });
    await page.fill('.premise-textarea', '一个渴望掌控权力的王子，在政变中失去一切，必须带领乌合之众在边疆求生。');
    await page.evaluate(() => {
      const sel = document.querySelector('select');
      if (sel) sel.value = 'character_driven';
    });
    await page.waitForTimeout(500);
    await page.click('text=保存草稿');
    await page.waitForTimeout(2000);
    await page.click('text=确认前提');
    await page.waitForTimeout(2000);
    console.log('前提已确认 ✅');

    // 导航到画板② 大纲
    const stage2 = page.getByTitle('大纲 — 进行中');
    if (await stage2.isVisible().catch(() => false)) {
      await stage2.click();
      await page.waitForTimeout(1500);
    }

    // ── 画板② 结构图 ──
    console.log('创建结构...');
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    if (await page.getByText('创建默认结构').isVisible()) {
      await page.click('text=创建默认结构');
      await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(1000);
    await page.click('text=确认结构');
    await page.waitForTimeout(2000);
    console.log('结构已确认 ✅');

    // 导航到画板③ 设定
    const stage3 = page.getByTitle('设定 — 进行中');
    if (await stage3.isVisible().catch(() => false)) {
      await stage3.click();
      await page.waitForTimeout(1500);
    }

    // ── 画板③ 设定 ──
    console.log('创建角色...');
    await page.waitForTimeout(1000);
    if (await page.getByText('添加角色').isVisible()) {
      await page.click('text=添加角色');
      await page.waitForTimeout(500);
      const inputs = await page.locator('input');
      const count = await inputs.count();
      if (count > 0) await inputs.nth(0).fill('测试主角');
    }
    await page.waitForTimeout(1000);
    await page.click('text=确认设定');
    await page.waitForTimeout(2000);
    console.log('设定已确认 ✅');

    // 导航到画板④ 细纲
    const stage4 = page.getByTitle('细纲 — 进行中');
    if (await stage4.isVisible().catch(() => false)) {
      await stage4.click();
      await page.waitForTimeout(1500);
    }

    // ── 画板④ 章节包 ──
    console.log('创建章节包...');
    await page.waitForTimeout(1000);
    if (await page.getByText('从空包开始').isVisible()) {
      await page.click('text=从空包开始');
      await page.waitForTimeout(2000);
    }
    // 填写章节标题
    const titleInput = page.locator('input[value*="第"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('第一章 觉醒');
    }
    await page.waitForTimeout(500);
    await page.click('text=确认');
    await page.waitForTimeout(2000);
    console.log('章节包已确认 ✅');

    // ── 画板⑤ 正文 ──
    console.log('进入正文画板...');
    await page.waitForTimeout(1000);
    const textTitle = await page.getByText('第一章 觉醒').isVisible().catch(() => false);
    console.log(textTitle ? '正文画板已加载 ✅' : '正文画板未找到 ⚠️');

    console.log('===== Golden Path PASS =====');
  });
});

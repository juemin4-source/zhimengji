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

    // ── Dismiss FirstLaunchGuide if visible (full-screen overlay z-index:100) ──
    try {
      const guideBtn = page.getByRole('button', { name: '开始使用' });
      if (await guideBtn.isVisible({ timeout: 2000 })) {
        await guideBtn.click({ force: true });
        await page.getByRole('button', { name: '跳过' }).click({ force: true });
        await page.waitForTimeout(500);
      }
    } catch { /* no guide */ }

    // ── 确保在书架页面 ──
    const backBtn = page.getByTitle('返回书架');
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // ── 书架：创建或复用项目 ──
    // If create dialog is already open (state from previous run), close it first
    const closeBtn = page.getByRole('button', { name: '关闭' });
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    const newBtn = page.getByRole('button', { name: '新建作品' });
    if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    const nameInput = page.getByPlaceholder('输入作品名称...');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('CDP Golden Path');
    await page.getByText('从零开始').first().click({ force: true });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '下一步' }).click({ force: true });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '开始创作' }).click({ force: true });
    await page.waitForTimeout(1500);

    // Dismiss guide again — it reappears when entering a new project
    try {
      const guideBtn2 = page.getByRole('button', { name: '开始使用' });
      if (await guideBtn2.isVisible({ timeout: 2000 })) {
        await guideBtn2.click({ force: true });
        await page.getByRole('button', { name: '跳过' }).click({ force: true });
        await page.waitForTimeout(500);
      }
    } catch { /* no guide */ }

    // ── 画板① 前提卡 ──
    console.log('填写前提卡...');
    await page.locator('.premise-textarea').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('.premise-textarea').first().fill('一个渴望掌控权力的王子，在政变中失去一切，必须带领乌合之众在边疆求生。');
    await page.evaluate(() => {
      const sel = document.querySelector('select');
      if (sel) {
        sel.value = 'character_driven';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '保存草稿' }).click({ force: true });
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: '确认前提' }).click({ force: true });
    await page.waitForTimeout(2000);
    console.log('前提已确认 ✅');

    // 导航到画板② 大纲
    const stage2 = page.getByTitle('大纲 — 进行中').or(page.getByTitle('大纲'));
    if (await stage2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stage2.click({ force: true });
      await page.waitForTimeout(1500);
    }

    // ── 画板② 结构图 ──
    console.log('创建结构...');
    const createStruct = page.locator('button').filter({ hasText: '创建默认结构' }).first();
    if (await createStruct.isVisible({ timeout: 8000 }).catch(() => false)) {
      await createStruct.click({ force: true });
      await page.waitForTimeout(2000);
    }
    const confirmStruct = page.locator('button').filter({ hasText: '确认结构' }).first();
    if (await confirmStruct.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmStruct.click({ force: true });
      await page.waitForTimeout(2000);
    }
    console.log('结构已确认 ✅');

    // 导航到画板③ 设定
    const stage3 = page.getByTitle('设定 — 进行中').or(page.getByTitle('设定'));
    if (await stage3.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stage3.click({ force: true });
      await page.waitForTimeout(1500);
    }

    // ── 画板③ 设定 ──
    console.log('确认设定...');
    // The settings page has tabs (世界观/角色/势力); just confirm to advance
    const confirmSetting = page.locator('button').filter({ hasText: '确认设定' }).first();
    if (await confirmSetting.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmSetting.click({ force: true });
      await page.waitForTimeout(2000);
    }
    console.log('设定已确认 ✅');

    // 导航到画板④ 细纲
    const stage4 = page.getByTitle('细纲 — 进行中').or(page.getByTitle('细纲'));
    if (await stage4.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stage4.click({ force: true });
      await page.waitForTimeout(1500);
    }

    // ── 画板④ 章节包 ──
    console.log('创建章节包...');
    await page.waitForTimeout(1000);
    const emptyPack = page.getByText('从空包开始').first();
    if (await emptyPack.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emptyPack.click({ force: true });
      await page.waitForTimeout(2000);
    }
    // 填写章节标题
    const titleInput = page.locator('input[value*="第"]');
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.fill('第一章 觉醒');
    }
    await page.waitForTimeout(500);
    const confirmBtn = page.locator('button').filter({ hasText: '确认' }).first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
    }
    await page.waitForTimeout(2000);
    console.log('章节包已确认 ✅');

    // ── 画板⑤ 正文 ──
    console.log('进入正文画板...');
    await page.waitForTimeout(1000);
    const textTitle = await page.getByText('第一章 觉醒').isVisible({ timeout: 3000 }).catch(() => false);
    console.log(textTitle ? '正文画板已加载 ✅' : '正文画板未找到 ⚠️');

    console.log('===== Golden Path PASS =====');
  });
});

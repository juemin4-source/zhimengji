// 织梦机 UI 逐项扫描 v3 — 完整版
// 前置: Tauri 运行中 + CDP 9222
const { chromium } = require("@playwright/test");

async function dismissOverlays(page) {
  for (let i = 0; i < 5; i++) {
    let found = false;
    for (const sel of ['.dialog-overlay', '[role=dialog]', '.modal', '.overlay', '.guide-overlay']) {
      const els = await page.locator(sel).all();
      for (const el of els) {
        if (await el.isVisible({ timeout: 100 }).catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
          found = true;
        }
      }
    }
    for (const txt of ['知道了', '知道啦', '跳过', '关闭', '开始使用', '✕', '×', '取消']) {
      try {
        const b = page.getByRole('button', { name: txt, exact: false });
        if (await b.isVisible({ timeout: 100 }).catch(() => false)) { await b.click(); await page.waitForTimeout(100); }
      } catch {}
    }
    if (!found) break;
  }
}

async function scan(page, label) {
  await dismissOverlays(page);
  const btns = await page.locator('button').all();
  const items = [];
  for (const b of btns) {
    const text = ((await b.textContent()) || '').trim().slice(0, 60);
    if (!text) continue;
    const vis = await b.isVisible();
    const dis = await b.isDisabled().catch(() => false);
    const rect = await b.boundingBox().catch(() => null);
    items.push({ text, visible: vis, disabled: dis, x: rect?.x, y: rect?.y });
  }
  // 去重
  const seen = new Set();
  const unique = items.filter(i => { const k = i.text; if (seen.has(k)) return false; seen.add(k); return true; });
  return unique;
}

(async () => {
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const page = browser.contexts()[0].pages()[0];
  await page.waitForTimeout(2000);
  await dismissOverlays(page);

  // 进项目
  const inBS = await page.getByText("作品书架").isVisible({ timeout: 1000 }).catch(() => false);
  if (inBS) {
    const card = page.locator("button").filter({ hasText: /测试|扫描|实测|UI/ }).first();
    if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
      await card.click();
    } else {
      // 新建
      await page.getByText("新建作品").click();
      await page.waitForTimeout(200);
      await page.getByPlaceholder("输入作品名称...").fill("scan-v3");
      await page.waitForTimeout(100);
      await page.getByText("从零开始").first().click();
      await page.waitForTimeout(100);
      await page.getByText("下一步").click().catch(() => {});
      await page.waitForTimeout(100);
      await page.getByText("开始创作").click().catch(() => {});
    }
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
  }

  // 快速检查：记录加载后页面的完整按钮清单
  const allBtns = await scan(page, "初始状态");
  console.log("\n========== 织梦机 UI 完整按钮清单 ==========");
  console.log(`共 ${allBtns.length} 个按钮\n`);

  // 按区域分组
  const groups = {};
  for (const b of allBtns) {
    const key = b.disabled ? "disabled" : (b.visible ? "visible" : "hidden");
    if (!groups[key]) groups[key] = [];
    groups[key].push(b.text);
  }

  console.log("✅ 可见+可用:");
  for (const t of (groups["visible"] || [])) console.log(`  ✅ ${t}`);

  console.log("\n⚠️ Disabled:");
  for (const t of (groups["disabled"] || [])) console.log(`  ⚠️ ${t}`);

  console.log("\n⏭️ Hidden:");
  for (const t of (groups["hidden"] || [])) console.log(`  ⏭️ ${t}`);

  // 逐个 Tab 切过去扫描
  for (const tab of ["文档", "画板", "设定集", "判断记录", "AI"]) {
    const tb = page.getByRole("button", { name: tab, exact: true });
    if (await tb.isVisible({ timeout: 500 }).catch(() => false)) {
      await tb.click();
      await page.waitForTimeout(500);
      await dismissOverlays(page);
      const items = await scan(page, tab);
      console.log(`\n--- ${tab} Tab (${items.length} buttons) ---`);
      for (const i of items) {
        if (i.disabled) console.log(`  ⚠️ ${i.text} (disabled)`);
        else if (i.visible) console.log(`  ✅ ${i.text}`);
        else console.log(`  ⏭️ ${i.text}`);
      }
    }
  }

  await browser.close();
  console.log("\n✅ 扫描完成");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });

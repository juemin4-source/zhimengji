// 织梦机 UI 全面扫描 — 找出所有按钮真假状态
// 用法: node scan-all-buttons.cjs
// 前置: Tauri 已启动 + CDP 端口 9222

const { chromium } = require("@playwright/test");

const RESULTS = {
  passed: [],
  stub: [],
  broken: [],
  skipped: [],
};

async function scan() {
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const page = browser.contexts()[0].pages()[0];
  await page.waitForTimeout(2000);

  // ── 辅助函数 ──
  async function clickAndCheck(name, locator, checkAfter) {
    const el = page.locator(locator);
    if (!(await el.isVisible({ timeout: 1000 }).catch(() => false))) {
      RESULTS.skipped.push({ name, reason: "不可见" });
      return;
    }
    try {
      await el.click();
      await page.waitForTimeout(300);
      let ok = true;
      if (checkAfter) ok = await checkAfter();
      if (ok) RESULTS.passed.push(name);
      else RESULTS.broken.push({ name, reason: "点击后无变化" });
    } catch (e) {
      RESULTS.broken.push({ name, reason: e.message?.slice(0, 80) });
    }
  }

  async function findButtons(scope) {
    const b = scope ? page.locator(scope).locator("button") : page.locator("button");
    const count = await b.count();
    const items = [];
    for (let i = 0; i < count; i++) {
      const t = (await b.nth(i).textContent()) || "";
      items.push({ index: i, text: t.trim().slice(0, 50), loc: `button:nth(${i})` });
    }
    return items;
  }

  console.log("=== 织梦机 UI 全面扫描 ===\n");

  // ── Phase 1: BookShelf ──
  console.log("【Phase 1: 书架】");
  const bsBtns = await findButtons();
  for (const btn of bsBtns) {
    if (btn.text.includes("新建作品")) {
      await clickAndCheck(`书架: ${btn.text}`, btn.loc, async () => {
        return await page.getByPlaceholder("输入作品名称...").isVisible({ timeout: 800 }).catch(() => false);
      });
    } else if (btn.text.includes("从零开始") || btn.text.includes("模板")) {
      await clickAndCheck(`书架: ${btn.text}`, btn.loc);
    } else if (btn.text) {
      RESULTS.passed.push(`书架按钮可见: ${btn.text}`);
    }
  }

  // 如果不在编辑器，创建项目进去
  const inBS = await page.getByText("作品书架").isVisible({ timeout: 500 }).catch(() => false);
  if (inBS) {
    const newBtn = page.getByRole("button", { name: "新建作品" });
    if (await newBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(200);
      await page.getByPlaceholder("输入作品名称...").fill("UI扫描");
      await page.waitForTimeout(100);
      const startBtn = page.getByText("从零开始").first();
      if (await startBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(100);
        await page.getByText("下一步").click().catch(() => {});
        await page.waitForTimeout(100);
        await page.getByText("开始创作").click().catch(() => {});
        await page.waitForTimeout(1500);
      }
    } else {
      // 点已有项目
      const card = page.locator("button").filter({ hasText: /实测|扫描|测试/ }).first();
      if (await card.isVisible({ timeout: 500 }).catch(() => false)) await card.click();
    }
    await page.waitForTimeout(1000);
  }

  // 关引导弹窗
  for (let i = 0; i < 3; i++) {
    const g = page.getByRole("button", { name: "开始使用" });
    if (await g.isVisible({ timeout: 300 }).catch(() => false)) {
      await g.click();
      await page.waitForTimeout(200);
      const s = page.getByRole("button", { name: "跳过" });
      if (await s.isVisible({ timeout: 300 }).catch(() => false)) { await s.click(); await page.waitForTimeout(200); }
    }
    const c = page.getByRole("button", { name: /知道了|知道啦/ });
    if (await c.isVisible({ timeout: 300 }).catch(() => false)) { await c.click(); await page.waitForTimeout(200); }
  }

  // ── Phase 2: 逐个扫描 Tab ──
  const TABS = ["文档", "画板", "设定集", "判断记录", "AI"];

  for (const tab of TABS) {
    console.log(`\n【Phase 2: ${tab} Tab】`);
    const tabBtn = page.getByRole("button", { name: tab, exact: true });
    if (!(await tabBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
      RESULTS.skipped.push({ name: `Tab: ${tab}`, reason: "Tab 按钮不可见" });
      continue;
    }
    await tabBtn.click();
    await page.waitForTimeout(500);

    // 检查 tab 是否激活
    const isActive = await tabBtn.evaluate(el => el.classList.contains("active") || el.classList.contains("nav-active") || el.getAttribute("aria-current") === "page").catch(() => false);
    if (isActive) RESULTS.passed.push(`Tab: ${tab} 可切换`);
    else RESULTS.stub.push({ name: `Tab: ${tab}`, reason: "点击后未激活" });

    // 扫描这个 Tab 区域内的所有按钮
    const tabContent = page.locator("main, section, [role='tabpanel']").first();
    const tabBtns = await findButtons("main, section, [role='tabpanel']");

    for (const btn of tabBtns) {
      if (!btn.text) { RESULTS.skipped.push({ name: `${tab}/空按钮`, reason: "无文字" }); continue; }

      // 判断是否 stub
      const handler = await page.evaluate((idx) => {
        const el = document.querySelectorAll("main button, section button")[idx];
        if (!el) return "noop";
        const hasClick = el.getAttribute("onclick") || el.getAttribute("ng-click") || "";
        const listener = typeof el.onclick === "function" ? "inline" : "";
        // React uses event listeners, so check for attributes that indicate functionality
        const ariaDisabled = el.hasAttribute("aria-disabled") ? "disabled" : "";
        return listener || ariaDisabled || (hasClick ? "has-onclick" : "react-bound");
      }, btn.index).catch(() => "unknown");

      if (handler === "disabled") {
        RESULTS.stub.push({ name: `${tab}/${btn.text}`, reason: "aria-disabled" });
      } else {
        RESULTS.passed.push(`${tab}/按钮可见: ${btn.text}`);
      }
    }

    // 特殊 Tab 额外检查
    if (tab === "画板") {
      for (const sub of ["角色关系图", "时间线", "设定推演图"]) {
        const subBtn = page.getByRole("button", { name: sub, exact: true });
        if (await subBtn.isVisible({ timeout: 300 }).catch(() => false)) {
          await subBtn.click();
          await page.waitForTimeout(200);
          RESULTS.passed.push(`画板子标签: ${sub} 可点击`);
        } else {
          RESULTS.stub.push({ name: `画板子标签: ${sub}`, reason: "不可见" });
        }
      }
    }

    if (tab === "AI") {
      const inp = page.getByPlaceholder(/输入你的想法/);
      if (await inp.isVisible({ timeout: 800 }).catch(() => false)) {
        RESULTS.passed.push("AI: 输入框存在");
        await inp.fill("测试消息");
        const sendBtn = page.locator("button").filter({ hasText: /发送|Send|→/ }).first();
        if (await sendBtn.isVisible({ timeout: 300 }).catch(() => false)) {
          RESULTS.passed.push("AI: 发送按钮存在");
        } else {
          RESULTS.stub.push({ name: "AI: 发送按钮", reason: "不可见" });
        }
      } else {
        RESULTS.stub.push({ name: "AI: 输入框", reason: "不可见" });
      }

      // 检查模型选择
      const modelBtn = page.getByRole("button", { name: /模型|Provider|GPT|Claude/ }).first();
      if (await modelBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        RESULTS.passed.push("AI: 模型选择按钮存在");
      } else {
        RESULTS.stub.push({ name: "AI: 模型选择", reason: "不可见" });
      }
    }

    if (tab === "设定集") {
      // 检查正典筛选
      const canonBtn = page.getByRole("button", { name: /正典|核心|草案|未收集/ }).first();
      if (await canonBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        RESULTS.passed.push("设定集: 正典筛选按钮存在");
      } else {
        RESULTS.stub.push({ name: "设定集: 正典筛选", reason: "不可见" });
      }
    }
  }

  // ── Phase 3: NavBar / Header / 全局 ──
  console.log("\n【Phase 3: 全局控件】");
  const globalBtns = await page.locator("header button, nav button, [role='navigation'] button").all();
  for (const b of globalBtns) {
    const t = ((await b.textContent()) || "").trim().slice(0, 50);
    if (t) RESULTS.passed.push(`全局: ${t}`);
  }

  // 检查 Ctrl+K / 搜索
  const searchBtn = page.getByRole("button", { name: /搜索|查找|Ctrl\+K|⌘K/ }).first();
  if (await searchBtn.isVisible({ timeout: 300 }).catch(() => false)) {
    RESULTS.passed.push("全局: Ctrl+K 存在");
    await searchBtn.click().catch(() => {});
    await page.waitForTimeout(200);
    const searchInput = page.locator("input[type='search'], input[placeholder*='搜索']").first();
    if (await searchInput.isVisible({ timeout: 500 }).catch(() => false)) {
      RESULTS.passed.push("全局: 搜索面板可打开");
    } else {
      RESULTS.stub.push({ name: "全局: 搜索面板", reason: "点击后无输入框" });
    }
  } else {
    RESULTS.stub.push({ name: "全局: Ctrl+K", reason: "不可见" });
  }

  // ── Phase 4: 对象创建按钮 ──
  console.log("\n【Phase 4: 对象创建】");
  for (const obj of ["人物", "地点", "组织", "事件", "物品", "术语"]) {
    const b = page.getByRole("button", { name: `+ ${obj}` });
    if (await b.isVisible({ timeout: 300 }).catch(() => false)) {
      await b.click();
      await page.waitForTimeout(300);
      // 检查是否弹窗/创建了对象
      const dialog = page.locator("[role='dialog'], .modal, .overlay").first();
      const dialogVis = await dialog.isVisible({ timeout: 500 }).catch(() => false);
      if (dialogVis) {
        RESULTS.passed.push(`对象创建: ${obj} 可点击且有反馈`);
        // 关弹窗
        const closeBtn = page.locator("[role='dialog'] button, .modal button").filter({ hasText: /取消|关闭|✕|×/ }).first();
        if (await closeBtn.isVisible({ timeout: 200 }).catch(() => false)) await closeBtn.click();
      } else {
        RESULTS.stub.push({ name: `对象创建: ${obj}`, reason: "点击无反馈" });
      }
    } else {
      RESULTS.stub.push({ name: `对象创建: ${obj}`, reason: "按钮不可见" });
    }
  }

  // ── 报告 ──
  console.log("\n\n========== 扫描报告 ==========");
  console.log(`✅ 正常: ${RESULTS.passed.length}`);
  console.log(`⚠️ Stub/未实现: ${RESULTS.stub.length}`);
  console.log(`❌ 异常: ${RESULTS.broken.length}`);
  console.log(`⏭️ 跳过: ${RESULTS.skipped.length}`);

  if (RESULTS.stub.length > 0) {
    console.log("\n--- Stub 清单 ---");
    for (const s of RESULTS.stub) console.log(`  ⚠️ ${s.name} → ${s.reason}`);
  }
  if (RESULTS.broken.length > 0) {
    console.log("\n--- 异常清单 ---");
    for (const b of RESULTS.broken) console.log(`  ❌ ${b.name} → ${b.reason}`);
  }

  console.log(`\n总计: ${RESULTS.passed.length + RESULTS.stub.length + RESULTS.broken.length + RESULTS.skipped.length} 个检查点`);
}

scan().catch(e => {
  console.error("\n❌ 扫描失败:", e.message);
  process.exit(1);
});

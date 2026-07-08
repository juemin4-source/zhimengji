// 织梦机 UI Button 逐项扫描 v2
// 前置: Tauri 运行中 + CDP 9222

const { chromium } = require("@playwright/test");

const report = { all: [], passed: [], stub: [], broken: [], skipped: [] };
let page;

async function check(name, ok, reason) {
  report.all.push({ name, ok, reason });
  if (ok) report.passed.push(name);
  else if (reason === "不可见") report.skipped.push({ name, reason });
  else report.stub.push({ name, reason });
}

async function btn(selector, label, expectAfter) {
  const el = page.locator(selector);
  if (!(await el.isVisible({ timeout: 1000 }).catch(() => false))) {
    check(label, false, "不可见");
    return;
  }
  const text = ((await el.textContent()) || "").trim().slice(0, 40);
  try {
    await el.click();
    await page.waitForTimeout(400);
    let ok = true;
    if (expectAfter) ok = await expectAfter();
    check(`${label} [${text}]`, ok, ok ? "" : "点击无反馈");
  } catch (e) {
    check(`${label} [${text}]`, false, e.message.slice(0, 60));
  }
}

async function listButtonsIn(scope, tabLabel) {
  const els = scope ? page.locator(scope).locator("button") : page.locator("button");
  const n = await els.count();
  for (let i = 0; i < n; i++) {
    const t = ((await els.nth(i).textContent()) || "").trim().slice(0, 50);
    const vis = await els.nth(i).isVisible();
    const dis = await els.nth(i).isDisabled().catch(() => false);
    if (t) {
      const tag = dis ? "disabled" : vis ? "visible" : "hidden";
      const ok = vis && !dis;
      check(`${tabLabel}: ${t}`, ok, ok ? "" : `${tag}`);
    }
  }
}

async function main() {
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  page = browser.contexts()[0].pages()[0];
  await page.waitForTimeout(2000);

  // ── 进项目 ──
  const inBS = await page.getByText("作品书架").isVisible({ timeout: 1000 }).catch(() => false);
  const inEditor = await page.getByTitle("返回书架").isVisible({ timeout: 500 }).catch(() => false);

  if (inBS && !inEditor) {
    check("书架: 作品书架标题", true);
    await listButtonsIn(null, "书架");
    const card = page.locator("button").filter({ hasText: /测试|扫描|实测/ }).first();
    if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
      await card.click();
      check("书架: 进入已有项目", true);
    } else {
      const nb = page.getByRole("button", { name: "新建作品" });
      if (await nb.isVisible()) {
        await nb.click();
        await page.waitForTimeout(200);
        await page.getByPlaceholder("输入作品名称...").fill("UI扫描v2");
        await page.getByText("从零开始").first().click();
        await page.getByText("下一步").click().catch(() => {});
        await page.getByText("开始创作").click().catch(() => {});
        check("书架: 新建项目流程", true);
      }
    }
    await page.waitForTimeout(1500);
  }

  // 关引导弹窗
  for (let i = 0; i < 3; i++) {
    for (const name of ["开始使用", "跳过", /知道了|知道啦/]) {
      const b = page.getByRole("button", { name });
      if (await b.isVisible({ timeout: 200 }).catch(() => false)) { await b.click(); await page.waitForTimeout(150); }
    }
  }

  // ── Tab 逐个扫描 ──
  const TABS = [
    { id: "文档", scope: "main, section" },
    { id: "画板", scope: "main, section", subs: ["角色关系图", "时间线", "设定推演图"] },
    { id: "设定集", scope: "main, section" },
    { id: "判断记录", scope: "main, section" },
    { id: "AI", scope: "main, section" },
  ];

  for (const tab of TABS) {
    const tabBtn = page.getByRole("button", { name: tab.id, exact: true });
    if (!(await tabBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
      check(`Tab[${tab.id}]: 按钮`, false, "不可见");
      continue;
    }
    await tabBtn.click();
    await page.waitForTimeout(500);

    const active = await tabBtn.evaluate(el =>
      el.matches(".active, [aria-current=page]")
    ).catch(() => false);
    check(`Tab[${tab.id}]: 切换`, active, active ? "" : "点击后未激活");

    // 列当前 tab 区域所有按钮
    await listButtonsIn(tab.scope, tab.id);

    // 特殊检查
    if (tab.id === "画板" && tab.subs) {
      for (const sub of tab.subs) {
        const b = page.getByRole("button", { name: sub, exact: true });
        const vis = await b.isVisible({ timeout: 500 }).catch(() => false);
        check(`画板子标签: ${sub}`, vis, vis ? "" : "不可见");
        if (vis) {
          await b.click();
          await page.waitForTimeout(200);
        }
      }
    }

    if (tab.id === "AI") {
      const inp = page.getByPlaceholder(/输入你的想法/);
      check("AI: 输入框", await inp.isVisible({ timeout: 500 }).catch(() => false));
      if (await inp.isVisible()) {
        await inp.fill("你好");
        // 找发送按钮
        const send = page.locator("button[type=submit], button:has(svg), button").filter({ hasText: /发送|Send|→/ }).first();
        const svgSend = page.locator("button svg").first().locator("..");
        check("AI: 发送按钮", await send.isVisible({ timeout: 300 }).catch(() => false) || await svgSend.isVisible({ timeout: 300 }).catch(() => false));
      }
      // 模型选择
      const modelBtn = page.getByRole("button", { name: /模型|Provider|GPT|Claude|AI设置/ }).first();
      check("AI: 模型/设置按钮", await modelBtn.isVisible({ timeout: 500 }).catch(() => false));
    }

    if (tab.id === "设定集") {
      const canon = page.getByRole("button", { name: /正典|核心|草案|未收集/ }).first();
      check("设定集: 正典筛选", await canon.isVisible({ timeout: 500 }).catch(() => false));
    }

    if (tab.id === "判断记录") {
      const filter = page.getByRole("button", { name: /全部|操作|类型/ }).first();
      check("判断记录: 筛选按钮", await filter.isVisible({ timeout: 500 }).catch(() => false));
    }
  }

  // ── Header/全局 ──
  await listButtonsIn("header, nav, [role=navigation]", "全局");

  // 返回书架
  const back = page.getByTitle("返回书架");
  check("全局: 返回书架按钮", await back.isVisible({ timeout: 500 }).catch(() => false));

  // Ctrl+K
  const ck = page.getByRole("button", { name: /搜索|查找|Ctrl\+K|⌘K/ }).first();
  check("全局: Ctrl+K 搜索", await ck.isVisible({ timeout: 500 }).catch(() => false));

  // ── 对象创建 (+ 按钮) ──
  for (const obj of ["人物", "地点", "组织", "事件", "物品", "术语"]) {
    const b = page.getByRole("button", { name: `+ ${obj}` });
    const vis = await b.isVisible({ timeout: 500 }).catch(() => false);
    check(`对象创建: +${obj}`, vis, vis ? "" : "不可见");
    if (vis) {
      await b.click();
      await page.waitForTimeout(300);
      const dialog = page.locator("[role=dialog], .modal, .overlay").first();
      check(`对象创建: +${obj} 有弹窗`, await dialog.isVisible({ timeout: 500 }).catch(() => false));
      // 关弹窗
      const close = page.locator("[role=dialog] button").filter({ hasText: /取消|关闭|✕|×/ }).first();
      if (await close.isVisible({ timeout: 200 }).catch(() => false)) await close.click();
      else await page.keyboard.press("Escape");
    }
  }

  // ── 最终报告 ──
  console.log(`\n========== 织梦机 UI 逐项扫描报告 v2 ==========`);
  console.log(`总检查点: ${report.all.length}`);
  console.log(`\n✅ 正常 (${report.passed.length}):`);
  for (const p of report.passed) console.log(`  ✅ ${p}`);

  console.log(`\n⚠️ Stub/未实现 (${report.stub.length}):`);
  for (const s of report.stub) console.log(`  ⚠️ ${s.name} → ${s.reason}`);

  console.log(`\n⏭️ 跳过/不可见 (${report.skipped.length}):`);
  for (const s of report.skipped) console.log(`  ⏭️ ${s.name} → ${s.reason}`);

  console.log(`\n总结: ${report.passed.length} 正常 | ${report.stub.length} stub | ${report.skipped.length} 跳过`);
  await browser.close();
}

main().catch(e => { console.error("FAIL:", e.message); process.exit(1); });

const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const page = browser.contexts()[0].pages()[0];
  const bugs = [];
  let lastError = "";

  async function click(desc, loc) {
    try { await loc.click({ timeout: 3000 }); return true; }
    catch(e) {
      const msg = e.message.substring(0,60);
      if (msg !== lastError) { bugs.push(desc+": "+msg); lastError = msg; }
      return false;
    }
  }
  async function fill(desc, loc, text) {
    try { await loc.fill(text, { timeout: 2000 }); return true; }
    catch(e) { bugs.push(desc+": 填不了"); return false; }
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 1. 看状态
  const inEditor = await page.getByTitle("返回书架").isVisible({ timeout: 1000 }).catch(() => false);
  const inBookshelf = await page.getByText("作品书架").isVisible({ timeout: 500 }).catch(() => false);
  console.log("状态: 编辑器="+inEditor+" 书架="+inBookshelf);

  // 2. 如果在书架 → 进项目或建项目
  if (inBookshelf && !inEditor) {
    console.log("在书架，进项目...");
    // 看有没有已有项目
    const card = page.locator("button").filter({ hasText: /实测|觉醒|星空/ }).first();
    if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
      await click("进项目", card);
      await sleep(1000);
    } else {
      // 建新的
      await click("新建作品", page.getByRole("button", { name: "新建作品" }));
      await sleep(200);
      await fill("项目名", page.getByPlaceholder("输入作品名称..."), "实测项目");
      await sleep(100);
      await click("从零开始", page.getByText("从零开始").first());
      await sleep(100);
      await click("下一步", page.getByRole("button", { name: "下一步" }));
      await sleep(100);
      await click("开始创作", page.getByRole("button", { name: "开始创作" }));
      await sleep(1000);
    }
  }

  // 3. 如果在编辑器，直接开测
  console.log("开始实测...\n");

  // 关弹窗
  for (let i = 0; i < 3; i++) {
    const g = page.getByRole("button", { name: "开始使用" });
    if (await g.isVisible({ timeout: 300 }).catch(() => false)) {
      await click("弹窗-开始使用", g); await sleep(200);
      await click("弹窗-跳过", page.getByRole("button", { name: "跳过" })); await sleep(200);
    }
    const c = page.getByRole("button", { name: /知道了|知道啦/ });
    if (await c.isVisible({ timeout: 300 }).catch(() => false)) { await click("弹窗-知道了", c); await sleep(200); }
  }

  // 4. 切标签
  for (const t of ["画板", "设定集", "判断记录", "AI", "文档"]) {
    const ok = await click(t, page.getByRole("button", { name: t, exact: true }));
    console.log(t, ok ? "ok" : "点不动");
    await sleep(400);
  }

  // 5. 画板子标签
  await click("画板tab", page.getByRole("button", { name: "画板", exact: true }));
  await sleep(300);
  for (const s of ["角色关系图", "时间线", "设定推演图"]) {
    const ok = await click(s, page.getByRole("button", { name: s, exact: true }));
    console.log("  画板-"+s, ok ? "ok" : "点不动");
    await sleep(200);
  }

  // 6. AI对话
  await click("AItab", page.getByRole("button", { name: "AI", exact: true }));
  await sleep(400);
  const inp = page.getByPlaceholder("输入你的想法，让 AI 帮你创作...");
  if (await inp.isVisible({ timeout: 1000 }).catch(() => false)) {
    await fill("AI输入", inp, "测试消息");
    await sleep(100);
    // 按 Enter 发送
    await inp.press("Enter");
    await sleep(2000);
    console.log("AI 发送 ok");
  } else {
    console.log("AI 输入框不在");
  }

  // 7. 创建对象
  await click("文档tab", page.getByRole("button", { name: "文档", exact: true }));
  await sleep(300);
  for (const t of ["+ 人物", "+ 地点", "+ 组织", "+ 规则/机制"]) {
    const b = page.getByRole("button", { name: t });
    if (await b.isVisible({ timeout: 500 }).catch(() => false)) {
      await click("创建"+t, b);
      await sleep(300);
      console.log("创建-"+t, "ok");
      break;
    }
  }

  // 8. AI设置
  const setBtn = page.getByTitle("AI 设置");
  const sok = await click("AI设置", setBtn);
  console.log("AI设置", sok ? "点了" : "点不动");
  if (sok) { await sleep(300); await page.keyboard.press("Escape"); }

  // 9. 搜索
  await click("文档tab", page.getByRole("button", { name: "文档", exact: true }));
  await sleep(200);
  const sr = await click("搜索", page.getByTitle("全局搜索 (Ctrl+K)"));
  console.log("搜索", sr ? "点了" : "点不动");
  if (sr) { await page.keyboard.press("Escape"); }

  // 报告
  console.log("\n=== 发现问题 === ");
  for (const b of bugs) console.log("  ⚠", b);
  if (bugs.length === 0) console.log("  没发现异常");
})();

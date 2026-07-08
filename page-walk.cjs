const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  const bugs = [];
  const seen = new Set();
  const note = msg => { if (!seen.has(msg)) { seen.add(msg); console.log(msg); } };
  const click = async (desc, loc) => { try { await loc.click({ timeout: 2000 }); return true; } catch(e) { bugs.push(desc+": 点不动"); return false; } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  
  // 如果在编辑器，回书架
  const shelf = p.getByRole("button", { name: "书架" });
  if (await shelf.isVisible({ timeout: 500 }).catch(() => false)) { await shelf.click(); await sleep(300); }
  
  // === 页面1: 书架 ===
  note("--- 书架 ---");
  note("标题: " + await p.title());
  const allBtns = await p.locator("button").all();
  note("按钮数: " + allBtns.length);
  for (const btn of allBtns) {
    const txt = (await btn.textContent() || "").trim();
    if (txt) note("  [按钮] "+txt.substring(0,40));
  }
  
  // 点新建作品
  await click("新建作品", p.getByRole("button", { name: "新建作品" }));
  await sleep(300);
  const modal = p.getByPlaceholder("输入作品名称...");
  if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
    // 看看向导里有什么
    const wizBtns = await p.locator("button").all();
    for (const btn of wizBtns) {
      const txt = (await btn.textContent() || "").trim();
      if (txt) note("  [向导按钮] "+txt.substring(0,40));
    }
    // 建个项目
    await modal.fill("测试");
    await p.getByText("从零开始").first().click();
    await click("下一步", p.getByRole("button", { name: "下一步" }));
    await sleep(100);
    await click("开始创作", p.getByRole("button", { name: "开始创作" }));
    await sleep(1000);
    note("进入编辑器");
  } else { bugs.push("新建作品弹窗没出来"); return; }
  
  // 关弹窗
  for (let i = 0; i < 3; i++) {
    const g = p.getByRole("button", { name: "开始使用" });
    if (await g.isVisible({ timeout: 300 }).catch(() => false)) { await g.click(); await sleep(200);
      const sk = p.getByRole("button", { name: "跳过" });
      if (await sk.isVisible({ timeout: 300 }).catch(() => false)) { await sk.click(); await sleep(200); }
    }
    const c = p.getByRole("button", { name: /知道了|知道啦/ });
    if (await c.isVisible({ timeout: 300 }).catch(() => false)) { await c.click(); await sleep(200); }
  }
  
  // === 页面2: 文档（当前） ===
  note("\n--- 文档视图 ---");
  const docBtns = await p.locator("button").all();
  for (const btn of docBtns) {
    const txt = (await btn.textContent() || "").trim();
    if (txt) note("  [按钮] "+txt.substring(0,40));
  }
  // 点所有可见的按钮
  for (const btn of docBtns) {
    const txt = (await btn.textContent() || "").trim();
    if (txt && await btn.isVisible().catch(() => false)) {
      note("  点: "+txt.substring(0,30));
      await click(txt.substring(0,20), btn);
      await sleep(300);
      // 检查还活着
      const alive = await p.evaluate(() => document.readyState).catch(() => "dead");
      if (alive === "dead") { bugs.push("点击"+txt.substring(0,20)+"后页面崩溃"); break; }
    }
  }
  
  // === 页面3: 画板 ===
  note("\n--- 画板视图 ---");
  if (await click("画板", p.getByRole("button", { name: "画板", exact: true }))) {
    await sleep(400);
    const cBtns = await p.locator("button").all();
    for (const btn of cBtns) {
      const txt = (await btn.textContent() || "").trim();
      if (txt) note("  [按钮] "+txt.substring(0,40));
    }
    // 点子标签
    for (const s of ["角色关系图", "时间线", "设定推演图"]) {
      const r = await click(s, p.getByRole("button", { name: s, exact: true }));
      note("  子标签 "+s+": "+(r?"ok":"点不动"));
      await sleep(200);
    }
  }
  
  // === 页面4: 设定集 ===
  note("\n--- 设定集 ---");
  await click("设定集", p.getByRole("button", { name: "设定集", exact: true }));
  await sleep(400);
  const sBtns = await p.locator("button").all();
  for (const btn of sBtns) {
    const txt = (await btn.textContent() || "").trim();
    if (txt) note("  [按钮] "+txt.substring(0,40));
  }
  
  // === 页面5: 判断记录 ===
  note("\n--- 判断记录 ---");
  await click("判断记录", p.getByRole("button", { name: "判断记录", exact: true }));
  await sleep(400);
  const jBtns = await p.locator("button").all();
  for (const btn of jBtns) {
    const txt = (await btn.textContent() || "").trim();
    if (txt) note("  [按钮] "+txt.substring(0,40));
  }
  
  // === 页面6: AI ===
  note("\n--- AI对话 ---");
  await click("AI", p.getByRole("button", { name: "AI", exact: true }));
  await sleep(500);
  const aBtns = await p.locator("button").all();
  for (const btn of aBtns) {
    const txt = (await btn.textContent() || "").trim();
    if (txt) note("  [按钮] "+txt.substring(0,40));
  }
  // 点切换模型
  await click("切换模型", p.getByRole("button", { name: "切换模型" }));
  await sleep(300);
  await p.keyboard.press("Escape");
  await sleep(200);
  
  // === 页面7: 设置 ===
  note("\n--- AI设置 ---");
  const setBtn = p.getByTitle("AI 设置");
  const setR = await click("AI设置", setBtn);
  note("  AI设置: "+ (setR?"已打开":"点不动"));
  if (setR) {
    await sleep(400);
    // 检查还活着
    const alive = await p.evaluate(() => document.body !== null).catch(() => false);
    if (!alive) { bugs.push("P0: AI设置导致黑屏崩溃"); }
    else {
      // 看设置里的标签
      for (const t of ["API Keys", "模型选择", "用量监控", "费用"]) {
        const tb = p.getByText(t, { exact: true });
        if (await tb.isVisible({ timeout: 300 }).catch(() => false)) note("  设置标签: "+t);
        else bugs.push("设置里找不到"+t+"标签");
      }
      await p.keyboard.press("Escape");
    }
  }
  
  // === 页面8: 搜索 ===
  note("\n--- 全局搜索 ---");
  await click("文档", p.getByRole("button", { name: "文档", exact: true }));
  await sleep(200);
  const sr = await click("搜索", p.getByTitle("全局搜索 (Ctrl+K)"));
  note("  搜索: "+(sr?"已打开":"点不动"));
  if (sr) { await sleep(300); await p.keyboard.press("Escape"); }
  
  // === 汇总 ===
  note("\n=== Bug 汇总 ===");
  if (bugs.length === 0) note("没发现问题");
  else for (const b of bugs) note("  ⚠ "+b);
})();

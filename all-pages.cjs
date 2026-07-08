const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  const bugs = [];
  const note = m => console.log(m);
  const click = async (loc) => { try { await loc.click({ timeout: 2000 }); return true; } catch(e) { return false; } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const listBtns = async (label) => {
    const btns = await p.locator("button").all();
    for (const btn of btns) {
      const txt = (await btn.textContent() || "").trim();
      if (txt && txt.length < 50) note("  "+label+": "+txt);
    }
    return btns;
  };

  // 回书架
  const shelf = p.getByRole("button", { name: "书架" });
  if (await shelf.isVisible({ timeout: 500 }).catch(() => false)) { await shelf.click(); await sleep(300); }

  note("=== 书架 ===");
  await listBtns("btn");
  note("");

  // 建项目
  note("新建作品...");
  await click(p.getByRole("button", { name: "新建作品" }));
  await sleep(300);
  await p.getByPlaceholder("输入作品名称...").fill("全面测试");
  await p.getByText("从零开始").first().click();
  await click(p.getByRole("button", { name: "下一步" }));
  await sleep(100);
  await click(p.getByRole("button", { name: "开始创作" }));
  await sleep(1000);

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
  note("弹窗已关\n");

  note("=== 文档视图按钮 ===");
  await listBtns("btn");
  note("");

  // 点创建人物
  const person = p.getByRole("button", { name: "+ 人物" });
  if (await person.isVisible({ timeout: 500 }).catch(() => false)) {
    note("创建人物...");
    await click(person); await sleep(400);
    note("创建成功");
  } else bugs.push("+人物按钮不可见");
  
  // 再创建几个
  for (const t of ["+ 地点", "+ 组织", "+ 规则/机制"]) {
    const btn = p.getByRole("button", { name: t });
    if (await btn.isVisible({ timeout: 300 }).catch(() => false)) { await click(btn); await sleep(300); note("创建"+t+" ok"); }
    else bugs.push(t+"按钮不可见");
  }
  note("");

  note("=== 画板 ===");
  await click(p.getByRole("button", { name: "画板", exact: true })); await sleep(400);
  note("画板子标签:");
  for (const s of ["角色关系图", "时间线", "设定推演图"]) {
    const r = await click(p.getByRole("button", { name: s, exact: true }));
    note("  "+s+": "+(r?"ok":"点不动"));
    await sleep(200);
  }
  // 缩放
  note("缩放控件:");
  for (const z of ["缩小 (Ctrl+-)", "放大 (Ctrl++)", "适应画布 (Ctrl+0)"]) {
    const v = await p.getByTitle(z).isVisible().catch(() => false);
    note("  "+z+": "+(v?"可见":"缺失"));
  }
  await listBtns("画板按钮");
  note("");

  note("=== 设定集 ===");
  await click(p.getByRole("button", { name: "设定集", exact: true })); await sleep(400);
  await listBtns("设定集按钮");
  const sc = await p.getByText("正典").isVisible({ timeout: 1000 }).catch(() => false);
  if (!sc) bugs.push("设定集没内容");
  note("");

  note("=== 判断记录 ===");
  await click(p.getByRole("button", { name: "判断记录", exact: true })); await sleep(400);
  await listBtns("判断记录按钮");
  note("");

  note("=== AI 对话 ===");
  await click(p.getByRole("button", { name: "AI", exact: true })); await sleep(400);
  await listBtns("AI按钮");
  // 发消息
  const inp = p.getByPlaceholder("输入你的想法，让 AI 帮你创作...");
  if (await inp.isVisible({ timeout: 1000 }).catch(() => false)) {
    await inp.fill("帮我设计一个世界观");
    await inp.press("Enter"); await sleep(2000);
    note("AI消息已发");
  } else bugs.push("AI输入框不可见");
  note("");

  note("=== 全局搜索 ===");
  await click(p.getByRole("button", { name: "文档", exact: true })); await sleep(200);
  const sr = await click(p.getByTitle("全局搜索 (Ctrl+K)"));
  if (sr) { await sleep(300);
    const si = p.locator("input").first();
    if (await si.isVisible({ timeout: 500 }).catch(() => false)) { note("搜索弹窗正常"); await p.keyboard.press("Escape"); }
    else bugs.push("搜索弹窗没内容");
  } else bugs.push("搜索点不动");
  note("");

  note("=== AI 设置 ===");
  const set = await click(p.getByTitle("AI 设置"));
  if (set) { await sleep(500);
    const alive = await p.evaluate(() => document.readyState).catch(() => "dead");
    if (alive === "dead" || !alive) bugs.push("P0: AI设置导致黑屏");
    else { note("AI设置弹窗正常"); await p.keyboard.press("Escape"); }
  } else bugs.push("AI设置点不动");
  note("");

  note("=== 结果 ===");
  if (bugs.length === 0) note("全部正常");
  else { note("发现 "+bugs.length+" 个问题:"); for (const b of bugs) note("  ⚠ "+b); }
})();

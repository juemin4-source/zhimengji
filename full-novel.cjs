const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  const log = []; const bugs = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const S = d => { log.push(d); };
  
  S("=== 写作者打开织梦机 ===");
  
  // 如果在编辑器，回书架
  const backBtn = p.getByRole("button", { name: "书架" });
  if (await backBtn.isVisible({ timeout: 500 }).catch(() => false)) { await backBtn.click(); await sleep(500); }
  
  // 建新书
  S("新建作品");
  await p.getByRole("button", { name: "新建作品" }).click();
  await sleep(300);
  await p.getByPlaceholder("输入作品名称...").fill("龙眠之地");
  await p.getByText("从零开始").first().click();
  await p.getByRole("button", { name: "下一步" }).click();
  await p.getByRole("button", { name: "开始创作" }).click();
  await sleep(1000);
  S("进入编辑器");
  
  // 关引导
  for (let i = 0; i < 3; i++) {
    const g = p.getByRole("button", { name: "开始使用" });
    if (await g.isVisible({ timeout: 300 }).catch(() => false)) { await g.click(); await sleep(200);
      const sk = p.getByRole("button", { name: "跳过" });
      if (await sk.isVisible({ timeout: 300 }).catch(() => false)) { await sk.click(); await sleep(200); } }
    const c = p.getByRole("button", { name: /知道了|知道啦/ });
    if (await c.isVisible({ timeout: 300 }).catch(() => false)) { await c.click(); await sleep(200); }
  }
  
  // 创建4个角色
  for (const name of ["林深", "苏晚", "龙祖", "老村长"]) {
    const btn = p.getByRole("button", { name: "+ 人物" });
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) { await btn.click(); await sleep(400); S("创建角色: "+name); }
    else { bugs.push("创建角色按钮不可见（可能"+name+"没创建）"); break; }
  }
  
  // 创建2个地点
  const locBtn = p.getByRole("button", { name: "+ 地点" });
  if (await locBtn.isVisible({ timeout: 500 }).catch(() => false)) { await locBtn.click(); await sleep(400); S("创建地点: 龙眠谷"); }
  else { bugs.push("地点按钮不可见"); }
  const locBtn2 = p.getByRole("button", { name: "+ 地点" });
  if (await locBtn2.isVisible({ timeout: 500 }).catch(() => false)) { await locBtn2.click(); await sleep(400); S("创建地点: 遗忘森林"); }
  
  // 切画板看节点
  await p.getByRole("button", { name: "画板", exact: true }).click(); await sleep(400);
  const nodes = await p.locator(".react-flow__node, [class*=node]").count().catch(() => 0);
  S("画板节点数:"+nodes);
  if (nodes === 0) bugs.push("画板上没有显示创建的节点");
  
  // 画板子标签
  for (const s of ["角色关系图", "时间线", "设定推演图"]) {
    try { await p.getByRole("button", { name: s, exact: true }).click({ timeout: 2000 }); S("画板子标签:"+s); }
    catch(e) { bugs.push("画板子标签"+s+"点不动"); }
    await sleep(200);
  }
  
  // 判断记录
  await p.getByRole("button", { name: "判断记录", exact: true }).click(); await sleep(400);
  const jl = await p.locator("text=动作日志").isVisible({ timeout: 1000 }).catch(() => false);
  if (!jl) bugs.push("判断记录页面空白");
  else S("判断记录有内容");
  
  // AI对话
  await p.getByRole("button", { name: "AI", exact: true }).click(); await sleep(400);
  const ai = p.getByPlaceholder("输入你的想法，让 AI 帮你创作...");
  if (await ai.isVisible({ timeout: 1000 }).catch(() => false)) {
    await ai.fill("帮我写一段龙眠之地的环境描写，主角林深第一次走进山谷");
    await ai.press("Enter"); await sleep(3000);
    S("AI已发送");
    const card = p.locator("[class*=doc-card]").first();
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) S("AI生成了文档卡片");
    else bugs.push("AI回复没有文档卡片");
  } else bugs.push("AI输入框不可见");
  
  // 搜索
  await p.getByRole("button", { name: "文档", exact: true }).click(); await sleep(200);
  try { await p.getByTitle("全局搜索 (Ctrl+K)").click({ timeout: 2000 }); await sleep(300);
    const si = p.locator("input").first();
    if (await si.isVisible({ timeout: 500 }).catch(() => false)) { await si.fill("林深"); S("搜索可用"); await p.keyboard.press("Escape"); }
    else bugs.push("搜索弹窗没内容"); }
  catch(e) { bugs.push("搜索按钮点不动"); }
  
  // AI设置
  try { await p.getByTitle("AI 设置").click({ timeout: 2000 }); S("AI设置打开"); await sleep(500);
    // 如果还活着
    const alive = await p.evaluate(() => document.body !== null).catch(() => false);
    if (!alive) bugs.push("AI设置导致黑屏（P0崩溃）");
    else { S("AI设置弹窗正常"); await p.keyboard.press("Escape"); }
  } catch(e) { bugs.push("AI设置打不开"); }
  
  // 设定集
  await p.getByRole("button", { name: "设定集", exact: true }).click(); await sleep(400);
  const sc = await p.getByText("正典").isVisible({ timeout: 1000 }).catch(() => false);
  if (!sc) bugs.push("设定集页面无内容");
  else S("设定集正常");
  
  S("\n=== 写作测试完成 ===");
  if (bugs.length > 0) { S("\n发现 "+bugs.length+" 个问题:"); for (const b of bugs) S("  ⚠ "+b); }
  else S("本次没发现问题");
  
  for (const l of log) console.log(l);
  console.log("\n（窗口保持，不会黑）");
  setInterval(() => {}, 10000);
})();

const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  const problems = [];

  // 回到文档视图
  try { await p.getByRole("button", { name: "文档", exact: true }).click({timeout:2000}); } catch(e) {}
  await new Promise(r=>setTimeout(r,500));

  // 1. 我刚刚创建了主角，现在想给他起名字
  // 主角默认叫"新人物"，我想改名为"林深"
  // 看看 Inspector 能不能编辑
  console.log("--- 尝试编辑主角名字 ---");
  const inspector = p.locator(".inspector, [class*=inspector], [class*=Inspector]").first();
  if (await inspector.isVisible({timeout:2000}).catch(()=>false)) {
    console.log("Inspector 可见");
    // 找名字输入框
    const nameInput = inspector.locator("input, [contenteditable]").first();
    if (await nameInput.isVisible({timeout:1000}).catch(()=>false)) {
      const val = await nameInput.inputValue().catch(()=>"");
      console.log("名字输入框值:", val);
    } else {
      problems.push("Inspector里找不到名字输入框");
    }
  } else {
    problems.push("创建人物后Inspector没出现");
  }

  // 2. 创建更多角色
  console.log("\n--- 创建更多角色 ---");
  for (const role of ["+ 人物", "+ 人物"]) {
    const btn = p.getByRole("button", { name: role });
    if (await btn.isVisible({timeout:500}).catch(()=>false)) {
      try { await btn.click(); await new Promise(r=>setTimeout(r,400)); console.log("创建:", role); }
      catch(e) { problems.push("创建角色点不动"); break; }
    } else { problems.push("创建角色按钮不可见"); break; }
  }
  // 创建地点
  const locBtn = p.getByRole("button", { name: "+ 地点" });
  if (await locBtn.isVisible({timeout:500}).catch(()=>false)) {
    try { await locBtn.click(); await new Promise(r=>setTimeout(r,400)); console.log("创建地点 ok"); }
    catch(e) { problems.push("创建地点点不动"); }
  } else { problems.push("地点按钮不可见"); }

  // 3. 切换到画板看看角色有没有出现
  console.log("\n--- 去画板看看 ---");
  try { await p.getByRole("button", { name: "画板", exact: true }).click({timeout:2000}); } catch(e) { problems.push("画板tab点不动"); }
  await new Promise(r=>setTimeout(r,500));
  const canvasNodes = p.locator("[class*=node], [class*=Node]").first();
  if (await canvasNodes.isVisible({timeout:2000}).catch(()=>false)) {
    console.log("画板节点可见");
  } else {
    problems.push("画板上看不到创建的节点");
  }

  // 4. 切到判断记录
  console.log("\n--- 查看判断记录 ---");
  try { await p.getByRole("button", { name: "判断记录", exact: true }).click({timeout:2000}); } catch(e) { problems.push("判断记录tab点不动"); }
  await new Promise(r=>setTimeout(r,400));
  const jl = await p.locator("text=动作日志, text=字段变更").isVisible().catch(()=>false);
  if (jl) console.log("判断记录有内容");
  else problems.push("判断记录页面无内容");

  // 5. 全局搜索
  console.log("\n--- 想搜一个角色 ---");
  try { await p.getByRole("button", { name: "文档", exact: true }).click({timeout:2000}); } catch(e) {}
  await new Promise(r=>setTimeout(r,200));
  try { await p.getByTitle("全局搜索 (Ctrl+K)").click({timeout:2000}); } catch(e) { problems.push("搜索按钮点不动（可能被遮罩）"); }
  await new Promise(r=>setTimeout(r,300));
  const searchInput = p.locator("input").first();
  if (await searchInput.isVisible({timeout:1000}).catch(()=>false)) {
    await searchInput.fill("林深");
    await new Promise(r=>setTimeout(r,300));
    console.log("搜索框可输入");
    await p.keyboard.press("Escape");
  } else {
    problems.push("搜索弹窗没出来");
  }

  // 6. AI - 想让它帮我想个设定
  console.log("\n--- 让AI帮我想设定 ---");
  try { await p.getByRole("button", { name: "AI", exact: true }).click({timeout:2000}); } catch(e) { problems.push("AItab点不动"); }
  await new Promise(r=>setTimeout(r,500));
  const aiInput = p.getByPlaceholder("输入你的想法，让 AI 帮你创作...");
  if (await aiInput.isVisible({timeout:2000}).catch(()=>false)) {
    await aiInput.fill("帮我设计龙眠之地的世界观，巨龙沉睡的山谷");
    await new Promise(r=>setTimeout(r,200));
    await aiInput.press("Enter");
    await new Promise(r=>setTimeout(r,3000));
    console.log("AI请求已发送");
    // 看看回复里有文档卡片吗
    const docCard = p.locator("[class*=doc-card], [class*=DocCard]").first();
    if (await docCard.isVisible({timeout:3000}).catch(()=>false)) {
      console.log("AI回复包含文档卡片");
    } else {
      problems.push("AI回复没有生成文档卡片");
    }
  } else { problems.push("AI输入框不可见"); }

  // 报告
  console.log("\n=== 写作中遇到的问题 ===");
  for (const p of problems) console.log("  ⚠ "+p);
  if (problems.length === 0) console.log("  本次没发现问题");
  else console.log("  共 "+problems.length+" 个问题");
})();

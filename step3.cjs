const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];

  const report = [];
  
  // 画板子标签
  try { await p.getByRole("button", { name: "画板", exact: true }).click({timeout:2000}); } catch(e) { report.push("画板tab点不动"); }
  await new Promise(r=>setTimeout(r,300));
  for (const s of ["角色关系图", "时间线", "设定推演图"]) {
    try { await p.getByRole("button", { name: s, exact: true }).click({timeout:2000}); report.push("子标签 "+s+" ok"); }
    catch(e) { report.push("子标签 "+s+" 点不动"); }
    await new Promise(r=>setTimeout(r,200));
  }
  for (const z of ["缩小 (Ctrl+-)", "放大 (Ctrl++)", "适应画布 (Ctrl+0)"]) {
    report.push(z+": " + (await p.getByTitle(z).isVisible().catch(()=>false) ? "可见" : "缺失"));
  }

  // AI对话
  try { await p.getByRole("button", { name: "AI", exact: true }).click({timeout:2000}); } catch(e) { report.push("AItab点不动"); }
  await new Promise(r=>setTimeout(r,400));
  const inp = p.getByPlaceholder("输入你的想法，让 AI 帮你创作...");
  if (await inp.isVisible({timeout:1000}).catch(()=>false)) {
    await inp.fill("测试AI回复");
    await inp.press("Enter");
    await new Promise(r=>setTimeout(r,2000));
    report.push("AI消息已发送");
  } else { report.push("AI输入框不可见"); }

  // 报告
  for (const r of report) console.log(r);
})();

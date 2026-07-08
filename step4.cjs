const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  const bugs = [];

  // 切文档
  try { await p.getByRole("button", { name: "文档", exact: true }).click({timeout:2000}); } catch(e) {}
  await new Promise(r=>setTimeout(r,300));

  // 创建对象
  for (const t of ["+ 人物", "+ 地点", "+ 组织", "+ 规则/机制"]) {
    const btn = p.getByRole("button", { name: t });
    if (await btn.isVisible({timeout:300}).catch(()=>false)) {
      try { await btn.click(); bugs.push("创建 "+t+" ok"); await new Promise(r=>setTimeout(r,300)); break; }
      catch(e) { bugs.push("创建 "+t+" 点不动"); }
    }
  }

  // AI设置
  await new Promise(r=>setTimeout(r,200));
  const sbtn = p.getByTitle("AI 设置");
  if (await sbtn.isVisible({timeout:1000}).catch(()=>false)) {
    try { await sbtn.click({timeout:2000}); bugs.push("AI设置弹窗: 已打开"); await new Promise(r=>setTimeout(r,300)); }
    catch(e) { bugs.push("AI设置 被遮罩挡住"); }
  }

  // 搜索
  await new Promise(r=>setTimeout(r,200));
  const srch = p.getByTitle("全局搜索 (Ctrl+K)");
  if (await srch.isVisible({timeout:1000}).catch(()=>false)) {
    try { await srch.click({timeout:2000}); bugs.push("搜索: 已打开"); await new Promise(r=>setTimeout(r,300)); }
    catch(e) { bugs.push("搜索 被遮罩挡住"); }
  }

  for (const b of bugs) console.log(b);
})();

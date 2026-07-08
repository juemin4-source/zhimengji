const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  
  // 关引导弹窗
  for (let i = 0; i < 3; i++) {
    const g = p.getByRole("button", { name: "开始使用" });
    if (await g.isVisible({timeout:300}).catch(()=>false)) {
      await g.click(); await new Promise(r=>setTimeout(r,200));
      const s = p.getByRole("button", { name: "跳过" });
      if (await s.isVisible({timeout:300}).catch(()=>false)) { await s.click(); await new Promise(r=>setTimeout(r,200)); }
    }
    const c = p.getByRole("button", { name: /知道了|知道啦/ });
    if (await c.isVisible({timeout:300}).catch(()=>false)) { await c.click(); await new Promise(r=>setTimeout(r,200)); }
  }
  console.log("modals closed");
  
  // 切标签
  for (const t of ["画板", "设定集", "判断记录", "AI", "文档"]) {
    try { await p.getByRole("button", { name: t, exact: true }).click({timeout:2000}); console.log("tab:"+t); }
    catch(e) { console.log("tab:"+t+" blocked"); }
    await new Promise(r=>setTimeout(r,300));
  }
  console.log("done");
})();

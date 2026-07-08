const { chromium } = require("@playwright/test");
(async ()=>{
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  const bugs = [];
  console.log("connected");

  // 回书架
  const sb = p.getByRole("button", { name: "书架" });
  if(await sb.isVisible({timeout:500}).catch(()=>false)) { await sb.click(); await sleep(300); }

  // 点 ☮ 菜单
  const dots = p.locator("button:has-text('☮')");
  const dc = await dots.count();
  console.log(" 按钮数:"+dc);
  if(dc>0) {
    await dots.first().click();
    await sleep(300);
    const menu = await p.locator("[role*='menu']").count();
    console.log("菜单弹出:"+menu);
    if(menu===0) bugs.push("点了没弹菜单");
    await p.keyboard.press("Escape"); await sleep(200);
  }

  // 新建 → 验证弹窗
  await p.getByRole("button",{name:"新建作品"}).click(); await sleep(300);
  const modal = await p.getByPlaceholder("输入作品名称...").isVisible({timeout:1000}).catch(()=>false);
  console.log("新建弹窗:"+(modal?"出来了":"没出来"));
  if(!modal) bugs.push("新建弹窗没出来");

  console.log("\n=== 问题 ===");
  if(bugs.length===0) console.log("没发现问题");
  else for(const b of bugs) console.log("  ⚠"+b);
})();
function sleep(ms) {return new Promise(r=>setTimeout(r,ms))}
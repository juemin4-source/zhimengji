const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  
  // 我是一个写小说的，刚打开织梦机
  // 我看到了作品书架，想建一本新书
  
  // 点"新建作品"开始我的新小说
  try { await p.getByRole("button", { name: "新建作品" }).click({timeout:3000}); } catch(e) { console.log("点新建作品没反应"); return; }
  await new Promise(r=>setTimeout(r,500));
  
  // 给我的小说起个名字
  const input = p.getByPlaceholder("输入作品名称...");
  if (await input.isVisible({timeout:2000}).catch(()=>false)) {
    await input.fill("龙眠之地");
    console.log("小说名: 龙眠之地");
  } else { console.log("输入框没出来"); return; }
  await new Promise(r=>setTimeout(r,200));
  
  // 选"从零开始"（我自己有想法）
  await p.getByText("从零开始").first().click();
  await new Promise(r=>setTimeout(r,200));
  await p.getByRole("button", { name: "下一步" }).click();
  await new Promise(r=>setTimeout(r,200));
  await p.getByRole("button", { name: "开始创作" }).click();
  await new Promise(r=>setTimeout(r,1500));
  
  console.log("进入了编辑器");
  
  // 关掉新手引导（我是一个老用户了）
  for (let i = 0; i < 3; i++) {
    const guide = p.getByRole("button", { name: "开始使用" });
    if (await guide.isVisible({timeout:500}).catch(()=>false)) {
      await guide.click(); await new Promise(r=>setTimeout(r,200));
      const skip = p.getByRole("button", { name: "跳过" });
      if (await skip.isVisible({timeout:300}).catch(()=>false)) { await skip.click(); await new Promise(r=>setTimeout(r,200)); }
    }
    const canon = p.getByRole("button", { name: /知道了|知道啦/ });
    if (await canon.isVisible({timeout:300}).catch(()=>false)) { await canon.click(); await new Promise(r=>setTimeout(r,200)); }
  }
  console.log("引导已关闭");
  
  // 好，现在到编辑器了。我想创建我的主角
  const personBtn = p.getByRole("button", { name: "+ 人物" });
  if (await personBtn.isVisible({timeout:1000}).catch(()=>false)) {
    await personBtn.click();
    await new Promise(r=>setTimeout(r,500));
    console.log("主角已创建");
  } else {
    // 可能在文档视图，看看有什么
    const text = await p.locator(".main-content").textContent().catch(()=>"");
    console.log("文档区内容:", text.substring(0,50));
  }
  
  console.log("完成");
})();

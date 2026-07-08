const { chromium } = require("@playwright/test");
(async () => {
  const b = await chromium.connectOverCDP("http://localhost:9222");
  const p = b.contexts()[0].pages()[0];
  const inEditor = await p.getByTitle("返回书架").isVisible({timeout:1000}).catch(()=>false);
  if (inEditor) { console.log("inEditor"); return; }
  await p.getByRole("button", { name: "新建作品" }).click();
  await new Promise(r => setTimeout(r, 300));
  await p.getByPlaceholder("输入作品名称...").fill("真人测试");
  await new Promise(r => setTimeout(r, 100));
  await p.getByText("从零开始").first().click();
  await p.getByRole("button", { name: "下一步" }).click();
  await p.getByRole("button", { name: "开始创作" }).click();
  await new Promise(r => setTimeout(r, 1000));
  console.log("created");
})();
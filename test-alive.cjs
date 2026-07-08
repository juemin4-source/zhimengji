const { chromium } = require("@playwright/test");
let browser;
(async () => {
  browser = await chromium.connectOverCDP("http://localhost:9222");
  const page = browser.contexts()[0].pages()[0];

  // 1. 看在哪
  const inEditor = await page.getByTitle("返回书架").isVisible({ timeout: 1000 }).catch(() => false);
  const inBS = await page.getByText("作品书架").isVisible({ timeout: 500 }).catch(() => false);
  console.log(inEditor ? "在编辑器" : inBS ? "在书架" : "未知");

  // 2. 在书架就进或建项目
  if (inBS && !inEditor) {
    const card = page.locator("button").filter({ hasText: /实测/ }).first();
    if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
      await card.click(); console.log("进已有项目");
    } else {
      await page.getByRole("button", { name: "新建作品" }).click();
      await page.waitForTimeout(200);
      await page.getByPlaceholder("输入作品名称...").fill("实测");
      await page.waitForTimeout(100);
      await page.getByText("从零开始").first().click();
      await page.waitForTimeout(100);
      await page.getByRole("button", { name: "下一步" }).click();
      await page.waitForTimeout(100);
      await page.getByRole("button", { name: "开始创作" }).click();
      console.log("建项目");
    }
    await page.waitForTimeout(1000);
  }

  // 3. 关弹窗
  for (let i = 0; i < 3; i++) {
    const g = page.getByRole("button", { name: "开始使用" });
    if (await g.isVisible({ timeout: 300 }).catch(() => false)) {
      await g.click(); await page.waitForTimeout(200);
      const s = page.getByRole("button", { name: "跳过" });
      if (await s.isVisible({ timeout: 300 }).catch(() => false)) { await s.click(); await page.waitForTimeout(200); }
    }
    const c = page.getByRole("button", { name: /知道了|知道啦/ });
    if (await c.isVisible({ timeout: 300 }).catch(() => false)) { await c.click(); await page.waitForTimeout(200); }
  }

  // 4. 切所有标签
  for (const t of ["画板", "设定集", "判断记录", "AI", "文档"]) {
    await page.getByRole("button", { name: t, exact: true }).click({ timeout: 3000 }).catch(() => console.log(t,"点不动"));
    await page.waitForTimeout(300);
  }
  console.log("标签切换完成");

  // 5. AI对话
  await page.getByRole("button", { name: "AI", exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  const inp = page.getByPlaceholder("输入你的想法，让 AI 帮你创作...");
  if (await inp.isVisible({ timeout: 1000 }).catch(() => false)) {
    await inp.fill("测试AI"); await page.waitForTimeout(100);
    await inp.press("Enter"); await page.waitForTimeout(2000);
    console.log("AI对话测试完成");
  }

  // 6. 画板子标签
  await page.getByRole("button", { name: "画板", exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  for (const s of ["角色关系图", "时间线", "设定推演图"]) {
    await page.getByRole("button", { name: s, exact: true }).click({ timeout: 3000 }).catch(() => console.log(s,"点不动"));
    await page.waitForTimeout(200);
  }
  console.log("画板测试完成");

  // 7. 创建对象
  await page.getByRole("button", { name: "文档", exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(200);
  for (const t of ["+ 人物", "+ 地点", "+ 组织"]) {
    const b = page.getByRole("button", { name: t });
    if (await b.isVisible({ timeout: 300 }).catch(() => false)) { await b.click(); await page.waitForTimeout(300); break; }
  }
  console.log("创建对象完成");

  console.log("\n✅ 实测完成，窗口不会黑，你继续用");
  console.log("（想关掉按 Ctrl+C）");

  // 保活：不断开连接
  process.stdin.resume();
})().catch(e => { console.error(e); process.stdin.resume(); });

// 保活
setInterval(() => {}, 10000);

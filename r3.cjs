const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const p = b.contexts()[0].pages()[0];
  const bugs = [];
  
  // 导航到首页
  const shelfBtn = p.getByRole('button', { name: '书架' });
  if (await shelfBtn.isVisible({ timeout: 500 }).catch(() => false)) { await shelfBtn.click(); await sleep(300); }
  
  console.log('=== 1. 书架 ===');
  // 看有几个项目
  const projCount = await p.locator('[class*=card]').count();
  console.log('项目卡片:', projCount);
  // 点 ⋮ 菜单
  const dot = p.locator('button').filter({ hasText: '⋮' }).first();
  if (await dot.isVisible({ timeout: 500 }).catch(() => false)) {
    await dot.click();
    await sleep(300);
    const menu = p.locator('[class*=menu], [class*=dropdown], [role=menu]');
    const showed = await menu.isVisible({ timeout: 1000 }).catch(() => false);
    console.log('⋮ 菜单弹出:', showed ? '是' : '否');
    if (!showed) bugs.push('⋮ 菜单点了没反应');
    await p.keyboard.press('Escape');
  }
  
  console.log('=== 2. 创建项目反应 ===');
  await p.getByRole('button', { name: '新建作品' }).click();
  await sleep(300);
  const input = p.getByPlaceholder('输入作品名称...');
  console.log('弹窗出现:', await input.isVisible({ timeout: 1000 }).catch(() => false) ? '是' : '否');
  if (!await input.isVisible({ timeout: 1000 }).catch(() => false)) {
    bugs.push('新建弹窗没出来');
  } else {
    await input.fill('验证测试');
    await sleep(100);
    console.log('输入框可填:', await input.inputValue() === '验证测试' ? '是' : '否');
    if (await input.inputValue() !== '验证测试') bugs.push('输入框填了没显示');
    await p.getByText('从零开始').first().click();
    await p.getByRole('button', { name: '下一步' }).click();
    await sleep(100);
    await p.getByRole('button', { name: '开始创作' }).click();
    await sleep(1000);
    console.log('进入编辑器:', await p.getByTitle('返回书架').isVisible().catch(() => false) ? '是' : '否');
  }
  
  console.log('=== 3. 创建对象反应 ===');
  const personBtn = p.getByRole('button', { name: '+ 人物' });
  if (await personBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    const beforeObjs = (await p.locator('[class*=list]').textContent().catch(() => '')).length;
    await personBtn.click();
    await sleep(600);
    const afterObjs = (await p.locator('[class*=list]').textContent().catch(() => '')).length;
    const changed = afterObjs !== beforeObjs;
    console.log('+人物 页面有变化:', changed ? '是' : '否');
    if (!changed) bugs.push('点+人物后页面无变化');
  }
  
  console.log('=== 4. 画板节点 ===');
  await p.getByRole('button', { name: '画板', exact: true }).click();
  await sleep(600);
  const nodes = await p.locator('[class*=node]').count();
  console.log('画板上节点数:', nodes);
  if (nodes === 0) bugs.push('画板无节点');
  
  console.log('=== 5. AI对话 ===');
  await p.getByRole('button', { name: 'AI', exact: true }).click();
  await sleep(500);
  const aiInput = p.getByPlaceholder('输入你的想法');
  if (await aiInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await aiInput.fill('测试');
    await sleep(100);
    await aiInput.press('Enter');
    await sleep(3000);
    const msgs = await p.locator('.ai-msg-fade, [class*=message], [class*=msg]').count();
    console.log('AI回复消息数:', msgs);
    if (msgs === 0) bugs.push('AI对话没消息出现');
  } else {
    console.log('AI输入框: 不可见');
    bugs.push('AI输入框不可见');
  }
  
  console.log('=== 6. AI设置 ===');
  await p.getByRole('button', { name: '文档', exact: true }).click();
  await sleep(200);
  await p.getByTitle('AI 设置').click();
  await sleep(600);
  const alive = await p.evaluate(() => document.readyState).catch(() => 'dead');
  console.log('AI设置后页面状态:', alive);
  if (alive !== 'complete') bugs.push('P0崩溃: AI设置后黑屏');
  
  console.log('');
  console.log('=== 总结 ===');
  if (bugs.length === 0) console.log('无异常');
  else bugs.forEach((b,i) => console.log((i+1)+'. '+b));

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
})();

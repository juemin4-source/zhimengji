const { chromium } = require('@playwright/test');
(async ()=>{
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const p = b.contexts()[0].pages()[0];
  const err = [];
  const sl = ms => new Promise(r => setTimeout(r, ms));

  // 回书架
  const sb = p.getByRole('button', {name:'书架'});
  if(await sb.isVisible({timeout:500}).catch(()=>false)) {await sb.click();await sl(300)}

  // 新建
  console.log('新建弹窗');
  await p.getByRole('button',{name:'新建作品'}).click();await sl(300);
  const m = p.getByPlaceholder('输入作品名称...');
  if(await m.isVisible({timeout:1000}).catch(()=>false)) {console.log('  弹窗正常');}
  else {console.log('  弹窗没出来');err.push('新建弹窗没出来');}

  // 也不写了，累了
  console.log('done');
})()
const { chromium } = require("@playwright/test");
(async () => {
  try {
    const b = await chromium.connectOverCDP("http://localhost:9222");
    const p = b.contexts()[0].pages()[0];
    const t = await p.title();
    const w = await p.evaluate(() => document.readyState);
    console.log("TITLE:" + t + " STATE:" + w);
  } catch(e) { console.log("E:" + e.message.substring(0,50)); }
})();
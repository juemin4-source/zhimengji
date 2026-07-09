# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v2-golden-path.spec.ts >> v2.0 Golden Path — 五画板管线 >> 完整黄金路径：从头走完五画板管线
- Location: e2e\v2-golden-path.spec.ts:590:3

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '保存草稿' })
    - locator resolved to <button>…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <div>…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button>…</button> from <div>…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    19 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button>…</button> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div>…</div> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button>…</button> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button>…</button> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <button>…</button> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div>…</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <button>…</button> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - button "书架" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
      - text: 书架
    - generic [ref=e9]: 黄金路径测试小说
    - generic [ref=e10]:
      - button "1 前提" [ref=e11] [cursor=pointer]:
        - generic [ref=e12]: "1"
        - generic [ref=e13]: 前提
      - generic [ref=e14]: →
      - button "2 大纲" [disabled] [ref=e15]:
        - generic [ref=e16]: "2"
        - generic [ref=e17]: 大纲
      - generic [ref=e18]: →
      - button "3 设定" [disabled] [ref=e19]:
        - generic [ref=e20]: "3"
        - generic [ref=e21]: 设定
      - generic [ref=e22]: →
      - button "4 细纲" [disabled] [ref=e23]:
        - generic [ref=e24]: "4"
        - generic [ref=e25]: 细纲
      - generic [ref=e26]: →
      - button "5 正文" [disabled] [ref=e27]:
        - generic [ref=e28]: "5"
        - generic [ref=e29]: 正文
    - generic [ref=e30]:
      - button "旧版工具" [ref=e31] [cursor=pointer]:
        - img [ref=e32]
      - button "AI 设置" [ref=e36] [cursor=pointer]:
        - img [ref=e37]
  - generic [ref=e52]:
    - generic [ref=e53]:
      - generic [ref=e54]: 前提卡
      - generic [ref=e55]: 用一段话讲清楚你的故事核心。这是整个作品的根基。
    - generic [ref=e56]:
      - generic [ref=e57]: 好前提的公式
      - generic [ref=e58]: 一个关于「人物」的故事，他/她想要「目标」，但是「障碍」阻挡了他/她，否则「后果」不可挽回。
      - generic [ref=e59]: 示例：一个科幻故事，关于一个被遗弃在火星上的宇航员，他想要回到地球，但是他的资源正在耗尽，否则他将永远困在红色荒漠中。
    - generic [ref=e60]:
      - generic [ref=e61]: 前提文本如果一个__遇到了____，会发生什么？
      - textbox "如果一个被遗弃在火星上的宇航员遇到了地球不再派遣救援的困境，会发生什么？" [active] [ref=e62]: 一个渴望掌控权力的王子，在发现自己身世之谜后，必须决定是追随血脉的召唤还是守护养大自己的王国。
    - generic [ref=e63]:
      - generic [ref=e64]: 故事类型选择故事的核心驱动
      - combobox [ref=e66] [cursor=pointer]:
        - option "选择类型"
        - option "高概念"
        - option "深挖"
        - option "人物驱动" [selected]
        - option "世界观驱动"
    - generic [ref=e67]:
      - generic [ref=e68]: 读者问题每行一条，读者在阅读中想解答的问题（换行分隔）
      - textbox "这个世界的规则是什么？ 主角为什么要冒险？ 最大的悬念是什么？" [ref=e69]:
        - /placeholder: "这个世界的规则是什么？\n主角为什么要冒险？\n最大的悬念是什么？"
    - generic [ref=e70]:
      - button "保存草稿" [ref=e71] [cursor=pointer]:
        - generic [ref=e72]: 保存草稿
      - button "确认前提" [ref=e73] [cursor=pointer]:
        - generic [ref=e74]: 确认前提
  - generic [ref=e75]:
    - generic [ref=e76]: 前提 画板
    - textbox "输入指令，AI 将辅助当前画板操作" [ref=e78]
    - button "发送" [disabled] [ref=e79]:
      - generic [ref=e80]: 发送
  - generic [ref=e81]:
    - generic [ref=e83]:
      - img [ref=e84]
      - text: 已保存
    - generic [ref=e86]:
      - generic [ref=e87]: "字数: 0"
      - generic [ref=e88]: "|"
      - generic [ref=e89]: "链接: 0"
  - generic [ref=e91]:
    - img [ref=e95]
    - heading "世界构建入门" [level=2] [ref=e98]
    - paragraph [ref=e99]: 织梦机用「正典」来管理你的设定稳定性。每个设定有四个等级：
    - generic [ref=e100]:
      - generic [ref=e103]:
        - generic [ref=e104]: 未收录
        - generic [ref=e105]: 灵感笔记，尚未确认
      - generic [ref=e108]:
        - generic [ref=e109]: 草案正典
        - generic [ref=e110]: 初步认定，还在打磨
      - generic [ref=e113]:
        - generic [ref=e114]: 项目正典
        - generic [ref=e115]: 团队认可，纳入正典
      - generic [ref=e118]:
        - generic [ref=e119]: 核心正典
        - generic [ref=e120]: 不可更改的基石设定
    - generic [ref=e125]:
      - button "不再显示" [ref=e126] [cursor=pointer]:
        - img [ref=e128]
        - text: 不再显示
      - button "开始使用" [ref=e130] [cursor=pointer]:
        - text: 开始使用
        - img [ref=e131]
```

# Test source

```ts
  403 | 
  404 |       case 'delete_chapter_packet':
  405 |         if (args && args.input && args.input.id) chapterPackets.delete(args.input.id);
  406 |         return undefined;
  407 | 
  408 |       // ═══ Judgment Records ═══
  409 |       case 'list_judgment_records':
  410 |         return [];
  411 | 
  412 |       case 'append_judgment_record':
  413 |         return args && args.record ? { ...args.record, id: nextId('judg') } : { id: nextId('judg') };
  414 | 
  415 |       // ═══ Health / Misc ═══
  416 |       case 'ping':
  417 |         return 'pong';
  418 | 
  419 |       case 'get_usage_stats':
  420 |         return { todayTokens: 0, maxTokens: 0, dailyHistory: [], totalCostToday: 0, totalCostMonth: 0, budgetLimit: 10 };
  421 | 
  422 |       case 'export_project':
  423 |         return { path: '/tmp/export.json' };
  424 | 
  425 |       case 'import_project':
  426 |         return { projectId: nextId('import') };
  427 | 
  428 |       case 'store_api_key':
  429 |         return undefined;
  430 | 
  431 |       case 'set_budget_limit':
  432 |         return undefined;
  433 | 
  434 |       default:
  435 |         console.warn('[Mock] Unhandled Tauri command:', cmd, args);
  436 |         return undefined;
  437 |     }
  438 |   };
  439 | 
  440 |   function nextId() {
  441 |     return 'mockid-' + String(Math.random()).slice(2, 10) + String(Date.now()).slice(-6);
  442 |   }
  443 | 
  444 |   // ── Callback infrastructure ──
  445 |   const callbacks = new Map();
  446 |   window.__TAURI_INTERNALS__.transformCallback = (callback, once) => {
  447 |     const id = crypto.getRandomValues(new Uint32Array(1))[0];
  448 |     callbacks.set(id, (d) => {
  449 |       if (once) callbacks.delete(id);
  450 |       return typeof callback === 'function' ? callback(d) : undefined;
  451 |     });
  452 |     return id;
  453 |   };
  454 |   window.__TAURI_INTERNALS__.unregisterCallback = (id) => callbacks.delete(id);
  455 | 
  456 | })();
  457 | `;
  458 | }
  459 | 
  460 | // ═══════════════════════════════════════════
  461 | //  Page Helpers
  462 | // ═══════════════════════════════════════════
  463 | 
  464 | /** Create a project via CreationWizard modal */
  465 | async function createProject(page: Page, name: string) {
  466 |   // Click "新建作品" button on the bookshelf
  467 |   await page.getByLabel("新建作品").click();
  468 | 
  469 |   // CreationWizard modal should appear
  470 |   await expect(page.getByRole("heading", { name: "新建作品" })).toBeVisible({ timeout: 5000 });
  471 | 
  472 |   // Fill in project name
  473 |   const nameInput = page.locator('input[placeholder="输入作品名称..."]');
  474 |   await nameInput.fill(name);
  475 | 
  476 |   // Skip template — click "开始创作" (may need "下一步" first if 2-step wizard)
  477 |   const nextBtn = page.getByRole("button", { name: "下一步" });
  478 |   const startBtn = page.getByRole("button", { name: "开始创作" });
  479 | 
  480 |   if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  481 |     await nextBtn.click();
  482 |   }
  483 | 
  484 |   await expect(startBtn).toBeVisible({ timeout: 3000 });
  485 |   await startBtn.click();
  486 | }
  487 | 
  488 | /** Stage 1: Fill premise card and confirm */
  489 | async function completePremiseStage(page: Page) {
  490 |   // Wait for premise textarea to render
  491 |   await expect(page.locator("textarea").first()).toBeVisible({ timeout: 8000 });
  492 | 
  493 |   // Fill premise text
  494 |   const textarea = page.locator("textarea.premise-textarea");
  495 |   await expect(textarea).toBeVisible({ timeout: 5000 });
  496 |   await textarea.fill(PREMISE_TEXT);
  497 | 
  498 |   // Select story type
  499 |   const genreSelect = page.locator("select").first();
  500 |   await genreSelect.selectOption("character_driven");
  501 | 
  502 |   // Click "保存草稿"
> 503 |   await page.getByRole("button", { name: "保存草稿" }).click();
      |                                                    ^ Error: locator.click: Test timeout of 45000ms exceeded.
  504 |   await expect(page.getByText("保存中...")).toBeVisible({ timeout: 3000 }).catch(() => {});
  505 | 
  506 |   // Wait for save to complete (button text returns or other visual cue)
  507 |   await page.waitForTimeout(1500);
  508 | 
  509 |   // Click "确认前提"
  510 |   await page.getByRole("button", { name: "确认前提" }).click();
  511 | }
  512 | 
  513 | /** Stage 2: Create default structure and confirm */
  514 | async function completeStructureStage(page: Page) {
  515 |   // "创建默认结构" button should appear
  516 |   await expect(page.getByRole("button", { name: "创建默认结构" })).toBeVisible({ timeout: 8000 });
  517 |   await page.getByRole("button", { name: "创建默认结构" }).click();
  518 | 
  519 |   // ReactFlow should render
  520 |   await expect(page.locator(".react-flow")).toBeVisible({ timeout: 5000 });
  521 | 
  522 |   // Click "确认结构 ✓"
  523 |   await page.getByRole("button", { name: "确认结构" }).click();
  524 |   await page.waitForTimeout(1000);
  525 | }
  526 | 
  527 | /** Stage 3: Add a character and confirm setting */
  528 | async function completeSettingStage(page: Page) {
  529 |   // Wait for setting canvas to render (should see tabs or add button)
  530 |   await expect(page.getByRole("button", { name: "确认设定" })).toBeVisible({ timeout: 8000 });
  531 | 
  532 |   // Switch to Characters tab
  533 |   await page.getByRole("tab", { name: "角色" }).click();
  534 | 
  535 |   // Click "+ 添加角色"
  536 |   await page.getByRole("button", { name: "添加角色" }).click();
  537 | 
  538 |   // Fill character name
  539 |   const nameInput = page.locator('input[placeholder="角色名称"]');
  540 |   await expect(nameInput).toBeVisible({ timeout: 3000 });
  541 |   await nameInput.fill("测试主角");
  542 | 
  543 |   // Also fill hook
  544 |   const hookInput = page.locator('input[placeholder="一句话让读者记住角色"]');
  545 |   if (await hookInput.isVisible()) {
  546 |     await hookInput.fill("一个背负秘密的觉醒者");
  547 |   }
  548 | 
  549 |   // Click "创建"
  550 |   await page.getByRole("button", { name: "创建" }).click();
  551 |   await page.waitForTimeout(1000);
  552 | 
  553 |   // Click "确认设定 ✓"
  554 |   await page.getByRole("button", { name: "确认设定" }).click();
  555 |   await page.waitForTimeout(1000);
  556 | }
  557 | 
  558 | /** Stage 4: Create chapter packet and confirm */
  559 | async function completePacketStage(page: Page) {
  560 |   // Wait for packet canvas to load (either empty state or create button)
  561 |   await expect(page.getByRole("button", { name: "从空包开始" })).toBeVisible({ timeout: 10000 });
  562 | 
  563 |   // Click "从空包开始"
  564 |   await page.getByRole("button", { name: "从空包开始" }).click();
  565 |   await page.waitForTimeout(1000);
  566 | 
  567 |   // Fill chapter title
  568 |   const titleInput = page.locator('input[placeholder="章节标题"]');
  569 |   await expect(titleInput).toBeVisible({ timeout: 5000 });
  570 |   await titleInput.fill(CHAPTER_TITLE);
  571 | 
  572 |   // Wait for layers to load
  573 |   await page.waitForTimeout(1000);
  574 | 
  575 |   // Click "确认"
  576 |   await page.getByRole("button", { name: "确认" }).click();
  577 |   await page.waitForTimeout(1500);
  578 | }
  579 | 
  580 | // ═══════════════════════════════════════════
  581 | //  Tests
  582 | // ═══════════════════════════════════════════
  583 | 
  584 | test.describe("v2.0 Golden Path — 五画板管线", () => {
  585 |   test.beforeEach(async ({ page }) => {
  586 |     // Clear any previous mock state from localStorage
  587 |     await page.addInitScript(buildMockScript());
  588 |   });
  589 | 
  590 |   test("完整黄金路径：从头走完五画板管线", async ({ page }) => {
  591 |     // ── Navigate to bookshelf ──
  592 |     await page.goto("/");
  593 |     await page.evaluate(() => localStorage.removeItem('__zmj_mock_v2__'));
  594 |     await page.reload();
  595 |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  596 | 
  597 |     // ── Step 1: Create project ──
  598 |     await createProject(page, PROJECT_NAME);
  599 |     await page.waitForTimeout(1500);
  600 | 
  601 |     // ── Verify we're in PipelineNav with premise stage active ──
  602 |     await expect(page.locator(".pipeline-nav")).toBeVisible({ timeout: 5000 });
  603 |     await expect(page.locator(".pipeline-project-title")).toHaveText(PROJECT_NAME);
```
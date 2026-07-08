# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-story-creation.spec.ts >> Path 1: Story Creation >> create object and add to canvas board via inspector
- Location: e2e\01-story-creation.spec.ts:107:3

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('textarea')
Expected: "新人物设定内容"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for locator('textarea')

```

```yaml
- navigation:
  - button "← 书架"
  - text: 觉醒纪元
  - button "文档"
  - button "画板"
  - button "设定集"
  - button "判断记录"
- text: 大纲
- button "◀"
- text: ▼ 📝 草稿 1
- button "+"
- text: 📝 新人物
- button "↩"
- button "↪"
- button "H2"
- button "H3"
- button "B"
- button "I"
- button "S"
- button "❝"
- button "≡"
- button "</>"
- button "▦"
- button "✎ 编辑"
- button "</> 源码"
- button "👁 预览"
- paragraph: 新人物设定内容
- text: "字数: 7 | [[链接]]: 0"
- heading "新人物" [level=3]
- button "收录为设定"
- button "放入画板"
- button "锁定"
- button "废弃"
- button "引用"
- button "判断"
- text: 类型 人物 状态 草稿 正典等级 未收录 引用次数 0 次 被引用 无 标签 人物 所属画板 无 摘要 新人物设定内容
```

# Test source

```ts
  40  |         { id: "book-3", name: "新作品", genre: "未分类", status: "conceiving", wordCount: 0, gradient: '["#6366f1","#8b5cf6"]', createdAt: Date.now(), updatedAt: Date.now() },
  41  |       ];
  42  |       window.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
  43  |         if (cmd === 'create_project') return allProjects[2];
  44  |         if (cmd === 'list_projects') return allProjects;
  45  |         return origInvoke(cmd, args);
  46  |       };
  47  |     `);
  48  |     await page.goto("/");
  49  |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  50  | 
  51  |     await page.getByLabel("新建作品").click();
  52  | 
  53  |     await expect(page.getByText("新作品")).toBeVisible({ timeout: 8000 });
  54  |     await expect(page.getByRole("button", { name: "文档" })).toBeVisible();
  55  |     await expect(page.getByRole("button", { name: "画板" })).toBeVisible();
  56  |     await expect(page.getByRole("button", { name: "设定集" })).toBeVisible();
  57  |     await expect(page.getByRole("button", { name: "判断记录" })).toBeVisible();
  58  |   });
  59  | 
  60  |   test("enter an existing project", async ({ page }) => {
  61  |     await page.goto("/");
  62  |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  63  | 
  64  |     await page.getByLabel("进入《觉醒纪元》").click();
  65  |     await expect(page.getByText("觉醒纪元")).toBeVisible({ timeout: 5000 });
  66  |     await expect(page.getByText("← 书架")).toBeVisible();
  67  |   });
  68  | 
  69  |   test("create object and write wiki link in content", async ({ page }) => {
  70  |     await setupMocks(page, {
  71  |       projects: DEFAULT_PROJECTS,
  72  |       objects: [],
  73  |       connections: [],
  74  |       canvasStates: [],
  75  |     });
  76  |     await page.goto("/");
  77  |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  78  | 
  79  |     await page.getByLabel("进入《觉醒纪元》").click();
  80  |     await expect(page.getByText("觉醒纪元")).toBeVisible({ timeout: 5000 });
  81  | 
  82  |     // Empty state shows template buttons
  83  |     await expect(page.getByText("选择或创建一个对象")).toBeVisible();
  84  |     await expect(page.getByText("+ 人物")).toBeVisible();
  85  | 
  86  |     // Click "+ 人物" to create a character
  87  |     await page.getByText("+ 人物").click();
  88  | 
  89  |     // After creation the editor textarea appears
  90  |     const textarea = page.locator("textarea");
  91  |     await expect(textarea).toBeVisible({ timeout: 5000 });
  92  | 
  93  |     // Default name shows as "新人物" in the outline
  94  |     await expect(page.locator(".outline-item-name").filter({ hasText: "新人物" })).toBeVisible({ timeout: 3000 });
  95  | 
  96  |     // Initial word count should show 0 links
  97  |     await expect(page.getByText(/\[\[链接\]\]: 0/)).toBeVisible();
  98  | 
  99  |     // Type content containing a [[wiki link]]
  100 |     await textarea.fill("这个故事的主角是[[李四]]，他是核心人物。");
  101 |     await expect(textarea).toHaveValue("这个故事的主角是[[李四]]，他是核心人物。");
  102 | 
  103 |     // Word count should now show 1 wiki link
  104 |     await expect(page.getByText(/\[\[链接\]\]: 1/)).toBeVisible({ timeout: 3000 });
  105 |   });
  106 | 
  107 |   test("create object and add to canvas board via inspector", async ({ page }) => {
  108 |     await setupMocks(page, {
  109 |       projects: DEFAULT_PROJECTS,
  110 |       objects: [
  111 |         {
  112 |           id: "obj-new-1",
  113 |           projectId: "book-1",
  114 |           name: "新人物",
  115 |           type: "人物",
  116 |           status: "草稿",
  117 |           canonLevel: "未收录",
  118 |           tags: ["人物"],
  119 |           aliases: [],
  120 |           selectedBoards: [],
  121 |           content: "新人物设定内容",
  122 |           referencesCount: 0,
  123 |           judgmentHistory: [],
  124 |           createdAt: Date.now(),
  125 |           updatedAt: Date.now(),
  126 |         },
  127 |       ],
  128 |       connections: [],
  129 |       canvasStates: [],
  130 |     });
  131 |     await page.goto("/");
  132 |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  133 | 
  134 |     // Enter project
  135 |     await page.getByLabel("进入《觉醒纪元》").click();
  136 |     await expect(page.getByText("觉醒纪元")).toBeVisible({ timeout: 5000 });
  137 | 
  138 |     // Select the object in the outline
  139 |     await page.getByText("新人物").first().click();
> 140 |     await expect(page.locator("textarea")).toHaveValue("新人物设定内容", { timeout: 5000 });
      |                                            ^ Error: expect(locator).toHaveValue(expected) failed
  141 | 
  142 |     // Navigate to canvas tab first — should show no nodes for a board-less object
  143 |     await page.locator("button.nav-tab", { hasText: "画板" }).click();
  144 |     // Info bar shows "节点: 0" for an empty canvas
  145 |     await expect(page.getByText(/节点: 0/)).toBeVisible({ timeout: 3000 });
  146 | 
  147 |     // Switch back to document tab to use inspector
  148 |     await page.locator("button.nav-tab", { hasText: "文档" }).click();
  149 |     await expect(page.locator("textarea")).toBeVisible({ timeout: 3000 });
  150 | 
  151 |     // Click "放入画板" in the inspector panel
  152 |     const addToBoardBtn = page.getByTitle("放入画板");
  153 |     await expect(addToBoardBtn).toBeVisible();
  154 |     await expect(addToBoardBtn).toBeEnabled();
  155 |     await addToBoardBtn.click();
  156 | 
  157 |     // Board menu should appear
  158 |     const boardMenu = page.locator(".ia-board-menu");
  159 |     await expect(boardMenu).toBeVisible();
  160 | 
  161 |     // Click "角色关系图" board item
  162 |     await page.getByText("角色关系图").first().click();
  163 | 
  164 |     // Navigate to canvas tab
  165 |     await page.locator("button.nav-tab", { hasText: "画板" }).click();
  166 | 
  167 |     // The "角色关系图" tab should be the default — verify the node appears
  168 |     await expect(page.locator(".canvas-node .node-name").filter({ hasText: "新人物" })).toBeVisible({ timeout: 5000 });
  169 |     // Info bar should now show at least 1 node
  170 |     const nodeInfo = page.getByText(/节点: \d+/);
  171 |     await expect(nodeInfo).toBeVisible();
  172 |     const nodeCountText = await nodeInfo.textContent();
  173 |     expect(parseInt(nodeCountText!.match(/\d+/)?.[0] || "0")).toBeGreaterThanOrEqual(1);
  174 |   });
  175 | });
  176 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-object-lifecycle.spec.ts >> Path 5: Object Lifecycle >> edit object content via textarea
- Location: e2e\05-object-lifecycle.spec.ts:45:3

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('textarea')
Expected: "初始内容"
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
- text: 📝 测试对象
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
- paragraph: 初始内容
- text: "字数: 4 | [[链接]]: 0"
- heading "测试对象" [level=3]
- button "收录为设定"
- button "放入画板"
- button "锁定"
- button "废弃"
- button "引用"
- button "判断"
- text: 类型 人物 状态 草稿 正典等级 未收录 引用次数 0 次 被引用 无 标签 测试 所属画板 无 摘要 初始内容
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { setupMocks, DEFAULT_PROJECTS } from "./mock-helper";
  3   | 
  4   | test.describe("Path 5: Object Lifecycle", () => {
  5   |   test("empty project shows create template buttons", async ({ page }) => {
  6   |     await setupMocks(page, {
  7   |       projects: DEFAULT_PROJECTS,
  8   |       objects: [],
  9   |       connections: [],
  10  |       canvasStates: [],
  11  |     });
  12  |     await page.goto("/");
  13  |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  14  | 
  15  |     await page.getByLabel("进入《觉醒纪元》").click();
  16  |     await expect(page.getByText("觉醒纪元")).toBeVisible({ timeout: 5000 });
  17  | 
  18  |     // Document view shows empty state with template create buttons
  19  |     await expect(page.getByText("选择或创建一个对象")).toBeVisible({ timeout: 5000 });
  20  |     await expect(page.getByText("+ 人物")).toBeVisible();
  21  |     await expect(page.getByText("+ 地点")).toBeVisible();
  22  |     await expect(page.getByText("+ 规则/机制")).toBeVisible();
  23  |   });
  24  | 
  25  |   test("create object from template", async ({ page }) => {
  26  |     await setupMocks(page, {
  27  |       projects: DEFAULT_PROJECTS,
  28  |       objects: [],
  29  |       connections: [],
  30  |       canvasStates: [],
  31  |     });
  32  |     await page.goto("/");
  33  |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  34  | 
  35  |     await page.getByLabel("进入《觉醒纪元》").click();
  36  |     await expect(page.getByText("觉醒纪元")).toBeVisible({ timeout: 5000 });
  37  | 
  38  |     // Create a 人物 object
  39  |     await page.getByText("+ 人物").click();
  40  | 
  41  |     // After creation, the editor textarea appears
  42  |     await expect(page.locator("textarea")).toBeVisible({ timeout: 5000 });
  43  |   });
  44  | 
  45  |   test("edit object content via textarea", async ({ page }) => {
  46  |     await setupMocks(page, {
  47  |       projects: DEFAULT_PROJECTS,
  48  |       objects: [
  49  |         {
  50  |           id: "obj-edit-1",
  51  |           projectId: "book-1",
  52  |           name: "测试对象",
  53  |           type: "人物",
  54  |           status: "草稿",
  55  |           canonLevel: "未收录",
  56  |           tags: ["测试"],
  57  |           aliases: [],
  58  |           selectedBoards: [],
  59  |           content: "初始内容",
  60  |           referencesCount: 0,
  61  |           judgmentHistory: [],
  62  |           createdAt: Date.now(),
  63  |           updatedAt: Date.now(),
  64  |         },
  65  |       ],
  66  |       connections: [],
  67  |       canvasStates: [],
  68  |     });
  69  |     await page.goto("/");
  70  |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  71  | 
  72  |     await page.getByLabel("进入《觉醒纪元》").click();
  73  |     await expect(page.getByText("觉醒纪元")).toBeVisible({ timeout: 5000 });
  74  | 
  75  |     // Select the object by clicking on it in the outline
  76  |     await page.getByText("测试对象").first().click();
  77  | 
  78  |     // Textarea should show initial content
  79  |     const textarea = page.locator("textarea");
> 80  |     await expect(textarea).toHaveValue("初始内容", { timeout: 5000 });
      |                            ^ Error: expect(locator).toHaveValue(expected) failed
  81  | 
  82  |     // Edit content
  83  |     await textarea.fill("修改后的内容");
  84  |     await expect(textarea).toHaveValue("修改后的内容");
  85  |   });
  86  | 
  87  |   test("change object type and status via dropdowns", async ({ page }) => {
  88  |     await setupMocks(page, {
  89  |       projects: DEFAULT_PROJECTS,
  90  |       objects: [
  91  |         {
  92  |           id: "obj-select-1",
  93  |           projectId: "book-1",
  94  |           name: "可编辑对象",
  95  |           type: "人物",
  96  |           status: "草稿",
  97  |           canonLevel: "未收录",
  98  |           tags: [],
  99  |           aliases: [],
  100 |           selectedBoards: [],
  101 |           content: "内容",
  102 |           referencesCount: 0,
  103 |           judgmentHistory: [],
  104 |           createdAt: Date.now(),
  105 |           updatedAt: Date.now(),
  106 |         },
  107 |       ],
  108 |       connections: [],
  109 |       canvasStates: [],
  110 |     });
  111 |     await page.goto("/");
  112 |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  113 | 
  114 |     await page.getByLabel("进入《觉醒纪元》").click();
  115 |     await expect(page.getByText("觉醒纪元")).toBeVisible({ timeout: 5000 });
  116 | 
  117 |     // Select the object
  118 |     await page.getByText("可编辑对象").first().click();
  119 | 
  120 |     // Type select - change to "地点"
  121 |     const typeSelect = page.locator(".doc-properties select").nth(0);
  122 |     await typeSelect.selectOption("地点");
  123 |     await expect(typeSelect).toHaveValue("地点");
  124 | 
  125 |     // Status select - change to "待定"
  126 |     const statusSelect = page.locator(".doc-properties select").nth(1);
  127 |     await statusSelect.selectOption("待定");
  128 |     await expect(statusSelect).toHaveValue("待定");
  129 | 
  130 |     // Canon select - change to a canon level
  131 |     const canonSelect = page.locator(".doc-properties select").nth(2);
  132 |     await canonSelect.selectOption("草案正典");
  133 |     await expect(canonSelect).toHaveValue("草案正典");
  134 |   });
  135 | });
  136 | 
```
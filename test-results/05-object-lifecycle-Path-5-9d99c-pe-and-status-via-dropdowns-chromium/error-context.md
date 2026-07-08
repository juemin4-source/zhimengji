# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-object-lifecycle.spec.ts >> Path 5: Object Lifecycle >> change object type and status via dropdowns
- Location: e2e\05-object-lifecycle.spec.ts:87:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.doc-properties select').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - button "← 书架" [ref=e5] [cursor=pointer]
    - generic [ref=e6]: 觉醒纪元
    - button "文档" [ref=e7] [cursor=pointer]
    - button "画板" [ref=e8] [cursor=pointer]
    - button "设定集" [ref=e9] [cursor=pointer]
    - button "判断记录" [ref=e10] [cursor=pointer]
  - generic [ref=e11]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: 大纲
          - button "◀" [ref=e17] [cursor=pointer]
        - generic [ref=e19]:
          - generic [ref=e20] [cursor=pointer]:
            - generic [ref=e21]: ▼
            - generic [ref=e22]: 📝
            - generic [ref=e23]: 草稿
            - generic [ref=e24]: "1"
            - button "+" [ref=e25]
          - generic "可编辑对象" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: 📝
            - generic [ref=e29]: 可编辑对象
      - generic [ref=e30]:
        - generic [ref=e31]:
          - button "↩" [ref=e32] [cursor=pointer]
          - button "↪" [ref=e33] [cursor=pointer]
          - button "H2" [ref=e35] [cursor=pointer]
          - button "H3" [ref=e36] [cursor=pointer]
          - button "B" [ref=e38] [cursor=pointer]
          - button "I" [ref=e39] [cursor=pointer]
          - button "S" [ref=e40] [cursor=pointer]
          - button "❝" [ref=e42] [cursor=pointer]
          - button "≡" [ref=e43] [cursor=pointer]
          - button "</>" [ref=e44] [cursor=pointer]
          - button "▦" [ref=e45] [cursor=pointer]
          - button "✎ 编辑" [ref=e47] [cursor=pointer]
          - button "</> 源码" [ref=e48] [cursor=pointer]
          - button "👁 预览" [ref=e49] [cursor=pointer]
        - paragraph [ref=e53]: 内容
        - generic [ref=e54]: "字数: 2 | [[链接]]: 0"
    - generic [ref=e55]:
      - heading "可编辑对象" [level=3] [ref=e56]
      - generic [ref=e57]:
        - button "收录为设定" [ref=e58] [cursor=pointer]
        - button "放入画板" [ref=e60] [cursor=pointer]
        - button "锁定" [ref=e61] [cursor=pointer]
        - button "废弃" [ref=e62] [cursor=pointer]
        - button "引用" [ref=e63] [cursor=pointer]
        - button "判断" [ref=e64] [cursor=pointer]
      - generic [ref=e65]:
        - generic [ref=e66]: 类型
        - generic [ref=e67]: 人物
      - generic [ref=e68]:
        - generic [ref=e69]: 状态
        - generic [ref=e71]: 草稿
      - generic [ref=e72]:
        - generic [ref=e73]: 正典等级
        - generic [ref=e75]: 未收录
      - generic [ref=e76]:
        - generic [ref=e77]: 引用次数
        - generic [ref=e78]: 0 次
      - generic [ref=e79]:
        - generic [ref=e80]: 被引用
        - generic [ref=e81]: 无
      - generic [ref=e82]:
        - generic [ref=e83]: 所属画板
        - generic [ref=e84]: 无
      - generic [ref=e85]:
        - generic [ref=e86]: 摘要
        - generic [ref=e87]: 内容
```

# Test source

```ts
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
  80  |     await expect(textarea).toHaveValue("初始内容", { timeout: 5000 });
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
> 122 |     await typeSelect.selectOption("地点");
      |                      ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
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
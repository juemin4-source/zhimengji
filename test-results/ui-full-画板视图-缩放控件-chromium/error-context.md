# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-full.spec.ts >> 画板视图 >> 缩放控件
- Location: e2e\ui-full.spec.ts:185:3

# Error details

```
Test timeout of 45000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - button "书架" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
      - text: 书架
    - generic [ref=e9]: 觉醒纪元
    - button "文档" [ref=e10] [cursor=pointer]
    - button "画板" [ref=e11] [cursor=pointer]
    - button "设定集" [ref=e12] [cursor=pointer]
    - button "判断记录" [ref=e13] [cursor=pointer]
    - button "AI" [ref=e14] [cursor=pointer]
    - generic [ref=e15]:
      - generic [ref=e16]:
        - img [ref=e17]
        - text: 人物
      - generic [ref=e20]: 核心正典
    - button "Ctrl+K" [ref=e22] [cursor=pointer]:
      - img [ref=e23]
      - generic [ref=e26]: Ctrl+K
    - button "AI 设置" [ref=e27] [cursor=pointer]:
      - img [ref=e28]
  - generic [ref=e31]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]: 大纲
          - button "收起大纲" [ref=e37] [cursor=pointer]:
            - img [ref=e38]
        - generic [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42] [cursor=pointer]:
              - img [ref=e44]
              - img [ref=e47]
              - generic [ref=e50]: 草稿
              - generic [ref=e51]: "2"
              - button "新建事件" [ref=e52]:
                - img [ref=e53]
            - generic [ref=e54]:
              - generic "李四" [ref=e55] [cursor=pointer]:
                - img [ref=e57]
                - generic [ref=e60]: 李四
              - generic "人造人组织" [ref=e61] [cursor=pointer]:
                - img [ref=e63]
                - generic [ref=e66]: 人造人组织
          - generic [ref=e67]:
            - generic [ref=e68] [cursor=pointer]:
              - img [ref=e70]
              - img [ref=e73]
              - generic [ref=e76]: 人物
              - generic [ref=e77]: "1"
              - button "新建人物" [ref=e78]:
                - img [ref=e79]
            - generic "张三" [ref=e81] [cursor=pointer]:
              - img [ref=e83]
              - generic [ref=e86]: 张三
      - generic [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - button "H2" [ref=e90] [cursor=pointer]
            - button "H3" [ref=e91] [cursor=pointer]
            - button "B" [ref=e93] [cursor=pointer]
            - button "I" [ref=e94] [cursor=pointer]
            - button "S" [ref=e95] [cursor=pointer]
            - button "❝" [ref=e97] [cursor=pointer]
            - button "≡" [ref=e98] [cursor=pointer]
            - button "</>" [ref=e99] [cursor=pointer]
            - generic [ref=e100]:
              - img [ref=e101]
              - text: 已保存
          - generic [ref=e103]:
            - button "</> 编辑" [ref=e105] [cursor=pointer]
            - button "✎ 富文本" [ref=e106] [cursor=pointer]
            - button "预览" [ref=e107] [cursor=pointer]:
              - img [ref=e108]
              - text: 预览
        - generic [ref=e111]:
          - generic [ref=e112]:
            - generic [ref=e113]: 类型
            - combobox [ref=e114] [cursor=pointer]:
              - option "人物" [selected]
              - option "地点"
              - option "组织"
              - option "规则/机制"
              - option "事件"
              - option "物品"
              - option "术语"
              - option "章节"
          - generic [ref=e115]:
            - generic [ref=e116]: 状态
            - combobox [ref=e117] [cursor=pointer]:
              - option "占位"
              - option "草稿"
              - option "待定"
              - option "待验证"
              - option "锁定" [selected]
              - option "废弃"
          - generic [ref=e118]:
            - generic [ref=e119]: 正典
            - combobox [ref=e120] [cursor=pointer]:
              - option "未收录"
              - option "草案正典"
              - option "项目正典"
              - option "核心正典" [selected]
          - generic [ref=e122]: 已保存
        - textbox "在此输入文档内容... 使用 [[对象名]] 引用其他对象" [ref=e124]: 张三是一名觉醒的人造人，在一次培养舱异常中获得了自我意识。
        - generic [ref=e125]: "字数: 29 | [[链接]]: 0已保存"
    - generic [ref=e126]:
      - heading "张三" [level=3] [ref=e127]
      - generic [ref=e128]:
        - generic [ref=e129]:
          - button "收录为设定" [disabled] [ref=e130]
          - generic "正典等级：未收录(灰色) → 草案正典(紫色) → 项目正典(蓝色) → 核心正典(金色)" [ref=e131]:
            - img [ref=e132]
        - button "放入画板" [ref=e135] [cursor=pointer]
        - button "解锁" [ref=e136] [cursor=pointer]
        - button "引用" [ref=e137] [cursor=pointer]
        - button "判断 (2)" [ref=e138] [cursor=pointer]
      - generic [ref=e139]:
        - generic [ref=e140]: 类型
        - generic [ref=e141]: 人物
      - generic [ref=e142]:
        - generic [ref=e143]: 状态
        - generic [ref=e145]: 锁定
      - generic [ref=e146]:
        - generic [ref=e147]: 正典等级
        - generic [ref=e149]: 核心正典
      - generic [ref=e150]:
        - generic [ref=e151]: 引用次数
        - generic [ref=e152]: 2 次
      - generic [ref=e153]:
        - generic [ref=e154]: 被引用
        - generic [ref=e155]: 无
      - generic [ref=e156]:
        - generic [ref=e157]: 别名
        - generic [ref=e158]:
          - generic [ref=e159] [cursor=pointer]: 三哥
          - generic [ref=e160] [cursor=pointer]: ZS
      - generic [ref=e161]:
        - generic [ref=e162]: 标签
        - generic [ref=e163]:
          - generic [ref=e164] [cursor=pointer]: 主角
          - generic [ref=e165] [cursor=pointer]: 人造人
          - generic [ref=e166] [cursor=pointer]: 觉醒者
      - generic [ref=e167]:
        - generic [ref=e168]: 所属画板
        - generic [ref=e169]: 角色关系图、设定推演图
      - generic [ref=e170]:
        - generic [ref=e171]: 摘要
        - generic [ref=e172]: 张三是一名觉醒的人造人，在一次培养舱异常中获得了自我意识。
      - generic [ref=e173]:
        - generic [ref=e174]: 判断记录
        - generic [ref=e175]:
          - generic [ref=e176]:
            - generic [ref=e177]: 提升正典
            - text: 正典升级为核心
            - generic [ref=e178]: 2026/6/24
          - generic [ref=e179]:
            - generic [ref=e180]: 锁定
            - text: 核心角色，锁定正典
            - generic [ref=e181]: 2026/6/9
  - generic [ref=e182]:
    - generic [ref=e184]:
      - img [ref=e185]
      - text: 已保存
    - generic [ref=e187]:
      - generic [ref=e188]: "字数: 62"
      - generic [ref=e189]: "|"
      - generic [ref=e190]: "链接: 0"
  - generic [ref=e192]:
    - img [ref=e196]
    - heading "世界构建入门" [level=2] [ref=e199]
    - paragraph [ref=e200]: 织梦机用「正典」来管理你的设定稳定性。每个设定有四个等级：
    - generic [ref=e201]:
      - generic [ref=e204]:
        - generic [ref=e205]: 未收录
        - generic [ref=e206]: 灵感笔记，尚未确认
      - generic [ref=e209]:
        - generic [ref=e210]: 草案正典
        - generic [ref=e211]: 初步认定，还在打磨
      - generic [ref=e214]:
        - generic [ref=e215]: 项目正典
        - generic [ref=e216]: 团队认可，纳入正典
      - generic [ref=e219]:
        - generic [ref=e220]: 核心正典
        - generic [ref=e221]: 不可更改的基石设定
    - generic [ref=e226]:
      - button "不再显示" [ref=e227] [cursor=pointer]:
        - img [ref=e229]
        - text: 不再显示
      - button "开始使用" [ref=e231] [cursor=pointer]:
        - text: 开始使用
        - img [ref=e232]
  - generic [ref=e235]:
    - generic [ref=e236]:
      - img [ref=e237]
      - heading "正典等级 — 管理设定的可信度" [level=4] [ref=e240]
      - paragraph [ref=e241]: 织梦机用「正典」来管理你世界设定的稳定性。每个对象有四个等级：
    - generic [ref=e242]:
      - generic [ref=e243]:
        - generic [ref=e245]:
          - generic [ref=e246]: 未收录
          - generic [ref=e247]: 初步构想，尚未确认是否纳入世界
        - generic [ref=e248]: 灵感笔记
      - generic [ref=e249]:
        - generic [ref=e251]:
          - generic [ref=e252]: 草案正典
          - generic [ref=e253]: 初步认定，还在打磨和验证阶段
        - generic [ref=e254]: 初步设定
      - generic [ref=e255]:
        - generic [ref=e257]:
          - generic [ref=e258]: 项目正典
          - generic [ref=e259]: 团队/个人认可的正典设定
        - generic [ref=e260]: 核心设定
      - generic [ref=e261]:
        - generic [ref=e263]:
          - generic [ref=e264]: 核心正典
          - generic [ref=e265]: 不可更改的世界基石，修改需裁决
        - generic [ref=e266]: 基石设定
    - generic [ref=e267]: 在右侧面板中，你可以将对象「收录为设定」或提升正典等级。核心正典修改需要填写裁决原因。
    - generic [ref=e268]:
      - generic [ref=e269] [cursor=pointer]:
        - checkbox "不再显示" [ref=e270]
        - text: 不再显示
      - button "知道了" [ref=e271] [cursor=pointer]
```

# Test source

```ts
  1   | ﻿/**
  2   |  * 织梦机完整 UI 测试
  3   |  * 来源: test-plan.md + product-brief.md + App.tsx
  4   |  * 
  5   |  * 覆盖: Bookshelf, NavBar (5 tabs), AI Chat, Canvas,
  6   |  *       Inspector, Search, Settings, StatusBar
  7   |  * 
  8   |  * 模式: 纯 UI 交互测试 (IPC 已 mock)
  9   |  */
  10  | 
  11  | import { test, expect } from '@playwright/test';
  12  | import { setupMocks, DEFAULT_PROJECTS, DEFAULT_OBJECTS } from './mock-helper';
  13  | 
  14  | // ─── Helpers ────────────────────────────────────────────────────────
  15  | 
  16  | async function withProjects(page, objects = []) {
  17  |   await setupMocks(page, { projects: DEFAULT_PROJECTS, objects });
  18  |   await page.goto('/');
  19  |   await expect(page.getByText('作品书架')).toBeVisible({ timeout: 10000 });
  20  | }
  21  | 
  22  | async function enterProject(page, name = '觉醒纪元') {
  23  |   await page.getByLabel('进入《' + name + '》').click();
  24  |   await expect(page.getByTitle('返回书架')).toBeVisible({ timeout: 5000 });
  25  | 
  26  |   // 等待弹窗出现并全部关闭
  27  |   await page.waitForTimeout(500);
  28  |   // 关 FirstLaunchGuide: 点"开始使用" → 点"跳过"
  29  |   await page.getByText('开始使用').click().catch(() => {});
> 30  |   await page.waitForTimeout(200);
      |              ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  31  |   await page.getByRole('button', { name: '跳过' }).click().catch(() => {});
  32  |   await page.waitForTimeout(200);
  33  |   // 关 CanonGuideCard: 点"知道了"
  34  |   await page.getByText(/知道了|知道啦/).click().catch(() => {});
  35  |   await page.waitForTimeout(200);
  36  | }
  37  | 
  38  | // ─── 1. Bookshelf ───────────────────────────────────────────────────
  39  | 
  40  | test.describe('Bookshelf - 作品书架', () => {
  41  |   test('空书架状态', async ({ page }) => {
  42  |     await setupMocks(page, { projects: [] });
  43  |     await page.goto('/');
  44  |     await expect(page.getByText('作品书架')).toBeVisible();
  45  |     await expect(page.getByText('还没有作品')).toBeVisible();
  46  |     await expect(page.getByRole('button', { name: '新建作品' })).toBeVisible();
  47  |   });
  48  | 
  49  |   test('显示已有项目列表', async ({ page }) => {
  50  |     await withProjects(page);
  51  |     // 验证两个预设项目都显示
  52  |     await expect(page.getByText('觉醒纪元')).toBeVisible();
  53  |     await expect(page.getByText('星空彼岸')).toBeVisible();
  54  |   });
  55  | 
  56  |   test('新建作品向导弹窗', async ({ page }) => {
  57  |     await withProjects(page);
  58  |     await page.getByRole('button', { name: '新建作品' }).click();
  59  |     // 验证向导弹窗
  60  |     await expect(page.getByPlaceholder('输入作品名称...')).toBeVisible();
  61  |     await expect(page.getByText('从零开始')).toBeVisible();
  62  |     await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
  63  |     // 关闭弹窗
  64  |     await page.getByRole('button', { name: '取消' }).click();
  65  |     await expect(page.getByPlaceholder('输入作品名称...')).not.toBeVisible();
  66  |   });
  67  | 
  68  |   test('进入项目', async ({ page }) => {
  69  |     await withProjects(page);
  70  |     await page.getByLabel('进入《觉醒纪元》').click();
  71  |     await expect(page.getByTitle('返回书架')).toBeVisible();
  72  |     await expect(page.getByText('觉醒纪元')).toBeVisible();
  73  |   });
  74  | });
  75  | 
  76  | // ─── 2. NavTab 导航 ────────────────────────────────────────────────
  77  | 
  78  | test.describe('NavBar - 5 个标签导航', () => {
  79  |   test.beforeEach(async ({ page }) => {
  80  |     await withProjects(page, DEFAULT_OBJECTS);
  81  |     await enterProject(page);
  82  |   });
  83  | 
  84  |   const NAV_TABS = ['文档', '画板', '设定集', '判断记录', 'AI'];
  85  | 
  86  |   for (const tab of NAV_TABS) {
  87  |     test(`导航到「${tab}」`, async ({ page }) => {
  88  |       await page.getByRole('button', { name: tab, exact: true }).click();
  89  |       const btn = page.getByRole('button', { name: tab, exact: true });
  90  |       await expect(btn).toHaveClass(/active/);
  91  |     });
  92  |   }
  93  | 
  94  |   test('顶部工具栏按钮', async ({ page }) => {
  95  |     await expect(page.getByTitle('返回书架')).toBeVisible();
  96  |     await expect(page.getByTitle('全局搜索 (Ctrl+K)')).toBeVisible();
  97  |     await expect(page.getByTitle('AI 设置')).toBeVisible();
  98  |   });
  99  | });
  100 | 
  101 | // ─── 3. AI Chat ────────────────────────────────────────────────────
  102 | 
  103 | test.describe('AI 对话', () => {
  104 |   test.beforeEach(async ({ page }) => {
  105 |     await withProjects(page, DEFAULT_OBJECTS);
  106 |     await enterProject(page);
  107 |     await page.getByRole('button', { name: 'AI', exact: true }).click();
  108 |   });
  109 | 
  110 |   test('AI 界面渲染完整', async ({ page }) => {
  111 |     await expect(page.getByText('AI 助手')).toBeVisible();
  112 |     await expect(page.getByPlaceholder('输入你的想法，让 AI 帮你创作...')).toBeVisible();
  113 |     await expect(page.getByText('AI 已连接')).toBeVisible();
  114 |     // 侧边大纲
  115 |     await expect(page.getByText('大纲')).toBeVisible();
  116 |     // 对象在大纲中
  117 |     await expect(page.getByText('陈锋')).toBeVisible();
  118 |     await expect(page.getByText('灰塔实验室')).toBeVisible();
  119 |     // 底栏模型信息
  120 |     await expect(page.getByText(/GPT|Claude|Gemini|模型/)).toBeVisible();
  121 |   });
  122 | 
  123 |   test('发送消息', async ({ page }) => {
  124 |     const input = page.getByPlaceholder('输入你的想法，让 AI 帮你创作...');
  125 |     await input.fill('帮我创建一个世界观');
  126 |     await input.press('Enter');
  127 |     // 消息出现在对话中
  128 |     await expect(page.getByText('帮我创建一个世界观')).toBeVisible({ timeout: 5000 });
  129 |     // AI 回复（模拟）
  130 |     await expect(page.getByText('天眼纪元')).toBeVisible({ timeout: 5000 });
```
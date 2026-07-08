---
name: playwright-zhimengji
description: "【织梦机·E2E测试】基于 Playwright + tauri-driver 的织梦机桌面端 E2E 测试 skill。从用户路径/PRD/契约直接生成可跑测试代码。内含织梦机的架构知识、Page Object、fixture 和最佳实践。"
archetype: Delivery (primary) + Knowledge (secondary)
thickness: medium
---

# Playwright — 织梦机 E2E 自动化测试

> 本 skill 接受**用户路径/PRD 描述/契约字段**，输出完整的可跑 Playwright 测试代码。
> 所有测试基于 **Tauri v2 + tauri-driver** 架构，通过 WebView2 驱动织梦机桌面窗口。
>
> **核心原则：** 生成测试不是录制操作，而是从产品定义推导出验证逻辑。

---

## 1. 架构知识

织梦机的 E2E 测试架构：

``
npx playwright test --project=tauri
  -> @playwright/test
    -> _tauri fixture (connect via CDP port 4444)
  -> tauri-driver (WebDriver proxy)
  -> 织梦机桌面窗口 (WebView2 / React 19)
``

### 关键结构

| 层级 | 技术 | 测试方式 |
|------|------|---------|
| Rust 后端 | Tauri v2 + SQLite | cargo test (单元) |
| 前端 IPC 层 | @tauri-apps/api/core -> invoke() | 可 mock (vitest) |
| UI 层 | React 19 + Vite + @xyflow/react | Playwright E2E |
| 桌面窗口 | WebView2 (WebView2Loader.dll) | tauri-driver |

### Tauri v2 测试注意事项

1. **启动流程**: tauri-driver 启动 Tauri app，Playwright 通过 custom connect 连接 WebView2
2. **IPC 不暴露**: 测试中无法直接 invoke()，Tauri 命令只能从真正的 Rust 后端调用
3. **窗口定位**: 使用 WebView2 上下文，不是普通浏览器
4. **构建模式**: 必须先用 npm run tauri build 生成可执行文件
5. **每次测试独立**: 每个测试文件应创建独立项目隔离数据

---

## 2. 织梦机 Tauri API 映射

### Projects

| 命令 | 参数 | 返回 |
|------|------|------|
| list_projects | - | ProjectDTO[] |
| get_project | { id } | ProjectDTO or null |
| create_project | { name, genre, status, wordCount, gradient } | ProjectDTO |
| update_project | { project } | void |
| delete_project | { id } | void |

### WorldObjects

| 命令 | 参数 | 返回 |
|------|------|------|
| list_world_objects | { projectId } | WorldObject[] |
| get_world_object | { id } | WorldObject or null |
| create_world_object | { object } | WorldObject |
| update_world_object | { object } | void |
| delete_world_object | { id } | void |

### Canvas / Judgment / Connection

| 命令 | 参数 | 返回 |
|------|------|------|
| list_canvas_tab_states | { projectId } | CanvasTabState[] |
| save_canvas_tab_state | { state } | CanvasTabState |
| list_judgment_records | { projectId } | JudgmentRecord[] |
| append_judgment_record | { record } | JudgmentRecord |
| list_connections | { projectId } | Connection[] |
| create_connection | { connection } | Connection |
| delete_connection | { id } | void |
| ping | - | string |

---

## 3. 配置

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,

  use: {
    baseURL: 'tauri://localhost',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'tauri',
      testMatch: /.*\.spec\.ts/,
      use: {
        connectOptions: {
          wsEndpoint: 'http://127.0.0.1:4444',
        },
      },
    },
  ],
});
```

### 项目测试目录结构

```
projects/zhimengji/
  e2e/
    fixtures/
      zhimengji-fixture.ts    # 自定义 fixture
    pages/
      BookshelfPage.ts        # 作品书架
      CanvasPage.ts           # 画板
      AIChatPage.ts           # AI 对话
      DocOutlinePage.ts       # 大纲
      InspectorPage.ts        # 检查器
      SettingsPage.ts         # 设置
    paths/
      story-creation.spec.ts
      multi-board.spec.ts
      canon-management.spec.ts
      judgment-recording.spec.ts
      object-lifecycle.spec.ts
      cross-book-isolation.spec.ts
      decision-chain.spec.ts
    smoke/
      app-loads.spec.ts
      ui-renders.spec.ts
  playwright.config.ts
  scripts/e2e-tauri.ps1         # 已有
  test-results/                 # 已有
```

---

## 4. Page Object 定义

> 优先使用 data-testid 定位。如果组件未标记 testid，使用文本/角色回退。

### BookshelfPage

```typescript
import type { Page } from '@playwright/test';

export class BookshelfPage {
  constructor(private page: Page) {}

  get projectCards()     { return this.page.locator('[data-testid="project-card"]'); }
  get createButton()     { return this.page.locator('[data-testid="create-project-btn"]'); }
  get emptyState()       { return this.page.locator('[data-testid="bookshelf-empty"]'); }
  get projectNameInput() { return this.page.locator('[data-testid="project-name-input"]'); }
  get confirmCreateBtn() { return this.page.locator('[data-testid="confirm-create-btn"]'); }

  async goto() { await this.page.goto('/'); }
  async waitForLoad() { await this.page.waitForSelector('[data-testid="bookshelf"]'); }
  async createProject(name: string) {
    await this.createButton.click();
    await this.projectNameInput.fill(name);
    await this.confirmCreateBtn.click();
  }
  async openProject(name: string) {
    await this.projectCards.filter({ hasText: name }).click();
  }
  async getProjectCount() { return this.projectCards.count(); }
}
```

### CanvasPage

```typescript
import type { Page } from '@playwright/test';

export class CanvasPage {
  constructor(private page: Page) {}

  get canvas()      { return this.page.locator('[data-testid="canvas-view"]'); }
  get objectNodes() { return this.page.locator('[data-testid="canvas-node"]'); }
  get boardTabs()   { return this.page.locator('[data-testid="board-tab"]'); }

  async waitForLoad() { await this.canvas.waitFor(); }
  async getObjectCount() { return this.objectNodes.count(); }
  async switchBoard(name: string) {
    await this.boardTabs.filter({ hasText: name }).click();
  }
  async openObject(name: string) {
    await this.objectNodes.filter({ hasText: name }).click();
  }
  async objectIsVisible(name: string) {
    return this.objectNodes.filter({ hasText: name }).isVisible();
  }
}
```

### AIChatPage

```typescript
import type { Page } from '@playwright/test';

export class AIChatPage {
  constructor(private page: Page) {}

  get chatContainer() { return this.page.locator('[data-testid="ai-chat"]'); }
  get messageList()   { return this.page.locator('[data-testid="ai-message-list"]'); }
  get inputBox()      { return this.page.locator('[data-testid="ai-input"]'); }
  get sendButton()    { return this.page.locator('[data-testid="ai-send-btn"]'); }
  get docCards()      { return this.page.locator('[data-testid="doc-card"]'); }
  get statusBar()     { return this.page.locator('[data-testid="ai-status"]'); }
  get modelSelector() { return this.page.locator('[data-testid="model-selector"]'); }

  async waitForLoad() { await this.chatContainer.waitFor(); }
  async sendMessage(text: string) {
    await this.inputBox.fill(text);
    await this.sendButton.click();
  }
  async getMessageCount() { return this.messageList.locator('> div').count(); }
  async docCardIsVisible(title: string) {
    return this.docCards.filter({ hasText: title }).isVisible();
  }
}
```

---

## 5. 自定义 Fixture

```typescript
import { test as base } from '@playwright/test';
import { BookshelfPage } from '../pages/BookshelfPage';
import { CanvasPage } from '../pages/CanvasPage';
import { AIChatPage } from '../pages/AIChatPage';

export const test = base.extend<{
  bookshelf: BookshelfPage;
  canvas: CanvasPage;
  aiChat: AIChatPage;
}>({
  bookshelf: async ({ page }, use) => {
    const bookshelf = new BookshelfPage(page);
    await use(bookshelf);
  },
  canvas: async ({ page }, use) => {
    const canvas = new CanvasPage(page);
    await use(canvas);
  },
  aiChat: async ({ page }, use) => {
    const aiChat = new AIChatPage(page);
    await use(aiChat);
  },
});

export { expect } from '@playwright/test';
```

---

## 6. 测试生成路径

### 路径一：从用户路径生成

输入 test-plan.md 中的用户路径，生成 spec。

**输入:**
```
Path: Story Creation
Create book -> Write [[?]] -> Object appears -> Drag to board
```

**生成步骤:**
1. 确定 Page Object：BookshelfPage（创建项目）、CanvasPage（画板）
2. 每个箭头一个 test step
3. 生成 setup -> act -> verify 结构
4. 补充异常场景（空状态、加载超时）

### 路径二：从 PRD 描述生成

**输入:**
```
AI 回复以文档卡片形式呈现，用户可以直接在对话流中编辑并保存
```

**推导:**
```
1. AI 对话 -> AI 回复出现文档卡片
2. 点击编辑按钮 -> 卡片进入编辑模式
3. 修改标题/正文 -> 保存
4. 验证: 卡片显示"已编辑"标记
5. 验证: 数据同步到项目数据库
```

### 路径三：从契约生成

**输入:** create_world_object 命令定义

**生成:**
```
1. 通过 UI 创建对象
2. 检查对象出现在画板
3. 通过 IPC 验证数据持久化
```

---

## 7. 最佳实践

### 织梦机专用规则

| 规则 | 说明 |
|------|------|
| 单 worker | Tauri 共享窗口，workers: 1 |
| 不并行 | 测试顺序执行 |
| 每个文件独立数据 | 每个 spec 开头创建自己的测试项目 |
| 用 data-testid | 优先用 [data-testid] 定位 |
| 等待 tauri-driver | 启动后等端口 4444 就绪 |
| 超时宽松 | Tauri app 加载慢，action 超时 30s+ |
| 失败截图 | screenshot: 'only-on-failure' |

### 等待策略

```typescript
// 错误：固定等待
await page.waitForTimeout(3000);

// 正确：等待元素可见
await page.waitForSelector('[data-testid="canvas-view"]', { timeout: 15000 });

// 正确：等待网络空闲
await page.waitForLoadState('networkidle');

// 正确：自定义条件
await page.waitForFunction(() => {
  return document.querySelectorAll('[data-testid="object-node"]').length > 0;
});
```

### 首次运行

```bash
# 1. 构建
cd projects/zhimengji
npm run tauri build

# 2. 启动 tauri-driver (另一个终端)
tauri-driver

# 3. 运行测试
npx playwright test --project=tauri
# 或使用脚本
.\scripts\e2e-tauri.ps1
```

---

## 8. 测试模板

### 冒烟测试

```typescript
import { test, expect } from '../fixtures/zhimengji-fixture';

test('窗口加载并展示作品书架', async ({ bookshelf }) => {
  await bookshelf.goto();
  await bookshelf.waitForLoad();
  await expect(bookshelf.emptyState).toBeVisible();
});

test('创建并进入项目', async ({ bookshelf, canvas }) => {
  await bookshelf.goto();
  await bookshelf.waitForLoad();
  await bookshelf.createProject('测试项目');
  await canvas.waitForLoad();
  await expect(canvas.canvas).toBeVisible();
});
```

### 用户路径测试

```typescript
import { test, expect } from '../fixtures/zhimengji-fixture';

test.describe('Path 1: Story Creation', () => {
  test('完整流程：创建项目到写场景', async ({ bookshelf, canvas }) => {
    await bookshelf.goto();
    await bookshelf.waitForLoad();
    await bookshelf.createProject('我的故事');
    await canvas.waitForLoad();
    await expect(canvas.canvas).toBeVisible();

    await canvas.openObject('测试对象');
    const count = await canvas.getObjectCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
```

### AI 对话测试

```typescript
import { test, expect } from '../fixtures/zhimengji-fixture';

test.describe('AI 对话 (v1.3)', () => {
  test('发送消息并接收回复', async ({ aiChat, bookshelf, page }) => {
    await bookshelf.goto();
    await bookshelf.waitForLoad();
    await bookshelf.createProject('AI 测试');
    await page.goto('/ai');
    await aiChat.waitForLoad();

    await expect(aiChat.statusBar).toContainText('AI 已连接');
    const before = await aiChat.getMessageCount();
    await aiChat.sendMessage('帮我创建一个世界观');
    // 等待 AI 回复（当前是模拟的）
    await page.waitForTimeout(2000);
    const after = await aiChat.getMessageCount();
    expect(after).toBeGreaterThan(before);
  });
});
```

---

## 9. 失败处理

| 失败 | 原因 | 修复 |
|------|------|------|
| Target page closed | Tauri 窗口提前关闭 | 检查 app 启动参数 |
| Timeout 30000ms exceeded | 组件渲染慢 | 增加超时，检查 Rust panic |
| locator: not connected | WebView2 导航中断 | 用 waitForURL 等导航完成 |
| Execution context destroyed | Tauri 重启 | fixture 管理生命周期 |
| 测试间状态污染 | 单 worker 共享 app | 每个 spec 建独立项目 |

捕获 Rust 错误：

```typescript
test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      test.info().annotations.push({
        type: 'console-error', description: msg.text(),
      });
    }
  });
  page.on('pageerror', err => {
    test.info().errors.push(err);
  });
});
```

---

## 10. 不做的

| 不做 | 理由 |
|------|------|
| 不 mock Tauri invoke | E2E 必须测真实后端 |
| 不测 Rust 内部逻辑 | 那是 cargo test 的范围 |
| 不混用 vitest | E2E 和单元测试分离 |
| 不改测试计划 | 7 条用户路径是 PM 定的 |
| 不生成无 verify 的测试 | 每个操作必须有断言 |

## 11. 验证

```
[ ] 配置 playwright.config.ts
[ ] Page Object 覆盖所有测试组件
[ ] 测试可以单文件运行
[ ] 测试可以完整套件运行
[ ] 失败时截图和 trace 留存
[ ] 无硬编码等待（模拟延迟除外）
[ ] 每个 test 有独立数据
[ ] 清理不影响后续测试
```


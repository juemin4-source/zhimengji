# 织梦机 原型-实现 差距分析

**日期**: 2026-07-09 03:00
**分析方法**: 对比 `docs/master-prototype/` (92 屏原型) vs `src/components/` (32 个组件)
**北极星**: v2.0 — AI 原生的世界构建与叙事引擎

---

## 总览

| 层级 | 原型屏数 | 实际组件数 | 完成度 |
|------|---------|-----------|--------|
| P0 (v1.3 核心) | ~24 | ~15 | ~62% |
| P1 (v1.4–v1.6) | ~38 | ~5 | ~13% |
| P2 (v1.7–v2.0) | ~30 | ~2 | ~7% |
| **总计** | **92** | **32** | **~35%** |

---

## 1. 基础 UI 组件 (10 prototypes → 11 components)

| 原型 | 对应实际组件 | 状态 |
|------|-------------|------|
| `components/nav.html` | `ui/NavBar.tsx` | ✅ 已实现 |
| `components/modal.html` | `ui/Modal.tsx` | ✅ 已实现 |
| `components/statusbar.html` | `ui/StatusBar.tsx` | ✅ 已实现 |
| `components/card-grid.html` | `ui/Card.tsx` | ⚠️ 部分实现 — 仅基础卡片，无 Grid 布局 |
| `components/form-group.html` | `ui/Input.tsx` + `ui/Select.tsx` | ⚠️ 部分实现 — Input/Select 独立，无 Form Group 包装 |
| `components/filterbar.html` | `ui/SearchInput.tsx` | ⚠️ 部分实现 — 搜索栏有，无多条件筛选 |
| `components/canon-handbook.html` | `CanonGuideCard.tsx` | ⚠️ 部分实现 — 基础卡片有，手册交互缺 |
| `components/canon-popup.html` | `Inspector.tsx` (popup 区域) | ⚠️ 部分实现 — 放在 Inspector 内，独立 popup 缺 |
| `components/guide-overlay.html` | `FirstLaunchGuide.tsx` | ✅ 已实现 |
| `components/template-grid.html` | — | ❌ **未实现** — 模板网格选择器 |

---

## 2. 书架 / 项目入口 (5 prototypes → 1 component)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/shelf.html` | `Bookshelf.tsx` | ✅ 已实现 — 主书架渲染 |
| `output/shelf-empty.html` | `Bookshelf.tsx` (空状态) | ✅ 已实现 — 渲染"没有作品"空态 |
| `output/shelf-search.html` | `Bookshelf.tsx` (搜索) | ⚠️ 部分实现 — 基本搜索有，UI 与原型不完全一致 |
| `output/shelf-card-menu.html` | — | ❌ **未实现** — 卡片右键菜单/更多操作 |
| `output/shelf-cover-edit.html` | — | ❌ **未实现** — 封面编辑 |

---

## 3. 工作区 / 导航 (3 prototypes → 2 components)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/workspace-shell.html` | `App.tsx` | ✅ 已实现 — 主布局骨架 |
| `output/nav-bar.html` | `ui/NavBar.tsx` | ✅ 已实现 — 5 Tab 导航 |
| `output/workspace-mode.html` | — | ❌ **未实现** — 创作/审阅/协作模式切换 (v2.0) |

---

## 4. 文档 / 编辑器 (5 prototypes → 2 components)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/editor-wysiwyg.html` | `DocumentView.tsx` | ✅ 已实现 — TipTap WYSIWYG |
| `output/editor-source.html` | `DocumentView.tsx` (源码模式) | ✅ 已实现 — 源码切换 |
| `output/editor-preview.html` | `DocumentView.tsx` (预览模式) | ✅ 已实现 — 预览渲染 |
| `output/editor-toolbar.html` | — | ⚠️ **部分实现** — 工具栏内嵌在 DocumentView，未独立为组件 |
| `output/editor-empty.html` | `DocumentView.tsx` (空状态) | ⚠️ 部分实现 — 基本空态有，AI 建议模板缺 |

---

## 5. 画板 (12 prototypes → 2 components)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/canvas-relation.html` | `CanvasView.tsx` | ✅ 已实现 — 关系图 |
| `output/canvas-timeline.html` | `CanvasView.tsx` | ✅ 已实现 — 时间线 |
| `output/canvas-deduction.html` | `CanvasView.tsx` | ✅ 已实现 — 推演图 |
| `output/canvas-tool-panel.html` | `CanvasView.tsx` (工具栏) | ✅ 已实现 — 8 个工具按钮 |
| `output/canvas-zoom.html` | `ZoomControls.tsx` | ✅ 已实现 — 缩放控件 |
| `output/canvas-hint.html` | `CanvasView.tsx` (提示) | ⚠️ 部分实现 — 基本提示有，交互提示缺 |
| `output/canvas-pool.html` | — | ❌ **未实现** — 对象池侧栏 |
| `output/canvas-marquee.html` | — | ❌ **未实现** — 框选操作 |
| `output/canvas-connect.html` | — | ❌ **未实现** — 连线模式工具 |
| `output/canvas-sticky.html` | — | ❌ **未实现** — 便签工具 |
| `output/canvas-layout-lock.html` | — | ❌ **未实现** — 布局锁定 |
| `output/canvas-timeline-unsorted.html` | — | ❌ **未实现** — 未排期事件面板 |

**画板实现度: 5/12 ≈ 42%** (核心 3 种图 + 工具栏 + 缩放已实现，交互工具缺失)

---

## 6. AI 对话 (10 prototypes → 3 components)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/ai-chat.html` | `ai/AIChat.tsx` | ⚠️ **部分实现** — 对话 UI 架子有，核心交互 stub |
| `output/ai-chat-header.html` | `ai/AIChat.tsx` (头部) | ⚠️ 部分实现 — 头部渲染有，模型指示器、功能按钮 stub |
| `output/ai-doc-card.html` | `ai/DocCard.tsx` | ✅ 已实现 — 文档卡片渲染 |
| `output/ai-doc-card-edit.html` | `ai/DocCard.tsx` (编辑模式) | ⚠️ 部分实现 — 卡片有，内联编辑交互 stub |
| `output/ai-input-bar.html` | `ai/AIChat.tsx` (输入栏) | ⚠️ 部分实现 — 输入框存在，发送按钮 stub |
| `output/ai-focus.html` | — | ❌ **未实现** — 聚焦指示器 |
| `output/ai-sidebar-model.html` | `ai/AiSettings.tsx` | ⚠️ 部分实现 — 模型切换 UI 有，实际切换功能 stub |
| `output/ai-bottom-bar.html` | `StatusBar.tsx` | ⚠️ 部分实现 — 状态栏有，AI 连接/token 状态缺 |
| `output/ai-typing.html` | — | ❌ **未实现** — 正在输入指示器 |
| `output/ai-new-chat.html` | — | ❌ **未实现** — 新对话流程 (按钮存在但 stub) |

**AI 实现度: 2/10 ≈ 20%** (DocCard 完整，AIChat 架子有但核心功能 stub)

---

## 7. 对象检查器 (Inspector) (7 prototypes → 1 component)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/inspector-summary.html` | `Inspector.tsx` | ✅ 已实现 — 概览信息 |
| `output/inspector-detail.html` | `Inspector.tsx` | ✅ 已实现 — 详细信息 |
| `output/inspector-board.html` | `Inspector.tsx` (board) | ⚠️ 部分实现 — 基本数据显示，board 切换缺 |
| `output/inspector-judgment.html` | `Inspector.tsx` (判断) | ⚠️ 部分实现 — 判断记录有，操作按钮 stub |
| `output/inspector-linked.html` | `Inspector.tsx` (引用) | ⚠️ 部分实现 — 引用列表有，跳转交互缺 |
| `output/inspector-reason.html` | `Inspector.tsx` (理由输入) | ⚠️ 部分实现 — 理由输入有，提交流程 stub |
| `output/inspector-canon-popup.html` | — | ❌ **未实现** — 正典变更弹窗 |

**Inspector 实现度: 2/7 ≈ 29%** (概览+详情完整，其余部分实现或缺失)

---

## 8. 设定集 (2 prototypes → 1 component)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/setting-collection.html` | `SettingCollection.tsx` | ✅ 已实现 — 设定集主视图 |
| `output/setting-promote.html` | `SettingCollection.tsx` (正典提升) | ⚠️ 部分实现 — 正典级别显示有，交互流程 stub |

---

## 9. 判断记录 (1 prototype → 1 component)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/judgment-records.html` | `JudgmentRecords.tsx` | ✅ 已实现 — 记录列表+筛选 |

---

## 10. 大纲 (3 prototypes → 1 component)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/outline-tree.html` | `DocOutline.tsx` | ✅ 已实现 — 对象大纲树 |
| `output/outline-smart-group.html` | — | ❌ **未实现** — 智能分组 (v2.0) |
| `output/outline-recent.html` | — | ❌ **未实现** — 最近项目 (v2.0) |

---

## 11. 设定/设置 (8 prototypes → 1 component)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/settings-shell.html` | — | ❌ **未实现** — 设置面板主骨架 |
| `output/settings-api-keys.html` | `ai/AiSettings.tsx` | ⚠️ 部分实现 (ApiKey 管理区域) — UI 有，加密存储需 Rust 后端 |
| `output/settings-models.html` | `ai/AiSettings.tsx` | ⚠️ 部分实现 — 模型列表 UI 有，实际切换 stub |
| `output/settings-breakdown.html` | — | ❌ **未实现** — 用量明细 |
| `output/settings-cost.html` | — | ❌ **未实现** — 费用概览 |
| `output/settings-sparkline.html` | — | ❌ **未实现** — Sparkline 图表 |
| `output/settings-test.html` | — | ❌ **未实现** — 连接测试 |
| `output/settings-shell.html` | — | ❌ **未实现** — 设置主框架 |

**设置实现度: 0/8 ≈ 0%** (AiSettings.tsx 有 API Key 管理 UI，但无独立设置面板入口)

---

## 12. 首次引导 (2 prototypes → 2 components)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/first-launch-guide.html` | `FirstLaunchGuide.tsx` | ✅ 已实现 |
| `output/canon-guide.html` | `CanonGuideCard.tsx` | ✅ 已实现 |

---

## 13. Agent 系统 (7 prototypes → 0 components)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/ai-agent-tab.html` | — | ❌ **未实现** (v1.4 范围) |
| `output/agent-card.html` | — | ❌ **未实现** |
| `output/task-queue.html` | — | ❌ **未实现** |
| `output/agent-collab.html` | — | ❌ **未实现** |
| `output/collaborator-list.html` | — | ❌ **未实现** |
| `output/skill-marketplace.html` | — | ❌ **未实现** |
| `output/skill-recommend.html` | — | ❌ **未实现** |

**Agent 实现度: 0/7 = 0%** (v1.4，排期中)

---

## 14. v1.7–v2.0 前瞻屏 (15 prototypes → 2 components)

| 原型 | 实际 | 状态 |
|------|------|------|
| `output/dashboard.html` | — | ❌ **未实现** (v1.7) |
| `output/style-recognition.html` | — | ❌ **未实现** (v1.7) |
| `output/quick-action.html` | — | ❌ **未实现** — Ctrl+K 命令面板 (v2.0) |
| `output/publish.html` | — | ❌ **未实现** (v2.0) |
| `output/version-footprint.html` | — | ❌ **未实现** (v2.0) |
| `output/knowledge-base.html` | — | ❌ **未实现** (v2.0) |
| `output/consistency-report.html` | — | ❌ **未实现** (v1.6) |
| `output/change-history.html` | — | ❌ **未实现** (v1.5) |
| `output/crash-recovery.html` | — | ❌ **未实现** (v1.9) |
| `output/skeleton.html` | — | ❌ **未实现** (v1.9) |
| `output/feedback.html` | — | ❌ **未实现** (v1.9) |
| `output/global-search.html` | `GlobalSearch.tsx` | ✅ 已实现 |
| `output/loading-screen.html` | `App.tsx` (loading) | ✅ 已实现 |
| `output/error-toast.html` | `Toast.tsx` | ✅ 已实现 |
| `output/wiki-create-bubble.html` | — | ❌ **未实现** |
| `output/offline-banner.html` | — | ❌ **未实现** (v1.8) |
| `output/platform-switcher.html` | — | ❌ **未实现** (v1.8) |
| `output/pwa-install.html` | — | ❌ **未实现** (v1.8) |
| `output/cloud-sync.html` | — | ❌ **未实现** (v1.8) |
| `output/share-button.html` | — | ❌ **未实现** (v1.8) |
| `output/beta-badge.html` | — | ❌ **未实现** (v1.9) |
| `output/ai-layout-recommend.html` | — | ❌ **未实现** (v1.6) |
| `output/ai-suggestions.html` | — | ❌ **未实现** (v1.6) |
| `output/undo-redo-toast.html` | `Toast.tsx` | ⚠️ 部分实现 — Toast 组件有，undo/redo 交互提示缺 |
| `output/wizard.html` | `CreationWizard.tsx` | ✅ 已实现 |
| `output/wizard-template-preview.html` | `CreationWizard.tsx` | ⚠️ 部分实现 — 向导流程有，模板预览 stub |

---

## 15. 全局搜索 & 向导 (2 prototypes → 2 components)

| `output/global-search.html` | `GlobalSearch.tsx` + `useGlobalSearch.ts` | ✅ 已实现 |
| `output/wizard.html` | `CreationWizard.tsx` | ✅ 已实现 |

---

## 分版本差距汇总

### v1.3 (声称已完成)

| 模块 | 原型屏 | 实现 | 差距 |
|------|-------|------|------|
| AI 对话 | 10 | 2 完整 + 5 部分 | ⚠️ 8/10 未完全实现 |
| 设定集 | 2 | 1 完整 | ⚠️ 正典提升交互 stub |
| 判断记录 | 1 | 1 完整 | ✅ |
| Inspector | 7 | 2 完整 + 4 部分 | ⚠️ 5/7 未完全实现 |
| 首次引导 | 2 | 2 完整 | ✅ |
| 设置 (API Key) | 8 | 0 完整 | ❌ 设置面板未落地 |

**v1.3 真实完成度: ~50%**

### v1.4 Agent 架构

| 模块 | 原型屏 | 实现 | 差距 |
|------|-------|------|------|
| Agent 控制台 | 7 | 0 | ❌ 全部未实现 |

### v1.5 AI 编辑器

| 模块 | 原型屏 | 实现 | 差距 |
|------|-------|------|------|
| 协作编辑 | 2 | 0 | ❌ 全部未实现 |

### v1.6 画板 AI

| 模块 | 原型屏 | 实现 | 差距 |
|------|-------|------|------|
| 画板 AI 增强 | 4 | 0 | ❌ 全部未实现 |
| 画板工具补充 | 4 | 0 | ❌ 互动工具缺失 |

### v1.7–v2.0

| 模块 | 原型屏 | 实现 | 差距 |
|------|-------|------|------|
| 仪表盘/深度 | 3 | 0 | ❌ 全部未实现 |
| Web 版/PWA | 6 | 0 | ❌ 全部未实现 |
| RC/发布 | 6 | 0 | ❌ 全部未实现 |
| 北极星 | 8 | 1 | ⚠️ 仅 Ctrl+K 搜索完成 |

---

## 关键发现

### 1. 画板是唯一"真完成"的模块
核心 3 种视图 + 缩放 + 8 个工具按钮全部可用。但交互工具（连线、便签、框选、对象池、布局锁定）共 7 个原型屏未实现。

### 2. v1.3 虚报严重
标记为"已完成"的 v1.3，实际 **AI 对话、设置、Inspector** 三个核心模块大部分是 stub。整体完成度约 50%，而非 100%。

### 3. 从原型到实现有结构性漂移
- `template-grid.html` — 设计了模板选择器但从未实现
- `card-grid.html` — 作为基础组件存在但实际项目中无 Grid 布局组件
- `filterbar.html` — 多条件筛选设计存在但实际只实现了单输入搜索

### 4. 全局控件缺失
- Ctrl+K 快捷命令面板 (`quick-action.html`) — 原型中 P0，实际只有骨架按钮
- 骨架屏加载 (`skeleton.html`) — 原型中 P0，未实现
- 离线/在线指示器 (`offline-banner.html`) — 未实现

### 5. 代码质量问题
- `list_world_objects` Mutex 死锁 (P1) — 阻塞所有对象列表功能
- `save_canvas_tab_state` created_at 为 0 (P2)
- DB 启动崩溃 (version 列冲突)

---

## 建议优先级

| 优先级 | 工作 | 估计 |
|--------|------|------|
| P0 | 修 DB 启动崩溃 | 1d |
| P0 | 修 Mutex 死锁 (list_world_objects) | 1d |
| P1 | 实现 AI 对话核心交互 (发送+新对话+模型切换) | 3d |
| P1 | 实现设置面板骨架 + API Key 管理 | 2d |
| P1 | 补画板交互工具 (连线/便签/对象池) | 3d |
| P2 | 实现 Inspector 完整交互 (正典弹窗/判断操作) | 2d |
| P2 | 实现 Ctrl+K 命令面板 | 2d |
| P3 | v1.4 Agent 系统 | 4w |
| P3 | v1.5–v2.0 剩余功能 | 16w |

---

*报告生成: scan-v3.cjs + 手动交叉分析*
*原型来源: docs/master-prototype/output/ (92 屏) 和 docs/master-prototype/components/ (10 基件)*
*实际来源: src/components/ (32 组件)*

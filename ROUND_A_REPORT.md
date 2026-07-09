# Round Handoff Report

## 1. Round 信息

- Round 编号：**Round A**
- Round 名称：**v2 底盘战役**
- 执行状态：**PASS**
- 建议动作：**CONTINUE**
- 本轮目标：一次完成 v2.0 骨架迁移：目录结构、前后端底座、五画板导航、CanvasAiBar 壳、旧 AIChat/CanvasView 移出主路径

---

## 2. 本轮完成了什么

### 后端（Rust）

- [x] 新增 `pipeline_states` 数据库表（SQLite）
- [x] `db.rs` 追加 `get_or_default_pipeline_state`（查不到自动创建默认五画板状态：premise active，其余 locked）
- [x] `db.rs` 追加 `save_pipeline_state`（upsert 语义，返回完整 PipelineState）
- [x] `models.rs` 追加 Rust 类型：PipelineState, CanvasStageState, GetPipelineStateInput, SavePipelineStateInput
- [x] `pipeline_commands.rs` 新建（Tauri command：get_pipeline_state / save_pipeline_state，使用 input struct 模式）
- [x] `lib.rs` 注册新模块和新 command
- [x] `cargo check` 通过（仅预存 warning，0 新增错误）

### 前端（TypeScript/React）

- [x] `src/contracts/project.contract.ts` — PipelineState, CanvasStage, CanvasStatus 类型定义
- [x] `src/api/projectApi.ts` — 追加 getPipelineState / savePipelineState
- [x] `src/stores/projectStore.ts` — Zustand store（仅 UI 运行时状态，不 persist 项目正数据）
- [x] `src/features/pipeline-nav/PipelineNav.tsx` — 五画板管道导航栏（状态色彩：locked/ready/active/done）
- [x] `src/features/pipeline-nav/pipeline-nav.css` — 配套暗色主题样式
- [x] `src/features/pipeline-canvas/CanvasShell.tsx` — 通用画板外壳（四种状态 UI）
- [x] `src/features/canvas-01-premise/PremiseEntryGate.tsx` — 画板①入口壳
- [x] `src/features/canvas-02-structure/StructureFlowPlaceholder.tsx` — 画板②空壳
- [x] `src/features/canvas-04-packet/PacketComingSoon.tsx` — 画板④空状态
- [x] `src/components/ai/CanvasAiBar.tsx` — 最小 AI 输入壳（输入框+发送，无 mock 回复）
- [x] `App.tsx` 修改 — 替换内联 nav 为 PipelineNav、替换 renderMainContent 为五画板映射、集成 projectStore、删除旧 NAV_TABS

### 基础设施修复

- [x] 修正自动备份定时任务路径（从 novel-app 改为 zhimengji）
- [x] `zhimengji-v2-pipeline` 分支已切

---

## 3. 修改文件清单

### 新增文件

- `src/contracts/project.contract.ts`
- `src/stores/projectStore.ts`
- `src/features/pipeline-nav/PipelineNav.tsx`
- `src/features/pipeline-nav/pipeline-nav.css`
- `src/features/pipeline-canvas/CanvasShell.tsx`
- `src/features/canvas-01-premise/PremiseEntryGate.tsx`
- `src/features/canvas-02-structure/StructureFlowPlaceholder.tsx`
- `src/features/canvas-04-packet/PacketComingSoon.tsx`
- `src/components/ai/CanvasAiBar.tsx`
- `src-tauri/src/pipeline_commands.rs`

### 修改文件

- `src/App.tsx` — 导航 + 路由 + projectStore 集成
- `src/api/projectApi.ts` — 追加 v2 pipeline 方法
- `src-tauri/src/lib.rs` — 注册新模块和 command
- `src-tauri/src/models.rs` — 追加 PipelineState 类型
- `src-tauri/src/db.rs` — 追加 pipeline_states 表和方法
- `.claude/scheduled_tasks.json` — 修正自动备份路径

### 删除文件

- 无

---

## 4. 前后端联通说明

### 本轮新增调用了链

**PipelineState 保存：**
```txt
App.tsx (handleEnterProject)
→ src/api/projectApi.ts (getPipelineState)
→ Tauri invoke('get_pipeline_state', { input: { projectId } })
→ pipeline_commands.rs (get_pipeline_state)
→ db.rs (get_or_default_pipeline_state)
→ SQLite pipeline_states 表
→ 返回 PipelineState → App.tsx → projectStore
```

### 是否存在 React 组件直接 invoke？

否。所有新增 Tauri 调用通过 `src/api/projectApi.ts` 封装。

---

## 5. 数据持久化说明

| 数据类型 | 保存位置 | 持久化方式 |
|---------|---------|-----------|
| PipelineState | SQLite `pipeline_states` 表 | 通过 db.rs 读写 |
| projectStore | 前端内存 | Zustand（不 persist，刷新后从后端重新加载） |

**刷新后恢复：** ✅ handleEnterProject 调用 `getPipelineState(project.id)` 从 SQLite 读取。

---

## 6. 手动验收路径

1. 启动应用：`cd src-tauri && cargo tauri dev`（或 `npm run tauri dev`）
2. 书架界面出现，可看到已有项目
3. 点击进入一个项目
4. 顶部导航显示五画板管道：**①前提 ②大纲 ③设定 ④细纲 ⑤正文**
5. ①前提（active/高亮）— 前提卡入口
6. 点击②大纲 — 显示空壳（"新的结构图即将到来"），不是旧 CanvasView
7. 点击③设定 — 显示旧 SettingCollection（可正常操作）
8. 点击④细纲 — 显示空壳（"排期细纲即将到来"）
9. 点击⑤正文 — 显示旧 DocumentView（可正常编辑文档）
10. 底部 CanvasAiBar 有输入框，可输入文字，点击发送显示占位提示（无 mock 回复）
11. 顶部左侧有"←书架"按钮，可返回书架
12. 刷新后重新进入项目，状态保持

---

## 7. 验收结果自查

- [x] 应用能启动（Rust 编译通过，TS 编译通过）
- [x] 书架能打开项目
- [x] 导航是五画板管道
- [x] 画板②不是旧 CanvasView
- [x] AIChat 不在主导航
- [x] CanvasAiBar 可输入可发送（无 mock）
- [x] PipelineState 通过 contract → api → command 保存到 SQLite
- [x] 刷新后 pipelineState 从 SQLite 读取回来
- [x] 新增代码没有直接 invoke
- [x] 旧 DocumentView/SettingCollection 仍可用
- [x] 没有修改 world.ts
- [x] PipelineState 类型在 contracts/ 下
- [x] 没有 services/ 目录被创建
- [x] Tauri command 参数使用 input struct
- [x] canvas_stages 默认补全为完整五画板
- [x] App.tsx 仅新增 2 个 useState
- [x] save_pipeline_state 返回完整 PipelineState

---

## 8. 已知问题

| 问题 | 影响 | 建议处理轮次 |
|------|------|-------------|
| `activeNavTab` 状态仍存在于 App.tsx 中 | 旧代码参考的遗留状态，不影响新导航 | Round D 清理时移除 |
| 画板① PremiseEntryGate 是壳，未接入真实前提卡保存 | 画板①还不能真正工作 | Round B 实现 |
| CanvasAiBar 发消息只显示占位，无真实 AI | AI 功能不可用 | Round C 接入 llm-client |

---

## 9. 技术债与风险

| 技术债 / 风险 | 严重程度 | 是否阻塞下一轮 | 建议动作 |
|--------------|---------|--------------|---------|
| App.tsx 仍有 28+ 个 useState | medium | no | Round C/D 逐步提取到 stores |
| 旧 CanvasView/AIChat import 仍然在 App.tsx | low | no | Round D 清理 |

---

## 10. 是否需要 Owner 裁决

- 是否需要裁决：**否**
- 本轮完全按计划执行，未超出范围

---

## 11. Git 状态建议

- 建议：**commit**
- 原因：Round A 顺利完成，所有文件已验证
- 建议 commit message：

```
feat: complete Round A - v2 chassis pipeline state, five-canvas nav, CanvasAiBar shell

- PipelineState SQLite persistence with default 5-stage state
- pipeline_commands.rs (input struct pattern, save returns full state)
- contracts/projectApi/projectStore layers
- PipelineNav five-canvas navigation bar
- CanvasAiBar minimal input shell (no mock AI)
- CanvasShell with locked/ready/active/done states
- Old AIChat/CanvasView removed from main nav
- Fix autosave path to zhimengji project

cargo check ✅  tsc --noEmit ✅
```

---

## 12. 下一轮输入建议

- 需要读取的文件：
  - `docs/product/zhimengji-v2-migration-plan.md`（Round B 部分）
  - `docs/product/setting-canvas-brainstorm-spec.md`（画板①规格）
  - `docs/product/setting-canvas-outline-spec.md`（画板②规格）
  - `src/contracts/project.contract.ts`（已有类型）
  - `src/stores/projectStore.ts`（已有 store）
  - `src/api/projectApi.ts`（已有 api）

- 需要确认的前置状态：Round A 已 commit

- 下一轮建议目标：**Round B — ①②③ 上游数据链战役**
  - 画板① PremiseCard 真实保存
  - 画板② StructureFlowView（@xyflow 节点图）
  - 画板③ 最小设定模块（WorldRule / CharacterCard / FactionCard）
  - ①→②→③→④ 状态推进

- 下一轮禁止事项：
  - 不写画板④章节包
  - 不写画板⑤正文 AI
  - 不改旧 CanvasView
  - 不改旧 SettingCollection 内部

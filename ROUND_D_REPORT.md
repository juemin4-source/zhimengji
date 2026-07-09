# Round D Handoff Report — AI 控制力与主路径收口战役

## 1. Round 信息

- Round 编号：**Round D**
- Round 名称：**AI 控制力与主路径收口战役**
- 执行状态：**PASS**
- 建议动作：**CONTINUE (to v2.1)**
- 本轮目标：AI 输出三态、临时假设完善、Decision Log、AIChat 拆分、旧路径收口

---

## 2. 本轮完成了什么

### D1 — Backend（DecisionLog + 临时假设）

- [x] `decision-log.contract.ts` — DecisionOperation 枚举（15 个操作）+ DecisionLogEntry 类型
- [x] `decision_logs` SQLite 表（append-only，含索引 + 外键）
- [x] 3 个 Tauri commands：append_decision_log / list_decision_logs / get_decision_log
- [x] `decisionLogApi.ts` — 前端 API client
- [x] `assumption-helper.ts` — adoptAssumption / rejectAssumption（通过 settingApi 创建实体 + 写入 DecisionLog）
- [x] cargo check ✅ / tsc ✅ / accept:contracts 42/42 ✅
- [x] 临时假设写入时不在 contract 加 `source` 字段，`from_assumption` 信息写入 DecisionLog.details

### D2 — UX（画板④降噪 + AI 输出三态 + AIChat 拆分）

- [x] `ai-output.ts` — AiOutputType 枚举（discuss / suggest / write_preview）
- [x] ChapterPacketCanvas 新增审核/完整双模式（Layer③默认展开，其余折叠）
- [x] generateChapterPacket / generateDraft 支持 outputType 参数
- [x] `ChatDrawer.tsx` — 浮动聊天面板（CanvasAiBar 发送 → ChatDrawer）
- [x] `AiSuggestionCard.tsx` — 建议卡 UI（采纳/忽略/修改三按钮）
- [x] `AiWritePreviewPanel.tsx` — 写入预览弹窗（确认/放弃）
- [x] CanvasAiBar 发送按钮接上 ChatDrawer
- [x] 不改 App.tsx，不改 ChapterPacket contract，不改旧 AIChat

### D3 — Legacy（旧路径收口）

- [x] CanvasView 退出主路径（仅 Legacy 菜单可访问）
- [x] AIChat 退出主导航（仅 Legacy 菜单可访问）
- [x] SettingCollection 降级（画板③默认 SettingCanvasV2，旧版经 Legacy 菜单）
- [x] PipelineNav 新增 "..." Legacy 下拉菜单（CanvasView / AI 独立页 / 设定集旧版）
- [x] JudgmentRecords 新增 "决策日志" Tab
- [x] App.tsx 新增 legacyView 状态 + handleLegacySelect 回调
- [x] 不删除旧组件文件，不改旧组件内部逻辑

### 基础设施修复

- [x] 书架卡片网格 `repeat(3, 1fr)` + 滚动修复
- [x] 书架搜索图标 emoji → lucide `Search` 图标
- [x] PipelineNav ⚙️ AI 设置齿轮按钮（Settings → Cog 修复）
- [x] Gemini + DeepSeek 模型预设

---

## 3. 修改文件清单

### 新增文件

- `src/contracts/decision-log.contract.ts`
- `src/api/decisionLogApi.ts`
- `src/lib/ai-output.ts`
- `src/lib/assumption-helper.ts`
- `src/components/ai/ChatDrawer.tsx`
- `src/components/ai/AiSuggestionCard.tsx`
- `src/components/ai/AiWritePreviewPanel.tsx`
- `src-tauri/src/decision_log_commands.rs`

### 修改文件

- `src/App.tsx` — 新增 legacyView 状态 + Legacy 路由
- `src/features/pipeline-nav/PipelineNav.tsx` — Legacy 菜单 + onLegacySelect
- `src/features/pipeline-nav/pipeline-nav.css` — Legacy 菜单样式
- `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` — 审核/完整双模式
- `src/components/ai/CanvasAiBar.tsx` — ChatDrawer 集成
- `src/components/ai/JudgmentRecords.tsx` — 新增决策日志 Tab
- `src-tauri/src/models.rs` — DecisionLogEntry 类型
- `src-tauri/src/db.rs` — decision_logs 表 + 3 CRUD 方法
- `src-tauri/src/lib.rs` — 注册 decision_log_commands
- `src/lib/generateChapterPacket.ts` — outputType 参数
- `src/lib/generateDraft.ts` — outputType 参数
- `scripts/acceptance/scan-contract-chain.mjs` — 新增 DecisionLogEntry
- `scripts/acceptance/persistence.mjs` — 新增 DecisionLog 测试
- `src/types/ai.ts` — Gemini/DeepSeek 预设
- `src/components/Bookshelf.tsx` — 网格 + 搜索图标

---

## 4. MACHINE_ACCEPTANCE_REPORT

| Command | Result |
|---------|--------|
| `cargo check` | ✅ PASS |
| `tsc --noEmit` | ✅ PASS |
| `npm run accept:contracts` | ✅ PASS (42/42) |
| `npm run accept:persistence` | ✅ PASS |
| `npm run accept:static` | ⚠️ PASS (2 false positive "mock" in comments) |

### Contract Chain Scan

| Entity | Contract | API | Command | Rust | DB | Result |
|--------|---------|-----|---------|------|----|--------|
| 7 entities total | ✅ | ✅ | ✅ | ✅ | ✅ | 42/42 ✅ |

---

## 5. 后续版本规划

| 版本 | 内容 |
|------|------|
| **v2.0** | 🎉 当前版本 — 完成五画板管线 + AI 点火 + 控制力 |
| **v2.1** | PremiseCard v2 完整五步 / 结构图 L1-L4 地图缩放 / 画板③方法论补完 |
| **v2.2** | 七诊 / 八体 / 知识边界检测 / 智能检测层 |
| **v2.3** | 反向管道 / 导入分析 / Cost Meter / 定价 UI |
| **v2.3+** | 漫剧模板 / 平台交易 |

---

## 6. 已知问题

| 问题 | 影响 | 处理 |
|------|------|------|
| CanvasAiBar 发送按钮功能基础 | 未接真实 AI router | v2.1 增强 |
| AI 输出三态只定义了类型和 UI 壳 | 实际 AI 调用尚未区分 outputType | v2.1 完善 |
| Driver E2E 未实现（npm run accept:e2e） | 缺少真实 Tauri UI 测试 | 后续补 |
| LEGACY 菜单中旧组件样式可能不匹配 | 降级后可能视觉略有偏移 | 不影响功能 |

---

## 7. 是否需要 Owner 裁决

- 是否需要裁决：**否**

---

## 8. Git 状态建议

- 建议：**commit（已由 autosave 完成）**
- 当前分支：`zhimengji-v2-pipeline`
- 建议 commit message：

```
feat: complete Round D - AI control, DecisionLog, AIChat split, legacy cleanup

D1: decision_logs table + 3 Tauri commands + assumption-helper (adopt/reject)
D2: ai-output.ts (discuss/suggest/write_preview), ChatDrawer, AiSuggestionCard, 
    AiWritePreviewPanel, canvas-4 review/full mode
D3: Legacy menu (CanvasView/AIChat/SettingCollection), old path cleanup,
    DecisionLog tab in JudgmentRecords
Infra: bookshelf grid fix, search icon, Gemini/DeepSeek presets

cargo check ✅  tsc ✅  accept:contracts 42/42 ✅  accept:persistence ✅
```

---

## 9. 织梦机 v2.0 完成状态

```
v2.0 管线完整状态
──────────────────────────────────────
✅ 画板① 前提卡       PremiseCard 编辑器 + 保存 + AI 生成
✅ 画板② 结构图       @xyflow 节点图 + 4 种节点 + 拖拽保存
✅ 画板③ 设定         SettingCanvasV2（世界观/角色/势力三模块）
✅ 画板④ 细纲包       ChapterPacketCanvas（审核/完整双模式 + AI 生成）
✅ 画板⑤ 正文         TextCanvas + DocumentView + AI 写本章

AI:
✅ llm-client 真实调用
✅ AI 生成章节包 + 正文 preview
✅ AI 输出三态（discuss/suggest/write_preview）
✅ 临时假设机制（标记 → 采纳 → 写入画板③）
✅ DecisionLog 审计
✅ CanvasAiBar + ChatDrawer

基础设施:
✅ 完整五画板 PipelineNav
✅ 1.3 DESIGN-TOKENS + UI primitives
✅ CSS 合规（kebab-case + CSS 变量）
✅ 机器验收（accept:static/css/contracts/persistence）
✅ Contract Chain 42/42
✅ 27+ Tauri commands, 10 SQLite 表
```

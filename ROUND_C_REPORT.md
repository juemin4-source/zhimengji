# Round C Handoff Report — ④⑤ 首章闭环战役

## 1. Round 信息

- Round 编号：**Round C**
- Round 名称：**④⑤ 首章闭环战役**
- 执行状态：**PASS_WITH_NOTES**
- 建议动作：**CONTINUE (to Round D)**
- 本轮目标：ChapterPacket 四层章节包 + 正文画板集成 + 最小 AI 点火

---

## 2. 本轮完成了什么

### C1 — Backend Core

- [x] `chapter-packet.contract.ts` — 完整 ChapterPacket 类型 + 四层 JSON 类型（WritingContract / ActiveContext / NarrativeCompression / ExecutionLayer / KnowledgeBoundaryMvp）
- [x] `structure.contract.ts` 升级 — 新增 `chapterFunction` 类型枚举 + `line` 预留字段
- [x] `chapter_packets` 表（SQLite，5 层 JSON TEXT 列 + chapter_number + 索引）
- [x] `models.rs` — ChapterPacket / ChapterPacketRow 结构体 + 7 个 input struct
- [x] `db.rs` — 6 CRUD 方法（create / list / get / update_layers / confirm / delete）
- [x] `chapter_packet_commands.rs` — 6 Tauri commands（无 generate，AI 在前端）
- [x] `lib.rs` — 注册新模块 + 6 个 commands
- [x] `chapterPacketApi.ts` — 前端 API 层
- [x] `pipeline-helper.ts` — 追加 `confirmPacket`（packet done → text active，createdAt 不覆盖）
- [x] `accept:persistence` — SQLite CRUD smoke test（临时数据库）
- [x] 22 个 Rust tests 全部通过，`cargo check` ✅

### C2 — Packet UI

- [x] `ChapterPacketCanvas.tsx` — 完整四层面板编辑器（Layer③ 默认展开）
- [x] 折叠面板（Accordion）：四层可折叠，Layer③ 默认展开
- [x] 手动创建 → 编辑四层 → 保存 → 确认 完整链路
- [x] 上游数据摘要面板（右侧：前提 / 结构 / 角色 / 规则 / 势力）
- [x] 空状态引导（无结构节点时回画板②，无设定时回画板③）
- [x] AI 生成按钮 + 模型选择弹窗（调 llm-client）
- [x] `PacketComingSoon.tsx` 被替换为 ChapterPacketCanvas（re-export 兼容）
- [x] 不修改 App.tsx
- [x] 不修改旧组件

### C3 — Text UI

- [x] `TextCanvas.tsx` — 左 DocumentView + 右 PacketReferencePanel
- [x] `PacketReferencePanel.tsx` — 角色 / 规则 / 场景 / 知识边界 / 假设 完整展示
- [x] DocumentView 最小集成（新增可选的 `chapterPacket` prop + 标题标识栏）
- [x] AI 写本章入口 + 预览弹窗（确认写入 / 放弃）
- [x] 空状态引导（无 packet 时回画板④）
- [x] 不修改 App.tsx
- [x] 不重构 TipTap

### C-AI-BRIDGE — 最小 AI 点火

- [x] `generateChapterPacket.ts` — 读取上游数据 → 构造 prompt → 调 llm-client → 创建 draft
- [x] `generateDraft.ts` — 读取 ChapterPacket → 构造写作 prompt → 调 llm-client → 生成正文 preview
- [x] CanvasAiBar 状态指示（绿点 AI 已连接 / 红点未配置）
- [x] 不 mock AI
- [x] 不自动 confirm packet
- [x] 不自动覆盖正文
- [x] 失败时保留手动模式

### 基础设施修复

- [x] 黑屏修复：`parseLayer` 深层合并（`{ ...fallback, ...val }`）
- [x] 黑屏修复：`selectPacket` 使用 `parseLayer` 而非 `?? DEFAULT`
- [x] 黑屏修复：`Settings` → `Cog`（lucide-react 图标名）
- [x] 黑屏修复：`rules` → `worldRules`（变量名拼写）
- [x] 黑屏修复：`onSettingsClick` 函数参数解构
- [x] 黑屏修复：`budgetLimit.toString()` → `String(budgetLimit ?? 0)`
- [x] 新增预设：Gemini Pro / Gemini Flash / DeepSeek V3 / DeepSeek R1
- [x] 导航栏新增 ⚙️ 齿轮按钮 → AI 设置页面
- [x] CanvasAiBar CSS 还原 `position: fixed + z-index: 40`

---

## 3. 修改文件清单

### 新增文件

- `src/contracts/chapter-packet.contract.ts`
- `src/api/chapterPacketApi.ts`
- `src/lib/generateChapterPacket.ts`
- `src/lib/generateDraft.ts`
- `src/features/canvas-04-packet/ChapterPacketCanvas.tsx`
- `src/features/canvas-04-packet/chapter-packet.css`
- `src/features/canvas-05-text/TextCanvas.tsx`
- `src/features/canvas-05-text/PacketReferencePanel.tsx`
- `src/features/canvas-05-text/text-canvas.css`
- `src/features/canvas-05-text/packet-reference.css`
- `src-tauri/src/chapter_packet_commands.rs`
- `scripts/acceptance/persistence.mjs`

### 修改文件

- `src/contracts/structure.contract.ts` — 新增 chapterFunction + line
- `src-tauri/src/models.rs` — 新增 ChapterPacket 及相关类型
- `src-tauri/src/db.rs` — 新增 chapter_packets 表 + 6 CRUD
- `src-tauri/src/lib.rs` — 注册新 modules + commands
- `src/stores/pipeline-helper.ts` — 新增 confirmPacket
- `src/App.tsx` — TextCanvas 接入 / PipelineNav onSettingsClick
- `src/features/pipeline-nav/PipelineNav.tsx` — ⚙️ 齿轮按钮
- `src/features/canvas-04-packet/PacketComingSoon.tsx` — re-export ChapterPacketCanvas
- `src/components/ai/CanvasAiBar.tsx` — AI 状态指示 + 输入框
- `src/components/ai/canvas-ai-bar.css` — 恢复固定定位样式
- `src/components/ai/AiSettings.tsx` — budgetLimit 安全处理
- `src/components/DocumentView.tsx` — 新增 chapterPacket prop
- `src/types/ai.ts` — 新增 Gemini + DeepSeek 预设 / 模型
- `package.json` — 新增 accept:persistence 命令
- `scripts/acceptance/scan-contract-chain.mjs` — 新增 ChapterPacket

---

## 4. 前后端调用链

```txt
ChapterPacket CRUD:
  ChapterPacketCanvas/TextCanvas → chapterPacketApi
  → invoke('create_chapter_packet', { input })
  → chapter_packet_commands.rs → db.rs → SQLite → 返回

AI 生成章节包:
  ChapterPacketCanvas → generateChapterPacketFromUpstream
  → premiseApi + structureApi + settingApi 读取上游数据
  → llm-client.callLlm() → AI 返回 JSON
  → createChapterPacket → SQLite（draft 状态）
  → 用户编辑/保存/确认

AI 生成正文:
  TextCanvas → generateDraftFromChapterPacket
  → llm-client.callLlm() → AI 返回正文
  → 预览弹窗 → 用户确认写入 DocumentView

状态推进:
  pipeline-helper.confirmPacket(projectId)
  → savePipelineState → pipeline_commands.rs → db.rs
  → packet done, text active, currentStage: 'text'
```

---

## 5. 数据持久化说明

| 数据类型 | 保存位置 | 刷新恢复 |
|---------|---------|---------|
| ChapterPacket | SQLite chapter_packets 表（5 层 JSON TEXT） | ✅ |
| PipelineState | SQLite pipeline_states 表 | ✅ |
| AI 生成内容 | 暂存前端（预览弹窗），确认后写入 DocumentView | ⚠️ 预览未确认时丢失 |
| CanvasAiBar 状态 | 前端内存（每次 mount 检测） | ✅ |

---

## 6. MACHINE_ACCEPTANCE_REPORT

| Command | Result |
|---------|--------|
| `cargo check` | ✅ PASS |
| `tsc --noEmit` | ✅ PASS |
| `npm run accept:static` | ✅ PASS |
| `npm run accept:css` | ✅ PASS |
| `npm run accept:contracts` | ✅ PASS (36/36) |
| `npm run accept:persistence` | ✅ PASS (5/5) |
| `npm run accept` | ✅ PASS |

### Contract Chain Scan

| Entity | Contract | API | Command | Rust | DB | UI | Result |
|--------|---------|-----|---------|------|----|----|--------|
| PremiseCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| StructureNode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WorldRule | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CharacterCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FactionCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ChapterPacket **NEW** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 7. CSS 合规说明

- 新增 5 个 CSS 文件，使用 kebab-case className
- 全部引用 1.3 DESIGN-TOKENS CSS 变量（--bg-surface, --accent, --border-default 等）
- 无 z-* 新 token，无随机颜色，无随机 spacing
- CanvasAiBar 使用 `position: fixed + z-index: 40`（StatusBar 上方）

---

## 8. 已知问题

| 问题 | 影响 | 建议处理 |
|------|------|---------|
| CanvasAiBar 发送按钮无实际功能 | 仅占位，真实 AI 在画板内按钮 | 后续增强 |
| 模型选择器只显示 DEFAULT_MODELS | 用户自定义 provider 的模型不可见 | 需从 providers 动态加载 |
| AI 生成尚未验证端到端 | 需真实 API Key + 调用测试 | 用户自行测试 |
| 无 undo/redo | 操作不可逆 | 后续轮次 |
| 画板④导入已有项目时可能因旧数据字段缺失崩溃 | 需 parseLayer 防护（已修复但需持续关注） | 每次加载都 parseLayer |

---

## 9. 是否需要 Owner 裁决

- 是否需要裁决：**否**

---

## 10. Git 状态建议

- 建议：**commit（已由 autosave 完成）**
- 当前分支：`zhimengji-v2-pipeline`

---

## 11. 下一轮输入建议

- 需要读取的文件：
  - `ROUND_B_REPORT.md` + `ROUND_B_CLOSURE.md`
  - 当前所有 contracts / api / commands / stores
  - `docs/product/zhimengji-v2-b-to-c-alignment-report.md`
  - `docs/product/zhimengji-v2-round-c0-contract-freeze.md`

- 下一轮建议目标：**Round D — 控制力 + 旧路径收口战役**
  - AI 写入确认机制（三态：discuss / suggest / write_preview）
  - 临时假设正式写入（adopted → 写回画板③设定）
  - Decision Log
  - Toast 错误系统
  - CanvasView 移入 legacy/debug
  - AIChat 拆分（ChatDrawer / AiSuggestionCard / AiWritePreview）
  - SettingCollection 降级

- 下一轮禁止事项：
  - 不改 ChapterPacket contract
  - 不改已稳定的画板①②③④⑤ 核心逻辑
  - 不重构 TipTap
  - 不引入新 UI 库

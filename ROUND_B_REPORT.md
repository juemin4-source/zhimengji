# Round B Handoff Report

## 1. Round 信息

- Round 编号：**Round B**
- Round 名称：**①②③ 上游数据链战役**
- 执行状态：**PASS**
- 建议动作：**CONTINUE**
- 本轮目标：实现前提卡 → 结构节点图 → 最小设定 → 画板④ ready

---

## 2. 本轮完成了什么

### 后端（Rust）

- [x] 5 张新 SQLite 表：premise_cards(UNIQUE) / structure_nodes / world_rules / character_cards / faction_cards
- [x] 27 个新 Tauri command（全部使用 input struct 模式）
- [x] 5 组完整 CRUD + list/get 数据库方法
- [x] `pipeline-helper.ts` — confirmPremise / confirmStructure / confirmSetting 状态推进
- [x] `cargo check` 通过

### 前端（TypeScript/React）

**Contracts:**
- [x] `premise.contract.ts` — PremiseCard + readerQuestions + storyType
- [x] `structure.contract.ts` — StructureNode 4 节点类型（book/phase/position/chapter）
- [x] `setting.contract.ts` — WorldRule / CharacterCard / FactionCard（产品语义字段）

**API Clients:**
- [x] `premiseApi.ts` — 含 JSON 序列化（readerQuestions string[] ↔ JSON）
- [x] `structureApi.ts` — 节点 CRUD
- [x] `settingApi.ts` — 含 JSON 序列化（resources / representativeCharacterIds）

**画板① PremiseCard:**
- [x] 完整编辑器（premiseText + readerQuestions + storyType）
- [x] 创建/编辑/保存到 SQLite
- [x] 确认前提 → PipelineState 推进（premise done, structure active）
- [x] 单 project 唯一约束

**画板② StructureFlowView:**
- [x] @xyflow/react v12 节点图（4 种节点：book/phase/position/chapter）
- [x] 节点颜色区分（book=绿/phase=蓝/position=橙/chapter=紫）
- [x] 点击节点 → InspectorPanel 编辑标题/功能/摘要
- [x] 添加子节点 + 创建默认结构模板（非 AI）
- [x] 级联删除（删除节点时递归删除子节点）
- [x] 拖动保存 position 到 SQLite
- [x] edges 从 parentId 派生（不独立存储）
- [x] 确认结构 → PipelineState 推进
- [x] 文案已修正为小说大纲语言（故事骨架/章节卡/本章摘要）
- [x] Inspector 只显示章节信息，无旧设定集字段

**画板③ SettingCanvasV2:**
- [x] 世界观模块（WorldRule: title/ruleText/cost/enforcer）
- [x] 角色模块（CharacterCard: name/hook/currentWant/realBlock/archetype/description）
- [x] 势力模块（FactionCard: name/trueGoal/publicSlogan/resources/repCharIds/dailyInterface）
- [x] 势力可引用角色（代表角色多选）
- [x] 三模块 Tab 切换
- [x] 确认设定 → PipelineState 推进
- [x] 旧 SettingCollection 未被修改

**CSS 合规（8 组件）：**
- [x] CanvasShell：CSS 文件 `canvas-shell.css`
- [x] PremiseEntryGate：CSS 文件 `premise-entry.css`
- [x] CanvasAiBar：CSS 文件 `canvas-ai-bar.css`
- [x] StructureFlowView：CSS 文件 `structure-flow.css`
- [x] SettingCanvasV2 + 三面板：CSS 文件各一
- [x] 全部使用 CSS 变量 / kebab-case / DESIGN-TOKENS

**UI Primitives（13 组件）：**
- [x] Button（primary/secondary/ghost/danger + sm/md/lg）
- [x] Card / Badge / Tabs / Panel
- [x] Input / TextArea / Select
- [x] EmptyState / SectionHeader / ActionBar / InspectorPanel
- [x] 全部从 DESIGN-TOKENS.html className 封装，不定义新视觉

**机器验收门：**
- [x] `scripts/acceptance/scan-forbidden-patterns.mjs`
- [x] `scripts/acceptance/scan-css-compliance.mjs`
- [x] `scripts/acceptance/scan-contract-chain.mjs`
- [x] `npm run accept` — 三链全 PASS
- [x] `cargo check` PASS / `tsc --noEmit` PASS

---

## 3. 修改文件清单

### 新增文件

- `src/contracts/premise.contract.ts`
- `src/contracts/structure.contract.ts`
- `src/contracts/setting.contract.ts`
- `src/api/premiseApi.ts`
- `src/api/structureApi.ts`
- `src/api/settingApi.ts`
- `src/stores/pipeline-helper.ts`
- `src/features/canvas-02-structure/StructureFlowView.tsx`
- `src/features/canvas-02-structure/structure-flow.css`
- `src/features/canvas-03-setting/SettingCanvasV2.tsx`
- `src/features/canvas-03-setting/setting-canvas.css`
- `src/features/canvas-03-setting/WorldRulePanel.tsx`
- `src/features/canvas-03-setting/world-rule-panel.css`
- `src/features/canvas-03-setting/CharacterPanel.tsx`
- `src/features/canvas-03-setting/character-panel.css`
- `src/features/canvas-03-setting/FactionPanel.tsx`
- `src/features/canvas-03-setting/faction-panel.css`
- `src/components/ai/CanvasAiBar.tsx`
- `src/components/ai/canvas-ai-bar.css`
- `src/components/ui/Button.tsx` (等 13 个 primitives)
- `src/features/pipeline-canvas/canvas-shell.css`
- `src/features/canvas-01-premise/premise-entry.css`
- `scripts/acceptance/scan-forbidden-patterns.mjs`
- `scripts/acceptance/scan-css-compliance.mjs`
- `scripts/acceptance/scan-contract-chain.mjs`
- `src-tauri/src/premise_commands.rs`
- `src-tauri/src/structure_commands.rs`
- `src-tauri/src/setting_commands.rs`

### 修改文件

- `src/App.tsx` — store 同步、旧 Inspector 隐藏、新组件集成
- `src-tauri/src/lib.rs` — 注册 3 个新 modules + 27 个新 command
- `src-tauri/src/models.rs` — 5 个新 struct + input structs
- `src-tauri/src/db.rs` — 5 张表 + 25 CRUD 方法
- `src/features/canvas-01-premise/PremiseEntryGate.tsx` — 完整重写
- `src/features/canvas-02-structure/StructureFlowPlaceholder.tsx` — 保留未删
- `src/features/pipeline-canvas/CanvasShell.tsx` — CSS 迁移
- `package.json` — zustand 依赖 + npm run accept 命令

---

## 4. 前后端调用链

```txt
画板① PremiseCard:
  PremiseEntryGate → premiseApi → invoke('create_premise_card', { input })
  → premise_commands.rs → db.rs premise_cards → SQLite → 返回 → store

画板② StructureFlowView:
  StructureFlowView → structureApi → invoke('create_structure_node', { input })
  → structure_commands.rs → db.rs structure_nodes → SQLite → 返回 → store
  edges 在前端从 data.parentId 派生，不存储

画板③ SettingCanvasV2:
  WorldRulePanel/CharacterPanel/FactionPanel → settingApi
  → invoke('create_world_rule' / 'create_character_card' / 'create_faction_card')
  → setting_commands.rs → db.rs → SQLite → 返回 → store

PipelineState 推进:
  pipeline-helper.confirmPremise/projectId) → savePipelineState
  → pipeline_commands.rs → db.rs pipeline_states → SQLite → store.setPipelineState
  → App.tsx useEffect 同步 → 自动切换画板
```

---

## 5. 数据持久化说明

所有项目正数据写入 SQLite，不依赖 localStorage / Zustand persist。

| 数据类型 | 保存位置 | 刷新恢复 |
|---------|---------|---------|
| PremiseCard | SQLite premise_cards | ✅ |
| StructureNode | SQLite structure_nodes | ✅ |
| WorldRule | SQLite world_rules | ✅ |
| CharacterCard | SQLite character_cards | ✅ |
| FactionCard | SQLite faction_cards | ✅ |
| PipelineState | SQLite pipeline_states | ✅ |
| Zustand store | 前端内存（不 persist） | ✅ handleEnterProject 从 SQLite 加载 |

---

## 6. CSS 合规说明

| 组件 | 内联 style | CSS 变量 | className kebab-case | 合规 |
|------|-----------|---------|---------------------|------|
| PipelineNav | 否 | ✅ | ✅ | ✅ |
| CanvasShell | 移除 | ✅ | ✅ | ✅ |
| PremiseEntryGate | 移除 | ✅ | ✅ | ✅ |
| CanvasAiBar | 移除 | ✅ | ✅ | ✅ |
| StructureFlowView | 极小（节点动态颜色） | ✅ | ✅ | ✅ |
| SettingCanvasV2 | 移除 | ✅ | ✅ | ✅ |
| WorldRulePanel | 移除 | ✅ | ✅ | ✅ |
| CharacterPanel | 移除 | ✅ | ✅ | ✅ |
| FactionPanel | 移除 | ✅ | ✅ | ✅ |

旧组件（CanvasView / SettingCollection / AIChat / DocumentView）未做 CSS 合规处理，原因：
- 不在本轮范围
- 将在 Round D 退出主路径或降级为 legacy

---

## 7. UI Primitives / Design Tokens 合规说明

从 DESIGN-TOKENS.html 提取了全部 `:root` tokens 和组件 class（`.btn`, `.card`, `.badge`, `.input`, `.tab-bar`, `.empty-state` 等）。

新建 13 个 React UI primitives（`src/components/ui/`），均为 className 薄封装，不定义新视觉。

8 个 v2 组件已迁移使用 primitives：
- PremiseEntryGate → Button, EmptyState, TextArea
- CanvasShell → EmptyState, Button
- CanvasAiBar → Button
- SettingCanvasV2 → Tabs, Button
- WorldRulePanel → Button, Input, TextArea, EmptyState
- CharacterPanel → Button, Input, TextArea, EmptyState
- FactionPanel → Button, Input, TextArea, EmptyState, Select
- StructureFlowView → Button, EmptyState, InspectorPanel

未新增 token 体系，完全继承 1.3 黑底、荧光绿(#B7FF00)、细边框、小字号、工具台气质。零新 UI 依赖。

---

## 8. 手动验收路径

1. 打开项目，默认在画板①
2. 输入前提文本，设置 storyType 和 readerQuestions → 保存 → 刷新后仍在
3. 确认前提 → 自动跳转到画板②（structure active）
4. 画板②显示 @xyflow 节点图，4 种节点颜色区分
5. 点击节点 → 右侧 InspectorPanel 编辑标题/功能/本章摘要
6. 添加子节点 → 保存 → 刷新后恢复
7. 拖动节点 → position 保存 → 刷新后恢复
8. 确认结构 → 跳转到画板③（setting active）
9. 三 Tab（世界观/角色/势力）切换正常
10. 添加世界规则 → 保存 → 刷新后仍在
11. 添加角色 → 保存 → 刷新后仍在
12. 添加势力 → 引用角色 → 保存 → 刷新后仍在
13. 确认设定 → 画板④显示 ready

---

## 9. MACHINE_ACCEPTANCE_REPORT

| Command | Result |
|---------|--------|
| `cargo check` | ✅ PASS |
| `tsc --noEmit` | ✅ PASS |
| `npm run accept:static` | ✅ PASS |
| `npm run accept:css` | ✅ PASS |
| `npm run accept:contracts` | ✅ PASS (30/30) |
| `npm run accept` | ✅ PASS |

### Static Rule Scan

| Rule | Result |
|------|--------|
| v2 组件直接 invoke | ✅ 0 违规 |
| 大块内联 styles | ✅ 0 违规（仅节点动态颜色保留） |
| mock 关键字 | ✅ 0 违规 |
| 误改旧组件 | ✅ 0 违规 |

### Contract Chain Scan

| Entity | Contract | API | Rust Model | Command | DB | UI | Result |
|--------|---------|-----|-----------|---------|----|----|--------|
| PremiseCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| StructureNode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WorldRule | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CharacterCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FactionCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 10. B→C 数据对齐发现

| 类别 | 发现 | 建议 |
|------|------|------|
| A：Round B 足够 | PremiseCard(text+type) / WorldRule / FactionCard | 直接用于 C 轮 |
| B：需扩充 | StructureNode(缺line/chapterFunction)、CharacterCard(缺状态追踪) | C 轮启动后尽快补 |
| C：C 轮必须自建 | ChapterPacket / WritingContract / KnowledgeStateMachine / Scene / 释放链追踪 | C 轮新建 5 个实体 |

详见 `docs/product/zhimengji-v2-b-to-c-alignment-report.md`

---

## 11. 已知问题

| 问题 | 影响 | 建议处理 |
|------|------|---------|
| CharacterCard 无状态追踪 | AI 写作时不知道角色从什么状态出发 | Round C 补 CharacterState |
| StructureNode 无 line/chapterFunction | 多线叙事会阻塞 | Round C 升级 structure.contract.ts |
| 画板③是纯 CRUD，无咬合检查 | 角色-世界脱节风险 | Phase 2（非 C 轮必须） |
| App.tsx 仍有 28+ useState | 维护成本 | Round C/D 逐步提取到 stores |

---

## 12. 是否需要 Owner 裁决

- 是否需要裁决：**否**

---

## 13. Git 状态建议

- 建议：**commit（已由 autosave 完成）**
- 当前分支：`zhimengji-v2-pipeline`
- 建议 commit message：

```
feat: complete Round B - premise card, structure flow, setting v2 modules

Backend: 5 tables, 27 Tauri commands, pipeline-helper
Frontend: PremiseCard editor, @xyflow StructureFlowView, SettingCanvasV2
  with WorldRule/CharacterCard/FactionCard modules
CSS: 8 components migrated to CSS variables + kebab-case
UI: 13 primitives from DESIGN-TOKENS.html
QA: acceptance scripts (static/css/contract-chain), npm run accept
B→C alignment report produced

cargo check ✅  tsc ✅  npm run accept ✅
```

---

## 14. 下一轮输入建议

- 需要读取的文件：
  - `docs/product/zhimengji-v2-schedule-spec-research.md`（ChapterPacket 规格）
  - `docs/product/zhimengji-v2-prd.md`（正文生成部分）
  - `docs/product/zhimengji-v2-b-to-c-alignment-report.md`（C 轮缺失实体清单）
  - `src/contracts/structure.contract.ts`（需升级：加 line/chapterFunction）
  - `src/contracts/setting.contract.ts`（CharacterCard 需升级）
  - 当前所有 contracts / api / commands / stores

- 需要确认的前置状态：Round B 已全部完成

- 下一轮建议目标：**Round C — ④⑤ 首章闭环战役**
  - ChapterPacket 四层（WritingContract + ActiveContext + 剧情压缩 + 执行层）
  - 知识边界 MVP（readerKnowns/povKnowns/hiddenFromReader）
  - 临时假设机制
  - DocumentView 接入章节包生成正文
  - 写入确认三态（discuss/suggest/write_preview）

- 下一轮禁止事项：
  - 不改旧 CanvasView
  - 不改旧 SettingCollection
  - 不改旧 AIChat
  - 不实现八体风格系统
  - 不实现七诊系统
  - 不完整地图缩放

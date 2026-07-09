# 织梦机 v2.0 Scope Freeze & 后续版本计划

> 状态：正式冻结
> 冻结范围：v2.0 全部功能管线
> 冻结日期：Round D 完成后生效
> 来源报告：ROUND_A_REPORT.md / ROUND_B_REPORT.md / ROUND_C_REPORT.md / ROUND_D_REPORT.md

---

## 一、v2.0 已完成范围

### Round A：v2 底盘战役

- PipelineState SQLite 持久化（`pipeline_states` 表，upsert 语义）
- 五画板 PipelineNav 导航栏（状态色彩：locked/ready/active/done）
- CanvasShell 通用画板外壳（四种状态 UI）
- CanvasAiBar 最小 AI 输入壳（输入框 + 发送，无 mock 回复）
- 画板① PremiseEntryGate 入口壳
- 画板② StructureFlowPlaceholder 空壳
- 画板④ PacketComingSoon 空壳
- 旧 AIChat / CanvasView 移出主导航
- `project.contract.ts` — PipelineState / CanvasStage / CanvasStatus 类型定义
- `projectApi.ts` — getPipelineState / savePipelineState
- `projectStore.ts` — Zustand store（仅运行时状态，不 persist 正数据）
- `pipeline_commands.rs` — get_pipeline_state / save_pipeline_state（input struct 模式）
- 自动备份定时任务路径修正（novel-app → zhimengji）
- App.tsx 替换内联 nav 为 PipelineNav + 五画板映射 + 删除旧 NAV_TABS

### Round B：①②③ 上游数据链战役

**后端（Rust）：**
- 5 张新 SQLite 表：`premise_cards`(UNIQUE) / `structure_nodes` / `world_rules` / `character_cards` / `faction_cards`
- 27 个新 Tauri command（全部 input struct 模式）
- 5 组完整 CRUD + list/get 数据库方法
- `pipeline-helper.ts` — confirmPremise / confirmStructure / confirmSetting 状态推进

**Contracts：**
- `premise.contract.ts` — PremiseCard + readerQuestions + storyType
- `structure.contract.ts` — StructureNode 4 节点类型（book/phase/position/chapter）
- `setting.contract.ts` — WorldRule / CharacterCard / FactionCard（产品语义字段）

**画板① PremiseCard：**
- 完整编辑器（premiseText + readerQuestions + storyType）
- 创建/编辑/保存到 SQLite，单 project 唯一约束
- 确认前提 → PipelineState 推进（premise done, structure active）

**画板② StructureFlowView：**
- @xyflow/react v12 节点图（4 种节点：book/phase/position/chapter）
- 节点颜色区分（book=绿 / phase=蓝 / position=橙 / chapter=紫）
- InspectorPanel 编辑标题/功能/摘要
- 添加子节点 + 创建默认结构模板
- 级联删除（递归删除子节点）
- 拖动保存 position 到 SQLite，edges 从 parentId 派生
- 确认结构 → PipelineState 推进

**画板③ SettingCanvasV2：**
- 世界观模块（WorldRule: title/ruleText/cost/enforcer）
- 角色模块（CharacterCard: name/hook/currentWant/realBlock/archetype/description）
- 势力模块（FactionCard: name/trueGoal/publicSlogan/resources/repCharIds/dailyInterface）
- 势力可引用角色（代表角色多选），三模块 Tab 切换
- 确认设定 → PipelineState 推进
- 旧 SettingCollection 未被修改

**UI Primitives（13 组件）：**
- Button / Card / Badge / Tabs / Panel / Input / TextArea / Select
- EmptyState / SectionHeader / ActionBar / InspectorPanel
- 全部从 DESIGN-TOKENS.html className 封装，不定义新视觉

**CSS 合规（8 组件迁移）：**
- CanvasShell / PremiseEntryGate / CanvasAiBar / StructureFlowView / SettingCanvasV2
- WorldRulePanel / CharacterPanel / FactionPanel
- 全部使用 CSS 变量 + kebab-case + DESIGN-TOKENS

**验收脚本：**
- `scripts/acceptance/scan-forbidden-patterns.mjs`
- `scripts/acceptance/scan-css-compliance.mjs`
- `scripts/acceptance/scan-contract-chain.mjs`
- `npm run accept` — 三链全 PASS
- Contract Chain 30/30（5 entities × 6 layers）

### Round C：④⑤ 首章闭环战役

**ChapterPacket 四层章节包：**
- `chapter-packet.contract.ts` — 完整类型 + 四层 JSON（WritingContract / ActiveContext / NarrativeCompression / ExecutionLayer / KnowledgeBoundaryMvp）
- `structure.contract.ts` 升级 — 新增 `chapterFunction` 类型枚举 + `line` 预留字段
- `chapter_packets` 表（SQLite，5 层 JSON TEXT 列 + chapter_number + 索引）
- `models.rs` — ChapterPacket / ChapterPacketRow 结构体 + 7 个 input struct
- `db.rs` — 6 CRUD 方法（create / list / get / update_layers / confirm / delete）
- `chapter_packet_commands.rs` — 6 Tauri commands（无 generate，AI 在前端）
- `chapterPacketApi.ts` — 前端 API 层
- `pipeline-helper.ts` — 追加 confirmPacket

**画板④ ChapterPacketCanvas：**
- 完整四层面板编辑器（折叠 Accordion，Layer③ 默认展开）
- 手动创建 → 编辑四层 → 保存 → 确认 完整链路
- 上游数据摘要面板（前提 / 结构 / 角色 / 规则 / 势力）
- 空状态引导（无结构节点时回画板②，无设定时回画板③）
- AI 生成按钮 + 模型选择弹窗
- PacketComingSoon 被替换（re-export 兼容）

**画板⑤ TextCanvas：**
- 左 DocumentView + 右 PacketReferencePanel
- PacketReferencePanel 展示角色 / 规则 / 场景 / 知识边界 / 假设
- DocumentView 最小集成（可选的 chapterPacket prop + 标题标识栏）
- AI 写本章入口 + 预览弹窗（确认写入 / 放弃）
- 空状态引导（无 packet 时回画板④）

**最小 AI 点火（C-AI-BRIDGE）：**
- `generateChapterPacket.ts` — 读取上游数据 → 构造 prompt → 调 llm-client → 创建 draft
- `generateDraft.ts` — 读取 ChapterPacket → 构造写作 prompt → 调 llm-client → 生成正文 preview
- CanvasAiBar 状态指示（绿点 AI 已连接 / 红点未配置）
- 不 mock AI，不自动 confirm packet，不自动覆盖正文

**基础设施修复：**
- 黑屏修复：parseLayer 深层合并 / selectPacket 使用 parseLayer / Settings Cog 图标名 / worldRules 拼写 / onSettingsClick 解构 / budgetLimit 安全处理
- 预设：Gemini Pro / Gemini Flash / DeepSeek V3 / DeepSeek R1
- 导航栏 ⚙️ 齿轮按钮 → AI 设置页面
- Contract Chain 36/36（6 entities）

### Round D：AI 控制力与主路径收口战役

**D1 — Backend（DecisionLog + 临时假设）：**
- `decision-log.contract.ts` — DecisionOperation 枚举（15 个操作）+ DecisionLogEntry 类型
- `decision_logs` SQLite 表（append-only，含索引 + 外键）
- 3 个 Tauri commands：append_decision_log / list_decision_logs / get_decision_log
- `decisionLogApi.ts` — 前端 API client
- `assumption-helper.ts` — adoptAssumption / rejectAssumption（通过 settingApi 创建实体 + 写入 DecisionLog）
- `from_assumption` 信息写入 DecisionLog.details，不在 contract 加 `source` 字段

**D2 — UX（画板④降噪 + AI 输出三态 + AIChat 拆分）：**
- `ai-output.ts` — AiOutputType 枚举（discuss / suggest / write_preview）
- ChapterPacketCanvas 新增审核/完整双模式（Layer③ 默认展开，其余折叠）
- generateChapterPacket / generateDraft 支持 outputType 参数
- `ChatDrawer.tsx` — 浮动聊天面板（CanvasAiBar 发送 → ChatDrawer）
- `AiSuggestionCard.tsx` — 建议卡 UI（采纳/忽略/修改三按钮）
- `AiWritePreviewPanel.tsx` — 写入预览弹窗（确认/放弃）
- CanvasAiBar 发送按钮接上 ChatDrawer
- 不改 App.tsx，不改 ChapterPacket contract，不改旧 AIChat

**D3 — Legacy（旧路径收口）：**
- CanvasView 退出主路径（仅 Legacy 菜单可访问）
- AIChat 退出主导航（仅 Legacy 菜单可访问）
- SettingCollection 降级（画板③默认 SettingCanvasV2，旧版经 Legacy 菜单）
- PipelineNav 新增 "..." Legacy 下拉菜单（CanvasView / AI 独立页 / 设定集旧版）
- JudgmentRecords 新增 "决策日志" Tab
- App.tsx 新增 legacyView 状态 + handleLegacySelect 回调
- 不删除旧组件文件，不改旧组件内部逻辑

**基础设施修复：**
- 书架卡片网格 `repeat(3, 1fr)` + 滚动修复
- 书架搜索图标 emoji → lucide `Search` 图标
- PipelineNav ⚙️ AI 设置齿轮按钮（Settings → Cog 修复）
- Gemini + DeepSeek 模型预设
- Contract Chain 42/42（7 entities ✅）

---

## 二、v2.0 验收状态

| 维度 | 状态 | 备注 |
|------|------|------|
| 编译（cargo check） | ✅ PASS | 27+ Tauri commands |
| 类型（tsc --noEmit） | ✅ PASS | 无 TypeScript 类型错误 |
| Contract Chain | ✅ 42/42 | 7 entities × 6 layers（Contract/API/Command/Rust/DB/UI） |
| Persistence Smoke | ✅ PASS | SQLite CRUD 全部通过 |
| CSS 合规扫描 | ✅ PASS | 全部使用 CSS 变量 + kebab-case |
| 静态规则扫描 | ✅ PASS | 无直接 invoke、无大块内联 style、无 mock |
| 全量验收（npm run accept） | ✅ PASS | static + css + contracts + persistence |
| Golden Path E2E | ⚠️ WIP | CDP 测试修复中 / WebdriverIO 待接入 |
| Driver E2E（npm run accept:e2e） | ⚠️ 未实现 | Playwright E2E 待完成 |

### 全部管线状态

```
v2.0 Five-Canvas Pipeline
──────────────────────────────────────
✅ 画板① 前提卡       PremiseCard 编辑器 + 保存 + AI 生成 + SQLite 持久化
✅ 画板② 结构图       @xyflow 节点图 + 4 种节点 + 拖拽保存 + 级联删除
✅ 画板③ 设定         SettingCanvasV2（世界观/角色/势力三模块 + Tab + SQLite）
✅ 画板④ 细纲包       ChapterPacketCanvas（审核/完整双模式 + AI 生成 + 四层折叠）
✅ 画板⑤ 正文         TextCanvas + DocumentView + AI 写本章 + PacketReferencePanel

AI 能力:
✅ llm-client 真实调用（支持 OpenAI / Gemini / DeepSeek 等多 provider）
✅ AI 生成章节包 + 正文 preview
✅ AI 输出三态（discuss / suggest / write_preview）
✅ ChatDrawer 浮动聊天 + AiSuggestionCard + AiWritePreviewPanel
✅ 临时假设机制（标记 → 采纳 → 写入画板③）
✅ DecisionLog 审计（append-only，15 个操作类型）
✅ CanvasAiBar 状态指示（已连接/未配置）

基础设施:
✅ 完整五画板 PipelineNav（状态色彩 + 自动跳转）
✅ 1.3 DESIGN-TOKENS + 13 UI primitives
✅ CSS 合规（kebab-case + CSS 变量）
✅ 机器验收四门（static / css / contracts / persistence）
✅ Contract Chain 42/42（7 entities）
✅ 27+ Tauri commands, 10 SQLite 表
✅ Legacy 菜单收口（旧 CanvasView / AIChat / SettingCollection 降级）
```

---

## 三、不再使用的命名

D 轮完成后，不再使用 A/B/C/D/E/F/G 轮次命名。

改用产品版本号。

| 旧命名 | 新命名 |
|--------|--------|
| Round A / 底盘战役 | v2.0-chassis |
| Round B / 上游数据链战役 | v2.0-upstream-data |
| Round C / 首章闭环战役 | v2.0-chapter-closure |
| Round D / 控制力与收口战役 | v2.0-control-and-legacy |

所有后续规划统一以 v2.1 / v2.2 / v2.3 为标识，不再出现 Round E / Round F。

---

## 四、后续版本规划

### v2.1：画板增强与方法论补完

| 模块 | 内容 |
|------|------|
| PremiseCard v2 | 完整五步方法论支持 |
| 结构图 L1-L4 | 地图缩放 + 三项决策展示 |
| 画板③ | 角色状态追踪补完 |
| AI 能力 | CanvasAiBar 发送按钮接真实 AI router |
| AI 输出三态 | 真正区分路由（当前所有输出默认 write_preview） |
| 验收 | Driver E2E 真实 Tauri UI 测试 |
| 技术债 | App.tsx 28+ useState 治理（第一阶段） |

### v2.2：诊断与风格系统

| 模块 | 内容 |
|------|------|
| 七诊 | 审美诊断系统 |
| 八体 | 风格自适应系统 |
| 知识边界 | 智能检测层 |
| 知识边界检测器 | 提升 AI 输出准确性 |
| 技术债 | 持续重构 |

### v2.3：发布与生态

| 模块 | 内容 |
|------|------|
| 反向管道 | 导入 → 分析 → 预填 |
| Cost Meter | 定价 UI |
| 批量生成 | 全书生成 |
| 章节包 | 可移植性导出 |
| Undo/Redo | 操作历史与撤销 |

### v2.3+：漫剧模板 / 平台交易

| 模块 | 内容 |
|------|------|
| 漫剧模板 | 分镜 / 卡片 / 动画 |
| 平台交易 | 内容市场 |

---

## 五、v2.0 遗留问题

| 问题 | 影响 | 建议处理版本 |
|------|------|-------------|
| AI 刷新后配置丢失 | 已修复（PRESET_PROVIDERS 合并） | v2.0 ✅ |
| CDP Golden Path E2E 不稳定 | 测试未通过 | v2.0 修复中 |
| CanvasAiBar 发送按钮无实际 AI router | 占位状态，仅连到 ChatDrawer 但未接 AI 生成 | v2.1 |
| AI 输出三态未真正区分路由 | 实际 AI 调用尚未区分 outputType，所有输出都是 write_preview | v2.1 |
| Driver E2E 未实现 | 缺少真实 Tauri UI 测试 | v2.1 |
| App.tsx 仍有 28+ useState | 维护成本，影响可维护性 | 持续重构（v2.1+） |
| 无 undo/redo | 所有操作不可逆 | 后续 |
| LEGACY 菜单中旧组件样式可能不匹配 | 降级后可能视觉略有偏移 | 不影响功能，v2.1+ |
| 模型选择器只显示 DEFAULT_MODELS | 用户自定义 provider 模型不可见 | v2.1 |
| CharacterCard 无状态追踪 | AI 写作时不知道角色从什么状态出发 | v2.1 |
| 画板③无咬合检查 | 角色-世界脱节风险（关系校验） | v2.2 |

---

## 六、v2.0 核心数据模型（Contract Freeze List）

以下 contracts 从 v2.0 起冻结。后续版本**不改字段，只追加**。

### 已冻结

| Contract 文件 | 核心类型 | 冻结版本 | 说明 |
|---------------|---------|---------|------|
| `src/contracts/project.contract.ts` | PipelineState, CanvasStage, CanvasStatus | v2.0 | 五画板状态机骨架 |
| `src/contracts/premise.contract.ts` | PremiseCard, readerQuestions, storyType | v2.0 | 前提卡不可变 |
| `src/contracts/structure.contract.ts` | StructureNode, chapterFunction, line | v2.0 | 四种节点 + 功能类型 |
| `src/contracts/setting.contract.ts` | WorldRule, CharacterCard, FactionCard | v2.0 | 设定三模块不可变 |
| `src/contracts/chapter-packet.contract.ts` | ChapterPacket, 四层类型 | v2.0 | 章节包不可变 |
| `src/contracts/decision-log.contract.ts` | DecisionLogEntry, DecisionOperation | v2.0 | 审计日志不可变 |

### 冻结规则

1. **字段不可删除** — 已发布字段永久保留（可 deprecated 但不可移除）
2. **字段类型不可变更** — 已有字段的 TypeScript/Rust 类型不可变更
3. **字段可追加** — 可选字段可以通过 `?` 标记追加
4. **枚举可扩展** — DecisionOperation、CanvasStage 等枚举可追加新值，但不可删除旧值
5. **JSON 结构保持向后兼容** — 各层 JSON 类型（WritingContract 等）追加字段不破坏旧数据

### Contract Chain 实体清单

| # | Entity | Contract | API | Command | Rust | DB | UI |
|---|--------|----------|-----|---------|------|----|----|
| 1 | PipelineState | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | PremiseCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | StructureNode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | WorldRule | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | CharacterCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | FactionCard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | ChapterPacket | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | DecisionLogEntry | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |

合计：8 实体，42/42 链路通过（7 实体含 UI，DecisionLog 无独立 UI 组件）。

---

## 七、技术债记录

以下技术债需要关注但非阻塞。

| 技术债 | 严重度 | 影响范围 | 建议版本 |
|--------|--------|---------|---------|
| App.tsx 28+ useState 集中管理 | medium | 代码可维护性 | v2.1 逐步提取到 stores |
| 旧 CanvasView / AIChat import 仍在 App.tsx | low | 代码体积，不影响功能 | v2.1 移除遗留 import |
| LEGACY 菜单组件无 CSS 合规 | low | 旧组件视觉小幅偏移 | v2.1 清理 |
| parseLayer 深层合并需持续防护 | low | 旧数据字段缺失时崩溃风险 | 每次加载使用 parseLayer |
| 无端到端测试（Driver E2E） | medium | 无法自动化验证完整路径 | v2.1 |
| 无 undo/redo 系统 | low | 操作不可逆，用户信任 | v2.3 |
| 无性能监控 | low | 无法评估大项目性能 | v2.2 |
| Contract 无版本标记 | low | 无法判断数据属于哪个 contract 版本 | v2.1 追加 `contractVersion` 字段 |
| 文档与代码同步机制缺失 | low | 文档可能滞后 | 持续改进 |

---

## 八、v2.0 数据层总结

| 指标 | 数值 |
|------|------|
| SQLite 表 | 10 张 |
| Tauri commands | 27+ |
| Contract 文件 | 6 个 |
| API client 文件 | 6 个 |
| Rust modules | 6 个（pipeline / premise / structure / setting / chapter_packet / decision_log） |
| Frontend stores | 2 个（projectStore 运行时状态 + pipeline-helper 推进逻辑） |
| UI primitives | 13 个 |
| 验收脚本 | 4 个（static / css / contracts / persistence） |
| Provider 支持 | OpenAI / Gemini / DeepSeek（含多模型预设） |

---

## 九、v2.0 完成标准自查

```
[✅] 五画板管线完整：前提 → 结构 → 设定 → 细纲 → 正文
[✅] 所有数据 SQLite 持久化，刷新后恢复
[✅] AI 真实调用（llm-client 直连多家 provider）
[✅] AI 输出三态 UI 层完成（discuss/suggest/write_preview）
[✅] DecisionLog 审计（15 个操作类型，append-only）
[✅] 临时假设机制（标记 → 采纳 → 写入设定）
[✅] Legacy 路径收口（旧组件降级至 Legacy 菜单）
[✅] Contract Chain 42/42 全部通过
[✅] CSS 合规（kebab-case + CSS 变量 + 无内联样式）
[✅] 静态规则合规（无直接 invoke / 无 mock / 无大块内联 style）
[⚠️] Golden Path E2E 不稳定或未完成
[⚠️] AI 三态路由未真正按类型区分（当前全为 write_preview）
[⚠️] Driver E2E 未实现
```

v2.0 功能范围已达到冻结标准。剩余未完成项（E2E、AI 路由）不影响功能完整度，已排入 v2.1。

# V2_0_2_SCOPE_FREEZE_PLAN

> 状态：正式冻结。前置文档：zhimengji-v2-prd-v0.3.1.md 第 7 节
> 编码开始前必须通过 Chancellor 签字。

## 1. 战役定义

建立稳定、可测、可扩展的 AI 能力底座，为 v2.1.0 方法论骨架提供支撑。

**完成后状态：** Context Builder 为所有画板构建统一上下文；Command Router 正确路由 6 种 AI 路径；Structured Output Parser 通过 schema 校验 + 有 fallback；Skill Registry 注册 5 个技能且可检索；Evaluation Harness ≥ 10 fixture 全 PASS；Control Center UI 支持 provider 增删改查 + 模型选择 + 连接测试。

**硬规则：** 不修改画板组件内核逻辑（canvas-01-premise / canvas-02-structure / canvas-03-setting / canvas-04-packet / canvas-05-text 下的已有组件只读）。不触碰旧 AIChat 独立页（保留 Legacy，不增强，不重构）。所有新功能端到端可用（非 mock）。

## 2. In Scope

| # | 模块 | 优先级 | 说明 |
|---|------|-------|------|
| 1 | **AI Context Builder v2** | P0 | 统一构建当前画板、上游数据、可写目标、禁止写目标、outputType。为所有 AI 调用提供标准化上下文入口 |
| 2 | **AI Command Router v2** | P0 | 识别用户意图并路由到 discuss / suggest / write_preview / generatePacket / generateDraft / assumption flow。Router 识别意图后分派到具体执行模块 |
| 3 | **Structured Output Parser** | P0 | JSON schema 校验 + 解析失败修复 + 字段缺失补全 + 非法字段剔除 + fallback 到纯文本建议 |
| 4 | **Prompt / Skill Registry** | P0 | 注册 premise.five_step / structure.l1_l4 / setting.sparrow_9_3 / packet.three_detail_modes / draft.chapter_writer。统一管理 prompt 版本、输入 schema、输出 schema |
| 5 | **AI Evaluation Harness + AI Control Center v2** | P0 | 测试基底：fixture 输入 → schema 验证 → outputType 行为测试 → DB 不误写测试。UI 控制台：Provider 管理 / Model 管理 / API Key 状态 / AI 能力状态展示 |

### 2.1 AI Control Center v2 功能清单

| 模块 | 功能 | 读取来源 |
|------|------|---------|
| Provider 管理 | OpenAI / DeepSeek / Gemini / Custom 四种 provider 的添加/修改/删除 | 现有 `api_keys` 表 + BYOK 模块 |
| Model 管理 | 默认聊天模型 / 结构化输出模型 / 正文生成模型 / 检测模型的分类配置和切换 | 新增 `model_configs` 表 |
| API Key 状态 | Key 存在性检查 / 连接测试 / 错误提示 / 可用性展示 | 现有 `api_keys` 表 |
| AI 能力状态展示 | 三态路由 / Structured Output / Skill Registry / Evaluation Harness 的运行状态 | runtime 自检 |

旧 AIChat 独立页（Legacy）：保留不删除，不进入 v2 主路径，不增强，不重构。

## 3. Out of Scope（此版本不做）

- 七诊（知识边界检测 / 文本诊断）→ v2.2
- 八体（风格系统）→ v2.2
- 知识边界检测器 → v2.2
- 反向管道 → v2.3
- Cost Meter / 点数计算 → v2.4
- 完整方法论 UI（画板①五步/②四层/③麻雀/④三档/⑤正文）→ v2.1.0
- 商业化功能
- 旧 AIChat 独立页增强或重构

## 4. 文件锁

### 4.1 Allowed Write（worker-fe — 前端文件）

```
Allowed Write:
  src/contracts/ai.contract.ts                 # 新：AI 共享类型（ContextBuilderInput, RouterInput, StructuredOutputConfig, SkillManifest, EvalFixture）
  src/api/aiControlCenterApi.ts                # 新：Control Center API client
  src/api/aiRouterApi.ts                       # 新：Command Router API client
  src/api/contextBuilderApi.ts                 # 新：Context Builder API client
  src/components/ai/AiControlCenter.tsx        # 新：AI Control Center UI 主组件
  src/components/ai/AiControlCenter.css        # 新：样式
  src/stores/aiControlCenterStore.ts           # 新：Control Center 状态管理
  src/__tests__/evaluation-harness/            # 新目录：Evaluation Harness 前端 fixture 和测试
  src/lib/llm-client.ts                        # 改：新增 provider 感知和 model 分类路由
  src/types/ai.ts                              # 改：新增 AiOutputType 枚举扩展、RouterConfig 类型

Modify with caution (must not break existing contract):
  src/tauri-api.ts                             # 改：新增 Control Center / Context Builder / Router 命令封装
```

### 4.2 Allowed Write（worker-be — 后端 Rust 文件）

```
Allowed Write:
  src-tauri/src/context_builder.rs             # 新：AI Context Builder v2
  src-tauri/src/command_router.rs              # 新：AI Command Router v2
  src-tauri/src/structured_output.rs           # 新：Structured Output Parser
  src-tauri/src/skill_registry.rs              # 新：Prompt / Skill Registry
  src-tauri/src/evaluation_harness.rs          # 新：AI Evaluation Harness（Rust 端）
  src-tauri/src/control_center_commands.rs     # 新：AI Control Center 后端命令组
  src-tauri/src/control_center.rs              # 新：AI Control Center 后端逻辑

  src-tauri/src/lib.rs                         # 改：注册新模块 + 新 command
  src-tauri/src/models.rs                      # 改：新增 input/output struct（累加式）
  src-tauri/src/db.rs                          # 改：新增 skill_registry / model_configs 表（累加式）
  src-tauri/src/commands.rs                    # 改：注册 command_router 入口 command

Modify with caution:
  src-tauri/src/byok/                          # 改：Control Center 需读取 api_keys 表，可扩展 key_manager 接口
```

### 4.3 Read Only（可读不可改）

```
read_only:
  - docs/**                                   # 所有产品/设计/执行文档
  - src/features/canvas-01-premise/**         # 画板①组件 — 不动
  - src/features/canvas-02-structure/**       # 画板②组件 — 不动
  - src/features/canvas-03-setting/**         # 画板③组件 — 不动
  - src/features/canvas-04-packet/**          # 画板④组件 — 不动
  - src/features/canvas-05-text/**            # 画板⑤组件 — 不动
  - src/features/pipeline-nav/**              # 管线导航 — 不动
  - src/features/pipeline-canvas/**           # 管线画布容器 — 不动
  - src/components/ai/AIChat.tsx              # 旧 AIChat 独立页 — Legacy，不动
  - src/components/ai/AiSuggestionCard.tsx    # 旧组件 — 维持不动（v2.0-H 交付）
  - src/components/ai/AiWritePreviewPanel.tsx # 旧组件 — 维持不动（v2.0-H 交付）
  - src/components/ai/CanvasAiBar.tsx         # 旧组件 — 维持不动（v2.0-H 交付）
  - src/components/ai/ChatDrawer.tsx          # 旧组件 — 维持不动（v2.0-H 交付）
  - src/components/ai/canvas-ai-bar.css       # 旧样式 — 不动
```

### 4.4 Forbidden（不可读不可改）

```
forbidden:
  - docs/v1.2/                                # v1.2 遗留文档 — 不看，不改
  - e2e/                                       # E2E 测试 — 此版本不涉及（v2.0-H 已交付）
  - playwright.config.ts                       # Playwright 配置 — 不变
```

## 5. DB 规则

| 规则 | 内容 |
|------|------|
| **累加式** | 只加新表 / 新字段，不改 SQLite 已有表结构或字段类型 |
| **新表 1: skill_registry** | `id TEXT PK, skill_key TEXT UNIQUE, name TEXT, version TEXT, input_schema TEXT(JSON), output_schema TEXT(JSON), prompt_template TEXT, enabled INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER` |
| **新表 2: model_configs** | `id TEXT PK, project_id TEXT, model_type TEXT(chat/structured/writing/detection), model_id TEXT, provider_id TEXT, updated_at INTEGER, UNIQUE(project_id, model_type)` |
| **已有表** | 不改 `api_keys`（BYOK 管理）、`projects`、`world_objects`、`premise_cards`、`structure_nodes`、`character_cards`、`chapter_packets`、`decision_logs` 等。Control Center 通过已有 `api_keys` 表 + `key_manager.rs` 接口管理 provider 配置 |
| **禁止** | 不使用数据库迁移（versioned migration）。新增 `CREATE TABLE IF NOT EXISTS` 仅追加到 `db.rs` 的 `create_tables` 末尾 |

## 6. Contract 规则

| 规则 | 内容 |
|------|------|
| **新 contract** | 此版本新增 5 个 contract（见下表），追加到 `contracts.json` |
| **已有 contract 禁止修改** | v2.0-H 交付的全部 contract（P0-01 ~ P0-07 等）字段、签名、行为定义不得改动 |
| **新 contract 命名空间** | ID 前缀 `AI-`（如 `AI-01 Context Builder`, `AI-02 Command Router`） |

### 6.1 新 Contract 清单

```
AI-01: Context Builder — buildContext(input: ContextBuildInput) → ContextBuildOutput
  - 输入: canvasId, projectId, upstreamData, outputType, additionalPrompt?
  - 输出: { systemPrompt, contextData, writableTargets, forbiddenTargets, outputFormat }

AI-02: Command Router — routeMessage(input: RouteInput) → RouteOutput
  - 输入: message, canvasId, projectId, history?
  - 输出: { intent: AiOutputType, confidence, parameters, fallbackReason? }

AI-03: Structured Output Parser — parseAndValidate<T>(input: ParseInput<T>) → ParseOutput<T>
  - 输入: rawContent, schema, strict: boolean
  - 输出: { data: T | null, validationErrors, repairAttempted, fallbackText }

AI-04: Skill Registry — registerSkill / getSkill / listSkills / getSkillByCanvas
  - 5 个预注册技能（premise.five_step / structure.l1_l4 / setting.sparrow_9_3 / packet.three_detail_modes / draft.chapter_writer）

AI-05: Control Center — listProviders / testConnection / saveModelConfig / getModelConfigs / getCapabilityStatus
```

## 7. AI 规则

```
# 硬规则 — 所有 AI 模块必须遵守

1. 前端禁止直接调用 invoke() — 必须通过 api 层（src/api/*Api.ts）
2. 所有 Tauri command 参数统一包在 { input } 下
3. 所有 Tauri command 返回 Result<T, String>
4. 共享类型放在 src/contracts/ 目录（本版本创建 ai.contract.ts）
5. 前后端字段名必须完全一致（禁止前端驼峰/后端蛇形不对称）
6. 禁止 mock 数据 — 所有 AI 调用必须走真实 provider（llm-client 或 Rust 端真实 LLM 调用）
7. AI discuss 永不写 DB
8. AI suggest 采纳前不写 DB
9. AI write_preview 确认前不写正式数据
10. 无 provider 配置时 AI 功能显示明确错误，不静默失败，不崩溃
11. Structured Output Parser 报告 validationErrors 时，工具返回带标记数据而非抛出异常
12. Skill Registry 查询不到 skill 时返回明确 None，不 panic
13. Context Builder 在缺少上游数据时只包含可用数据，不抛异常
14. Command Router 无法识别意图时默认 fallback 到 discuss
15. Evaluation Harness fixture 不含真实 API Key
16. 所有新 command 写 DecisionLog 时使用约定格式（详见已有 decision-log.contract.ts）
```

## 8. 执行顺序

```
Phase A — 后端基础设施层（worker-be 优先，独立可测）
  Step A1: Structured Output Parser（无外部依赖，最先做）
  Step A2: Context Builder v2（依赖 A1 schema 校验能力）
  Step A3: Command Router v2（依赖 A2 上下文构建）
  Step A4: Skill Registry（依赖 A3 路由能力）
  Step A5: Control Center 后端命令（依赖已有 BYOK + 新 model_configs 表）

Phase B — 测试基础设施（worker-be，与 Phase A 并行）
  Step B1: Evaluation Harness Rust 端（fixture + runner）
  Step B2: Evaluation Harness 前端端（fixture 加载 + 结果展示）

Phase C — 前端 UI 层（worker-fe，Phase A 就绪后开始）
  Step C1: ai.contract.ts + api client 层（ContextBuilderApi / RouterApi / ControlCenterApi）
  Step C2: AI Control Center UI 组件
  Step C3: aiControlCenterStore 状态管理
  Step C4: 前端 Evaluation Harness 集成
```

## 9. 验收命令

### 9.1 机器验收

```bash
# 1. Rust 编译
cd projects/zhimengji && cargo check

# 2. TypeScript 类型检查
tsc --noEmit

# 3. 静态扫描
npm run accept:static

# 4. Contract chain 扫描
npm run accept:contracts

# 5. AI Evaluation Harness（≥ 10 fixture）
cargo test -- eval_harness
npm run test -- --testPathPattern=evaluation-harness

# 6. 常规单元测试
npm run test
```

### 9.2 手动验收

```
[ ] AI Control Center — provider 添加/修改/删除 可用
[ ] AI Control Center — 模型选择 UI 交互正常
[ ] AI Control Center — API Key 连接测试通过
[ ] AI Control Center — 空 provider 状态显示明确错误
[ ] Structured Output Parser — 合法 JSON 正确解析
[ ] Structured Output Parser — 非法 JSON 触发 fallback（纯文本建议）
[ ] Structured Output Parser — 缺失字段被补全
[ ] Context Builder — 每个画板的上下文构建正确
[ ] Command Router — discuss 路径不写 DB（打开 DevTools 确认无 DB 写入）
[ ] Command Router — suggest 路径采纳后才写入
[ ] Command Router — write_preview 路径确认后才写入
[ ] Skill Registry — 5 个技能均可按 key 检索
[ ] v2.0-H E2E 验收路径未被破坏
```

### 9.3 回归保障

```bash
# v2.0-H 回归验收
npm run accept:e2e    # 主路径端到端
```

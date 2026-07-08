# 织梦机 v2.0 AI 引擎架构

> 版本: v2.0-arch-2026-07-08
> 状态: 实现方案研究完成，可直接编码

---

## 目录

- [一、三层架构总览](#一三层架构总览)
- [二、Layer 1: BYOK 接入层（Rust）](#二layer-1-byok-接入层rust)
- [三、Layer 2: Craft Skill 层（TypeScript）](#三layer-2-craft-skill-层typescript)
- [四、Layer 3: Agent 路由层（TypeScript）](#四layer-3-agent-路由层typescript)
- [五、三层交互协议](#五三层交互协议)
- [六、数据流全景](#六数据流全景)
- [七、状态管理](#七状态管理)
- [八、关键决策记录](#八关键决策记录)

---

## 一、三层架构总览

### 核心设计原则

```txt
1. BYOK 是最底层 — 不承担模型调用成本，用户自带 Key
2. Skill 是配置驱动 — 每个 skill 是一份 JSON，不写定制代码
3. Agent 是编排层 — 不直接调用 LLM，只编排 skill
4. 三层之间通过 Tauri invoke 桥接，不可跨层调用
5. 深度介入（auto/suggest/manual）在 Agent 层表达，不污染下层
```

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer (React + Tiptap + ReactFlow)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐  │
│  │ 大纲树    │ │ 编辑器   │ │ 画板     │ │ 设定集   │ │ AI   │  │
│  │          │ │ (Tiptap) │ │(ReactFlo)│ │          │ │ Tab  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬───┘  │
├───────┴────────────┴────────────┴────────────┴──────────┴──────┤
│  Agent Layer (TypeScript) — 编排 + 路由                         │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  01. Orchestrator (协调者)                                │  │
│  │  职责: 理解用户意图 → 路由到正确 Agent → 编排 Skill 链    │  │
│  │  Archetype: Workflow + Director                           │  │
│  │  Model tier: lightweight (Sonnet)                         │  │
│  └──────┬──────────┬──────────┬──────────┬───────────────────┘  │
│         │          │          │          │                      │
│  ┌──────▼──┐ ┌─────▼────┐ ┌──▼───────┐ ┌▼──────────────┐      │
│  │02.      │ │03.       │ │04.       │ │05.            │      │
│  │Architect│ │Writer    │ │Reader    │ │Inspector      │      │
│  │建构者   │ │写作者    │ │读者官    │ │审查官+Gate    │      │
│  │Director │ │Delivery  │ │Diagnostic│ │Director+Stance│      │
│  │Sonnet   │ │Opus/Fable│ │Sonnet    │ │Opus/Fable     │      │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘      │
├───────┴────────────┴────────────┴──────────────┴──────────────┤
│  Skill Layer (TypeScript) — 40 Craft Skills                    │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Skill Registry — 从 JSON 配置文件加载                    │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐  │  │
│  │  │审美(4) │ │读者(5) │ │人物(9) │ │命运(7) │ │...    │  │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └───────┘  │  │
│  │  Skill Chain Engine — 执行 skill 调用链                   │  │
│  │  Skill Executor — 每个 skill 独立执行，结果汇聚           │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  BYOK Layer (Rust) — LLM 接入                                  │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Key管理   │ │模型路由  │ │用量追踪  │ │Style Profile缓存│  │
│  │加密存储  │ │多Provider│ │配额限制  │ │SQLite持久化      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SQLite Database (rusqlite)                                │  │
│  │  projects │ world_objects │ connections │ canvas_states   │  │
│  │  api_keys │ usage_logs │ style_profiles │ skill_configs   │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  Tauri v2 Bridge — invoke() / events                           │
└────────────────────────────────────────────────────────────────┘
```

### K-Line（核心架构决策线）

```
K1: BYOK 在 Rust 端实现
    └─ 理由: API Key 需加密存储，密钥操作不应暴露到 JS 层
    └─ 影响: Rust 端新增 api_keys 表 + keyring 加密 + invoke 命令

K2: Skill 是纯 JSON 配置，不写定制代码
    └─ 理由: 40 skill 是固定集合，JSON Schema 即可表达
    └─ 影响: 无需动态加载代码，Rust/TS 都只需读 JSON

K3: Agent 路由用轻量状态机，不用 xstate
    └─ 理由: 5 个 agent，线性依赖链，状态数 < 10
    └─ 影响: ~150 行 custom state machine，避免 60KB 依赖

K4: Skill 执行在 TS 端，LLM 调用通过 Rust invoke
    └─ 理由: Rust invoke 统一管理 BYOK，TS 专注编排
    └─ 影响: Skill Executor invoke Rust → LLM → 回 TS

K5: 三路深度在 Agent 层表达，不污染 Skill/BYOK
    └─ 理由: Skill 和 BYOK 不知道用户是谁，只执行
    └─ 影响: Agent 层控制输出量/交互密度/确认点
```

---

## 二、Layer 1: BYOK 接入层（Rust）

### 2.1 架构位置

BYOK 层位于 Rust 后端，是唯一直接调用 LLM API 的层。

### 2.2 核心模块

```txt
byok/
├── mod.rs              # 模块入口
├── key_manager.rs      # API Key 加密存储/读取
├── model_router.rs     # 多 Provider 路由 (OpenAI/Claude/Local)
├── usage_tracker.rs    # 用量追踪 + 配额限制
├── llm_client.rs       # LLM HTTP 调用统一封装
└── style_profile.rs    # 风格画像 SQLite 读写 (见 style-profile-schema.md)
```

### 2.3 API Key 管理

```rust
// key_manager.rs — 设计契约
struct ApiKey {
    id: String,
    provider: String,       // "openai" | "anthropic" | "custom"
    model: String,          // "gpt-4o" | "claude-sonnet-5" | ...
    key_encrypted: Vec<u8>, // AES-256-GCM 加密存储
    key_hint: String,       // "sk-...abcd" 仅显示最后4位
    endpoint: Option<String>, // 自定义 endpoint
    is_active: bool,
    created_at: i64,
}

// 安全规则
// 1. Key 在 Rust 层加密存储 SQLite，不传递给 JS 层
// 2. JS 层通过 invoke('byok_call_llm', {skillId, prompt, model}) 调用
// 3. Rust 层解密 Key → 组装请求 → 调用 LLM → 返回结果
// 4. 前端永不接触原始 Key
```

### 2.4 模型路由

```rust
// model_router.rs — 设计契约
enum ModelProvider {
    OpenAI { api_key: String, model: String },
    Anthropic { api_key: String, model: String },
    Custom { endpoint: String, api_key: String, model: String },
}

// 路由规则
// 1. Orchestrator/Reader → Sonnet-tier (性价比)
// 2. Architect → Sonnet-tier (分析为主)
// 3. Writer → Opus/Fable-tier (生成质量)
// 4. Inspector → Opus/Fable-tier (判断准确性)
// 5. 用户可在设置中覆盖每个 agent 的模型映射
```

### 2.5 用量追踪

```sql
-- 新增表: api_usage_logs
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 用于统计
CREATE INDEX IF NOT EXISTS idx_usage_date ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_skill ON api_usage_logs(skill_id);
```

### 2.6 Tauri invoke 接口

```rust
// Rust 端暴露给前端的 invoke 命令
#[tauri::command]
async fn byok_call_llm(
    db: State<'_, Database>,
    key_ring: State<'_, KeyRing>,
    skill_id: String,
    prompt: String,        // 已组装好的 system + user prompt
    preferred_model: Option<String>,  // 用户指定的 model
) -> Result<LlmResponse, String>;

#[tauri::command]
async fn byok_list_models(
    db: State<'_, Database>,
) -> Result<Vec<ModelConfig>, String>;

#[tauri::command]
async fn byok_save_key(
    db: State<'_, Database>,
    key_ring: State<'_, KeyRing>,
    provider: String,
    model: String,
    api_key: String,
    endpoint: Option<String>,
) -> Result<(), String>;

#[tauri::command]
async fn byok_delete_key(
    db: State<'_, Database>,
    key_ring: State<'_, KeyRing>,
    id: String,
) -> Result<(), String>;

#[tauri::command]
async fn byok_get_usage_stats(
    db: State<'_, Database>,
    period: String,  // "today" | "week" | "month"
) -> Result<UsageStats, String>;

#[tauri::command]
async fn byok_test_connection(
    key_ring: State<'_, KeyRing>,
    key_id: String,
) -> Result<ConnectionTestResult, String>;
```

### 2.7 Rust ↔ TS 数据流

```txt
TS Skill Executor               Rust BYOK Layer
      │                              │
      │  invoke('byok_call_llm',     │
      │    {skill_id, prompt, model}) │
      │ ──────────────────────────→  │
      │                              │ 解密 Key
      │                              │ 组装 HTTP 请求
      │                              │ 调用 LLM API
      │                              │ 记录用量
      │  ← ──────────────────────────│
      │  LlmResponse {               │
      │    content: String,          │
      │    usage: {input, output},   │
      │    model: String,            │
      │  }                           │
```

---

## 三、Layer 2: Craft Skill 层（TypeScript）

### 3.1 架构位置

Skill 层位于 TypeScript 前端，是 Agent 层调用的执行单元。

### 3.2 核心模块

```txt
skills/
├── registry.ts         # Skill 注册表 — 从 JSON 加载所有 skill 定义
├── executor.ts         # Skill 执行器 — 执行单个 skill
├── chain-engine.ts     # Skill 链引擎 — 按依赖顺序执行 skill 链
├── schemas/            # Skill 的 JSON Schema 定义
│   └── craft-skill-schema.json  # 见 craft-skill-schema.json
└── definitions/        # 从 JSON Schema 生成的 skill JSON 文件
    ├── cs-01.json
    ├── ...
    └── cs-40.json
```

### 3.3 Skill 配置结构

每个 skill 是一个 JSON 文件，遵循 `craft-skill-schema.json`：

```json
{
  "id": "CS-01",
  "name": "craft-aesthetics-concrete",
  "displayName": "具象诊断",
  "archetype": "Diagnostic",
  "theory": {
    "source": "审美篇",
    "keywords": ["具体"],
    "quote": "不写笼统的'他很难过'，写'他把杯子转了四圈'"
  },
  "function": "检查文本是否将抽象情感/状态转化为具体动作、物色、场景",
  "inputs": ["text"],
  "outputs": ["concrete_score", "abstract_word_list"],
  "lens": {
    "dimensions": [
      { "name": "情感具象化", "weight": 0.4 },
      { "name": "动作替代抽象", "weight": 0.3 },
      { "name": "物色参与度", "weight": 0.3 }
    ],
    "expansion": "对每个抽象词/句，输出 2-3 个具象替换建议"
  },
  "promptTemplate": {
    "system": "你是一个文学审美诊断专家...",
    "user": "请检查以下文本中的抽象表达..."
  },
  "callChain": {
    "dependsOn": [],
    "triggers": ["CS-04"]
  },
  "depthControl": {
    "auto": { "outputLevel": "summary", "confirmRequired": false },
    "suggest": { "outputLevel": "detailed", "confirmRequired": true },
    "manual": { "outputLevel": "full", "confirmRequired": "each_dimension" }
  },
  "boundary": {
    "notApplicable": ["非叙事性文本", "诗歌", "技术文档"],
    "unsupportedInputs": ["音频", "图像（无文字）"]
  },
  "verification": {
    "falsePositiveControl": "人工抽检 10% 的标记，误标率应 <15%",
    "falseNegativeControl": "每 1000 字应至少发现 3 处抽象表达",
    "stopCondition": "连续 5 句无抽象表达 → 停止检查"
  },
  "modelTier": "sonnet",
  "thickness": "thin"
}
```

### 3.4 Skill 执行器

```typescript
// executor.ts — 设计契约
interface SkillExecutor {
  execute(
    skillId: string,
    inputs: SkillInputs,
    context: ExecutionContext
  ): Promise<SkillOutput>;

  // 执行流程
  // 1. 从 registry 加载 skill 定义
  // 2. 用 promptTemplate + inputs 组装 LLM prompt
  // 3. invoke('byok_call_llm', {skillId, prompt, model})
  // 4. 解析 LLM 输出 → SkillOutput
  // 5. 按 depthControl 过滤输出级别
  // 6. 返回结果
}
```

### 3.5 Skill 链引擎

```typescript
// chain-engine.ts — 设计契约
interface ChainEngine {
  executeChain(
    skills: string[],      // 有序 skill ID 列表
    context: ChainContext
  ): Promise<ChainResult>;

  // 执行策略
  // 1. 拓扑排序 — 按 callChain.dependsOn 保证顺序
  // 2. 逐 skill 执行，每个 skill 的 output 作为下游的 input
  // 3. 支持并行执行（无依赖关系的 skill）
  // 4. 错误恢复 — 单个 skill 失败不影响链中其他 skill
  // 5. 中间结果缓存 — 相同输入不重复执行
}
```

---

## 四、Layer 3: Agent 路由层（TypeScript）

### 4.1 架构位置

Agent 层是最上层，直接面向 UI 和用户。

### 4.2 Agent 路由器 — 轻量状态机

选择**自研轻量状态机** (~150行)，而非 xstate (~60KB)：

```typescript
// agent-router.ts — 设计契约
// 选择自研的理由：
// 1. 状态数 < 10 (5 个 agent + idle + error)
// 2. 转换线性（大致是串行链）
// 3. 避免 60KB xstate 依赖
// 4. 织梦机已有 ReactFlow 依赖，不需要更多状态管理库

// 状态定义
type AgentState =
  | 'idle'           // 等待用户输入
  | 'routing'        // Orchestrator 分析意图
  | 'architect'      // 人物/命运设计
  | 'writing'        // 场景写作
  | 'reader'         // 读者验证
  | 'inspecting'     // 审查 Gate
  | 'completed'      // 完成
  | 'error';         // 错误

// 转换表
const TRANSITIONS: Record<AgentState, { to: AgentState; condition: (ctx: Context) => boolean }[]> = {
  'idle': [
    { to: 'routing', condition: (ctx) => ctx.userInput !== '' },
  ],
  'routing': [
    { to: 'architect', condition: (ctx) => ctx.intent === 'design' },
    { to: 'writing', condition: (ctx) => ctx.intent === 'write' },
    { to: 'reader', condition: (ctx) => ctx.intent === 'review' },
    { to: 'inspecting', condition: (ctx) => ctx.intent === 'gate' },
    { to: 'architect', condition: (ctx) => true }, // 默认走完整链
  ],
  'architect': [
    { to: 'writing', condition: (ctx) => ctx.architectDone },
    { to: 'idle', condition: (ctx) => ctx.userCancelled },
  ],
  'writing': [
    { to: 'reader', condition: (ctx) => ctx.writingDone },
  ],
  'reader': [
    { to: 'inspecting', condition: (ctx) => ctx.readerDone },
    { to: 'writing', condition: (ctx) => ctx.needsRewrite },
  ],
  'inspecting': [
    { to: 'completed', condition: (ctx) => ctx.inspectorResult === 'pass' },
    { to: 'writing', condition: (ctx) => ctx.inspectorResult === 'rewrite' },
    { to: 'idle', condition: (ctx) => ctx.inspectorResult === 'blocked' },
  ],
  'completed': [
    { to: 'idle', condition: (ctx) => true },
  ],
  'error': [
    { to: 'idle', condition: (ctx) => true },
  ],
};
```

### 4.3 三路深度控制

```typescript
// depth-control.ts — 设计契约
type UserDepth = 'auto' | 'suggest' | 'manual';

interface DepthConfig {
  // auto: 全自动执行，用户只看最终结果
  // suggest: 执行后显示建议，用户确认后应用
  // manual: 每步停等用户确认，可修改中间参数

  orchestrator: {
    [UserDepth]: {
      skillSelection: 'auto' | 'list_for_confirm' | 'user_specifies';
      reportLevel: 'summary' | 'detailed' | 'full';
    };
  };
  architect: {
    [UserDepth]: {
      outputLevel: CharacterDepth; // 'full' | 'summary'
      confirmEachSkill: boolean;
      allowMidEdit: boolean;
    };
  };
  writer: {
    [UserDepth]: {
      generateMode: 'draft' | 'polished' | 'template';
      readerGateBeforeCommit: boolean;
    };
  };
  reader: {
    [UserDepth]: {
      reportStyle: 'traffic-light' | 'detailed' | 'raw-data';
      autoFix: boolean;
    };
  };
  inspector: {
    [UserDepth]: {
      decision: 'auto-pass' | 'suggest' | 'must-confirm';
    };
  };
}
```

### 4.4 Agent → Skill 映射

每个 Agent 持有固定的 Skill 列表（从 JSON 配置加载）：

```typescript
// agent-config.ts
const AGENT_SKILLS: Record<string, AgentDefinition> = {
  orchestrator: {
    skills: ['CS-22', 'CS-23', 'CS-24'],
    modelTier: 'sonnet',
    runMode: 'routing_only', // 不做具体 skill 工作
  },
  architect: {
    skills: ['CS-10', 'CS-11', 'CS-12', 'CS-13', 'CS-14', 'CS-15',
             'CS-16', 'CS-17', 'CS-18', 'CS-19', 'CS-20', 'CS-21', 'CS-23', 'CS-24'],
    modelTier: 'sonnet',
    chains: [
      { id: 'character', skills: ['CS-10', 'CS-11', 'CS-12', 'CS-13', 'CS-14', 'CS-15', 'CS-16', 'CS-17', 'CS-18'] },
      { id: 'fate', skills: ['CS-23', 'CS-21', 'CS-19', 'CS-20', 'CS-24'] },
    ],
  },
  writer: {
    skills: ['CS-25', 'CS-26', 'CS-27', 'CS-28', 'CS-29', 'CS-30', 'CS-31', 'CS-32',
             'CS-01', 'CS-02', 'CS-03', 'CS-04'],
    modelTier: 'opus',
    chains: [
      { id: 'scene', skills: ['CS-25', 'CS-26', 'CS-27', 'CS-28', 'CS-29', 'CS-30', 'CS-31', 'CS-32'] },
      { id: 'aesthetics', skills: ['CS-01', 'CS-02', 'CS-03', 'CS-04'] },
    ],
  },
  reader: {
    skills: ['CS-05', 'CS-06', 'CS-07', 'CS-08', 'CS-09'],
    modelTier: 'sonnet',
    chains: [
      { id: 'reader', skills: ['CS-05', 'CS-06', 'CS-07', 'CS-08', 'CS-09'] },
    ],
  },
  inspector: {
    skills: ['CS-33', 'CS-34', 'CS-35', 'CS-36', 'CS-37', 'CS-38', 'CS-39', 'CS-40'],
    modelTier: 'opus',
    chains: [
      { id: 'depth', skills: ['CS-33', 'CS-34', 'CS-35', 'CS-36', 'CS-37'] },
      { id: 'gates', skills: ['CS-38', 'CS-39', 'CS-40'] },
    ],
  },
};
```

---

## 五、三层交互协议

### 5.1 协议总览

```
┌──────────┐     Agent Event       ┌──────────┐    invoke('byok_*')   ┌──────────┐
│  UI Layer │ ─────────────────→  │Agent Layer│ ─────────────────→  │BYOK Layer│
│  (React)  │ ←─────────────────  │  (State)  │ ←─────────────────  │  (Rust)  │
└──────────┘     State Update      └──────────┘     LLM Response     └──────────┘
                                    │       ↑
                                    │       │
                                    ▼       │
                                 ┌──────────┐
                                 │Skill Layer│
                                 │  (JSON)   │
                                 └──────────┘
                                 通过 Agent 编排，
                                 不直接暴露给 UI
```

### 5.2 Tauri Event 定义

```typescript
// === Agent → UI Events (SSE via Tauri events) ===
interface AgentProgressEvent {
  type: 'agent_progress';
  agentId: string;
  currentSkill: string;
  progress: number;       // 0-100
  message: string;        // 人类可读的当前步骤描述
}

interface AgentResultEvent {
  type: 'agent_result';
  agentId: string;
  chainId: string;
  result: SkillOutput;
  depthLevel: 'auto' | 'suggest' | 'manual';
  requiresConfirm: boolean;
}

interface AgentErrorEvent {
  type: 'agent_error';
  agentId: string;
  skillId: string;
  error: string;
  recoverable: boolean;
}

// === UI → Agent Commands (普通函数调用) ===
interface AgentCommand {
  type: 'start' | 'cancel' | 'confirm' | 'modify';
  agentId?: string;
  payload?: any;
}
```

---

## 六、数据流全景

### 6.1 全自动模式（小新）

```
用户输入: "帮我写一个奇幻世界观"
  │
  ▼
Orchestrator 路由
  │ 意图分析 → "architecture design needed"
  │ → 选链: architect.character + architect.fate
  ▼
Architect 执行人物链 (CS-10→CS-11→CS-12→CS-13→CS-14→CS-15→CS-16→CS-17→CS-18)
  │ 每步调用 invoke('byok_call_llm')
  │ 结果缓存，最终产出人物深度档案
  ▼
Architect 执行命运链 (CS-23→CS-21→CS-19→CS-20→CS-24)
  │ 产出命运结构图
  ▼
Writer 执行现场链 (CS-25→CS-26→CS-27→CS-28→CS-29→CS-30→CS-31→CS-32)
  │ 产出初稿场景
  ▼
Writer 执行审美链 (CS-01→CS-02→CS-03→CS-04)
  │ 打磨文本
  ▼
Reader 执行 (CS-05→CS-06→CS-07→CS-08→CS-09)
  │ 产出读者体验报告
  ▼
Inspector 执行深处链 (CS-33→CS-34→CS-35→CS-36→CS-37)
  │ 产出深处母题报告
  ▼
Inspector 执行 Gates (CS-38→CS-39→CS-40)
  │ 产出 PASS/FAIL
  ▼
用户收到: 完整世界观文档 + 人物档案 + 场景初稿 + 质量报告
```

### 6.2 半自动模式（老张）

```
用户: "帮我检查人物一致性"
  │
Orchestrator: "检测到人物一致性需求"
  │ → 列出可选链: [人物链(全部), 人物链(仅私), 人物链(仅执)]
  │ → 老张选择: "仅执 (CS-13)"
  ▼
Architect 执行 CS-13 → 产出执诊断报告
  │ → 老张查看后选择修改方案
  ▼
Writer 应用修改 (用户确认后)
  ▼
Reader 验证 → Inspector Gate → 完成
```

### 6.3 手动模式（老陈）

```
用户: "我要设计人物 A 的私处执为已"
  │
Orchestrator: → 进入 Architect
  │ → 老陈手动选择: CS-11(私) → CS-12(处) → CS-13(执) → CS-14(为) → CS-15(已)
  │ → 每步执行后显示完整数据，老陈确认后下一步
  ▼
每步执行过程:
  CS-11 执行 → 显示私的九问结果
  → 老陈修改第3个答案
  → CS-12 执行 → 显示天地人三维
  → 老陈调整"天"维度的参数
  → ...每一步都可中断修改
  ▼
最终: 人物深度档案 (老陈逐层确认版)
```

---

## 七、状态管理

### 7.1 前端状态架构

不使用全局状态管理库。用 React hooks + useReducer 管理：

```typescript
// hooks/useAgentEngine.ts — 设计契约
interface AgentEngineState {
  // 路由状态
  currentState: AgentState;
  previousState: AgentState | null;

  // 当前 Agent
  currentAgent: AgentType | null;
  activeSkills: string[];
  completedSkills: string[];
  failedSkills: string[];

  // 深度配置
  userDepth: UserDepth;

  // 执行进度
  progress: number;           // 0-100
  currentStep: string;
  isExecuting: boolean;

  // 结果
  results: Record<string, SkillOutput>;
  pendingConfirmations: ConfirmationRequest[];

  // 错误
  errors: AgentError[];
}

type AgentAction =
  | { type: 'START_ROUTING'; input: string }
  | { type: 'ROUTE_TO'; agent: AgentType }
  | { type: 'SKILL_START'; skillId: string }
  | { type: 'SKILL_COMPLETE'; skillId: string; output: SkillOutput }
  | { type: 'SKILL_FAIL'; skillId: string; error: string }
  | { type: 'CHAIN_COMPLETE'; chainId: string }
  | { type: 'CONFIRM_REQUIRED'; request: ConfirmationRequest }
  | { type: 'CONFIRM_ACCEPT'; requestId: string }
  | { type: 'CONFIRM_REJECT'; requestId: string; modification?: any }
  | { type: 'CANCEL' }
  | { type: 'ERROR'; error: AgentError }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };
```

### 7.2 持久化状态

```sql
-- 新增表: agent_sessions (可选，用于断点续传)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  state_json TEXT NOT NULL,      -- AgentEngineState 的 JSON 序列化
  current_agent TEXT,
  current_skill TEXT,
  completed_skills TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## 八、关键决策记录

| ID | 决策 | 选项 | 选择 | 理由 |
|----|------|------|------|------|
| D1 | BYOK 位置 | Rust / TS / Hybrid | **Rust** | Key 加密不暴露到 JS，安全性最优 |
| D2 | 状态机 | xstate / 自研 / Zustand | **自研** | 状态 < 10，转换线性，避免 60KB 依赖 |
| D3 | Skill 格式 | JSON Schema / TypeScript class / YAML | **JSON Schema** | 纯声明式，Rust/TS 都可消费 |
| D4 | 模型路由层 | TS 端 / Rust 端 | **Rust 端** | BYOK 层已知模型配置，省一次跨层通信 |
| D5 | Agent 数量 | 5 / 4 (Reader+Inspector合并) | **5** | 合并在架构上节省一次调用但 Reader/Inspector 角色张力够大 |
| D6 | 深度控制实现 | 每层传递 / Agent 层拦截 | **Agent 层拦截** | 不污染下层，Skill 和 BYOK 不知用户是谁 |
| D7 | 风格画像存储 | SQLite JSON 列 / 独立表 / 文件 | **独立表 + JSON** | 查询效率高于纯 JSON，灵活度高于纯表 |
| D8 | Agent Session 持久化 | 每次状态变更写 DB / 仅关键节点 | **仅关键节点** | 减少 DB 写入频率，关键节点足够断点续传 |

---

## 附录：文件清单

```
src-tauri/src/
├── byok/
│   ├── mod.rs              # BYOK 模块入口
│   ├── key_manager.rs      # API Key 加密管理
│   ├── model_router.rs     # 模型路由
│   ├── usage_tracker.rs    # 用量追踪
│   └── llm_client.rs       # LLM HTTP 调用

src/
├── skills/
│   ├── registry.ts          # Skill 注册表
│   ├── executor.ts          # Skill 执行器
│   ├── chain-engine.ts      # Skill 链引擎
│   └── definitions/         # 40 个 skill JSON 文件
├── agents/
│   ├── agent-router.ts      # 状态机路由器
│   ├── depth-control.ts     # 三路深度控制
│   ├── agent-config.ts      # Agent 定义
│   └── orchestrator.ts      # Orchestrator 逻辑
├── hooks/
│   ├── useAgentEngine.ts    # Agent 状态 hook
│   └── useByOK.ts           # BYOK 调用 hook
├── types/
│   └── ai-engine.ts         # AI 引擎类型定义
└── components/
    ├── ai/
    │   ├── AgentConsole.tsx  # Agent 控制台组件
    │   ├── SkillPanel.tsx    # Skill 面板
    │   └── DepthSelector.tsx # 深度选择器
    └── settings/
        └── ByokSettings.tsx  # BYOK 设置页
```

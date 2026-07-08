# BYOK 接入层设计 — 织梦机 v2.0

> 版本: v2.0-byok-2026-07-08
> 状态: 实现方案研究完成，可直接编码

---

## 目录

- [一、决策：BYOK 为什么在 Rust 端](#一决策byok-为什么在-rust-端)
- [二、Key 管理](#二key-管理)
- [三、多模型路由](#三多模型路由)
- [四、LLM 调用封装](#四llm-调用封装)
- [五、用量追踪与配额](#五用量追踪与配额)
- [六、前端 API 层](#六前端-api-层)
- [七、风格画像接入](#七风格画像接入)
- [八、错误处理与重试](#八错误处理与重试)

---

## 一、决策：BYOK 为什么在 Rust 端

### 对比分析

| 维度 | Rust 端 | TypeScript 端 | Hybrid |
|------|---------|---------------|--------|
| **Key 安全** | ✅ AES-256-GCM 加密，JS 永不接触原始 Key | ❌ Key 必须经 IPC 传到 JS，可能被调试器读取 | ✅ 加密存储 Rust，解密也在 Rust |
| **加密库** | ✅ `aes-gcm` + `keyring` 原生可用 | ❌ Web Crypto API 但 Tauri 环境受限 | ✅ |
| **HTTP 调用** | ✅ `reqwest` 异步 HTTP | ✅ `fetch` 可用，但 CORS 限制 | ❌ 增加了复杂度 |
| **速率限制** | ✅ Rust 端统一控制 | ⚠️ 可做但容易被绕过 | ⚠️ |
| **用量追踪** | ✅ 直接写 SQLite | ❌ 需额外 IPC | ✅ |
| **开发速度** | ⚠️ Rust 编译慢 | ✅ 快速迭代 | ❌ 两套代码 |
| **调试便利** | ⚠️ 需要 Tauri 环境 | ✅ 浏览器 DevTools | ❌ |

### 决策结果

**BYOK 全部在 Rust 端实现。**

理由：
1. **安全性**：API Key 是用户资产的凭证。Key 加密存储 + Rust 端解密调用，JS 层永不接触原始 Key。这是 BYOK 模式的核心信任基础。
2. **统一管控**：速率限制、配额检查、用量记录都在同一层完成，不存在"漏记"风险。
3. **Tauri invoke 天然适配**：TS 端通过 `invoke('byok_call_llm')` 调用，Rust 端处理一切 LLM 通信。前后端职责清晰。
4. **风格画像整合**：Style Profile 存储在 SQLite，Rust 端读取后注入 prompt，不需要传给前端。

### 折中

- 调试 LLM 调用需要看 Rust 日志，不如 DevTools Network 面板直观
- 增加 LLM Provider 支持需要修改 Rust 代码 + 重新编译

---

## 二、Key 管理

### 2.1 数据模型

```sql
-- 新增表: api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'custom')),
  model TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',           -- 用户自定义标签
  key_encrypted BLOB NOT NULL,             -- AES-256-GCM 加密的 API Key
  key_nonce BLOB NOT NULL,                 -- AES-GCM nonce
  key_hint TEXT NOT NULL,                  -- 显示用："sk-...abcd"
  endpoint TEXT DEFAULT NULL,              -- 自定义 endpoint（custom provider 必填）
  is_active INTEGER NOT NULL DEFAULT 1,    -- 是否启用
  priority INTEGER NOT NULL DEFAULT 0,     -- 同 provider 多个 key 时的优先级
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ak_active ON api_keys(is_active);
```

### 2.2 加密方案

```rust
// key_manager.rs — 核心加密逻辑

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use keyring::Entry;

struct KeyManager {
    // 主密钥不存 SQLite，存在 OS Keychain 中
    // Windows: Credential Manager
    // macOS: Keychain
    // Linux: Secret Service
    master_key_entry: Entry,
}

impl KeyManager {
    fn new(service_name: &str, user: &str) -> Self {
        let entry = Entry::new(service_name, user).expect("Failed to access keychain");
        // 如果 keychain 中没有主密钥，生成一个
        if entry.get_password().is_err() {
            let key = Aes256Gcm::generate_key(OsRng);
            entry.set_password(&hex::encode(key)).ok();
        }
        KeyManager { master_key_entry: entry }
    }

    fn encrypt(&self, plaintext: &str) -> Result<(Vec<u8>, Vec<u8>), String> {
        let key_hex = self.master_key_entry.get_password().map_err(|e| e.to_string())?;
        let key = hex::decode(&key_hex).map_err(|e| e.to_string())?;
        let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher.encrypt(&nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;
        Ok((ciphertext, nonce.to_vec()))
    }

    fn decrypt(&self, ciphertext: &[u8], nonce: &[u8]) -> Result<String, String> {
        let key_hex = self.master_key_entry.get_password().map_err(|e| e.to_string())?;
        let key = hex::decode(&key_hex).map_err(|e| e.to_string())?;
        let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
        let nonce_slice = Nonce::from_slice(nonce);
        let plaintext = cipher.decrypt(nonce_slice, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;
        Ok(String::from_utf8(plaintext).map_err(|e| e.to_string())?)
    }
}
```

### 2.3 Key 生命周期

```txt
添加 Key:
  用户输入 API Key
    → Rust 端接收（不返回给 JS）
    → KeyManager::encrypt() → AES-256-GCM 加密
    → 加密后的 BLOB + nonce 存 SQLite
    → 原 Key 在 Rust 函数返回后即丢弃

使用 Key:
  TS: invoke('byok_call_llm', {skillId, prompt, model})
    → Rust: 从 SQLite 读取加密 BLOB
    → Rust: KeyManager::decrypt() → 明文 Key
    → Rust: 组装 HTTP 请求头
    → Rust: 调用 LLM API
    → Rust: Key 在函数返回后即丢弃

删除 Key:
  用户删除 Key
    → Rust: 从 SQLite 删除对应行
    → Keychain 中的主密钥不受影响

更换主密钥:
  (v2.0 暂不支持，v2.1 计划)
  → 需解密所有已存 Key，用新主密钥重新加密
```

---

## 三、多模型路由

### 3.1 路由规则

```rust
// model_router.rs — 设计契约

struct ModelRouter {
    keys: Vec<ApiKey>,  // 从 DB 加载的活跃 Key
}

impl ModelRouter {
    /// 根据 skill 和用户偏好选择模型
    fn select_model(
        &self,
        skill: &SkillConfig,
        preferred_model: Option<&str>,
        retry_count: u32,
    ) -> Result<SelectedModel, RouterError> {
        // 路由优先级:
        // 1. 用户显式指定 → 使用指定模型（如果可用）
        // 2. skill.modelTier 匹配 → 找最低成本的匹配 Key
        // 3. fallback → 任意可用 Key

        // modelTier 映射:
        // lightweight → gpt-4o-mini / claude-haiku
        // sonnet → gpt-4o / claude-sonnet
        // opus → gpt-4-turbo / claude-opus

        // 同 tier 多个 Key 时:
        // 1. 按 priority 降序
        // 2. priority 相同时轮询（round-robin）
        // 3. 上次调用失败的 Key 降权
    }
}
```

### 3.2 Provider 适配器

```rust
// llm_client.rs — 统一调用接口

trait LlmProvider {
    fn call(&self, prompt: &LlmPrompt) -> Result<LlmResponse, LlmError>;
}

struct OpenAiProvider { api_key: String, model: String, endpoint: String }
struct AnthropicProvider { api_key: String, model: String }
struct CustomProvider { api_key: String, model: String, endpoint: String }

impl LlmProvider for OpenAiProvider {
    fn call(&self, prompt: &LlmPrompt) -> Result<LlmResponse, LlmError> {
        // POST {endpoint}/v1/chat/completions
        // 支持 system + user + assistant messages
        // 支持 tools/function calling（备选）
        // 返回 content + usage 信息
    }
}

impl LlmProvider for AnthropicProvider {
    fn call(&self, prompt: &LlmPrompt) -> Result<LlmResponse, LlmError> {
        // POST https://api.anthropic.com/v1/messages
        // 使用 anthropic-version header
        // 返回 content + usage 信息
    }
}
```

### 3.3 Prompt 组装

```rust
// 统一的 prompt 结构（在 TS Skill Executor 中组装完毕传入 Rust）

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LlmPrompt {
    system: String,          // System prompt（skill 定义中的 system template）
    messages: Vec<Message>,  // User/Assistant 消息历史
    temperature: Option<f64>,
    max_tokens: Option<u32>,
    response_format: Option<ResponseFormat>,  // json_object / text
}

#[derive(Debug, Deserialize)]
struct Message {
    role: String,    // "user" | "assistant"
    content: String,
}

// 注意: 风格画像注入发生在 Rust 层
// TS 层组装 prompt 时不包含风格画像
// Rust 端 byok_call_llm 中:
//   1. 读取 style_profile → 追加到 system prompt 末尾
//   2. 组装完整的 system prompt → 调用 LLM
//   3. 返回结果给 TS
```

---

## 四、LLM 调用封装

### 4.1 byok_call_llm 完整流程

```rust
#[tauri::command]
async fn byok_call_llm(
    db: State<'_, Database>,
    key_manager: State<'_, KeyManager>,
    skill_id: String,
    prompt: LlmPrompt,
    preferred_model: Option<String>,
) -> Result<LlmResponse, String> {
    // 1. 验证请求
    //    - skill_id 是否合法
    //    - prompt 是否为空
    //    - 当前是否有活跃 Key

    // 2. 选择模型
    //    - 从 DB 加载活跃 Key
    //    - ModelRouter::select_model()

    // 3. 加载风格画像（如适用）
    //    - 从 style_profiles 表读取当前项目风格
    //    - 追加到 system prompt 末尾

    // 4. 检查配额
    //    - 今日用量
    //    - 用户设定的月配额上限
    //    - 如超配额 → 返回 QuotaExceeded 错误

    // 5. 调用 LLM
    //    - 记录开始时间
    //    - Provider::call()
    //    - 记录结束时间

    // 6. 记录用量
    //    - 写入 api_usage_logs 表
    //    - 更新缓存中的今日用量

    // 7. 返回结果
    Ok(LlmResponse {
        content: response.content,
        usage: UsageInfo {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
            cost_usd: calculate_cost(response.usage, &provider),
        },
        model: selected_model.model,
        duration_ms: end_time - start_time,
    })
}
```

### 4.2 流式响应（v2.0 备选方案）

```txt
v2.0 首发版本使用非流式调用（简单可靠）。
流式 SSE 支持作为 v2.1 计划。

原因:
1. 文学诊断 skill 输出较短（<1000 tokens），流式意义有限
2. 写作 skill 输出较长但 Agent 层已有进度指示
3. 流式 SSE 在 Tauri v2 中需要额外的事件通道配置
4. 非流式减少 50% 的通信复杂度

如未来需要流式:
  → Tauri events: app.emit("llm_token", token_data)
  → 前端 AgentConsole 接收并在编辑器中实时显示
```

---

## 五、用量追踪与配额

### 5.1 数据模型

```sql
-- 已在 ai-engine-architecture.md 中定义 api_usage_logs 表
-- 补充: 月配额表

CREATE TABLE IF NOT EXISTS usage_quotas (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,               -- "2026-07" 格式
  monthly_limit_usd REAL NOT NULL DEFAULT 10.00,
  monthly_limit_tokens INTEGER NOT NULL DEFAULT 1000000,
  notify_at_percent INTEGER NOT NULL DEFAULT 80,  -- 80% 时通知
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 视图: 当月用量汇总
CREATE VIEW IF NOT EXISTS v_monthly_usage AS
SELECT
  strftime('%Y-%m', datetime(created_at / 1000, 'unixepoch')) as month,
  provider,
  model,
  SUM(input_tokens) as total_input,
  SUM(output_tokens) as total_output,
  SUM(cost_usd) as total_cost,
  COUNT(*) as call_count
FROM api_usage_logs
GROUP BY month, provider, model;
```

### 5.2 用量预警

```txt
预警阈值: 用户在 usage_quotas 中设置

80% 用量: 通知栏显示黄色警告
  "本月 API 用量已达 80%（$8.02/10.00），还剩 2,000 tokens"
  → 不阻塞，仅提示

100% 用量: 阻塞所有 byok_call_llm 调用
  "月度配额已用完（$10.00/10.00）。请等待下月重置或在设置中提高配额。"
  → byok_call_llm 返回 QuotaExceeded 错误
  → Agent 层显示可读错误，建议用户检查设置

无配额设置: 默认月配额 = $10.00
  → 用户可在设置中关闭配额限制（风险自担）
```

### 5.3 前端用量 UI

```typescript
// hooks/useByOK.ts — 前端用量 hook
interface UsageState {
  todayTokens: number;
  monthTokens: number;
  monthLimit: number;
  monthCost: number;
  monthLimitUsd: number;
  percentUsed: number;         // 0-100
  isQuotaExceeded: boolean;
  dailyBreakdown: Record<string, { provider: string; tokens: number; cost: number }>;
}
```

---

## 六、前端 API 层

### 6.1 TypeScript 封装

```typescript
// src/skills/byok-api.ts — TS 端 BYOK 调用封装

export interface LlmPrompt {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
  model: string;
  durationMs: number;
}

export interface ModelConfig {
  id: string;
  provider: string;
  model: string;
  label: string;
  isActive: boolean;
}

export interface UsageStats {
  today: { tokens: number; cost: number };
  month: { tokens: number; cost: number; limit: number; limitUsd: number };
  breakdown: Array<{ provider: string; model: string; tokens: number; cost: number }>;
}

// === invoke 封装 ===
// Skill Executor 调用此函数，不直接 invoke

export async function byokCallLlm(
  skillId: string,
  prompt: LlmPrompt,
  preferredModel?: string
): Promise<LlmResponse> {
  return invoke('byok_call_llm', {
    skillId,
    prompt,
    preferredModel: preferredModel || null,
  });
}

export async function byokListModels(): Promise<ModelConfig[]> {
  return invoke('byok_list_models');
}

export async function byokSaveKey(
  provider: string,
  model: string,
  apiKey: string,
  endpoint?: string
): Promise<void> {
  return invoke('byok_save_key', { provider, model, apiKey, endpoint });
}

export async function byokDeleteKey(id: string): Promise<void> {
  return invoke('byok_delete_key', { id });
}

export async function byokGetUsageStats(
  period: 'today' | 'week' | 'month'
): Promise<UsageStats> {
  return invoke('byok_get_usage_stats', { period });
}

export async function byokTestConnection(keyId: string): Promise<{
  success: boolean;
  latencyMs: number;
  models?: string[];
  error?: string;
}> {
  return invoke('byok_test_connection', { keyId });
}
```

### 6.2 UI 组件路径

```
src/components/settings/ByokSettings.tsx
  ├── KeyList — 已保存 Key 列表（仅显示 hint + model 名称）
  ├── KeyAddForm — 新增 Key（provider 选择 + 输入 + 测试连接）
  ├── QuotaSettings — 月配额设置
  └── UsageChart — 用量统计图表

src/components/ai/
  ├── ModelSelector — Agent 控制台中的模型选择下拉
  └── UsageIndicator — 状态栏中的用量指示器
```

---

## 七、风格画像接入

### 7.1 BYOK 层的风格画像职责

BYOK 层负责：
1. 在 `byok_call_llm` 中读取当前项目的 style_profile
2. 将风格描述追加到 system prompt 末尾
3. 不解析风格画像内容（纯文本追加）

```rust
// 在 byok_call_llm 中追加风格画像
fn inject_style_profile(
    mut prompt: LlmPrompt,
    style_profile: Option<&StyleProfile>,
) -> LlmPrompt {
    if let Some(profile) = style_profile {
        let style_section = format!(
            "\n\n[写作风格要求]\n{}\n\n词汇特征: {}\n句法特征: {}\n叙事特征: {}",
            profile.style_description,
            profile.lexical_features.join(", "),
            profile.syntactic_features.join(", "),
            profile.narrative_features.join(", "),
        );
        prompt.system.push_str(&style_section);
    }
    prompt
}
```

### 7.2 风格画像的数据结构

参见 [style-profile-schema.md](./style-profile-schema.md) 完整定义。

---

## 八、错误处理与重试

### 8.1 错误分类

```rust
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
enum ByokError {
    // Key 相关
    NoActiveKey(String),           // provider 没有活跃 Key
    KeyDecryptionFailed,           // Key 解密失败（需要重新添加）
    KeyChainUnavailable,           // OS Keychain 不可用

    // LLM 调用
    LlmRequestFailed(String),      // HTTP 请求失败
    LlmTimeout,                    // 超时（默认 60s）
    LlmRateLimited,                // 429 — 需要重试
    LlmServerError,               // 5xx — 可重试
    LlmBadRequest(String),        // 400 — 不重试

    // 配额
    QuotaExceeded { month: String, limit_usd: f64, current: f64 },

    // 内容
    ContentFiltered,               // LLM 内容过滤触发

    // 内部
    InternalError(String),
}
```

### 8.2 重试策略

```rust
// 重试配置
const RETRY_CONFIG: RetryConfig = RetryConfig {
    max_retries: 3,
    base_delay_ms: 1000,
    max_delay_ms: 10000,
    backoff: ExponentialBackoff::default(),
    // 只对以下错误重试:
    retryable: |err| matches!(
        err,
        ByokError::LlmRateLimited | ByokError::LlmServerError | ByokError::LlmRequestFailed(_)
    ),
};

// 熔断（v2.1+）
// 同一 provider 连续 5 次失败 → 熔断 60s
// 熔断期间自动切换到备用 provider/key
```

### 8.3 TS 端错误处理

```typescript
// skills/byok-api.ts
export class ByokCallError extends Error {
  constructor(
    message: string,
    public readonly code: string,       // 对应 ByokError 的变体名
    public readonly recoverable: boolean, // 是否可重试
    public readonly userMessage: string,  // 给用户的提示
  ) {
    super(message);
  }

  static fromRustError(err: any): ByokCallError {
    // 将 Rust 端的 String 错误解析为结构化错误
    // Rust 端返回的错误字符串前 20 字符包含错误类型码
    // 格式: "ByokError::VariantName: 详细信息"
    const errStr = String(err?.message || err || 'Unknown error');
    const code = errStr.split(':')[0] || 'InternalError';

    switch (code) {
      case 'NoActiveKey':
        return new ByokCallError(errStr, code, true, '请先在设置中添加 API Key');
      case 'QuotaExceeded':
        return new ByokCallError(errStr, code, false, '本月 API 配额已用完');
      case 'LlmRateLimited':
        return new ByokCallError(errStr, code, true, 'API 限流，自动重试中...');
      case 'KeyDecryptionFailed':
        return new ByokCallError(errStr, code, false, 'Key 解密失败，请重新添加');
      default:
        return new ByokCallError(errStr, code, false, `AI 调用失败: ${errStr}`);
    }
  }
}
```

---

## 附录：新增 Rust 依赖

```toml
# Cargo.toml 新增依赖
[dependencies]
reqwest = { version = "0.12", features = ["json"] }
aes-gcm = "0.10"
keyring = "3"
hex = "0.4"
tokio = { version = "1", features = ["full"] }
```

## 附录：新增表结构

```sql
-- 全部新增表
CREATE TABLE IF NOT EXISTS api_keys (...);        -- Key 管理
CREATE TABLE IF NOT EXISTS api_usage_logs (...);  -- 用量日志
CREATE TABLE IF NOT EXISTS usage_quotas (...);    -- 月配额
CREATE TABLE IF NOT EXISTS style_profiles (...);  -- 风格画像（详见 style-profile-schema.md）
```

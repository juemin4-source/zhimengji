# 风格画像数据结构和存储 — 织梦机 v2.0

> 版本: v2.0-style-2026-07-08
> 状态: 实现方案研究完成，可直接编码

---

## 目录

- [一、核心设计](#一核心设计)
- [二、SQLite 存储](#二sqlite-存储)
- [三、TypeScript 前端类型](#三typescript-前端类型)
- [四、更新策略](#四更新策略)
- [五、无需 LoRA 的风格匹配微调](#五无需-lora-的风格匹配微调)
- [六、BYOK 层的风格注入](#六byok-层的风格注入)
- [七、初始建立与渐进学习](#七初始建立与渐进学习)

---

## 一、核心设计

### 设计原则

```txt
1. 风格画像不是"风格标签"，而是可注入 LLM 的文本特征描述
2. 不训练/不微调 — 全部通过 prompt injection 实现
3. 画像存储在 SQLite，BYOK 层读取后注入 system prompt
4. 画像逐步积累，不要求一次完整
5. 画像 = 词汇特征 + 句法特征 + 叙事特征 + 风格描述
```

### 为什么不训练 LoRA

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **LoRA 微调** | 风格一致性高 | 需要 GPU，每用户每风格一个模型，BYOK 不可行，存储几十 MB | ❌ |
| **Prompt injection** | 零成本，即时生效 | 受 context window 限制，不够精确 | ✅ 适合 BYOK |
| **Few-shot + 风格描述** | 灵活，可逐步调整 | 需要精心设计 prompt template | ✅ 织梦机方案 |

织梦机的风格匹配通过 **Prompt injection + 结构化风格描述** 实现，不依赖 LoRA 或其他微调。

---

## 二、SQLite 存储

### 2.1 数据模型

```sql
-- style_profiles — 项目级风格画像
CREATE TABLE IF NOT EXISTS style_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,         -- 每个项目一个风格画像
  style_description TEXT NOT NULL DEFAULT '', -- 风格整体描述（~200字）
  genre TEXT NOT NULL DEFAULT '',           -- 类型标签 "奇幻" "科幻" "现实主义"
  tone TEXT NOT NULL DEFAULT '',            -- 基调 "严肃" "幽默" "诗意" "冷峻"

  -- 词汇特征 (JSON array of strings)
  lexical_features TEXT NOT NULL DEFAULT '[]',
  -- 句法特征 (JSON array of strings)
  syntactic_features TEXT NOT NULL DEFAULT '[]',
  -- 叙事特征 (JSON array of strings)
  narrative_features TEXT NOT NULL DEFAULT '[]',

  -- 统计摘要（自动计算，读取时可能过时）
  words_sample_count INTEGER NOT NULL DEFAULT 0,   -- 已分析的样本字数
  avg_sentence_length REAL NOT NULL DEFAULT 0,       -- 平均句长
  vocab_diversity REAL NOT NULL DEFAULT 0,           -- 词汇多样性 (type-token ratio)
  dialogue_ratio REAL NOT NULL DEFAULT 0,            -- 对话占比 0-1
  adjective_density REAL NOT NULL DEFAULT 0,         -- 形容词密度
  adverb_density REAL NOT NULL DEFAULT 0,            -- 副词密度

  -- 频率统计 (JSON) — 用于相似度匹配
  top_words TEXT NOT NULL DEFAULT '[]',              -- 高频词列表 [{word, count}]
  top_bigrams TEXT NOT NULL DEFAULT '[]',             -- 高频二元组

  -- 风格签名 (SHA-256 hash of the latest analyzed text)
  style_signature TEXT DEFAULT NULL,                  -- 用于检测内容是否已分析过

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- style_profile_history — 风格画像变更历史
CREATE TABLE IF NOT EXISTS style_profile_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  snapshot TEXT NOT NULL,             -- 变更时的完整 profile JSON
  change_reason TEXT NOT NULL,        -- "user_edit" | "auto_analyze" | "manual_reset"
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- style_analysis_jobs — 分析任务队列（用于异步分析）
CREATE TABLE IF NOT EXISTS style_analysis_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  text_sample TEXT NOT NULL,          -- 待分析的文本
  result TEXT DEFAULT NULL,           -- 分析结果 JSON
  error TEXT DEFAULT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER DEFAULT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sp_project ON style_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_sph_project ON style_profile_history(project_id);
CREATE INDEX IF NOT EXISTS idx_saj_status ON style_analysis_jobs(status);
```

### 2.2 JSON 列结构示例

```json
// lexical_features (词汇特征)
[
  "喜用四字成语，尤其"风雨"、"山河"类意象",
  "形容词偏古雅：幽微、苍茫、凛冽",
  "少有网络用语或口语化表达",
  "颜色词使用精确：鸦青、玄黑、月白而非简单'深蓝'"
]

// syntactic_features (句法特征)
[
  "句子偏长，平均 25-35 字",
  "多用排比句增强气势",
  "对话中常用省略号和破折号表犹豫",
  "段落以短句收尾实现余震效果"
]

// narrative_features (叙事特征)
[
  "第三人称有限视角，偶尔切换为人物内心独白",
  "时间线非线性，常有插叙和预叙",
  "场景描写先于人物动作，建立画面感后再推进剧情",
  "留白多——关键冲突不直接描写，通过他人口述或后果展示"
]
```

---

## 三、TypeScript 前端类型

```typescript
// types/style-profile.ts

export interface StyleProfile {
  id: string;
  projectId: string;
  styleDescription: string;
  genre: string;
  tone: string;

  // 特征列表
  lexicalFeatures: string[];
  syntacticFeatures: string[];
  narrativeFeatures: string[];

  // 统计摘要
  wordsSampleCount: number;
  avgSentenceLength: number;
  vocabDiversity: number;     // 词汇多样性 0-1
  dialogueRatio: number;      // 对话占比 0-1
  adjectiveDensity: number;   // 形容词密度 0-1
  adverbDensity: number;      // 副词密度 0-1

  // 频率统计
  topWords: Array<{ word: string; count: number }>;
  topBigrams: Array<{ bigram: string; count: number }>;

  // 元数据
  styleSignature: string | null;
  createdAt: number;
  updatedAt: number;
}

// 创建风格画像的参数
export interface StyleProfileCreate {
  projectId: string;
  styleDescription?: string;
  genre?: string;
  tone?: string;
  lexicalFeatures?: string[];
  syntacticFeatures?: string[];
  narrativeFeatures?: string[];
}

// 分析请求
export interface StyleAnalysisRequest {
  projectId: string;
  textSample: string;
  sampleType: 'user_writing' | 'reference_text' | 'existing_content';
}

// 分析结果
export interface StyleAnalysisResult {
  lexicalFeatures: string[];
  syntacticFeatures: string[];
  narrativeFeatures: string[];
  statistics: {
    avgSentenceLength: number;
    vocabDiversity: number;
    dialogueRatio: number;
    adjectiveDensity: number;
    adverbDensity: number;
    topWords: Array<{ word: string; count: number }>;
    topBigrams: Array<{ bigram: string; count: number }>;
  };
  confidence: number;  // 分析置信度 0-1
}
```

---

## 四、更新策略

### 4.1 更新方式

```txt
三种方式可同时使用，不互斥：

方式 A: 用户手动编辑（精度高）
  用户在设置中直接编辑风格描述和特征列表
  适用场景: 用户清楚自己的风格偏好

方式 B: AI 自动分析（冷启动）
  用户提交一段样本文本 → AI 分析 → 生成画像
  适用场景: 首次建立风格画像

方式 C: 持续学习（增量更新）
  用户每写一段文本，系统自动更新统计特征
  适用场景: 写作中持续微调
```

### 4.2 更新策略

```typescript
// skills/style-profile-updater.ts

class StyleProfileUpdater {
  // === 方式 A: 用户手动编辑 ===
  async manualUpdate(
    profileId: string,
    updates: Partial<StyleProfile>
  ): Promise<StyleProfile> {
    // 直接更新指定字段
    // 记录变更历史（change_reason = 'user_edit'）
    // 标记 style_signature = null（需要重新匹配检测）
  }

  // === 方式 B: AI 自动分析 ===
  async analyzeFromSample(
    projectId: string,
    textSample: string
  ): Promise<StyleAnalysisResult> {
    // 调用分析 skill (CS-XX: style-analyzer)
    // 分析文本的词汇、句法、叙事特征
    // 返回结构化分析结果
    return byokCallLlm('_style_analyzer', {
      system: `分析以下文本的写作风格，输出词汇特征、句法特征、叙事特征。`,
      messages: [{ role: 'user', content: textSample }],
    }, 'sonnet').then(parseAnalysisResult);
  }

  async applyAnalysis(
    projectId: string,
    analysis: StyleAnalysisResult
  ): Promise<StyleProfile> {
    // 将分析结果写入 style_profiles
    // 更新统计信息
    // 记录变更历史（change_reason = 'auto_analyze'）
    // 设置 style_signature
  }

  // === 方式 C: 持续学习 ===
  async incrementalUpdate(
    projectId: string,
    newText: string
  ): Promise<void> {
    // 1. 检测新文本是否已有足够新内容（>200字差异）
    // 2. 如果是，异步更新统计数字（平均句长、词汇多样性等）
    // 3. 不自动修改特征列表（避免噪音）
    // 4. 仅当用户确认后才更新特征
  }

  // === 查询 ===
  async getStyleProfile(projectId: string): Promise<StyleProfile | null> {
    // 从 SQLite 读取
    // 如果不存在，返回 null（新的项目尚未建立风格画像）
  }
}
```

### 4.3 增量更新阈值

```typescript
// 持续学习的防抖策略

const INCREMENTAL_UPDATE_CONFIG = {
  minNewWords: 200,           // 最少新增 200 词才触发更新
  debounceMs: 30000,          // 30 秒防抖
  maxUpdateFrequency: 5,      // 每小时最多更新 5 次
  featureAutoUpdate: false,   // 特征列表不自动更新（仅统计数字自动更新）
  lowConfidenceDiscard: 0.3,  // 置信度低于 0.3 的 AI 分析结果丢弃
};
```

---

## 五、无需 LoRA 的风格匹配微调

### 5.1 工作原理

织梦机通过 **三层 prompt 注入** 实现风格匹配，无需 LoRA 微调：

```txt
第一层: 基础风格描述（byok_call_llm 自动注入）
  追加到 system prompt:
  "[写作风格要求]
   用户的作品是奇幻文学，基调沉郁。
   喜用四字成语和古雅词汇。
   第三人称有限视角，场景描写先行..."

第二层: 当前上下文中最近的文本（chain-engine 组装）
  在 user message 中包含:
  "以下是用户最近写的段落，请保持风格一致:
   [最近的 500 字]"

第三层: Skill 自身的 prompt template（skill JSON 定义）
  system prompt 中的角色定位和输出格式要求
```

### 5.2 一致性评分

```typescript
// 风格一致性的自动评分（用于 Reader/Inspector 检查）

interface StyleConsistencyScore {
  overall: number;               // 0-100 整体一致性
  lexicalMatch: number;          // 词汇匹配度
  syntacticMatch: number;        // 句法匹配度
  narrativeMatch: number;        // 叙事匹配度
  deviations: StyleDeviation[];  // 偏离列表
}

interface StyleDeviation {
  type: 'lexical' | 'syntactic' | 'narrative';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  suggestion: string;
}
```

### 5.3 比较: LoRA vs Prompt Injection

| 维度 | LoRA 微调 | Prompt Injection（织梦机方案） |
|------|-----------|------------------------------|
| **效果上限** | 高（训练了风格分布） | 中高（受 context 长度限制） |
| **成本** | GPU 训练 ($/hr) + 存储 (MB) | 0 额外成本 |
| **灵活性** | 一风格一模型，切换慢 | 即时切换 |
| **BYOK 兼容** | ❌ 无法让用户的 API 跑自定义模型 | ✅ 纯 prompt |
| **持续学习** | 需要重新训练 | 即时更新 profile |
| **隐私** | 文本需上传训练 | 文本不上传训练 |
| **适用** | 出版级风格一致性 | 写作辅助级风格一致性 |

**结论：** 对于织梦机的使用场景（写作辅助、世界构建），Prompt injection 足够。
出版级风格一致性需要作者自己的判断，AI 负责辅助而非替代。

---

## 六、BYOK 层的风格注入

### 6.1 注入位置

```rust
// Rust 端 byok_call_llm 中的风格注入
// 位置: 在 byok_call_llm 函数中，调用 LLM 之前

fn inject_style_into_prompt(
    mut prompt: LlmPrompt,
    style_profile: Option<&StyleProfile>,
) -> LlmPrompt {
    if let Some(style) = style_profile {
        // 构造风格块
        let style_block = format!(
            r#"

[写作风格要求]
风格描述: {}
类型: {} | 基调: {}

词汇特征:
{}

句法特征:
{}

叙事特征:
{}

[统计参考]
平均句长: {:.1} 字
词汇多样性: {:.2}
对话占比: {:.0}%
频率特征词: {}

请在生成内容时严格遵循上述风格特征。如果输入文本与风格不一致，优先遵循风格描述。
"#,
            style.style_description,
            style.genre, style.tone,
            bullet_list(&style.lexical_features),
            bullet_list(&style.syntactic_features),
            bullet_list(&style.narrative_features),
            style.avg_sentence_length,
            style.vocab_diversity,
            style.dialogue_ratio * 100.0,
            top_words_string(&style.top_words),
        );

        // 追加到 system prompt 末尾
        prompt.system.push_str(&style_block);
    }
    prompt
}

fn bullet_list(items: &[String]) -> String {
    items.iter()
        .map(|item| format!("• {}", item))
        .collect::<Vec<_>>()
        .join("\n")
}

fn top_words_string(words: &[WordCount]) -> String {
    words.iter()
        .take(20)
        .map(|w| format!("{} ({})", w.word, w.count))
        .collect::<Vec<_>>()
        .join(", ")
}
```

### 6.2 性能影响

```txt
风格画像大小:
  style_description: ~200 字
  lexical_features: ~100 字 (5 条 × 20 字)
  syntactic_features: ~100 字
  narrative_features: ~100 字
  top_words: ~50 字
  统计数字: ~50 字
  总风格块: ~600 字 = ~800 tokens

影响:
  每次 LLM 调用增加 ~800 tokens 的输入
  对 1000 token 以上的调用影响可忽略 (<10%)
  需要 LLM 有足够的 context window 容纳风格描述
  推荐模型: 至少 16K context
```

---

## 七、初始建立与渐进学习

### 7.1 首次使用流程

```txt
用户新建项目
  │
  ├─ 可选: 输入类型/基调
  │  ("奇幻" "严肃")
  │
  ├─ 可选: 上传参考文本
  │  (已有作品片段 / 参考风格的文章)
  │  → AI 分析 → 生成风格画像
  │
  └─ 可选: 直接开始写
      → 写满 500 字后 AI 自动分析
      → 生成初始风格画像
      → 用户可手动编辑完善
```

### 7.2 渐进学习

```typescript
// 渐进学习——不需要 LoRA 的增量适应

// 每写 500 词，引擎自动抽取统计特征:
// - 高频词变化
// - 句长分布偏移
// - 对话比例变化
// - 形容词/副词密度

// 这些统计特征自动更新到 style_profiles 表
// 但不自动修改特征列表（避免噪音）
// 仅当用户点击"更新风格画像"时才调用 AI 重新分析

// 用户也可以在任意时刻手动编辑特征列表:
// - 新增一条词汇特征
// - 删除一条不再适用的特征
// - 修改风格描述
```

### 7.3 多风格支持（v2.1+）

```txt
v2.0: 每个项目一个风格画像（默认）
v2.1: 支持多个风格画像（每个角色/叙事线独立风格）
  方案: style_profiles 表增加 scope 字段
    scope: "global" | "character:角色A" | "timeline:前传"
  不同 scope 在不同上下文中注入
  → 例如写角色 A 的章节时注入角色 A 的风格
```

---

## 附录：Tauri invoke 接口

```rust
// Rust 端暴露给前端的风格画像命令

#[tauri::command]
async fn get_style_profile(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Option<StyleProfile>, String>;

#[tauri::command]
async fn create_style_profile(
    db: State<'_, Database>,
    profile: StyleProfileCreate,
) -> Result<StyleProfile, String>;

#[tauri::command]
async fn update_style_profile(
    db: State<'_, Database>,
    profile: StyleProfile,
) -> Result<(), String>;

#[tauri::command]
async fn analyze_style_from_text(
    db: State<'_, Database>,
    project_id: String,
    text_sample: String,
) -> Result<StyleAnalysisResult, String>;

#[tauri::command]
async fn apply_style_analysis(
    db: State<'_, Database>,
    project_id: String,
    analysis: StyleAnalysisResult,
) -> Result<StyleProfile, String>;

#[tauri::command]
async fn get_style_profile_history(
    db: State<'_, Database>,
    project_id: String,
) -> Result<Vec<String>, String>;  // Vec<JSON snapshot strings>
```

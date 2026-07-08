# 织梦机 v1.2 → v2.0 实现分解和依赖关系

> 版本: v2.0-roadmap-2026-07-08
> 状态: 实现方案研究完成，可直接编码

---

## 目录

- [一、版本概览](#一版本概览)
- [二、v1.2 — BYOK 接入（第 1-2 周）](#二v12--byok-接入第-1-2-周)
- [三、v1.3 — BYOK 完善（第 3-4 周）](#三v13--byok-完善第-3-4-周)
- [四、v1.4 — Agent+Skill 架构（第 5-8 周）](#四v14--agentskill-架构第-5-8-周)
- [五、v1.5 — AI 原生编辑器（第 9-10 周）](#五v15--ai-原生编辑器第-9-10-周)
- [六、v1.6 — 画板+设定集 AI 化（第 11-12 周）](#六v16--画板设定集-ai-化第-11-12-周)
- [七、v1.7 — AI 深度（第 13-14 周）](#七v17--ai-深度第-13-14-周)
- [八、v1.8 — Web 版（第 15-16 周）](#八v18--web-版第-15-16-周)
- [九、v1.9 — 发布候选（第 17-18 周）](#九v19--发布候选第-17-18-周)
- [十、v2.0 — 北极星（第 19-20 周）](#十v20--北极星第-19-20-周)
- [十一、依赖关系图](#十一依赖关系图)
- [十二、风险评估](#十二风险评估)

---

## 一、版本概览

### 时间线

```
v1.2 ■■■■░░░░░░░░░░░░░░░░░░  2 周 (BYOK 接入)
v1.3 ■■■■■■■■░░░░░░░░░░░░░░  2 周 (BYOK 完善)
v1.4 ■■■■■■■■■■■■░░░░░░░░░░  4 周 (Agent+Skill 架构)
v1.5 ■■■■■■■■■■■■■█░░░░░░░  2 周 (AI 原生编辑器)
v1.6 ■■■■■■■■■■■■■■■■░░░░░░  2 周 (画板+设定集 AI 化)
v1.7 ■■■■■■■■■■■■■■■■■█░░░  2 周 (AI 深度)
v1.8 ■■■■■■■■■■■■■■■■■■■█░  2 周 (Web 版)
v1.9 ■■■■■■■■■■■■■■■■■■■■■  2 周 (发布候选)
v2.0 ■■■■■■■■■■■■■■■■■■■■■  2 周 (北极星)
                                  ────
                                  20 周 (5 个月)
```

### 依赖关系

```txt
v1.2──→v1.3──→v1.4──→v1.5──→v1.6──→v1.7──→v1.8──→v1.9──→v2.0
        ↑        ↑       │       │
        │        │       └──→v1.6 画板 AI 依赖 Agent 架构
        │        │
        │        └──→v1.5 AI 编辑器依赖 Agent+Skill 就绪
        │
        └──→v1.4 Agent 架构依赖 BYOK 就绪
```

### 编码优先级

```
批次 1 (立即开始): Rust BYOK 层 + SQLite 表
  依赖: 无（完全独立于前端）

批次 2 (与批次 1 并行): Skill Registry + Skill Executor
  依赖: BYOK 层就绪后才能调用 LLM（但可先写代码框架）

批次 3 (批次 2 之后): Agent Router + State Machine + Orchestrator
  依赖: Skill Registry + Executor

批次 4 (批次 3 之后): UI 组件 (AgentConsole + Settings + 深度控制)
  依赖: Agent Router

批次 5 (以上全部之后): AI 编辑器集成、画板 AI、仪表盘
```

---

## 二、v1.2 — BYOK 接入（第 1-2 周）

> 焦点：AI 入口 + Key 管理

### 技术实现

```txt
Rust 端（新增）:
  □ src-tauri/src/byok/mod.rs — 模块入口
  □ src-tauri/src/byok/key_manager.rs — Key 加密存储
  □ src-tauri/src/byok/llm_client.rs — LLM HTTP 调用
  □ src-tauri/src/byok/model_router.rs — 模型路由（基础版）
  □ SQLite 新增表: api_keys, api_usage_logs

TypeScript 端（新增）:
  □ src/skills/byok-api.ts — TS 端 invoke 封装
  □ src/components/settings/ByokSettings.tsx — Key 配置 UI
  □ src/components/ai/ModelSelector.tsx — 模型选择器

UI:
  □ 左侧栏底部 AI 助手浮窗（折叠状态）
  □ 设置页 ⚙️ → API Key 配置
  □ 连接状态指示器（状态栏）

后端变更:
  □ Cargo.toml 新增依赖: reqwest, aes-gcm, keyring, hex
  □ lib.rs 新增 byok invoke handler
```

### 验收标准

```txt
[ ] 用户可添加 OpenAI/Anthropic API Key
[ ] Key 加密存储，JS 层不接触原始 Key
[ ] 连接测试：输入 Key 后可验证是否有效
[ ] AI 助手浮窗可展开/折叠
[ ] 状态栏显示连接状态
[ ] 新增表结构在启动时自动创建
```

### 工作量评估

| 模块 | 文件数 | 代码量 | 预估工时 |
|------|--------|--------|---------|
| Rust BYOK 层 | 4 文件 | ~400 行 | 2 天 |
| SQLite 表 | 1 变更 (db.rs) | ~30 行 | 0.5 天 |
| TS invoke 封装 | 1 文件 | ~60 行 | 0.5 天 |
| UI 组件 | 2 文件 | ~300 行 | 2 天 |
| 测试 | 2 文件 | ~100 行 | 1 天 |
| **小计** | **~10 文件** | **~900 行** | **~6 天** |

---

## 三、v1.3 — BYOK 完善（第 3-4 周）

> 焦点：多模型切换 + 用量监控

### 技术实现

```txt
Rust 端:
  □ byok/usage_tracker.rs — 用量追踪 + 配额检查
  □ byok/model_router.rs — 完善: 多 Key 优先级 + 轮询 + 降权

TypeScript 端:
  □ hooks/useByOK.ts — 用量状态 hook
  □ components/settings/UsageChart.tsx — 用量图表
  □ 模型选择下拉（AI 助手头部）

UI:
  □ 模型选择下拉（多 Provider）
  □ 用量概览条（今日 tokens / 配额）
  □ 用量详情弹窗（分模型、月总计、费用估算）
  □ 模型配置页（每个模型独立 Key/Endpoint）

数据库:
  □ usage_quotas 表
  □ v_monthly_usage 视图
```

### 验收标准

```txt
[ ] 可添加多个 Provider Key（OpenAI + Anthropic）
[ ] 模型切换实时生效
[ ] 用量概览条正确显示今日用量
[ ] 接近配额时变黄→变红
[ ] 超配额时阻塞调用
[ ] 用量详情弹窗显示分模型统计
```

### 工作量评估

| 模块 | 文件数 | 代码量 | 预估工时 |
|------|--------|--------|---------|
| Rust 用量追踪 | 2 变更 | ~200 行 | 1 天 |
| TS hook | 1 文件 | ~100 行 | 1 天 |
| UI 组件 | 3 文件 | ~400 行 | 2 天 |
| 测试 | 2 文件 | ~100 行 | 1 天 |
| **小计** | **~8 文件** | **~800 行** | **~5 天** |

---

## 四、v1.4 — Agent+Skill 架构（第 5-8 周）

> 焦点：Agent 框架 + AI 首条链路

### 技术实现

```txt
Skill 层 (TypeScript):
  □ skills/registry.ts — Skill 注册表（从 JSON 加载）
  □ skills/executor.ts — Skill 执行器（组装 prompt → invoke BYOK → 解析）
  □ skills/chain-engine.ts — Skill 链引擎（拓扑排序 + 并行执行）
  □ skills/schemas/craft-skill-schema.json — JSON Schema
  □ skills/definitions/ — 首批 10 个 skill JSON 文件（CS-01~CS-10）

Agent 层 (TypeScript):
  □ agents/agent-router.ts — 状态机路由器
  □ agents/agent-config.ts — Agent 定义 + Skill 映射
  □ agents/orchestrator.ts — Orchestrator 路由逻辑
  □ agents/depth-control.ts — 三路深度控制
  □ hooks/useAgentEngine.ts — Agent 状态 hook

UI:
  □ AI 导航标签（导航栏新增 "AI" Tab）
  □ AgentConsole 组件（Agent 控制台）
  □ Skill 市场浮窗（右下角浮动）
  □ Agent 模式开关

Rust 端:
  □ byok/ — style_profile 相关方法（新增）
  □ db.rs — style_profiles 表

文档:
  □ 首批 10 个 skill 的 JSON 定义文件
```

### 验收标准

```txt
[ ] 状态机正确转换所有路径
[ ] Skill Executor 可调用 BYOK LLM 并返回结构化结果
[ ] Chain Engine 按依赖顺序执行 skill 链
[ ] Agent Console 显示实时进度
[ ] 三路深度模式均可工作
[ ] 首批 10 个 skill JSON 通过 schema 校验
[ ] Skill 市场浮窗可展示 skill 列表
```

### 工作量评估

| 模块 | 文件数 | 代码量 | 预估工时 |
|------|--------|--------|---------|
| Skill 层核心 | 4 文件 | ~500 行 | 3 天 |
| Skill JSON 定义 | 10 文件 | ~600 行 | 2 天 |
| Agent 层 | 5 文件 | ~500 行 | 3 天 |
| Hook | 1 文件 | ~200 行 | 1 天 |
| UI 组件 | 4 文件 | ~600 行 | 3 天 |
| Rust 风格画像 | 2 变更 | ~150 行 | 1 天 |
| 测试 | 5 文件 | ~300 行 | 2 天 |
| **小计** | **~30 文件** | **~2850 行** | **~15 天** |

### Skill JSON 创建顺序

```txt
第一批（v1.4 完成，10 个）:
  CS-01 具象诊断 / CS-02 复调诊断 / CS-03 余地诊断 / CS-04 得度检查
  CS-05 欲望入口 / CS-06 低入口高经验 / CS-07 类型承诺
  CS-10 机制受力 / CS-11 私诊断 / CS-12 处诊断

第二批（v1.5 完成，10 个）:
  CS-13 执诊断 / CS-14 为诊断 / CS-15 已诊断
  CS-25 定势 / CS-26 物色 / CS-27 身位 / CS-28 声口
  CS-29 章句 / CS-30 情采 / CS-31 风骨

第三批（v1.6 完成，10 个）:
  CS-08 信息节奏 / CS-09 读者综合 / CS-16 关系网 / CS-17 合并升格
  CS-18 人物综合 / CS-32 熔裁 / CS-33 分形 / CS-34 涌现
  CS-35 有无 / CS-36 重复

第四批（v1.7 完成，10 个）:
  CS-19 十二时位 / CS-20 二十四节气 / CS-21 叙事入口
  CS-22 周期嵌套 / CS-23 命运/叙事双层 / CS-24 命运综合
  CS-37 母题 / CS-38 三重检验 / CS-39 读者就绪 / CS-40 深处连贯
```

---

## 五、v1.5 — AI 原生编辑器（第 9-10 周）

> 焦点：Agent 实时协作

### 技术实现

```txt
新组件:
  □ components/editor/CollaborativeEditor.tsx
    — 包装 Tiptap，增加 AI 协作图层
    — AI 光标渲染（不同颜色标识不同 Agent）
    — AI "正在输入" 指示器
    — 协作工具栏（邀请/暂停/查看变更）

  □ components/editor/ChangeHistory.tsx
    — 按时间线显示所有 AI 协作修改记录
    — 逐条接受/拒绝按钮

  □ hooks/useAIEditor.ts
    — 管理编辑器中的 AI 协作状态
    — 接收 Agent 输出并应用到编辑器

后端（轻微变更）:
  □ 无架构变更，复用 v1.4 Agent 层
  □ Agent 输出改为 stream 模式？→ 暂不，用批处理模式
```

### 验收标准

```txt
[ ] Agent 输出可直接写入 Tiptap 编辑器
[ ] 每个 Agent 有不同颜色光标
[ ] "正在输入"指示器显示当前工作的 Agent 名称
[ ] 变更历史面板可追溯每条 AI 修改
[ ] 可逐条接受/拒绝 AI 修改
[ ] 可一键暂停所有 AI 协作
```

### 工作量评估

| 模块 | 文件数 | 代码量 | 预估工时 |
|------|--------|--------|---------|
| 协作编辑器 | 2 文件 | ~400 行 | 4 天 |
| 变更历史 | 1 文件 | ~200 行 | 1 天 |
| Hook | 1 文件 | ~150 行 | 1 天 |
| Skill JSON（第二批 10 个）| 10 文件 | ~600 行 | 2 天 |
| **小计** | **~14 文件** | **~1350 行** | **~8 天** |

---

## 六、v1.6 — 画板+设定集 AI 化（第 11-12 周）

> 焦点：画板自动构建 + 一致性检查

### 技术实现

```txt
新组件:
  □ components/ai/AISuggestPanel.tsx — 左侧栏 AI 建议面板
  □ components/canvas/AutoLayoutEngine.tsx — 画板自动布局
    — 使用 ReactFlow 的布局算法
    — AI 推荐分组方案
  □ components/settings/ConsistencyScanner.tsx — 一致性扫描
    — 调用 Inspector/Reader skill 检查设定一致性

逻辑:
  □ skills/consistency-check.ts — 一致性检查逻辑
    — 调用 CS-07(类型承诺) + CS-16(关系网) + CS-36(重复)
    — 收集不一致项 → 按 P0/P1/P2 分级

技能 JSON（第三批 10 个）
```

### 验收标准

```txt
[ ] AI 建议面板显示当前 Tab 相关建议
[ ] 自动布局提供 2-3 种方案供选择
[ ] 一致性扫描覆盖全部对象，结果分级展示
[ ] 点击一致性项可直接跳转到对象
[ ] 一键修正支持批量/逐条
```

---

## 七、v1.7 — AI 深度（第 13-14 周）

> 焦点：风格识别 + 动态 Skill + 仪表盘

### 技术实现

```txt
新组件:
  □ components/ai/DashboardTab.tsx — 项目仪表盘
  □ components/ai/StyleIdentifier.tsx — 风格识别结果展示
  □ components/ai/DynamicSkillRecommender.tsx — 动态 Skill 推荐

逻辑:
  □ skills/style-profile-updater.ts — 风格画像更新
    — 增量更新 + AI 自动分析
  □ agents/dynamic-skill-router.ts — 根据项目特征推荐 skill

技能 JSON（第四批 10 个，全部 40 个 skill 完成）
```

### 验收标准

```txt
[ ] 风格识别自动运行，显示风格类型和匹配度
[ ] 仪表盘显示对象趋势、AI 协作时长、一致性得分
[ ] 动态 Skill 推荐根据项目特征智能推荐
[ ] 匹配度 < 50% 时提示调整
```

---

## 八、v1.8 — Web 版（第 15-16 周）

> 焦点：桌面 + Web 双模

### 技术实现

```txt
Tauri 配置:
  □ 平台切换指示器
  □ PWA 支持（manifest.json + service worker）
  □ 响应式断点（桌面/平板/手机）

新组件:
  □ 离线/在线状态指示器
  □ 同步状态指示器
  □ PWA 安装提示
  □ 分享按钮

注意: Web 版的 BYOK 层处理
  — Web 版无法使用 Rust 后端
  — Key 必须在前端处理（使用 Web Crypto API 加密）
  — 或使用中介服务器代理
  → 此架构决策需在 v1.7 结束时重新评估
```

---

## 九、v1.9 — 发布候选（第 17-18 周）

> 焦点：修 bug + 内测

### 技术实现

```txt
新组件:
  □ 反馈按钮 + 内测标签
  □ 新手引导（分步浮层，3-5 步）
  □ 骨架屏加载
  □ 崩溃恢复提示
  □ 性能监控（页面加载时间、内存）

测试:
  □ 40 个 skill 全部冒烟测试
  □ 5 个 agent 集成测试
  □ 三路深度模式 E2E 测试
  □ BYOK 所有 Provider 兼容性测试
```

---

## 十、v2.0 — 北极星（第 19-20 周）

> 焦点：全部集成 + 正式发布

### 技术实现

```txt
新组件:
  □ 工作区模式切换（创作/审阅/协作）
  □ 全局搜索 (Ctrl+K)
  □ 快速操作面板
  □ 智能分组（大纲树自动分组）
  □ 知识库链接显示
  □ 发布状态面板
  □ 版本足迹

最终集成:
  □ Agent 完整流水线全链路测试
  □ 性能优化 + 内存分析
  □ 跨平台测试 (Windows / macOS)
  □ 文档完善
```

---

## 十一、依赖关系图

### 技术依赖

```
v1.2 (BYOK 接入)
  └─ Rust: reqwest, aes-gcm, keyring
  └─ 新表: api_keys
  │
  ▼
v1.3 (BYOK 完善)
  └─ 新表: usage_quotas
  └─ Rust: usage_tracker 完善
  │
  ▼
v1.4 (Agent+Skill 架构)  ←── 核心里程碑
  └─ 依赖 v1.2 的 BYOK 层（Skill Executor 需要调用 LLM）
  └─ 新表: style_profiles, style_analysis_jobs
  └─ 新模块: skills/, agents/
  └─ 首批 10 个 skill JSON
  │
  ├──→ v1.5 (AI 编辑器) — 依赖 Agent 层
  ├──→ v1.6 (画板 AI) — 依赖 Agent 层 + skill chain
  │
  ▼
v1.7 (AI 深度)
  └─ 依赖 v1.4 的完整 skill 体系
  └─ 全部 40 个 skill JSON 完成
  │
  ▼
v1.8 (Web 版)
  └─ 架构决策: Web 版 BYOK 如何处理
  └─ 依赖 v1.7 的完整功能
  │
  ▼
v1.9 (发布候选)
  └─ 依赖所有之前版本
  │
  ▼
v2.0 (北极星)
  └─ 依赖所有版本
```

### 并行可行性

```
第 1-2 周: v1.2 BYOK 接入（Rust 重）
           可与 v1.3 的用量追踪并行（不同模块）
第 3-4 周: v1.3 BYOK 完善（Rust + TS）
           可并行编写 skill JSON 定义（纯数据工作）
第 5-8 周: v1.4 Agent+Skill（TS 重）
           Skill Executor 与 BYOK 集成测试
           建议: 第 5-6 周写 skill 框架，第 7-8 周写 Agent 路由
第 9-10 周: v1.5 AI 编辑器
            可并行写第二批 skill JSON
第 11-12 周: v1.6 画板 AI
             可并行写第三批 skill JSON
第 13-14 周: v1.7 AI 深度
             可并行写第四批 skill JSON + 仪表盘
第 15-20 周: v1.8 → v2.0 收尾
```

---

## 十二、风险评估

### 技术风险

| 风险 | 概率 | 影响 | 缓解方案 |
|------|------|------|---------|
| **Rust 编译慢影响迭代速度** | 高 | 中 | BYOK 层独立测试（纯 Rust test），减少 Tauri 全量编译 |
| **LLM 输出的非结构化问题** | 中 | 高 | 所有 skill 要求 JSON 输出格式，executor 层做 schema 校验 + 重试 |
| **Tauri v2 的 invoke 性能** | 低 | 中 | 单次 LLM 调用约 1-5s，invoke 延迟 ~1ms，可忽略 |
| **Web 版 BYOK 无法复用 Rust** | 中 | 高 | v1.7 结束时决策。备选: WASM 加密 / 代理服务器 / Web Crypto API |
| **40 个 skill 的维护成本** | 中 | 中 | JSON Schema 校验 + 自动化测试 + 排期分 4 批创建 |
| **深度控制复杂度随版本增长** | 中 | 低 | depth-control.ts 作为单一控制点，不分散到各组件 |
| **状态机扩展到 10+ 状态** | 低 | 低 | 当前设计可扩展。如确实需要复杂状态，再考虑替换为 xstate |
| **风格画像在长 context 下的效果衰减** | 中 | 中 | 风格描述控制在 ~600 tokens，LLM 需 16K+ context |

### 项目风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 范围蔓延 | 高 | 高 | 严格按版本切割，v1.X 不加入 v1.Y+ 的功能 |
| 5 个月周期过长 | 中 | 中 | 每版本 2 周交付可验证增量 |
| 单一开发者瓶颈 | 中 | 高 | Agent+Skill 层可独立于 UI 层开发 |

### 关键路径

```
最短关键路径: v1.2 BYOK → v1.4 Agent+Skill → v1.7 AI 深度 → v2.0
最长关键路径: v1.2 BYOK → v1.4 Agent+Skill → v1.5 AI 编辑器 → v1.6 画板 AI → ... → v2.0

如果时间不足，v1.5 和 v1.6 可交换顺序（画板 AI 优先于编辑器协作）
如果严重压缩，最小可行 AI = v1.2 BYOK + v1.4 Agent+Skill（核心架构）
```

### ABORT 条件

```
1. BYOK 模式无法找到足够用户——目标用户不愿意配置自己的 API Key
   → 转向内置模型（成本转嫁到项目方）

2. LLM 对文学诊断的质量低于预期——40 个 skill 的诊断结果不可用
   → AI 降级为"纯写作辅助"而非"文学诊断"

3. 40 个 skill 创建后维护成本超过预期
   → skill 数量冻结，不继续扩展

4. Web 版的 BYOK 方案无法落地
   → v2.0 只发布桌面版，Web 版推迟到 v2.1
```

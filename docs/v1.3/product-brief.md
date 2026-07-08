# 织梦机 v1.3 — AI 对话与写作结合

> 状态: 产品定义 (Spring 春生)
> 日期: 2026-07-08
> 来源: product-think.md (2026-07-08) + 原型 (3 文件) + master-prototype-map.md + existing UI components (14 个)

---

## 一、版本概览

| 字段 | 内容 |
|------|------|
| 标题 | 织梦机 v1.3 — AI 对话与写作结合 |
| 版本 | v1.3 |
| 季节 | 春生 |
| 上游 | product-think.md (v1, 2026-07-08) |
| v1.2 已完成 | 存储安全 (P0-01)、核心 UX (大纲/Ctrl+K)、视觉打磨 (画板/推演图/设定集) |
| v1.3 核心命题 | AI 能读写本地数据。不是 AI 多聪明，是 AI 生成的内容无缝进入用户项目 |

### 原始意图摘要

| 类型 | 内容 |
|------|------|
| 用户原话 | "对话不是 AI 的边界，编辑才是。v1.3 必须先回答'AI 生成的内容如何在对话流中被用户直接编辑和收录'。" |
| 合理推断 | 如果用户必须离开对话去另一个页面编辑，AI 就从写作助手退化成了聊天玩具；AI 的触发点不在 AI 页面里，而在写作的每个自然停顿处 (v1.3 做不了全量触发，但架构要准备) |
| 明确不做的 | Agent 编排 (v1.4)、编辑器内嵌 AI (v1.5)、全量 smart context management (v1.4) |

---

## 二、In Scope (5 项)

### 1. AI 全页对话流
创建 ChatGPT 风格的全文对话界面，嵌入左侧大纲树，AI 回复以文档卡片形式呈现。

**包含:** 对话消息列表、文档卡片嵌入（类型徽标/标题/正文/分节）、会话管理（新建/切换/确认）、自动滚动

### 2. 文档卡片内联编辑
用户在对话流中可以直接编辑 AI 生成的文档卡片，编辑内容自动同步到项目数据库。

**包含:** 编辑模式切换、标题/正文/section 独立编辑、保存同步到 updateWorldObject、取消还原、已编辑标记

### 3. BYOK 接入
用户可以为不同的 AI 提供商配置 API Key 和自定义端点。

**包含:** 提供商卡片、API Key 输入(密码模式)、自定义端点、连接测试、AES-256-GCM 加密存储、添加/移除提供商

### 4. 多模型切换与用量监控
用户在对话中切换底层模型，切换不丢失上下文。用量可视化。

**包含:** 模型切换、侧栏模型指示器、日用量条形图(绿→黄→红)、各模型分解、7天趋势、月预算上限

### 5. 大纲-对话双向联动
点击大纲对象 → AI focus；AI 创建对象 → 大纲实时更新；内联编辑 → 大纲同步。

**包含:** 点击聚焦、聚焦标签+清除、新节点闪烁、编辑同步、AI 上下文注入

---

## 三、Out of Scope

Agent 编排(v1.4)、编辑器内嵌 AI(v1.4+)、@AI 内联对话(v1.5)、风格画像(v1.4+)、smart context management(v1.4)、拖拽(v1.4)、对话持久化(v1.4)、全屏编辑器(v1.4)、画板 AI(v1.6)、并行多对话(v1.4)

---

## 四、屏幕地图 (17 屏)

Phase 11 AI 对话: ai-chat, ai-chat-header, ai-doc-card, ai-doc-card-edit(新), ai-input-bar, ai-focus, ai-typing, ai-sidebar-model, ai-bottom-bar, ai-new-chat

Phase 12 AI 设置: settings-shell, settings-api-keys, settings-models, settings-cost, settings-breakdown, settings-sparkline, settings-test

---

## 五、FreeLLMAPI 集成

端点: http://localhost:3001/v1
认证: Bearer Token (用户配置)
模型: auto / GPT-4o / Claude 3.5 / 本地模型
上下文注入: Level 1 (Active ~2000 tokens) + Level 2 (Project ~2000 tokens)

---

## 六、验收标准

- [AC-1] 用户可在对话流中编辑 AI 生成的文档卡片，编辑后同步写入项目数据库
- [AC-2] AI 在后续对话中能感知到用户的编辑
- [AC-3] 点击大纲对象 → AI focus；AI 创建对象 → 大纲实时更新
- [AC-4] API Key 可加密存储、测试连接、编辑和移除
- [AC-5] 模型切换不丢失对话上下文
- [AC-6] 用量监控实时更新，80%/95% 阈值预警
- [AC-7] 用户从"新建对话"到"生成并收录一个设定"不超过 5 步
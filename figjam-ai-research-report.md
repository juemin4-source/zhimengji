# Figjam AI 用法调研报告

> 调研日期：2026-07-08
> 目标：为织梦机（zhimengji）画板交互寻找可借鉴的 AI 方向
> 来源：Figma 官方文档、FigJam AI 功能、Config 2025 发布内容

---

## 一、Figjam AI 功能全景

### 1.1 AI 驱动的画板生成

**"Make templates and diagrams"（文本生成画板）**

- 输入自然语言 prompt → 自动生成完整的 FigJam 画板，包括布局、节点、连线、贴纸
- 支持的 diagram 类型：flowchart、mind map、Gantt chart、org chart、timeline、ERD
- 内置模板 prompt：retrospective、1:1 meeting、brainstorm、project planning、weekly sync

**交互模式：** 点击工具栏 AI 按钮 → 输入 prompt → 一键生成 → 手动微调。**都是显式触发，不自动建议。**

### 1.2 便签智能聚类 & 摘要

**"Sort stickies"（智能分组）**

- 选中一组便签 → 右键 → FigJam AI → Sort stickies
- AI 自动将便签按主题分类，生成分组区域和类别标签
- 实际用途：brainstorm 后快速整理想法，识别主题趋势

**"Summarize"（摘要生成）**

- 选中便签 → 右键 → FigJam AI → Summarize
- AI 生成要点摘要（bullet points）
- 摘要结果可以复制分享，不可直接在 AI output 编辑

**交互模式：** 选中已有的内容 → 右键触发 → AI 分析当前选中。**是对已有内容的"处理"，不是空画布生成。**

### 1.3 Jambot Widget（ChatGPT 集成）

- FigJam 内部的小部件，像 ChatGPT 一样对话
- 能力：头脑风暴、摘要、mind map 创建、文本改写、代码生成、回答问题
- 可以在画板上持续存在，当作"画板上的 AI 助手"

**交互模式：** 添加小部件 → 对话框输入 → AI 输出直接写入画板。**对话式，持续存在，可迭代。**

### 1.4 智能连线 & 图表

- Connector 支持折线/曲线/直线，吸附节点和形状
- **Mermaid.js 支持** — 粘贴 Mermaid 语法 → 自动渲染为流程图/ERD/系统图
- 连线类型可自定义标签、颜色、箭头样式

**交互模式：** 代码/文本 → 渲染为图表。**织梦机目前已有连线系统，Mermaid 导入是可借鉴的方向。**

### 1.5 Text & Image AI 工具

- 文本改写、翻译、缩短、润色
- AI 图片生成、背景移除、分辨率提升、图像扩展

### 1.6 MCP / Coding Agent 集成（2025 新功能）

- AI agent（通过 MCP 协议）可以直接读写 FigJam 画板
- Claude + FigJam：用自然语言对话生成可编辑的 FigJam 图表
- Agent 可以自动创建 project plan diagram、ERD、架构图

**交互模式：** agent 后台操作画板 → 生成结构化内容。**织梦机作为 Tauri 本地应用，也可以设计类似的 agent 接入机制。**

---

## 二、Figjam AI 交互模式总结

| 模式 | 触发方式 | 适用场景 | AI 介入程度 |
|------|---------|---------|------------|
| 空画板生成 | 点击 AI 按钮 + prompt | 初始画板搭建 | 高（全布局） |
| 选中处理 | 选中 → 右键 → AI | 便签聚类/摘要 | 中（分析已有内容） |
| 对话助手 | Jambot widget | 持续协作 | 高（对话上下文） |
| 代码渲染 | 粘贴代码/语法 | 图转图表 | 低（仅解析渲染） |
| Agent 后台 | MCP 协议 | agent 协作 | 高（agent 自主操作） |

**关键观察：所有 AI 交互都是显式触发，没有自动建议或自动完成。** Figjam 不猜测用户意图，而是在用户要求时提供能力。

---

## 三、织梦机画板现状（可借鉴的入口点）

当前画板能力（已知）：
- 三种画板 tab：角色关系图（force-directed）/ 时间线（横向）/ 设定推演图（五区）
- 双击空白 → inline type bubble → 创建节点
- 节点边缘拖拽 → 连线 → inline popup 选择关系类型
- 多选 + 拖拽移动
- 便签、文本标注、分区
- 对象池筛选 → 添加已有对象
- Force-directed 自动布局

**需要 AI 增强的薄弱环节：**
1. ❌ 没有智能分组 — 节点只能手动摆放
2. ❌ 没有内容生成 — 画板节点需要手动创建
3. ❌ 没有摘要/分析能力 — 画板内容无法被 AI 理解
4. ❌ 没有对话式 AI 助手 — 无法在画板中提问
5. ❌ 没有代码/文本导入渲染 — 无法从故事文本生成画板

---

## 四、可直接借鉴的方向

### 方向 A：AI 智能布局（借鉴 "Sort stickies"）

**问题：** 织梦机的角色关系图目前用 force-directed 自动布局，但只按连接关系排列，不理解语义。

**借鉴方案：**
- 选中一组节点 → "智能分组" → AI 根据节点类型、标签、连接密度自动分组并排布
- 例如：选中所有"组织"节点 → AI 将它们聚拢并标记为"阵营区域"
- 选中所有"待验证"节点 → AI 将它们移动到推演图的"待验证区"

**实现路径：**
- 不需要大模型推理，可以用规则 + 标签匹配实现第一版
- 第二阶段：接入 LLM 分析节点描述 → 自动生成分组建议

**优先级：高** — 技术简单，体验提升明显

### 方向 B：文本生成画板（借鉴 "Make templates and diagrams"）

**问题：** 用户需要从零开始构建世界观画板，没有初始填充能力。

**借鉴方案：**
- 输入小说设定文字 → AI 解析出人物/地点/组织/事件 → 自动创建节点、连线、布局
- 例如："这个故事发生在 2025 年的东京，主角是高中生夏目..." → 生成初始角色关系图

**实现路径：**
- 调用 LLM 进行实体识别和关系抽取
- 将结构化结果映射到织梦机的对象类型和关系类型
- 调用 force-directed 或分区布局放置节点

**优先级：高** — 织梦机核心差异化能力

### 方向 C：AI 画板助手（借鉴 Jambot）

**问题：** 用户在使用画板时没有 AI 辅助，不能追问世界观细节。

**借鉴方案：**
- 画板内嵌一个 AI 对话面板（侧栏或浮动窗）
- 助手知道画板上的所有节点和连接关系
- 可以问： "帮我检查时间线是否有矛盾" "这个角色的动机是什么" "建议一个反派角色"

**实现路径：**
- 将画板节点序列化为 JSON 上下文注入 LLM prompt
- 对话持续保存在面板中
- 可以让 AI 直接在画板上创建/修改节点（写权限）

**优先级：中高** — 需要 LLM 集成，但体验价值高

### 方向 D：智能连接建议（借鉴 Mermaid.js 和智能连线）

**问题：** 用户需要手动拖拽建立所有连线，不知道哪些节点应该连接。

**借鉴方案：**
- 选中两个节点 → AI 自动建议合适的关系类型
- 当新节点加入画板 → AI 建议它与哪些已有节点应该建立连接
- 高级：从章节文本中自动提取关系 → 建议新的连接

**实现路径：**
- 第一版：根据节点类型对建议（人物→组织→"隶属"，人物→人物→"关系"等）
- 第二版：基于 LLM 对节点描述的分析生成关系建议

**优先级：中** — 锦上添花，但不是必须

---

## 五、需要差异化的方向（织梦机 vs Figjam）

织梦机是做**小说世界观构建**，不是做**通用白板**。以下能力应该**超越 Figjam**，而不是模仿它。

### 差异化 1：叙事理解的 AI

| 维度 | Figjam | 织梦机应做到 |
|------|--------|------------|
| 节点 | 任意形状/文本 | 叙事实体（人物/地点/事件/规则） |
| 连线 | 任意标签 | 叙事关系（冲突/替代/隶属/盟友） |
| 布局 | 手动或 templates | 反映情节因果、时间顺序、阵营对立 |
| AI 理解 | 通用文本分析 | 故事逻辑、角色弧光、世界观规则 |

**实现思路：**
- AI 不只看节点标签，还要理解节点描述、状态、关联的叙事上下文
- 每个节点有"叙事权重"（主角 vs 配角），影响布局和视觉表现
- AI 能做"故事理解"——给一个章节文本，就能更新画板

### 差异化 2：一致性检查引擎

Figjam 没有"正确性"概念。织梦机的画板有——世界观有内部逻辑。

**AI 一致性检查能力：**
- 时间线矛盾检测：事件 A 在事件 B 之前，但人物在 A 中死亡却在 B 中出场
- 角色关系冲突：人物 A 被标记为"盟友"但描述说"敌对"
- 设定规则违反：世界观说"魔法不能复活死者"，但节点描述中有复活事件
- 状态流检查：已废弃的设定是否还在其他地方被引用

**技术路径：** 将画板转换为逻辑断言集合 → LLM 或规则引擎推理 → 输出矛盾列表

### 差异化 3：灵感生成而非内容整理

Figjam AI 主要做**整理已有内容**（sort/summarize）。织梦机 AI 应该做**生成新内容**。

**灵感生成能力：**
- "基于当前人物关系，建议 3 个可能的剧情冲突"
- "这个世界缺少一个权力组织，建议一个并自动补全其在画板上的位置和关系"
- "时间线上 1850-1900 年是空白，建议 3 个可能发生的重要事件"
- "这个角色缺乏对立面，生成一个对立角色并建立冲突连线"

**技术路径：** LLM 基于画板状态做 constrained generation → 结构化结果写入画板

### 差异化 4：从"画板"到"世界观驾驶舱"

Figjam 是一个**白板工具**。织梦机的画板应该是**世界观的仪表盘**。

**高级能力：**
- **多视图联动** — 在画板修改节点属性，文档视图自动更新；在文档视图修改描述，画板节点自动更新
- **叙事热力图** — 显示哪些人物/事件在故事中"最活跃"（节点大小/颜色反映叙事权重）
- **版本对比** — 显示世界观在不同版本中的变化（哪些节点新增/删除/修改）
- **导览模式** — 按情节顺序引导读者/作者遍历画板，类似 keynote 式的 story tour

---

## 六、推荐实施路线

| 阶段 | 能力 | 借鉴来源 | 复杂度 | 价值 |
|------|------|---------|--------|------|
| **P0**（立即可做） | AI 智能布局分组 | Sort stickies | 低 | 高 |
| **P0**（立即可做） | 节点类型对连接建议 | Smart connectors | 低 | 中 |
| **P1**（短期） | AI 画板助手（对话） | Jambot | 中 | 高 |
| **P1**（短期） | 文本→画板生成 | Make templates | 中 | 高 |
| **P2**（中期） | 一致性检查引擎 | 差异化能力 | 中高 | 极高 |
| **P2**（中期） | 灵感生成 | 差异化能力 | 中高 | 高 |
| **P3**（长期） | 世界观驾驶舱 | 差异化能力 | 高 | 极高 |

### 快速赢（P0）的详细实现思路

#### P0-1：AI 智能布局分组

```typescript
// 无需 LLM，基于类型/标签的自动分组
interface AutoGroupRule {
  groupName: string;
  matchType?: string[];
  matchTags?: string[];
  matchStatus?: string[];
  layoutMode: 'cluster' | 'row' | 'column' | 'zone';
}

// 例：所有"组织"类型节点聚簇，所有"废弃"状态节点移到角落
const defaultRules: AutoGroupRule[] = [
  { groupName: '组织', matchType: ['组织'], layoutMode: 'cluster' },
  { groupName: '已废弃', matchStatus: ['废弃'], layoutMode: 'zone' },
];
```

#### P0-2：节点类型对连接建议

```typescript
// 预定义关系建议规则
const connectionSuggestions: Record<string, Record<string, string[]>> = {
  '人物': { '组织': ['隶属', '对立', '合作'], '地点': ['所在地', '目的地'] },
  '事件': { '人物': ['参与者', '推动者', '受害者'], '地点': ['发生地'] },
  // …
};
// 当用户选中两个节点时，自动弹出推荐的关系类型
```

---

## 七、总结

| 问题 | 答案 |
|------|------|
| **Figjam AI 有哪些画板 AI 功能？** | 文本生成画板、便签聚类/摘要、Jambot 对话助手、智能连线、Mermaid.js 渲染、MCP agent 集成 |
| **交互模式是什么？** | 全部显式触发（按钮/右键/对话），无自动建议 |
| **哪些可以直接借鉴？** | AI 智能布局分组（P0）、AI 画板助手（P1）、文本→画板生成（P1） |
| **哪些需要差异化？** | 叙事理解 AI、一致性检查引擎、灵感生成、世界观驾驶舱 |

**核心结论：** Figjam AI 的核心价值是**整理和呈现**——让白板上的内容更有条理。织梦机应该借鉴这个"整理"能力，但核心差异化方向是**理解和生成**——AI 要真正"读得懂"世界观，能检查逻辑矛盾，能主动建议叙事创意。织梦机不是在做一个更智能的白板，而是在做一个**会和作者一起思考的世界观工作台**。

---

## 参考来源

- [FigJam AI 官方页面](https://www.figma.com/figjam/ai/)
- [Introducing AI to FigJam — Figma Blog](https://www.figma.com/fr-fr/blog/introducing-ai-to-figjam/)
- [Use AI tools in FigJam — Figma Help](https://help.figma.com/hc/en-us/articles/16822138920343-Use-AI-tools-in-FigJam)
- [Make boards and diagrams with FigJam AI](https://help.figma.com/hc/en-us/articles/18706554628119-Make-boards-and-diagrams-with-FigJam-AI)
- [Create mindmaps in FigJam](https://help.figma.com/hc/en-us/articles/18917944627095-Create-mindmaps-in-FigJam)
- [Use Jambot in FigJam](https://help.figma.com/hc/en-us/articles/16783866441111-Use-Jambot-in-FigJam)
- [FigJam Is Now Your Coding Agent's Whiteboard — Figma Blog](https://www.figma.com/blog/figjam-your-coding-agents-whiteboard/)
- [Think Outside of the Box — with Claude and FigJam — Figma Blog](https://www.figma.com/blog/think-outside-of-the-box-with-claude-and-figjam/)
- [Config 2025 Press Release — Figma Blog](https://www.figma.com/blog/config-2025-press-release/)
- [Meet Figma AI — Figma Blog](https://www.figma.com/blog/introducing-figma-ai/)

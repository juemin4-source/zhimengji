# 织梦机 — 领域术语表 (CONTEXT)

> 建立日期：2026-07-09
> 来源：zhimengji-v2-prd.md + v2-migration-assessment-product.md
> 状态：v2.0 迁移评估期间建立

## 核心术语

### 画板（Canvas）

管道阶段工作空间。有阶段编号、输入依赖、输出契约、交互模式。

五画板：①前提·头脑风暴 → ②结构图·大纲 → ③设定 → ④细纲包 → ⑤正文

### 画板四态模型

画板的状态机，非 UI 样式：

| 状态 | 定义 | 允许操作 |
|------|------|---------|
| 未就绪 | 上游数据（输入依赖）不完整 | 查看说明，不可编辑 |
| 就绪 | 输入已准备就绪，等待用户开始 | 进入画板，开始操作 |
| 进行中 | 用户正在当前画板中操作 | 正常编辑/保存 |
| 已完成 | 画板产出已确认提交 | 回溯查看/修改 |

### 三态写入（Three-State Write）

AI 输出在画板数据上的写入模式，而非 UI 样式：

- **讨论型输出** — 仅在对话气泡中，不影响画板数据
- **建议型输出** — 以建议卡形式展示，用户采纳后才写入
- **写入型输出** — 直接填入画板字段，但需用户确认后才生效

### 管线数据依赖链

五个画板的产出数据之间是**不可逆转的数据依赖**：

```
①前提卡 → ②结构图 → ③角色+世界 → ④细纲包 → ⑤正文
```

不可逆转的含义：下游画板依赖上游画板的产出作为输入。用户可回溯修改上游画板，修改后下游数据通过 ID 引用自动同步（非复制）。

### 章节包（Chapter Packet）

织梦机的核心可交付资产。画板④产出的四层自包含数据包，可导出为纯文本后在任意 AI 工具中执行。

四层结构：
- Layer ① 写作契约（全书共享，风格锚点/人物声音/世界约束/禁忌）
- Layer ② 设定快照（本场角色简档/场景/活跃规则/知识边界）
- Layer ③ 剧情压缩层（功能/标题/压缩叙事/释放/建立/伏笔/临时假设）
- Layer ④ 执行层（场景列表/POV/知识边界/禁忌清单）

## 术语辨析（从评估中发现）

### "保留" vs "复用" vs "重建"

- **保留（Keep）**：组件可以直接使用，不做任何改动。示例：UI 原语（Button/Modal）。
- **改造（Adapt）**：组件的核心结构和逻辑不变，但在新的架构上下文中重新组织和布局。示例：TipTap 编辑器（需适配 65%/35% 分栏布局）、DocCard（需适配"待确认写入"流程）。
- **重建（Rebuild）**：组件需要依据新的设计重新实现，其功能和交互与旧版本有本质差异。示例：CanvasView → 画板②结构图（自由画布 → 地图缩放决策树）。

### "双轨" vs "双系统"

- **双轨（Dual-track）**：数据层（存储/查询）有两个来源并行运作（旧 WorldObject + 新领域模型），但 UI 层统一展示。这是一个过渡期策略，有时间窗口限制。
- **双系统（Two systems）**：产品层面有两个独立的数据管理系统。这是需要避免的永久状态。

### 关系纠正

> **画板②"大纲"**不等同于**旧 CanvasView"角色关系图/时间线/设定推演图"**。
> 
> 画板②是十二时位分形结构图+决策嵌入地图缩放，旧 CanvasView 是自由节点画布。两者是"交互范式级别的差异"，不只是"UI 风格不同"。

> **画板④"细纲包"**不等同于**"章纲"或"outline"**。
> 
> 细纲包是四层自包含数据包，其中包含的是"可被任意 AI 执行的指令集"，而非"给人类看的章纲摘要"。

## 迁移评估中的 ADR

### ADR-001：工程策略定为"重建架构 + 战术性复用"

**状态：** 已写入评估文档

**上下文：** GPT 第一个判断说"可以保留重组"，但深入分析发现绝大多数核心组件（5 个 Tab 中的 4 个）需要重建或大幅改造。

**决策：** 采用"重建架构 + 战术性复用"的策略。明确区分"保留层"、"改造层"和"重建层"。

**后果：**
- 工程团队需在 Sprint 0 为每个组件做出明确的"保留/改造/重建"标记
- 保留层的组件仍然需要适配新的路由/导航/状态管理架构
- 重建层的组件从 Phase 1A 开始使用新架构，不与旧实现混合

### ADR-002：旧 WorldObject 迁移采用"冻结写入口 → 读双轨 → 写时迁移 → 清理"四步策略

**状态：** 已写入评估文档

**决策理由：** 一次性全量迁移在大型项目中风险不可控（数据丢失、回滚困难）。按需迁移（写时迁移）对用户完全无感。冻结旧写入口确保不会产生新的旧格式数据。

**硬约束：** Phase 2 结束前必须冻结旧 WorldObject 存储路径。

### ADR-003：StructureNode 字段选择（Round B 设计决策）

**状态：** 此分析识别出 Round C 的依赖缺口

**上下文：** Round B 的 StructureNode 包含 title/nodeType/parentId/narrativeFunction/summary/position/sortOrder。Round C 的 ChapterPacket 需要额外三个信息：线路（line）、章节功能（chapterFunction enum）、时位显式引用。

**决策方向（推荐）：** StructureNode 增加 line 和 chapterFunction 字段，由画板②在用户生成结构时赋值，而非由画板④的 AI 重新推断。这保持画板②的决策权在画板②。

## 术语辨析（从 Round B→C 对齐分析中发现）

### "PremiseCard" vs "前提卡"

当前 PremiseCard 对应画板①产出的子集（前提句 + 追问 + 类型）。完整前提卡还应包含八字/六变分析，但 Round B 的 PremiseCard 不包含。Round C 可以直接使用 Round B 的字段，八字/六变数据可在 Round C 后期补充。

### "StructureNode" vs "结构图"

- **结构图（Structure Diagram）**：画板②的整体产出，是一个四层分形树（L1-L4）
- **结构节点（StructureNode）**：结构图中的原子单元，通过 parentId 构成树。Round B 中定义为 book/phase/position/chapter 四种类型

两者的关系：结构图是集合，结构节点是元素。画板④读取时通过 parentId 重建树结构。

### "线路（Line）" — Round C 必要字段

多线叙事中标记章节所属的故事线（如"地面线""太空线""地面线/太空线"）。当前 StructureNode 无此字段，Round C 必须补充。

### "章节功能（ChapterFunction）" — Round C 必要枚举

章节在全书的叙事功能，枚举值：opening/setup/escalation/reversal/reveal/relationship_shift/decision/aftermath/transition/climax/closure。当前 StructureNode 的 narrativeFunction 是自由文本，Round C 需要将此字段规范化或新增枚举字段。

### "CanvasTabState" vs "画板"（重要！）

- **CanvasTabState（v1 旧概念）**：旧版 CanvasView 的画布交互状态，包含节点位置/便利贴/连线。这是 v1 自由画布的遗留概念。
- **画板（v2 新概念）**：管道阶段的"工作空间"，有编号、输入依赖、输出契约、交互模式。与 CanvasTabState 是完全不同的概念。

**硬规则：** 在 v2 代码中提及"画板"时，应引用 PipelineState / CanvasStage 类型，而非 CanvasTabState 类型。CanvasTabState 仅在 v1 旧路径和 CanvasView 中使用。

### "角色状态（CharacterState）" vs "角色卡（CharacterCard）"

- **角色卡（CharacterCard）**：角色的静态属性和设计（钩子/所求/现实卡点）。Round B 已实现。
- **角色状态（CharacterState）**：角色随故事推进的动态变化（当前状态/关系变化/知识边界）。Round B 未建模。

Round C 必须新增 CharacterState 模型，因为 ChapterPacket Layer ② 需要"角色当前状态"字段。两者是互补关系，不是替代关系。

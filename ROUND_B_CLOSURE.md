# Round B 收口 — Owner 裁决记录

> 日期：2026-07-09
> 状态：PASS → CONTINUE to Round C

---

## 裁决 1：`accept:persistence` 补在 C0

B 轮机器验收缺少 SQLite CRUD smoke test。
C 轮首任务就是补 `npm run accept:persistence`。

**测试范围：**
- PremiseCard create/read/update
- StructureNode create/read/update/delete
- WorldRule create/read/update/delete
- CharacterCard create/read/update/delete
- FactionCard create/read/update/delete
- PipelineState confirmPremise/confirmStructure/confirmSetting

**要求：** 用临时数据库，不污染真实项目数据。

---

## 裁决 2：C 轮不新建 5 个实体

B→C 报告说的 "C 轮必须自建 ChapterPacket / WritingContract / KnowledgeStateMachine / Scene / 释放链追踪" **收窄为：**

C 轮只新增 **ChapterPacket** 一个主实体。
其余内容作为 ChapterPacket **内部 JSON 结构**：

| 原计划独立实体 | 改为 |
|---------------|------|
| WritingContract | ChapterPacket.layer① JSON |
| ActiveContext | ChapterPacket.layer② JSON |
| KnowledgeBoundary | ChapterPacket.layer④ JSON 字段 |
| ScenePlan | ChapterPacket.layer④ JSON |
| ReleaseChain | ChapterPacket.layer③ JSON |

不允许 C 轮过度建模。

---

## 裁决 3：StructureNode 升级安排

| 缺口 | 处理 |
|------|------|
| chapterFunction | C 轮补（structure.contract.ts 加字段） |
| line | C 轮预留字段 |
| CharacterState | 放进 ChapterPacket.activeContext，不单建表 |
| 咬合检查 | Phase 2，不阻塞 C |
| App.tsx 28+ useState | C/D 逐步拆 |

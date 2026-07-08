# 织梦机 (Zhimengji) 测试计划

## 概述

本文档定义织梦机的测试覆盖策略，以 7 条用户路径为核心。
每条路径按 MUST HAVE / NICE TO HAVE 标注，并指定自动化范围。

## 测试层级

| 层级 | 技术 | 覆盖范围 |
|------|------|---------|
| Rust 集成测试 | `cargo test` (rusqlite, 内存 SQLite) | 数据层 CRUD、序列化、级联删除 |
| 前端单元测试 | `vitest` + `@testing-library/react` (mock invoke) | API 层、UI 组件渲染 |
| 手动测试 | QA 人员操作 | 跨组件流程、Tauri 原生行为、UI 细节 |

## 7 条用户路径

---

### Path 1: Story Creation (MUST HAVE)

**流程：** Create book -> Write `[[?]]` -> Object appears in pool -> Drag to board -> Write scene

**覆盖策略：**

| 步骤 | 自动化 | 测试文件 / 方法 | 验证点 |
|------|--------|----------------|--------|
| Create book | Rust + Frontend | `test_project_crud` / `App:handleCreateProject` | projects 表插入，Bookshelf 显示新项目 |
| Write `[[?]]` | Manual | — | WikiLink 扩展在前端正常工作 |
| Object appears | Frontend | App:`onCreateObject` | objects 列表增加新 WorldObject |
| Drag to board | Frontend | `onAddToBoard` | object.selectedBoards 包含目标 board |
| Write scene | Manual | — | Tiptap 编辑器内容写入 |

**自动化范围：** Rust 覆盖 Project/WorldObject CRUD；前端覆盖创建流程、画板添加。
**手动测试项：** WikiLink 解析、Tiptap 编辑器交互、拖拽 UX。

---

### Path 2: Multi-Board (MUST HAVE)

**流程：** Board A -> Drop object -> Board B -> Drop same -> Change status -> Both sync

**覆盖策略：**

| 步骤 | 自动化 | 测试文件 / 方法 | 验证点 |
|------|--------|----------------|--------|
| Board A 添加对象 | Frontend | `onAddToBoard` | selectedBoards 包含 board A |
| Board B 添加同一对象 | Frontend | `onAddToBoard` | selectedBoards 同时包含 A 和 B |
| 改变 status | Rust + Frontend | `test_world_object_crud` / `onUpdateObject` | status 更新，两个 board 共享同一 object |
| 同步验证 | Rust | `get_world_object` | 同一 object 的 status 同步更新 |

**自动化范围：** Rust 验证 object 更新后数据一致性；前端验证 selectedBoards 数组操作。
**手动测试项：** UI 中两个 board 是否同时反映状态变化。
**未来自动化：** 集成测试可以创建 object、添加到两个 board、更新 status、读取验证。

---

### Path 3: Canon Management (MUST HAVE)

**流程：** Select character -> Promote to canon -> Setting set shows relevant -> Filter by canon level

**覆盖策略：**

| 步骤 | 自动化 | 测试文件 / 方法 | 验证点 |
|------|--------|----------------|--------|
| Select character | Frontend | App:`onSelectObject` | selectedObjectId 更新 |
| Promote to canon | Rust + Frontend | `test_judgment_record_append_and_query` / `onInspectorAction('收录为设定')` | canon_level 从 '未收录' 升为 '草案正典'；judgment_records 插入记录 |
| Setting set 显示 | Manual | — | SettingCollection 组件按 canonLevel 筛选 |
| Filter by canon | Manual | — | 筛选 UI 交互 |

**自动化范围：** Rust 验证 canon_level 字段变更和 judgment_record 生成；前端验证 canon_level 状态变更。
**手动测试项：** 筛选 UI、多对象在设定集中的展示。
**未来自动化：** 可为 SettingCollection 组件添加单元测试，mock 数据验证按 canonLevel 过滤的逻辑。

---

### Path 4: Judgment Recording (MUST HAVE)

**流程：** Lock judgment -> Record reason -> Discard -> Record reason -> Show both

**覆盖策略：**

| 步骤 | 自动化 | 测试文件 / 方法 | 验证点 |
|------|--------|----------------|--------|
| Lock judgment | Rust + Frontend | `test_judgment_record_append_and_query` / `addJudgment` | judgment_records 表插入 operation_type='锁定' |
| Record reason | Rust | `append_judgment_record` | reason 字段准确存储 |
| Discard judgment | Rust + Frontend | 同上 | operation_type='废弃' 的记录 |
| Show both | Rust | `list_judgment_records` / `get_judgment_records_for_object` | 返回全部记录，含锁定和废弃 |

**自动化范围：** Rust 完全覆盖 CRUD（追加、按对象查询、按项目查询）；前端验证 judgmentHistory 数组更新。
**手动测试项：** JudgmentRecords 组件的 UI 展示、时间戳排序。
**已自动化的 Rust 测试：** `test_judgment_record_append_and_query` 验证追加和查询。

---

### Path 5: Object Lifecycle (MUST HAVE)

**流程：** Create -> Placeholder -> Write -> Draft -> Lock -> Unlock -> Edit -> Re-lock

**覆盖策略：**

| 步骤 | 自动化 | 测试文件 / 方法 | 验证点 |
|------|--------|----------------|--------|
| Create object | Rust + Frontend | `test_world_object_crud` / `onCreateObject` | world_objects 表插入 |
| Status: placeholder | Rust | `update_world_object` | status 字段更新 |
| Write content | Rust | `update_world_object` | content 字段更新 |
| Status: draft | Rust | `update_world_object` | status 更新为 '草稿' |
| Lock | Rust | `append_judgment_record` + `update_world_object` | operation_type 记录锁定 |
| Unlock | Rust | 同上 | status 还原 |
| Edit | Rust | `update_world_object` | content/name 再次更新 |
| Re-lock | Rust | 同上 | status 再次锁定 |

**自动化范围：** Rust 完全覆盖 object 状态全生命周期（create -> update status -> update content -> multiple transitions）。
**手动测试项：** UI 中的锁定/解锁按钮交互、Inspector 面板上下文的即时更新。
**已自动化的 Rust 测试：** `test_world_object_crud` 验证创建和更新。

---

### Path 6: Cross-Book Isolation (MUST HAVE)

**流程：** Book A -> Unique features -> Book B -> Independent

**覆盖策略：**

| 步骤 | 自动化 | 测试文件 / 方法 | 验证点 |
|------|--------|----------------|--------|
| Book A 独特对象 | Rust | `test_project_crud` + `test_world_object_crud` | projectA 下 object 通过 project_id 隔离 |
| Book B 独立 | Rust | `list_world_objects(projectA) != list_world_objects(projectB)` | 不同 project_id 不互相污染 |
| 数据隔离 | Rust | `test_cascade_delete` | 删除 project 不删除其他 project 的 objects |

**自动化范围：** Rust 完全覆盖数据隔离：不同 project_id 的查询互不干扰。
**手动测试项：** UI 中切换项目时数据完全刷新、不残留前一个项目的数据。
**已自动化的 Rust 测试：** `test_project_crud` 验证多 project 创建；`test_world_object_crud` 使用独立 project_id。

---

### Path 7: Decision Chain (NICE TO HAVE)

**流程：** Problem -> Options -> Lock decision -> Discard -> Verify

**覆盖策略：**

| 步骤 | 自动化 | 测试文件 / 方法 | 验证点 |
|------|--------|----------------|--------|
| Problem 记录 | Rust | `create_world_object` (type='规则/机制') | 可作为 object 存储 |
| Options | Rust | 同上 | 多个 object 表示不同选项 |
| Lock decision | Rust | `append_judgment_record` |  judgment_record 记录决策锁定 |
| Discard | Rust | `append_judgment_record` + `update_world_object` | status 设为 '废弃' |
| Verify | Rust | `get_world_object` + `get_judgment_records_for_object` | 验证完整决策链记录 |

**自动化范围：** Rust 数据层支持完整的决策链 CRUD；UI 层目前无专用 DecisionChain 组件。
**手动测试项：** 决策链目前由 WorldObject + JudgmentRecord 组合实现，无独立 UI，需手动验证。
**未来自动化路径：** 添加独立的 DecisionChain React 组件后，为其编写单元测试 mock CRUD 操作。

---

## Rust 集成测试覆盖矩阵

| 测试函数 | 覆盖路径 | 验证点 |
|----------|---------|--------|
| `test_project_crud` | Path 1, 6 | create -> get -> list -> update -> delete |
| `test_world_object_crud` | Path 1, 5, 6 | create(含 judgment_history) -> get -> list_by_project -> update -> delete |
| `test_canvas_tab_state_serialization` | Path 2 | save(upsert) -> list -> JSON 字段序列化/反序列化 -> delete |
| `test_judgment_record_append_and_query` | Path 4, 7 | append -> get_by_object -> list_by_project |
| `test_connection_create_and_delete` | Path 1, 2 | create -> list -> delete |
| `test_cascade_delete` | Path 6 | delete project -> verify world_objects & connections cascaded |

## 前端测试覆盖矩阵

| 测试文件 | 覆盖路径 | 验证点 |
|---------|---------|--------|
| `api.test.ts` | 全部 | 所有 tauri-api 函数用 mock invoke 验证调用参数和返回值 |
| `Bookshelf.test.tsx` | Path 1 | 空状态渲染、项目卡片渲染、创建/进入回调 |
| `App.test.tsx` | Path 1, 3, 4 | 加载状态、Bookshelf 渲染、创建项目、进入项目、对象操作 |

## 未来自动化计划

1. **CanvasView 测试** — 当前依赖 @xyflow/react 画布渲染，需添加集成测试 mock 画布交互
2. **Cross-Book Isolation 前端测试** — App 级测试验证切换项目时数据刷新
3. **Decision Chain 组件测试** — 添加专用组件后补充
4. **WikiLink 扩展测试** — Tiptap Extension 级别的单元测试
5. **E2E 测试** — 使用 Playwright 或 WebDriverIO 完整的 Tauri 应用测试

## 手动测试清单

1. `[[WikiLink]]` 输入与解析
2. Tiptap 编辑器内容编辑与保存
3. 画布拖拽交互
4. 画布缩放与平移
5. 设定集按正典级别筛选
6. 切换项目时的数据完整性
7. Decision Chain 完整流程（无独立 UI）

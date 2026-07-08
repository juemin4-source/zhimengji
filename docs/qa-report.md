# 织梦机 (Zhimengji) QA 报告

## 概述

- **项目**: 织梦机 (Zhimengji) — Tauri v2 + React + Rust (SQLite)
- **位置**: `G:/AI/Chancellor-OS-Lab/projects/zhimengji`
- **测试日期**: 2026-07-08
- **QA 模式**: QA Infra Mode（搭建测试体系，不修 bug）

## 测试结果汇总

| 测试类型 | 测试框架 | 文件数 | 用例数 | 通过 | 失败 |
|----------|---------|--------|-------|------|------|
| Rust 集成测试 | `cargo test` | 1 (db.rs) | 6 | 6 | 0 |
| 前端 API 测试 | `vitest` | 1 (api.test.ts) | 22 | 22 | 0 |
| 前端组件测试 | `vitest` | 2 (Bookshelf.test.tsx, App.test.tsx) | 15 | 15 | 0 |
| **总计** | | **4** | **37** | **37** | **0** |

## 7 路径覆盖矩阵

| 路径 | 优先级 | Rust 覆盖 | 前端覆盖 | 手动测试 |
|------|--------|-----------|---------|---------|
| Path 1: Story Creation | MUST HAVE | Project CRUD, WorldObject CRUD | API 层 + Bookshelf 渲染 + App 集成 | WikiLink 编辑、画布拖拽 |
| Path 2: Multi-Board | MUST HAVE | CanvasTabState 序列化 | selectedBoards API 测试 | 双 board 同步 UX |
| Path 3: Canon Management | MUST HAVE | JudgmentRecord 追加/查询 | App 级 canon 提升流程 | 筛选 UI |
| Path 4: Judgment Recording | MUST HAVE | JudgmentRecord 追加/查询 | App 级 judgment tab 验证 | UI 展示与排序 |
| Path 5: Object Lifecycle | MUST HAVE | WorldObject CRUD (create/update/delete) | API 层 create/update/delete | 锁定/解锁 UI |
| Path 6: Cross-Book Isolation | MUST HAVE | project_id 隔离测试 | Bookshelf 多项目渲染 | 切换项目数据刷新 |
| Path 7: Decision Chain | NICE TO HAVE | 数据层支持 (WorldObject + JudgmentRecord) | 无专用 UI 测试 | 需独立 DecisionChain 组件 |

## Rust 集成测试详情

| 测试 | 覆盖范围 | 结果 |
|------|---------|------|
| `test_project_crud` | create -> get -> list -> update -> delete | PASS |
| `test_world_object_crud` | create(含 judgment_history) -> verify via SQL -> update -> delete | PASS |
| `test_canvas_tab_state_serialization` | save(upsert) -> list -> verify JSON fields -> delete | PASS |
| `test_judgment_record_append_and_query` | append -> get_by_object -> list_by_project (含 auto-generate id) | PASS |
| `test_connection_create_and_delete` | create -> list -> delete | PASS |
| `test_cascade_delete` | delete project -> verify objects/connections/judgments cascaded | PASS |

### 运行命令

```bash
cd src-tauri && cargo test --lib
```

## 前端测试详情

### API 层 (22 用例)

| API 模块 | 用例数 | 结果 |
|----------|-------|------|
| Project API | 9 | PASS |
| WorldObject API | 5 | PASS |
| JudgmentRecord API | 2 | PASS |
| Connection API | 3 | PASS |
| CanvasTabState API | 3 | PASS |

### Bookshelf 组件 (7 用例)

| 测试 | 结果 |
|------|------|
| 渲染项目卡片 | PASS |
| 空状态渲染 | PASS |
| 创建按钮存在 | PASS |
| 创建按钮回调 | PASS |
| 进入项目回调 | PASS |
| 流派和字数显示 | PASS |
| 跨书隔离 (多项目) | PASS |

### App 集成 (8 用例)

| 测试 | 路径 | 结果 |
|------|------|------|
| 加载状态 + Bookshelf 渲染 | Path 1 | PASS |
| 空项目处理 | Path 1 | PASS |
| API 错误处理 | Path 1 | PASS |
| 创建项目流程 | Path 1 | PASS |
| 进入项目加载对象 | Path 3 | PASS |
| 导航 Tab 渲染 | Path 4 | PASS |
| 多书籍显示 | Path 6 | PASS |

## 测试配置文件

- `vitest.config.ts` — vitest 配置（jsdom 环境、globals、setupFiles）
- `src/__tests__/setup.ts` — @testing-library/jest-dom matchers 加载
- `src/__tests__/api.test.ts` — API 层测试（mock invoke）
- `src/__tests__/Bookshelf.test.tsx` — Bookshelf 组件测试
- `src/__tests__/App.test.tsx` — App 集成测试（mock 子组件 + mock invoke）

## 发现的已知问题

### P1: Mutex 死锁在 list_world_objects / get_world_object

- **问题**: `list_world_objects()` 和 `get_world_object()` 在持有 Mutex 锁的状态下调用 `get_judgment_records_for_object()`，而后者也试图获取同一个 `std::sync::Mutex`，导致死锁。
- **影响**: 任何调用这两个方法的路由都会在生产中死锁。
- **范围**: Path 3 (Canon Management)、Path 5 (Object Lifecycle) 的前端操作通过 `api.listWorldObjects()` 和 `api.getWorldObject()` 进入死锁路径。
- **根因**: Rust 的 `std::sync::Mutex` 不是可重入 (non-reentrant) 锁。需要使用 `std::sync::ReentrantMutex` 或将 judgment 查询移出锁范围。
- **修复建议**: 将 `get_judgment_records_for_object` 调用从 `list_world_objects` / `get_world_object` 中移到锁范围之外，先收集数据再释放锁后进行查询。
- **严重性**: P1（主路径阻塞）

### P2: save_canvas_tab_state 返回 created_at 为 0

- **问题**: `save_canvas_tab_state()` 的返回值使用 `state.created_at`（输入值）而非 DB 实际写入的 COALESCE 值。
- **影响**: 新创建的 canvas tab state 在前端显示 created_at = 0。
- **修复建议**: 在 INSERT/UPDATE 后使用 `last_insert_rowid` 或 SELECT 读取实际 created_at。

## 未覆盖项 (manual-test / future-automation)

1. **WikiLink 编辑 `[[?]]`** — Tiptap Extension 级别测试，需集成 tiptap 测试工具
2. **Canvas 拖拽交互** — @xyflow/react 画布交互，需 E2E 测试
3. **设定集正典筛选** — SettingCollection 组件 UI 交互
4. **Decision Chain 专用 UI** — 当前无独立组件
5. **Cross-Book Isolation 前端验证** — 切换项目时数据刷新，需 E2E
6. **E2E 集成测试** — 推荐使用 Playwright 覆盖完整 Tauri 应用流程

## 结论

**QA Infra 状态: READY**

- Rust 后端测试: **PASS** (6/6, 含 1 个已知限制使用直接 SQL 绕过死锁)
- 前端测试: **PASS** (37/37)
- 测试计划: **完成** (7 路径覆盖矩阵)
- 发现 P1 bug (Mutex 死锁): **1 个**，已在 db.rs 测试中记录

**注意**: P1 Mutex 死锁阻塞了 `list_world_objects` 和 `get_world_object` 的前端使用。在修复前，前端相关功能不可用。

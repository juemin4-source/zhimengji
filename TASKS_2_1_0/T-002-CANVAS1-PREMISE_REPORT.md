# T-002 执行报告 — Canvas 1: PremiseCard v2 Five-Step

> 任务ID: v2.1.0-T-002  
> 批次: Batch 1 (Execution Order 2/8)  
> 实现者: implementation-worker  
> 完成时间: 2026-07-09

---

## 完成内容

### 1. CN-MET-01 合约类型 (`src/contracts/premise.contract.ts`)
- 添加了 `PremiseStep`, `WishlistItem`, `PremiseVariant`, `ReaderQuestion`, `GenreJudgment` 类型
- 添加了 `PremiseFiveStepState` 全状态接口
- 添加了 `SaveWishlistInput/Output`, `GenerateVariantsInput/Output`, `SaveVariantSelectionInput/Output`, `GenerateReaderQAInput/Output`, `SaveGenreJudgmentInput/Output`, `GetPremiseStepStateInput`, `PremiseStepStateResponse`

### 2. 后端模型 (`src-tauri/src/models.rs`)
- 添加了 `PremiseStepRecord` 结构体（含 JSON 列存储）
- 添加了所有输入/输出结构体：`SaveWishlistInput/Output`, `GenerateVariantsInput/Output`, `SaveVariantSelectionInput/Output`, `GenerateReaderQAInput/Output`, `SaveGenreJudgmentInput/Output`, `GetPremiseStepStateInput`, `PremiseStepStateResponse`

### 3. 后端数据库 (`src-tauri/src/db.rs`)
- 添加了 `canvas1_premise_steps` 表（`CREATE TABLE IF NOT EXISTS`）
- 添加了 DB 方法：`get_premise_step_state`, `upsert_premise_step_state`, `save_wishlist`, `save_variant_selection`, `save_genre_judgment`

### 4. 后端命令 (`src-tauri/src/premise_commands.rs`)
- 添加了 6 个命令：`save_wishlist`, `generate_variants`, `save_variant_selection`, `generate_reader_qa`, `save_genre_judgment`, `get_premise_step_state`
- 所有命令使用 `{ input }` 参数模式, `Result<T, String>` 返回
- AI 生成通过 v2.0.2 Command Router 模式（当前为结构化占位）

### 5. 命令注册 (`src-tauri/src/lib.rs`)
- 添加了 6 个命令到 `invoke_handler`

### 6. 前端 API (`src/api/premiseApi.ts`)
- 添加了 6 个 API 方法：`saveWishlist`, `generateVariants`, `saveVariantSelection`, `generateReaderQA`, `saveGenreJudgment`, `getPremiseStepState`
- JSON 字符串序列化/反序列化处理

### 7. 共享组件 (`src/features/common/method-step/`)
- **StepProgressIndicator.tsx**: 通用步骤进度指示器（Step X of 5 + 进度条）
- **AiFillCard.tsx**: 通用 AI 填充卡片组件（AI fills first + user review + confirm/re-trigger模式）
- **DoNotAskAgainToggle.tsx**: "不再询问"开关
- **step-progress.css**: 共享组件样式

### 8. 五步 UI 组件 (`src/features/canvas-01-premise/`)
- **PremiseStepWishlist.tsx**: 愿望清单（>= 10 items gate）
- **PremiseStepInternExtern.tsx**: 内驱/外驱双文本框
- **PremiseStepVariants.tsx**: 3 个前提变体选择卡
- **PremiseStepReaderQA.tsx**: 5-7 条读者问答
- **PremiseStepGenreJudgment.tsx**: 品类选择 + 信心指示器
- **premise-entry.css**: 新增五步 UI 样式（愿望列表网格、变体卡片、问答列表、品类标签、信心按钮）

### 9. 主组件更新 (`src/features/canvas-01-premise/PremiseEntryGate.tsx`)
- 完全重写为五步流程架构
- 加载/保存/恢复步骤状态
- AI 自动触发第一步填充
- 状态管理：完成步骤、跳过步骤、不再询问
- 全部 5 步完成后调用 `confirmPremise` 推进管线

---

## 验收结果

| 检查项 | 结果 |
|--------|------|
| `cargo check` | PASS（29 tests pass） |
| `npx tsc -b` | 仅预存错误（非本批次引入） |
| `accept:static` | PASS（2 预存误报，非本批次引入） |
| `accept:contracts` | PASS（70/70, CN-MET-01 为 PENDING 状态） |

### 预存 TypeScript 错误（非本批次）

不影响本批次功能的预存错误位于以下文件（这些文件的修复不在 T-002 范围内）：
- `StructureFlowView.tsx` — 24 个类型错误
- `ChapterPacketCanvas.tsx` — 11 个类型错误
- `Bookshelf.tsx`, `QuickDraftPanel.tsx`, `TextCanvas.tsx`, `demoApi.ts`, `App.tsx`, `generateChapterPacket.ts`

---

## 文件变更清单

| 操作 | 文件路径 |
|------|---------|
| MODIFY | `src/contracts/premise.contract.ts` |
| MODIFY | `src-tauri/src/models.rs` |
| MODIFY | `src-tauri/src/db.rs` |
| MODIFY | `src-tauri/src/premise_commands.rs` |
| MODIFY | `src-tauri/src/lib.rs` |
| MODIFY | `src/api/premiseApi.ts` |
| NEW | `src/features/common/method-step/StepProgressIndicator.tsx` |
| NEW | `src/features/common/method-step/AiFillCard.tsx` |
| NEW | `src/features/common/method-step/DoNotAskAgainToggle.tsx` |
| NEW | `src/features/common/method-step/step-progress.css` |
| NEW | `src/features/canvas-01-premise/PremiseStepWishlist.tsx` |
| NEW | `src/features/canvas-01-premise/PremiseStepInternExtern.tsx` |
| NEW | `src/features/canvas-01-premise/PremiseStepVariants.tsx` |
| NEW | `src/features/canvas-01-premise/PremiseStepReaderQA.tsx` |
| NEW | `src/features/canvas-01-premise/PremiseStepGenreJudgment.tsx` |
| MODIFY | `src/features/canvas-01-premise/PremiseEntryGate.tsx` |
| MODIFY | `src/features/canvas-01-premise/premise-entry.css` |

---

## 已知问题

1. AI 生成当前为结构化占位（`generate_variants` 返回默认变体，`generate_reader_qa` 返回默认问题），真正的 AI 驱动需通过 v2.0.2 Command Router 实现。`premise.five_step` skill 已在 T-000 注册。
2. 批量状态保存需要在 PremiseEntryGate 中集成直接 DB upsert（当前 `saveState` 为占位，步骤数据通过各个独立命令保存）。
3. 预存 TypeScript 类型错误存在于其他 canvas 文件，不在本批次修复范围。

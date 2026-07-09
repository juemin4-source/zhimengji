# V2_0_H_SCOPE_FREEZE_PLAN

> 状态：正式冻结。前置文档：zhimengji-v2-prd-v0.3.1.md 第 5 节、V2_0_SCOPE_FREEZE_PLAN.md
> 编码开始前必须通过 Chancellor 签字。

## 1. 战役定义

补 Round D 四项缺口，让 v2.0 从 UI 完备升级为端到端可验收状态。

**完成后状态：** AI 三条路径（discuss/suggest/write_preview）各自走真实路由，写入受 Control Gate 保护；Driver E2E 在真实 Tauri 窗口走通 ①→②→③→④→⑤ 完整路径并验证持久化。

**硬规则：** 不新增功能，不改现有 contract 结构字段，不碰画板组件内核逻辑。

## 2. AI 三态真实路由

### 2.1 三条路径行为定义

| 路径 | 触发方式 | DB 写入时机 | DecisionLog |
|------|---------|-------------|-------------|
| **discuss** | CanvasAiBar 发送，outputType=discuss | 永不写入 DB。仅 ChatDrawer 展示对话气泡。 | 不写 |
| **suggest** | CanvasAiBar 发送，outputType=suggest | 采纳前不写入任何画板实体表。AI 建议卡暂存前端运行时。用户点"采纳"时写入对应画板 + DecisionLog。点"驳回"仅写 DecisionLog。 | `ai_suggestion_accepted` / `ai_suggestion_rejected` |
| **write_preview** | CanvasAiBar 发送，outputType=write_preview | 确认前不写入正式数据。预览暂存前端运行时。点"确认"写入正式数据 + DecisionLog。点"放弃"仅写 DecisionLog。 | `write_preview_confirmed` / `write_preview_rejected` |

### 2.2 数据流图

```
CanvasAiBar ──outputType──→ AI Router
     │                     ┌──────┴──────┐
     ▼                     │             │
ChatDrawer            suggest      write_preview
(不写DB)             采纳/驳回      确认/放弃
                       │   │         │   │
                    写入画板 写DecisionLog  写入画板 写DecisionLog
                    +写Log  (不写画板)    +写Log  (不写画板)
```

### 2.3 具体修改点

**(a) CanvasAiBar.tsx** — 发送按钮接真实 AI router。当前仅触发展示 ChatDrawer。修改：发送时带 `outputType`，`discuss` → llm-client → ChatDrawer，`suggest` → 生成建议卡 → AiSuggestionCard，`write_preview` → 生成预览 → AiWritePreviewPanel。

```
contract: CanvasAiBar.onSend(message: string, outputType: AiOutputType)
  → discuss: Promise<AiReply>
  → suggest: Promise<AiSuggestion>
  → write_preview: Promise<AiPreview>
```

**(b) ChatDrawer.tsx** — 接收 discuss 路径。不写 DB。

**(c) AiSuggestionCard.tsx** — "采纳"调对应画板写入 API + decisionLogApi 追加 `ai_suggestion_accepted`；"驳回"仅写 DecisionLog。

**(d) AiWritePreviewPanel.tsx** — "确认"调正式写入 API + 写 DecisionLog；"放弃"仅写 DecisionLog。

**(e) generateChapterPacket.ts / generateDraft.ts** — 只改路由层，不改内部业务逻辑。

**(f) decisionLogApi.ts** — 不新增方法。使用已有 `appendDecisionLog`。

**(g) decision-log.contract.ts** — 只追加 DecisionOperation 枚举值（`ai_suggestion_created/accepted/rejected`、`write_preview_created/confirmed/rejected` 已存在）。不删不改。

**(h) Rust 端** — `decision_log_commands.rs` 可追加新 command；`db.rs` 仅追加 decision_logs 相关查询；`models.rs` 仅追加 input struct；`lib.rs` 仅注册。

### 2.4 DecisionLog 扩展规则

现有枚举已覆盖 v2.0-H 全部需要。若运行时发现缺操作类型：只追加，不删旧值。

`details` 字段约定：结构化 JSON：`{ outputType, suggestionSummary, targetCanvas, aiModel, aiPromptPreview? }`

## 3. Driver E2E

### 3.1 最小验收路径（10 步）

```
Step  Action                              Expected
──────────────────────────────────────────────────────
 ①  启动 Tauri dev 窗口                  无白屏/崩溃
 ②  创建新项目（书架→新建）              项目出现
 ③  PipelineNav 状态正确                 stage=premise active
 ④  填写前提卡并确认                     保存，stage→structure
 ⑤  添加 4 层结构节点（book→phase→position→chapter）   stage→setting
 ⑥  填写设定（≥1 规则 + ≥1 角色）        stage→packet
 ⑦  创建章节包并确认                     stage→text
 ⑧  AI 生成正文并确认写入                stage=text done
 ⑨  关闭 Tauri 窗口                      干净退出
 ⑩  重启 Tauri，打开同一项目             全部数据恢复
```

### 3.2 基础设施要求

| 当前状态 | v2.0-H 目标 |
|---------|-------------|
| `npm run accept:e2e` 不存在 | 新增命令，等价 `npm run e2e:tauri` |
| `e2e/tauri/real-app.spec.ts` 存在未覆盖 | 覆盖 10 步 |
| 使用 addInitScript mock | 去 mock，走真实 Tauri IPC |
| 无持久化验证 | 第 10 步重启进程验证 |

## 4. 文件锁定清单

### Allowed Write

```
src/components/ai/CanvasAiBar.tsx        — 发送按钮接真实 AI router
src/components/ai/ChatDrawer.tsx          — discuss 路径消息展示
src/components/ai/AiSuggestionCard.tsx    — 采纳/驳回接后端写入
src/components/ai/AiWritePreviewPanel.tsx — 确认/放弃接后端写入
src/lib/ai-output.ts                     — 可追加 AiOutputType（只加不减）
src/lib/generateChapterPacket.ts         — 修正路由（不改内部逻辑）
src/lib/generateDraft.ts                 — 修正路由（不改内部逻辑）
src/api/decisionLogApi.ts                — 不修改方法签名
src/contracts/decision-log.contract.ts   — 只追加枚举值
src-tauri/src/decision_log_commands.rs   — 可追加新 command
src-tauri/src/db.rs                      — 仅追加 decision_logs 方法
src-tauri/src/models.rs                  — 仅追加 input struct
src-tauri/src/lib.rs                     — 仅注册新增 command
e2e/tauri/real-app.spec.ts              — 重写为 10 步
e2e/tauri/smoke.spec.ts                 — 可修改
e2e/v2-golden-path.spec.ts             — 可删 mock 或 deprecated
scripts/acceptance/                      — 可追加验收脚本
package.json                             — 仅追加 accept:e2e
```

### Read Only

```
src/contracts/ 中除 decision-log 外的全部
src/api/ 中除 decisionLogApi 外的全部
src/stores/ 全部
src-tauri/ 中除 decision_log 外的全部 Rust command
src-tauri/src/db.rs 中非 decision_logs 方法
src-tauri/src/models.rs 中已有 struct
```

### Forbidden

```
src/features/canvas-01-premise/  ~  canvas-05-text/   — 画板内核，不动
src/features/pipeline-canvas/  src/features/pipeline-nav/
src/App.tsx                                         — 需 Chancellor 特批
现有 contract 核心字段                             — 只读
已有 DB 表结构（除 decision_logs 追加外）            — 不可改
src/components/ai/AIChat.tsx  AiSettings.tsx  DocCard.tsx  — Legacy，不碰
```

## 5. Out of Scope

| 领域 | 归属版本 |
|------|---------|
| PremiseCard v2 五步流程 / StructureGraph L1-L4 地图缩放 / 麻雀模式 9+3 / ChapterPacket 三档细度 | v2.1.0 |
| 七诊 / 八体 / 知识边界检测 | v2.2 |
| 反向管道 | v2.3 |
| Cost Meter | v2.4 |
| AI Control Center v2 | v2.0.2 |
| App.tsx 重构 / Undo-Redo / 现有组件重构 | 不属本轮 |

## 6. 验收命令

```bash
cargo check                                      # 后端编译
npm run tsc -- --noEmit                           # 前端类型检查
npm run accept:static                             # 静态规则
npm run accept:css                                # CSS 合规
npm run accept:contracts                          # Contract Chain
npm run accept:persistence                        # 持久化
npm run accept:e2e                                # Driver E2E (10步)
npm run accept                                    # 全量 (上述除 e2e)
```

## 7. AI 三态验收表

| # | 验收项 | 预期 | 验证方式 |
|---|--------|------|---------|
| 1 | discuss 后 DB 无正式写入 | 发送前后 DB 行数不变 | 对比 DB |
| 2 | discuss 回复展示于 ChatDrawer | ChatDrawer 出现 AI 气泡 | UI 断言 |
| 3 | suggest 生成后 DB 无正式写入 | DB 行数不变 | 对比 DB |
| 4 | suggest accepted 写入 + DecisionLog | 画板数据新增 + log 含 `ai_suggestion_accepted` | DB + Log |
| 5 | suggest rejected 仅写 DecisionLog | DB 无新增 + log 含 `ai_suggestion_rejected` | DB + Log |
| 6 | write_preview 生成后 DB 无正式写入 | DB 行数不变 | 对比 DB |
| 7 | write_preview confirmed 写入 + DecisionLog | 画板数据新增 + log 含 `write_preview_confirmed` | DB + Log |
| 8 | write_preview rejected 仅写 DecisionLog | DB 无新增 + log 含 `write_preview_rejected` | DB + Log |

**规则：** 8 项全部 PASS 方可标记 AI 三态验收通过。任意 FAIL → blocker。

## 8. 交付报告格式 (V2_0_H_CLOSURE.md)

Worker 编码完成后输出至项目根目录：

```markdown
# V2_0_H_REPORT

## Verdict
PASS / PASS_WITH_NOTES / FAIL

## Files Changed
[路径] — 修改摘要

## What Was Implemented / Not Implemented

## Acceptance Results (全部命令结果 PASS/FAIL)

## E2E Result (10 步逐项 PASS/FAIL)

## AI Tri-state Result (8 项逐项 PASS/FAIL)

## Known Issues
## Next Recommended Step
```

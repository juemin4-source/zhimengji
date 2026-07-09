# TASK: AI 三态真实路由

## 目标

将 CanvasAiBar 从 mock 回声替换为真实 AI 三态路由（discuss / suggest / write_preview），使三条路径各自走真实数据流、受 Control Gate 保护、写入受决策日志审计。

## 前置依赖

- Scope Freeze: V2_0_H_SCOPE_FREEZE_PLAN.md
- 前置 Ticket: 无（本 Ticket 优先执行）

## In Scope

1. **CanvasAiBar 接真实 AI router** — 发送时带 outputType，不再使用 mock setTimeout 回声
   - discuss → 调 llm-client，回复展示于 ChatDrawer，不写 DB
   - suggest → 生成建议卡 → AiSuggestionCard，采纳前不写 DB
   - write_preview → 生成预览 → AiWritePreviewPanel，确认前不写正式数据
2. **CanvasAiBar 增加 outputType 选择器** — 用户可在发送前切换 discuss / suggest / write_preview 模式
3. **ChatDrawer 接收 discuss 路径** — 来自真实 AI 回复（非 mock），保持不写 DB
4. **AiSuggestionCard 接入后端** — "采纳"调用对应画板写入 API + decisionLogApi.appendDecisionLog 追加 `ai_suggestion_accepted`，"驳回"仅写 DecisionLog
5. **AiWritePreviewPanel 接入后端** — "确认"调用正式写入 API + 写 DecisionLog，"放弃"仅写 DecisionLog
6. **generateChapterPacket.ts / generateDraft.ts 路由修正** — 按 outputType 决定是否写 DB（只改路由层，不改 prompt 构建/AI 调用/解析内部逻辑）
7. **DecisionLog 衔接** — 采纳/驳回/确认/放弃各路径均产生对应 DecisionLog entry
8. **数据流闭合** — 三种 outputType 的全生命周期（发送 → AI 响应 → 用户决策 → 写入/放弃）端到端验证

## Out of Scope

- PremiseCard v2 / StructureGraph L1-L4 / 麻雀模式 / 三档细度
- 七诊 / 八体 / 知识边界 / 反向管道 / Cost Meter
- AI Control Center v2 / v2.0.1 / v2.1.0 方法论骨架
- 画板内核组件（canvas-01-premise ~ canvas-05-text）的业务逻辑
- App.tsx 重构 / Undo-Redo / 现有组件重构
- ChatDrawer / AiSuggestionCard / AiWritePreviewPanel 的 UI 样式翻新（仅数据流对接）

## Allowed Write

只有以下 7 个文件真正需要修改。其余 Scope Freeze 中的文件（decisionLogApi / decision-log.contract / Rust 端）当前已具备全部所需方法/枚举/命令，除非运行时发现确实缺少，否则不得触碰。

| 文件 | 修改范围 |
|------|---------|
| `src/components/ai/CanvasAiBar.tsx` | 添加 outputType 选择器 + 真实 AI 路由（discuss→ChatDrawer / suggest→AiSuggestionCard / write_preview→AiWritePreviewPanel） |
| `src/components/ai/ChatDrawer.tsx` | 对接真实 AI 回复（移除 mock 假设），数据流不改 UI 结构 |
| `src/components/ai/AiSuggestionCard.tsx` | "采纳"调对应画板写入 API + appendDecisionLog；"驳回"仅调 appendDecisionLog |
| `src/components/ai/AiWritePreviewPanel.tsx` | "确认"调正式写入 API + appendDecisionLog；"放弃"仅调 appendDecisionLog |
| `src/lib/generateChapterPacket.ts` | 路由层：按 outputType 决定是否立即写入 DB（suggest/write_preview 返回内容但不提交） |
| `src/lib/generateDraft.ts` | 路由层：按 outputType 决定是否立即写入 DB（suggest/write_preview 返回内容但不提交） |
| `src/api/decisionLogApi.ts` | 仅当现有 `appendDecisionLog` 签名不满足需求时才允许修改——禁止改方法名 |

### 例外：以下文件仅当运行时发现缺失时才可修改（原则上不需动）

| 文件 | 条件 |
|------|------|
| `src/lib/ai-output.ts` | 仅当需要新增 AiOutputType 枚举值（当前 discuss/suggest/write_preview 已完整） |
| `src/contracts/decision-log.contract.ts` | 仅当需要新增 DecisionOperation 枚举值（当前已有 ai_suggestion_created/accepted/rejected + write_preview_created/confirmed/rejected，已覆盖全部） |
| `src-tauri/src/decision_log_commands.rs` | 仅当需要新增 Tauri command（当前 append/list/get 已完整） |
| `src-tauri/src/db.rs` | 仅当 decision_logs 相关方法缺失时追加 |
| `src-tauri/src/models.rs` | 仅当 input struct 缺失时追加 |
| `src-tauri/src/lib.rs` | 仅当注册了新的 command 时追加 |

## Read Only

```
src/contracts/ 中除 decision-log.contract 外的全部
src/api/ 中除 decisionLogApi 外的全部
src/stores/ 全部
src-tauri/ 中除 decision_log 外的全部 Rust command
src-tauri/src/db.rs 中非 decision_logs 方法
src-tauri/src/models.rs 中已有 struct
src/features/canvas-01-premise/  ~  canvas-05-text/
src/features/pipeline-canvas/  src/features/pipeline-nav/
src/App.tsx
src/lib/llm-client.ts            — 只允许调用，不允许修改
src/types/ai.ts                  — 只读
```

## Forbidden

```
前端直接调用 invoke() 绕过 api 层
修改现有 contract 核心字段
修改已有 DB 表结构（除 decision_logs 追加外）
使用 mock 数据代替真实 AI 调用
在 discuss 路径中写入 DB
在 suggest 路径中未经采纳写画板数据
在 write_preview 路径中未经确认写正式数据
修改 AIChat.tsx / AiSettings.tsx / DocCard.tsx 三个 legacy 文件
```

## 施工顺序

```
Step 1: CanvasAiBar — 添加 outputType 选择器 UI + 状态管理
Step 2: CanvasAiBar — 替换 handleSend 为真实 AI 路由
        - discuss → 调 callLlm → 结果以 ChatMessage 放入 messages → ChatDrawer 展示
        - suggest → 调 callLlm（或 generateChapterPacket/generateDraft 路由）→ 创建 AiSuggestionCard 状态
        - write_preview → 调 generateChapterPacket/generateDraft → 创建 AiWritePreviewPanel 状态
Step 3: ChatDrawer — 验证接收真实 discuss 回复（当前已支持，仅需确认 outputType 传递）
Step 4: AiSuggestionCard — onAccept 调用后端写入 API + appendDecisionLog({ operation: 'ai_suggestion_accepted' })
        onDismiss 调用 appendDecisionLog({ operation: 'ai_suggestion_rejected' })
Step 5: AiWritePreviewPanel — onConfirm 调用后端写入 API + appendDecisionLog({ operation: 'write_preview_confirmed' })
        onAbandon 调用 appendDecisionLog({ operation: 'write_preview_rejected' })
Step 6: generateChapterPacket / generateDraft — 按 outputType 路由：
        - outputType === undefined → 当前行为（直接写 DB 返回结果）
        - outputType === 'suggest' → 只生成内容，不写 DB，返回 raw content
        - outputType === 'write_preview' → 只生成内容，不写 DB，返回 raw content
Step 7: 编译验证 + 8 项验收
```

## 验收命令

```bash
cargo check                              # 后端编译
npm run tsc -- --noEmit                   # 前端类型检查
npm run accept:static                     # 静态规则
npm run accept:contracts                  # Contract Chain
npm run accept:persistence                # 持久化（含 DecisionLog）
```

## 手动验收路径

```
前提: Tauri 已配置 API Key（AI 可真实调用）

1. 启动 Tauri dev 窗口
2. 进入任意画板（premise / structure / setting / packet / text）
3. 在 CanvasAiBar 中选择 outputType = discuss，输入消息，点发送
   → 验证: ChatDrawer 弹出，AI 回复以气泡展示
   → 验证: 查看 DB，decision_logs 表无新增行
4. 选择 outputType = suggest，输入消息，点发送
   → 验证: AiSuggestionCard 出现
   → 验证: 查看 DB，画板数据无变化，decision_logs 无新增行
5. 点"采纳"
   → 验证: DB 画板数据新增，decision_logs 新增一条 ai_suggestion_accepted
6. 选择 outputType = suggest，输入消息，点"驳回"
   → 验证: DB 画板数据无变化，decision_logs 新增一条 ai_suggestion_rejected
7. 选择 outputType = write_preview，输入消息，点发送
   → 验证: AiWritePreviewPanel 出现
   → 验证: DB 画板数据无变化，decision_logs 无新增行
8. 点"确认"
   → 验证: DB 画板数据写入，decision_logs 新增 write_preview_confirmed
9. 点"放弃"
   → 验证: DB 画板数据无变化，decision_logs 新增 write_preview_rejected
```

## 验收表

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

## 失败判定

```
cargo check FAIL                    → 后端编译失败，需要修正 Rust 代码
npm run tsc FAIL                    → 前端类型错误，需要修复 TypeScript 类型
npm run accept:static FAIL          → 违反静态规则（含 forbidden 模式等）
npm run accept:contracts FAIL       → Contract Chain 断裂
npm run accept:persistence FAIL     → 持久化测试失败
验收表 8 项中任意 FAIL              → 该路径数据流未闭合，需要修复
DB 中 discuss 路径产生了写操作       → PROTOCOL_VIOLATION，立即修正
suggest/write_preview 未经用户确认就写入 → PROTOCOL_VIOLATION，立即修正
```

## 交付报告格式

```markdown
# TASK_REPORT — AI_TRISTATE_ROUTER

## Verdict
PASS / PASS_WITH_NOTES / FAIL

## Files Changed
- [路径] — 修改摘要

## What Was Implemented / Not Implemented
- discuss 路由: [已实现 / 未实现]
- suggest 路由: [已实现 / 未实现]
- write_preview 路由: [已实现 / 未实现]
- ChatDrawer 数据流: [已闭合 / 未闭合]
- AiSuggestionCard 后端接入: [已实现 / 未实现]
- AiWritePreviewPanel 后端接入: [已实现 / 未实现]
- generateChapterPacket 路由修正: [已修正 / 未修正]
- generateDraft 路由修正: [已修正 / 未修正]

## Acceptance Results
cargo check: PASS/FAIL
npm run tsc: PASS/FAIL
npm run accept:static: PASS/FAIL
npm run accept:contracts: PASS/FAIL
npm run accept:persistence: PASS/FAIL

## AI Tri-state Result (8 项逐项 PASS/FAIL)
| # | 验收项 | 结果 |
|---|--------|------|
| 1 | discuss 后 DB 无写入 | PASS/FAIL |
| 2 | discuss 回复 ChatDrawer | PASS/FAIL |
| 3 | suggest 生成后 DB 无写入 | PASS/FAIL |
| 4 | suggest accepted 写入 + Log | PASS/FAIL |
| 5 | suggest rejected 仅写 Log | PASS/FAIL |
| 6 | write_preview 生成后 DB 无写入 | PASS/FAIL |
| 7 | write_preview confirmed 写入 + Log | PASS/FAIL |
| 8 | write_preview rejected 仅写 Log | PASS/FAIL |

## Known Issues
## Next Recommended Step
V20H_02_DRIVER_E2E
```

# TASK V20H_01 — AI 三态真实路由 执行报告

## Verdict

PASS

## Files Changed

- `src/lib/generateChapterPacket.ts` — 按 outputType 路由，suggest/write_preview 时不写 DB
- `src/components/ai/CanvasAiBar.tsx` — 添加 outputType 选择器 + 真实 AI 路由 + 建议卡/预览面板状态管理 + DecisionLog 衔接

未修改：
- `ChatDrawer.tsx` — 已有完整 ChatMessage 支持，无需变更
- `AiSuggestionCard.tsx` — 通过 onAccept/onDismiss 回调由 CanvasAiBar 处理写入
- `AiWritePreviewPanel.tsx` — 通过 onConfirm/onAbandon 回调由 CanvasAiBar 处理写入
- `decisionLogApi.ts` — 签名已满足需求，无需变更
- `generateDraft.ts` — 已不写 DB，无需变更
- `src-tauri/` — Rust 端无需变更（已有所有 required commands）

## What Was Implemented

- **discuss 路由**: 已实现 — 调 callLlm，回复展示在 ChatDrawer，不写 DB
- **suggest 路由**: 已实现 — 调 callLlm（或 packet/text 阶段用 generators），显示 AiSuggestionCard，采纳前不写 DB
- **write_preview 路由**: 已实现 — 调 callLlm（或 packet/text 阶段用 generators），显示 AiWritePreviewPanel，确认前不写正式数据
- **ChatDrawer 数据流**: 已闭合 — 通过 outputType 标记，discuss 路径仅 ChatDrawer 展示
- **AiSuggestionCard 后端接入**: 已实现 — onAccept 调用 writeAIContentToCanvas + appendDecisionLog，onDismiss 仅 appendDecisionLog
- **AiWritePreviewPanel 后端接入**: 已实现 — onConfirm 调用 writeAIContentToCanvas + appendDecisionLog，onAbandon 仅 appendDecisionLog
- **generateChapterPacket 路由修正**: 已修正 — outputType=suggest/write_preview 时跳过 DB 写入
- **generateDraft 路由修正**: 已确认无需修正（函数已不写 DB）

## DecisionLog 操作映射

| 用户操作 | DecisionLog operation |
|---------|---------------------|
| suggest accept | `ai_suggestion_accepted` |
| suggest dismiss | `ai_suggestion_rejected` |
| write_preview confirm | `write_preview_confirmed` |
| write_preview abandon | `write_preview_rejected` |

## AI 三态数据流保护

- discuss: 仅 ChatDrawer 展示，不调任何写 API，不产生 DecisionLog
- suggest: 采纳前不调写 API、不产生 DecisionLog；采纳后写画板 + ai_suggestion_accepted；驳回仅 ai_suggestion_rejected
- write_preview: 确认前不调写 API、不产生 DecisionLog；确认后写画板 + write_preview_confirmed；放弃仅 write_preview_rejected

## Acceptance Results

| 检查项 | 结果 |
|--------|------|
| TypeScript (`tsc --noEmit`) | PASS |
| Rust (`cargo check`) | PASS |
| 单元测试 (`npm test`, 75 tests) | PASS |
| accept:contracts (42 checks) | PASS |
| accept:persistence (24 checks) | PASS |
| accept:css | PASS (预存 warnings) |
| accept:static | PASS_WITH_NOTES (预存违规 2 处，位于只读文件 TextCanvas.tsx 注释中) |

### AI Tri-state Result (8 项逐项判断)

| # | 验收项 | 结果 | 说明 |
|---|--------|------|------|
| 1 | discuss 后 DB 无正式写入 | PASS | discuss 路径不调任何写 API |
| 2 | discuss 回复展示于 ChatDrawer | PASS | CanvasAiBar 调用 callLlm → ChatDrawer 展示 |
| 3 | suggest 生成后 DB 无正式写入 | PASS | 采纳前仅存于 suggestion 状态 |
| 4 | suggest accepted 写入 + DecisionLog | PASS | writeAIContentToCanvas + appendDecisionLog(ai_suggestion_accepted) |
| 5 | suggest rejected 仅写 DecisionLog | PASS | appendDecisionLog(ai_suggestion_rejected)，不写画板 |
| 6 | write_preview 生成后 DB 无正式写入 | PASS | 确认前仅存于 preview 状态 |
| 7 | write_preview confirmed 写入 + DecisionLog | PASS | writeAIContentToCanvas + appendDecisionLog(write_preview_confirmed) |
| 8 | write_preview rejected 仅写 DecisionLog | PASS | appendDecisionLog(write_preview_rejected)，不写画板 |

## Canvas 写入映射

| stage | suggest accept / write_preview confirm 写入 |
|-------|---------------------------------------------|
| premise | updatePremiseCard (存在时) / createPremiseCard (不存在时) |
| structure | createStructureNode |
| setting | createWorldRule |
| packet | createChapterPacket + updateChapterPacketLayers (使用 rawWriteData) |
| text | 当前无正式写入 API (writeAIContentToCanvas 中留空) |

## Known Issues

- `accept:static` 有 2 处预存 FAIL，位于只读文件 `TextCanvas.tsx` 的注释中（"不含 mock AI"、"AI 生成不做 fallback mock"），非本 Ticket 引入
- text 画板的 AI 写入未实现（scope 外 — 画板内核组件业务逻辑不在本 Ticket 范围内）

## Next Recommended Step

V20H_02_DRIVER_E2E

# V2_0_1_SCOPE_FREEZE_PLAN

生成依据：zhimengji-v2-prd-v0.3.1.md 第 6 节
基线：v2.0-H（AI 三态路由 + Driver E2E 完成）
并行版本：v2.0.2 AI Capability Foundation（同基线独立展开）

## 1. Verdict

Status: READY_FOR_GATE | Target: v2.0.1 | Type: Usability Probe | Prev: v2.0-H | Next: v2.1.0

## 2. Target Outcome

回答：**用户能否在不接触方法论的情况下顺畅使用织梦机？**

完成状态：
1. 用户 5 分钟内从启动到生成第一段正文
2. 用户可一键速写（跳过管线直接出草稿）
3. 用户可加载 Demo 项目立即体验
4. 正文可导出 .md
5. 内嵌反馈 + 行为日志

不验证：方法论价值（v2.1.2）、付费意愿（v2.4）、PMF（v2.1.2）。

## 3. In Scope

| # | Item | P | Notes |
|---|------|---|-------|
| 1 | 一键速写入口 | P0 | 跳过管线直接出草稿。底层用 QuickDraft 结构化数据（含最小 PremiseCard + DraftPacket）。可一键转入正式管线 |
| 2 | 5 分钟路径 | P0 | 组合验证：启动→输入想法→一键速写→见正文 ≤5min |
| 3 | Demo 项目 | P0 | 预置完整项目（前提/结构/设定/两章正文），立即加载体验 |
| 4 | Markdown 导出 | P0 | TextCanvas 正文导出 .md，走 Tauri 文件保存对话框 |
| 5 | 反馈入口 | P0 | 问卷弹窗 + 行为日志（decision_logs 表） |

## 4. Out of Scope

- 方法论补完（PremiseCard v2/地图缩放/麻雀模式）→ v2.1.0
- 三画板联动 → v2.1.1 | 画板④三档细度 → v2.1.0
- 七诊/八体/知识边界检测 → v2.2 | 反向管道 → v2.3
- Cost Meter/定价 UI → v2.4 | 商业化决策
- AI Control Center v2 / Context Builder / Command Router → v2.0.2
- v2.0-H 增强/重构 | App.tsx 重构 | Undo-Redo
- 旧 AIChat 独立页 / AiSettings（Legacy 不动）
- 正式发布（仅 20 个测试用户）| 用户注册/登录
- 方法论术语出现在一键速写入口

## 5. Stable Boundaries

**Must Not Break:** v2.0-H 全部验收、画板内核、Pipeline 状态流转、现有 Contract Chain、SQLite 现有表结构和数据。

**Legacy Rule:** AIChat 独立页、AiSettings 保持 Legacy，不动。

## 6. File Locks

### Allowed Write

| File | Reason |
|------|--------|
| `src/features/quick-draft/` (新目录) | QuickDraft 入口 UI + 数据流 |
| `src/contracts/quick-draft.contract.ts` (新文件) | QuickDraft 数据结构 |
| `src/api/quickDraftApi.ts` (新文件) | QuickDraft API 客户端 |
| `src/api/feedbackApi.ts` (新文件) | 反馈发送 API |
| `src/components/feedback/` (新目录) | 反馈弹窗组件 |
| `src/components/Bookshelf.tsx` | 添加一键速写 + Demo 入口 |
| `src/features/canvas-05-text/TextCanvas.tsx` | 添加导出 Markdown 按钮 |
| `src/utils/markdown.ts` | 扩展导出函数 |
| `src/data/seed.ts` | 扩展 Demo 预置数据 |
| `src-tauri/src/quick_draft_commands.rs` (新文件) | QuickDraft command |
| `src-tauri/src/export_commands.rs` (新文件) | 导出 command |
| `src-tauri/src/feedback_commands.rs` (新文件) | 反馈 command |
| `src-tauri/src/db.rs` | 仅追加 quick_drafts 表 init+CRUD |
| `src-tauri/src/models.rs` | 仅追加 QuickDraft/Demo struct |
| `src-tauri/src/lib.rs` | 仅注册新 command |
| `scripts/acceptance/` | 追加验收脚本 |
| `package.json` | 追加验收命令 |

### Read Only

全部现有 contract、api、stores、canvas 核心（01~04）、pipeline-canvas、pipeline-nav、ai 组件（CanvasAiBar/ChatDrawer/AiSuggestionCard/AiWritePreviewPanel/AIChat/AiSettings）、lib/ai-output、lib/generateChapterPacket、lib/generateDraft、全部现有 Rust command、byok、e2e/tauri。

### Forbidden

App.tsx（需特批）、现有 DB 表定义修改、现有 contract 接口签名、画板核心逻辑、stores 内逻辑、ai 目录除新增外全部。

## 7. Data / DB Rules

QuickDraft 存入**新增** `quick_drafts` 表：

```sql
CREATE TABLE IF NOT EXISTS quick_drafts (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
  user_input TEXT NOT NULL, premise_text TEXT NOT NULL DEFAULT '',
  premise_type TEXT NOT NULL DEFAULT '',
  chapters TEXT NOT NULL DEFAULT '[]',  -- JSON [{title, content}]
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | transferred
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

Demo 项目：使用现有 projects 表，设 status='demo'，预置所有画板数据。

DB rules: 仅新增 quick_drafts 表。不修改任何现有表。全部持久化走 SQLite。无 localStorage。

## 8. Contract Rules

新 contract 文件：`src/contracts/quick-draft.contract.ts`。不得与已有类型冲突。

已有 contract 全部 LOCKED（project/premise/structure/setting/chapter-packet/decision-log）。

新 contract 引用已有类型只能 `import type`。转入正式管线通过调用已有 API 方法完成。

## 9. AI Rules

一键速写复用 CanvasAiBar + llm-client 基础设施。

| 操作 | 行为 | DB 写入 |
|------|------|---------|
| quickdraft_generate | 生成 QuickDraft（PremiseCard + 正文草稿） | 仅 quick_drafts 表 |
| quickdraft_transfer | 确认转入正式管线 | premise_cards + structure_nodes + chapter_packets |

AI 不得静默写入正式画板数据。正式写入必须经过用户"转入正式管线"确认。不改 AI 路由逻辑。

## 10. Acceptance Commands

```bash
cargo check
npm run tsc -- --noEmit
npm run accept:static && accept:css && accept:contracts && accept:persistence
npm run accept:quickdraft && accept:export && accept:feedback && accept:demo
npm run accept:e2e     # v2.0-H 回归，必须 PASS
npm run accept         # 全量
```

## 11. Manual Acceptance Paths

**A: 一键速写 + 5分钟路径**
① 启动 → ② 见一键速写入口（无术语）→ ③ 输入想法 → ④ 点生成 → ⑤ 见 QuickDraft 预览 → ⑥ 转入正式管线 → ⑦ 画板①前提自动填充 → ⑧ 画板⑤正文与预览一致 → ⑨ 重启数据持久化

**B: Demo 项目**
① 启动 → ② 书架见 Demo 入口 → ③ 加载 → ④~⑧ 画板①~⑤均有预置数据 → ⑨ 重启持久化

**C: Markdown 导出**
① 打开画板⑤ → ② 点导出 → ③ 选 .md → ④ 保存 → ⑤ 文件内容正确

**D: 反馈入口**
① 正常使用 → ② 点反馈 → ③ 填问卷 → ④ 提交成功 → ⑤ 管理员可读取

## 12. Machine Acceptance

| Check | Required | Command |
|-------|----------|---------|
| cargo check | Y | `cargo check` |
| tsc --noEmit | Y | `npm run tsc -- --noEmit` |
| static/CSS/contracts | Y | `accept:static` + `accept:css` + `accept:contracts` |
| persistence | Y | `accept:persistence` |
| v2.0-H e2e 回归 | Y | `accept:e2e` |
| QuickDraft | Y | `accept:quickdraft` |
| 导出/反馈/Demo | Y | `accept:export` + `accept:feedback` + `accept:demo` |

## 13. PASS / FAIL Criteria

**PASS:** 5 项全部完成，全部验收 PASS，无禁止范围侵入，无现有 contract 修改，无现有 DB 表变更，无 AI 静默写入，无 localStorage 替代，无 mock release path。

**PASS_WITH_NOTES:** 允许非阻塞 UI 问题、非阻塞 P1 反馈集成问题。

**PASS_WITH_REQUIRED_PATCHES:** QuickDraft 转入精度不足 / Demo 不完整 / 反馈收集不完整（需列清单）。

**FAIL:** 任何 P0 缺失、contract 断裂、DB 表修改、v2.0-H 回归失败、AI 静默写入、禁止范围侵入、mock release path。

## 14. Required Handoff Report

Implementation must output `V2_0_1_REPORT.md` at project root:

```markdown
## Verdict: PASS / PASS_WITH_NOTES / PASS_WITH_REQUIRED_PATCHES / FAIL
## Files Changed
## What Was Implemented / Not Implemented
## Acceptance Results (全部命令 PASS/FAIL)
## Known Issues (P0/P1/P2/P3)
## Next Recommended Step
```

## 15. Gate Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Can Claude Code execute this without reading the full PRD? | |
| 2 | In Scope ≤ 5? | |
| 3 | Out of Scope explicit? | |
| 4 | File locks clear? | |
| 5 | DB rules clear? | |
| 6 | Contract rules clear? | |
| 7 | Acceptance commands clear? | |
| 8 | Real user acceptance path exists? | |
| 9 | Mock/localStorage/silent write banned? | |
| 10 | Next version excluded? | |

Result: READY_FOR_GATE / PASS_WITH_REQUIRED_PATCHES / FAIL

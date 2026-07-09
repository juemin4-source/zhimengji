# V2_0_H_SCOPE_FREEZE_PLAN

> 状态：施工冻结
> 战役：v2.0-H RC Blocker Fix
> 上游文档：zhimengji-v2-prd-v0.3.x
> 本文件仅定义施工范围。不讨论产品路线、用户研究、商业判断。

---

## 战役定义

v2.0-H 只做两件事：

1. **AI 三态真实路由** — 把 UI 层的 discuss/suggest/write_preview 接入真实数据路由
2. **Driver E2E** — 真启动 Tauri，真走完整管线，真验收持久化

完成后状态：v2.0 Beta 可跑。不做任何方法论补完，不做 PMF 验证。

---

## 1. AI 三态真实路由

### 1.1 三条路径的行为定义

| 路径 | 数据写入 | 触发方式 | 确认要求 |
|------|---------|---------|---------|
| **discuss** | 不进 DB，只进对话气泡 | AI 回答/建议 | 无（纯对话） |
| **suggest** | 采纳前不进 DB，以建议卡展示 | AI 生成建议 | 用户手动采纳后才写入 |
| **write_preview** | 确认前不进正式数据，写入预览区 | AI 生成/用户触发 | 用户确认后写入正式表 |

### 1.2 数据流规则

```
discuss:
  AI输出 → 气泡渲染 → 结束 (不进DB)

suggest:
  AI输出 → 建议卡渲染 → 用户采纳? → 是: 写入DB / 否: 丢弃
                                    → DecisionLog.write({action:'suggest_accepted'|'suggest_rejected'})

write_preview:
  AI输出 → 预览区渲染(暂存) → 用户确认? → 是: 写入正式表 / 否: 清空预览
                                       → DecisionLog.write({action:'preview_confirmed'|'preview_discarded'})
```

### 1.3 DecisionLog 日志结构

```typescript
interface DecisionLogEntry {
  id: string;
  projectId: string;
  canvasStage: string;
  action: 'suggest_accepted' | 'suggest_rejected' | 'preview_confirmed' | 'preview_discarded';
  source: 'ai_generated' | 'user_manual';
  snapshot: string;        // JSON 快照（写入/丢弃的内容）
  timestamp: string;
}
```

DecisionLog 写入 `decision_logs` 表（SQLite，追加写，不修改历史记录）。

### 1.4 涉及的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/ai/CanvasAiBar.tsx` | 修改 | 接入真实路由，替换占位逻辑 |
| `src/components/ai/AiSuggestionCard.tsx` | 修改或新建 | suggest 建议卡组件，含采纳/驳回按钮 |
| `src/components/ai/AiWritePreview.tsx` | 修改或新建 | write_preview 预览弹窗，含确认/放弃按钮 |
| `src/lib/decisionLog.ts` | 新建 | DecisionLog CRUD（追加写，不修改） |
| `src/contracts/decision-log.contract.ts` | 新建 | DecisionLogEntry 类型定义 |
| `src-tauri/src/db.rs` | 修改 | 新增 decision_logs 表 + 插入方法 |
| `src-tauri/src/models.rs` | 修改 | 新增 DecisionLogRow 结构体 |
| `src/api/decisionLogApi.ts` | 新建 | DecisionLog 前端 API 层 |
| `src-tauri/src/decision_log_commands.rs` | 新建 | DecisionLog Tauri commands |
| `src-tauri/src/lib.rs` | 修改 | 注册 decision_log 模块 |

### 1.5 禁止事项

- 不修改 discuss 的 UI 渲染路径（气泡逻辑保持不变）
- 不修改现有画板数据表结构（premise_cards, structure_nodes 等）
- 不改动现有 CRUD 命令的业务逻辑
- suggest 不预先写入临时表——采纳前完全离库
- write_preview 不写入正式表——确认前只存在前端内存

---

## 2. Driver E2E

### 2.1 验收路径

```txt
① 真启动 Tauri 窗口 (npm run tauri dev)
② 创建项目
③ 进入画板① → 输入前提 → 保存 → 确认
④ 进入画板② → 创建结构节点 → 保存 → 确认
⑤ 进入画板③ → 添加设定/角色/势力 → 保存 → 确认
⑥ 进入画板④ → 创建 ChapterPacket → 编辑四层 → 确认
⑦ 进入画板⑤ → 查看 PacketReferencePanel → TextCanvas 显示
⑧ 关闭窗口，重启应用
⑨ 打开同一项目 → 画板⑤ 依然在 text active 状态
⑩ 所有数据恢复
```

### 2.2 验收命令

```bash
npm run accept:e2e    # Playwright 全流程 E2E
npm run accept:static  # 禁止模式扫描
npm run accept:css     # CSS 合规
npm run accept:contracts  # 契约链扫描
npm run accept:persistence # SQLite CRUD smoke test
npm run accept         # 全量
```

### 2.3 验收指标

| 检查项 | 预期 |
|--------|------|
| 真 Tauri 窗口启动 | ≤ 30s |
| 完整管线 ①→⑤ 无崩溃 | PASS |
| 刷新后数据恢复 | 全部字段一致 |
| AI 三态路由正确 | discuss 不入库，suggest 采纳后才入库，write_preview 确认后才入库 |
| DecisionLog 存在 | 至少 1 条记录 |
| accept:e2e PASS | ✅ |
| cargo check | ✅ |
| tsc --noEmit | ✅ |

### 2.4 涉及的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `e2e/` | 新增或修改 | Playwright E2E 测试文件 |
| `scripts/acceptance/` | 修改 | 更新验收脚本 |
| `playwright.config.ts` | 修改 | E2E 配置 |
| `package.json` | 修改 | accept:e2e 命令 |

### 2.5 禁止事项

- 不修改现有画板 UI 组件（CanvasShell/PremiseEntryGate 等）
- 不调整现有画板状态机（pipeline-helper.ts 逻辑不变）
- 不新增 AI 生成测试（E2E 只测 UI 流程和持久化，不测 AI 输出质量）
- 不 mock AI 响应（E2E 可以选择不触发 AI 按钮）

---

## 3. 文件锁定清单

### 3.1 可修改

```
src/components/ai/CanvasAiBar.tsx
src/components/ai/*.tsx           (仅 AI 相关组件)
src/lib/decisionLog.ts
src/contracts/decision-log.contract.ts
src-tauri/src/db.rs               (仅追加 decision_logs 表)
src-tauri/src/models.rs           (仅追加 DecisionLogRow)
src-tauri/src/decision_log_commands.rs
src-tauri/src/lib.rs              (仅注册 decision_log 模块)
src/api/decisionLogApi.ts
e2e/
scripts/acceptance/
playwright.config.ts
package.json                      (仅 accept:e2e 命令)
src/components/ai/AiSuggestionCard.tsx    (新建或修改)
src/components/ai/AiWritePreview.tsx     (新建或修改)
```

### 3.2 禁止修改

```
src/features/canvas-01-premise/       (画板① 逻辑)
src/features/canvas-02-structure/     (画板② 逻辑)
src/features/canvas-03-setting/       (画板③ 逻辑)
src/features/canvas-04-packet/        (画板④ 逻辑)
src/features/canvas-05-text/          (画板⑤ 逻辑)
src/features/pipeline-canvas/         (管线导航)
src/stores/                           (状态管理)
src/contracts/premise.contract.ts     (现有契约不变)
src/contracts/structure.contract.ts
src/contracts/setting.contract.ts
src/contracts/chapter-packet.contract.ts
src-tauri/src/premise_commands.rs     (命令逻辑)
src-tauri/src/structure_commands.rs
src-tauri/src/setting_commands.rs
src-tauri/src/chapter_packet_commands.rs
src-tauri/src/db.rs                   (除 decision_logs 表外不碰)
src-tauri/src/models.rs               (除 DecisionLogRow 外不碰)
src-tauri/src/lib.rs                  (除注册 decision_log 外不碰)
src/api/premiseApi.ts                 (API 层不变)
src/api/structureApi.ts
src/api/settingApi.ts
src/api/chapterPacketApi.ts
```

### 3.3 验收脚本锁定

```
scripts/acceptance/scan-forbidden-patterns.mjs  (不变，但需确认新代码无违规)
scripts/acceptance/scan-css-compliance.mjs       (不变)
scripts/acceptance/scan-contract-chain.mjs       (不变)
scripts/acceptance/persistence.mjs               (不变)
```

---

## 4. 前置依赖

- [ ] PRD v0.3.1 Baseline 已完成
- [ ] 当前 git 分支无未解决的冲突
- [ ] npm install / cargo check 基线通过
- [ ] 现有 accept 命令全部 PASS（作为基线基准）

---

## 5. 禁止事项（完整列表）

| # | 禁止事项 | 理由 |
|---|---------|------|
| 1 | 不修改现有画板 UI/逻辑 | v2.0-H 只补路由和验收 |
| 2 | 不新增画板实体 | DecisionLog 是辅助审计表，不是新画板 |
| 3 | 不改现有 contract | 只新增 decision-log.contract.ts |
| 4 | 不 mock AI | E2E 可以不点 AI 按钮 |
| 5 | 不重构现有组件 | 哪怕看到"想改"的代码 |
| 6 | 不碰旧 CanvasView/AIChat/SettingCollection | 旧路径清理在 D 轮已完成 |
| 7 | 不画新 UI 原型 | 本战役范围已明确 |
| 8 | 不写 v2.1+ 的代码 | v2.1 尚未冻结 |
| 9 | 不写用户画像/商业判断 | 那是 PRD 的事 |
| 10 | 不超过 300 行的文档 | 本文件本身就是示例 ✅ |

---

## 6. 验收总结

完成后输出 `V2_0_H_CLOSURE.md`，包含：
- AI 三态路由验收结果（discuss/suggest/write_preview 各一条日志截图）
- Driver E2E 验收结果（8 步 + 刷新恢复）
- accept 全命令结果
- 文件变更清单
- 已知问题
- 是否达到 v2.0-H 完成标准

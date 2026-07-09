# TASK: Driver E2E

## 目标

建立真实 Tauri 窗口的 10 步端到端验收路径，覆盖创建项目 → 五画板管线 → AI 正文生成 → 重启持久化全流程，不依赖 mock 或 Fake 后端。

## 前置依赖

- Scope Freeze: V2_0_H_SCOPE_FREEZE_PLAN.md
- 前置 Ticket: `TASK_V20H_01_AI_TRISTATE_ROUTER.md` **必须已完成且 8 项验收通过**（因为步骤 7-8 需要真实 AI 路由）

## In Scope

1. **新增 `npm run accept:e2e` 命令** — 等价 `npm run e2e:tauri`，串联启动 Tauri + Playwright CDP 测试
2. **重写 `e2e/tauri/real-app.spec.ts`** — 覆盖 10 步完整路径，走真实 Tauri IPC（通过 tauri-driver CDP）
3. **修改 `e2e/tauri/smoke.spec.ts`** — 确保与重写后的 real-app.spec.ts 不重复，或按需增强
4. **清理 `e2e/v2-golden-path.spec.ts`** — 删除或瘦身 mock 依赖（当前依赖 addInitScript mock）
5. **新增验收脚本** — 如有需要可追加 `scripts/acceptance/` 中的辅助脚本
6. **更新 `playwright.config.ts`** — 若需要新增 tauri 项目配置
7. **失败诊断** — 测试失败时输出具体失败的步骤编号 + 预期值 + 实际值

## Out of Scope

- E2E 测试 `e2e/01-story-creation.spec.ts` 等 7 个旧谱的修改（仅动 real-app / smoke / v2-golden-path 三个文件）
- CanvasAiBar / AI 路由 / ChatDrawer / AiSuggestionCard / AiWritePreviewPanel 的逻辑修改（由 Ticket 1 完成）
- 非 E2E 的单元测试或集成测试
- App.tsx / 画板内核 / stores / contracts 的修改
- 测试覆盖率指标或 CI 集成

## Allowed Write

| 文件 | 修改范围 |
|------|---------|
| `e2e/tauri/real-app.spec.ts` | 重写为 10 步完整路径，使用 tauri-driver CDP 连接真实窗口 |
| `e2e/tauri/smoke.spec.ts` | 可修改或增强（确保不与 real-app 重复） |
| `e2e/v2-golden-path.spec.ts` | 删除 mock 依赖或标记 deprecated |
| `package.json` | 仅追加 `"accept:e2e": "npm run e2e:tauri"` 命令 |
| `playwright.config.ts` | 仅追加 tauri 项目配置（若需要独立的 tauri-driven 配置） |

### 允许新增

| 路径 | 说明 |
|------|------|
| `scripts/acceptance/` | 可追加验收辅助脚本（如启停 tauri-driver 等） |
| `e2e/tauri/` | 可追加辅助工具文件（如 test-helper.ts） |

## Read Only

```
e2e/*.spec.ts 中除上述三个文件外的全部
src/ 全部（包含 components / lib / api / contracts / stores / features / types）
src-tauri/ 全部
scripts/ 中除 scripts/acceptance/ 和 package.json 外全部
```

## Forbidden

```
使用 addInitScript mock 或任何 mock 替换 Tauri IPC
依赖预先存在的 mock project 或 mock DB（测试必须自创建项目）
修改画板内核、stores、contracts 等业务代码
修改非 E2E 的已有测试用例
包管理操作（npm install / cargo add）
```

## 最小 E2E 路径（10 步）

```
Step  Action                              Expected
──────────────────────────────────────────────────────
 ①   启动 Tauri dev 窗口（通过 tauri-driver CDP）   无白屏/崩溃
 ②   创建新项目（书架→"新建作品"按钮）              项目出现在书架
 ③   PipelineNav 状态正确                          stage=premise active
 ④   填写前提卡并确认                              保存 → stage→structure
 ⑤   添加 4 层结构节点（book→phase→position→chapter）  stage→setting
 ⑥   填写设定（≥1 规则 + ≥1 角色）                  stage→packet
 ⑦   创建章节包并确认                              stage→text
 ⑧   AI 生成正文并确认写入                         stage=text done
 ⑨   关闭 Tauri 窗口（关闭 CDP 连接）              干净退出
 ⑩   重启 Tauri，打开同一项目                       全部数据恢复
```

### 10 步的 Playwright 实现建议

```
Step ①: chromium.connectOverCDP('http://127.0.0.1:4444')
         → page.waitForLoadState('load')
         → page.title() 包含 '织梦机'
Step ②: page.getByLabel('新建作品').click()
         → 填写 CreationWizard 表单 → 提交
         → 验证项目卡片出现在书架
Step ③: page.locator('.pipeline-nav').toBeVisible()
         → page.getByTitle('前提 — 进行中').toBeVisible()
Step ④: 填写前提 textarea → 保存 → 确认
         → 验证 stage=structure
Step ⑤: '创建默认结构' → 确认
         → 验证 stage=setting
Step ⑥: 添加角色/规则 → 确认
         → 验证 stage=packet
Step ⑦: '从空包开始' → 填写标题 → 确认
         → 验证 stage=text
Step ⑧: 在 TextCanvas 中使用 AI 生成正文
         → 确认写入
         → 验证正文持久化
Step ⑨: browser.close() → 确认进程退出
Step ⑩: 重新 connectOverCDP → 打开同一项目
         → 验证所有数据存在
```

## 基础设施要求

| 组件 | 要求 |
|------|------|
| tauri-driver | 测试前必须启动（默认端口 4444） |
| Tauri backend | `npm run tauri dev` 必须在独立进程中运行 |
| DB 文件 | 测试使用真实 SQLite DB（app data 目录） |
| playwright | 通过 CDP 连接而非浏览器 webServer |

## 施工顺序

```
Step 1: package.json — 追加 "accept:e2e": "npm run e2e:tauri"
Step 2: playwright.config.ts — 按需追加 tauri 项目配置（若 tauri 测试需要独立配置）
Step 3: e2e/tauri/real-app.spec.ts — 实现 10 步完整路径
        - 使用 chromium.connectOverCDP 连接 tauri-driver
        - 每步使用 test.step() 包裹，失败时输出步骤编号
        - 步骤 9-10 验证持久化（关闭连接 → 重新连接 → 检查数据）
        - 失败时输出具体失败步骤 + 当前 DOM 截图 + 关键元素状态
Step 4: e2e/tauri/smoke.spec.ts — 精简或增强，确保不重复
Step 5: e2e/v2-golden-path.spec.ts — 清理 mock 依赖或添加 @deprecated 标记
Step 6: 验证全部验收命令通过
```

## 验收命令

```bash
cargo check
npm run tsc -- --noEmit
npm run accept:static
npm run accept:contracts
npm run accept:persistence
npm run accept:e2e
```

## 手动验收路径

```
1. 确保已配置 AI API Key（步骤 8 需要真实 AI 调用）
2. 确保已安装 tauri-driver（或启动 Tauri 的 CDP 端口）
3. 运行 npm run accept:e2e
4. 观察控制台输出，10 步应逐条显示 PASS
5. 若失败，查看 test-results/ 目录下的截图和视频
```

## 验收表

| # | 验收项 | 预期 | 验证方式 |
|---|--------|------|---------|
| 1 | Tauri 窗口加载 | 无白屏/崩溃，标题含"织梦机" | CDP 连接 + page.title |
| 2 | 创建新项目 | 项目出现在书架 | UI 断言 + list_projects |
| 3 | PipelineNav 状态 | premise active | DOM 断言 |
| 4 | 前提确认 | stage 推进到 structure | pipeline_state 读取 |
| 5 | 4 层结构确认 | stage 推进到 setting | pipeline_state 读取 |
| 6 | 设定确认 | stage 推进到 packet | pipeline_state 读取 |
| 7 | 章节包确认 | stage 推进到 text | pipeline_state 读取 |
| 8 | AI 正文确认 | 正文写入 DB，stage=text done | DB 查询 + pipeline_state |
| 9 | 窗口关闭 | 进程干净退出 | 进程状态 |
| 10 | 重启恢复 | 全部数据（项目/前提/结构/设定/包/正文）存在 | 重新连接后 DB 校验 |

**规则：** 10 步全部 PASS 方可标记 E2E 验收通过。任意 FAIL → blocker。

## 失败判定

```
cargo check FAIL              → 后端编译失败
npm run tsc FAIL              → 前端类型错误
npm run accept:static FAIL    → 违反静态规则
npm run accept:contracts FAIL → Contract Chain 断裂
npm run accept:persistence FAIL → 持久化测试失败
npm run accept:e2e FAIL       → E2E 10 步中至少一步失败
测试仍依赖 mock               → PROTOCOL_VIOLATION，立即修正
未验证持久化（步骤 9-10 缺失）→ 验收不通过
未输出失败步骤细节            → 诊断能力不足，需要补充
```

## 交付报告格式

```markdown
# TASK_REPORT — DRIVER_E2E

## Verdict
PASS / PASS_WITH_NOTES / FAIL

## Files Changed
- [路径] — 修改摘要

## What Was Implemented / Not Implemented
- npm run accept:e2e: [已添加 / 未添加]
- e2e/tauri/real-app.spec.ts 10 步: [已实现 / 未实现]
- e2e/tauri/smoke.spec.ts: [已修改 / 未修改]
- e2e/v2-golden-path.spec.ts: [已清理 / 未清理]
- playwright.config.ts: [已更新 / 未更新]

## Acceptance Results (全部命令结果 PASS/FAIL)
cargo check: PASS/FAIL
npm run tsc: PASS/FAIL
npm run accept:static: PASS/FAIL
npm run accept:contracts: PASS/FAIL
npm run accept:persistence: PASS/FAIL
npm run accept:e2e: PASS/FAIL

## E2E Result (10 步逐项 PASS/FAIL)
| # | 步骤 | 结果 |
|---|------|------|
| 1 | Tauri 窗口加载 | PASS/FAIL |
| 2 | 创建新项目 | PASS/FAIL |
| 3 | PipelineNav 状态 | PASS/FAIL |
| 4 | 前提确认 | PASS/FAIL |
| 5 | 4 层结构确认 | PASS/FAIL |
| 6 | 设定确认 | PASS/FAIL |
| 7 | 章节包确认 | PASS/FAIL |
| 8 | AI 正文确认 | PASS/FAIL |
| 9 | 窗口关闭 | PASS/FAIL |
| 10| 重启恢复 | PASS/FAIL |

## Known Issues
## Next Recommended Step
Readiness Gate → 验收全部通过后，生成 V2_0_H_CLOSURE.md
```

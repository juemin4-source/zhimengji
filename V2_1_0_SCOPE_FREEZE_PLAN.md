# v2.1.0 Scope Freeze Plan

> 生成依据：zhimengji-v2-prd-v0.3.1.md §8.1.1
> 冻结范围：Method Backbone MVP（画板①~④方法论骨架）
> 冻结基线：v2.0-H（主流程可用）+ v2.0.1（反馈就绪）+ v2.0.2（AI Foundation 就绪）

---

## 1. In Scope（≤ 5 项）

| # | 功能 | 优先级 | 画板 | 执行排期 |
|---|------|--------|------|---------|
| 1 | 画板① PremiseCard v2 最小五步（愿望清单/定内外/前提句变体/读者追问/类型判断） | P0 | 画板① | 第 1 批 |
| 2 | 画板② StructureGraph L1-L4 可用层级版本（全书→时位→候→章四层缩放） | P0 | 画板② | 第 2 批 |
| 3 | 画板③ 麻雀模式最小 9+3（9 步默认展开 + 3 步折叠；主角卡 3 步可用） | P0 | 画板③ | 第 3 批 |
| 4 | 画板④ ChapterPacket 三档细度模式（速写/标准/精编） | P0 | 画板④ | 第 4 批 |
| 5 | 画板③ 天/地/人三层展开 | P1 | 画板③ | 第 5 批（P1，工期紧张可推迟到 v2.1.1） |

**执行顺序约束：** 画板①→②→③→④ 串行，不允许并行修改。每个画板完成后跑完该画板的验收脚本才进入下一画板。天/地/人三层展开（#5）可在前置画板验收全部通过后择机执行，不阻塞 1-4。

---

## 2. 文件锁（file-locks.yml 补充规则）

以下规则覆盖基线 `file-locks.yml`，仅适用于 v2.1.0 施工期。

### Allowed Write（可修改）

worker-fe 在 features 目录下创建/修改本画板组件。worker-be 在对应 Rust 模块中新增或扩展 Tauri command。两个 worker 不可同时修改同个画板。

| 路径 | 授权 Worker | 说明 |
|------|------------|------|
| `src/features/canvas-01-premise/` | worker-fe | 画板①五步流程 |
| `src/features/canvas-02-structure/` | worker-fe | 画板②四层缩放 |
| `src/features/canvas-03-setting/` | worker-fe | 画板③麻雀模式 + 天/地/人 |
| `src/features/canvas-04-packet/` | worker-fe | 画板④三档细度 |
| `src/contracts/premise.contract.ts` | worker-fe | 前提契约扩展 |
| `src/contracts/structure.contract.ts` | worker-fe | 结构契约扩展 |
| `src/contracts/setting.contract.ts` | worker-fe | 设定契约扩展 |
| `src/contracts/chapter-packet.contract.ts` | worker-fe | 章节包契约扩展 |
| `src/stores/` | worker-fe | 状态管理（累加式新增） |
| `src-tauri/src/commands.rs` | worker-be | 新增 Tauri command |
| `src-tauri/src/models.rs` | worker-be | 新增数据模型（只加字段，不改现有字段） |
| `src-tauri/src/db.rs` | worker-be | 新增表（只加表，不改已有表结构） |

### Read Only（可读不可写）

| 路径 | 说明 |
|------|------|
| `src/features/canvas-05-text/` | 画板⑤文本画板——不可修改，保持稳定 |
| `src/features/pipeline-nav/` | 管线导航——不可修改 |
| `src/features/pipeline-canvas/` | 管线画板框架——不可修改 |
| `src/components/ai/` | AI 组件层——v2.0.2 产物，本版本只读 |
| `src/contracts/project.contract.ts` | 项目契约——v2.0-H 基线不可改 |
| `src/contracts/decision-log.contract.ts` | 决策日志契约——不可改 |
| `src/api/` | API 客户端层——只读 |
| `src/tauri-api.ts` | Tauri IPC 封装——只读 |
| `src-tauri/src/lib.rs` | Tauri 入口——只读 |
| `src-tauri/src/sync/` | 同步模块——v2.0 基线不可改 |
| `docs/` 全部 | 文档目录——全部只读 |
| `scripts/acceptance/` | 验收脚本目录——只读 |

### Forbidden（禁止访问）

| 路径 | 说明 |
|------|------|
| `src-tauri/` 下非 `commands.rs`/`models.rs`/`db.rs` 之外的文件 | 后端架构文件——禁止修改。新命令只在这三个文件中新增 |
| `src/styles/` | 全局样式——v2.0.2 已锁定 |
| `src/types/world.ts` | 核心类型——禁止修改 |
| `src-tauri/Cargo.toml` | 禁止新增依赖（除非 Chancellor 审批） |
| `src-tauri/tauri.conf.json` | Tauri 配置——禁止修改 |

---

## 3. DB 操作规则

**模式：累加式（Additive Only）。** 不允许任何数据迁移脚本或已有表结构变更。

| 操作 | 规则 |
|------|------|
| 新增表 | ✅ 允许。命名规则：`<画板>_<功能>`（如 `premise_wishlist`、`structure_layers`） |
| 新增字段 | ✅ 允许在新增表中加字段。已有表不可加字段。 |
| 修改已有表结构 | ❌ 禁止。已有 10 表保持 v2.0-H 结构不变。 |
| 修改已有字段类型 | ❌ 禁止。 |
| 删除表或字段 | ❌ 禁止。 |
| 数据迁移 | ❌ 禁止。旧版数据通过 read-time 兼容读取，不外挂迁移脚本。 |

**旧数据兼容规则：** v2.0/v2.0.1 的旧项目中可能存在：
- 旧前提文本（只有自由文本，无五步结构）：读取时 `auto_inferred` 标记，用户可手动升级为五步结构
- 旧角色卡（只有描述文本，无 3 步字段）：读取时空状态 + 引导提示，不自动迁移
- 旧章节包（无三档细度标记）：读取时默认使用"标准"细度，用户可切换

所有旧数据兼容在**前端读取层**处理，不在 DB 层处理。

---

## 4. Contract 冻结规则

### 可修改的 Contract（v2.1.0 允许修改）

| Contract ID | 文件 | 修改范围限制 |
|------------|------|-------------|
| `CN-MET-01` | `src/contracts/premise.contract.ts` | 仅添加五步流程相关类型（WishlistItem、PremiseVariant、GenreJudgment 等） |
| `CN-MET-02` | `src/contracts/structure.contract.ts` | 仅添加 L1-L4 层级类型（BookLayer、ShiweiLayer、HouLayer、ZhangLayer） |
| `CN-MET-03` | `src/contracts/setting.contract.ts` | 仅添加麻雀模式字段（SparrowModule、CharacterStep3、TianDiRenLayer） |
| `CN-MET-04` | `src/contracts/chapter-packet.contract.ts` | 仅添加细度模式枚举和三档标记字段（DetailMode、PacketDetailLevel） |

### 冻结的 Contract（禁止修改）

| Contract ID | 文件 | 说明 |
|------------|------|------|
| `CN-CORE-01` | `src/contracts/project.contract.ts` | 项目核心类型——禁止修改 |
| `CN-CORE-02` | `src/contracts/decision-log.contract.ts` | 决策日志类型——禁止修改 |
| `CN-CORE-03` | `src/contracts/setting.contract.ts` 中 WorldObject 等已有类型 | 已有 WorldObject、Connection 等定义——禁止修改，仅可新增类型 |
| `CN-CORE-04` | `docs/execution/contracts.json` | 实现契约 JSON——禁止修改。设为 read_only + chancellor_approval_required |

### Contract Chain 维护规则

```
v2.0-H Contract Chain（42/42）→ v2.1.0 新增 CN-MET-01~04
Contract Chain 总数从 42 增至 46
已有 42 条保持 PASS，新增 4 条验证通过后链才完整
```

Contract Chain 扫描命令保持：
```bash
node scripts/acceptance/scan-contract-chain.mjs
```

---

## 5. AI 规则

v2.1.0 的 AI 能力全部通过 v2.0.2 AI Foundation 提供，不自行建设 AI 基础设施。

| 规则 | 说明 |
|------|------|
| 所有 AI 调用走 AI Command Router v2 | 不允许绕过 router 直接调用 llm-client。router 负责识别方法论阶段意图并路由到对应 skill |
| 所有 AI 输出经 Structured Output Parser | 方法论 AI 产出（PreiseVariants、SparrowSuggestions 等）必须通过 schema 校验。校验失败时 fallback 到纯文本建议，不在 UI 显示损坏数据结构 |
| 方法论 prompt 注册到 Skill Registry | premise.five_step、structure.l1_l4、setting.sparrow_9_3、packet.three_detail_modes、draft.chapter_writer 五个 skill 必须在 v2.1.0 开工前完成注册 |
| AI 三态路由保持 | discuss 不写 DB，suggest 采纳前不写 DB，write_preview 确认前不写正式数据。方法论步骤的 AI 产出也遵循此规则 |
| AI 上下文构建 | 每个方法论步骤调用 Context Builder v2 构建上下文，不自行拼接 prompt |
| AI 最小额外调用 | 方法论步骤中 AI 生成应在用户进入该步骤时自动触发，无需用户手动点击"AI生成"。但用户可手动重新触发 |

### AI Evaluation 约束

v2.1.0 开工前须确认 v2.0.2 的 AI Evaluation Harness ≥ 10 fixture 全部通过。v2.1.0 新增方法论步骤时，每个步骤至少添加 1 个新 fixture，确保 Evaluation Harness 覆盖方法论 AI 行为。

---

## 6. 执行顺序与依赖图

```
第 1 批（画板①）         第 2 批（画板②）         第 3 批（画板③）         第 4 批（画板④）
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│ PremiseCard v2     │ → │ StructureGraph     │ → │ 麻雀模式 9+3       │ → │ ChapterPacket      │
│ 最小五步           │   │ L1-L4 层级版本     │   │ 主角卡 3 步        │   │ 三档细度模式       │
└────────────────────┘   └────────────────────┘   └────────────────────┘   └────────────────────┘
                                                          │
                                                          ↓
                                                 第 5 批（P1，可选）
                                                 ┌────────────────────┐
                                                 │ 天/地/人三层展开   │
                                                 └────────────────────┘
```

**约束规则：**
- 第 1 批验收通过前，不启动第 2 批
- 第 2 批验收通过前，不启动第 3 批
- 第 3 批验收通过前，不启动第 4 批
- 第 5 批（P1）可推迟至 v2.1.1，不影响前 4 批的验收
- 每批开工前确认该批 file-lock 区域未被锁定

---

## 7. 验收命令与检查项

### 通用门禁（每批开工前确认）

```bash
cargo check                    # Rust 编译检查
tsc --noEmit                   # TypeScript 类型检查
npm run accept:static           # 静态代码合规
node scripts/acceptance/scan-contract-chain.mjs  # Contract Chain 完整性
npm run accept:e2e              # v2.0-H E2E 路径未损坏
```

### 每批验收检查项

| 批次 | 检查项 | 命令 / 方式 |
|------|--------|------------|
| 第 1 批 | 画板① 五步流程完整可用，每步有 AI 辅助 | 手动验收：走通五步流程 |
| 第 1 批 | 愿望清单 ≤ 10 条时"确认"灰显，≥ 10 条时可确认 | 手动验收 |
| 第 1 批 | 前提句确认后画板② 状态更新为"就绪" | 手动验收 |
| 第 2 批 | L1→L4 四层缩放完整可用 | 手动验收：层级切换 |
| 第 2 批 | 面包屑显示完整层级路径 | 手动验收 |
| 第 3 批 | 麻雀模式 12 步以自然语言问题呈现，无方法论术语 | 手动验收 |
| 第 3 批 | 步骤 3（核心异常）为必填项 | 手动验收 |
| 第 3 批 | 主角卡 3 步（能力/能动性/脆弱性）标记后可"可用" | 手动验收 |
| 第 4 批 | 三档细度模式切换正常（速写/标准/精编） | 手动验收 |
| 第 4 批 | 速写模式 Layer④ 折叠，精编模式全部字段可编辑 | 手动验收 |
| 第 5 批 | 麻雀模式完成后天/地/人三层数据正确展开 | 手动验收 |

### v2.1.0 最终验收 Gate

```bash
cargo check
tsc --noEmit
npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs
npm run accept:e2e                   # 回归 v2.0-H 路径
npm run test:ai-evaluation-harness   # v2.0.2 AI fixture ≥ 10 PASS + 方法论新增 fixture 全部通过
```

---

## 8. 阻断规则

| 条件 | 动作 |
|------|------|
| 某批次验收 FAIL | 不得进入下一批。回退到该批次画板重做。 |
| Contract Chain 断裂（任何一条由 PASS 变为 FAIL） | 立即阻断。回退到断裂 contract 对应节点。 |
| DB 操作违反累加式规则 | 立即阻断。回退到 DB 操作前状态。 |
| AI skill 未注册到 Skill Registry | 阻断。先注册再开工。 |
| AI Evaluation Harness 出现回归 FAIL | 阻断。修复 AI 模块后才能继续。 |
| 跨批次 file-lock 冲突（两个 worker 同时修改同一文件） | 阻断。由 Version Lead 仲裁执行顺序。 |
| 旧数据兼容规则被违反 | 阻断。回退到前端读取层兼容方案。 |

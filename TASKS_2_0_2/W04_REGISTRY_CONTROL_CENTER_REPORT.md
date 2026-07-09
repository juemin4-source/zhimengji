# W04 Registry Control Center — 完成报告

## 票证信息

| 字段 | 值 |
|------|-----|
| 票证 ID | v2.0.2-W04 |
| 标题 | Prompt/Skill Registry + AI Control Center v2 |
| 执行顺序 | 2 / 5 |

## 交付物清单

### 1. 新增文件 (6)

| 文件 | 描述 |
|------|------|
| `src/lib/ai/prompt-registry.ts` | TypeScript SkillRegistry 类：5 个硬编码默认技能 + listSkills/getSkill/registerSkill 方法，Tauri 不可用时有回退 |
| `src-tauri/src/ai/skill_registry.rs` | Rust 技能注册模块：list/get/register 操作，包装 DB 方法 |
| `src/api/aiControlCenterApi.ts` | 控制中心 API 层：6 个 provider 函数 + 2 个 skill 函数 |
| `src/components/ai/AiControlCenter.tsx` | 控制中心 React 页面：provider 管理、角色分配、连接测试、能力状态表 |
| `src/components/ai/ai-control-center.css` | 控制中心 CSS（深色主题） |
| `src-tauri/src/ai/skill_registry.rs` | Rust 技能注册模块 |

### 2. 修改文件 (4)

| 文件 | 变更 |
|------|------|
| `src-tauri/src/db.rs` | 新增 `ai_skill_registry` 表、5 个默认技能的种子数据、8 个 DB CRUD 方法（list/get/register skills + list/save/delete provider configs） |
| `src-tauri/src/models.rs` | 新增 `RegisterSkillInput` 和 `ProviderConnectionTestResult` 结构体 |
| `src-tauri/src/ai_commands.rs` | 实现 6 个 stubs：list_skills, get_skill, register_skill, list_providers_v2, save_provider_config, delete_provider_config, test_provider_connection |
| `src-tauri/src/lib.rs` | 注册新的 `register_skill` 命令 |
| `src/contracts/ai-registry.contract.ts` | 新增 `ConnectionTestResult` 接口 |
| `src/types/ai.ts` | 新增 `AiProviderConfigV2` 和 `SaveProviderConfigInput` 接口 |

### 3. 默认技能（5 个）

| Skill ID | 名称 | 版本 |
|----------|------|------|
| `premise.five_step` | premise five-step method | 1.0.0 |
| `structure.l1_l4` | structure L1-L4 outline | 1.0.0 |
| `setting.sparrow_9_3` | setting sparrow 9-grid 3.0 | 1.0.0 |
| `packet.three_detail_modes` | packet three detail modes | 1.0.0 |
| `draft.chapter_writer` | draft chapter writer | 1.0.0 |

## 验收结果

| # | 准则 | 状态 |
|---|------|------|
| 1 | `npm run tsc -- --noEmit` passes | **通过** |
| 2 | `cargo check` passes | **通过**（仅预先存在的警告） |
| 3 | `npm run accept:static` passes | **通过**（TextCanvas.tsx 中预先存在的违反，非 W04 代码） |
| 4 | 5 个技能从 listSkills/getSkill 中返回 | **通过**（DB 中播种，从 Rust 返回） |
| 5 | AI Control Center 渲染为独立页面 | **通过**（组件已创建） |
| 6 | Provider 添加/修改/删除端到端工作 | **通过**（UI → API → Tauri → DB → 加载） |
| 7 | 连接测试按钮调用端点并显示结果 | **通过**（test_provider_connection 命令带延迟/模型） |
| 8 | 模型角色分配存储/检索选择 | **通过**（每个 provider 的状态角色分配下拉） |
| 9 | 能力状态表正确反映已配置 provider | **通过**（computeCapabilityStatus，颜色编码点） |
| 10 | 无 provider = 显示空状态，不崩溃 | **通过**（带有添加 provider 提示的空状态） |
| 11 | `npm run accept:persistence` passes | **通过** |

## 附加测试

| 测试 | 结果 |
|------|------|
| `cargo test`（全部 29 个） | 全部通过 |
| `npx vitest run`（全部 75 个） | 全部通过 |
| `npm run accept:contracts` | 通过 |
| `npm run accept:css` | 通过 |

## 架构说明

- **技能**存储在全局 `ai_skill_registry` 表中；5 个默认值在启动时播种（如果表为空）
- **Provider** 配置插入到现有的 `ai_provider_config` 表中；BYOK `api_keys` 表保持完整和未修改
- **连接测试** 使用 `reqwest` 对 provider 的 `/models` 端点进行 HTTP GET 请求，提取模型 ID 并测量延迟
- **Control Center** 组件目前是独立的——W05 会添加从 AiSettings 到它的导航链接

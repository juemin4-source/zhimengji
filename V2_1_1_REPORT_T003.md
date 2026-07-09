# V2_1_1_REPORT_T003.md — Structure→Packet Navigation + DetailMode AI Wiring

**实现日期**: 2026-07-09
**状态**: PASS

---

## 测试结果摘要

| 检查项 | 结果 |
|--------|------|
| `npm run tsc -- --noEmit` | PASS (无类型错误) |
| `node scripts/acceptance/scan-contract-chain.mjs` | PASS (92/92, 0 FAIL) |
| `getPacketByStructureNodeId` API 函数 | 新增，符合 contract 链约定 |
| `detail-mode-prompt.ts` 辅助函数 | 新增，三态指令 |

---

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/api/chapterPacketApi.ts` | 修改 | 新增 `getPacketByStructureNodeId` API 函数 |
| `src/features/common/ai/detail-mode-prompt.ts` | **新建** | DetailMode AI 提示词指令辅助函数 |
| `src/features/canvas-02-structure/StructureGraph.tsx` | 修改 | L4 (Zhang) 双击时查询 packet 并跳转到画板④ |
| `src/App.tsx` | 修改 | 读取 `targetPacketId`，传入 `<ChapterPacketCanvas initialPacketId>` |
| `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` | 修改 | 新增 `initialPacketId` prop + 自动选中 + AI 生成时传入 `detailMode` |
| `src/lib/generateChapterPacket.ts` | 修改 | `GeneratePacketOptions` 新增 `detailMode` 字段 + prompt 注入粒度指令 |

---

### 详细改动

#### Sub-A: L4 (Zhang) → Canvas 4 跳转

1. **`src/api/chapterPacketApi.ts`** — 新增：
   - `GetPacketByStructureNodeInput` 接口
   - `getPacketByStructureNodeId(input)` 函数，调用 `get_packet_by_structure_node_id` Tauri command

2. **`src/features/canvas-02-structure/StructureGraph.tsx`** — 修改 `handleNodeDoubleClick`：
   - 导入 `chapterPacketApi`、`useToast`
   - L1-L3 非叶子节点：保留原有导航子层行为
   - L4 (Zhang) 叶子节点：调用 `getPacketByStructureNodeId` 查询 packet
     - 有 packet → `setStageNavigation('packet', packet.id)` 跳转到画板④
     - 无 packet → 弹出 toast "还没有对应的细纲包，请先在画板④创建"

3. **`src/App.tsx`**：
   - 读取 `targetPacketId`（来自 `useProjectStore`）
   - `packet` 画板渲染：从 `<PacketComingSoon />` 改为 `<ChapterPacketCanvas initialPacketId={targetPacketId} />`

4. **`src/features/canvas-04-packet/ChapterPacketCanvas.tsx`**：
   - 新增 `initialPacketId?: string | null` prop
   - 新增 auto-select `useEffect`：`loadData` 完成后，若有 `initialPacketId`，自动选中对应 packet
   - 自动选中后清除 store 中的 `targetPacketId`（通过 `setStageNavigation('packet', undefined)`），防止重复跳转
   - 使用 `useRef` 标记 `initialPacketProcessed`，确保只执行一次

#### Sub-B: DetailMode AI Granularity

5. **`src/features/common/ai/detail-mode-prompt.ts`** — 新建辅助函数：
   - `getDetailModeInstruction(mode)` 返回三态粒度指令字符串

6. **`src/lib/generateChapterPacket.ts`**：
   - `GeneratePacketOptions` 新增 `detailMode?: DetailMode` 字段
   - `buildPacketPrompt` 新增 `options.detailMode` 参数
   - prompt 末尾插入粒度指令（`- 输出粒度: ...`）

7. **`src/features/canvas-04-packet/ChapterPacketCanvas.tsx`** (续)：
   - `handleAiGenerate` 中调用 `generateChapterPacketFromUpstream` 时传入 `detailMode`

---

## 已知问题/风险

1. **后端 command 依赖**：`get_packet_by_structure_node_id` 需要在 Rust 后端实现后才能正常工作。前端调用在 command 未实现时会抛错误，已用 try/catch 处理并显示 toast。
2. **PacketComingSoon 导入**：App.tsx 中仍然导入了 `PacketComingSoon`（未被移除），但不再渲染。该组件可能在后续版本中用作其他用途。移除需确认无其他引用。
3. **detailMode 仅影响 AI 生成的 prompt 粒度**：输出内容的实际详细程度取决于 AI 模型对指令的遵循程度，非严格约束。

---

## 验收状态

### Sub-A 手动验收 (Path H)

| 步骤 | 状态 |
|------|------|
| H1: 完成 premise + structure | - |
| H2: 创建 chapter packet | - |
| H3: Canvas 2 → 双击 L4 → Canvas 4 定位到对应章节 | 代码就绪，需后端 command 配合测试 |
| H4: 面包屑显示上下文 | 不涉及 |
| H5: 返回 Canvas 2 → Layer state 保持 | ReactFlow layer state 由 navStack 管理，不涉及变化 |
| H6: 双击无 packet 的 L4 → toast 提示 | 代码就绪 |

### Sub-B 手动验收 (Path I)

| 步骤 | 状态 |
|------|------|
| I1: Sketch 模式 → AI 生成 → 简洁输出 | 代码就绪 |
| I2: Standard → AI 生成 → 平衡输出 | 代码就绪 |
| I3: Refined → AI 生成 → 详细输出 | 代码就绪 |
| I4: 刷新后模式保持 | 由后端 `get_packet_detail` / `set_detail_mode` 持久化，不涉及改动 |
| I5: "不再询问" 状态持久化 | 同上 |

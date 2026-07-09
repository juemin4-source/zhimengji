# T-003: Structure→Packet Navigation + DetailMode AI Wiring

> **Batch:** 3+4 | **Priority:** P0 | **Dependency:** T-001
> **Status:** Ready | **Version:** v2.1.1

## Goal

Two independent sub-items combined for efficiency:

**Sub-item A (Batch 3):** L4 (Zhang) node in Canvas 2 StructureGraph double-click jumps to Canvas 4 at the matching ChapterPacket. Bidirectional: premise→structure→packet chain complete at navigation level.

**Sub-item B (Batch 4):** DetailMode enum (sketch/standard/refined) consumed by AI generation infrastructure, affecting output granularity.

---

## Sub-item A: L4 (Zhang) → Canvas 4 Jump

### Scope

1. **Structure→Packet link mapping** — additive to structure.contract.ts:
   - When a Zhang node exists and user has created packets, maintain mapping table
   - Zhang node → corresponding ChapterPacket (matched by structureNodeId)
   - Display mapping info in Zhang node context (chapter number, title)

2. **L4 node click enhancement** in StructureGraph:
   - Single-click → show NodeDetailSidebar (existing behavior)
   - Double-click on L4 (Zhang) node → navigate to Canvas 4
   - If no matching packet exists → show toast "还没有对应的细纲包, 请先在画板④创建"
   - If matching exists → switch to 'packet' stage with target packet ID

3. **Cross-canvas navigation mechanism** — store-based:
   - Add `navigateToStage(stage, params?)` action to projectStore
   - `params` contains `{ targetPacketId?: string }` for auto-positioning
   - App.tsx's `currentStage` state reads from store → reacts to navigation request

4. **Canvas 4 auto-positioning:**
   - On arrival via L4 jump, ChapterPacketCanvas scrolls to/selectes the matching chapter
   - Breadcrumb shows packet context: "大纲 > 章XXX"
   - User can return to Canvas 2 → layer state retained

### File Locks (Sub A)

| Path | Action | Notes |
|------|--------|-------|
| `src/contracts/structure.contract.ts` | Edit | Additive — StructureToPacketLink types |
| `src/stores/projectStore.ts` | Edit | Additive — navigateToStage action |
| `src/stores/pipeline-helper.ts` | Edit | Additive — navigation helpers |
| `src/features/canvas-02-structure/StructureGraph.tsx` | Edit | Additive — L4 double-click handler |
| `src/features/canvas-02-structure/nodes/ZhangNode.tsx` | Edit | Additive — chapter packet link indicator |
| `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` | Edit | Additive — auto-position to target packet |
| `src/App.tsx` | Edit | Additive — consume store's navigateToStage action |
| `src/api/structureApi.ts` | Edit | Additive — getStructureToPacketMapping |
| `src/api/chapterPacketApi.ts` | Edit | Additive — getPacketByStructureNodeId |

**Note on App.tsx:** This is the minimal edit needed — React to store navigation changes. If we use a zustand subscription in App.tsx (already does this for `storeStage`), no additional callbacks are needed. The store action sets `navigateTo: { stage, packetId }` → a useEffect in App.tsx picks it up and calls `setCurrentStage(stage)` + passes packetId to ChapterPacketCanvas.

### Acceptance (Sub A)

**Manual Path H:**
1. Complete premise + structure (Canvas 1 + Canvas 2)
2. Create at least one chapter packet (Canvas 4)
3. Go to Canvas 2 → Locate L4 (Zhang) node
4. Double-click L4 node → Canvas 4 opens at corresponding chapter
5. Breadcrumb shows packet context
6. Go back to Canvas 2 → Layer state still retained
7. Double-click L4 without matching packet → toast message

---

## Sub-item B: DetailMode AI Granularity

### Scope

1. **DetailMode consumption in AI generation:**
   - The existing `packet.three_detail_modes` skill updated to accept `DetailMode` parameter
   - v2.0.2 Context Builder injects `detailMode` into AI prompt context
   - AI prompt modified: sketch mode → concise, TL;DR-style; standard → balanced; refined → detailed with sub-sections

2. **AI output verification:**
   - When AI generates in sketch mode → output is ~30-50% shorter than standard
   - When AI generates in refined mode → output has sub-sections, more detail, word count tracking
   - Mode selection persisted in packet detail config

3. **PacketDetailModeSelector integration:**
   - Confirm mode is persisted to backend via `setDetailMode` API (already exists)
   - Mode change triggers AI generation re-run with new mode parameter (if packet is in draft/confirmed state)
   - "Do not ask again" toggle works for mode switch prompt

4. **AI infra verification (pre-condition):**
   - Verify v2.0.2 Context Builder can inject per-invocation `DetailMode` parameter
   - If blocked → fallback to post-processing: truncate standard output for sketch, expand for refined

### File Locks (Sub B)

| Path | Action | Notes |
|------|--------|-------|
| `src/contracts/chapter-packet.contract.ts` | Edit | Additive — DetailModeAI config type (already has DetailMode) |
| `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` | Edit | Additive — mode-AI wiring |
| `src/features/canvas-04-packet/PacketDetailModeSelector.tsx` | Edit | Additive — integration with AI re-generation |
| `src/features/canvas-04-packet/PacketSketchView.tsx` | Edit | Additive — respect sketch mode rendering |
| `src/features/canvas-04-packet/PacketRefinedView.tsx` | Edit | Additive — respect refined mode rendering |
| `src/features/canvas-04-packet/chapter-packet.css` | Edit | Additive — mode-specific styles |
| `src/api/chapterPacketApi.ts` | Edit | Additive — AI generate with detailMode param |

### Acceptance (Sub B)

**Manual Path I:**
1. Create project → Canvas 4 → Select Sketch mode
2. AI generate → Output is concise, summary-level, ~30-50% of standard length
3. Switch to Standard → AI generate → Output is balanced
4. Switch to Refined → AI generate → Output is detailed, has sub-sections
5. Verify mode not lost on page refresh
6. Verify do-not-ask-again state persists

**Automated:**
```bash
npm run test:ai-evaluation-harness   # with DetailMode fixtures
```

---

## Combined Acceptance

```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 77/77
npm run accept:e2e
```

## Pre-conditions

- [ ] T-001 completed and accepted (pipeline foundation)
- [ ] For Sub B: Verify v2.0.2 Context Builder DetailMode injection capability before implementation

## Risk

- **Medium (Sub B):** If AI infra doesn't support DetailMode injection, fallback to post-processing. Post-processing is less ideal but acceptable for v2.1.1.
- **Low (Sub A):** Store-based navigation approach avoids App.tsx dependency injection — minimal risk.

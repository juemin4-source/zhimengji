# TICKET T-004 — Canvas 4: ChapterPacket Three Detail Modes

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-004 |
| Title | Canvas 4 — ChapterPacket Three Detail Modes (Batch 3) |
| Execution Order | 4 / 8 (Batch 3) |
| Dependencies | T-003 completed and accepted (Sparrow data as context for packet) |
| Risk | medium (existing packet base, detail mode switching is new pattern) |
| Terse | off |

## Objective

Deliver three detail modes for the ChapterPacket canvas: sketch (快速草图), standard (标准大纲), and refined (精细润色). Users can switch between modes, with different levels of structural detail exposed per mode.

The `DetailMode` enum must be shareable with v2.1.1 AI granularity (future AI will consume this setting to adjust output detail).

---

## Detailed Scope

### 1. CN-MET-04 Contract Types

Add method types to `src/contracts/chapter-packet.contract.ts` (additive only):

| Type | Description |
|------|-------------|
| `DetailMode` | Enum: `'sketch'` | `'standard'` | `'refined'` |
| `PacketDetailLevel` | { mode: DetailMode, sketchConfig?: SketchConfig, refinedConfig?: RefinedConfig } |
| `SketchConfig` | { collapsedLayer: 'layer4', showSummaryOnly: boolean, maxNodesPerLevel?: number, autoGenerate: boolean } |
| `RefinedConfig` | { allLayersEditable: true, showWordCount: boolean, showTimestamps: boolean, allowInlineComments: boolean } |

**No-op:** Do NOT modify existing packet types (ChapterPacketData, PacketNode, PacketEdge, etc.).

### 2. Backend: New Commands & DB

| File | Change |
|------|--------|
| `src-tauri/src/commands/packet_commands.rs` | Add commands: `set_detail_mode`, `get_packet_detail`, `auto_generate_sketch`, `save_refined_content` (additive only) |
| `src-tauri/src/db.rs` | Add 1 new table: `canvas4_packet_detail_modes` with `project_id`, `detail_mode`, `config_json`, `updated_at` (additive only) |
| `src-tauri/src/models.rs` | Add structs: `PacketDetailModeRecord`, `PacketDetailConfig` |

### 3. Frontend: ChapterPacket Three Detail Modes

#### Mode Selector

A mode switcher at the top of Canvas 4 (visual toggle, not a dropdown under a jargon label):

- **Sketch mode** ("Quick Sketch"): Layer 4 (Zhang) collapsed. Shows L1-L3 only. Auto-generates from sparrow/premise context. Summary-only display per node.
- **Standard mode** ("Standard Outline"): All 4 layers visible. Layer 4 reviewable but not detailed-editable. Default mode.
- **Refined mode** ("Polished Detail"): All layers fully editable. Word count visible. Timestamps per node. Inline comments on nodes.

Visual: A segmented control or tab-style selector with icons (or simple text labels). Mode label shown in natural language (no "DetailMode enum" visible).

#### Mode-Specific Behavior

| Feature | Sketch | Standard | Refined |
|---------|--------|----------|---------|
| L1 (Book) | Visible | Visible | Visible, editable |
| L2 (Shiwei) | Visible | Visible | Visible, editable |
| L3 (Hou) | Visible | Visible | Visible, editable |
| L4 (Zhang) | Collapsed | Visible, read-only | Visible, fully editable |
| AI Gen | Auto-generate | Manual trigger | Manual trigger |
| Word count | Hidden | Hidden | Shown |
| Timestamps | Hidden | Hidden | Shown per node |
| Inline comments | Hidden | Hidden | Available |

#### Switch Behavior

- Switching modes preserves all data (no data loss)
- Sketch -> Standard: L4 nodes are generatively expanded
- Standard -> Refined: all layers become editable
- Refined -> Standard: L4 becomes read-only
- Refined/Standard -> Sketch: L4 collapses (data preserved in DB, not shown)

#### Integration with Existing Packet UI

- The existing ChapterPacket structure (nodes, edges, connections) remains
- Only the visibility, editability, and AI generation behavior changes per mode
- Existing packet persistence continues to work (new detail mode stored in separate table)
- Old packet data (no detail mode) defaults to "standard" at read layer

### 4. Frontend API Layer

| File | Change |
|------|--------|
| `src/api/chapterPacketApi.ts` | Add 4 new API functions matching backend commands |

### 5. AI Integration

- Skill used: `packet.three_detail_modes`
- AI auto-generates sketch mode content on entry (from sparrow context)
- AI generates expanded L4 when switching from sketch to standard
- Three-state enforcement
- "Do not ask again" toggle on mode selection

---

## Allowed Write

```
MODIFY: src/contracts/chapter-packet.contract.ts       (add CN-MET-04 types — additive only)
MODIFY: src-tauri/src/commands/packet_commands.rs      (add commands — additive only)
MODIFY: src-tauri/src/db.rs                            (add 1 table — additive only)
MODIFY: src-tauri/src/models.rs                        (add structs — additive only)
MODIFY: src/api/chapterPacketApi.ts                    (add API functions)
MODIFY: src/features/canvas-04-packet/**               (detail mode UI + mode-aware behavior)
MODIFY: src/stores/*                                   (add detail mode state — additive)
MODIFY: src/features/common/method-step/*              (extend if needed)
NEW: src/features/canvas-04-packet/PacketDetailModeSelector.tsx
NEW: src/features/canvas-04-packet/PacketSketchView.tsx
NEW: src/features/canvas-04-packet/PacketRefinedView.tsx
```

## Read Only (for context)

```
src/features/canvas-04-packet/current      — existing packet UI (reference)
src/features/common/method-step/           — shared components from T-002
src/contracts/setting.contract.ts          — sparrow data (AI context for sketch gen)
src/lib/ai/command-router.ts              — v2.0.2 AI router
```

## Forbidden

```
Any other canvas feature files
src/contracts/structure.contract.ts        — CN-MET-02 (T-005)
src/contracts/premise.contract.ts          — LOCKED after T-002
src/contracts/setting.contract.ts          — LOCKED after T-003
Existing DB tables (add only, never ALTER)
```

## Acceptance Criteria

1. `cargo check` and `npm run tsc -- --noEmit` pass
2. `npm run accept:static` passes
3. Three detail modes switchable via visual selector
4. Sketch mode: L4 collapsed, L1-L3 visible, summary-only display
5. Standard mode: all 4 layers visible, L4 read-only
6. Refined mode: all layers editable, word count + timestamps + comments visible
7. Switching modes preserves all data (no data loss on mode switch)
8. Sketch -> Standard: L4 nodes auto-expand (AI generates)
9. Old packet data (no detail mode) defaults to "standard" — no crash, no data loss
10. Mode selection persists on refresh (DB-backed)
11. Do-not-ask-again toggle on mode selector functional
12. No methodology jargon in mode labels or descriptions
13. v2.0-H regression: canvas navigation, project creation, data persistence intact

## Notes

- Data preservation during mode switching is critical. All layers' data must be retained in DB even when visually collapsed.
- The DetailMode enum is the "shareable with v2.1.1" contract. v2.1.1 AI granularity will consume `PacketDetailLevel.mode` to adjust AI output detail. Design the enum to be stable.
- Old packet data (created before v2.1.0) has no detail mode — default to "standard" at read layer. The DB column can be NULL or absent; frontend defaults to standard when no record exists.
- AI generation for sketch mode uses sparrow data (Canvas 3) as context. If sparrow data is incomplete, AI works with what's available.
- Per-batch acceptance (Sec 12): three modes switch correctly; sketch=layer4 collapsed; refined=all editable.

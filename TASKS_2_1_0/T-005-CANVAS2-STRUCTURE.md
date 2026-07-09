# TICKET T-005 — Canvas 2: StructureGraph L1-L4

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-005 |
| Title | Canvas 2 — StructureGraph L1-L4 Hierarchy (Batch 4) |
| Execution Order | 5 / 8 (Batch 4) |
| Dependencies | T-001 (spike report available and verdict FEASIBLE), T-004 completed and accepted |
| Risk | high (@xyflow custom hierarchy, highest risk in v2.1.0) |
| Terse | off |

## Objective

Deliver the StructureGraph L1-L4 zoomable hierarchy on Canvas 2 using @xyflow (reactflow). The hierarchy layers are: Book (L1) -> Shiwei (L2) -> Hou (L3) -> Zhang (L4), with zoom-to-layer navigation, breadcrumb trail, and full layer state retention.

This is the highest-risk item in v2.1.0. Implementation must be informed by T-001 spike findings.

---

## Detailed Scope

### 1. CN-MET-02 Contract Types

Add method types to `src/contracts/structure.contract.ts` (additive only):

| Type | Description |
|------|-------------|
| `BookLayer` | { id, title, summary, children: ShiweiLayer[] } |
| `ShiweiLayer` | { id, title, timePeriod, summary, children: HouLayer[] } |
| `HouLayer` | { id, title, chapterRange, summary, children: ZhangLayer[] } |
| `ZhangLayer` | { id, title, sceneCount, wordCount, summary } |
| `LayerType` | Enum: `'book'` | `'shiwei'` | `'hou'` | `'zhang'` |
| `HierarchyBreadcrumb` | { layers: { type: LayerType, id: string, label: string }[], currentLayer: LayerType } |
| `StructureGraphState` | { layers, selectedNodeId?, zoomLevel, viewport } |

**No-op:** Do NOT modify any existing structure types. The current Canvas 2 may have placeholder data structures; this ticket replaces or enhances them.

### 2. Backend: New Commands & DB

| File | Change |
|------|--------|
| `src-tauri/src/commands/structure_commands.rs` | Add commands: `save_structure_node`, `get_structure_tree`, `update_node_position`, `zoom_to_layer`, `ai_generate_structure` (additive only) |
| `src-tauri/src/db.rs` | Add 1 new table: `canvas2_structure_nodes` with parent_id hierarchy, layer_type, position data (additive only) |
| `src-tauri/src/models.rs` | Add structs: `StructureNodeRecord`, `StructureTreeOutput`, `NodePosition` |

### 3. Frontend: StructureGraph L1-L4 Custom Hierarchy

#### @xyflow Implementation (Spike-Informed)

Follow the T-001 spike report's recommended approach. Typical implementation includes:

- Custom node types for each layer (BookNode, ShiweiNode, HouNode, ZhangNode) with distinct visual styling
- Custom edge types showing parent-child relationships
- Zoom-to-layer behavior: double-click or breadcrumb click navigates to that layer
- Pan across the entire graph

#### Layer Navigation

| Interaction | Result |
|-------------|--------|
| Click node | Select node (highlight + sidebar detail) |
| Double-click node | Zoom to that node's layer (show its children) |
| Breadcrumb click | Jump directly to that layer |
| Zoom in/out | Smooth zoom, auto-adjust node sizing |
| Pan | Drag canvas, all layers move together |

#### Breadcrumb

Displayed at top of canvas:
```
Book Title > Shiwei Name > Hou Name > Zhang Name
```
- Current layer highlighted
- Click any segment to navigate to that layer
- Breadcrumb updates dynamically as user navigates

#### Layer State Retention

- Expanded/collapsed state per node persists across navigation
- Scroll position and viewport retained per layer
- Selection state (selected node) follows navigation
- State persists on page refresh (DB-backed through position and state storage)

#### Visual Design

- Each layer type has a distinct visual style (size, color, shape) that visually communicates hierarchy
- L1 (Book): largest, most prominent
- L2 (Shiwei): medium-large
- L3 (Hou): medium
- L4 (Zhang): smallest, densest
- Lines/edges connect parent to children with clear direction
- No methodology jargon in labels

#### Integration with Canvas 2

- Canvas 2 shows "ready" badge when premise (Canvas 1) is confirmed AND at least L1-L2 structure exists
- The existing Canvas 2 navigation and persistence continue to work
- Old Canvas 2 view (if any) is replaced by the new hierarchy

### 4. Frontend API Layer

| File | Change |
|------|--------|
| `src/api/structureApi.ts` | Add 5 new API functions matching backend commands |

### 5. Performance Requirements

Based on spike findings, implement at minimum:
- Smooth rendering at 500+ nodes
- Virtualization/windowing if spike shows performance issues at 1000+ nodes
- Level-of-detail rendering: L4 nodes render as simpler shapes when zoomed out
- Debounced viewport save (don't write to DB on every pan)

### 6. AI Integration

- Skill used: `structure.l1_l4`
- AI auto-generates initial structure from premise data when Canvas 2 is first opened
- User can add/edit/delete nodes at any layer
- Three-state enforcement
- AI can suggest structure expansions based on premise + sparrow context

---

## Allowed Write

```
MODIFY: src/contracts/structure.contract.ts           (add CN-MET-02 types — additive only)
MODIFY: src-tauri/src/commands/structure_commands.rs  (add commands — additive only)
MODIFY: src-tauri/src/db.rs                           (add 1 table — additive only)
MODIFY: src-tauri/src/models.rs                       (add structs — additive only)
MODIFY: src/api/structureApi.ts                       (add API functions)
MODIFY: src/features/canvas-02-structure/**           (StructureGraph L1-L4 UI)
MODIFY: src/stores/*                                  (add structure graph state — additive)
MODIFY: src/features/common/method-step/*             (extend if needed)
NEW: src/features/canvas-02-structure/StructureGraph.tsx
NEW: src/features/canvas-02-structure/nodes/BookNode.tsx
NEW: src/features/canvas-02-structure/nodes/ShiweiNode.tsx
NEW: src/features/canvas-02-structure/nodes/HouNode.tsx
NEW: src/features/canvas-02-structure/nodes/ZhangNode.tsx
NEW: src/features/canvas-02-structure/StructureBreadcrumb.tsx
NEW: src/features/canvas-02-structure/NodeDetailSidebar.tsx
```

## Read Only (for context)

```
.claude/spikes/canvas2-xyflow/              — spike prototype code
docs/execution/spike-canvas2-xyflow-report.md — spike report (MUST read before implementing)
src/features/canvas-02-structure/current    — existing canvas 2 (reference for replacement)
src/features/common/method-step/            — shared components from T-002
src/contracts/premise.contract.ts           — premise data (AI context for structure gen)
src/lib/ai/command-router.ts               — v2.0.2 AI router
```

## Forbidden

```
Any other canvas feature files
src/contracts/premise.contract.ts           — LOCKED after T-002
src/contracts/setting.contract.ts           — LOCKED after T-003
src/contracts/chapter-packet.contract.ts    — LOCKED after T-004
Existing DB tables (add only, never ALTER)
No @xyflow/react version upgrade (use current installed version)
```

## Acceptance Criteria

1. `cargo check` and `npm run tsc -- --noEmit` pass
2. `npm run accept:static` passes
3. T-001 spike report read and implementation follows spike recommendations
4. L1-L4 layers render correctly in @xyflow graph
5. Zoom-to-layer: double-click node navigates to its child layer
6. Breadcrumb displays correct path ("L1 > L2 > L3 > L4"), click navigates
7. Layer state retention: expanded/selected state persists across navigation
8. State persists on page refresh (DB-backed)
9. Canvas 2 shows "ready" badge when premise confirmed + L1-L2 exists
10. Smooth performance at realistic node counts (validate against spike thresholds)
11. Each layer type has visually distinct styling
12. AI auto-generates initial structure from premise data
13. No methodology jargon visible
14. v2.0-H regression: canvas navigation, project creation, data persistence intact

## Notes

- **CRITICAL:** Read the spike report (`docs/execution/spike-canvas2-xyflow-report.md`) BEFORE writing any code. The spike findings may substantially affect implementation direction.
- This is the highest-risk item in v2.1.0. If the spike verdict is FEASIBLE_WITH_CAVEATS, the caveats must be addressed in this ticket.
- If the spike verdict is INFEASIBLE, this ticket is BLOCKED. Report to Version Lead immediately.
- Performance at scale is the primary risk. Use the spike's performance thresholds as acceptance criteria.
- The @xyflow ReactFlow component may need `react-flow-renderer` or `@xyflow/react` — use whatever is already installed.
- Layer state retention requires both in-memory (zustand store) and DB (position, expanded state) persistence. The DB is the source of truth on refresh.
- L4 node count may be high. Implement level-of-detail or virtualization if needed.
- Per-batch acceptance (Sec 12): L1-L4 zoom, breadcrumb, layer state retention all work; Canvas 2 shows "ready" after premise.

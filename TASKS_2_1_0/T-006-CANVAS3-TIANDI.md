# TICKET T-006 — Canvas 3: Heaven/Earth/Human Three-Layer Expansion

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-006 |
| Title | Canvas 3 — Heaven/Earth/Human Three-Layer Expansion (Batch 5, P1 Optional) |
| Execution Order | 6 / 8 (Batch 5) |
| Dependencies | T-005 completed and accepted (all P0 items done) |
| Risk | low (incremental on Canvas 3 Sparrow mode) |
| Terse | off (may be deferred, needs clear decision) |
| Priority | **P1** — may defer to v2.1.1. Only execute if all P0 batches (T-002~T-005) are complete and accepted. |

## Objective

Add the heaven/earth/human (天/地/人) three-layer expansion to Canvas 3's Sparrow mode. This is an optional P1 enhancement that adds a conceptual lens layer on top of the 9+3 sparrow steps.

If insufficient time remains after P0 batches, this ticket is deferred to v2.1.1.

---

## Detailed Scope

### 1. Contract (Additive to CN-MET-03)

The `TianDiRenLayer` type was already defined in T-003's CN-MET-03 (if not, add it now):

| Type | Description |
|------|-------------|
| `TianDiRenLayer` | { tian: string, di: string, ren: string, isExpanded } |

If `TianDiRenLayer` was already created in T-003, this ticket only adds the UI layer.

### 2. Backend

| File | Change |
|------|--------|
| `src-tauri/src/commands/setting_commands.rs` | Add `save_tiandiren_layer` command (if not already added in T-003) |
| `src-tauri/src/db.rs` | Add 1 table: `canvas3_tiandiren` (additive only, if not already added) |
| `src-tauri/src/models.rs` | Add struct if needed |

### 3. Frontend: Three-Layer Expansion UI

Add a new collapsible section in Canvas 3's Sparrow mode interface:

#### Heaven Layer (天时)
- Label: "The greater forces at play" (natural language)
- Text area: "What forces shape the world beyond individual control?" (natural language)
- AI suggests based on sparrow steps + premise context

#### Earth Layer (地利)
- Label: "The physical and social landscape" (natural language)
- Text area: "What environments and systems define your world?" (natural language)
- AI suggests based on sparrow steps

#### Human Layer (人和)
- Label: "The people and their relationships" (natural language)
- Text area: "Who are the key players and how do they connect?" (natural language)
- AI suggests based on sparrow steps + protagonist data

#### UI Pattern
- Collapsible section: "Expand perspectives" (natural language, not "Three Layers")
- Inside: 3 card areas, one per layer
- Each has: AI suggest button, text area, "Do not ask again" toggle
- AI fills first, user reviews
- Data persists to DB

---

## Allowed Write

```
MODIFY: src/contracts/setting.contract.ts            (add TianDiRenLayer if not in T-003 — additive only)
MODIFY: src-tauri/src/commands/setting_commands.rs   (add commands if not in T-003)
MODIFY: src-tauri/src/db.rs                          (add table if not in T-003)
MODIFY: src-tauri/src/models.rs                      (add struct if needed)
MODIFY: src/api/settingApi.ts                        (add 1 API function)
MODIFY: src/features/canvas-03-setting/**            (three-layer expansion UI)
NEW: src/features/canvas-03-setting/TianDiRenExpansion.tsx
```

## Read Only (for context)

```
src/features/canvas-03-setting/current       — existing sparrow UI
src/features/common/method-step/             — shared components
src/contracts/premise.contract.ts            — premise data (AI context)
```

## Forbidden

```
Any other canvas feature files
Existing DB tables (add only, never ALTER)
```

## Acceptance Criteria

1. Three-layer expansion section renders as collapsible section in Canvas 3
2. AI fills first for each layer on initial expansion
3. Each layer has "Do not ask again" toggle
4. Data persists on refresh
5. No methodology jargon ("Heaven/Earth/Human" or "Three Layers" not visible as labels — users see natural language questions)
6. Canvas 3 regression: existing sparrow 9+3 steps intact
7. v2.0-H regression intact

## Notes

- **Deferral condition:** If T-005 (Canvas 2) is still in progress or acceptance is pending, this ticket is deferred to v2.1.1. Do not start T-006 until Version Lead confirms all P0 are accepted.
- The deferral decision should be documented in `docs/decisions.md` if carried out.
- AI context for each layer: Heaven uses full sparrow + premise; Earth uses sparrow step 4-6 (power/rules/daily life); Human uses protagonist steps + step 8 (threats).
- Per-batch acceptance (Sec 12): three-layer expansion data correct (if implemented).

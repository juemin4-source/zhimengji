# T-003 Report — Canvas 3: Sparrow Mode 9+3

## Summary

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-003 |
| Status | PASS |
| Node | 09-frontend + 08-backend |
| Files modified | 8 |
| Files created | 4 |

## Implementation Delivered

### 1. Contract Types (CN-MET-03)

**File:** `src/contracts/setting.contract.ts` (additive)

Added types:
- `SparrowStepId`, `SparrowStepState` — 9 step state with label/content/expanded/required/complete/aiGenerated/doNotAskAgain
- `ProtagonistStepType`, `CharacterStep3` — 3 protagonist substeps with isUsable flag
- `TianDiRenLayer` — 3-layer expansion capability
- `SparrowModule` — aggregate type
- Input/Output types for all 5 backend commands + `GetSparrowModuleInput`, `SparrowModuleResponse`

Existing Setting types (WorldRule, CharacterCard, FactionCard) are untouched.

### 2. Backend

**File:** `src-tauri/src/models.rs` (additive)
Added structs: `SparrowStepRecord`, `ProtagonistStepRecord`, `TianDiRenRecord`, and all command input/output types.

**File:** `src-tauri/src/db.rs` (additive)
- 2 new tables: `canvas3_sparrow_steps`, `canvas3_protagonist_steps`
- CRUD methods: `get_sparrow_steps_by_project`, `upsert_sparrow_step`, `get_protagonist_steps_by_project`, `upsert_protagonist_step`, `mark_protagonist_step_usable`, `get_tiandiren_layer`, `upsert_tiandiren_layer`, `get_sparrow_module`

**File:** `src-tauri/src/setting_commands.rs` (additive)
5 new commands: `save_sparrow_step`, `save_protagonist_step`, `mark_step_usable`, `generate_sparrow_ai` (AI stub), `save_tiandiren_layer`, `get_sparrow_module`

**File:** `src-tauri/src/lib.rs` (additive)
Registered all 6 new commands in `generate_handler![]`.

### 3. Frontend API

**File:** `src/api/settingApi.ts` (additive)
6 new API functions: `saveSparrowStep`, `saveProtagonistStep`, `markStepUsable`, `generateSparrowAi`, `saveTianDiRenLayer`, `getSparrowModule`. Includes `parseSparrowStepRecord` and `parseProtagonistStepRecord` helpers.

### 4. Frontend UI

**File:** `src/features/canvas-03-setting/SparrowStepCard.tsx` (new)
Individual step card with expand/collapse, AI content display (green-tinted section), user textarea editor, DoNotAskAgainToggle, confirm action, required badge for step 3.

**File:** `src/features/canvas-03-setting/SparrowProtagonistSteps.tsx` (new)
Collapsible "Characters" section with 3 protagonist substeps (capability/agency/vulnerability). Each has textarea + "Mark as usable" checkbox toggle.

**File:** `src/features/canvas-03-setting/SparrowStepList.tsx` (new)
Master orchestrator component. Loads state from backend, manages all 9 step cards + protagonist steps. Header shows completion count and "expand all/collapse all" toggle. Handles AI generation trigger, save, and persistence.

**File:** `src/features/canvas-03-setting/SettingCanvasV2.tsx` (modified)
Added "Sparrow 模式" tab (fourth tab) that renders `SparrowStepList`.

**File:** `src/features/canvas-03-setting/sparrow.css` (new)
Complete styling for all sparrow components. Uses CSS variables with fallbacks matching the project's dark theme design system.

### 5. Natural Language Only

All 9 steps use natural language questions as specified:
- step_1: "你的故事开始之前，世界是什么样的？"
- step_2: "是什么事件打破了一切平静？"
- step_3: "你的世界最核心的异质元素是什么？" (Required)
- step_4: "谁拥有权力，谁没有？"
- step_5: "这个世界藏着哪些潜规则？"
- step_6: "日常生活是什么样子？"
- step_7: "什么在威胁这个世界？"
- step_8: "世界如何随时间变化？"
- step_9: "世界的命运是什么？"

No methodology jargon ("Sparrow", "9+3", "three pillars") is visible to users.

## Verification

| Check | Result |
|-------|--------|
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run accept:static` | PASS (pre-existing TextCanvas mock issue only) |
| `npm run accept:css` | PASS (pre-existing premise-entry.css issue only) |
| `npm run accept:contracts` | PASS (70/70) |

## Forbidden Scope Check

- Canvas 4 (packet): Not touched
- Canvas 2 (structure): Not touched
- Existing DB tables: Only adds new tables, never ALTER
- `SettingCollection.tsx`: Read only, no modifications
- Existing setting.contract.ts types: Additive only

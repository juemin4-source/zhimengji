# TICKET T-003 — Canvas 3: Sparrow Mode 9+3

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-003 |
| Title | Canvas 3 — Sparrow Mode 9+3 (Batch 2) |
| Execution Order | 3 / 8 (Batch 2) |
| Dependencies | T-002 completed and accepted (shared method-step components exist) |
| Risk | low-medium (new method pattern on existing canvas 3) |
| Terse | off |

## Objective

Deliver the Sparrow mode 9+3 methodology on Canvas 3: 9 expanded steps for world-building, with 3 steps collapsed under "protagonist", and a 3-layer (heaven/earth/human) expansion capability.

All steps use natural language questions (no methodology jargon). Step 3 (core anomaly) is required. The protagonist 3 steps (capability / agency / vulnerability) are markable as "usable" for downstream.

---

## Detailed Scope

### 1. CN-MET-03 Contract Types

Add method types to `src/contracts/setting.contract.ts` (additive only):

| Type | Description |
|------|-------------|
| `SparrowModule` | { steps: SparrowStepState[], protagonistSteps: CharacterStep3[], tianDiRen?: TianDiRenLayer } |
| `SparrowStepState` | { stepId, label (natural language), content, isExpanded, isRequired, isComplete, aiGenerated? } |
| `SparrowStepEnum` | Enum of 9 step IDs (natural language labels like "the_world_before", "the_inciting_incident", etc. — names internal only, UI shows natural language) |
| `CharacterStep3` | { stepType: 'capability' | 'agency' | 'vulnerability', characterId, description, isUsable } |
| `TianDiRenLayer` | { tian: string, di: string, ren: string, isExpanded } |

**No-op:** Do NOT modify existing setting types (SettingCollection, WorldRule, CharacterCard, etc.).

### 2. Backend: New Commands & DB

| File | Change |
|------|--------|
| `src-tauri/src/commands/setting_commands.rs` | Add commands: `save_sparrow_step`, `save_protagonist_step`, `mark_step_usable`, `generate_sparrow_ai`, `save_tiandiren_layer` (additive only) |
| `src-tauri/src/db.rs` | Add 2 new tables: `canvas3_sparrow_steps`, `canvas3_protagonist_steps` (additive only) |
| `src-tauri/src/models.rs` | Add structs: `SparrowStepRecord`, `ProtagonistStepRecord`, `TianDiRenRecord` |

### 3. Frontend: Sparrow Mode 9+3 UI

#### 9 Expanded Steps

The 9 steps are displayed as natural language questions (never as jargon terms):

| Internal Step ID | Natural Language Label (UI) | Required? |
|-----------------|---------------------------|-----------|
| step_1 | "What was the world like before your story begins?" | No |
| step_2 | "What incident sets everything in motion?" | No |
| step_3 | **"What is the core anomaly or special element of your world?"** | **Yes** |
| step_4 | "Who holds power, and who doesn't?" | No |
| step_5 | "What are the hidden rules of this world?" | No |
| step_6 | "What does daily life look like?" | No |
| step_7 | "What threatens this world?" | No |
| step_8 | "How does your world change over time?" | No |
| step_9 | "What is the world's destiny?" | No |

Each step:
- AI fills first (natural language suggestion based on project context)
- User reviews and edits
- "Do not ask again" toggle
- Steps are expandable/collapsible (9 expanded view)
- Step 3 has a visual indicator that it's required (but user can still skip — "skip" means the step is marked as incomplete but non-blocking for canvas navigation)

#### Protagonist 3 Steps (Collapsed)

Under a "Characters" section (collapsed by default), 3 substeps:

| Substep | Natural Language Label | UI |
|---------|----------------------|-----|
| capability | "What can your protagonist do?" | Text area + AI suggest |
| agency | "What choices does your protagonist make?" | Text area + AI suggest |
| vulnerability | "What holds your protagonist back?" | Text area + AI suggest |

Each substep has a "Mark as usable" toggle (stored as `isUsable` boolean).
When marked usable, downstream (v2.1.1) can consume this data.

#### UI Pattern (Reuse from T-002)

- Use `StepProgressIndicator` from common components (adapted: treelike instead of linear)
- Use `AiFillCard` for each step's content area
- Use `DoNotAskAgainToggle` per step

#### Layout
- 9 steps in a scrollable vertical layout
- Steps collapsed/expanded individually, or all-expand via a toggle
- "Characters" section is a collapsible subsection within the flow
- Natural language only — no "Sparrow", "9+3", "three pillars" visible

### 4. Frontend API Layer

| File | Change |
|------|--------|
| `src/api/settingApi.ts` | Add 5 new API functions matching backend commands |

### 5. AI Integration

- Skill used: `setting.sparrow_9_3`
- AI auto-triggers on step entry (pre-fills content)
- Three-state enforcement
- AI suggests based on project context (premise data from Canvas 1)

---

## Allowed Write

```
MODIFY: src/contracts/setting.contract.ts            (add CN-MET-03 types — additive only)
MODIFY: src-tauri/src/commands/setting_commands.rs   (add commands — additive only)
MODIFY: src-tauri/src/db.rs                          (add 2 tables — additive only)
MODIFY: src-tauri/src/models.rs                      (add structs — additive only)
MODIFY: src/api/settingApi.ts                        (add API functions)
MODIFY: src/features/canvas-03-setting/**            (Sparrow mode 9+3 UI)
MODIFY: src/stores/*                                 (add sparrow state — additive)
MODIFY: src/features/common/method-step/*            (extend if needed)
NEW: src/features/canvas-03-setting/SparrowStepList.tsx
NEW: src/features/canvas-03-setting/SparrowProtagonistSteps.tsx
NEW: src/features/canvas-03-setting/SparrowStepCard.tsx
```

## Read Only (for context)

```
src/features/canvas-03-setting/current      — existing setting UI (reference)
src/features/common/method-step/            — shared components from T-002
src/contracts/premise.contract.ts           — premise data (AI context)
src/lib/ai/command-router.ts               — v2.0.2 AI router
```

## Forbidden

```
Any other canvas feature files
src/contracts/structure.contract.ts        — CN-MET-02 (T-005)
src/contracts/chapter-packet.contract.ts   — CN-MET-04 (T-004)
Existing DB tables (add only, never ALTER)
Legacy: SettingCollection.tsx (read only)
```

## Acceptance Criteria

1. `cargo check` and `npm run tsc -- --noEmit` pass
2. `npm run accept:static` passes
3. All 9 steps render as natural language questions (no jargon visible)
4. Step 3 (core anomaly) is visually indicated as required
5. Each step: AI fills first on entry, user can edit
6. All 9 steps expandable/collapsible individually
7. "Characters" section collapsed by default with 3 protagonist substeps
8. Each protagonist substep has "Mark as usable" toggle
9. Step data persists on refresh (DB write happens on confirm/save)
10. Do-not-ask-again toggle functional per step
11. Protagonist steps: capability/agency/vulnerability displayed with natural language labels
12. No methodology jargon visible ("Sparrow", "9+3", etc.)
13. v2.0-H regression: canvas navigation, project creation, data persistence intact
14. Old character card (description-only) shows empty state + guidance text (read-time compatibility)
15. Step 3 (required) can be skipped by user — no forced block, but visually noted as incomplete

## Notes

- The 9 step labels in code use internal IDs (step_1..step_9). Only the natural language labels are shown to users.
- Step 3 is "required" for methodology completeness, but the system is non-blocking — users can skip and come back.
- The protagonist 3 steps use a separate table (`canvas3_protagonist_steps`) because they have a different schema (character-specific).
- The "Mark as usable" toggle is the v2.1.0 contract surface for v2.1.1 inter-canvas linkage.
- Old character data (description-only from v2.0-H) at read layer: show empty state + "Let's build your character" guidance.
- Per-batch acceptance (Sec 12): all 12 steps as natural language, step 3 required, protagonist steps usable-flag functional.

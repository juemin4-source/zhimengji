# TICKET T-002 — Canvas 1: PremiseCard v2 Five-Step

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-002 |
| Title | Canvas 1 — PremiseCard v2 Five-Step (Batch 1) |
| Execution Order | 2 / 8 (Batch 1) |
| Dependencies | T-000 (prework + skill `premise.five_step` registered) |
| Risk | low (incremental on existing canvas 1) |
| Terse | off (risk=low but new method-step pattern) |

## Objective

Deliver the PremiseCard v2 five-step methodology on Canvas 1, with AI assistance per step.

Users complete 5 steps: (1) Wishlist, (2) Intern/Extern, (3) Premise Variants, (4) Reader Q&A, (5) Genre Judgment. Each step is AI-assisted, uses natural language (no jargon), follows the "AI fills first, user reviews" pattern, and is non-blocking (users may skip).

---

## Detailed Scope

### 1. CN-MET-01 Contract Types

Add method types to `src/contracts/premise.contract.ts` (additive only, do not modify existing types):

| Type | Description |
|------|-------------|
| `WishlistItem` | { id, text, category?, priority?, enabled } |
| `PremiseVariant` | { id, title, summary, coreConflict, selected? } |
| `ReaderQuestion` | { id, question, answer?, category? } |
| `GenreJudgment` | { primaryGenre, subGenres[], confidence, reasoning? } |
| `PremiseFiveStepState` | { currentStep, wishlist, internExtern, variants, qa, genreJudgment, completedSteps[] } |
| `PremiseStep` | enum (wishlist / internExtern / variants / readerQA / genreJudgment) |

**No-op:** Do NOT modify existing premise types (PremiseData, PremiseCardProps, etc.).

### 2. Backend: New Commands & DB

| File | Change |
|------|--------|
| `src-tauri/src/commands/premise_commands.rs` | Add 5 new commands (additive only): `save_wishlist`, `generate_variants`, `save_variant_selection`, `generate_reader_qa`, `save_genre_judgment` |
| `src-tauri/src/db.rs` | Add 1 new table: `canvas1_premise_steps` with columns for step data (additive only, CREATE TABLE IF NOT EXISTS) |
| `src-tauri/src/models.rs` | Add 1 new struct: `PremiseStepRecord` (additive only) |

Each command: `Result<T, String>` with `{ input }` parameter pattern.
Each command calls AI via v2.0.2 Command Router (not direct llm-client).

### 3. Frontend: PremiseCard v2 UI

Replace the current PremiseCard with a 5-step flow:

#### Step 1 — Wishlist (愿望清单)
- Display: "What kind of story do you want to write?" (natural language prompt)
- AI pre-fills 10+ wishlist items based on project context
- User can add/edit/remove wishes
- **Gate:** Wishlist >= 10 items -> confirm button enabled. < 10 -> confirm disabled with encouraging message
- "Do not ask again" toggle

#### Step 2 — Intern/Extern (内驱/外驱)
- Display: "Why does this story matter to you? What audience needs it?" (natural language)
- Two simple text areas: internal drive, external drive
- AI suggests based on selected wishes
- User reviews and edits

#### Step 3 — Premise Variants (前提变体)
- AI generates 3 premise variant cards based on wishlist + intern/extern
- Each variant: title, one-line summary, core conflict
- User selects one (tagged as "selected")
- User can regenerate variants

#### Step 4 — Reader Q&A (读者问答)
- AI generates 5–7 natural questions a reader would ask about the premise
- Each question: a text field for user's answer
- User fills answers or skips (answers stored but visible as empty)

#### Step 5 — Genre Judgment (品类判断)
- AI suggests primary genre + sub-genres based on all previous steps
- User can adjust genre selections
- Display confidence indicator (low/medium/high — not a percentage, no jargon)
- "Do not ask again" toggle

#### UI Requirements
- Step progress indicator: "Step 2 of 5" (visible position, no jargon labels)
- Each step: AI fills first, user reviews — never ask user to fill from blank
- "Do not ask again" toggle on every step
- Non-blocking: user may skip any step (step marked as "skipped")
- When step is confirmed via AI -> data persisted -> DB write
- Confirm action triggers: save to DB + advance to next step
- After all 5 steps confirmed -> Canvas 2 badge shows "ready"

### 4. Frontend API Layer

| File | Change |
|------|--------|
| `src/api/premiseApi.ts` | Add 5 new API functions matching backend commands: `saveWishlist()`, `generateVariants()`, `saveVariantSelection()`, `generateReaderQA()`, `saveGenreJudgment()` |

Each function: typed input/output, uses `invoke` (not direct), uniform error handling.

### 5. AI Integration

- All 5 steps use AI via v2.0.2 Command Router
- Skill used: `premise.five_step`
- Three-state enforcement: discuss=never DB, suggest=only after ACCEPT, write_preview=only after CONFIRM
- AI auto-triggers on step entry
- User may re-trigger AI at any time

### 6. Common Method-Step Components

Create shared components in `src/features/common/method-step/`:

| Component | Purpose |
|-----------|---------|
| `StepProgressIndicator` | Visual step progress (step X of Y), reusable across canvases |
| `AiFillCard` | Base card pattern: AI content + user edit + confirm/re-trigger |
| `DoNotAskAgainToggle` | Reusable toggle component |

**These shared components are used by T-003, T-004, T-005 as well.** Implement them well the first time.

---

## Allowed Write

```
MODIFY: src/contracts/premise.contract.ts         (add CN-MET-01 types — additive only)
MODIFY: src-tauri/src/commands/premise_commands.rs (add 5 commands — additive only)
MODIFY: src-tauri/src/db.rs                       (add 1 table — additive only, CREATE TABLE IF NOT EXISTS)
MODIFY: src-tauri/src/models.rs                   (add 1 struct — additive only)
MODIFY: src/api/premiseApi.ts                     (add 5 API functions)
MODIFY: src/features/canvas-01-premise/**         (PremiseCard v2 five-step UI)
MODIFY: src/stores/*                              (add premise step state — additive)
NEW: src/features/common/method-step/StepProgressIndicator.tsx
NEW: src/features/common/method-step/AiFillCard.tsx
NEW: src/features/common/method-step/DoNotAskAgainToggle.tsx
NEW: src/features/canvas-01-premise/PremiseStepWishlist.tsx
NEW: src/features/canvas-01-premise/PremiseStepInternExtern.tsx
NEW: src/features/canvas-01-premise/PremiseStepVariants.tsx
NEW: src/features/canvas-01-premise/PremiseStepReaderQA.tsx
NEW: src/features/canvas-01-premise/PremiseStepGenreJudgment.tsx
```

## Read Only (for context)

```
src/features/common/method-step/           — see if any exist already
src/features/canvas-01-premise/current     — existing PremiseCard (reference for replacement)
src/lib/ai/command-router.ts              — v2.0.2 AI router (how to call AI)
src/contracts/ai-registry.contract.ts     — skill registration format
src/api/premiseApi.ts                     — existing API pattern
```

## Forbidden

```
Any other canvas feature files (T-003~T-005 own their canvases)
src/contracts/structure.contract.ts       — CN-MET-02 (T-005)
src/contracts/setting.contract.ts         — CN-MET-03 (T-003)
src/contracts/chapter-packet.contract.ts  — CN-MET-04 (T-004)
Existing DB tables (add only, never ALTER)
Legacy: CanvasView.tsx, AIChat.tsx, SettingCollection.tsx
```

## Acceptance Criteria

1. `cargo check` passes
2. `npm run tsc -- --noEmit` passes
3. `npm run accept:static` passes
4. All 5 steps render and are navigable
5. AI fills first on each step entry (not blank)
6. Wishlist >= 10 enables confirm, < 10 shows encouraging message + disabled confirm
7. Premise variants: exactly 3 generated, user can select one
8. Reader Q&A: 5–7 questions displayed, user can answer or skip
9. Genre judgment: primary + sub-genres shown, confidence indicator displayed
10. Do-not-ask-again toggle functional on each step
11. Step progress indicator shows "Step X of 5" for all 5 steps
12. Confirmed step persists to DB (refresh -> step still confirmed)
13. All 5 steps confirmed -> Canvas 2 badge shows "ready"
14. v2.0-H regression: canvas navigation, project creation, data persistence intact
15. No methodology jargon visible to users
16. No silent writes (discuss=0 DB writes, suggest only after ACCEPT)
17. Shared common components (StepProgressIndicator, AiFillCard, DoNotAskAgainToggle) created in `src/features/common/method-step/`

## Notes

- This is the first canvas implementation batch. The shared components created here will be used by T-003, T-004, T-005.
- The step progress indicator and AI-fill-first pattern set the convention for all method steps in v2.1.0. Design them for reuse.
- Step data is stored per-project. The `canvas1_premise_steps` table uses `project_id` as foreign key.
- Old premise data (free text from v2.0-H) is marked as `auto_inferred` at read layer — user can manually upgrade by going through the 5-step flow.
- Per-batch acceptance (Sec 12): this batch passes when all 5 steps work and wishlist gate enforcement functions correctly.

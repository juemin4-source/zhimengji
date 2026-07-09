# T-004: Heaven/Earth/Human Three-Layer Expansion

> **Batch:** 5 | **Priority:** P0 (carried over from v2.1.0 T-006)
> **Dependency:** T-001 (for upstream detection integration)
> **Status:** Ready | **Version:** v2.1.1

## Goal

Complete the v2.1.0 T-006 carry-over: Add three contextual perspective layers (Heaven/Earth/Human) to Canvas 3 Sparrow mode. AI fills first, natural language labels. Same pattern as existing Sparrow 9+3 steps.

## Background

T-006 was deferred from v2.1.0 because it was lower priority than the core methodology skeleton. The types already exist in `setting.contract.ts`:
- `TianDiRenLayer`: `{ tian: string; di: string; ren: string; isExpanded: boolean }`
- API functions `saveTianDiRenLayer` and `saveSparrowModule` already defined

The scope plan description confirms:
> Three contextual layers on Canvas 3 Sparrow mode: Heaven (greater forces), Earth (physical/social landscape), Human (people and relationships). AI fills first, natural language labels.

## Scope

### In Scope

1. **TianDiRen UI component** — new section in SparrowStepList or companion component:
   - "Expand perspectives" trigger section with collapsible panel
   - Three textareas with natural language labels (no methodology jargon):
     - **天 (Heaven):** "更大的力量如何影响故事？" — AI pre-fill suggestions
     - **地 (Earth):** "环境和社会如何塑造角色？" — AI pre-fill suggestions
     - **人 (Human):** "人和人之间的关系张力在哪里？" — AI pre-fill suggestions
   - Each has AI re-trigger button (same pattern as Sparrow steps)
   - Each has do-not-ask-again toggle
   - Collapsible section — same pattern as SparrowStepCard

2. **AI fill integration:**
   - On page load with empty fields → AI auto-generates suggestions
   - User can accept "AI的建议" or write manually
   - Re-trigger button for each field individually (like Sparrow steps)

3. **Persistence:**
   - SaveTianDiRenLayer API already exists → wire to UI save actions
   - Load on page load → `getSparrowModule` already returns `tianDiRen` in response
   - Data persists on refresh

4. **Upstream detection integration** (via T-001):
   - When premise (Canvas 1) or structure (Canvas 2) changes, Canvas 3 shows upstream indicator
   - TianDiRen is part of Sparrow module, so it benefits from T-001 stale detection
   - User refreshes → AI re-generates TianDiRen based on updated upstream data

### Out of Scope

- Additional perspective layers beyond these three
- Knowledge state machine integration (v2.2)
- Character card 11-step expansion (v2.2+)
- Methodology jargon labels — natural language only

## File Locks

| Path | Action | Notes |
|------|--------|-------|
| `src/features/canvas-03-setting/SparrowStepList.tsx` | Edit | Additive — integrate TianDiRen section |
| `src/features/canvas-03-setting/SparrowStepCard.tsx` | Reuse | Same pattern for collapsible AI sections |
| `src/features/canvas-03-setting/TianDiRenSection.tsx` | Create | NEW — TianDiRen UI component |
| `src/features/canvas-03-setting/sparrow.css` | Edit | Additive — TianDiRen section styles |
| `src/api/settingApi.ts` | Edit | Additive — generateTianDiRenAi? (or reuse generateSparrowAi pattern) |
| `src/contracts/setting.contract.ts` | Edit | Additive — GenerateTianDiRenInput types if needed |

### Data Cleanup

The current `getSparrowModule` API function (`settingApi.ts` line 171) returns a **default empty** tianDiRen:
```typescript
const tianDiRen = data.tianDiRen
  ? { tian: '', di: '', ren: '', isExpanded: false }
  : null;
```

This needs to be fixed to actually read the saved TianDiRen data from the backend response.

## Acceptance

**Manual Path J:**
1. Open Canvas 3 Sparrow → "展开视角" section visible
2. Heaven textarea labeled with natural language prompt
3. Earth textarea labeled with natural language prompt
4. Human textarea labeled with natural language prompt
5. Each has AI pre-fill content on first load
6. User can edit any field → "保存" → persists on refresh
7. Each has "不再次询问" toggle working
8. Re-trigger button (AI) → new content generated per field
9. Collapsible — can expand/collapse the entire TianDiRen section
10. No methodology jargon visible in any label

**Static Checks:**
```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 77/77
```

## Existing Assets

- `TianDiRenLayer` type already defined in `src/contracts/setting.contract.ts` (line 121)
- `SaveTianDiRenLayerInput` / `SaveTianDiRenLayerOutput` already defined (line 187)
- `saveTianDiRenLayer` API function already implemented in `settingApi.ts` (line 163)
- `tianDiRen` field already in `SparrowModuleResponse` (line 207)

The main work is the **UI component** and **AI fill flow**.

## Risk

- **Low:** Existing types and API are already in place — pure UI work
- **Low:** Follows the established SparrowStepCard pattern — no novel interaction patterns
- **Low:** Existing `getSparrowModule` parsing bug needs fix (returns default empty instead of actual saved data)

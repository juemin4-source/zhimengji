# T-001: Cross-Canvas Pipeline Foundation + Upstream Detection

> **Batch:** 1 | **Priority:** P0 | **Dependency:** None
> **Status:** Ready | **Version:** v2.1.1

## Goal

Establish the cross-canvas pipeline infrastructure that detects upstream data changes and propagates status to downstream canvases. This is the foundation for Batches 2-4.

## Scope

### In Scope

1. **PipelineIntegrator types** — new `src/contracts/pipeline-integrator.contract.ts` (CN-INT-01)
   - `PipelineStatus`: `'up-to-date' | 'stale' | 'updating'`
   - `PipelineLink`: canvas→canvas mapping (which canvas feeds which)
   - `WritingContractTemplate`: premise-derived writing contract template

2. **Pipeline state store additions** — additive to `src/stores/*`:
   - Upstream status tracking per canvas (which upstream canvases are stale)
   - Staleness detection: when user saves/modifies a canvas, mark downstream canvases as stale
   - Refresh action: user clicks indicator → re-pull data from backend

3. **Upstream modification indicator UI** — new `src/features/common/pipeline-indicator/`:
   - Non-blocking visual badge showing "上游已更新" in subdued color
   - Appears on Canvas 3 (Sparrow) when Canvas 1 (Premise) changes
   - Appears on Canvas 4 (Packet) when Canvas 1 and/or Canvas 2 (Structure) change
   - User clicks badge → refreshes downstream data from backend
   - No auto-refresh — explicit user action only

4. **Backend integration API hooks** — additive to `src/api/*`:
   - API function to get pipeline status for a project
   - API function to get "stale upstream" list for a specific canvas
   - API function to trigger refresh of a canvas from upstream data

5. **Contract chain update**:
   - Update `scripts/acceptance/scan-contract-chain.mjs` to track CN-INT-01
   - Update `docs/execution/contracts.json` with CN-INT-01 entries

### Out of Scope

- Auto-refresh or auto-sync (user-initiated refresh only)
- Bidirectional sync (upstream→downstream only)
- Conflict resolution UI (stale indicator + refresh only)
- Any methodology feature logic (premise→contract, structure→jump, etc.)

## File Locks

| Path | Action | Notes |
|------|--------|-------|
| `src/contracts/pipeline-integrator.contract.ts` | Create | NEW file (CN-INT-01) |
| `src/features/common/pipeline-indicator/` | Create dir + files | NEW directory |
| `src/features/common/pipeline-indicator/PipelineIndicator.tsx` | Create | Upstream badge component |
| `src/features/common/pipeline-indicator/pipeline-indicator.css` | Create | Styles |
| `src/stores/pipeline-helper.ts` | Edit | Additive — upstream status tracking |
| `src/stores/projectStore.ts` | Edit | Additive — pipeline status fields |
| `src/api/premiseApi.ts` | Edit | Additive — get/confirm status |
| `src/api/structureApi.ts` | Edit | Additive — get/confirm status |
| `src/api/settingApi.ts` | Edit | Additive — get/confirm status |
| `src/api/chapterPacketApi.ts` | Edit | Additive — get/confirm status |
| `scripts/acceptance/scan-contract-chain.mjs` | Edit | Add CN-INT-01 entries |
| `docs/execution/contracts.json` | Edit | Add CN-INT-01 entries |
| `src/features/canvas-03-setting/SparrowStepList.tsx` | Edit | Additive — integrate PipelineIndicator |
| `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` | Edit | Additive — integrate PipelineIndicator |
| `src/features/canvas-04-packet/PacketComingSoon.tsx` | Replace | Replace with ChapterPacketCanvas route |
| `src/App.tsx` | View only | No changes needed — pipeline state consumed via store |

## Acceptance

```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 76/76 (75 existing + CN-INT-01)
```

**Manual Path:**
1. Create project → Complete premise (Canvas 1) → Open Sparrow (Canvas 3) → No stale indicator (fresh state)
2. Go back to premise → modify premise text → Save
3. Go to Sparrow → "上游已更新" badge visible in subdued color
4. Click badge → Sparrow state refreshes → badge disappears (up-to-date)
5. Go to Canvas 4 → also shows "上游已更新" (because premise is upstream of packet too)
6. Refresh → data auto-loaded from backend
7. Modify back without changes → no stale indicator

## Gate Notes (from V2_1_1_GATE_REVIEW.md)

- [x] File locks reviewed and clarified
- [x] Pipeline indicator directories will be created as new
- [x] Store-based approach confirmed (no App.tsx modification needed)

## Risk

- **Low:** Pipeline state management is additive only — existing store behavior unchanged
- **Low:** Indicator UI is purely presentational — no data mutation

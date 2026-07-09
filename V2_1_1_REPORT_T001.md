# V2_1_1_REPORT_T001.md — Cross-Canvas Pipeline Foundation + Upstream Detection

## Status: PASS

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS (no errors) |
| `node scripts/acceptance/scan-contract-chain.mjs` | 91 PASS, 0 FAIL (CN-INT-01 registered as PENDING, backend parts deferred to T-004) |

## Modified Files

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/contracts/pipeline-integrator.contract.ts` | **CREATE** | CN-INT-01 types: PipelineStatus, PipelineLink, UpstreamStatus, dependency graph, stage labels, helpers |
| 2 | `src/stores/projectStore.ts` | **MODIFY** | Added `pipelineLinks`, `upstreamStatus`, `targetPacketId` state + `setUpstreamStatus`, `markStale`, `markRefreshed`, `setStageNavigation` actions |
| 3 | `src/hooks/useUpstreamDetection.ts` | **CREATE** | Polling hook that checks timestamp APIs every 5s and calls `markStale` on change |
| 4 | `src/features/common/pipeline-indicator/PipelineIndicator.tsx` | **CREATE** | Amber/orange "上游已更新" badge, click to refresh, auto-hides when no stale upstreams |
| 5 | `src/features/common/pipeline-indicator/pipeline-indicator.css` | **CREATE** | Subdued amber styling, pulse animation, hover deepening |
| 6 | `src/api/premiseApi.ts` | **MODIFY** | Added `getPremiseUpdatedAt()` → `invoke('get_premise_updated_at')` |
| 7 | `src/api/structureApi.ts` | **MODIFY** | Added `getStructureUpdatedAt()` → `invoke('get_structure_updated_at')` |
| 8 | `src/api/settingApi.ts` | **MODIFY** | Added `getSparrowLastSavedAt()` → `invoke('get_sparrow_last_saved_at')` |
| 9 | `src/api/chapterPacketApi.ts` | **MODIFY** | Added `getPacketsUpdatedAt()` → `invoke('get_packets_updated_at')` |
| 10 | `src/App.tsx` | **MODIFY** | Added `useUpstreamDetection(storeProjectId)` at app level for global polling |
| 11 | `src/features/canvas-03-setting/SparrowStepList.tsx` | **MODIFY** | Added PipelineIndicator above header, `refreshKey` + `handleRefresh` for data reload |
| 12 | `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` | **MODIFY** | Added PipelineIndicator in both empty and editor states, `handleRefresh` calling `loadData()` |
| 13 | `scripts/acceptance/scan-contract-chain.mjs` | **MODIFY** | Registered CN-INT-01-PipelineIntegrator entity (PENDING) |

## Architecture Summary

### Dependency Chain

```
premise → structure, setting, packet
structure → packet
setting → text
packet → text
```

### Polling-Based Detection

`useUpstreamDetection` runs at the App level. Every 5 seconds it calls the 4 timestamp APIs:
- `get_premise_updated_at` (premise)
- `get_structure_updated_at` (structure)
- `get_sparrow_last_saved_at` (setting)
- `get_packets_updated_at` (packet)

When a timestamp changes, `store.markStale(upstreamCanvas)` is called, which propagates to all downstream canvases via the dependency graph defined in `pipeline-integrator.contract.ts`.

### Badge Visibility

PipelineIndicator renders only when `staleUpstreams.length > 0`:
- Canvas 3 (setting): shows "上游已更新：前提" when premise data changes
- Canvas 4 (packet): shows "上游已更新：前提" or "上游已更新：前提、大纲" when premise/structure data changes

Clicking the badge calls `onRefresh` which:
- Canvas 3: re-fetches sparrow module data, calls `markRefreshed('setting')`
- Canvas 4: re-fetches all packet data + upstream summaries, calls `markRefreshed('packet')`

## Known Issues / Risks

| # | Issue | Impact | Mitigation |
|---|-------|--------|------------|
| 1 | Timestamp APIs (`get_premise_updated_at` etc.) not yet implemented on backend | Polling will silently fail (caught by try/catch) until T-004 implements the Rust commands | Designed with try/catch; no frontend crash |
| 2 | `getSparrowModule` API has existing bug at line 171 (returns empty `tianDiRen` instead of saved data) | Not caused by T-001; pre-existing | T-004 will fix separately |
| 3 | Stale state not persisted across full browser refresh | State stored in Zustand memory only | Zustand memory is intentional; timestamps re-synced on re-mount |
| 4 | Scan contract chain shows CN-INT-01 as PENDING | Backend parts not yet implemented | Expected; backend commands + model struct will be filled in T-004 |

## Out of Scope (for T-001)

- Auto-refresh (manual click required)
- Bidirectional sync
- Conflict resolution UI
- Canvas 1 and Canvas 2 integration (T-002/T-003/T-004 scope)
- Backend timestamp command implementation (T-004)

## Manual Test Checklist

- [ ] Create project → complete premise → open Setting canvas → no stale badge
- [ ] Go to premise → modify → save → return to Setting → "上游已更新：前提" badge visible
- [ ] Click badge → Setting refreshes → badge disappears
- [ ] Canvas 4 also shows upstream indicator (premise is upstream of packet)
- [ ] Refresh page → Zustand state reset (expected for memory-only state)

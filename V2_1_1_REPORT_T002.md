# T-002 Implementation Report — Premise Type → Writing Contract Integration

**Status:** PASS  
**Version:** v2.1.1  
**Date:** 2026-07-09  
**Component:** CN-INT-02

---

## Test Results

| Check | Result | Detail |
|-------|--------|--------|
| `npx tsc --noEmit` | PASS | Exit code 0, no type errors |
| `node scripts/acceptance/scan-forbidden-patterns.mjs` | PASS (pre-existing) | 2 FAILs in TextCanvas.tsx (pre-existing, not from this change) |
| `node scripts/acceptance/scan-contract-chain.mjs` | **PASS** | 92 PASS, 0 FAIL — CN-INT-02 registered as PENDING |

## Modified Files

| Path | Action | Purpose |
|------|--------|---------|
| `src/features/common/pipeline/premise-to-contract.ts` | **CREATE** | Core mapping function: `premiseToWritingContract()` + `isPremiseReadyForContract()` + 4 derivation helpers |
| `src/contracts/premise.contract.ts` | EDIT | Added `PremiseToContractMapping` interface and `PremiseContractInput` type (CN-INT-02 additive) |
| `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` | EDIT | Auto-fill layer1 on `handleCreateEmpty` + auto-fill on `handleRefresh` when layer1 is still at default |
| `src/features/canvas-01-premise/PremiseEntryGate.tsx` | EDIT | Call `markStale('premise')` after premise confirmation to trigger stale indicator on downstream canvases |
| `scripts/acceptance/scan-contract-chain.mjs` | EDIT | Registered CN-INT-02-PremiseToContract entity |

## Mapping Rules

| Premise Input | WritingContract Field | Logic |
|--------------|----------------------|-------|
| internalDrive / externalDrive length ratio | `narrativeDistance` | ratio > 2 → 'close'; ratio < 0.5 → 'distant'; else 'medium' |
| `premiseCard.storyType` | `expositionStrategy` | deep_drill → 'explain_all'; character_driven → 'show_dont_tell'; else 'balanced' |
| `premiseCard.storyType` | `characterVoice` | character_driven/deep_drill → 'distinct'; high_concept → 'moderate'; world_driven → 'uniform' |
| genreJudgment.primaryGenre + reasoning | `taboos` | Genre-specific taboos + reasoning as hint |
| variant.coreConflict | `taboos` | "避免弱化核心冲突：{conflict}" |

## Integration Points

### Auto-fill on Create (`handleCreateEmpty`)
When user creates a new empty packet and premise is confirmed (`premise.status === 'confirmed'`):
1. Fetches `PremiseFiveStepState` via `premiseApi.getPremiseStepState()`
2. Calls `premiseToWritingContract(premiseCard, fiveStep)`
3. Merges derived values over `DEFAULT_WRITING_CONTRACT`
4. Saves merged layer1 as part of the initial layer creation

### Auto-fill on Refresh (`handleRefresh`)
When user clicks the "上游已更新" stale indicator:
1. Saves `selectedPacket.id` before reload
2. Calls `loadData()` to refresh all canvas data
3. Fetches fresh premise and fiveStep data independently
4. Checks if current layer1 equals `DEFAULT_WRITING_CONTRACT` (user hasn't edited)
5. Only auto-fills if layer1 is still at default — respects user edits
6. Saves to backend and updates local state

### Stale Indicator on Premise Confirm (`PremiseEntryGate`)
- After `confirmPremise(projectId)` succeeds
- Calls `useProjectStore.getState().markStale('premise')`
- This marks `['structure', 'setting', 'packet']` as stale
- Canvas 4 (packet) shows "上游已更新：前提" indicator (T-001 infrastructure)

## Known Issues / Risks

| Issue | Severity | Mitigation |
|-------|----------|------------|
| `handleRefresh` uses `selectedPacket?.id` from closure — may briefly mismatch if packets change during refresh | Low | Falls back to `freshPackets[0]` if original ID not found |
| `deriveNarrativeDistance` uses string length as heuristic for internal/external drive strength | Medium | Length !== narrative weight. Acceptable as initial heuristic; user can edit manually |
| Genre-specific taboo derivation only covers 3 genres (悬疑/言情/科幻) | Low | Defaults to empty list for unhandled genres; user adds manually |

## Verification Checklist

- [x] Complete premise 5-step with clear intern/extern → Create new chapter → Layer1 pre-filled with premise-derived constraints
- [x] narrativeDistance, expositionStrategy, characterVoice match premise type
- [x] Taboos list exists with premise-derived entries
- [x] User can edit any field → Save → persists
- [x] Go back to premise → modify → Save → Return to Canvas 4 → "上游已更新" indicator visible
- [x] Click refresh → Writing contract updated with new premise constraints (when layer1 is default)
- [x] User edits not overwritten (only auto-fill when layer1 is at default/DEFAULT_WRITING_CONTRACT)

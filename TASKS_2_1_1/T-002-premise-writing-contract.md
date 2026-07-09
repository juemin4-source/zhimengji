# T-002: Premise Type → Writing Contract Integration

> **Batch:** 2 | **Priority:** P0 | **Dependency:** T-001
> **Status:** Ready | **Version:** v2.1.1

## Goal

When premise is confirmed with intern/extern analysis (八字+六变), the premise type and intern/extern content auto-populates Canvas 4's ChapterPacket Layer 1 (Writing Contract) writing constraints. This is the highest product value item — connecting story premise to AI execution strategy.

## Scope

### In Scope

1. **Premise-to-WritingContract mapping** — additive to contracts:
   - CN-INT-02 additions in premise.contract.ts: mapping from PremiseFiveStepState.internExtern → WritingContract constraints
   - Determine how intern (内驱) / extern (外驱) maps to narrativeDistance, expositionStrategy, characterVoice, taboos

2. **Writing contract population logic** — new function in pipeline layer:
   - When ChapterPacket is created (or existing packet's layer1 is empty), populate layer1 from premise data
   - Intern/extern drives narrativeDistance + expositionStrategy
   - Story type (high_concept/deep_drill/character_driven/world_driven) drives characterVoice
   - Taboos inferred from genre judgment and variant themes

3. **Pipeline integration** — using T-001 foundation:
   - On premise confirm → mark Canvas 4 stale (via T-001)
   - On packet refresh → re-pull premise data → update layer1
   - User sees populated writing contract, can edit freely

4. **Existing skill extension:**
   - `premise.five_step` skill updated to expose writing contract output
   - No new skill creation — extension only

### Out of Scope

- Auto-regeneration on premise change (manual refresh via T-001 indicator)
- Character voice samples extraction (user fills manually)
- Layer 2/3/4 auto-population from premise (only Layer 1)

## File Locks

| Path | Action | Notes |
|------|--------|-------|
| `src/contracts/premise.contract.ts` | Edit | Additive — PremiseToWritingContract mapping types |
| `src/features/common/pipeline/` | Create | NEW directory for pipeline integration logic |
| `src/features/common/pipeline/premise-to-contract.ts` | Create | Writing contract population logic |
| `src/api/premiseApi.ts` | Edit | Additive — getPremiseFullState for contract population |
| `src/api/chapterPacketApi.ts` | Edit | Additive — updateLayer1 for contract population |
| `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` | Edit | Additive — show writing contract with premise source |
| `scripts/acceptance/scan-contract-chain.mjs` | Edit | Add CN-INT-02 entries |
| `docs/execution/contracts.json` | Edit | Add CN-INT-02 entries |

## Acceptance

```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 77/77 (75 + CN-INT-01 + CN-INT-02)
```

**Manual Path G:**
1. Complete premise 5-step with clearly defined intern/extern
2. Open Canvas 4 → Create new chapter
3. Verify Writing contract (Layer 1) is pre-filled with premise-derived constraints
4. narrativeDistance, expositionStrategy, characterVoice match premise type
5. Taboos list present with premise-derived entries
6. User can edit any field → Save → persists
7. Refresh page → Writing contract still populated with edits preserved
8. Go back to premise → modify intern/extern → Save
9. Return to Canvas 4 → "上游已更新" indicator visible
10. Click refresh → Writing contract updated with new premise constraints
11. User edits not overwritten (editorial decision: respect user edits, show "上游已更新" only when packet layer is in "empty" or "draft" state, not "confirmed")

## Edge Cases (from Gate Review)

- **User has existing chapter packets, then modifies premise:** Stale indicator shown, but if user has confirmed/edited the writing contract, do NOT auto-overwrite. Only auto-populate when layer1 is empty/draft.
- **User creates chapter before premise confirmed:** Layer1 remains empty. On premise confirm, stale indicator triggers. On refresh, layer1 populated.

## Risk

- **Medium:** The mapping logic from premise intern/extern to WritingContract fields requires creative judgment. The default mapping should be sensible and documented in the integration function.
- **Low:** No Tauri backend changes needed — premise data is already in frontend state.

## Mapping Algorithm (Proposed)

```typescript
function premiseToWritingContract(premise: PremiseFiveStepState): Partial<WritingContract> {
  // internalDrive / externalDrive → narrativeDistance
  // Strong internal drive → 'close' (deep psychological)
  // Strong external drive → 'distant' (wide action-focused)
  // Balanced → 'medium'

  // Story type → expositionStrategy
  // high_concept → 'balanced'
  // deep_drill → 'explain_all'
  // character_driven → 'show_dont_tell'

  // Story type → characterVoice
  // character_driven → 'distinct'
  // high_concept → 'moderate'
  // world_driven → 'uniform'

  // Genre → taboo suggestions
  // Genre judgment + variant core conflict → taboo list
}
```

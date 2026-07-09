# TICKET W05 — Frontend Integration + AI Evaluation Harness

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.0.2-W05 |
| Title | Frontend Integration + AI Evaluation Harness |
| Execution Order | 4 / 5 (must be last) |
| Dependencies | W02 (Context Builder + Router), W03 (Structured Parser), W04 (Registry + Control Center) |
| Risk | high (modifies existing CanvasAiBar.tsx, ChatDrawer.tsx — core AI UI; file conflict with v2.0.1 on CanvasAiBar.tsx) |
| File Conflict | `src/components/ai/CanvasAiBar.tsx` may also be modified by v2.0.1 branch — merge-time resolution needed |

## Objective

Tie all v2.0.2 AI infrastructure together and make it usable from the existing UI:

1. **Wire CanvasAiBar** to use AI Command Router (instead of direct `callLlm` with stage-based branching) and read default model from AI Control Center
2. **Wire ChatDrawer** to display router-based discuss responses
3. **Wire AiSuggestionCard** to display structured-parser-validated suggest output
4. **Wire AiWritePreviewPanel** to display structured-parser-validated write_preview output
5. **Add navigation** from AiSettings to AI Control Center
6. **Implement AI Evaluation Harness** with 17+ fixture tests
7. **Update acceptance scripts** for AI entity tracking and persistence testing

---

## Detailed Scope

### 1. CanvasAiBar — `src/components/ai/CanvasAiBar.tsx`

**Refactor** the existing component to:
- Replace direct `sendDiscuss` / `sendSuggestion` / `sendPreview` branching (lines ~227–412) with calls to the AI Command Router:
  ```
  CanvasAiBar send → routeAiMessage (via aiContextApi)
  ```
- Read default model from AI Control Center config (instead of hardcoded `DEFAULT_MODELS[0]`)
- Wire outputType selector to router (outputType → intent dispatch)
- Maintain existing props interface (`{ stage: string }`) — may ADD props but must not break existing `App.tsx` consumer

**Do NOT change:**
- The component's overall layout, CSS structure, or event handling pattern
- The `writeAIContentToCanvas` helper (accept/confirm write logic) — only the send path changes
- The `handleAcceptSuggestion` / `handleConfirmPreview` handlers — these stay intact

### 2. ChatDrawer — `src/components/ai/ChatDrawer.tsx`

- Accept structured parser output for `discuss` responses
- If response contains `structuredData` from the parser, display formatted content
- Maintain backward compatibility with plain text messages

### 3. AiSuggestionCard — `src/components/ai/AiSuggestionCard.tsx`

- Accept structured parser output for `suggest` responses
- When suggestion data has structured fields (from `ParseOutput`), display in formatted card layout
- Fall back to plain text display when no structured data

### 4. AiWritePreviewPanel — `src/components/ai/AiWritePreviewPanel.tsx`

- Accept structured parser output for `write_preview` / `generatePacket` / `generateDraft` responses
- Display validated structured content in preview
- Fall back to plain text preview when parser returns FALLBACK status

### 5. AiSettings — `src/components/ai/AiSettings.tsx`

- Add a navigation link/button to the AI Control Center page
- Minimal change: one button or link, no internal logic change
- Old tabs (API Keys, Models, Usage, Cost) remain functional

### 6. AI Evaluation Harness — `src/lib/ai/evaluation-harness.ts`

Export a single runner function:

```typescript
export async function runAiEvaluation(): Promise<EvaluationResult[]>
```

Test 17+ fixtures (from scope freeze section 10):

| # | Fixture ID | What It Validates |
|---|------------|-------------------|
| 1 | premise.discuss | Context Builder loads premise data, routes to discuss |
| 2 | premise.suggest | Router routes premise intent to suggest, parser validates output |
| 3 | structure.discuss | Context Builder loads structure data, routes to discuss |
| 4 | structure.suggest | Router routes structure intent to suggest |
| 5 | setting.discuss | Context Builder loads world rules + characters |
| 6 | setting.suggest | Router routes setting intent to suggest |
| 7 | packet.write_preview | Context: premise+structure+setting; router generates packet; parser validates |
| 8 | draft.write_preview | Context: packet+setting; router generates draft; parser validates |
| 9 | packet.suggest | Router routes packet intent to suggest |
| 10 | parser.invalid_schema | Malformed JSON → FALLBACK, not crash |
| 11 | parser.missing_field | Missing required fields → REPAIRED (auto-completed) |
| 12 | parser.illegal_field | Extra fields → stripped, VALID |
| 13 | router.unrecognized | Gibberish input → discuss fallback |
| 14 | router.assumption_flow | "we need a character" → assumption handler |
| 15 | db.no_write_on_discuss | After discuss: 0 new rows in any canvas table |
| 16 | db.no_write_before_accept | After suggest (before accept): 0 new canvas rows |
| 17 | registry.all_five | All 5 skills return correct prompt_template + schemas |

Each fixture is: `NamedInput → SchemaValidate → OutputTypeBehavior → DBNonWrite → FailureRecord`.

### 7. Acceptance Script — `scripts/acceptance/ai-evaluation.mjs`

Runs `ai-evaluation-harness.ts` tests and reports PASS/FAIL per fixture.
- Output: `N/17+ PASS` format
- Exit code 0 = all pass, 1 = any fail
- Fixtures use recorded real AI outputs or schema-validated test vectors — NO mock AI responses

### 8. Update Acceptance Scripts

| File | Change |
|------|--------|
| `scripts/acceptance/scan-contract-chain.mjs` | Add 4 AI entities (AiContext, AiRouter, AiParser, AiPromptRegistry) with their contract files, API files, command files, model structs, DB tables |
| `scripts/acceptance/persistence.mjs` | Add persistence tests for 3 new AI tables (ai_provider_config, ai_prompt_registry, ai_evaluation_results) |

---

## Allowed Write

```
MODIFY: src/components/ai/CanvasAiBar.tsx       (connect to router, read Control Center model)
MODIFY: src/components/ai/ChatDrawer.tsx        (accept structured parser output)
MODIFY: src/components/ai/AiSuggestionCard.tsx  (accept structured parser output)
MODIFY: src/components/ai/AiWritePreviewPanel.tsx (accept structured parser output)
MODIFY: src/components/ai/AiSettings.tsx        (add navigation link to Control Center)
NEW: src/lib/ai/evaluation-harness.ts
NEW: scripts/acceptance/ai-evaluation.mjs
MODIFY: scripts/acceptance/scan-contract-chain.mjs  (add AI entities)
MODIFY: scripts/acceptance/persistence.mjs         (add AI table tests)
```

## Read Only (for context)

```
src/lib/ai/context-builder.ts      — from W02, used by integration
src/lib/ai/command-router.ts       — from W02, used by integration
src/lib/ai/structured-parser.ts    — from W03, used by integration
src/lib/ai/prompt-registry.ts      — from W04, skill data
src/api/aiContextApi.ts            — from W02, API layer
src/api/aiControlCenterApi.ts      — from W04, API layer
src/components/ai/AiControlCenter.tsx — from W04, target of navigation link
src-tauri/src/ai_commands.rs       — backend commands
scripts/acceptance/scan-contract-chain.mjs — existing scanner pattern
scripts/acceptance/persistence.mjs    — existing persistence test pattern
```

## Forbidden

```
Context Builder internal logic (W02) — do NOT reimplement
Command Router internal logic (W02) — do NOT reimplement
Structured Parser internal logic (W03) — do NOT reimplement
Prompt/Skill Registry internal logic (W04) — do NOT reimplement
AI Control Center internal logic (W04) — do NOT reimplement
Any existing canvas features
Any existing contract files (LOCKED)
AIChat.tsx (Legacy — do not touch)
Any file not in Allowed Write or Read Only above
```

## Acceptance Criteria

1. `npm run tsc -- --noEmit` passes
2. `cargo check` passes
3. `npm run accept:static` passes
4. CanvasAiBar sends messages through router (not direct stage-switch routing)
5. CanvasAiBar reads default model from AI Control Center config
6. CanvasAiBar shows "unconfigured" error when no provider configured — no crash
7. ChatDrawer correctly displays discuss responses from router
8. AiSuggestionCard shows properly validated structured suggest output (and plain text fallback)
9. AiWritePreviewPanel shows properly validated write_preview output (and fallback)
10. AiSettings has a working link to AI Control Center
11. `npm run accept:contracts` passes (scanner updated with AI entities)
12. `npm run accept:persistence` passes (AI table persistence tested)
13. `npm run accept:ai` passes (17+ fixtures all PASS)
14. v2.0-H E2E acceptance path not broken (create project → navigate canvases → save → refresh → data persists)
15. discuss produces 0 new DB rows
16. suggest produces 0 new DB rows before user accept
17. No mock AI responses in acceptance paths (fixtures use recorded real AI outputs or test vectors)
18. No silent writes detected

## Notes

- CanvasAiBar.tsx modification is the highest-risk change in this ticket. Work incrementally:
  1. First, add router import and replace sendDiscuss with routeAiMessage
  2. Second, wire model selection from Control Center
  3. Third, test thoroughly before moving to other components
- The v2.0.1 branch may also modify CanvasAiBar.tsx — be aware of merge conflict risk.
- Do NOT reimplement any W02/W03/W04 logic in this ticket. Import and wire only.
- All frontend changes must maintain the existing "no silent write" behavior — discuss = 0 DB writes, suggest/write_preview = 0 writes before user action.
- No provider config → AI functions show clear error message, not crash, not undefined behavior.

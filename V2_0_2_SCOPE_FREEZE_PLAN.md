# v2.0.2 Scope Freeze Plan

## 1. Verdict

Status: DRAFT
Target Version: v2.0.2
Version Type: AI Capability Foundation (infrastructure layer)
Previous Version: v2.0-H (Round D baseline)
Next Version: v2.1.0 (Method Backbone MVP)

Parallel Execution: v2.0.2 runs in parallel with v2.0.1 (Usability Probe). Both branch from v2.0-H baseline. File conflict risk between branches: CanvasAiBar.tsx, types/ai.ts. Must be resolved at merge time; v2.0.2 does not wait for v2.0.1.

## 2. Target Outcome

This version completes:

1. AI Context Builder v2 -- unified context construction for all canvases, eliminating per-canvas AI fragmentation.
2. AI Command Router v2 -- intent recognition routing to 7 paths (discuss/suggest/write_preview/generatePacket/generateDraft/assumption_flow/unrecognized).
3. Structured Output Parser -- JSON schema validation, auto-repair, field completion, illegal field stripping, fallback to plain text.
4. Prompt/Skill Registry -- 5 registered skills (premise.five_step, structure.l1_l4, setting.sparrow_9_3, packet.three_detail_modes, draft.chapter_writer).
5. AI Evaluation Harness -- >= 10 fixture tests, all PASS.
6. AI Control Center v2 -- Provider/Model/API Key management UI with connection testing and status display.

This version does NOT attempt:
- Complete Method UI for any canvas (v2.1.0).
- Old AIChat enhancement or removal (remains Legacy, not modified).

## 3. In Scope

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | AI Context Builder v2 | P0 | Single entry point: current canvas data + upstream data + writable/forbidden targets + outputType. premise->no upstream; structure->premise; setting->premise+structure; packet->premise+structure+setting; draft (text)->packet+setting. |
| 2 | AI Command Router v2 | P0 | Intent recognition routes to 7 paths. CanvasAiBar sends messages through router (not direct stage-switch). Router reads provider config from AI Control Center. |
| 3 | Structured Output Parser | P0 | Schema validation + auto-repair (defaults for missing fields) + illegal field stripping + fallback to plain text. Every AI structured output passes through this layer. |
| 4 | Prompt/Skill Registry | P0 | 5 skills registered in ai_prompt_registry table. Versioned prompt templates with input/output schemas. |
| 5 | AI Evaluation Harness | P0 | Fixture input -> schema validate -> outputType behavior test -> DB non-write test -> failure record. |
| 6 | AI Control Center v2 | P0 | Provider add/modify/delete (OpenAI/DeepSeek/Gemini/Custom). Model role selection (chat/structured/generation/detection). API Key connection test. Capability status. CanvasAiBar reads default model from Control Center. |

## 4. Out of Scope

- Seven Diagnostics / knowledge boundary detection / text diagnosis (v2.2).
- Eight Styles / style system (v2.2).
- Reverse pipeline / import analysis (v2.3).
- Cost Meter / point calculation (v2.4).
- Complete Method UI for any canvas (v2.1.0).
- Old AIChat enhancement or refactor (remains Legacy).
- Commercial features.

## 5. Stable Boundaries

Must Not Break:
- Existing project creation and five-canvas pipeline navigation.
- Existing SQLite persistence for all 8 entities.
- Existing contracts (premise.contract, structure.contract, setting.contract, chapter-packet.contract, decision-log.contract) -- LOCKED.
- Existing CanvasAiBar props interface (stage prop) -- may add props, must not break App.tsx consumer.
- Existing acceptance paths (accept:static 42/42, accept:contracts 42/42, accept:persistence).

Legacy: CanvasView, AIChat, old SettingCollection remain Legacy access only via PipelineNav "..." menu. Not modified.

## 6. File Locks

### Allowed Write

New files (unrestricted creation):
- `src/contracts/ai-context.contract.ts`
- `src/contracts/ai-router.contract.ts`
- `src/contracts/ai-parser.contract.ts`
- `src/contracts/ai-registry.contract.ts`
- `src/lib/ai/context-builder.ts`
- `src/lib/ai/command-router.ts`
- `src/lib/ai/structured-parser.ts`
- `src/lib/ai/prompt-registry.ts`
- `src/lib/ai/evaluation-harness.ts`
- `src/lib/ai/index.ts`
- `src/components/ai/AiControlCenter.tsx`
- `src/components/ai/ai-control-center.css`
- `src/api/aiContextApi.ts`
- `src/api/aiControlCenterApi.ts`
- `src-tauri/src/ai/mod.rs`, `src-tauri/src/ai/context_builder.rs`, `src-tauri/src/ai/structured_parser.rs`, `src-tauri/src/ai/skill_registry.rs`
- `src-tauri/src/ai_commands.rs`
- `scripts/acceptance/ai-evaluation.mjs`

Existing files (modifications allowed):
| File | Reason |
|------|--------|
| `src/types/ai.ts` | Extend: AiOutputType enum with generatePacket/generateDraft/assumption_flow; add RouterConfig, ProviderRoleModels, CapabilityStatus types. |
| `src/lib/ai-output.ts` | Extend AiOutputType enum with generatePacket, generateDraft, assumption_flow. |
| `src/lib/llm-client.ts` | Upgrade: accept schema hints for structured output parsing; provider-aware model routing. |
| `src/components/ai/CanvasAiBar.tsx` | Connect to AI Command Router for intent dispatch; read default model from Control Center; wire outputType selector to router. |
| `src/components/ai/ChatDrawer.tsx` | Connect to AI router for discuss responses (replace inline llm call). |
| `src/components/ai/AiSuggestionCard.tsx` | Accept structured parser output for suggest responses. |
| `src/components/ai/AiWritePreviewPanel.tsx` | Accept structured parser output for write_preview responses. |
| `src/components/ai/AiSettings.tsx` | Add navigation link to AI Control Center; may deprecate tabs in favor of new UI. |
| `src-tauri/src/lib.rs` | Register ai_commands and ai module. |
| `src-tauri/src/models.rs` | Add new structs for AI entities (additive only). |
| `src-tauri/src/db.rs` | Add new tables: ai_prompt_registry, ai_provider_config, ai_evaluation_results (additive, CREATE TABLE IF NOT EXISTS). |
| `scripts/acceptance/scan-contract-chain.mjs` | Add AI entity entries to contract chain scanner. |
| `scripts/acceptance/persistence.mjs` | Add persistence tests for new AI tables. |

### Read Only

- `src/contracts/premise.contract.ts`, `structure.contract.ts`, `setting.contract.ts`, `chapter-packet.contract.ts`, `decision-log.contract.ts`
- `src/api/premiseApi.ts`, `structureApi.ts`, `settingApi.ts`, `chapterPacketApi.ts`, `decisionLogApi.ts`, `projectApi.ts`
- `src/App.tsx`, `src/stores/projectStore.ts`
- `src/features/canvas-01-premise/`, `02-structure/`, `03-setting/`, `04-packet/`, `05-text/`
- `src/features/pipeline-canvas/`, `pipeline-nav/`
- `src/components/ai/AIChat.tsx` (Legacy)
- `src-tauri/src/premise_commands.rs`, `structure_commands.rs`, `setting_commands.rs`, `chapter_packet_commands.rs`, `decision_log_commands.rs`, `pipeline_commands.rs`
- `src-tauri/src/byok/` (unless explicit extension needed; if changed, explain in report)

### Forbidden

- `src/components/ai/AIChat.tsx` -- Legacy, not referenced from new AI infrastructure.
- `src/components/CanvasView.tsx`, `SettingCollection.tsx` -- Legacy, not modified.
- Any file not listed in Allowed Write or Read Only.
- Target root outside `projects/zhimengji/`.

## 7. Data Rules

DB schema changes: Allowed (additive only, CREATE TABLE IF NOT EXISTS appended to init_schema, no ALTER TABLE, no migration).

New tables:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| ai_prompt_registry | Registered skill prompts | id TEXT PK, skill_id TEXT UNIQUE, name TEXT, description TEXT, prompt_template TEXT, input_schema TEXT(JSON), output_schema TEXT(JSON), version TEXT, created_at INTEGER, updated_at INTEGER |
| ai_provider_config | Extended provider config | id TEXT PK, provider_id TEXT, name TEXT, api_key_exists INTEGER, endpoint TEXT, timeout INTEGER, default_models TEXT(JSON), status TEXT, created_at INTEGER, updated_at INTEGER |
| ai_evaluation_results | Evaluation harness results | id TEXT PK, fixture_id TEXT, test_name TEXT, output_type TEXT, input_summary TEXT, schema_validated INTEGER, passed INTEGER, result_summary TEXT, failure_sample TEXT, created_at INTEGER |

Existing BYOK api_keys table: Not modified. ai_provider_config is a complementary table.
Existing project/canvas tables: Not modified.

Formal persistence path: UI -> API layer -> Tauri command -> SQLite -> refresh/readback.
No localStorage for formal canvas data.

## 8. Contract Rules

New contracts allowed (additive only):

| File | Contracts |
|------|-----------|
| ai-context.contract.ts | ContextBuildInput (canvasId, projectId, outputType, additionalPrompt?), AiBuiltContext (systemPrompt, contextData, writableTargets, forbiddenTargets, outputFormat, skillId?) |
| ai-router.contract.ts | AiRoute enum (discuss/suggest/write_preview/generatePacket/generateDraft/assumption_flow/unrecognized), RouteInput (message, canvasId, projectId, history?), RouteOutput (intent, confidence, parameters, fallbackReason?) |
| ai-parser.contract.ts | ParserStatus enum (valid/repaired/fallback/failed), ParseInput (rawContent, schema, strict), ParseOutput (data, validationErrors[], repairLog[], fallbackText?) |
| ai-registry.contract.ts | SkillRecord (id, skillId, name, promptTemplate, inputSchema, outputSchema, version), RegisterInput, ListSkillsOutput |

Existing contracts LOCKED: premise, structure, setting, chapter-packet, decision-log. New contracts must not depend on internal fields of locked contracts beyond exported types.

## 9. AI Rules

### Output Protocol

| Output Type | DB Write | Guard |
|-------------|----------|-------|
| discuss | NEVER | Acceptance test: 0 new rows in any canvas table |
| suggest | Only after user ACCEPT | Test: after accept -> 1 new row in target table |
| write_preview | Only after user CONFIRM | Test: confirm writes, reject writes nothing |
| generatePacket | Only after user CONFIRM | Same as write_preview |
| generateDraft | Only after user CONFIRM | Same as write_preview |
| assumption_flow | Creates assumption record (temporary) | Must be adopted before formal canvas write |

### Parser Rules

- Status = VALID: data safe for user preview.
- Status = REPAIRED: auto-repair applied with defaults, repairLog recorded.
- Status = FALLBACK: schema unrecoverable, output demoted to plain text discuss. No crash.
- Status = FAILED: parsing failed catastrophically, error returned to user. No crash.
- All states are non-crashing.

### Strict Prohibitions

- No AI silently writes formal canvas data.
- No mock AI responses in release acceptance paths (fixtures use recorded real AI outputs or schema-validated test vectors).
- No localStorage for AI-generated formal data.
- No direct invoke() in AI components -- all through api client layer.
- No provider config = AI functions show clear error, no crash, no undefined behavior.
- Structured Output Parser must return status-tagged data on validationErrors (not throw).
- Command Router unrecognized intent -> fallback to discuss.
- Context Builder on missing upstream data -> include available data only, no exception.
- Skill Registry on skill not found -> return None, not panic.

## 10. Acceptance Commands

```bash
cargo check
npm run tsc -- --noEmit
npm run accept:static
npm run accept:contracts    # scanner updated with AI entities
npm run accept:persistence  # new AI tables tested
npm run accept:ai           # NEW: runs AI evaluation harness (>= 10 fixtures)
```

### AI Evaluation Harness Fixtures (minimum 17)

| # | Fixture ID | Type | Validates |
|---|------------|------|-----------|
| 1 | premise.discuss | discuss | Context Builder loads premise data, routes to discuss, 0 DB writes |
| 2 | premise.suggest | suggest | Router routes premise intent to suggest, parser validates output |
| 3 | structure.discuss | discuss | Context Builder loads structure data, routes to discuss |
| 4 | structure.suggest | suggest | Router routes structure intent to suggest |
| 5 | setting.discuss | discuss | Context Builder loads world rules + characters |
| 6 | setting.suggest | suggest | Router routes setting intent to suggest |
| 7 | packet.write_preview | write_preview | Context: premise+structure+setting, router generates packet, parser validates packet JSON, 0 DB writes before confirm |
| 8 | draft.write_preview | write_preview | Context: packet+setting, router generates draft, parser validates, 0 DB writes before confirm |
| 9 | packet.suggest | suggest | Router routes packet intent to suggest (preview before confirm) |
| 10 | parser.invalid_schema | parser | Malformed JSON -> FALLBACK, not crash |
| 11 | parser.missing_field | parser | Missing required fields -> REPAIRED (auto-completed) |
| 12 | parser.illegal_field | parser | Extra fields -> stripped, VALID |
| 13 | router.unrecognized | router | Gibberish input -> discuss fallback |
| 14 | router.assumption_flow | assumption | "we need a character" -> assumption handler |
| 15 | db.no_write_on_discuss | persistence | After discuss: 0 new rows in any canvas table |
| 16 | db.no_write_before_accept | persistence | After suggest (before accept): 0 new canvas rows |
| 17 | registry.all_five | registry | All 5 skills return correct prompt_template + schemas |

### Manual Acceptance Paths

Path A -- Control Center: Open app -> AI Control Center -> Add OpenAI provider -> Connection test pass -> Add DeepSeek -> Modify -> Delete -> Verify list. Switch to Model tab -> Select default chat model -> Select generation model -> Verify persistence on restart.

Path B -- Canvas Routing: Open project premise canvas -> CanvasAiBar shows selected model -> Send discuss -> Response in ChatDrawer, 0 DB writes. Switch to suggest -> Suggestion card appears -> Accept -> 1 row in DB. Switch to write_preview -> Preview shows -> Confirm -> Data written.

Path C -- Structured Output Fallback: Packet canvas -> Send write_preview with valid data -> Structured preview. Simulate malformed AI output (via test script if needed) -> Parser falls back to plain text, no crash.

Path D -- No Provider: Fresh app, no provider configured -> CanvasAiBar shows "unconfigured" error -> Send AI message -> Error displayed, no crash, no undefined behavior.

Path E -- v2.0-H Regression: Create project -> Navigate all 5 canvases -> Save data -> Refresh -> Data persists -> Legacy menu accessible.

## 11. PASS / FAIL Criteria

PASS:
- All 6 P0 items completed.
- All acceptance commands pass (cargo check, tsc, accept:static, accept:contracts, accept:persistence, accept:ai).
- No forbidden scope entered.
- No stable contract broken.
- No silent write (discuss=0 DB writes, suggest/write_preview=0 writes before user action).
- No mock AI in acceptance paths.
- AI Evaluation Harness >= 10 fixtures all PASS.
- All 5 manual acceptance paths pass.
- v2.0-H E2E acceptance path not broken.

PASS_WITH_NOTES: All PASS criteria met; non-blocking P1 issues (minor CSS, labels) permitted.

PASS_WITH_REQUIRED_PATCHES: Version mostly correct; specific listed patches required (specific provider flow, specific parser edge case). Cannot progress to v2.1.0 until patches applied.

FAIL: Any P0 missing, acceptance command fails, stable contract broken, silent write detected, mock data in acceptance, forbidden scope entered.

## 12. Gate Checklist (10 Steps)

| # | Check | Pass? |
|---|-------|-------|
| 1 | Can a worker execute this plan without reading the full PRD v0.3.1? | |
| 2 | In Scope <= 5 items + AI Control Center v2 (6 total, per PRD section 7.3+7.4 grouping)? | |
| 3 | Out of Scope explicit and complete (all v2.1+ items listed)? | |
| 4 | File locks clear per exact path (Allowed Write new files + modifications, Read Only, Forbidden)? | |
| 5 | DB rules clear (additive tables only, no migration, no existing table changes, formal persistence path)? | |
| 6 | Contract rules clear (new AI contracts allowed, 5 existing contracts locked)? | |
| 7 | Acceptance commands enumerable (accept:ai added, 17 fixtures defined with IDs and validation targets)? | |
| 8 | Real user paths defined (5 manual acceptance paths A through E)? | |
| 9 | Mock / localStorage / silent write explicitly banned in AI Rules section? | |
| 10 | Next version (v2.1.0) excluded from this scope? | |

If any check fails, return to chancellor for clarification before dispatch. Do not begin implementation until all 10 pass.

## 13. Required Handoff Report

```md
# v2.0.2 Report

## Verdict
PASS / PASS_WITH_NOTES / PASS_WITH_REQUIRED_PATCHES / FAIL

## Files Changed
- New: (list)
- Modified: (list)

## What Was Implemented
- [x] AI Context Builder v2
- [x] AI Command Router v2
- [x] Structured Output Parser
- [x] Prompt/Skill Registry (5 skills)
- [x] AI Evaluation Harness (N/17+ fixtures PASS)
- [x] AI Control Center v2

## Acceptance Results
| Command | Result | Notes |
|---------|--------|-------|
| cargo check | | |
| tsc --noEmit | | |
| accept:static | | |
| accept:contracts | | |
| accept:persistence | | |
| accept:ai (fixtures) | | N/17+ PASS |

## Known Issues
## Next Recommended Step
```

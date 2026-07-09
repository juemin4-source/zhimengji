# T1: AI Foundation -- Structured Output Parser + AI Control Center v2

## Metadata

- **Order:** 1 (first)
- **Dependencies:** None (foundation ticket, runs first)
- **Risk:** medium
- **Terse:** off

## Goal

Implement the AI Structured Output Parser (schema validation, auto-repair, fallback chain, non-crashing all states) and the AI Control Center v2 (provider add/modify/delete, model role selection, connection testing, capability status) -- the two most independent infrastructure pieces.

## Scope

### In Scope

- Structured Output Parser: contract, Rust implementation, frontend logic, llm-client schema hint integration
- AI Control Center v2: UI, api client, Rust backend for provider CRUD + model role selection + connection test + capability status display
- DB tables: ai_provider_config, ai_evaluation_results (CREATE TABLE IF NOT EXISTS)
- Rust: src-tauri/src/ai/ module structure, structured_parser.rs, models.rs structs, db.rs table creation, lib.rs module registration
- Types: ParserStatus, ParseInput, ParseOutput, ProviderRoleModels, CapabilityStatus in types/ai.ts
- AiOutputType extension in ai-output.ts (add generatePacket, generateDraft, assumption_flow)

### Out of Scope

- Prompt/Skill Registry (T2)
- AI Context Builder (T3)
- AI Command Router (T4)
- AI Evaluation Harness (T5)
- Canvas component rewiring (T4)
- Registry DB table (T2)

## Allowed Writes

### New Files

| Path | Reason |
|------|--------|
| `src/contracts/ai-parser.contract.ts` | Parser input/output types (ParseInput, ParseOutput, ParserStatus enum) |
| `src/lib/ai/structured-parser.ts` | Schema validation + auto-repair + field stripping + fallback logic |
| `src-tauri/src/ai/structured_parser.rs` | Rust parser for Tauri invoke (schema validation, repair, field stripping) |
| `src-tauri/src/ai/mod.rs` | Create ai module, declare structured_parser submodule |
| `src/components/ai/AiControlCenter.tsx` | Full provider management UI (add/modify/delete/connection test/model select) |
| `src/components/ai/ai-control-center.css` | Styling for Control Center |
| `src/api/aiControlCenterApi.ts` | Frontend API client for Control Center commands |

### Existing Files (Modifications Allowed)

| Path | Reason |
|------|--------|
| `src/lib/llm-client.ts` | Add schema hint parameter for structured output parsing; provider-aware model routing |
| `src/types/ai.ts` | Add: ParserStatus enum, ParseInput, ParseOutput; ProviderRoleModels interface, CapabilityStatus interface |
| `src/lib/ai-output.ts` | Extend AiOutputType with generatePacket, generateDraft, assumption_flow |
| `src-tauri/src/lib.rs` | Add `mod ai;` and register ai module + ai_commands |
| `src-tauri/src/models.rs` | Add ai_provider_config struct (id, provider_id, name, api_key_exists, endpoint, timeout, default_models, status, timestamps) |
| `src-tauri/src/db.rs` | Add ai_provider_config and ai_evaluation_results tables (CREATE TABLE IF NOT EXISTS, additive only) |

## Read Only (for reference, not modification)

- `src/contracts/premise.contract.ts`, `structure.contract.ts`, `setting.contract.ts`, `chapter-packet.contract.ts`, `decision-log.contract.ts`
- `src/api/premiseApi.ts`, `structureApi.ts`, `settingApi.ts`, `chapterPacketApi.ts`, `decisionLogApi.ts`, `projectApi.ts`
- `src/App.tsx`, `src/stores/projectStore.ts`
- `src/features/canvas-01-premise/`, `02-structure/`, `03-setting/`, `04-packet/`, `05-text/`
- `src/components/ai/CanvasAiBar.tsx` (connected in T4)
- `src/components/ai/AIChat.tsx` (Legacy, not modified)
- `src-tauri/src/premise_commands.rs`, `structure_commands.rs`, `setting_commands.rs`, `chapter_packet_commands.rs`, `decision_log_commands.rs`, `pipeline_commands.rs`

## Acceptance Criteria

### Commands

```bash
cargo check      # PASS
npm run tsc -- --noEmit  # PASS
npm run accept:static    # PASS
```

### Parser States

- VALID: well-formed JSON matching schema -> data safe for user preview
- REPAIRED: missing required fields auto-completed with defaults, repairLog recorded
- FALLBACK: schema unrecoverable -> demoted to plain text discuss, no crash
- FAILED: catastrophic parse failure -> error returned to user, no crash
- Illegal extra fields stripped from output, status=VALID
- All four states are non-crashing

### Control Center

- Provider add form works (OpenAI/DeepSeek/Gemini/Custom)
- Provider modify (edit endpoint, timeout, name)
- Provider delete removes from list
- Connection test returns success/failure status
- Model role selection: chat/structured/generation/detection per provider
- Capability status displayed
- No provider configured -> clear error shown, no crash, no undefined behavior
- Fresh app with no providers -> UI shows empty state, not crash

### Strict Prohibitions

- No mock AI responses in acceptance paths
- No silent writes to canvas tables
- No localStorage for formal AI data
- No direct invoke() in AI components (must use api client)

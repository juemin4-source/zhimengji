# TICKET W01 — AI Foundation: Contracts, Types, DB, Rust Scaffold

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.0.2-W01 |
| Title | AI Foundation — Contracts, Types, DB Schema, Rust Module Scaffold |
| Execution Order | 1 / 5 |
| Dependencies | None (ground floor) |
| Risk | medium (touches `db.rs`, `lib.rs`, `models.rs` — sensitive existing files) |
| File Conflict | `src/types/ai.ts` may also be modified by v2.0.1 branch — merge-time resolution needed |

## Objective

Create the entire AI infrastructure foundation: all 4 new contract type definitions, extended TypeScript AI types, 3 new DB tables (additive only), Rust struct definitions, AI module scaffold in `src-tauri/src/ai/`, stub `ai_commands.rs`, and registration in `lib.rs`.

Every other ticket (W02–W05) depends on this foundation being in place.

---

## Detailed Scope

### 1. New Contract Files (create in `src/contracts/`)

Follow existing contract naming/style (see `premise.contract.ts` for reference — PascalCase interfaces, `Input`/`Output` suffix for operation types).

| File | Contents |
|------|----------|
| `src/contracts/ai-context.contract.ts` | `ContextBuildInput` (canvasId, projectId, outputType, additionalPrompt?), `AiBuiltContext` (systemPrompt, contextData, writableTargets, forbiddenTargets, outputFormat, skillId?) |
| `src/contracts/ai-router.contract.ts` | `AiRoute` enum (discuss/suggest/write_preview/generatePacket/generateDraft/assumption_flow/unrecognized), `RouteInput` (message, canvasId, projectId, history?), `RouteOutput` (intent, confidence, parameters, fallbackReason?) |
| `src/contracts/ai-parser.contract.ts` | `ParserStatus` enum (valid/repaired/fallback/failed), `ParseInput` (rawContent, schema, strict), `ParseOutput` (data, validationErrors[], repairLog[], fallbackText?) |
| `src/contracts/ai-registry.contract.ts` | `SkillRecord` (id, skillId, name, promptTemplate, inputSchema, outputSchema, version), `ListSkillsOutput`, `RegisterSkillInput` |

### 2. Extend TypeScript Types

| File | Changes |
|------|---------|
| `src/types/ai.ts` | **Add** (do not remove/change existing): `ProviderRoleModels` (modelId for each role: chat/structured/generation/detection), `CapabilityStatus` (providerId, role, status, latencyMs?), `RouterConfig` (defaultModelId, fallbackProviderIds[]). **Do NOT** remove existing types like `ProviderConfig`, `AiModel`, `AiSettingsState`, etc. |
| `src/lib/ai-output.ts` | Extend `AiOutputType` union: add `'generatePacket'`, `'generateDraft'`, `'assumption_flow'`. Add corresponding entries to `AI_OUTPUT_BEHAVIORS` object (label/description/effect for each new type). |

### 3. Rust Backend

| File | Changes |
|------|---------|
| `src-tauri/src/models.rs` | **Add** structs (additive only, do not change existing): `AiPromptRecord`, `AiProviderConfig`, `AiEvaluationResult`. Follow existing patterns: `#[derive(Debug, Clone, Serialize, Deserialize)]`, `#[serde(rename_all = "camelCase")]`. Include input/request structs as needed. |
| `src-tauri/src/db.rs` | Append `CREATE TABLE IF NOT EXISTS` to `init_schema()` for 3 new tables (see scope freeze section 7 for schemas): `ai_prompt_registry`, `ai_provider_config`, `ai_evaluation_results`. Additive only — no ALTER TABLE, no migration. Import new model types in the `use` block. |
| `src-tauri/src/ai/mod.rs` | Create new module file. Declare submodules: `pub mod context_builder;` (stub, will be realized in W02), `pub mod structured_parser;` (stub, W03), `pub mod skill_registry;` (stub, W04). |
| `src-tauri/src/ai_commands.rs` | Create new file with function stubs (placeholder bodies returning default values) for all AI commands: `build_context`, `route_intent`, `parse_output`, `list_skills`, `get_skill`, `list_providers_v2`, `save_provider_config`, `delete_provider_config`, `test_provider_connection`, `run_evaluation`. Each stub: `Result<..., String>` returning `Err("not implemented")` or a sensible default. |
| `src-tauri/src/lib.rs` | Add `mod ai;` and `mod ai_commands;` declarations. Register all AI commands in `invoke_handler!` macro. |

### 4. No-Op for This Ticket

The following are **NOT** included in this ticket (created in later tickets):
- `src/lib/ai/context-builder.ts` — W02
- `src/lib/ai/command-router.ts` — W02
- `src/lib/ai/structured-parser.ts` — W03
- `src/lib/ai/prompt-registry.ts` — W04
- `src/lib/ai/index.ts` — W02
- `src/lib/ai/evaluation-harness.ts` — W05
- `src/components/ai/AiControlCenter.tsx` — W04
- `src/api/aiContextApi.ts` — W02
- `src/api/aiControlCenterApi.ts` — W04
- `CanvasAiBar.tsx`, `ChatDrawer.tsx`, `AiSuggestionCard.tsx`, `AiWritePreviewPanel.tsx`, `AiSettings.tsx` — W05

---

## Allowed Write

```
NEW: src/contracts/ai-context.contract.ts
NEW: src/contracts/ai-router.contract.ts
NEW: src/contracts/ai-parser.contract.ts
NEW: src/contracts/ai-registry.contract.ts
MODIFY: src/types/ai.ts            (extend with new types only)
MODIFY: src/lib/ai-output.ts       (extend AiOutputType + AI_OUTPUT_BEHAVIORS)
MODIFY: src-tauri/src/models.rs    (add structs, additive only)
MODIFY: src-tauri/src/db.rs        (append CREATE TABLE, additive only)
NEW: src-tauri/src/ai/mod.rs
NEW: src-tauri/src/ai_commands.rs
MODIFY: src-tauri/src/lib.rs       (register ai module + commands)
```

## Read Only (for context)

```
src/contracts/premise.contract.ts       — pattern reference
src-tauri/src/premise_commands.rs       — pattern for Tauri command stubs
src-tauri/src/models.rs                 — existing struct patterns
src-tauri/src/db.rs                     — existing init_schema patterns
src/api/premiseApi.ts                   — API layer pattern
src/types/ai.ts                         — existing types to extend
src/lib/ai-output.ts                    — existing enum to extend
```

## Forbidden

```
Any existing contract files other than what's listed above
Any existing Rust command files other than what's listed above
src/components/ai/CanvasAiBar.tsx
src/components/ai/ChatDrawer.tsx
src/components/ai/AiSuggestionCard.tsx
src/components/ai/AiWritePreviewPanel.tsx
src/components/ai/AiSettings.tsx
src/components/ai/AIChat.tsx (Legacy — read only)
Any file not in Allowed Write or Read Only above
```

## Acceptance Criteria

1. `cargo check` passes (all Rust mod declarations resolve, structs compile, commands register)
2. `npm run tsc -- --noEmit` passes (new contract types compile)
3. `npm run accept:static` passes (no forbidden patterns)
4. All 4 contract files exist and export their named types
5. `AiOutputType` includes all 6 variants: discuss, suggest, write_preview, generatePacket, generateDraft, assumption_flow
6. `src/types/ai.ts` retains all existing types (ProviderConfig, AiModel, PRESET_PROVIDERS, etc.) and adds new ones
7. `src-tauri/src/db.rs` creates 3 new tables with correct schemas (additive, no existing table alteration)
8. `src-tauri/src/ai_commands.rs` compiles with all function stubs registered in lib.rs

## Notes

- All DB changes must be additive (CREATE TABLE IF NOT EXISTS). No migrations, no ALTER TABLE.
- Existing contract files (premise, structure, setting, etc.) are LOCKED — do not touch.
- The `ai_commands.rs` stubs return `Err("not implemented")` — this is intentional. They will be filled in by subsequent tickets.
- File conflict risk with v2.0.1 branch on `src/types/ai.ts` — both versions extend it. At merge time, resolve by keeping both sets of additions.

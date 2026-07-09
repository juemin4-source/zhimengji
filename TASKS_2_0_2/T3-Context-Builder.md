# T3: AI Context Builder v2

## Metadata

- **Order:** 3 (third)
- **Dependencies:** T2 (context builder references skill IDs from registry; T1 parser types used for output specification)
- **Risk:** medium
- **Terse:** off

## Goal

Build a unified context construction entry point that aggregates current canvas data + upstream data + writable/forbidden targets + outputType for all 5 canvas types, eliminating per-canvas AI fragmentation.

## Scope

### In Scope

- ai-context contract: ContextBuildInput, AiBuiltContext
- context-builder.ts: canvas data aggregation logic per canvas type, upstream chain resolution
- aiContextApi.ts: frontend API client for context building
- context_builder.rs: Rust backend for context assembly, reads canvas data via existing APIs

### Context Data Chain

| Canvas | Upstream Data | Notes |
|--------|---------------|-------|
| premise | none | No upstream, first canvas |
| structure | premise | premise data included in context |
| setting | premise + structure | world rules + characters |
| packet | premise + structure + setting | full upstream chain |
| draft (text) | packet + setting | packet content + world rules |

### Out of Scope

- Command routing (T4)
- Output parsing (T1 -- builder produces context, does not parse AI output)
- Registry (T2)
- Control Center (T1)
- Canvas UI modifications (T4)

## Allowed Writes

### New Files

| Path | Reason |
|------|--------|
| `src/contracts/ai-context.contract.ts` | ContextBuildInput (canvasId, projectId, outputType, additionalPrompt?), AiBuiltContext (systemPrompt, contextData, writableTargets, forbiddenTargets, outputFormat, skillId?) |
| `src/lib/ai/context-builder.ts` | Single entry point: loads current canvas data, resolves upstream chain, constructs system prompt with writable/forbidden targets |
| `src/api/aiContextApi.ts` | Frontend API client: `buildContext(input)` returning AiBuiltContext |
| `src-tauri/src/ai/context_builder.rs` | Rust backend: reads canvas data via existing data-access functions, assembles context struct |

### Existing Files (Modifications Allowed)

| Path | Reason |
|------|--------|
| `src-tauri/src/ai/mod.rs` | Add `pub mod context_builder;` |
| `src-tauri/src/lib.rs` | Register context_builder commands |
| `src/types/ai.ts` | Add ContextBuildInput, AiBuiltContext types (if not already in T1/T2) |

## Read Only (for reference, not modification)

- `src/contracts/premise.contract.ts` -- understand premise data shape
- `src/contracts/structure.contract.ts` -- understand structure data shape
- `src/contracts/setting.contract.ts` -- understand setting data shape (world rules + characters)
- `src/contracts/chapter-packet.contract.ts` -- understand packet data shape
- `src/api/premiseApi.ts`, `structureApi.ts`, `settingApi.ts`, `chapterPacketApi.ts` -- understand how to load canvas data
- `src/features/canvas-01-premise/`, `02-structure/`, `03-setting/`, `04-packet/`, `05-text/` -- understand canvas data structures
- T1/T2 contract and lib files for type alignment

## Acceptance Criteria

```bash
cargo check      # PASS
npm run tsc -- --noEmit  # PASS
npm run accept:static    # PASS
```

### Context Assembly Tests

- **premise.discuss**: Context Builder loads premise data only -> contextData contains premise fields, writableTargets = [premise], no upstream error
- **structure.discuss**: Loads structure data + premise data -> contextData contains both
- **setting.discuss**: Loads world rules + characters + premise + structure -> contextData contains all upstream
- **packet.write_preview**: Loads packet + premise + structure + setting -> full upstream chain assembled
- **draft.write_preview**: Loads draft text + packet + setting -> packet content included
- **Missing upstream data**: One canvas has no data -> Context Builder includes available data only, no exception thrown
- **outputFormat**: Context output includes correct outputFormat matching the outputType parameter
- **writableTargets**: Context output lists correct writable tables for the current canvas
- **forbiddenTargets**: Context output lists tables that must NOT be written to
- **skillId**: Context output includes skillId matching the canvas type (references T2 registry)

### Strict Prohibitions

- No modification to existing canvas data-access functions
- No modification to existing canvas contracts
- No writing to canvas tables during context building
- Missing upstream data -> include what's available, no crash, no exception

# T4: AI Command Router v2 + Canvas Integration

## Metadata

- **Order:** 4 (fourth)
- **Dependencies:** T1 (parser, Control Center provider config), T3 (context builder), T2 (skill registry)
- **Risk:** high (touches multiple existing canvas components)
- **Terse:** off

## Goal

Implement intent recognition routing to 7 paths (discuss/suggest/write_preview/generatePacket/generateDraft/assumption_flow/unrecognized) and connect all canvas AI components (CanvasAiBar, ChatDrawer, AiSuggestionCard, AiWritePreviewPanel, AiSettings) through the router -- completing the AI pipeline from user message to AI response.

## Scope

### In Scope

- ai-router contract: AiRoute enum, RouteInput, RouteOutput
- command-router.ts: central routing logic, intent recognition, path dispatch
- ai/index.ts: central exports barrel file for all lib/ai modules
- ai_commands.rs: top-level Tauri command registration for all AI features
- CanvasAiBar: connect to AI Command Router for intent dispatch; read default model from Control Center; wire outputType selector to router
- ChatDrawer: connect to AI router for discuss responses (replace inline llm call)
- AiSuggestionCard: accept structured parser output for suggest responses
- AiWritePreviewPanel: accept structured parser output for write_preview responses
- AiSettings: add navigation link to AI Control Center; may deprecate tabs in favor of new UI

### The 7 Route Paths

| Intent | Route | Behavior |
|--------|-------|----------|
| General chat | discuss | Router routes to ChatDrawer, 0 DB writes |
| Suggestion | suggest | Router returns parser-validated suggestion card data |
| Preview writing | write_preview | Context + parser -> preview panel, 0 DB writes before confirm |
| Generate packet | generatePacket | Packet context + parser -> packet preview |
| Generate draft | generateDraft | Draft context + parser -> draft preview |
| Assumption detect | assumption_flow | "we need X" -> creates temporary assumption record |
| Unrecognized | unrecognized | Falls back to discuss path |

### Out of Scope

- Legacy AIChat enhancement or modification (remains Legacy)
- Complete Method UI for any canvas (v2.1.0)
- AI Evaluation Harness (T5)
- Writing actual skill prompt content (T2 data)

## Allowed Writes

### New Files

| Path | Reason |
|------|--------|
| `src/contracts/ai-router.contract.ts` | AiRoute enum (7 paths), RouteInput (message, canvasId, projectId, history?), RouteOutput (intent, confidence, parameters, fallbackReason?) |
| `src/lib/ai/command-router.ts` | Intent recognition logic; dispatches to correct path; reads provider config from Control Center; invokes context builder + parser + LLM client in correct order |
| `src/lib/ai/index.ts` | Barrel exports: re-export all public types and functions from structured-parser, prompt-registry, context-builder, command-router, evaluation-harness |
| `src-tauri/src/ai_commands.rs` | Top-level Tauri command entry points: route_message, build_context, parse_output, etc. |

### Existing Files (Modifications Allowed)

| Path | Reason |
|------|--------|
| `src-tauri/src/ai/mod.rs` | Add `pub mod command_router;` and module declarations for ai_commands |
| `src-tauri/src/lib.rs` | Ensure ai_commands module registered |
| `src/components/ai/CanvasAiBar.tsx` | Connect to AI Command Router: send messages through router (not direct stage-switch); read default model from Control Center; wire outputType selector to router |
| `src/components/ai/ChatDrawer.tsx` | Connect to AI router for discuss responses (replace inline llm call with router dispatch) |
| `src/components/ai/AiSuggestionCard.tsx` | Accept structured parser output; display valid/fallback states properly |
| `src/components/ai/AiWritePreviewPanel.tsx` | Accept structured parser output; display preview for valid; show plain text for fallback |
| `src/components/ai/AiSettings.tsx` | Add navigation link to AI Control Center; may deprecate tabs |
| `src/types/ai.ts` | Add AiRoute enum, RouteInput, RouteOutput types |
| `src/lib/ai-output.ts` | Ensure AiOutputType enum includes generatePacket, generateDraft, assumption_flow (if not from T1) |

## Read Only (for reference, not modification)

- T1: AiControlCenter.tsx, aiControlCenterApi.ts, structured-parser.ts, ai-parser.contract.ts, llm-client.ts
- T2: prompt-registry.ts, ai-registry.contract.ts, skill_registry.rs
- T3: context-builder.ts, aiContextApi.ts, ai-context.contract.ts, context_builder.rs
- `src/App.tsx` -- understand how CanvasAiBar is consumed (must not break the consumer)
- `src/components/ai/AIChat.tsx` -- Legacy, not referenced from new AI infrastructure

## Acceptance Criteria

```bash
cargo check      # PASS
npm run tsc -- --noEmit  # PASS
npm run accept:static    # PASS
npm run accept:contracts # PASS (includes AI entities if scan-contract-chain updated)
```

### Route Tests

- **discuss**: Send general chat message -> intent=discuss -> response in ChatDrawer -> 0 DB writes
- **suggest**: Send "try this idea" -> intent=suggest -> suggestion card appears -> Accept writes to DB, reject writes nothing
- **write_preview**: Send "write this" -> intent=write_preview -> preview panel shows -> Confirm writes, Reject writes nothing
- **generatePacket**: Packet canvas send -> intent=generatePacket -> packet preview -> Confirm writes
- **generateDraft**: Text canvas send -> intent=generateDraft -> draft preview -> Confirm writes
- **assumption_flow**: "we need a character" -> intent=assumption_flow -> temporary assumption record created
- **unrecognized**: Gibberish input -> intent=unrecognized -> falls back to discuss, no crash

### Canvas Integration

- CanvasAiBar shows the selected default model from Control Center
- CanvasAiBar sends messages through the router, not directly
- ChatDrawer receives discuss responses from the router (not inline llm call)
- AiSuggestionCard shows valid and fallback states correctly
- AiWritePreviewPanel shows valid and fallback states correctly
- AiSettings has a link to AI Control Center
- No existing CanvasAiBar props interface broken (App.tsx consumer still works)
- No provider configured -> CanvasAiBar shows "unconfigured" error -> Send AI message -> Error displayed, no crash

### Strict Prohibitions

- No direct invoke() in AI components (must go through api client -> router -> parser chain)
- No mock AI responses in acceptance paths
- No silent writes: discuss=0 DB writes, suggest/write_preview=0 writes before user accept/confirm
- No localStorage for AI-generated formal data
- No breaking changes to App.tsx consumer of CanvasAiBar props
- No modification to Legacy AIChat
- Router unrecognized -> fallback to discuss, never crash

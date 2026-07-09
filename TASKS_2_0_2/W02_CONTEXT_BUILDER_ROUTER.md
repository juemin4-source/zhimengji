# TICKET W02 — AI Context Builder v2 + Command Router v2

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.0.2-W02 |
| Title | AI Context Builder v2 + Command Router v2 |
| Execution Order | 2 / 5 (parallel with W03, W04) |
| Dependencies | W01 must be complete (contracts, types, DB, Rust scaffold) |
| Risk | medium (core AI logic; routing decisions affect all downstream consumers) |

## Objective

Implement two tightly coupled AI infrastructure modules:

1. **AI Context Builder v2** — a single entry point that constructs a unified AI context from current canvas data, upstream canvas data, writable/forbidden targets, and requested outputType. Per-canvas rules: premise has no upstream; structure references premise; setting references premise+structure; packet references premise+structure+setting; draft (text) references packet+setting.

2. **AI Command Router v2** — intent recognition that routes user AI requests to 7 paths (discuss/suggest/write_preview/generatePacket/generateDraft/assumption_flow/unrecognized). Provides the dispatch layer between CanvasAiBar and AI execution.

These two modules are co-delivered because the Router consumes the Context Builder.

---

## Detailed Scope

### 1. Context Builder — `src/lib/ai/context-builder.ts`

Single default export function (or a class with one public method):

```typescript
function buildContext(input: ContextBuildInput): Promise<AiBuiltContext>
```

Rules per canvas:
| Canvas | Upstream Data Sources | Notes |
|--------|----------------------|-------|
| premise | None | Only current premise data |
| structure | premise | Load premise cards |
| setting | premise + structure | Load premise + structure nodes |
| packet | premise + structure + setting | All upstream, plus setting includes world rules + character cards |
| text | packet + setting | Chapter packet data + setting |

Output includes:
- `systemPrompt` — composed from canvas + outputType
- `contextData` — serialized upstream data
- `writableTargets` — which tables/entities this outputType can write to
- `forbiddenTargets` — which tables/entities this outputType must NOT write
- `outputFormat` — expected structure hint
- `skillId?` — optional, if a registered skill matches

**On missing upstream data:** include available data only, do not throw/panic.

### 2. Command Router — `src/lib/ai/command-router.ts`

Single default export function:

```typescript
function route(input: RouteInput): Promise<RouteOutput>
```

Intent recognition logic (can use simple keyword/heuristic matching — no LLM call needed for routing):
- `discuss` — general conversation, no data implications
- `suggest` — user wants options/alternatives
- `write_preview` — user wants AI to draft content into canvas
- `generatePacket` — user wants packet generation (from packet canvas)
- `generateDraft` — user wants draft generation (from text canvas)
- `assumption_flow` — user request implies missing data (e.g., "we need a character")
- `unrecognized` — fallback to discuss

Output includes `intent`, `confidence` (0–1), `parameters` (extracted entities), and `fallbackReason?` (if confidence < threshold).

### 3. API Layer — `src/api/aiContextApi.ts`

Wrap context builder and router behind Tauri `invoke` calls:

```typescript
export async function fetchAiContext(input: ContextBuildInput): Promise<AiBuiltContext>
export async function routeAiMessage(input: RouteInput): Promise<RouteOutput>
```

Each calls the corresponding Tauri command, which delegates to the TS/Mock or Rust implementation. Follow existing API pattern (see `premiseApi.ts`).

### 4. Barrel Export — `src/lib/ai/index.ts`

Re-export all public functions from context-builder, command-router for clean imports:

```typescript
export { buildContext } from './context-builder';
export { route } from './command-router';
```

### 5. Rust Backend — `src-tauri/src/ai/context_builder.rs`

Rust implementation of context building logic (mirrors TypeScript for Tauri native calls). Contains:

- Function to load upstream data via DB queries
- Function to compose system prompt from canvas context
- Function to determine writable/forbidden targets per outputType

### 6. Wire Commands — `src-tauri/src/ai_commands.rs`

Implement the two command stubs created in W01:

- `build_context` — calls `context_builder::build_context()` or the isomorphic TypeScript path
- `route_intent` — calls `command-router` logic

---

## Allowed Write

```
NEW: src/lib/ai/context-builder.ts
NEW: src/lib/ai/command-router.ts
NEW: src/lib/ai/index.ts
NEW: src/api/aiContextApi.ts
NEW: src-tauri/src/ai/context_builder.rs
MODIFY: src-tauri/src/ai/mod.rs          (register context_builder module)
MODIFY: src-tauri/src/ai_commands.rs     (implement build_context, route_intent)
```

## Read Only (for context)

```
src/contracts/ai-context.contract.ts       — ContextBuildInput/AiBuiltContext types
src/contracts/ai-router.contract.ts        — RouteInput/RouteOutput/AiRoute types
src/types/ai.ts                            — AI types (may reference)
src/api/premiseApi.ts                      — API layer pattern
src/lib/ai-output.ts                       — output type definitions
src-tauri/src/ai/mod.rs                    — module registration (from W01)
src-tauri/src/ai_commands.rs              — existing stubs (from W01)
src-tauri/src/models.rs                    — model structs (from W01)
src-tauri/src/db.rs                        — DB methods (from W01)
```

## Forbidden

```
Structured Output Parser (src/lib/ai/structured-parser.ts) — W03
Prompt/Skill Registry (src/lib/ai/prompt-registry.ts) — W04
AI Control Center (src/components/ai/AiControlCenter.tsx) — W04
CanvasAiBar.tsx, ChatDrawer.tsx, AiSuggestionCard.tsx, AiWritePreviewPanel.tsx — W05
AiSettings.tsx — W05
AI Evaluation Harness (src/lib/ai/evaluation-harness.ts, scripts/acceptance/ai-evaluation.mjs) — W05
Any existing canvas features
Any existing contract files (premise, structure, setting, etc. — LOCKED)
Any existing API files (premiseApi, structureApi, etc.)
```

## Acceptance Criteria

1. `npm run tsc -- --noEmit` passes
2. `cargo check` passes
3. Context Builder correctly includes upstream data per canvas type
4. Context Builder on missing upstream data: returns available data only, no exception
5. Command Router correctly routes to all 7 intent paths
6. Unrecognized intent falls back to `discuss`
7. `fetchAiContext` and `routeAiMessage` are callable from frontend
8. `build_context` Tauri command exists and returns structured context

## Notes

- Context Builder output must include writableTargets and forbiddenTargets per outputType — this is critical for the "no silent write" rule.
- Router uses heuristic intent detection (keyword matching), not LLM calls — keep it simple.
- These two modules are consumed by W05 (frontend integration). They should be fully testable in isolation.
- The Rust backend (`context_builder.rs`) mirrors the TypeScript logic for Tauri-native execution paths.

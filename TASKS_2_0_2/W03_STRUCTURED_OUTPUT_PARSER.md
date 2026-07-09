# TICKET W03 — Structured Output Parser

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.0.2-W03 |
| Title | Structured Output Parser |
| Execution Order | 2 / 5 (parallel with W02, W04) |
| Dependencies | W01 must be complete (contracts, types, DB, Rust scaffold) |
| Risk | low (independent utility module; no coupling to other AI infrastructure) |

## Objective

Implement the Structured Output Parser — the single layer through which all AI structured outputs pass. It validates JSON against schema, auto-repairs missing fields with defaults, strips illegal fields, and falls back to plain text when schema recovery is impossible.

Also upgrade `llm-client.ts` to accept schema hints and perform provider-aware model routing.

---

## Detailed Scope

### 1. Parser — `src/lib/ai/structured-parser.ts`

Single default export function:

```typescript
function parseStructuredOutput(input: ParseInput): ParseOutput
```

Where `ParseInput = { rawContent: string; schema: object; strict: boolean }`.

Behavior rules (from scope freeze section 9):

| Status | Condition | Action |
|--------|-----------|--------|
| `VALID` | JSON conforms to schema exactly | Return parsed data as-is |
| `REPAIRED` | JSON has missing fields but is recoverable | Fill missing fields with defaults from schema, record repairLog |
| `FALLBACK` | Schema unrecoverable (malformed JSON, wrong structure) | Demote output to plain text (fallbackText). No crash. |
| `FAILED` | Catastrophic parsing failure | Return error to user. No crash. |

Parser must:
- Return `status`-tagged data on validationErrors (never throw for recoverable issues)
- Strip illegal fields (extra fields not in schema) — output status = REPAIRED
- Record `validationErrors[]` and `repairLog[]` in ParseOutput
- Return `fallbackText?` when status = FALLBACK

### 2. Rust Backend — `src-tauri/src/ai/structured_parser.rs`

Rust-side JSON schema validation and repair logic. Mirrors the TypeScript implementation for Tauri native command paths.

### 3. Upgrade llm-client — `src/lib/llm-client.ts`

Add to `LlmCallOptions` (or create parallel):

```typescript
export interface StructuredLlmCallOptions extends LlmCallOptions {
  outputSchema?: object;      // JSON schema for structured output
  strictMode?: boolean;       // if true, require exact schema match
  outputType?: string;        // 'discuss' | 'suggest' | 'write_preview' | ...
}
```

Upgrade `callLlm` / `callLlmStream` to:
- Accept `outputSchema` hint
- When `outputSchema` is provided, wrap the raw LLM response through `structured-parser.ts` before returning
- Support provider-aware model routing (choose model based on outputType role: chat vs structured vs generation vs detection)

### 4. Module Registration

Update `src-tauri/src/ai/mod.rs` to register the `structured_parser` submodule (should already be declared as stub from W01).

---

## Allowed Write

```
NEW: src/lib/ai/structured-parser.ts
NEW: src-tauri/src/ai/structured_parser.rs
MODIFY: src-tauri/src/ai/mod.rs          (ensure structured_parser registered)
MODIFY: src/lib/llm-client.ts            (add schema hints, provider-aware routing)
```

## Read Only (for context)

```
src/contracts/ai-parser.contract.ts        — ParseInput/ParseOutput/ParserStatus types
src/lib/llm-client.ts                      — existing interface to upgrade
src-tauri/src/ai/mod.rs                    — module registration (from W01)
src-tauri/src/ai_commands.rs              — existing stubs (from W01)
src-tauri/src/models.rs                    — model structs (from W01)
src/api/premiseApi.ts                      — API pattern reference
```

## Forbidden

```
Context Builder (src/lib/ai/context-builder.ts) — W02
Command Router (src/lib/ai/command-router.ts) — W02
Prompt/Skill Registry (src/lib/ai/prompt-registry.ts) — W04
AI Control Center (src/components/ai/AiControlCenter.tsx) — W04
CanvasAiBar.tsx, ChatDrawer.tsx, AiSuggestionCard.tsx, AiWritePreviewPanel.tsx — W05
AiSettings.tsx — W05
AI Evaluation Harness — W05
Any existing canvas features or contracts (LOCKED)
Any existing API files (premiseApi, structureApi, etc.)
```

## Acceptance Criteria

1. `npm run tsc -- --noEmit` passes
2. `cargo check` passes
3. Valid JSON conforming to schema → status = `VALID`, data correctly parsed
4. Missing optional fields → status = `REPAIRED`, fields filled with defaults, repairLog recorded
5. Extra illegal fields → stripped, status = `VALID` (or `REPAIRED`), data contains only schema fields
6. Malformed JSON → status = `FALLBACK`, fallbackText contains raw content (not crash)
7. Catastrophic error → status = `FAILED`, error returned safely (not crash)
8. llm-client.ts accepts `outputSchema` option and routes through parser when provided
9. All parser states produce non-crashing output

## Notes

- This is a pure utility — no side effects, no DB writes, no network calls.
- The parser must NEVER throw for recoverable validation issues. Always return status-tagged output.
- `strict: true` means the caller requires exact schema match — if validation fails, return FALLBACK not REPAIRED.
- llm-client upgrade must be backward compatible (existing callers without schema hints continue to work).

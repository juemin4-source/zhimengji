# T-004: Canvas AI Call Migration + TianDiRen Rewire + accept:ai-runtime + Audit

**Priority:** P0
**Scope Items:** #5 (Canvas AI Call Migration) + Final Audit + accept:ai-runtime
**Dependencies:** T-003 (Router v2 + Tri-state Guard)
**Estimated Files:** 18

---

## Objective

Rewire all existing AI callers through the Router. Create `accept:ai-runtime` verification command. Remove direct `callLlm` imports from canvas modules. Replace TianDiRen Rust placeholder stub with Router-based AI call. Run final migration audit.

---

## Part A: CanvasAiBar Rewire

### `src/components/ai/CanvasAiBar.tsx`

**Current state:** Directly imports `callLlm` from `llm-client.ts` and calls `invoke('list_providers')` for provider info.

**Target state:**
- Remove `import { testConnection, callLlm } from '../../lib/llm-client'`
- Import Router: `import { route, executeLlmCall, acceptWrite, confirmWrite } from '../../lib/ai/command-router'`
- All AI calls go through `executeLlmCall(await route(input))`
- Provider data comes from `listProviderConfigs` in `aiControlCenterApi`
- Tri-state enforcement handled by Router — component just reads `route.dbWriteAllowed` and shows UI accordingly
- `discuss` → ChatDrawer only (no change to UI, just routing)
- `suggest` → AiSuggestionCard + user accepts via `acceptWrite()` (no change to UI, just routing)
- `write_preview` → AiWritePreviewPanel + user confirms via `confirmWrite()` (no change to UI, just routing)

---

## Part B: generateChapterPacket Rewire

### `src/lib/generateChapterPacket.ts`

**Current state:** Directly imports `callLlm` from `llm-client.ts`.

**Target state:**
- Remove `import { callLlm } from './llm-client'`
- Import Router: `import { route, executeLlmCall } from './ai/command-router'`
- Call chain: `route({ message, canvasId, projectId })` → `executeLlmCall(input, routeOutput)` → parse result → continue
- No changes to the packet creation/update API calls (those stay as-is)

---

## Part C: generateDraft Rewire

### `src/lib/generateDraft.ts`

**Current state:** Directly imports `callLlm` from `llm-client.ts`.

**Target state:**
- Remove `import { callLlm } from './llm-client'`
- Import Router: `import { route, executeLlmCall } from './ai/command-router'`
- Call chain: `route({ message, canvasId, projectId })` → `executeLlmCall(input, routeOutput)` → parse result

---

## Part D: AIChat Rewire

### `src/components/ai/AIChat.tsx`

**Current state:** Directly imports `callLlmStream` from `llm-client.ts`.

**Target state:**
- Remove `import { callLlmStream } from '../../lib/llm-client'`
- Import Router for intent routing (discuss/suggest chat)
- Chat mode (discuss) uses Router but streaming path goes through Router's streaming support
- Router must provide a stream-capable `executeLlmCallStream` or the chat component uses Router to get provider/model and then calls the stream directly (but still through the designated streaming path)

---

## Part E: TianDiRen Rewire

### `src-tauri/src/setting_commands.rs`

**Current state:** `generate_tiandiren_ai` is a Rust placeholder stub that returns template text.

**Target state:**
- Replace placeholder text with a call to the Router (not a direct LLM call)
- The Rust command should invoke the frontend Router logic, or call the LLM through the provider registry
- **Preferred approach:** Make TianDiRen AI call go through the same Router API, not a separate Rust stub
- The `generate_tiandiren_ai` command should call `route_intent` first, then call the provider through the provider registry
- Mark the old stub as deprecated and add `#[deprecated]` or a comment: `// [v2.1.1-AI] Replaced with Router-based AI call`
- The actual AI call chain: `generate_tiandiren_ai` → `resolve_provider_model` → `call_llm` (through provider) → parse with `parse_tiandiren_output` → return

### `src/api/settingApi.ts`

**Current state:** Calls `generate_tiandiren_ai` Tauri command.

**Target state:** Still calls the same command, but now the backend actually routes through the AI provider.

---

## Part F: Create accept:ai-runtime Command

### `src/__tests__/accept-ai-runtime.ts`

New file. Must verify (from scope freeze section 10):

```typescript
// accept:ai-runtime verification
// Provider Registry
//   - v1 BYOK data readable from merged registry
//   - v2 data readable from merged registry
//   - no duplicate provider entries
//   - model selection returns expected models

// Router
//   - route('帮我写正文') returns { intent: 'generateDraft' }
//   - route('建议一些选项') returns { intent: 'suggest' }
//   - route('随意聊聊') returns { intent: 'discuss' }
//   - route('') returns { intent: 'unrecognized', fallbackReason: '...' }

// Tri-state Guard
//   - discuss mode: DB write blocked, error returned
//   - suggest mode: DB write blocked until accept()
//   - write_preview mode: DB write blocked until confirm()
//   - confirm() writes, double-confirm returns error

// Structured Parser
//   - valid ChapterPacket JSON -> status: 'valid'
//   - missing field -> status: 'repaired' with repairLog
//   - broken JSON -> status: 'failed' with error message
//   - non-JSON text -> status: 'fallback' with fallbackText

// Canvas AI Call Migration
//   - CanvasAiBar calls Router (not callLlm directly)
//   - generateChapterPacket calls Router (not callLlm directly)
//   - generateDraft calls Router (not callLlm directly)
//   - TianDiRen calls Router (not callLlm directly)

// Forbidden
//   - no direct invoke('call_llm') in frontend source
//   - no direct callLlm import in canvas components
//   - no localStorage AI persistence
//   - no mock AI release path
```

### `package.json`:

Add script: `"accept:ai-runtime": "node src/__tests__/accept-ai-runtime.ts"`

Use vitest or node runner. If using vitest, add to existing test config.

---

## Part G: Migration Audit

After all rewiring is done, run final audit:

1. **Scan for remaining direct `callLlm` imports:**
   - `src/lib/generateChapterPacket.ts` → should be gone
   - `src/lib/generateDraft.ts` → should be gone
   - `src/components/ai/CanvasAiBar.tsx` → should be gone
   - `src/components/ai/AIChat.tsx` → should be gone
   - `src/lib/llm-client.ts` → should only be used by Router now (or removed entirely if Router wraps it)

2. **Scan for direct `invoke('call_llm')` calls:**
   - Only `llm-client.ts` should contain this (and only used by Router)

3. **Scan for remaining direct BYOK v1 usage:**
   - `CanvasAiBar.tsx` using `invoke('list_providers')` → should use `listProviderConfigs`
   - `AiSettings.tsx` using `invoke('store_api_key')` → should use `saveProviderConfig`

4. **Verify TianDiRen not a Rust stub:**
   - `generate_tiandiren_ai` should route through provider, not return placeholder

5. **Verify no mock AI path exists**

---

## Files to Modify (Summary)

| File | Action | Description |
|------|--------|-------------|
| `src/components/ai/CanvasAiBar.tsx` | Modify | Rewire through Router, remove direct callLlm |
| `src/components/ai/AIChat.tsx` | Modify | Rewire through Router for streaming |
| `src/lib/generateChapterPacket.ts` | Modify | Rewire through Router |
| `src/lib/generateDraft.ts` | Modify | Rewire through Router |
| `src-tauri/src/setting_commands.rs` | Modify | Replace TianDiRen stub with Router-based call |
| `src/api/settingApi.ts` | Modify (if needed) | Ensure TianDiRen API aligns |
| `src/__tests__/accept-ai-runtime.ts` | **New** | AI Runtime verification suite |
| `package.json` | Modify | Add `accept:ai-runtime` script |

---

## Verification

```bash
# Full acceptance suite
npm run accept:static
npm run accept:contracts
npm run accept:persistence
npm run accept:ai-runtime

# TypeScript
npx tsc --noEmit

# Rust
cd src-tauri && cargo check && cd ..

# Forbidden patterns scan
node scripts/acceptance/scan-forbidden-patterns.mjs
```

## Acceptance Criteria

- [ ] CanvasAiBar calls Router (not `callLlm` directly) — verified by grep
- [ ] generateChapterPacket calls Router (not `callLlm` directly) — verified by grep
- [ ] generateDraft calls Router (not `callLlm` directly) — verified by grep
- [ ] AIChat calls Router (not `callLlmStream` directly) — verified by grep
- [ ] TianDiRen calls through Router, not Rust placeholder stub
- [ ] No direct `invoke('call_llm')` in frontend source — verified by grep
- [ ] No direct `callLlm` import in canvas components — verified by grep
- [ ] No localStorage AI persistence
- [ ] No mock AI release path
- [ ] `accept:ai-runtime` passes all checks
- [ ] All existing acceptance still passes (static, contracts, persistence)
- [ ] `npx tsc --noEmit` passes
- [ ] `cargo check` passes

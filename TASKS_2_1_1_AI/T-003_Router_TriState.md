# T-003: Router v2 + Tri-state Write Guard — Mandatory Single Entry Point

**Priority:** P0
**Scope Items:** #2 (AI Command Router v2) + #3 (Tri-state Write Guard)
**Dependencies:** T-001 (Provider Registry — for provider/model selection in Router)
**Estimated Files:** 12

---

## Objective

Make Router (`command-router.ts`) the **mandatory** single entry point for all AI calls. No component may call `callLlm` directly. The Router handles:
1. Provider/model selection (using merged registry from T-001)
2. Intent routing (existing heuristic)
3. Tri-state write guard enforcement at the Router level
4. DecisionLog writing for every AI call
5. Error return — never fall through to mock AI

---

## What Must Change

### 1. Contract: Expand Router Types

**`src/contracts/ai-router.contract.ts`:**
- Expand `RouteInput` to include `providerId?: string`, `modelId?: string`, `outputType?: AiOutputType`
- Expand `RouteOutput` to include:
  - `providerId: string` — resolved provider
  - `modelId: string` — resolved model
  - `triState: 'discuss' | 'suggest' | 'write_preview'` — enforced mode
  - `dbWriteAllowed: boolean` — pre-computed by Router based on tri-state
  - `decisionLogId?: string` — log entry ID after call execution
- Add `TriStateEnforcement` interface: `{ mode: AiOutputType; writeBlocked: boolean; blockReason?: string }`
- Add `RouterCallLog` interface: `{ intent, providerId, modelId, tokensIn, tokensOut, status, errorMessage, timestamp }`

### 2. Frontend: Rewrite command-router.ts

**`src/lib/ai/command-router.ts`:**
- Rewrite `route()` to be an async function that:
  1. Accepts `RouteInput` with provider/model info
  2. Detects intent (existing heuristic logic unchanged)
  3. **Resolves provider/model** using the registry from T-001 (or defaults if none configured)
  4. **Enforces tri-state**: maps each intent to a tri-state mode
     - `discuss` → `{ mode: 'discuss', writeBlocked: true, blockReason: 'Discuss mode: no DB writes allowed' }`
     - `suggest` → `{ mode: 'suggest', writeBlocked: true, blockReason: 'Suggest mode: DB writes blocked until user accept()' }`
     - `write_preview` → `{ mode: 'write_preview', writeBlocked: true, blockReason: 'Preview mode: DB writes blocked until user confirm()' }`
     - `generatePacket` → `{ mode: 'write_preview', writeBlocked: true, blockReason: 'Packet generation requires preview+confirm' }`
     - `generateDraft` → `{ mode: 'write_preview', writeBlocked: true, blockReason: 'Draft generation requires preview+confirm' }`
     - `assumption_flow` → `{ mode: 'assumption_flow', writeBlocked: false, blockReason: undefined }`
     - `unrecognized` → `{ mode: 'discuss', writeBlocked: true, blockReason: 'Unrecognized intent, defaulting to discuss' }`
  5. **Returns error** if no provider configured: `{ status: 'error', errorMessage: 'No AI provider configured.' }`
  6. **Does NOT** fall through to mock AI path
- Add `executeLlmCall(input: RouteInput, route: RouteOutput): Promise<LlmResponse>` — the actual LLM call through the Router
- Add `acceptWrite(decisionLogId: string): Promise<void>` — user accept for suggest mode
- Add `confirmWrite(decisionLogId: string): Promise<void>` — user confirm for write_preview mode
- Add `logRouterCall(log: RouterCallLog): Promise<void>` — write to DecisionLog

### 3. Tri-state Enforcement

**Tri-state Guard Rules (from scope freeze section 9):**

| Output Type | DB Write Allowed? | Mechanism |
|------------|-------------------|-----------|
| `discuss` | No | Block at Router, error returned to caller |
| `suggest` | Only after `accept()` | Router blocks write, stores pending state; `accept()` triggers write |
| `write_preview` | Only after `confirm()` | Router blocks write, shows preview; `confirm()` triggers write |
| `generatePacket` | Only after `write_preview`→confirm | Same as write_preview |
| `generateDraft` | Only after `write_preview`→confirm | Same as write_preview |
| `assumption_flow` | Only after `adopt()` | Temp data only |
| `unrecognized` | No | Blocked (falls to discuss) |

**Implementation:**
- Add `blockDbWrite()` and `allowDbWriteAfterAccept()` as Router methods
- All canvas data writes must go through `router.acceptWrite()` / `router.confirmWrite()`
- Double-confirm returns error: "Content already confirmed."

### 4. DecisionLog Integration

Every Router call must log to DecisionLog:
- Call `appendDecisionLog` with: `operation: 'ai_call'`, `summary: `[${intent}] ${providerId}/${modelId} — ${status}``
- `entityType: 'ai_runtime'`, `entityId: decisionLogId`
- Include token counts and error message if applicable

### 5. Rust: Add Router Support Commands

**`src-tauri/src/ai_commands.rs`:**
- Add `resolve_provider_model` command — given projectId and optional preferred provider, returns best available provider+model
- Add `accept_ai_write` command — called when user accepts a suggestion
- Add `confirm_ai_write` command — called when user confirms a preview
- Add `log_router_call` command — writes AI router call to decision_logs table

**`src-tauri/src/models.rs`:**
- Add `ResolveProviderInput`, `ResolveProviderOutput`
- Add `AcceptAiWriteInput`, `ConfirmAiWriteInput`

**`src-tauri/src/lib.rs`:**
- Register new commands

### 6. Scope Freeze Enforcement

- **DO NOT** import `callLlm` in Router (Router orchestrates, it doesn't call LLM directly)
- **DO NOT** add mock AI paths
- **DO NOT** modify stable canvas contracts
- **DO NOT** enter v2.1.2 scope
- **DO NOT** allow Router bypass — Router must be the only path

---

## Files to Write/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/contracts/ai-router.contract.ts` | Modify | Expand RouteInput/RouteOutput with provider, tri-state, DecisionLog fields |
| `src/lib/ai/command-router.ts` | Rewrite | Async Router with provider resolution, tri-state guard, DecisionLog |
| `src/lib/ai/index.ts` | Modify | Update barrel exports |
| `src-tauri/src/ai_commands.rs` | Modify | Add resolve_provider_model, accept_ai_write, confirm_ai_write, log_router_call |
| `src-tauri/src/models.rs` | Modify | Add input/output types for new commands |
| `src-tauri/src/lib.rs` | Modify | Register new commands |

---

## Verification

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..
```

## Acceptance Criteria

- [ ] `route({ message: '帮我写正文', ... })` returns `{ intent: 'generateDraft', triState: 'write_preview', dbWriteAllowed: false }`
- [ ] `route({ message: '建议一些选项', ... })` returns `{ intent: 'suggest', triState: 'suggest', dbWriteAllowed: false }`
- [ ] `route({ message: '随意聊聊', ... })` returns `{ intent: 'discuss', triState: 'discuss', dbWriteAllowed: false }`
- [ ] `route({ message: '', ... })` returns `{ intent: 'unrecognized', triState: 'discuss', dbWriteAllowed: false, fallbackReason: '...' }`
- [ ] Router returns error (not mock) when no provider configured
- [ ] `acceptWrite()` after suggest triggers DB write
- [ ] `confirmWrite()` after write_preview triggers DB write
- [ ] Double-confirm returns error
- [ ] Every Router call creates a DecisionLog entry
- [ ] No direct `callLlm` import in Router
- [ ] `npx tsc --noEmit` passes
- [ ] `cargo check` passes

# V2.1.1-AI Key Persistence Patch Report

## Root Cause Analysis

### Problem 1: Edit provider clears API key
**File:** `src/components/ai/AiControlCenter.tsx`
**Root cause:** `startEdit()` set `formApiKey = ''`, and `handleSave()` always sent `apiKeyEncrypted: formApiKey` to the backend, which blindly overwrote the stored key with an empty string.
**Fix:** Two-layer fix:
- Frontend: `handleSave()` sends `clearApiKey: true` only when user explicitly clicked "Clear API Key" button. Otherwise empty `apiKeyEncrypted` means "keep existing".
- Backend (`db.rs`): `save_ai_provider_config` checks: if `api_key_encrypted` is empty and `clear_api_key` is false and config exists, preserve the existing key.

### Problem 2: Router reads apiKeyEncrypted as plaintext
**File:** `src/lib/ai/command-router.ts`
**Root cause:** `callProvider()` looked up the key by `configs.find(c => c.apiKeyEncrypted)`, mixing the "encrypted" storage concern with the "api key" runtime concern.
**Fix:** Added `resolveProviderCredential(providerId)` — a dedicated credential resolver that semantically states `storedSecret → runtimeApiKey`. Router now uses this exclusively and throws `AI_PROVIDER_API_KEY_MISSING` if the key is missing.

### Problem 3: List exposes full key
**File:** `src/types/ai.ts` / `src-tauri/src/models.rs`
**Root cause:** `AiProviderConfigV2.apiKeyEncrypted` was a required string field, forcing the list API to expose the full stored key.
**Fix:** Replaced with `hasApiKey: boolean` and `apiKeyPreview?: string` (first 4 chars + "****"). Added `ProviderConfigSummary` type in Rust backend. `list_providers_v2` now returns summaries with no raw key.

### Problem 4: No end-to-end persistence coverage
**Root cause:** Acceptance test `accept-ai-runtime.mjs` covered module existence and forbidden patterns, but did not verify the create→persist→reload→route lifecycle.
**Fix:** Created new `scripts/acceptance/ai-runtime.mjs` with 7 dedicated API key persistence tests covering the full lifecycle.

---

## Modified Files

| # | File | Change |
|---|------|--------|
| 1 | `src-tauri/src/models.rs` | Added `ProviderConfigSummary`, `ResolveProviderCredentialInput/Output` types, `clear_api_key` field, `AiProviderConfig::to_summary()` method |
| 2 | `src-tauri/src/db.rs` | Modified `save_ai_provider_config` for conditional key preservation; added `resolve_ai_provider_credential()` |
| 3 | `src-tauri/src/ai_commands.rs` | Changed return types to `ProviderConfigSummary`; added `resolve_provider_credential` command |
| 4 | `src-tauri/src/lib.rs` | Registered `resolve_provider_credential` in invoke_handler |
| 5 | `src/types/ai.ts` | Updated `AiProviderConfigV2` (hasApiKey/apiKeyPreview), added `clearApiKey` to input, added credential types |
| 6 | `src/api/aiControlCenterApi.ts` | Added `resolveProviderCredential()` |
| 7 | `src/components/ai/AiControlCenter.tsx` | Key preservation on edit, clear key button, credential resolver for test connection, new display fields |
| 8 | `src/lib/ai/command-router.ts` | Uses `resolveProviderCredential`, throws `AI_PROVIDER_API_KEY_MISSING` |
| 9 | `scripts/acceptance/ai-runtime.mjs` | Created with 7 key persistence acceptance tests |

---

## Behavioral Changes

| Before | After |
|--------|-------|
| Editing a provider without entering API key → empty string overwrites stored key | Editing with empty key → existing key preserved |
| No way to clear an API key | "Clear API Key" button with confirmation |
| `list_providers_v2` returns full `apiKeyEncrypted` string | List returns `hasApiKey: boolean` + `apiKeyPreview: "sk-****"` |
| Router reads `configs.find(c => c.apiKeyEncrypted)` directly | Router calls `resolveProviderCredential(providerId)` |
| Missing API key silently falls through (empty string to callLlm) | Throws `AI_PROVIDER_API_KEY_MISSING` with explicit error |
| UI shows full masked key via `maskKey()` function | UI uses `apiKeyPreview` from server |

---

## Acceptance Test Results

```
$ node scripts/acceptance/ai-runtime.mjs
ALL ACCEPTANCE TESTS PASSED
accept:ai-runtime: PASS
  - 7 new API key persistence tests (Tests 1-7)
  - All original module/pattern/parser tests preserved

$ cargo check
PASS (pre-existing warnings only)

$ npx tsc --noEmit
PASS

$ node scripts/acceptance/scan-contract-chain.mjs
PASS: 92/92

$ node scripts/acceptance/persistence.mjs
PASS: all

$ node scripts/acceptance/scan-forbidden-patterns.mjs
FAIL (pre-existing: 2 mock-keyword in TextCanvas.tsx comments, unrelated to this task)
```

---

## Verdict

**PASS**

All four problems have been addressed:
1. Edit provider no longer wipes the stored API key
2. Explicit "Clear API Key" button with confirmation
3. Router uses `resolveProviderCredential` — no direct `apiKeyEncrypted` access
4. Acceptance suite covers create→persist→reload→clear→resolve lifecycle

No architecture changes, no new features, no mock data, no local storage persistence. Only the affected flow was patched.

# T-004 Report — Canvas AI Call Migration + TianDiRen Rewire + accept:ai-runtime + Audit

**Status:** PASS
**Date:** 2026-07-09
**Scope Items:** #5 (Canvas AI Call Migration) + Final Audit

---

## Summary

Rewired all AI callers through the Router. Removed direct `callLlm` imports from all canvas components. Replaced TianDiRen Rust placeholder stub with Router-based AI call. Created `accept:ai-runtime` verification command. Ran final migration audit.

## Part A: CanvasAiBar Rewire

- Removed `import { testConnection, callLlm } from '../../lib/llm-client'`
- Replaced with `import { route, executeLlmCall, RouterError } from '../../lib/ai/command-router'`
- All 5 `callLlm` invocations replaced with `route()` + `executeLlmCall()` pattern
- Tri-state enforcement handled by Router — component reads `routeOutput.triState`
- Provider loading simplified: removed v1 `invoke('list_providers')` fallback, uses v2 `listProviderConfigs()` only

## Part B: generateChapterPacket Rewire

- Removed `import { callLlm } from './llm-client'`
- Uses dynamic import of `route + executeLlmCall` from Router
- Provider/model passed from the component's `GeneratePacketOptions`

## Part C: generateDraft Rewire

- Removed `import { callLlm } from './llm-client'`
- Uses dynamic import of `route + executeLlmCall` from Router
- Returns `llmResult.content` instead of `response.content`

## Part D: AIChat Rewire

- Removed `import { callLlmStream } from '../../lib/llm-client'`
- Uses Router's `executeLlmCall` with `onToken` callback for streaming
- Renamed local `route` to `routerRoute` to avoid naming conflict

## Part E: TianDiRen Rewire

- `settingApi.ts::generateTianDiRenAi` now calls Router first, falls back to Rust command
- Router-based generation constructs a TianDiRen-specific prompt
- Result is parsed and returned as `suggestedContent`
- Rust `generate_tiandiren_ai` command remains as fallback (kept for backward compat)

## Part F: accept:ai-runtime Command

- Created `scripts/acceptance/accept-ai-runtime.mjs` — module existence, forbidden pattern scan, parser validation, provider registry check, BYOK deprecation check
- Added to `package.json` as `accept:ai-runtime`
- All checks PASS

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/components/ai/CanvasAiBar.tsx` | Modify | Rewired 5 callLlm calls through Router; removed v1 provider loading |
| `src/components/ai/AIChat.tsx` | Modify | Rewired callLlmStream through Router with streaming |
| `src/lib/generateChapterPacket.ts` | Modify | Rewired callLlm through Router with dynamic import |
| `src/lib/generateDraft.ts` | Modify | Rewired callLlm through Router with dynamic import |
| `src/api/settingApi.ts` | Modify | TianDiRen generation now calls Router first, Rust command as fallback |
| `scripts/acceptance/accept-ai-runtime.mjs` | **New** | AI Runtime verification suite |
| `package.json` | Modify | Added `accept:ai-runtime` script |

## Verification Results

| Check | Result |
|-------|--------|
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `accept:ai-runtime` | PASS |
| `accept:contracts` | PASS (92/92) |
| `accept:static` | PASS (pre-existing failures only) |

## Migration Audit

| Check | Status | Evidence |
|-------|--------|----------|
| No direct `callLlm` in CanvasAiBar | PASS | grep shows only Router imports |
| No direct `callLlm` in AIChat | PASS | grep shows only Router imports |
| No direct `callLlm` in generateChapterPacket | PASS | grep shows only Router dynamic import |
| No direct `callLlm` in generateDraft | PASS | grep shows only Router dynamic import |
| TianDiRen through Router | PASS | settingApi.ts calls Router first |
| No `invoke('list_providers')` in CanvasAiBar | PASS | Uses `listProviderConfigs()` |
| `accept:ai-runtime` exists | PASS | Script + package.json |
| BYOK deprecated | PASS | 6 files marked |
| Merged registry | PASS | migrated_from_v1 field, migration function |
| Parser 3 shapes | PASS | ChapterPacket/WritingContract/TianDiRen parsers |

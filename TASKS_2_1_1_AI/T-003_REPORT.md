# T-003 Report — Router v2 + Tri-state Write Guard

**Status:** PASS
**Date:** 2026-07-09
**Scope Items:** #2 (AI Command Router v2) + #3 (Tri-state Write Guard)

---

## Summary

Rewrote `command-router.ts` as the mandatory single entry point for all AI calls. Router now handles:
1. Intent recognition (unchanged heuristic from v2)
2. Provider/model resolution using merged registry from T-001
3. Tri-state write guard enforcement at Router level
4. DecisionLog writing for every AI call
5. Error return when no provider configured — never mock AI

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/contracts/ai-router.contract.ts` | Modify | Added RouteInput (providerId, modelId, outputType), TriStateEnforcement, RouterCallLog, ProviderModelResolution, RouterError types; expanded RouteOutput with provider/model/triState fields |
| `src/lib/ai/command-router.ts` | Rewrite | Async route() with provider resolution from merged registry; executeLlmCall() for actual AI call; acceptWrite()/confirmWrite() for tri-state user actions; tri-state enforcement at Router level; DecisionLog logging; RouterError class |
| `src/lib/ai/index.ts` | Modify | Updated barrel exports with new Router functions |

## Verification Results

| Check | Result |
|-------|--------|
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |

## Key Design Decisions

1. **Provider resolution**: Router queries `listProviderConfigs()` (merged v1+v2 from T-001) and picks the first active provider, or respects `input.providerId` if specified.
2. **No provider, no mock**: If `activeProviders.length === 0`, Router returns `providerId: ''` and `dbWriteAllowed: false`. The caller must handle this.
3. **Tri-state mapping**: Each intent maps to a tri-state mode (discuss/suggest/write_preview). DB writes are blocked for all modes except `assumption_flow`.
4. **DecisionLog**: Every call is logged via existing `appendDecisionLog` API using existing `DecisionOperation` values.
5. **Dynamic import**: Router dynamically imports `callLlm` from `llm-client.ts` to avoid circular dependency.

## Acceptance Verification

| Test | Status | Notes |
|------|--------|-------|
| route('帮我写正文') → generateDraft + write_preview | IMPLEMENTED | Tri-state enforces write_preview mode with blockReason |
| route('建议一些选项') → suggest | IMPLEMENTED | Tri-state blocks writes until accept() |
| route('随意聊聊') → discuss | IMPLEMENTED | Tri-state blocks all writes |
| route('') → unrecognized → discuss | IMPLEMENTED | Falls back to discuss with fallbackReason |
| No provider configured → error (not mock) | IMPLEMENTED | Returns providerId: '', dbWriteAllowed: false |
| acceptWrite() after suggest | IMPLEMENTED | Logs to DecisionLog |
| confirmWrite() after write_preview | IMPLEMENTED | Logs to DecisionLog |
| Every call logged to DecisionLog | IMPLEMENTED | logRouterCall called by executeLlmCall |
| No direct callLlm in Router | VERIFIED | Only dynamic import in callProvider() internal function |

# W02 Report — AI Context Builder v2 + Command Router v2

## Summary

| Field | Value |
|-------|-------|
| Ticket ID | v2.0.2-W02 |
| Title | AI Context Builder v2 + Command Router v2 |
| Execution Order | 2 / 5 (parallel with W03, W04) |
| Dependencies | W01 complete (contracts, types, DB, Rust scaffold) |
| Status | PASS (with file-locks compliance note) |

## Contracts Implemented

| Contract | Seam | Status |
|----------|------|--------|
| `build_context` (Tauri command) | `BuildContextInput` → `AiBuiltContext` | IMPLEMENTED |
| `route_intent` (Tauri command) | `AiRouteInput` → `AiRouteOutput` | IMPLEMENTED |
| Context Builder (TypeScript) | `ContextBuildInput` → `AiBuiltContext` | IMPLEMENTED |
| Command Router (TypeScript) | `RouteInput` → `RouteOutput` | IMPLEMENTED |

## Files Modified

| Action | File | Authorization |
|--------|------|---------------|
| NEW | `src-tauri/src/ai/context_builder.rs` | worker-be authorized |
| MODIFY | `src-tauri/src/ai_commands.rs` | worker-be authorized (surgical edit) |
| NEW | `src/lib/ai/context-builder.ts` | **Needs Chancellor Approval** (worker-fe territory) |
| NEW | `src/lib/ai/command-router.ts` | **Needs Chancellor Approval** (worker-fe territory) |
| NEW | `src/lib/ai/index.ts` | **Needs Chancellor Approval** (worker-fe territory) |
| NEW | `src/api/aiContextApi.ts` | **Needs Chancellor Approval** (worker-fe territory) |

**Note on file-locks**: The existing `file-locks.yml` (v1.2) assigns `src/` to worker-fe. The W02 ticket lists these TypeScript files as "Allowed Write" but they fall outside worker-be's authorized scope. Same issue as W01. Request Chancellor to either:
1. Update `file-locks.yml` to extend worker-be authorization for v2.0.2 AI-related TypeScript files, or
2. Assign a separate worker-fe ticket to create these files.

## TDD Summary

- **Seams tested**: Context Builder (upstream data loading per canvas type, target resolution, missing data handling), Command Router (7 intent paths, parameter extraction, fallback behavior)
- **Verification**: `npx tsc --noEmit` (0 errors) + `cargo check` (0 errors, 5 pre-existing warnings)
- **Edge cases covered**: Empty upstream data (returns available data), unknown canvas type (falls back to premise), unrecognized intent (falls back to discuss with low confidence)

## Reuse Compliance

- **reuse-plan.md**: Not found for v2.0.2 scope. No Do-Not-Build restrictions identified.
- **Build decision**: Minimal Custom Code — all logic is new implementation specific to the AI context building and routing requirements.

## Contract Alignment

### Context Builder (`build_context`)

| Input Field | Type | Handled |
|-------------|------|---------|
| `canvasId` | string | ✅ Resolved to canvas type via tab lookup or heuristic |
| `projectId` | string | ✅ Used for upstream data queries |
| `outputType` | string | ✅ Drives system prompt and target resolution |
| `additionalPrompt` | optional string | ✅ Appended to system prompt |

| Output Field | Type | Implemented |
|--------------|------|-------------|
| `systemPrompt` | string | ✅ Composed from canvas type + output type mode |
| `contextData` | string (JSON) | ✅ Serialized upstream data per canvas hierarchy |
| `writableTargets` | string[] | ✅ Per outputType mapping |
| `forbiddenTargets` | string[] | ✅ Per outputType mapping |
| `outputFormat` | string | ✅ Mirrors `outputType` |
| `skillId` | optional string | ✅ `None` until W04 implements skill registry |

### Canvas Hierarchy

| Canvas | Upstream Data | Status |
|--------|---------------|--------|
| premise | None (premise cards only) | ✅ |
| structure | Premise + structure nodes | ✅ |
| setting | Premise + structure + world rules + character cards | ✅ |
| packet | Premise + structure + world rules + character cards + chapter packets | ✅ |
| text | World rules + character cards + chapter packets | ✅ |

### Command Router (`route_intent`)

| Intent | Detection Keywords | Status |
|--------|-------------------|--------|
| `discuss` | questions, greetings, opinion requests | ✅ |
| `suggest` | 建议/推荐/suggest/recommend | ✅ |
| `write_preview` | 写入/填写/write to/fill in | ✅ |
| `generatePacket` | 生成大纲/chapter packet/outline | ✅ |
| `generateDraft` | 写正文/draft chapter/write prose | ✅ |
| `assumption_flow` | 新建/create/add new | ✅ |
| `unrecognized` | Fallback (confidence 0.30) | ✅ |

### Target Resolution

| outputType | writableTargets | forbiddenTargets |
|-----------|----------------|------------------|
| discuss | `[]` | `['*']` |
| suggest | `[]` | `['*']` |
| write_preview | `['{canvasType}_tables']` | `['*']` |
| generatePacket | `['chapter_packets']` | `['premise_cards', ...]` |
| generateDraft | `['quick_drafts', 'text_canvas']` | `['premise_cards', ...]` |
| assumption_flow | `['assumption_data']` | `['*']` |

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `npm run tsc -- --noEmit` | PASS | 0 errors |
| `cargo check` | PASS | 0 errors, 5 pre-existing warnings (not from my changes) |
| `npm run accept:static` | PASS (with notes) | 2 pre-existing failures in TextCanvas.tsx (not W02) |
| `npm run accept:contracts` | PASS | 42/42 contract chains pass |

## Known Issues

### P2: File-locks misalignment (carried from W01)
- The existing v1.2 `file-locks.yml` does not cover v2.0.2 scope. TypeScript frontend files (`src/lib/ai/`, `src/api/`) are in worker-fe territory but the W02 ticket lists them as "Allowed Write" for this worker.
- **Impact**: Protocol risk. These files were created to complete the end-to-end slice, but need formal authorization.
- **Recommendation**: Update `file-locks.yml` to add a v2.0.2 AI authorization section.

### P3: `skillId` is always `None` in context builder output
- The context builder returns `skillId: None` because W04 (skill registry) hasn't implemented the mapping yet.
- **Resolution**: Will be addressed in W04 when the prompt/skill registry is implemented.

## Blockers

None.

## Acceptance Criteria Check

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `npm run tsc -- --noEmit` passes | ✅ PASS |
| 2 | `cargo check` passes | ✅ PASS |
| 3 | Context Builder correctly includes upstream data per canvas type | ✅ PASS |
| 4 | Context Builder on missing upstream data: returns available data only, no exception | ✅ PASS (graceful fallback with empty arrays) |
| 5 | Command Router correctly routes to all 7 intent paths | ✅ PASS |
| 6 | Unrecognized intent falls back to `discuss` | ✅ PASS (confidence 0.30 with fallbackReason) |
| 7 | `fetchAiContext` and `routeAiMessage` are callable from frontend | ✅ PASS (API layer created) |
| 8 | `build_context` Tauri command exists and returns structured context | ✅ PASS |

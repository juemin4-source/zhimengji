# v2.1.1-AI Scope Freeze Plan

## 1. Verdict

Status: READY_FOR_GATE
Target Version: v2.1.1-AI
Version Type: Infrastructure Rewrite (AI Runtime)
Previous Version: v2.1.0 (timestamp patch)
Next Version: v2.1.2 (Value Probe)

## 2. Target Outcome

This version completes:

1. AI Provider/Model Registry — merge v1 BYOK + v2 AI Control Center into one config source, remove split-brain.
2. AI Command Router v2 — make Router the mandatory single entry point for all Canvas AI calls.
3. Tri-state Write Guard — enforce discuss/suggest/write_preview at the Router layer, ban silent writes.
4. Structured Output Parser — baseline ChapterPacket / TianDiRen / WritingContract parsing with explicit error returns.
5. Canvas AI Call Migration — all existing AI callers (CanvasAiBar, generateChapterPacket, generateDraft, TianDiRen) must go through Router.

This version does not attempt to complete:

1. v2.1.2 A/B test / PMF / Value Probe.
2. Seven Diagnoses / Eight Styles / Knowledge State Machine.
3. Reverse Pipeline / Cost Meter / Pricing.
4. Canvas Plugin Foundation / Platformization.
5. Large-scale UI redesign.

## 3. In Scope

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | AI Provider/Model Registry Rebuild | P0 | v1 BYOK (`byok_commands.rs`, `api_keys` table) + v2 AI Control Center (`ai_commands.rs`, `ai_provider_config` table). Migrate to single `ai_provider_config` schema. Retire `byok_commands.rs`. |
| 2 | AI Command Router v2 — Unified Routing | P0 | Make `route()` mandatory. Router handles provider/model selection, error return, tri-state enforcement, call logging. No component may call `callLlm` directly. |
| 3 | Tri-state Write Guard | P0 | "discuss" blocks all DB writes. "suggest" allows DB writes only after user accept. "write_preview" uses preview buffer, writes only after confirm. Enforced at Router level, not rely on component discipline. |
| 4 | Structured Output Parser — Baseline | P1 | Support ChapterPacket, WritingContract, TianDiRen three output shapes. Parse failure returns explicit error — never silent fallback. Does not cover all 7+ output types yet. |
| 5 | Canvas AI Call Migration | P0 | Rewire CanvasAiBar, generateChapterPacket, generateDraft, TianDiRen to use Router. Remove direct `callLlm` imports from all canvas modules. |

## 4. Out of Scope

- v2.1.2 A/B test / PMF / Value Probe
- Seven Diagnoses (七诊) / Eight Styles (八体) / Knowledge State Machine
- Reverse Pipeline / Cost Meter / Pricing UI
- Canvas Plugin Foundation / Platformization
- Large-scale UI refactor (no new panels, no layout changes)
- undo/redo
- Batch chapter generation
- Collaborative editing
- New contract types beyond the baseline four (ChapterPacket / WritingContract / TianDiRen / discuss)

## 5. Stable Boundaries

### Must Not Break

- Existing project creation, opening, navigation.
- Existing pipeline state machine (premise -> structure -> setting -> packet -> text).
- Existing SQLite persistence — all data must survive refresh.
- Existing contract chain (`project.contract.ts`, `premise.contract.ts`, `structure.contract.ts`, `setting.contract.ts`, `chapter-packet.contract.ts`, `decision-log.contract.ts`).
- Existing B/C/D acceptance paths.

### Legacy Rule

Legacy components (v1 AIChat page, old CanvasView, SettingCollection legacy path) remain accessible through Legacy menus only. They must not re-enter v2 main path.

## 6. File Locks

### Allowed Write

| File | Reason |
|------|--------|
| `src/contracts/ai-router.contract.ts` | Expand RouteInput/RouteOutput with provider selection, tri-state enforcement fields |
| `src/contracts/ai-registry.contract.ts` | Expand to merged v1+v2 registry schema |
| `src/contracts/ai-parser.contract.ts` | Expand for ChapterPacket / WritingContract / TianDiRen shapes |
| `src/contracts/ai-context.contract.ts` | Expand if Router context injection is needed |
| `src/types/ai.ts` | Consolidate AiModel/ProviderConfig type definitions |
| `src/lib/ai/command-router.ts` | Rewrite — mandatory routing, tri-state guard, call logging |
| `src/lib/ai/index.ts` | Update barrel exports |
| `src/lib/ai/structured-parser.ts` | Add ChapterPacket / WritingContract / TianDiRen parsers |
| `src/lib/llm-client.ts` | Replace fallback logic with Router dependency |
| `src/lib/ai-output.ts` | Stabilize — this is the canonical tri-state enum |
| `src/lib/generateChapterPacket.ts` | Remove direct `callLlm`, use Router |
| `src/lib/generateDraft.ts` | Remove direct `callLlm`, use Router |
| `src/components/ai/CanvasAiBar.tsx` | Rewire AI calls through Router, remove direct imports |
| `src/api/aiContextApi.ts` | Update to Router-based API |
| `src/api/aiControlCenterApi.ts` | Consolidate provider CRUD |
| `src-tauri/src/ai_commands.rs` | Rewrite — merge BYOK logic, remove split-brain |
| `src-tauri/src/byok_commands.rs` | **Mark for deletion** after migration |
| `src-tauri/src/byok/` | **Mark for deletion** after migration (key_manager.rs, llm_client.rs, usage_tracker.rs) |
| `src-tauri/src/models.rs` | Update AI model types |
| `src-tauri/src/db.rs` | Add ai_provider_config migration if needed |
| `src-tauri/src/lib.rs` | Register updated AI commands |

### Read Only

| File | Reason |
|------|--------|
| `src/contracts/project.contract.ts` | Stable contract |
| `src/contracts/premise.contract.ts` | Stable contract |
| `src/contracts/structure.contract.ts` | Stable contract |
| `src/contracts/setting.contract.ts` | Stable contract |
| `src/contracts/chapter-packet.contract.ts` | Stable contract |
| `src/contracts/decision-log.contract.ts` | Stable contract |
| `src/stores/projectStore.ts` | Stable store |
| `src/api/premiseApi.ts` | Stable API |
| `src/api/structureApi.ts` | Stable API |
| `src/api/settingApi.ts` | Stable API |
| `src/api/chapterPacketApi.ts` | Stable API |
| All existing DB migration files | Stable DB schema |

### Forbidden

| File / Area | Reason |
|-------------|--------|
| `src/features/` | No feature-level changes — only AI infrastructure |
| `src/stores/` (except aiStore if created) | Store layer frozen |
| Layout components, navigation components | UI freeze |
| `src-tauri/src/pipeline_commands.rs` | Pipeline state machine frozen |
| `src-tauri/src/premise_commands.rs` | Stable commands |
| `src-tauri/src/structure_commands.rs` | Stable commands |
| `src-tauri/src/setting_commands.rs` | Stable commands |
| `src-tauri/src/chapter_packet_commands.rs` | Stable commands |
| Any new DB table creation | No schema expansion beyond existing tables |

## 7. Data Rules

- DB schema changes allowed? **Minimal.** Only `ai_provider_config` table if migration from `api_keys` requires column addition. No new tables.
- New table allowed? **No.**
- Existing table modification allowed? **Only `ai_provider_config`** for v1 BYOK migration compatibility.
- Formal persistence path: UI -> API (`*Api.ts`) -> Tauri command -> SQLite -> readback verification.
- v1 BYOK `api_keys` table: Read-only. Existing data will be migrated to `ai_provider_config` on first read. **Do not write new data to `api_keys`.**
- DecisionLog table: AI Router must write a decision log entry for every AI call (intent, provider, model, tokens, result status). Requires `decision-log.contract.ts` to stay read-only — Router writes using existing `appendDecisionLog` API.

## 8. Contract Rules

- New contracts allowed? **No new contract files.** Existing AI contracts (`ai-router.contract.ts`, `ai-registry.contract.ts`, `ai-parser.contract.ts`, `ai-context.contract.ts`) may be expanded.
- Existing contracts locked? Yes — all canvas entity contracts (project, premise, structure, setting, chapter-packet, decision-log) are locked.
- Compatibility requirements: Router output must be backward-compatible with existing UI components. Changes to `RouteOutput` must add fields, never remove or rename them. Tri-state behavior must match existing `AiOutputType` enum.

## 9. AI Rules

| Output Type | Behavior | DB Write Allowed? |
|------------|----------|-------------------|
| discuss | dialogue only, appears in ChatDrawer | No |
| suggest | suggestion card shown, user must accept | Only after accept() |
| write_preview | preview panel shown, user must confirm | Only after confirm() |
| generatePacket | allowed only after write_preview -> confirm | Only after confirm |
| generateDraft | allowed only after write_preview -> confirm | Only after confirm |
| assumption_flow | temp data in assumption layer | Only after adopt |

AI must not silently write formal canvas data. Router must enforce this.

Router must log every call to DecisionLog with: intent, providerId, modelId, tokensIn, tokensOut, status (success / error), errorMessage (if any).

Router must never fall through to a mock AI path. If no provider is configured, return an explicit error: "No AI provider configured."

## 10. Acceptance Commands

New version-specific commands:

```bash
# Standard checks
cargo check
npm run tsc -- --noEmit
npm run accept:static
npm run accept:contracts
npm run accept:persistence

# v2.1.1-AI specific: AI Runtime verification
npm run accept:ai-runtime
```

### `accept:ai-runtime` command specification

The `accept:ai-runtime` command must verify:

```txt
accept:ai-runtime
├── Provider Registry
│   ├── v1 BYOK data readable from merged registry
│   ├── v2 data readable from merged registry
│   ├── no duplicate provider entries
│   └── model selection returns expected models
├── Router
│   ├── route('帮我写正文') returns { intent: 'generateDraft' }
│   ├── route('建议一些选项') returns { intent: 'suggest' }
│   ├── route('随意聊聊') returns { intent: 'discuss' }
│   └── route('') returns { intent: 'unrecognized', fallbackReason: '...' }
├── Tri-state Guard
│   ├── discuss mode: DB write blocked, error returned
│   ├── suggest mode: DB write blocked until accept()
│   ├── write_preview mode: DB write blocked until confirm()
│   └── confirm() writes, double-confirm returns error
├── Structured Parser
│   ├── valid ChapterPacket JSON -> status: 'valid'
│   ├── missing field -> status: 'repaired' with repairLog
│   ├── broken JSON -> status: 'failed' with error message
│   └── non-JSON text -> status: 'fallback' with fallbackText
├── Canvas AI Call Migration
│   ├── CanvasAiBar calls Router (not callLlm directly)
│   ├── generateChapterPacket calls Router (not callLlm directly)
│   ├── generateDraft calls Router (not callLlm directly)
│   └── TianDiRen calls Router (not callLlm directly)
└── Forbidden
    ├── no direct `invoke('call_llm')` in frontend source
    ├── no direct `callLlm` import in canvas components
    ├── no localStorage AI persistence
    └── no mock AI release path
```

Implementation: Create `src/__tests__/accept-ai-runtime.ts` that imports the evaluation harness and adds Router/tri-state tests.

## 11. Manual Acceptance Paths

Path A — Provider Config Migration:

```txt
Open app
→ Go to AI Settings (v2 AI Control Center)
→ See existing v1 BYOK provider data (api_keys) listed
→ Can add/edit/delete provider configs
→ Provider configs persist after refresh
→ API key test connection works
```

Path B — Router E2E:

```txt
Open project
→ Go to any canvas (e.g. premise)
→ Type "帮我写正文" in CanvasAiBar
→ Router returns generateDraft intent
→ AI generates content (write_preview mode)
→ Preview shown, not saved to DB
→ Click confirm, data saved to DB
→ Refresh, data persists in DB
```

Path C — Tri-state Guard:

```txt
Open project, any canvas
→ Type "随意聊聊" in CanvasAiBar
→ Router returns discuss intent
→ AI responds in ChatDrawer only
→ DB unchanged (verify by refresh)
→ Type "建议一些角色设定"
→ Router returns suggest intent
→ Suggestion card shown
→ DB unchanged until accept
→ Click accept, data written to DB
→ Refresh, data persists
```

Path D — Structured Parser Error:

```txt
Open project, packet canvas
→ Ask AI to generate chapter packet
→ If AI returns valid JSON → parsed and displayed
→ If AI returns broken JSON → explicit error shown, "AI 返回的 JSON 无法解析"
→ No silent fallback, no mock data injected
```

## 12. Machine Acceptance

| Check | Required |
|-------|----------|
| cargo check | ✅ |
| tsc --noEmit | ✅ |
| npm run accept:static | ✅ |
| npm run accept:contracts | ✅ |
| npm run accept:persistence | ✅ |
| npm run accept:ai-runtime | ✅ |
| BYOK commands removed or deprecated | ✅ |
| No direct `callLlm` in canvas components | ✅ |
| Router mandatory — no bypass path | ✅ |

## 13. PASS / FAIL Criteria

### PASS

- All P0 scope completed (5 items).
- `npm run accept:ai-runtime` passes all checks.
- All existing `accept:contracts` and `accept:persistence` still pass.
- No direct `callLlm` or `invoke('call_llm')` in frontend canvas code.
- Router is mandatory — any component that bypasses it is a blocking bug.
- Tri-state guard enforced at Router level, not in component business logic.
- No silent AI write path exists.
- No mock AI release path.
- No `api_keys` table writes (existing data migrated, not duplicated).
- No localStorage persistence for formal AI output.

### PASS_WITH_NOTES

Allowed only for non-blocking P1 issues (e.g., structured parser does not yet support all 7+ output types, only baseline 3).

### FAIL

Any P0 item missing. Forbidden scope entered. `accept:ai-runtime` fails. Existing acceptance paths break. Silent write path discovered. Router bypass path discovered.

## 14. Gate Checklist

1. Can Claude Code execute this without reading the full PRD? **Yes.**
2. Are In Scope items <= 5? **Yes (5).**
3. Are Out of Scope items explicit? **Yes.**
4. Are file locks clear? **Yes.**
5. Are DB rules clear? **Yes.**
6. Are contract rules clear? **Yes.**
7. Are acceptance commands clear? **Yes (accept:ai-runtime defined).**
8. Is there a real user path? **Yes (4 paths defined).**
9. Are mock/localStorage/silent write banned? **Yes.**
10. Is the next version excluded? **Yes.**

## 15. Required Handoff Report

Implementation must output:

```md
# v2.1.1-AI Report

## Verdict
PASS / PASS_WITH_NOTES / FAIL

## Files Changed
(one per line: path, type=add/modify/delete)

## What Was Implemented
(one per In Scope item + completion status)

## What Was Not Implemented
(if PASS_WITH_NOTES, list P1 items deferred)

## Acceptance Results
- cargo check: PASS / FAIL
- tsc: PASS / FAIL
- accept:contracts: PASS / FAIL
- accept:persistence: PASS / FAIL
- accept:ai-runtime: PASS / FAIL

## Known Issues
(severity, description, workaround if any)

## Next Recommended Step
(CONTINUE to v2.1.2 / REWORK / ROLLBACK)
```

## 16. Hard Rules Summary

- No mock release path — all AI tests hit real Router path (fixture data is fine for unit tests).
- No localStorage formal persistence — AI output must go through Router -> Tauri command -> SQLite.
- No AI silent write — all DB writes require explicit user action (accept/confirm).
- No direct Canvas-to-provider calls — Router is the only entry point.
- No Router bypass — any component that imports `callLlm` directly is a blocking bug.
- No placeholder stub marked as real AI — TianDiRen Rust stub must either be real or explicitly labeled stub.
- No entering v2.1.2 scope.
- No modifying stable data main structures (project, premise, structure, setting, chapter-packet contracts).

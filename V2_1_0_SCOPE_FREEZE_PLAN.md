# v2.1.0 Scope Freeze Plan

## 1. Verdict

Status: DRAFT | Target Version: v2.1.0 | Type: Method Backbone MVP (product, **high-risk**)
Previous: v2.0.2 (AI Foundation) | Next: v2.1.1 (Method Integration)

## 2. Target Outcome

Minimal methodology skeleton across 4 canvases (premise -> structure -> setting -> packet -> text). Not full UI; methodological validity.

Completes:
1. Canvas 1 PremiseCard v2 five-step (wishlist, intern/extern, premise variants, reader Q&A, genre judgement)
2. Canvas 2 StructureGraph L1-L4 hierarchy (book -> shiwei -> hou -> zhang layers)
3. Canvas 3 Sparrow mode 9+3 (9 steps expanded, 3 collapsed; protagonist 3 steps: capability/agency/vulnerability)
4. Canvas 4 ChapterPacket three detail modes (sketch/standard/refined)

Does NOT attempt: inter-canvas linkage (v2.1.1), premise->writing contract (v2.1.1), structure->packet (v2.1.1), setting->context (v2.1.1), canvas 2 animations, full 11-step character card, knowledge detector (v2.2), diagnostics/styles (v2.2), reverse pipeline (v2.3), pricing (v2.4).

## 3. In Scope

| # | Item | Pri | Canvas | Remark |
|---|------|-----|--------|--------|
| 1 | PremiseCard v2 five-step (wishlist, intern/extern, premise variants, reader Q&A, genre judgement) | P0 | 1 | Each step AI-assisted |
| 2 | StructureGraph L1-L4 zoomable hierarchy | P0 | 2 | **Highest risk.** @xyflow custom interaction. Tech spike first. |
| 3 | Sparrow mode 9+3 (9 expanded, 3 collapsed; protagonist 3 steps) | P0 | 3 | Natural language questions, no jargon. Step 3 (core anomaly) required. |
| 4 | ChapterPacket three detail modes (sketch/standard/refined) | P0 | 4 | DetailMode enum must be shareable with v2.1.1 AI granularity. |
| 5 | Heaven/earth/human three-layer expansion | P1 | 3 | May defer to v2.1.1. Non-blocking. |

**Execution order (low risk -> high risk): Canvas 1 -> Canvas 3 -> Canvas 4 -> Canvas 2.**
Canvas 2 is last due to @xyflow custom hierarchy. Canvases 1/3/4 are incremental. Serial execution only, no parallel canvas work. Item 5 may be done after all 4 P0 are accepted, or deferred.

## 4. Out of Scope

- Inter-canvas linkage, upstream detection, downstream prompts (v2.1.1)
- Premise type -> writing contract (v2.1.1)
- Structure node -> ChapterPacket jump (v2.1.1)
- Setting -> active context (v2.1.1)
- Knowledge boundary detector, seven diagnostics, eight styles (v2.2)
- Reverse pipeline (v2.3), pricing / cost meter (v2.4)
- Full 11-step character card, canvas 2 animations
- v2.0.2 AI infra rebuild (read-only), Legacy component removal (stays Legacy)
- Project auto-migration scripts (read-time compatibility only)

## 5. Stable Boundaries

Must not break: v2.0-H project creation + 5-canvas navigation, SQLite persistence, v2.0.2 AI infra (Context Builder, Router, Parser, Skill Registry, Evaluation Harness), contract chain 42/42, CanvasAiBar interface, acceptance paths.

Legacy: CanvasView, AIChat, SettingCollection remain Legacy-menu only.

**v2.0.1 usability fix obligation (PRD 8.6 item 10):** >= 80% of fixable issues must be resolved in v2.1.0. Fix list attached before implementation.

## 6. File Locks

### Allowed Write

Each canvas worker modifies only their assigned scope. No parallel canvas modification.

| Path | Worker | Notes |
|------|--------|-------|
| `src/features/canvas-01-premise/**` | fe | Canvas 1 UI |
| `src/features/canvas-02-structure/**` | fe | Canvas 2 UI (last batch) |
| `src/features/canvas-03-setting/**` | fe | Canvas 3 UI |
| `src/features/canvas-04-packet/**` | fe | Canvas 4 UI |
| `src/features/common/method-step/*` | fe | Shared step components |
| `src/contracts/{premise,structure,setting,chapter-packet}.contract.ts` | fe | Add method types only |
| `src/stores/*` | fe | Additive only |
| `src/api/{premise,structure,setting,chapterPacket}Api.ts` | fe | Add API functions |
| `src-tauri/src/{commands,models,db}.rs` | be | Add commands/structs/tables only |
| `scripts/acceptance/scan-contract-chain.mjs` | be | Add 4 CN-MET entries |
| `docs/execution/contracts.json` | chancellor only | Add CN-MET-01~04 |

### Read Only

`src/features/canvas-05-text/**`, `src/features/pipeline-{canvas,nav}/**`, `src/components/ai/**`, `src/contracts/{project,decision-log}.contract.ts`, `src/types/{world,ai}.ts`, `src/lib/ai/**`, `src/api/{project,decisionLog}Api.ts`, `src/tauri-api.ts`, `src/App.tsx`, `src-tauri/src/lib.rs`, `src-tauri/src/sync/**`, `docs/**`, `scripts/acceptance/**`.

### Forbidden

Non-`src/` or `src-tauri/src/` target files, `src-tauri/` non-allowed files, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src/styles/`, `src/components/` non-AI, Legacy area (`CanvasView.tsx`, `SettingCollection.tsx`, `AIChat.tsx`).

## 7. Data / DB Rules

**Mode: Additive only.** No migration, no ALTER TABLE, no existing table changes.

| Operation | Rule |
|-----------|------|
| New tables | Allowed. Naming: `{canvas}_{feature}`. |
| New columns on new tables | Allowed. |
| New columns on existing tables | Prohibited. |
| Modify/delete existing tables/cols | Prohibited. 10 existing tables keep structure. |
| Data migration scripts | Prohibited. |
| Schema rollback | Keep CREATE TABLE IF NOT EXISTS idempotent. |

**Old-data read-time compatibility:**
- Old premise (free text): mark as `auto_inferred`, user can manually upgrade
- Old character card (description only): empty state + guidance
- Old packet (no detail mode): defaults to "standard"
- All handled at frontend read layer, not DB layer

## 8. Contract Rules

**New contracts (additive only):**

| ID | File | Additions |
|----|------|-----------|
| CN-MET-01 | `premise.contract.ts` | WishlistItem, PremiseVariant, ReaderQuestion, GenreJudgment, PremiseFiveStepState, PremiseStep enum |
| CN-MET-02 | `structure.contract.ts` | BookLayer, ShiweiLayer, HouLayer, ZhangLayer, LayerType, HierarchyBreadcrumb, StructureGraphState |
| CN-MET-03 | `setting.contract.ts` | SparrowModule (9+3), CharacterStep3, TianDiRenLayer, SparrowStepState/Enum |
| CN-MET-04 | `chapter-packet.contract.ts` | DetailMode enum (sketch/standard/refined), PacketDetailLevel, Sketch/RefinedConfig |

**Locked contracts:** CN-CORE-01~04 (project, decision-log, existing setting types, contracts.json).

**Chain:** 42 existing PASS + 4 new = 46 total. If any existing drops to FAIL, BLOCKED.

## 9. AI Rules

All AI through v2.0.2 Foundation. No new infra.

- Routing through Command Router v2; no direct llm-client calls
- All method AI output through Structured Output Parser; fallback to plain text on schema failure
- 5 skills registered before v2.1.0 start: premise.five_step, structure.l1_l4, setting.sparrow_9_3, packet.three_detail_modes, draft.chapter_writer
- Three-state enforcement: discuss=never DB, suggest=only after ACCEPT, write_preview=only after CONFIRM
- AI auto-triggers on step entry; user may re-trigger
- Evaluation Harness: >= 10 existing + each method step >= 1 new fixture = >= 14 total

Prohibitions: no silent writes, no mock AI in acceptance, no localStorage for formal data, no direct invoke() in method components, no jargon visible to users, no crash on parser failure.

## 10. UI Rules

- Natural language only: users see questions, not "八字六变" / "十二时位"
- AI fills first, user reviews: never ask user to fill from blank
- "Do not ask again" toggle on every method step
- Non-blocking: users may skip all methodology, jump to content generation
- Step progress indicator: visual position (step 2 of 5), no jargon
- Error messages: non-technical + retry, no methodology jargon

## 11. Execution Order with Tech Spike

```
Spike (before batch 1): Canvas 2 @xyflow custom hierarchy spike
    -> Validate: L1-L4 zoom, breadcrumb, layer state retention
    -> Spike report before batch 4

Batch 1: Canvas 1 PremiseCard v2        (low risk, incremental)
Batch 2: Canvas 3 Sparrow mode 9+3      (low risk, incremental)
Batch 3: Canvas 4 ChapterPacket 3-mode  (medium risk, existing base)
Batch 4: Canvas 2 StructureGraph L1-L4  (highest risk, spike-informed)
Batch 5: Canvas 3 Heaven/Earth/Human    (P1, optional, defer to v2.1.1)
```

Serial constraint: each batch must pass acceptance before next starts. No parallel canvas work.

Canvas 2 spike must verify: @xyflow custom layer rendering, L1-L4 zoom/pan performance, breadcrumb path construction, layer state retention. Output spike report.

## 12. Acceptance Commands

### Pre-Dispatch Gate

```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 42/42 + new
npm run accept:e2e && npm run test:ai-evaluation-harness  # >=10+method fixtures
```

### Per-Batch Checks

| Batch | Check | Method |
|-------|-------|--------|
| 0 | Canvas 2 hierarchy spike verified | Spike report |
| 1 | Canvas 1 five-step complete, each step AI-assisted; wishlist >=10 enables confirm, <10 disabled; premise confirmed -> canvas 2 "ready" | Manual |
| 2 | Sparrow 12 steps as natural language, no jargon; step 3 required; protagonist 3 steps markable as "usable" | Manual |
| 3 | Three detail modes switch correctly; sketch=layer4 collapsed, refined=all editable | Manual |
| 4 | L1-L4 zoom/breadcrumb/state retention works; canvas 2 "ready" after premise | Manual |
| 5 | Three-layer expansion data correct (if implemented) | Manual |

### Final Gate

```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 46/46 all PASS
npm run accept:e2e && npm run test:ai-evaluation-harness  # >= 14 fixtures
```

## 13. Manual Acceptance Paths

**Path A (Canvas 1):** Open project -> Canvas 1 -> Wishlist: add 12 wishes -> Confirm enables -> Premise variants: AI generates 3 -> Select one -> Reader Q&A -> Genre judgement -> Confirm -> Canvas 2 "ready".

**Path B (Canvas 3):** After premise -> Canvas 3 -> 9 steps expand -> Step 3 required -> Fill -> AI suggests -> Protagonist 3 steps -> Mark "usable" -> (P1: expand layers).

**Path C (Canvas 4):** After sparrow -> Canvas 4 -> Sketch mode -> Layer4 collapsed -> AI generates -> Switch to standard -> Layer3 reviewable -> Switch to refined -> Full editable -> Confirm.

**Path D (Canvas 2):** After packet -> Canvas 2 -> L1 book -> Zoom L2 shiwei -> L3 hou -> L4 zhang -> Breadcrumb "book > shiwei > hou > zhang" -> Layer switch -> State retained -> Return L1.

**Path E (v2.0.2 Regression):** CanvasAiBar discuss -> ChatDrawer. Suggest -> Accept -> DB row. No provider -> Error. 5 canvases navigable, data persists on refresh.

## 14. Machine Acceptance

| Check | Required |
|-------|----------|
| cargo check | PASS |
| tsc --noEmit | PASS |
| accept:static | No violations |
| scan-contract-chain | 46/46 PASS |
| accept:e2e | v2.0-H paths intact |
| test:ai-evaluation-harness | >= 14 fixtures PASS |
| Canvas 2 spike report | Available before batch 4 |

## 15. PASS / FAIL Criteria

**PASS:** All 4 P0 items done, spike completed, acceptance commands pass, contract chain 46/46, no broken contracts, no DB violation, no silent write, no mock data, no jargon visible, all manual paths pass, v2.0.1 fixes >= 80%, v2.0.2 E2E regression passes.

**PASS_WITH_NOTES:** PASS plus non-blocking P1 issues (CSS, labels, error messages).

**FAIL:** Any P0 missing, acceptance fails, contract broken, DB violated, silent write, mock data, jargon visible, v2.0.1 obligation unmet.

## 16. Handoff Report Template

```md
# v2.1.0 Report
Verdict: PASS / PASS_WITH_NOTES / FAIL
Canvas 1[ ] 2[ ] 3[ ] 4[ ] heaven/earth/human[ ]
Spike completed[ ] | v2.0.1 fixes: X% (target >=80%)
Acceptance: cargo[ ] tsc[ ] static[ ] chain[46/46] e2e[ ] ai-eval[N/14+]
Files changed: (per canvas)
Known issues:
Next step:
```

## 17. Gate Checklist (10 Steps)

| # | Check | Pass? |
|---|-------|-------|
| 1 | Worker can execute this plan without reading full PRD? | |
| 2 | In Scope <= 5 items? | |
| 3 | Out of Scope explicit and complete? | |
| 4 | File locks clear (Allowed Write, Read Only, Forbidden)? | |
| 5 | DB rules clear (additive only, no migration)? | |
| 6 | Contract rules clear (4 new CN-MET, existing locked)? | |
| 7 | Acceptance commands enumerable (per-batch + final)? | |
| 8 | Real user paths defined (5 manual paths A-E)? | |
| 9 | Mock / localStorage / silent write explicitly banned? | |
| 10 | Next version (v2.1.1) excluded? | |

If any fails, return to Chancellor. Do not dispatch until all 10 pass.

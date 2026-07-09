# v2.1.1 Scope Freeze Plan (DRAFT)

## 1. Verdict

Status: DRAFT | Target Version: v2.1.1 | Type: Method Integration (product, **medium-risk**)
Previous: v2.1.0 (Method Backbone MVP) | Next: v2.1.2 (Value Probe / PMF Probe)

## 2. Target Outcome

Make the v2.1.0 methodology skeleton **pipeline-connected**: upstream canvas outputs (premise, structure, setting) meaningfully affect downstream canvas data (ChapterPacket). Complete the heaven/earth/human expansion deferred from v2.1.0.

The product goal is not more methodology features — it's **methodology integration**: the premise type determining what the writing contract says, the structure hierarchy driving chapter packet generation, and setting changes propagating to the active context.

---

## 3. In Scope (5 items)

| # | Item | Pri | Canvas | Remark |
|---|------|-----|--------|--------|
| 1 | Upstream modification detection (上游修改提示) | P0 | Cross-canvas | When user modifies Canvas 1/2/3, downstream canvas detects change and shows "upstream data updated" indicator. Non-auto-refresh — user sees indicator and manually refreshes. |
| 2 | Premise type influences writing contract (Layer1) | P0 | 1→4 | Canvas 1 premise intern/extern (八字+六变) result auto-writes to Canvas 4 ChapterPacket writing contract section. Affects AI writing constraints for each chapter. |
| 3 | Structure node → ChapterPacket jump (L4→Canvas 4) | P0 | 2→4 | Canvas 2 L4 (Zhang) node click opens Canvas 4 and auto-positions to corresponding chapter. Bidirectional: premise→structure→packet chain complete at navigation level. |
| 4 | Three detail modes affect AI output granularity | P0 | 4 | DetailMode enum (sketch/standard/refined) consumed by AI generation: sketch mode = concise AI output, standard = balanced, refined = detailed. WAS P0 in v2.1.0 but the AI consumption wiring is here. |
| 5 | Heaven/Earth/Human three-layer expansion (carried-over from v2.1.0 T-006) | P1→P0 | 3 | Three contextual layers on Canvas 3 Sparrow mode: Heaven (greater forces), Earth (physical/social landscape), Human (people and relationships). AI fills first, natural language labels. |

### Execution Order

```
Batch 1: Upstream modification detection (foundation — needed by batches 2-4)
Batch 2: Premise → writing contract (highest product value)
Batch 3: Structure → packet jump (navigation integration)
Batch 4: Detail mode → AI granularity (AI wiring)
Batch 5: Heaven/Earth/Human expansion (remaining from v2.1.0 T-006)
```

Serial execution recommended: each batch must pass acceptance before next starts.

---

## 4. Out of Scope

- Knowledge boundary detector → v2.2
- Seven diagnostics (七诊) → v2.2
- Eight styles (八体) → v2.2
- Full knowledge state machine → v2.2
- Complete character card 11-step → v2.2+
- Reverse pipeline → v2.3
- Pricing / Cost Meter → v2.4
- Canvas 2 animations → later
- Any new methodology features (no new canvas methods beyond integration)
- v2.1.0 canvas reimplementation (read-only)

---

## 5. Stable Boundaries

Must not break: v2.1.0 methodology skeleton (premise 5-step, structure L1-L4, sparrow 9+3, packet 3-mode), v2.0-H project creation + 5-canvas navigation, SQLite persistence, v2.0.2 AI infra (Context Builder, Router, Parser, Skill Registry, Evaluation Harness), contract chain 75/75, CanvasAiBar interface, acceptance paths.

Legacy: CanvasView, AIChat, SettingCollection remain Legacy-menu only.

---

## 6. File Locks (DRAFT)

### Allowed Write

| Path | Worker | Notes |
|------|--------|-------|
| `src/features/canvas-01-premise/**` | fe | Premise integration points |
| `src/features/canvas-02-structure/**` | fe | Structure navigation hooks |
| `src/features/canvas-03-setting/**` | fe | Sparrow integration + T-006 expansion UI |
| `src/features/canvas-04-packet/**` | fe | Writing contract population + mode-AI wiring |
| `src/features/common/pipeline/**` | fe | Cross-canvas pipeline integration (new) |
| `src/features/common/pipeline-indicator/**` | fe | Upstream modification detection UI (new) |
| `src/contracts/{premise,structure,setting,chapter-packet}.contract.ts` | fe | Integration types (additive only) |
| `src/stores/*` | fe | Additive pipeline state |
| `src/api/{premiseApi,structureApi,settingApi,chapterPacketApi}.ts` | fe | Integration API functions |
| `src-tauri/src/{commands,models,db}.rs` | be | Integration commands only |
| `scripts/acceptance/scan-contract-chain.mjs` | be | Update CN-MET integration entries |
| `docs/execution/contracts.json` | chancellor only | Integration contract updates |

### Read Only

`src/features/canvas-05-text/**`, `src/features/pipeline-{canvas,nav}/**`, `src/components/ai/**`, `src/lib/ai/**` (read-only — all AI through v2.0.2 infra), v2.1.0 canvas feature files (read-only after T-007), `docs/**`.

### Forbidden

Non-`src/` or `src-tauri/src/` target files, existing DB tables (additive only), Legacy area.

---

## 7. Contract Rules (DRAFT)

### New Contracts (Integration Layer)

| ID | File | Additions |
|----|------|-----------|
| CN-INT-01 | `src/contracts/pipeline-integrator.contract.ts` | PipelineStatus (up-to-date/stale/updating), PipelineLink (canvas->canvas mapping), WritingContractTemplate |
| CN-INT-02 | Additions to existing CN-MET-01~04 | Integration types: PremiseToWritingContract mapping, StructureToPacketLink, DetailModeAI granularity config |

### Locked Contracts
- CN-CORE-01~04 (project, decision-log, setting, contracts.json)
- All CN-MET-01~04 types (v2.1.0 — additive only if needed)

### Chain Target
75 existing + 2 new = 77 total. Fail if any existing drops.

---

## 8. AI Rules

All AI through v2.0.2 Foundation. No new infra.

- DetailMode consumption in AI generation: skill `packet.three_detail_modes` updated to accept `DetailMode` parameter in prompt context
- Premise→writing contract: existing `premise.five_step` skill extended to expose writing contract output
- No new skills — integration only
- Three-state enforcement: discuss=never DB, suggest=only after ACCEPT, write_preview=only after CONFIRM

---

## 9. UI Rules

- Upstream modification indicator: non-blocking visual badge ("上游已更新" in subdued color). User clicks to refresh. No auto-refresh.
- Writing contract population: auto-populated on ChapterPacket creation from premise data. User can edit.
- L4→Canvas 4 jump: opens Canvas 4 and auto-positions to matching chapter (identified by structure→packet mapping table)
- Natural language only — no methodology jargon in indicators or labels
- Heaven/Earth/Human: same pattern as Sparrow 9+3 (AI fills first, collapsible section, natural language labels)

---

## 10. Acceptance Commands

### Pre-Dispatch Gate

```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 75/75 + remain 75
npm run accept:e2e && npm run test:ai-evaluation-harness
```

### Per-Batch Checks

| Batch | Check | Method |
|-------|-------|--------|
| 1 | Upstream modification detection: modify premise → Canvas 3/4 show indicator | Manual |
| 2 | Premise→writing contract: premise confirmed → Canvas 4 writing contract populated with premise type | Manual |
| 3 | L4→Canvas 4 jump: click L4 node → Canvas 4 opens at matching packet | Manual |
| 4 | Detail mode affects AI output: sketch/standard/refined → AI output differs in length and detail | Manual |
| 5 | Three-layer expansion renders correctly, AI fills first, data persists | Manual |

### Final Gate

```bash
cargo check && npm run tsc -- --noEmit && npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # 77/77 all PASS
npm run accept:e2e && npm run test:ai-evaluation-harness  # with T-006 eval fixtures
```

---

## 11. Manual Acceptance Paths

**Path F (Upstream Detection):** Create project → Complete premise (Canvas 1) → Sparrow (Canvas 3) shows "upstream data ready" → Modify premise → Sparrow shows "upstream updated" indicator → Click refresh → Sparrow state reflects new premise → Packet (Canvas 4) also shows indicator.

**Path G (Premise→Writing Contract):** Complete premise 5-step with clearly defined intern/extern → Open Canvas 4 → Create new chapter → Writing contract (Layer1) pre-filled with premise-derived writing constraints → User can edit → Refresh → Writing contract persists.

**Path H (Structure→Packet Navigation):** Complete premise + structure (Canvas 1+2) → Click L4 node in Canvas 2 → Canvas 4 opens at corresponding chapter → Breadcrumb shows packet context → Return to Canvas 2 → Layer state still retained.

**Path I (Detail Mode AI):** In Canvas 4 → Sketch mode → AI generate → Output concise and summary-level → Switch to Standard → AI generate → Output balanced → Switch to Refined → AI generate → Output detailed with sub-sections → Verify mode not lost on refresh.

**Path J (Heaven/Earth/Human):** Open Canvas 3 Sparrow → "Expand perspectives" section visible → Heaven: "greater forces" textarea with AI pre-fill → Earth: "systems and landscape" → Human: "people and relationships" → Each has do-not-ask-again toggle → Data persists on refresh.

---

## 12. PASS / FAIL Criteria

**PASS:** All 5 items done, upstream detection works bidirectionally, premise→writing contract auto-populates, L4→Canvas 4 jump works, detail mode affects AI output, heaven/earth/human expansion works with persistence, v2.1.0 features not broken (75/75 contract chain intact), no methodology jargon violations.

**FAIL:** Any P0 missing, contract broken, data loss on upstream modification, AI output not affected by detail mode, L4 jump causes navigation errors, heaven/earth/human data lost on refresh.

---

## 13. Next After v2.1.1

**v2.1.2 (Value Probe / PMF Probe):** Three-group A/B test (A1: ChatGPT bare chat / A2: ChatGPT standard prompt pack / B: Zhimengji pipeline). Evaluation infrastructure, data collection, statistical analysis. See PRD v0.3.1 Section 10 for detail.

---

> **Drafted by:** Version Lead
> **Date:** 2026-07-09
> **Source:** PRD v0.3.1 Section 9 + v2.1.0 scope freeze Section 4 (Out of Scope → v2.1.1) + v2.1.0 T-006 carry-over

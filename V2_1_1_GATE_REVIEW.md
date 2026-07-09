# v2.1.1 Scope Freeze — Gate Review

> **Role:** scope-guardian + version-lead (dual hat)
> **Review Date:** 2026-07-09
> **Source:** V2_1_1_SCOPE_FREEZE_PLAN.md (DRAFT)
> **Codebase State:** v2.1.0 methodology skeleton intact, 75/75 contract chain PASS

---

## 10-Step Gate Checklist

### Step 1: Scope Clarity — In/Out-of-Scope

**Result: PASS**

In-scope (5 items) is clearly defined with priority, canvas mapping, and per-item remarks. Each item has a concrete deliverable:

| # | Item | Verifiable? | Remark |
|---|------|------------|--------|
| 1 | Upstream modification detection | Yes — visual indicator + manual refresh | Cross-canvas pipeline |
| 2 | Premise type influences writing contract (Layer1) | Yes — premise intern/extern → writing contract auto-population | Highest product value |
| 3 | Structure node → ChapterPacket jump (L4→Canvas 4) | Yes — click L4 in canvas 2 → canvas 4 opens at matching chapter | Navigation integration |
| 4 | Three detail modes affect AI output granularity | Yes — sketch/standard/refined → AI output differs | AI wiring |
| 5 | Heaven/Earth/Human three-layer expansion | Yes — three collapsible sections, AI fill, persistence | v2.1.0 T-006 carry-over |

Out-of-scope is well-defined with 11 items explicitly excluded, mapped to future versions (v2.2, v2.3, v2.4).

**Note:** Item 4 "DetailMode affects AI output granularity" has a dependency risk — if the v2.0.2 AI infra (Context Builder, Router, Parser) doesn't accept a DetailMode parameter in the skill prompt, this wiring may be blocked. The scope plan assumes the existing `packet.three_detail_modes` skill can be updated — this needs verification before execution begins.

---

### Step 2: Backward Compatibility

**Result: PASS**

Section 5 "Stable Boundaries" explicitly lists:
- v2.1.0 methodology skeleton (premise 5-step, structure L1-L4, sparrow 9+3, packet 3-mode)
- v2.0-H project creation + 5-canvas navigation
- SQLite persistence
- v2.0.2 AI infra (Context Builder, Router, Parser, Skill Registry, Evaluation Harness)
- Contract chain 75/75
- CanvasAiBar interface, acceptance paths

Legacy area (CanvasView, AIChat, SettingCollection) is Legacy-menu only — no impact.

**Risk:** The scope plan says "75/75 + 2 new = 77 total" and "Fail if any existing drops." This is clear. However, the plan should specify that the 75 existing acceptance paths must be re-run after integration. Currently implicit in the Final Gate commands.

---

### Step 3: File Authorization

**Result: PASS_WITH_NOTES**

File locks are well-structured with precise paths:

**Allowed write:**
- `src/features/canvas-01-premise/**` — premise integration
- `src/features/canvas-02-structure/**` — structure navigation hooks  
- `src/features/canvas-03-setting/**` — sparrow + T-006
- `src/features/canvas-04-packet/**` — writing contract, mode-AI wiring
- `src/features/common/pipeline/**` — NEW cross-canvas pipeline
- `src/features/common/pipeline-indicator/**` — NEW upstream indicator UI
- `src/contracts/{premise,structure,setting,chapter-packet}.contract.ts` — additive only
- `src/stores/*` — additive pipeline state
- `src/api/*` — integration API functions
- `src-tauri/src/**` — integration commands
- `scripts/acceptance/scan-contract-chain.mjs` — update CN-MET integration entries
- `docs/execution/contracts.json` — chancellor only

**Note 1:** The `src/features/common/pipeline/**` and `src/features/common/pipeline-indicator/**` directories don't exist yet. The scope plan identifies these as "new" — this is fine, but the file locks should explicitly note they're new directories to create.

**Note 2:** The scope plan forbids editing `src/features/pipeline-canvas/**` and `src/features/pipeline-nav/**` which is correct — these are the canvas shell and navigation bar that should remain stable. However, for item 3 (L4→Canvas 4 jump), the `PipelineNav` or `App.tsx` will need a mechanism to programmatically switch to the `packet` stage with a target packet ID. The current file locks don't list `src/App.tsx` or `src/features/pipeline-nav/` as authorized for write. **This needs resolution** — either:
  - Add `src/App.tsx` to allowed write (for stage-change callbacks), OR
- Relay the jump through a zustand store action (better approach)
  - Add `src/stores/pipeline-helper.ts` to allowed write if the jump logic goes there

**Recommendation:** Resolve by adding store-based navigation action rather than modifying App.tsx. Update file locks to allow `src/stores/*` for this purpose.

---

### Step 4: Contract Completeness

**Result: PASS**

New contracts defined:
- **CN-INT-01:** `pipeline-integrator.contract.ts` — PipelineStatus, PipelineLink, WritingContractTemplate
- **CN-INT-02:** Additions to existing CN-MET-01~04 — PremiseToWritingContract mapping, StructureToPacketLink, DetailModeAI granularity config

Chain target: 75 existing + 2 new = 77 total. Fail if any existing drops.

**Verification:** The existing contracts file (`docs/execution/contracts.json`) is the OLD v1.2 format (WorldObject, SyncManager, etc.) — it does NOT contain v2.1.0 methodology contracts. The actual methodology contracts are defined in `src/contracts/*.contract.ts` files. The acceptance script `scan-contract-chain.mjs` needs to be updated to track the new CN-INT-01 and CN-INT-02 types.

**Note:** The scope plan should clarify whether CN-INT-01 and CN-INT-02 are tracked in `docs/execution/contracts.json` (the JSON manifest) or in the TypeScript contract files, or both. Recommend: TypeScript contract as source of truth + JSON manifest updated for automation.

---

### Step 5: Execution Order

**Result: PASS**

Clear serial execution with dependency chain:

```
Batch 1: Upstream detection (foundation — needed by 2-4)
Batch 2: Premise → writing contract (highest product value)
Batch 3: Structure → packet jump (navigation)
Batch 4: Detail mode → AI granularity (AI wiring)
Batch 5: Heaven/Earth/Human expansion (v2.1.0 carry-over)
```

Serial execution recommended with per-batch acceptance before next starts. This is sound — B2 depends on B1 (pipeline detection), B3 depends on B1 (pipeline status), B4 is independent, B5 is independent.

**Note:** Batch 4 (DetailMode AI) and Batch 5 (TianDiRen) could technically run in parallel with Batch 3, but serial is simpler to manage. No objection.

---

### Step 6: AI Integration Rules

**Result: PASS**

Clear boundary:
- "All AI through v2.0.2 Foundation. No new infra."
- `packet.three_detail_modes` skill updated to accept `DetailMode` parameter
- `premise.five_step` skill extended to expose writing contract output
- Three-state enforcement: discuss/suggest/write_preview rules maintained
- "No new skills — integration only"

**Risk:** The scope plan says "DetailMode consumption in AI generation: skill `packet.three_detail_modes` updated to accept `DetailMode` parameter." This assumes the v2.0.2 Context Builder can inject `DetailMode` into the prompt context. If the AI infra doesn't support dynamic prompt injection per invocation, this wiring may require infra changes that violate the "No new infra" rule.

**Recommendation:** Verify v2.0.2 Context Builder's capability for per-invocation parameter injection before Batch 4 execution starts. If blocked, Batch 4 may need to fall back to a simpler approach (e.g., post-processing truncation based on mode).

---

### Step 7: UI/UX Rules

**Result: PASS**

UI rules are clear and consistent with the natural-language-first philosophy:
- "Upstream modification indicator: non-blocking visual badge" — exactly right
- "Writing contract: auto-populated, user can edit" — clear
- "Natural language only — no methodology jargon in indicators or labels" — enforced
- Heaven/Earth/Human: same pattern as Sparrow 9+3 (collapsible, natural labels)

**Note:** Item 2 (Premise→Writing Contract) needs a clear UX state definition for the contract population trigger. The scope plan says "auto-populated on ChapterPacket creation from premise data" — but premise data changes dynamically. What happens when:
  a) User has existing chapter packets, then modifies premise intern/extern?
  b) User creates a chapter packet before premise is confirmed?

These edge cases should be defined in the contract/design before implementation.

---

### Step 8: Acceptance Criteria

**Result: PASS**

PASS/FAIL criteria are well-defined:
- **PASS:** All 5 items done, bidirectional upstream detection, premise→writing contract auto-populates, L4→Canvas 4 jump works, detail mode affects AI output, tian/di/ren works with persistence, v2.1.0 features intact (75/77 chain), no jargon violations.
- **FAIL:** Any P0 missing, contract broken, data loss, AI output not affected, navigation errors, persistence lost.

5 acceptance paths defined (F through J) with clear manual test scenarios.

Per-batch checks defined in Section 10.

**Note:** The acceptance paths are manual-only — this is appropriate for integration features. But item 4 (DetailMode AI) needs an automated test that verifies AI output length differs by mode, since manual testing of AI output is subjective.

**Recommendation:** Add an automated acceptance step for Batch 4: `npm run test:ai-evaluation-harness` with DetailMode-specific fixtures.

---

### Step 9: Resource & Risk Assessment

**Result: PASS**

**Risk Register:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| AI infra doesn't support DetailMode injection | Batch 4 blocked | Medium | Verify before execution; define fallback |
| Batch 3 (L4→Canvas 4) needs App.tsx changes | Scope creep | Low | Use store-based navigation instead |
| v2.1.0 features broken by integration | Regression | Low | Per-batch acceptance + final gate re-runs |
| Scope plan is DRAFT — execution plan needs hardening | Execution risk | Medium | This Gate review is the hardening step |

**Resource:** 5 batches × serial execution. Estimated 3-4 worker sessions (fe primary, be minimal). No new npm deps. No new Tauri infra.

---

### Step 10: Readiness Verdict

**Result: PASS_WITH_NOTES**

**Overall Verdict:** PASS_WITH_NOTES

**Conditions to resolve before execution:**
1. **File locks ambiguity:** Resolve whether `src/App.tsx` or `src/features/pipeline-nav/` needs to be touched for item 3 (L4→Canvas 4 jump). **Recommendation:** Use zustand store action → no App.tsx changes needed. Update file locks to explicitly allow `src/stores/*` for this.
2. **Contract tracking clarification:** Specify whether CN-INT-01 and CN-INT-02 are tracked in the JSON manifest, the TypeScript files, or both.
3. **AI infra verification:** Verify v2.0.2 Context Builder's DetailMode injection capability before Batch 4.
4. **Edge case definition for item 2:** Define UX behavior for premise modification after chapter packets exist.

**Gate Decision: CONTINUE** — proceed to ticket decomposition and execution, with pre-conditions noted for each batch.

---

## Evidence

- Scope Freeze Plan: `V2_1_1_SCOPE_FREEZE_PLAN.md` (DRAFT, 13 sections)
- Codebase state: v2.1.0 complete with ChapterPacketCanvas, StructureGraph, SparrowStepList, PacketDetailModeSelector
- Contract chain: 75 existing contract types in `src/contracts/*.contract.ts`
- Current packet canvas: `PacketComingSoon` placeholder — needs to be replaced with full `ChapterPacketCanvas`

---

*Gate reviewed by scope-guardian + version-lead*

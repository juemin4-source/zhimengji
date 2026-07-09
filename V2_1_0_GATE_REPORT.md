# v2.1.0 Scope Freeze Gate Report

## Review Target

| Field | Value |
|-------|-------|
| Document | V2_1_0_SCOPE_FREEZE_PLAN.md |
| Version | v2.1.0 |
| Type | Method Backbone MVP (product, high-risk) |
| Previous | v2.0.2 (AI Foundation) |
| Next | v2.1.1 (Method Integration) |
| Document Status | DRAFT |
| Reviewer | scope-guardian |

## Verdict

**PASS_WITH_NOTES**

Gate decision: PASS_WITH_NOTES. The scope freeze plan is structurally sound and production-ready for most dimensions. Two pre-implementation prerequisites and one file-lock clarification are noted below. None of these block the plan's validity, but they must be resolved before dispatching the first implementation batch.

## 10-Question Gate Checklist

### Q1: Can Claude Code execute this without reading the full PRD?

**PARTIAL** -- Mostly yes, with two gaps.

**Evidence:**
- The plan provides explicit file paths (Section 6), contract type names (Section 8), DB rules (Section 7), acceptance commands (Section 12), and user paths (Section 13).
- The v2.0.2 AI infra Context Builder / Command Router / Structured Output Parser are referenced by name but not defined in this document. A worker would need to reference `src/lib/ai/` and the v2.0.2 reports for the architecture.
- Section 5 states: "v2.0.1 usability fix obligation: >= 80% of fixable issues must be resolved. Fix list attached before implementation." The fix list is NOT attached to this scope freeze plan or anywhere in the project (confirmed by grep search). This is a forward reference -- a pre-implementation prerequisite.

**Risk:** Low. The v2.0.2 architecture is documented in source code and reports. The fix list gap is acknowledged as a pre-implementation prerequisite, not a plan defect.

**Note:** The Chancellor must ensure the fix list is attached before dispatching Batch 1.

---

### Q2: In Scope <= 5 items?

**PASS** -- Exactly 5 items.

| # | Item | Priority | Canvas |
|---|------|----------|--------|
| 1 | PremiseCard v2 five-step | P0 | 1 |
| 2 | StructureGraph L1-L4 zoomable hierarchy | P0 | 2 |
| 3 | Sparrow mode 9+3 | P0 | 3 |
| 4 | ChapterPacket three detail modes | P0 | 4 |
| 5 | Heaven/earth/human three-layer expansion | P1 | 3 |

**Evidence:**
- Item 5 is clearly marked as P1 and deferrable ("May defer to v2.1.1. Non-blocking.").
- The plan explicitly notes execution order (Canvas 1 -> 3 -> 4 -> 2) and serial constraint (no parallel canvas work). This prevents chaos from simultaneous canvas modification.

---

### Q3: Out of Scope explicit and complete?

**PASS** -- 9 explicit items listed.

**Evidence:**
- Inter-canvas linkage -> v2.1.1
- Premise -> writing contract -> v2.1.1
- Structure -> ChapterPacket jump -> v2.1.1
- Setting -> active context -> v2.1.1
- Knowledge boundary detector, diagnostics, styles -> v2.2
- Reverse pipeline -> v2.3, pricing -> v2.4
- Full 11-step character card, canvas 2 animations
- v2.0.2 AI infra rebuild (read-only)
- Project auto-migration scripts

**Note:** "v2.0.2 AI infra rebuild (read-only)" is clear from context but could more explicitly state "no new AI infra architecture work." The file locks in Section 6 already enforce this.

---

### Q4: File locks clear?

**PASS_WITH_NOTES** -- Clear structure with one minor inconsistency.

**Evidence:**
- Three clear sections: Allowed Write, Read Only, Forbidden.
- Per-worker authorization (fe and be roles distinguished).
- Per-canvas path assignment prevents parallel conflicts.
- Read Only list correctly locks AI infra, pipeline, legacy, core contracts, project config.

**Issue -- Read Only glob vs Allowed Write specific file conflict:**

| Read Only Glob | Allowed Write Exception |
|----------------|------------------------|
| `scripts/acceptance/**` | `scripts/acceptance/scan-contract-chain.mjs` (be) |
| `docs/**` | `docs/execution/contracts.json` (chancellor only) |

The two specific exceptions are legitimate but contradict the Read Only glob patterns. While a human reader would infer "specific overrides general," this ambiguity could confuse a worker checking file-lock authorization. The precedence rule should be explicitly stated: "Specific file paths in Allowed Write override Read Only glob patterns."

---

### Q5: DB rules clear?

**PASS** -- Excellent clarity.

**Evidence:**
- Mode: Additive only. No migration, no ALTER TABLE.
- New tables allowed with explicit naming convention (`{canvas}_{feature}`).
- New columns on new tables: allowed. New columns on existing tables: prohibited.
- Modify/delete existing tables/cols: prohibited.
- Data migration scripts: prohibited.
- Old-data read-time compatibility explicitly handled at frontend layer (not DB).
- Idempotent schema requirement stated.

This is the strongest section of the plan. No ambiguity.

---

### Q6: Contract rules clear?

**PASS** -- Very clear.

**Evidence:**
- 4 new contracts: CN-MET-01~04, each with specific file and type additions listed.
- CN-MET-01: `premise.contract.ts` -> 6 type additions (WishlistItem, PremiseVariant, ReaderQuestion, etc.)
- CN-MET-02: `structure.contract.ts` -> 6 type additions (BookLayer, ShiweiLayer, etc.)
- CN-MET-03: `setting.contract.ts` -> 4 type additions (SparrowModule, CharacterStep3, etc.)
- CN-MET-04: `chapter-packet.contract.ts` -> 4 type additions (DetailMode enum, etc.)
- Locked contracts explicitly listed: CN-CORE-01~04.
- Chain target: 42 existing + 4 new = 46 total. Fail if any existing drops.
- Additive-only constraint: new types, no existing type modification.

---

### Q7: Acceptance commands clear?

**PASS** -- Commands are enumerable and batch-specific.

**Evidence:**
- Pre-Dispatch Gate: cargo check, tsc, accept:static, scan-contract-chain, accept:e2e, test:ai-evaluation-harness.
- Per-Batch Checks: 5 explicit check tables (Batch 0-5).
- Final Gate: same commands with updated chain target (46/46) and fixture count (>=14).
- Acceptance is layered: machine checks per batch + manual paths.

**Note:** "npm run test:ai-evaluation-harness" is referenced. This must exist in package.json from v2.0.2. The v2.0.2 report confirms 17 fixtures exist, so this command should be available.

---

### Q8: Real user paths defined?

**PASS** -- 5 complete manual acceptance paths (A-E).

**Evidence:**
- Path A (Canvas 1): End-to-end workflow from wishlist to premise confirmation.
- Path B (Canvas 3): Step-by-step Sparrow mode with protagonist 3-step.
- Path C (Canvas 4): Three detail mode switching with AI interaction.
- Path D (Canvas 2): L1-L4 zoom/breadcrumb/state retention.
- Path E (v2.0.2 Regression): AI tri-state, CanvasAiBar, 5-canvas navigation, persistence.

These are real user paths, not technical unit tests. Each path describes a complete user interaction flow with verification criteria.

---

### Q9: Mock / localStorage / silent write explicitly banned?

**PASS** -- Explicitly banned with enforcement.

**Evidence:**
- Section 9 AI Rules: "Three-state enforcement: discuss=never DB, suggest=only after ACCEPT, write_preview=only after CONFIRM."
- Section 9 Prohibitions: "no silent writes, no mock AI in acceptance, no localStorage for formal data."
- Section 15 FAIL criteria includes: "silent write, mock data."
- Added enforcement: "no direct invoke() in method components" (Tauri best practice).
- The v2.0.2 AI infra enforces the three-state pattern at the architectural level.

---

### Q10: Next version excluded?

**PASS** -- v2.1.1 is clearly separated.

**Evidence:**
- Section 2 & 4 repeatedly map deferred features to specific future versions.
- v2.1.1 features explicitly listed: inter-canvas linkage, premise->writing contract, structure->packet jump, setting->active context.
- v2.2/2.3/2.4 features also separated.
- Section 3 note on Item 5: "May defer to v2.1.1. Non-blocking."

This prevents scope creep by making future-version assignments explicit in the Out of Scope section.

---

## Summary Checklist

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| 1 | Worker can execute without full PRD | PASS_WITH_NOTES | Fix list to be attached; v2.0.2 ref docs needed |
| 2 | In Scope <= 5 items | PASS | Exactly 5 with clear priorities |
| 3 | Out of Scope explicit | PASS | 9 items, version-mapped |
| 4 | File locks clear | PASS_WITH_NOTES | Minor glob/exception conflict |
| 5 | DB rules clear | PASS | Strong coverage |
| 6 | Contract rules clear | PASS | Specific type definitions |
| 7 | Acceptance commands clear | PASS | Layered and per-batch |
| 8 | Real user paths defined | PASS | 5 complete paths |
| 9 | Mock/localStorage/silent write banned | PASS | Explicit with enforcement |
| 10 | Next version excluded | PASS | v2.1.1 clearly scoped out |

---

## Issues Found

### Issue 1: Missing v2.0.1 fix list (Pre-implementation prerequisite)

- **Severity:** Note
- **Location:** Section 5 (Stable Boundaries)
- **Description:** The plan requires >= 80% of v2.0.1 fixable issues to be resolved, but the fix list is not attached. The phrase "Fix list attached before implementation" is a forward reference.
- **Impact:** Without the fix list, workers cannot verify they have met the >= 80% obligation.
- **Action required:** Chancellor must provide the fix list as a pre-implementation artifact before dispatching Batch 1.

### Issue 2: File lock glob vs exception ambiguity

- **Severity:** Note
- **Location:** Section 6 (File Locks)
- **Description:** `scripts/acceptance/**` and `docs/**` are listed as Read Only, but `scripts/acceptance/scan-contract-chain.mjs` and `docs/execution/contracts.json` are listed as Allowed Write.
- **Impact:** Low. A worker might be confused about whether they can edit scan-contract-chain.mjs.
- **Action required:** Add a precedence note: "Specific file paths in Allowed Write override Read Only glob patterns." Or exclude the two files from the Read Only glob.

### Issue 3: Document still in DRAFT status

- **Severity:** Note
- **Location:** Section 1 (Verdict)
- **Description:** The plan header shows "Status: DRAFT" rather than "READY_FOR_GATE."
- **Impact:** Low. The content appears complete enough for review, but the formal status should be updated.
- **Action required:** Chancellor should confirm and update to READY_FOR_GATE before dispatching.

---

## Return To

Not applicable. The plan passes with notes -- no FAIL condition.

However, if Chancellor determines the v2.0.1 fix list must be embedded in the scope freeze plan before proceeding, the return node would be:

```
return_to: Chancellor (to prepare and attach fix list)
```

---

## Additional Observations for a High-Risk Version

### Risk Mitigation Assessment

| Risk | Mitigation in Plan | Adequate? |
|------|--------------------|-----------|
| Canvas 2 @xyflow custom hierarchy (highest risk) | Tech spike before Batch 4, spike report required | Yes |
| 4 canvases modified in parallel | Serial execution constraint (no parallel canvas work) | Yes |
| Method step changes may break existing contracts | Additive-only contract rule, chain scan enforcement | Yes |
| AI integration complexity | v2.0.2 infra reused, no new AI architecture | Yes |
| Jargon exposure to users | Natural language UI rule, no-jargon verification criteria | Yes |
| v2.0.1 fix obligation ambiguity | Noted as pre-implementation prerequisite (Issue 1) | Conditional on fix list |
| Canvas 2/3/4 UI changes may regress v2.0.x features | Path E regression acceptance, existing E2E path | Yes |

### Recommendation

The scope freeze plan is well-structured and demonstrates awareness of this version's high risk profile. The serial execution constraint and tech spike are appropriate mitigations for the riskiest components. The primary concern is the missing v2.0.1 fix list, which must be resolved before any implementation begins.

**Gate decision: PASS_WITH_NOTES -- proceed, but resolve Issue 1 (fix list) before dispatching Batch 1.**

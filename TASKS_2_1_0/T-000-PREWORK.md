# TICKET T-000 — Prework: v2.0.1 Fix Obligation + Skill Registration + Eval Fixture Prep

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-000 |
| Title | Prework — v2.0.1 Usability Fixes, 5 Skill Registrations, Eval Fixture Prep, Pre-Dispatch Gate |
| Execution Order | 0 / 8 (must be first) |
| Dependencies | None |
| Risk | medium (touches skill registry, eval harness, acceptance scripts) |
| Terse | low (mostly mechanical, with checklists) |

## Objective

Prepare the foundation so all subsequent v2.1.0 batches can execute:

1. **v2.0.1 usability fix obligation (PRD 8.6 item 10):** >= 80% of fixable issues resolved
2. **Register 5 AI skills** in Skill Registry so method-step AI works in each canvas
3. **Add >= 4 new method fixtures** to AI Evaluation Harness (one per new method)
4. **Run pre-dispatch gate** to confirm current state is healthy
5. **Update contract chain scanner** with 4 CN-MET placeholder entries for final 46/46 check
6. **Production of v2.0.1 fix list** as attached reference document

---

## Detailed Scope

### 1. v2.0.1 Usability Fix Obligation

- Locate the v2.0.1 fix list (attached before implementation per scope freeze Sec 5)
- For each fixable issue:
  - Apply the fix touching only files in Allowed Write list below
  - Verify the fix with manual check or existing test
- Track progress: N/M fixes applied, target >= 80%
- If any fix requires touching Forbidden files, flag as BLOCKED and report to Version Lead

### 2. Register 5 AI Skills in Skill Registry

The 5 skills must be registered before any method-step AI can work:

| Skill ID | Name | Canvas | Input Type | Output Type |
|----------|------|--------|------------|-------------|
| `premise.five_step` | Premise Five-Step Assistant | 1 | `PremiseContextInput` | `PremiseStepOutput` |
| `structure.l1_l4` | Structure L1-L4 Hierarchy | 2 | `StructureContextInput` | `StructureNodeOutput` |
| `setting.sparrow_9_3` | Sparrow 9+3 Method | 3 | `SparrowContextInput` | `SparrowStepOutput` |
| `packet.three_detail_modes` | ChapterPacket Detail Modes | 4 | `PacketContextInput` | `PacketDetailOutput` |
| `draft.chapter_writer` | Chapter Writer | text | `DraftContextInput` | `DraftOutput` |

Each skill registration includes:
- `skillId` (unique identifier)
- `name` (human-readable, no jargon)
- `promptTemplate` (context-aware instruction for the AI)
- `inputSchema` / `outputSchema` (JSON Schema for structured parsing)
- `version` (initial = 1)
- Follow existing skill registration pattern in `src/lib/ai/prompt-registry.ts` or AI Control Center API

**No-op:**
- This ticket does NOT implement the method-step UI. It only makes the skills available for AI routing.
- The draft.chapter_writer skill is registered but not used in v2.1.0 (scaffolding for v2.1.1).

### 3. Add >= 4 New Method Fixtures to AI Evaluation Harness

Extend `src/lib/ai/evaluation-harness.ts` (or its equivalent) with 4+ fixture stubs:

| # | Fixture ID | Validates | Target Canvas |
|---|------------|-----------|---------------|
| 1 | premise.five_step_suggest | Premise five-step AI suggest flow | 1 |
| 2 | sparrow.nine_three_suggest | Sparrow 9+3 method suggest flow | 3 |
| 3 | packet.detail_mode_suggest | Packet detail mode suggest flow | 4 |
| 4 | structure.l1_l4_suggest | Structure L1-L4 suggest flow | 2 |

Each fixture follows the existing pattern: `NamedInput -> SchemaValidate -> OutputTypeBehavior -> DBNonWrite -> FailureRecord`.

Initially these are stubs that PASS with a minimal valid response. Actual AI-driven implementations will be added by the corresponding canvas tickets.

### 4. Pre-Dispatch Gate

Run and verify:

```bash
cargo check
npm run tsc -- --noEmit
npm run accept:static
node scripts/acceptance/scan-contract-chain.mjs   # Must show 42/42 PASS
npm run accept:e2e
npm run test:ai-evaluation-harness                  # Must show >= 10 existing PASS
```

Any failure must be BLOCKED and reported to Version Lead.

### 5. Contract Chain Scanner Update

Modify `scripts/acceptance/scan-contract-chain.mjs` to add 4 CN-MET entries as "pending":

```json
{
  "id": "CN-MET-01",
  "file": "src/contracts/premise.contract.ts",
  "status": "PENDING",
  "batch": "T-002"
}
```

These are marked PENDING (not FAIL) so the scanner doesn't break pre-gate. The final gate (T-007) will verify all 4 are IMPLEMENTED and PASS.

### 6. Produce v2.0.1 Fix Reference Document

Generate `docs/execution/v2.0.1-fix-list.md` listing:
- Each identified fixable issue
- Status (FIXED / DEFERRED / NOT_FIXABLE)
- Which ticket applied the fix (T-000 or specific T-00X)

---

## Allowed Write

```
NEW: docs/execution/v2.0.1-fix-list.md                      (fix tracking doc)
MODIFY: src/lib/ai/prompt-registry.ts                        (add 5 skill registrations)
MODIFY: src/lib/ai/evaluation-harness.ts                     (add 4+ fixture stubs)
MODIFY: scripts/acceptance/scan-contract-chain.mjs           (add 4 CN-MET entries as PENDING)
MODIFY: Various files per v2.0.1 fix list                    (fix-specific, additive only)
```

## Read Only (for context)

```
src/lib/ai/prompt-registry.ts           — existing skill registration pattern
src/lib/ai/evaluation-harness.ts        — existing fixture pattern to follow
scripts/acceptance/scan-contract-chain.mjs — existing scanner to extend
src/components/ai/AiControlCenter.tsx   — skill registry UI (understand registration)
src/contracts/ai-registry.contract.ts   — SkillRecord type definition
```

## Forbidden

```
Any canvas feature files (not a canvas implementation ticket)
Any existing contract files (LOCKED — CN-MET types added by later tickets)
Any existing DB schema or models
Any Rust command implementation
src/features/canvas-*/** (not a canvas implementation ticket)
```

## Acceptance Criteria

1. `npm run tsc -- --noEmit` passes
2. `cargo check` passes
3. `npm run accept:static` passes
4. `node scripts/acceptance/scan-contract-chain.mjs` reports 42/42 PASS (CN-MET entries PENDING)
5. `npm run test:ai-evaluation-harness` shows >= 10 existing PASS (4 new stubs added but not counted yet)
6. `npm run accept:e2e` passes (v2.0-H paths intact)
7. All 5 skills registered in skill registry (can be verified via AI Control Center or direct query)
8. v2.0.1 fixes applied: >= 80% of fixable issues resolved
9. `docs/execution/v2.0.1-fix-list.md` exists with per-issue status

## Notes

- This is the only ticket that touches the evaluation harness for fixture scaffolding. Later canvas tickets add AI-driven implementations for their respective fixtures.
- The v2.0.1 fix list attachment is a prerequisite — if missing, this ticket is BLOCKED.
- Keep skill registrations minimal: descriptive prompt templates, correct input/output schema references, version=1. Skills will be refined in later versions.
- Do NOT pre-create CN-MET contract types here — that belongs to T-002~T-005.

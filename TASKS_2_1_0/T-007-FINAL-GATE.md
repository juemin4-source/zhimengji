# TICKET T-007 — Final Acceptance Gate

## Metadata

| Field | Value |
|-------|-------|
| Ticket ID | v2.1.0-T-007 |
| Title | Final Acceptance Gate — Full Verification |
| Execution Order | 7 / 8 (must be last, after all batches) |
| Dependencies | T-002, T-003, T-004, T-005 all completed and per-batch accepted; optionally T-006 |
| Risk | medium (verification only, no implementation) |
| Terse | low (mechanical verification, checklist-driven) |

## Objective

Run the full v2.1.0 acceptance pipeline and produce the final verdict. This is the gate that determines PASS / PASS_WITH_NOTES / FAIL for the entire version.

---

## Detailed Scope

### 1. Final Gate Commands

Run all acceptance commands and verify PASS:

```bash
# Static checks
cargo check
npm run tsc -- --noEmit
npm run accept:static

# Contract chain — must show 46/46 ALL PASS
node scripts/acceptance/scan-contract-chain.mjs

# E2E acceptance — v2.0-H paths intact
npm run accept:e2e

# AI evaluation harness — >= 14 fixtures pass
npm run test:ai-evaluation-harness
```

### 2. Contract Chain Update

Modify `scripts/acceptance/scan-contract-chain.mjs` to change the 4 CN-MET entries from `PENDING` (set in T-000) to `IMPLEMENTED` and verify they PASS:

- CN-MET-01 (premise.contract.ts) — implemented in T-002
- CN-MET-02 (structure.contract.ts) — implemented in T-005
- CN-MET-03 (setting.contract.ts) — implemented in T-003
- CN-MET-04 (chapter-packet.contract.ts) — implemented in T-004

If any CN-MET is NOT fully implemented (missing types, broken imports), this gate FAILs.

### 3. AI Evaluation Harness Update

Update the 4 method fixture stubs (created in T-000) to be real AI-driven tests:

| Fixture | Ticket That Enabled It | What It Now Tests |
|---------|----------------------|-------------------|
| premise.five_step_suggest | T-002 | Premise five-step AI suggest flow works end-to-end |
| sparrow.nine_three_suggest | T-003 | Sparrow 9+3 method suggest flow works |
| packet.detail_mode_suggest | T-004 | Packet detail mode suggest flow works |
| structure.l1_l4_suggest | T-005 | Structure L1-L4 suggest flow works |

Total evaluation harness count: >= 10 existing + >= 4 method = >= 14 total.

### 4. Manual Acceptance Paths

Verify all 5 manual acceptance paths (scope freeze Sec 13):

#### Path A (Canvas 1)
Open project -> Canvas 1 -> Wishlist: add 12 wishes -> Confirm enables -> Premise variants: AI generates 3 -> Select one -> Reader Q&A -> Genre judgement -> Confirm -> Canvas 2 "ready".

#### Path B (Canvas 3)
After premise -> Canvas 3 -> 9 steps expand -> Step 3 required -> Fill -> AI suggests -> Protagonist 3 steps -> Mark "usable".

#### Path C (Canvas 4)
After sparrow -> Canvas 4 -> Sketch mode -> Layer4 collapsed -> AI generates -> Switch to standard -> Layer3 reviewable -> Switch to refined -> Full editable -> Confirm.

#### Path D (Canvas 2)
After packet -> Canvas 2 -> L1 book -> Zoom L2 shiwei -> L3 hou -> L4 zhang -> Breadcrumb "book > shiwei > hou > zhang" -> Layer switch -> State retained -> Return L1.

#### Path E (v2.0.2 Regression)
CanvasAiBar discuss -> ChatDrawer. Suggest -> Accept -> DB row. No provider -> Error. 5 canvases navigable, data persists on refresh.

### 5. v2.0.1 Fix Obligation Verification

- Check `docs/execution/v2.0.1-fix-list.md`
- Verify >= 80% of fixable issues are resolved (FIXED status)
- Any unresolved fixable issues must be documented as Known Issues

### 6. Prohibited Pattern Scan

Verify no violations of scope freeze hard rules:

- [ ] No methodology jargon visible in any Canvas UI (search for: "sparrow", "Sparrow", "9+3", "八字六变", "十二时位", "天/地/人" as UI labels)
- [ ] No mock data in any acceptance path
- [ ] No mock AI responses in acceptance paths (fixtures use recorded real AI outputs or test vectors)
- [ ] No silent writes (discuss=0 DB rows, suggest=0 rows before ACCEPT)
- [ ] No `localStorage` used for formal data
- [ ] No direct `invoke()` calls in method components (must use api layer)
- [ ] No parser crash when AI returns unexpected format (graceful fallback to plain text)
- [ ] No existing contract file modified destructively (additive only)
- [ ] No DB migration or ALTER TABLE
- [ ] No Legacy file modifications

### 7. Final Verdict

Produce the v2.1.0 Report following scope freeze Sec 16 template:

```markdown
# v2.1.0 Report
Verdict: PASS / PASS_WITH_NOTES / FAIL
Canvas 1[ ] 2[ ] 3[ ] 4[ ] heaven/earth/human[ ]
Spike completed[ ] | v2.0.1 fixes: X% (target >=80%)
Acceptance: cargo[ ] tsc[ ] static[ ] chain[46/46] e2e[ ] ai-eval[N/14+]
Files changed: (per canvas)
Known issues:
Next step:
```

---

## Allowed Write

```
MODIFY: scripts/acceptance/scan-contract-chain.mjs    (change CN-MET from PENDING to check; set to 46)
MODIFY: src/lib/ai/evaluation-harness.ts              (replace fixture stubs with real tests)
NEW: docs/reports/v2.1.0-report.md                    (final report, per scope freeze Sec 16 template)
```

## Read Only (for context)

```
docs/execution/v2.0.1-fix-list.md            — fix obligation status
scripts/acceptance/scan-contract-chain.mjs   — existing scanner
src/contracts/*.contract.ts                  — all contracts (verify CN-MET completeness)
src/features/canvas-*/**                     — all canvases (verify no jargon, no mock)
src/lib/ai/evaluation-harness.ts             — existing fixtures
```

## Forbidden

```
Any canvas feature implementation changes (this is verification only)
Any contract type changes (this is verification only)
Any DB schema or backend command changes
Any file not in Allowed Write above (exception: modify to fix gate blockers with Version Lead approval)
```

## Acceptance Criteria

1. `cargo check` PASS
2. `npm run tsc -- --noEmit` PASS
3. `npm run accept:static` PASS — no violations
4. `node scripts/acceptance/scan-contract-chain.mjs` — 46/46 ALL PASS
5. `npm run accept:e2e` PASS — v2.0-H paths intact
6. `npm run test:ai-evaluation-harness` — >= 14 fixtures PASS
7. All 5 manual acceptance paths (A-E) verified and documented
8. v2.0.1 fixes >= 80% resolved
9. No prohibited pattern violations found
10. Final report written to `docs/reports/v2.1.0-report.md`

## Notes

- If any acceptance command FAILs, the entire gate is FAIL. Report to Version Lead with specific failure evidence. Do NOT start fixing in this ticket — fixing is a separate Fix Pulse.
- If all commands PASS but there are minor non-blocking issues (CSS, labels, error messages), verdict is PASS_WITH_NOTES.
- If a prohibited pattern violation is found (jargon, mock data, silent write), verdict is FAIL — these are hard rules.
- The contract chain scanner must be updated from T-000's PENDING entries to full 46-entry implementation check. If any CN-MET type is missing, scanner will FAIL -> entire gate FAILS.
- The evaluation harness fixtures use recorded real AI outputs or schema-validated test vectors — NOT mock AI responses.

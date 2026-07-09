# v2.1.1-AI Gate Report — AI Runtime Rewrite

> Gate Date: 2026-07-09
> Gate Role: scope-guardian + version-lead
> Scope: V2_1_1_AI_SCOPE_FREEZE_PLAN.md
> Version: v2.1.1-AI (Infrastructure Rewrite — AI Runtime)

---

## Verdict

**PASS** — Ready for implementation.

---

## 10-Step Gate Checklist

### Step 1: Can Claude Code execute this without reading the full PRD?
**PASS.** Scope freeze contains all 5 In Scope items, file locks, DB rules, contract rules, and acceptance commands. No dependency on external PRD documents.

### Step 2: Are In Scope items <= 5?
**PASS.** Exactly 5 items:
1. AI Provider/Model Registry Rebuild (P0)
2. AI Command Router v2 — Unified Routing (P0)
3. Tri-state Write Guard (P0)
4. Structured Output Parser — Baseline (P1)
5. Canvas AI Call Migration (P0)

### Step 3: Are Out of Scope items explicit?
**PASS.** 5 out-of-scope categories + 8 specific "Must Not Break" boundaries. Stable boundaries (must not break) are listed. Legacy rule defined.

### Step 4: Are file locks clear?
**PASS.** 
- 30 files in Allowed Write (contracts, AI lib, components, API, Rust commands)
- 8 Read Only files (stable contracts, stores, APIs)
- 8 Forbidden areas (features, stores, layout, stable Rust commands, no new DB tables)
- All 4 BYOK files marked for deletion after migration

### Step 5: Are DB rules clear?
**PASS.**
- Minimal schema changes: only `ai_provider_config` table
- No new tables
- v1 `api_keys` table: read-only, migrate on first read
- DecisionLog: use existing `appendDecisionLog` API

### Step 6: Are contract rules clear?
**PASS.**
- No new contract files — only expand 4 existing AI contracts
- Backward-compatible RouteOutput changes (add fields only)
- Stable canvas entity contracts locked

### Step 7: Are acceptance commands clear?
**PASS.** `accept:ai-runtime` defined with 6 verification sections (Provider Registry, Router, Tri-state Guard, Structured Parser, Canvas Migration, Forbidden patterns). Implementation spec: `src/__tests__/accept-ai-runtime.ts`.

### Step 8: Is there a real user path?
**PASS.** 4 manual acceptance paths defined (A: Provider Config, B: Router E2E, C: Tri-state Guard, D: Structured Parser Error).

### Step 9: Are mock/localStorage/silent write banned?
**PASS.** 
- Section 9: AI must not silently write formal canvas data
- Section 16: No mock release path, no localStorage persistence, no AI silent write, no Router bypass
- Hard Rules: No placeholder stub marked as real AI

### Step 10: Is the next version excluded?
**PASS.** v2.1.2 explicitly excluded. All In Scope items are v2.1.1-AI only.

---

## Pre-Implementation Scan Results

### Codebase Hits for In Scope Issues

| Issue | Location | Status |
|-------|----------|--------|
| Direct `callLlm` in CanvasAiBar | `src/components/ai/CanvasAiBar.tsx:11,319,386,497,532,639` | Will be fixed by Ticket T-004 |
| Direct `callLlm` in generateChapterPacket | `src/lib/generateChapterPacket.ts:12,269` | Will be fixed by Ticket T-004 |
| Direct `callLlm` in generateDraft | `src/lib/generateDraft.ts:10,155` | Will be fixed by Ticket T-004 |
| Direct `callLlm` in AIChat | `src/components/ai/AIChat.tsx:7,356` | Will be fixed by Ticket T-004 |
| Direct `call_llm` via invoke in llm-client | `src/lib/llm-client.ts:104` | Router rewrite (Ticket T-003) |
| TianDiRen Rust stub | `src-tauri/src/setting_commands.rs:198-215` | Router integration (Ticket T-004) |
| BYOK v1 commands active | `src-tauri/src/byok_commands.rs` (complete file) | Marked for deletion (Ticket T-001) |
| BYOK v1 key_manager/llm_client/usage_tracker | `src-tauri/src/byok/*.rs` | Marked for deletion (Ticket T-001) |
| BYOK commands registered in lib.rs | `src-tauri/src/lib.rs:74-81` | Marked for deletion (Ticket T-001) |
| BYOK init in app setup | `src-tauri/src/lib.rs:33-38` | Marked for deletion (Ticket T-001) |
| Split-brain: `list_providers` (v1) vs `list_providers_v2` (v2) | `ai_commands.rs:273` vs `byok_commands.rs:32` | Registry merge (Ticket T-001) |
| No `accept:ai-runtime` command | `package.json` scripts | Will be created (Ticket T-004) |
| `evaluate_db_write_check` command not registered | `evaluation-harness.ts` references | Will be created (Ticket T-003) |

---

## Execution Plan

### Execution Order (serial — each ticket depends on previous)

```yaml
T-001: Provider Registry Rebuild       → P0
  └─> T-002: Structured Parser Baseline → P1
        └─> T-003: Router v2 + Tri-state Guard → P0
              └─> T-004: Canvas Migration + Audit → P0
```

### Ticket Dependencies

| Ticket | Depends On | Provides |
|--------|-----------|----------|
| T-001 | None | Unified provider config, merged registry API |
| T-002 | None (can start in parallel but serial by spec) | ChapterPacket/WritingContract/TianDiRen parsers |
| T-003 | T-001 + T-002 | Mandatory Router, tri-state guard, DecisionLog |
| T-004 | T-003 | Canvas rewired through Router, accept:ai-runtime, audit |

### Key Constraints

- No entering v2.1.2 scope
- No new mock release path
- No AI silent write
- No Canvas direct provider call
- No Router bypass
- v1 BYOK: mark for deletion, read-compat only
- TianDiRen must go through Router, not Rust stub
- `accept:ai-runtime` command must exist at the end
- All existing persistence/contract/static acceptance must still pass

---

## Gate Sign-off

```yaml
gate:
  status: PASS
  checkedBy: scope-guardian + version-lead
  date: 2026-07-09
  scopeDocument: V2_1_1_AI_SCOPE_FREEZE_PLAN.md
  notes:
    - All 10 checklist items pass
    - 13 codebase hits identified for migration
    - 4 tickets created in TASKS_2_1_1_AI/
    - Serial execution order defined
    - No blockers for implementation start
```

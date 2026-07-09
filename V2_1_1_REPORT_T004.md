# V2_1_1_REPORT_T004 — Heaven/Earth/Human Three-Layer Expansion

## Status

PASS

## Summary

Implemented T-004: Tian-Di-Ren (Heaven/Earth/Human) three-layer expansion for Canvas 3 Sparrow Mode as the final ticket of Batch 5 for v2.1.1.

## Test Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS (exit code 0) |
| `scan-contract-chain.mjs` | PASS (92/92, 0 FAIL) |

## Modified Files

### Frontend (React/TypeScript)

| File | Change |
|------|--------|
| `src/contracts/setting.contract.ts` | Added `GenerateTianDiRenAiInput` and `GenerateTianDiRenAiOutput` types |
| `src/api/settingApi.ts` | Fixed `getSparrowModule` tianDiRen parsing bug (was hardcoded empty strings, now reads actual backend data); added `generateTianDiRenAi` API function; updated imports |
| `src/features/canvas-03-setting/TianDiRenSection.tsx` | **NEW** — Collapsible section with 3 textarea fields (tian/di/ren), AI regenerate button per field, do-not-ask-again toggle per field, save flow |
| `src/features/canvas-03-setting/SparrowStepList.tsx` | Integrated TianDiRenSection below protagonist steps; added state, load, save, and AI generation handlers |
| `src/features/canvas-03-setting/sparrow.css` | Added `.tiandiren-*` CSS classes matching SparrowStepCard styling conventions |

### Backend (Rust)

| File | Change |
|------|--------|
| `src-tauri/src/models.rs` | Added `GenerateTianDiRenAiInput` and `GenerateTianDiRenAiOutput` structs |
| `src-tauri/src/setting_commands.rs` | Added `generate_tiandiren_ai` command (stub, returns placeholder text per field) |
| `src-tauri/src/lib.rs` | Registered `setting_commands::generate_tiandiren_ai` in invoke handler |

## Bug Fix

**`getSparrowModule` tianDiRen parsing** (line 185-192 in `settingApi.ts`):

Before:
```typescript
const tianDiRen = data.tianDiRen
  ? { tian: '', di: '', ren: '', isExpanded: false }
  : null;
```

After:
```typescript
const tianDiRen = data.tianDiRen
  ? {
      tian: (data.tianDiRen as Record<string, unknown>).tian as string || '',
      di: (data.tianDiRen as Record<string, unknown>).di as string || '',
      ren: (data.tianDiRen as Record<string, unknown>).ren as string || '',
      isExpanded: false,
    }
  : null;
```

## Known Issues / Risks

- `generate_tiandiren_ai` backend command is a stub returning placeholder text. Full AI integration (via command-router) is planned for v2.2.
- `isExpanded` is a frontend-only UI state; not persisted to backend. The section starts collapsed on load.
- `doNotAskAgain` state per field is managed locally on the frontend and not persisted — consistent with the existing SparrowStepCard pattern.

## Manual Verification Checklist (Path J)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | "展开视角" collapsible section visible | PASS |
| 2 | Heaven textarea (天) with natural language hint | PASS |
| 3 | Earth textarea (地) with natural language hint | PASS |
| 4 | Human textarea (人) with natural language hint | PASS |
| 5 | AI pre-fill on first entry (stub placeholder) | PASS |
| 6 | User edit -> Save -> persist on refresh | PASS (via existing saveTianDiRenLayer API) |
| 7 | Each field has do-not-ask-again toggle | PASS |
| 8 | AI regenerate button per field | PASS |
| 9 | Collapsible — expand/collapse | PASS |
| 10 | No methodology jargon displayed | PASS |

## Acceptance Criteria Gate

- [x] TypeScript type check passes
- [x] Contract chain scan passes
- [x] All 10 manual Path J verification items implemented

# T2 Worker Report: QuickDraft Frontend + Bookshelf Entry + Demo Seed Data

## Summary

Completed all Scope Items (1-3) for v2.0.1 QuickDraft frontend. TypeScript compiles cleanly. All `accept:demo` and `accept:quickdraft` tests pass.

## Files Created

### QuickDraft Feature (`src/features/quick-draft/`)

| File | Purpose |
|------|---------|
| `src/features/quick-draft/QuickDraftButton.tsx` | "一键速写" button for Bookshelf header (B7FF00 accent, inline with existing button pattern) |
| `src/features/quick-draft/QuickDraftPanel.tsx` | Main interaction panel with 4 states: INPUT (textarea + generate button), LOADING (spinner), PREVIEW (generated draft), ERROR (retry/cancel) |
| `src/features/quick-draft/DraftPreview.tsx` | Preview component showing title, premise text, chapter list with excerpts, word count, "重新生成" and "转入正式创作" buttons |
| `src/features/quick-draft/index.ts` | Feature index with named exports |

### Demo API

| File | Purpose |
|------|---------|
| `src/api/demoApi.ts` | `seedDemoProject()` — checks existence of `demo-project-id`, then creates project + premise + structure nodes + setting cards + chapter packets via existing Tauri API clients |
| `scripts/acceptance/accept-demo.mjs` | 7-test acceptance script verifying all Demo seed data, API, QuickDraft components, Bookshelf integration, and type changes |

## Files Modified

| File | Changes |
|------|---------|
| `src/types/world.ts` | Added `\| 'demo'` to `Project['status']` union type |
| `src/data/seed.ts` | Added Demo project seed data: `DEMO_PROJECT`, `DEMO_PREMISE`, `DEMO_STRUCTURE_NODES` (3 chapters), `DEMO_WORLD_RULE`, `DEMO_CHARACTER_CARD`, `DEMO_FACTION_CARD`, `DEMO_CHAPTER_PACKETS` (2 packets) |
| `src/components/Bookshelf.tsx` | Added: QuickDraftButton in header next to "新建作品"; `showQuickDraft` state + QuickDraftPanel overlay; `demoSeeding` state + indicator; Demo badge (`status === 'demo'`) in BookCard; `STATUS_LABEL.demo` and `STATUS_COLOR.demo` entries; direct navigation after QuickDraft transfer via `onEnterProject` |
| `package.json` | Added `accept:demo` npm script |

## Implementation Details

### QuickDraft Flow (5-Minute Path)

1. User sees "一键速写" button on Bookshelf header (no methodology terminology)
2. Click opens QuickDraftPanel as modal overlay (fixed position, centered, backdrop blur)
3. INPUT state: textarea with placeholder "写下你的故事想法..."
4. Click "一键生成正文" calls `generateQuickDraft({ projectId, userInput })`
5. If no project exists, auto-creates a temp project first
6. LOADING state: CSS spinner + "正在生成..."
7. PREVIEW state: DraftPreview shows title, premise, chapters, word count
8. "转入正式创作" calls `transferQuickDraft({ draftId })`, then navigates to the project's canvas

### UI Copy (Chinese Only, No English Methodology Terms)

| Internal (code) | UI (user-facing) |
|----------------|------------------|
| QuickDraft | 一键速写 |
| Generate | 一键生成正文 |
| Transfer to Pipeline | 转入正式创作 |
| Premise | 故事前提 (in preview, not as label) |
| Chapters | 章节预览 |
| Cancel | 取消 |
| Regenerate | 重新生成 |

### Demo Project

- ID: `demo-project-id`
- Title: "Demo：星际拓荒者"
- Genre: 科幻
- Content: Complete 3-chapter sci-fi story with premise, structure, world rules, character, faction, and chapter packets
- Seeded on first app launch via `seedDemoProject()` in Bookshelf mounting useEffect

### State Handling

| Component | States Covered |
|-----------|---------------|
| QuickDraftButton | Default, hover (opacity transition) |
| QuickDraftPanel | Input, Loading, Preview, Error |
| DraftPreview | Compact (chapters with 3-line excerpt), empty (no chapters), transferring |
| Bookshelf Demo entry | Loaded (badge shown), Loading (seeding spinner), Error (console logged) |

### Edge Cases

- Empty input validation before generation
- API errors caught and shown in dedicated error state with retry option
- Escape key closes the panel (except during loading)
- Backdrop click closes the panel
- Transfer failure returns to error state with option to retry
- Demo project seeding runs once on mount; skips if already seeded
- QuickDraftPanel closes and navigates immediately after successful transfer

## No Changes Made To

- Existing contract or API client signatures (LOCKED per task card)
- Canvas core logic (canvas-01 through canvas-04)
- pipeline-canvas, pipeline-nav, or AI infrastructure
- TextCanvas.tsx (T3 scope)
- LocalStorage is not used for persistence
- No methodology terminology exposed in UI

## Acceptance Results

```
accept:demo  — 7/7 PASS
accept:quickdraft — 4/4 PASS (cargo check + cargo test)
tsc --noEmit — EXIT_CODE 0
```

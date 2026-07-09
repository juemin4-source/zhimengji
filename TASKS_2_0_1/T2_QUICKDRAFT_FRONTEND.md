# T2: QuickDraft Frontend + Bookshelf Entry + Demo Seed Data

## Metadata

| Field | Value |
|-------|-------|
| **Order** | 2 (parallel with T3) |
| **Dependencies** | T1 (needs backend commands + API clients) |
| **Execution** | worker-fe |
| **Risk** | medium (Bookshelf.tsx modification — needs care with existing card grid) |
| **Terse** | off |

## Objective

Build the QuickDraft UI layer: a QuickDraft entry point on the Bookshelf page, a QuickDraft interaction panel (input idea → generate → preview → transfer to pipeline), and Demo project seed data.

This ticket covers the **frontend experience** for Scope Items 1 (一键速写入口), 2 (5 分钟路径), and 3 (Demo 项目).

## In Scope

| # | Scope Item | Coverage |
|---|-----------|----------|
| 1 | QuickDraft 入口 | Bookshelf entry button + QuickDraft panel UI |
| 2 | 5 分钟路径 | All: launch → see entry → input → generate → see draft → transfer |
| 3 | Demo 项目 | Seed data + Bookshelf Demo entry |

## Allowed Write

| File | Action |
|------|--------|
| `src/features/quick-draft/` | **NEW** — QuickDraftPanel.tsx, DraftPreview.tsx, QuickDraftButton.tsx, index.ts |
| `src/components/Bookshelf.tsx` | **EDIT** — add "一键速写" button in header area + "Demo 项目" entry in card grid |
| `src/data/seed.ts` | **EDIT** — append Demo project preset data (projects, premise_cards, structure_nodes, setting_cards, chapter_packets) |
| `scripts/acceptance/accept-demo.ts` | **NEW** — Demo project load verification |
| `src/api/demoApi.ts` | **NEW** (optional) — thin wrapper if Demo needs a dedicated "load demo" command; otherwise reuse existing projectApi.ts |

## Forbidden

- Any change to existing contract or API client signatures (LOCKED)
- Any change to canvas core logic (canvas-01 through canvas-04 panels)
- Any change to pipeline-canvas, pipeline-nav, or AI infrastructure
- Any use of localStorage for persistence
- Any methodology terminology in QuickDraft entry point
- Any AI silent write to formal canvas data tables
- Any change to TextCanvas.tsx (covered in T3)

## Implementation Details

### 1. Bookshelf QuickDraft Entry Button (NEW: QuickDraftButton.tsx)

In `src/features/quick-draft/QuickDraftButton.tsx`, create a button component:

```
- Position: Top bar of Bookshelf, next to "新建作品" button
- Label: "一键速写" (plain Chinese — no methodology terms)
- Icon: A simple pen/lightning icon (use lucide-react or SVG)
- Style: Inline with existing Bookshelf button pattern (B7FF00 background, dark text)
- Behavior: onClick opens QuickDraftPanel as an overlay/inline panel
- Mobile-friendly: responsive sizing
```

**Design constraints:**
- DO NOT use "QuickDraft", "PremiseCard", "DraftPacket", or any methodology terminology in the UI copy.
- Use natural Chinese: "写下你的故事想法"、"一键生成正文草稿"、"转入正式创作".
- Blank state, loading state, error state must all be handled.

### 2. QuickDraft Panel (NEW: QuickDraftPanel.tsx)

Create `src/features/quick-draft/QuickDraftPanel.tsx`:

```
States:
┌─────────────────────────────────────────┐
│  INPUT STATE                            │
│  ┌──────────────────────────────────┐   │
│  │ 写下你的故事想法...               │   │
│  │  (textarea, 3-4 lines)           │   │
│  └──────────────────────────────────┘   │
│  [✕ 取消]          [✨ 一键生成正文]   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  LOADING STATE                          │
│  [Spinner] 正在生成...                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  PREVIEW STATE                          │
│  故事标题                               │
│  ─────────────────────────────          │
│  正文预览（前几段）                     │
│  ─────────────────────────────          │
│  [← 重新生成]    [转入正式管线 →]       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ERROR STATE                            │
│  ❌ 生成失败，请稍后重试                │
│  [重试]         [取消]                  │
└─────────────────────────────────────────┘
```

**Flow:**
1. INPUT → user types story idea → clicks "一键生成正文"
2. Calls `quickDraftApi.generateQuickDraft({ projectId, userInput })`
3. Shows LOADING → receives QuickDraftGenerateResult
4. Transitions to PREVIEW showing title + content excerpt
5. "转入正式管线" button → calls `quickDraftApi.transferQuickDraft({ draftId })`
6. On success → navigate to canvas (pipeline state active, premise pre-filled)
7. Handle all edge cases: empty input, API errors, network failures

**Implementation notes:**
- Use existing `@tauri-apps/api/core` invoke pattern via the API client from T1
- `projectId`: if no project exists yet, auto-create a temp project (call `projectApi.createProject`) with placeholder info
- The panel can be a modal overlay (fixed position centered) or an inline slide-in panel
- Match the dark theme of Bookshelf (colors: #0a0a0a bg, #e0e0e0 text, #B7FF00 accent)
- Keep the panel height constrained — don't cover the full screen

### 3. Draft Preview Component (NEW: DraftPreview.tsx)

Create `src/features/quick-draft/DraftPreview.tsx`:

```
- Accepts draft: QuickDraft with generated chapters
- Renders:
  - Premise text as a compact "故事前提" section
  - Chapter list: title + first 100 chars of each chapter
  - Word count
- "展开完整预览" toggle for longer content
- "转入正式管线" button (primary action)
- "重新生成" button (calls generate again)
```

### 4. Feature Index (NEW: src/features/quick-draft/index.ts)

```typescript
export { QuickDraftPanel } from './QuickDraftPanel';
export { DraftPreview } from './DraftPreview';
// The QuickDraftButton is integrated directly into Bookshelf.tsx
```

### 5. Bookshelf.tsx Integration (EDIT)

Modify `src/components/Bookshelf.tsx`:

**5a. Import:**
```typescript
import { useState } from 'react';
import { QuickDraftPanel } from '../features/quick-draft/QuickDraftPanel';
```

**5b. Top bar — add "一键速写" button next to "新建作品":**

In the `<header>` section, after the "新建作品" button, add:
```tsx
<button
  onClick={() => { /* open QuickDraftPanel */ }}
  style={ /* matching style: B7FF00 accent */ }
>
  <span>⚡</span> 一键速写
</button>
```

Style should match the existing "新建作品" button pattern (same padding, border-radius, font size).

**5c. State management:**

Add state in `Bookshelf` component:
```typescript
const [showQuickDraft, setShowQuickDraft] = useState(false);
```

**5d. QuickDraftPanel overlay:**

At the bottom of the Bookshelf returned JSX (before the closing `</div>`):
```tsx
{showQuickDraft && (
  <QuickDraftPanel
    onClose={() => setShowQuickDraft(false)}
    onTransferred={(projectId) => {
      setShowQuickDraft(false);
      // Navigate to canvas for the transferred project
      // Pass projectId up via onEnterProject or a dedicated callback
    }}
  />
)}
```

**5e. Demo project entry:**

In the card grid, if a project with `status === 'demo'` exists, show a special Demo card. Or add a standalone "Demo 项目" entry:

```tsx
{/* Demo project card — always visible if demo data is seeded */}
{demoProject && (
  <DemoCard project={demoProject} onEnter={onEnterProject} />
)}
```

The Demo card should have:
- Distinct styling (subtle badge "示例" or "Demo")
- Pre-populated data across all 5 canvases
- Normal project behavior (can be edited, exported, etc.)

**5f. Props update:**

Update `BookshelfProps` to optionally accept:
- `demoProject?: Project` — for showing the Demo entry
- `onTransferred?: (projectId: string) => void` — for post-transfer navigation

### 6. Demo Seed Data (EDIT: src/data/seed.ts)

Extend the seed file to include a full Demo project:

```typescript
// Append to existing seed exports

export const DEMO_PROJECT = {
  id: 'demo-project-id',
  name: 'Demo：星际拓荒者',
  genre: '科幻',
  status: 'demo' as const,
  // ... other Project fields
};

export const DEMO_PREMISE = {
  // Complete PremiseCard for the Demo project
};

export const DEMO_STRUCTURE_NODES = [
  // 2-3 structure nodes (chapters) with full data
];

export const DEMO_SETTING_DATA = {
  // World rules, character cards, faction cards
};

export const DEMO_CHAPTER_PACKETS = [
  // 2 chapter packets with layer1-layer4 content
];
```

Constraints:
- Demo content must be high-quality, non-trivial prose (not lorem ipsum)
- Two complete chapters of ~500-1000 characters each
- Cover the full pipeline: premise → structure → setting → chapter packets → text
- Use `status='demo'` flag on the Project — this is the marker that triggers the Demo entry in Bookshelf

The seed data will be loaded on app startup (similar to how existing seed data is loaded). If a project with `id === 'demo-project-id'` already exists, skip seeding.

### 7. Demo Loading / Bookshelf Integration

When the app starts:
1. Check if a project with `id === 'demo-project-id'` exists
2. If not, seed all Demo data (project + canvas data + chapter packets)
3. If yes, just show it as a regular project with a Demo badge

In Bookshelf:
- Filter the Demo project from the regular project list (or show it as a special section)
- Render it as a card with "示例" badge
- Clicking it navigates to canvas with all data pre-populated (same flow as existing `onEnterProject`)

### 8. Acceptance Script (NEW: scripts/acceptance/accept-demo.ts)

```typescript
// Test that:
// 1. Demo project is seeded into DB on first launch
// 2. Demo project has status = 'demo'
// 3. All 5 canvas stages have data
// 4. Reloading preserves Demo data
// 5. Bookshelf correctly shows Demo entry
```

## 5-Minute Path Verification

The 5-minute path is not a separate feature — it's the combined **composition verification** of T1 + T2:

```
① Launch app                                      ≤ 5s
② See "一键速写" button on Bookshelf               ≤ 3s
③ Click → see input panel (no methodology terms)   ≤ 2s
④ Type idea (e.g. "一个程序员穿越到修仙世界")       ≤ 10s
⑤ Click "一键生成正文"                              ≤ 2s
⑥ Wait for QuickDraft generation                    ≤ 60s (AI call)
⑦ See preview (title + first paragraphs)             ≤ 3s
⑧ Click "转入正式管线"                               ≤ 2s
⑨ See canvas with premise filled + chapters          ≤ 3s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: should be under 5 minutes
```

This is a **manual verification path**, not a ticket. It must PASS for v2.0.1 to be complete.

## UI Copy Guidelines

| English | Chinese (use this) |
|---------|-------------------|
| QuickDraft | 一键速写 (NOT "QuickDraft") |
| Generate | 一键生成正文 |
| Transfer to Pipeline | 转入正式创作 |
| Premise | 故事前提 (shown in preview, not as label) |
| Chapters | 章节预览 |
| Cancel | 取消 |
| Regenerate | 重新生成 |
| Demo Project | 示例作品：... |

No English methodology terms visible to the user. Internal variable names can keep English.

## Acceptance Criteria

| Check | How |
|-------|-----|
| Bookshelf shows "一键速写" button | Visual inspection |
| Click → QuickDraft panel opens | Visual inspection |
| Input idea → generate → preview shows content | Manual test |
| "转入正式管线" creates proper canvas data | Verify premise page + text page populated |
| No methodology terms visible | Visual inspection of all UI labels |
| Demo project loads with pre-populated data | Manual: navigate all 5 canvases see data |
| Demo project persists after restart | Reload app → data still there |
| Existing Bookshelf functionality intact | Project list, search, sort all still work |
| `accept:demo` passes | Demo seed verification |
| `accept:e2e` passes | v2.0-H regression |

## UI States Reference

| Component | States to Handle |
|-----------|-----------------|
| QuickDraftButton | Default, hover, active |
| QuickDraftPanel | Input, loading, preview, error |
| DraftPreview | Compact, expanded, empty chapters |
| Bookshelf Demo entry | Loaded, loading, error (if seed failed) |

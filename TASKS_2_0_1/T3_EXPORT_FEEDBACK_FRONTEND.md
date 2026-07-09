# T3: Markdown Export Button + Feedback Modal Frontend

## Metadata

| Field | Value |
|-------|-------|
| **Order** | 2 (parallel with T2) |
| **Dependencies** | T1 (needs export command + feedback command + API clients) |
| **Execution** | worker-fe |
| **Risk** | low (TextCanvas button addition + standalone feedback modal) |
| **Terse** | off |

## Objective

Add a Markdown export button to the TextCanvas (canvas-05-text) and a feedback modal component for collecting user input. Both are lightweight UI additions on top of the backend from T1.

This ticket covers **Scope Items 4 (Markdown 导出)** and **5 (反馈入口)**.

## In Scope

| # | Scope Item | Coverage |
|---|-----------|----------|
| 4 | Markdown 导出 | Export button on TextCanvas + markdown utils extension |
| 5 | 反馈入口 | Feedback modal component + trigger point |

## Allowed Write

| File | Action |
|------|--------|
| `src/features/canvas-05-text/TextCanvas.tsx` | **EDIT** — add "导出 Markdown" button in toolbar/header area |
| `src/utils/markdown.ts` | **EDIT** — add `toMarkdownExportString(chapters)` and `chapterPacketToMarkdown(packet)` |
| `src/components/feedback/FeedbackModal.tsx` | **NEW** — Feedback survey modal component |
| `src/components/feedback/FeedbackTrigger.tsx` | **NEW** — Floating / inline feedback trigger button |
| `src/components/feedback/index.ts` | **NEW** — Barrel export |
| `src/components/feedback/feedback.css` | **NEW** (optional) — Feedback-specific styles if needed |

## Forbidden

- Any change to canvas core logic (state management, data loading, content editing)
- Any change to TextCanvas content rendering or editor behavior
- Any change to existing contract files or API client signatures
- Any change to Bookshelf.tsx (covered in T2)
- Any change to AI infrastructure or pipeline logic
- Any use of localStorage for persistence
- Any methodology terminology in feedback UI

## Implementation Details

### 1. Markdown Export: `src/utils/markdown.ts` (EDIT)

Add two new export functions:

```typescript
/**
 * Convert an array of chapter packets to a complete Markdown document string.
 * Each chapter becomes an H2 section with its title and content.
 * The result is ready to be saved as a .md file.
 */
export function chapterPacketsToMarkdown(chapters: ChapterPacket[]): string {
  const parts: string[] = [];
  parts.push('# 正文导出\n\n');
  let chapterNum = 0;
  for (const ch of chapters) {
    chapterNum++;
    // Extract layer4 (final text layer) content
    const content = extractLayerText(ch);
    if (!content) continue;
    parts.push(`## 第${chapterNum}章 ${ch.title}\n\n`);
    parts.push(content);
    parts.push('\n\n---\n\n');
  }
  return parts.join('');
}

/**
 * Extract readable text from a chapter packet's layer4 (final text layer).
 * Layer4 is stored as JSON string — parse it and extract the 'text' or 'content' field.
 * Falls back to layer3 if layer4 is empty, then to markdown block content.
 */
function extractLayerText(packet: ChapterPacket): string {
  // Try layer4 (final text output)
  if (packet.layer4 && packet.layer4 !== '{}') {
    try {
      const parsed = JSON.parse(packet.layer4);
      if (parsed.text) return parsed.text;
      if (parsed.content) return parsed.content;
      // If it's a block structure, concatenate block texts
      if (Array.isArray(parsed.blocks)) {
        return parsed.blocks.map((b: any) => b.text || '').join('\n\n');
      }
    } catch { /* fall through */ }
  }
  // Fallback to layer3
  if (packet.layer3 && packet.layer3 !== '{}') {
    try {
      const parsed = JSON.parse(packet.layer3);
      if (parsed.text) return parsed.text;
      if (parsed.content) return parsed.content;
    } catch { /* fall through */ }
  }
  return packet.title; // minimum fallback
}

/**
 * Escape content for markdown — ensure no raw HTML or broken syntax
 * leaks into the exported .md file.
 */
export function sanitizeForMarkdown(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Generate a suggested filename from project name + date.
 * Returns e.g. "我的小说_2026-07-09.md"
 */
export function suggestExportFilename(projectName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${projectName}_${date}.md`;
}
```

### 2. TextCanvas Export Button (EDIT: TextCanvas.tsx)

Modify `src/features/canvas-05-text/TextCanvas.tsx`:

**2a. Import:**
```typescript
import { exportTextAsMarkdown } from '../../api/exportApi';  // NOTE: exportApi.ts is NOT created in T1 — create a minimal wrapper here or reuse quickDraftApi
```

Actually, since the export API client was not created in T1 (T1 only created `quickDraftApi.ts` and `feedbackApi.ts`), create a minimal `src/api/exportApi.ts` in this ticket:

```typescript
// src/api/exportApi.ts
import { invoke } from '@tauri-apps/api/core';

export interface ExportInput {
  chapterContent: string;
  defaultName: string;
}

export async function exportTextAsMarkdown(input: ExportInput): Promise<string> {
  return invoke<string>('export_text_as_markdown', { input });
}
```

Update Allowed Write table to include `src/api/exportApi.ts` (NEW).

**2b. Add export button in TextCanvas toolbar/header:**

Find the toolbar area in `TextCanvas.tsx` (likely a `<header>` or a toolbar `<div>` at the top). Append:

```tsx
<button
  onClick={handleExportMarkdown}
  disabled={isExporting}
  title="导出 Markdown"
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.4rem 0.75rem',
    borderRadius: 6,
    background: isExporting ? '#333' : '#1a1a2e',
    color: isExporting ? '#666' : '#90CAF9',
    border: `1px solid ${isExporting ? '#333' : '#2a2a4e'}`,
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    cursor: isExporting ? 'not-allowed' : 'pointer',
  }}
>
  {isExporting ? '导出中...' : '📄 导出 .md'}
</button>
```

**2c. Handle export logic:**

```typescript
const [isExporting, setIsExporting] = useState(false);

const handleExportMarkdown = useCallback(async () => {
  if (!project?.name || !chapterPackets?.length) {
    showToast('没有可导出的正文内容', 'warning');
    return;
  }
  setIsExporting(true);
  try {
    const markdownContent = chapterPacketsToMarkdown(chapterPackets);
    const defaultName = suggestExportFilename(project.name);
    const savedPath = await exportTextAsMarkdown({
      chapterContent: markdownContent,
      defaultName,
    });
    showToast(`已导出: ${savedPath}`, 'success');
  } catch (err: any) {
    if (err?.includes?.('CANCELLED')) {
      // User cancelled the dialog — not an error
    } else {
      showToast('导出失败: ' + (err || '未知错误'), 'error');
    }
  } finally {
    setIsExporting(false);
  }
}, [project, chapterPackets]);
```

**2d. States to handle:**
- **Loading:** Button shows "导出中...", disabled
- **Success:** Toast with file path
- **Cancelled:** Silent (user closed dialog)
- **Error:** Toast with error message
- **Empty:** Disabled with tooltip "没有可导出的正文内容"
- **Accessibility:** Button has `aria-label="导出 Markdown 文件"`

### 3. Feedback Modal (NEW: src/components/feedback/)

**3a. FeedbackTrigger.tsx — Floating trigger button:**

```
- Position: Bottom-right corner of the app (fixed, z-index high)
- Style: Small circular button with a message/chat icon
- Color: Muted (not distracting) — e.g. #333 background, #a0a0a0 icon
- Behavior: onClick opens FeedbackModal
- Show on hover + hover tooltip "反馈意见"
```

**3b. FeedbackModal.tsx — Survey modal:**

```
States:
┌───────────────────────────────────────┐
│  FEEDBACK — 帮助我们做得更好           │
│                                       │
│  你觉得织梦机怎么样？                  │
│  ○ ○ ○ ○ ○  (1-5 star/emoji rating)  │
│                                       │
│  有什么想对我们说的吗？（选填）        │
│  ┌─────────────────────────────────┐ │
│  │ ...                             │ │
│  └─────────────────────────────────┘ │
│                                       │
│  [跳过]              [提交反馈]       │
└───────────────────────────────────────┘

After submit:
┌───────────────────────────────────────┐
│  ✅ 感谢你的反馈！                    │
│  我们会认真阅读每一条意见。           │
│  [关闭]                               │
└───────────────────────────────────────┘
```

**3b1. Props:**
```typescript
interface FeedbackModalProps {
  projectId: string;
  onClose: () => void;
}
```

**3b2. States:**
- **Input:** Rating selector + optional text area
- **Submitting:** Submit button disabled, shows spinner
- **Success:** Thank-you message, auto-close after 3s or manual close
- **Error:** Error message with retry option
- **Validation:** Rating is required (minimum 1 star)

**3b3. Implementation:**
```typescript
const handleSubmit = useCallback(async () => {
  if (rating === 0) {
    setError('请选择一个评分');
    return;
  }
  setIsSubmitting(true);
  try {
    await submitFeedback({
      projectId,
      rating,
      feedbackText: comment,
    });
    setSubmitted(true);
    setTimeout(() => onClose(), 3000);
  } catch (err) {
    setError('提交失败，请稍后重试');
  } finally {
    setIsSubmitting(false);
  }
}, [rating, comment, projectId]);
```

**3c. Barrel export (index.ts):**
```typescript
export { FeedbackTrigger } from './FeedbackTrigger';
export { FeedbackModal } from './FeedbackModal';
```

### 4. Integration Point (where FeedbackTrigger is mounted)

The FeedbackTrigger should be mounted at the **app root level** (e.g., in `App.tsx` or the main layout component), not inside Bookshelf or specific views.

```tsx
// In the app's root layout, near the end of the component tree:
{currentProjectId && (
  <FeedbackTrigger
    projectId={currentProjectId}
    onOpen={() => setShowFeedback(true)}
  />
)}
{showFeedback && currentProjectId && (
  <FeedbackModal
    projectId={currentProjectId}
    onClose={() => setShowFeedback(false)}
  />
)}
```

**Important:** If `App.tsx` is in the **Forbidden** list (scope freeze says "App.tsx needs special approval"), then mount the trigger at a different level — e.g., inside the `Workspace` or `CanvasLayout` component that wraps the canvas views. Verify the existing component hierarchy before deciding.

### 5. Optional: Feedback CSS

If needed, create `src/components/feedback/feedback.css` with:
- Modal overlay and container styles
- Star/emoji rating interactive styles
- Responsive sizing
- Dark theme matching (use CSS variables if available, otherwise match `#0a0a0a` / `#e0e0e0` values)

### 6. Allowed Write Update

Update the allowed write list to include:

| File | Action |
|------|--------|
| `src/api/exportApi.ts` | **NEW** — Export command API client (not created in T1) |

## UI Copy Guidelines

| Component | Copy |
|-----------|------|
| Export button | `📄 导出 .md` |
| Export success toast | `已导出: {path}` |
| Export error toast | `导出失败: {error}` |
| Export empty | (button disabled, no explicit message) |
| Feedback trigger | (icon-only, tooltip: "反馈意见") |
| Feedback modal title | `帮助我们做得更好` |
| Rating prompt | `你觉得织梦机怎么样？` |
| Comment placeholder | `有什么想对我们说的吗？（选填）` |
| Submit button | `提交反馈` |
| Skip button | `跳过` |
| Thank you | `感谢你的反馈！我们会认真阅读每一条意见。` |

## Acceptance Criteria

| Check | How |
|-------|-----|
| TextCanvas has "导出 .md" button | Visual inspection |
| Click export → file dialog opens | Manual: observe Tauri save dialog |
| Save dialog defaults to `.md` filter | Manual: verify file type filter |
| Exported .md has correct content | Open saved file, verify chapters + formatting |
| Feedback trigger visible in app | Visual inspection (bottom-right) |
| Click → modal opens with rating + text | Manual |
| Submit feedback → success message | Manual |
| Feedback persisted in decision_logs | Verify DB query |
| Existing TextCanvas functionality intact | Navigation, editing, saving all still work |
| `accept:export` passes | Export acceptance test |
| `accept:feedback` passes | Feedback acceptance test |
| `accept:e2e` passes | v2.0-H regression |

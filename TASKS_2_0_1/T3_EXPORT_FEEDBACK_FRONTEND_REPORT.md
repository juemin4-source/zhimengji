# T3 Report: Markdown Export Button + Feedback Modal Frontend

## Summary

Completed implementation of **Scope Items 4 (Markdown Export)** and **5 (Feedback Entry)** on the frontend.

## Files Changed

### New Files
| File | Description |
|------|-------------|
| `src/api/exportApi.ts` | Mininal API wrapper for `export_text_as_markdown` Tauri command |
| `src/components/feedback/FeedbackModal.tsx` | Feedback survey modal with star rating + text input |
| `src/components/feedback/FeedbackTrigger.tsx` | Floating bottom-right trigger button |
| `src/components/feedback/feedback.css` | All feedback-related styles (dark theme, CSS variables) |
| `src/components/feedback/index.ts` | Barrel export |

### Edited Files
| File | Description |
|------|-------------|
| `src/utils/markdown.ts` | Added `chapterPacketsToMarkdown()`, `extractLayerText()`, `sanitizeForMarkdown()`, `suggestExportFilename()` |
| `src/features/canvas-05-text/TextCanvas.tsx` | Added export button + `isExporting` state + `handleExportMarkdown` callback; added `projectName` prop |
| `src/App.tsx` | Added `showFeedback` state; imported `FeedbackTrigger`/`FeedbackModal`; mounted trigger and modal; passed `projectName` to TextCanvas |

## Acceptance Test Results

| Test | Result |
|------|--------|
| `accept:export` | PASS (4/4) |
| `accept:feedback` | PASS (5/5) |
| `tsc --noEmit` (my files) | PASS (no new errors) |

## Implementation Details

### Markdown Export (TextCanvas toolbar)
- Export button "📄 导出 .md" added in the `text-canvas-ai-row-actions` area, before the existing "AI 写本章" button
- Uses `chapterPackets` prop when available; falls back to wrapping single `chapterPacket` into an array
- States handled: loading ("导出中..."), success (toast with filepath), cancelled (silent), error (toast), empty (toast)
- Button has `aria-label="导出 Markdown 文件"`

### Markdown Utils
- `chapterPacketsToMarkdown()` — H2 sections per chapter, separated by `---`
- `extractLayerText()` — Parses layer4 JSON (text/content/blocks) with fallback to layer3 then title
- `suggestExportFilename()` — Generates `{projectName}_YYYY-MM-DD.md`

### Feedback Modal
- Star rating (1-5, emoji-based) with validation (rating required)
- Optional text area for additional comments
- Success view with 3-second auto-close
- Error handling with retry
- "Skip" button to dismiss
- Accepts `projectId` and `onClose` props; calls `submitFeedback` from `feedbackApi.ts`

### Feedback Trigger
- Fixed bottom-right, circular button with chat icon (SVG)
- Tooltip "反馈意见" on hover
- Only rendered when `activeBookId` is set

### Integration
- FeedbackTrigger and FeedbackModal mounted in `App.tsx` at the app root level
- Controlled by `showFeedback` boolean state
- Uses existing `feedbackApi.ts` (created in T1)

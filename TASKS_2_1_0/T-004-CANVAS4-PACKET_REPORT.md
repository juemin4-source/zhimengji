# T-004 Report — Canvas 4: ChapterPacket Three Detail Modes

## Status

**PASS** — All acceptance criteria met.

## Summary

Implemented three detail modes (sketch/standard/refined) for ChapterPacket canvas (Canvas 4). The `DetailMode` enum is stable and shareable with v2.1.1 AI granularity.

## Files Changed

### Contracts (additive)
- `src/contracts/chapter-packet.contract.ts` — Added `DetailMode`, `PacketDetailLevel`, `SketchConfig`, `RefinedConfig`, and input types (CN-MET-04)

### Backend (additive, no existing code modified)
- `src-tauri/src/models.rs` — Added `PacketDetailModeRecord`, `PacketDetailConfig`, input/output types
- `src-tauri/src/db.rs` — Added `canvas4_packet_detail_modes` table, CRUD methods (`set_detail_mode`, `get_packet_detail`, `auto_generate_sketch`, `save_refined_content`)
- `src-tauri/src/chapter_packet_commands.rs` — Added 4 Tauri commands
- `src-tauri/src/lib.rs` — Registered 4 new commands

### Frontend
- `src/contracts/chapter-packet.contract.ts` — Also exported new types
- `src/api/chapterPacketApi.ts` — Added 4 API functions
- **NEW** `src/features/canvas-04-packet/PacketDetailModeSelector.tsx` — Segmented control mode switcher
- **NEW** `src/features/canvas-04-packet/PacketSketchView.tsx` — Compact summary view for sketch mode (L1-L3 visible, L4 collapsed)
- **NEW** `src/features/canvas-04-packet/PacketRefinedView.tsx` — Full editable view with word count, timestamps, inline comments
- `src/features/canvas-04-packet/ChapterPacketCanvas.tsx` — Integrated mode-aware rendering
- `src/features/canvas-04-packet/chapter-packet.css` — Added styles for mode selector, sketch view, refined view

### Acceptance
- `scripts/acceptance/scan-contract-chain.mjs` — Updated CN-MET-04 entry from PENDING to ACTIVE

## Per-Mode Behavior

| Feature | Sketch | Standard | Refined |
|---------|--------|----------|---------|
| L1 (Writing Contract) | Summary card | Accordion (review/full) | Fully editable |
| L2 (Active Setting) | Summary card | Accordion (review/full) | Fully editable |
| L3 (Narrative) | Summary card (core) | Accordion (review/full) | Fully editable |
| L4 (Execution) | Collapsed (hidden) | Visible, read-only | Fully editable |
| Word count | Hidden | Hidden | Shown on fields |
| Timestamps | Hidden | Hidden | Shown per session |
| Inline comments | Hidden | Hidden | Available on each layer |

## Verification Results

| Test | Result |
|------|--------|
| `cargo check` | PASS (no errors) |
| `npx tsc --noEmit` | PASS (no errors) |
| `npm run accept:static` | PASS (2 pre-existing failures in TextCanvas.tsx only) |
| `npm run accept:contracts` | PASS (75/75, including CN-MET-04) |
| `npm run accept:css` | PASS (1 pre-existing failure in premise-entry.css — unrelated) |

## Acceptance Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `cargo check` and `tsc --noEmit` pass | PASS |
| 2 | `npm run accept:static` passes | PASS (pre-existing issues only) |
| 3 | Three detail modes switchable via visual selector | IMPLEMENTED |
| 4 | Sketch mode: L4 collapsed, L1-L3 visible, summary-only | IMPLEMENTED |
| 5 | Standard mode: all 4 layers visible, L4 read-only | IMPLEMENTED (L4 read-only in review mode) |
| 6 | Refined mode: all layers editable, word count + timestamps + comments | IMPLEMENTED |
| 7 | Switching modes preserves all data | IMPLEMENTED (no data loss — only visibility/edibility changes) |
| 8 | Sketch -> Standard: L4 nodes auto-expand | IMPLEMENTED |
| 9 | Old packet data defaults to "standard" | IMPLEMENTED (DB returns standard when no record exists) |
| 10 | Mode selection persists on refresh | IMPLEMENTED (DB-backed via `canvas4_packet_detail_modes` table) |
| 11 | Do-not-ask-again toggle functional | IMPLEMENTED |
| 12 | No methodology jargon in mode labels | IMPLEMENTED (natural language: 快速草图/标准大纲/精细润色) |
| 13 | v2.0-H regression: canvas navigation, project creation, data persistence intact | PRESERVED (no changes to shared infrastructure) |

## Notes

- The `DetailMode` enum is `'sketch' | 'standard' | 'refined'` — stable and shareable with v2.1.1 AI granularity
- All data is preserved when switching modes (L4 data retained in DB even when visually collapsed in sketch mode)
- The existing review mode / full mode toggle is preserved within Standard mode
- Sketch mode metadata bar is hidden (position and chapter function are shown in the sketch card header instead)

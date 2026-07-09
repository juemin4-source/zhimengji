# T-002: Structured Output Parser Baseline — ChapterPacket/WritingContract/TianDiRen

**Priority:** P1
**Scope Item:** #4 — Structured Output Parser Baseline
**Dependencies:** None (can execute after T-001 in serial order)
**Estimated Files:** 6

---

## Objective

Add baseline structured parsers for three AI output shapes: ChapterPacket, WritingContract, TianDiRen. Parse failure must return explicit error — never silent fallback. The generic parser already exists in `structured-parser.ts`; this ticket adds schema definitions and convenience parsers for these specific shapes.

---

## What Must Change

### 1. Contract Types: Add Output Schemas

**`src/contracts/ai-parser.contract.ts`:**
- Add `ChapterPacketOutput` interface (required fields: `title`, `line`, `position`, `chapterFunction`, `layer1`, `layer2`, `layer3`, `layer4`, `status`)
- Add `WritingContractOutput` interface (required fields: `narrativeDistance`, `expositionStrategy`, `taboos`, `reasoning`)
- Add `TianDiRenOutput` interface (required fields: `tian`, `di`, `ren`)
- Add discriminated union `AiStructuredOutput = ChapterPacketOutput | WritingContractOutput | TianDiRenOutput`
- Add schema constants as exported JSON schema objects for each shape

### 2. Frontend: Add Convenience Parsers

**`src/lib/ai/structured-parser.ts`:**
- Add `parseChapterPacket(rawContent: string, strict?: boolean): ParseResult` — validates against ChapterPacket schema
- Add `parseWritingContract(rawContent: string, strict?: boolean): ParseResult` — validates against WritingContract schema
- Add `parseTianDiRen(rawContent: string, strict?: boolean): ParseResult` — validates against TianDiRen schema
- Each parser calls `parseStructuredOutput` with the appropriate schema
- Error messages are in Chinese: "AI 返回的 JSON 无法解析为章节包格式", "AI 返回的 JSON 无法解析为写作契约格式", etc.

### 3. Rust: Add Parser Commands

**`src-tauri/src/ai_commands.rs`:**
- Add `parse_chapter_packet` command that calls `structured_parser::parse_structured_output` with ChapterPacket schema
- Add `parse_writing_contract` command
- Add `parse_tiandiren_output` command

**`src-tauri/src/models.rs`:**
- Add `ParseChapterPacketInput` / `ParseChapterPacketOutput` if needed (or reuse `AiParseInput`/`AiParseOutput`)

**`src-tauri/src/lib.rs`:**
- Register new parser commands

### 4. Unit Tests

**`src/lib/ai/__tests__/structured-parser.test.ts`** (or inline in existing test):
- Valid ChapterPacket JSON -> status 'valid'
- Missing required field -> status 'repaired' with repairLog (or 'fallback' if strict)
- Broken JSON -> status 'fallback' with explicit error
- Non-JSON text -> status 'fallback' with fallbackText
- Same for WritingContract and TianDiRen

### 5. Scope Freeze Enforcement

- **DO NOT** create new contract files (expand existing `ai-parser.contract.ts` only)
- **DO NOT** modify stable canvas entity contracts
- **DO NOT** add mock AI paths — parsers must never silently inject mock data
- **DO NOT** enter v2.1.2 scope

---

## Files to Write/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/contracts/ai-parser.contract.ts` | Modify | Add ChapterPacket/WritingContract/TianDiRen schemas |
| `src/lib/ai/structured-parser.ts` | Modify | Add convenience parsers for 3 shapes |
| `src-tauri/src/ai_commands.rs` | Modify | Add 3 parser commands |
| `src-tauri/src/models.rs` | Modify (if needed) | Add parser input/output types |
| `src-tauri/src/lib.rs` | Modify | Register new parser commands |

---

## Verification

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..
```

## Acceptance Criteria

- [ ] `parseChapterPacket('{"title":"Test",...}')` returns `{status:'valid', data:{...}}`
- [ ] `parseChapterPacket('{"title":"Test"}')` (missing required) returns `{status:'repaired', repairLog:[...]}`
- [ ] `parseChapterPacket('invalid json')` returns `{status:'fallback', fallbackText:'invalid json'}`
- [ ] `parseChapterPacket('{"valid":true}', strict=true)` with missing fields returns `{status:'fallback'}`
- [ ] Same behavior for WritingContract and TianDiRen
- [ ] No silent fallback — every path returns explicit status
- [ ] Rust AI commands compile and register
- [ ] `npx tsc --noEmit` passes
- [ ] `cargo check` passes

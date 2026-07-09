# W03 Report — Structured Output Parser

## Status: PASS

| Check | Result |
|-------|--------|
| `npm run tsc -- --noEmit` | PASS (exit 0) |
| `cargo check` | PASS (exit 0) |
| Rust unit tests | PASS (7/7) |

---

## Files Changed

### New Files

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/ai/structured-parser.ts` | 153 | TypeScript structured output parser — validates JSON against schema, auto-repairs with defaults, strips illegal fields, falls back to plain text, never throws for recoverable issues |

### Modified Files

| File | Lines | Description |
|------|-------|-------------|
| `src-tauri/src/ai/structured_parser.rs` | 280 | Rust backend parser — mirrors TS implementation with full test suite (7 tests) |
| `src-tauri/src/ai_commands.rs` | ~25 changed | `parse_output` Tauri command now delegates to `structured_parser::parse_structured_output` |
| `src/lib/llm-client.ts` | ~75 changed | Added `StructuredLlmCallOptions` (outputSchema, strictMode, outputType), provider-aware model routing (`getModelRequirements`), automatic output parsing when schema provided, backward compatible |

### Registration (already in W01)

| File | Status |
|------|--------|
| `src-tauri/src/ai/mod.rs` | Already has `pub mod structured_parser;` — no change needed |

---

## Implementation Details

### Parser (`structured-parser.ts` / `structured_parser.rs`)

Both implementations follow the same four-phase pipeline:

1. **Parse schema** — parse JSON string, extract `properties` and `required` fields
2. **Parse content** — parse JSON string, validate it is a JSON object
3. **Validate & repair** — for each schema property:
   - Missing required field → fill with type-based default, record repairLog
   - Missing optional field with default → fill with default, record repairLog
   - Extra fields not in schema → strip, record validationError
   - In strict mode: any mismatch → return FALLBACK
4. **Determine status** — VALID, REPAIRED, FALLBACK, or FAILED; never thrown

### Parser Status Outcomes

| Status | Condition | Action |
|--------|-----------|--------|
| VALID | JSON conforms to schema exactly | Return parsed data as-is |
| REPAIRED | Missing fields filled / extra fields stripped | Return data with repairLog + validationErrors |
| FALLBACK | Malformed JSON, wrong structure, or strict-mode mismatch | Return fallbackText, no crash |
| FAILED | Schema itself is invalid or catastrophic error | Return error, no crash |

### LLM Client Upgrade

- `StructuredLlmCallOptions extends LlmCallOptions` — adds `outputSchema`, `strictMode`, `outputType`
- `callLlm` and `callLlmStream` accept `StructuredLlmCallOptions` (backward compatible)
- When `outputSchema` is provided, response auto-routes through `parseStructuredOutput`
- `getModelRequirements()` provides model selection hints based on `outputType`:
  - `structured` / `detection` → requiresStructured=true, accuracy priority
  - `suggest` / `write_preview` / `generation` → creativity priority
  - `discuss` / `chat` / default → balance priority
- Response includes optional `parsed` field of type `ParseResult`

### Rust Tests (7/7 passing)

| Test | Status |
|------|--------|
| `test_valid_json` | PASS — valid JSON returns VALID |
| `test_missing_optional_field_with_default` | PASS — missing field filled with default, REPAIRED |
| `test_extra_fields_stripped` | PASS — illegal fields stripped, REPAIRED |
| `test_malformed_json` | PASS — malformed input returns FALLBACK with fallbackText |
| `test_invalid_schema` | PASS — invalid schema returns FAILED |
| `test_strict_mode_missing_required` | PASS — strict mode + missing required = FALLBACK |
| `test_strict_mode_extra_fields` | PASS — strict mode + extra fields = FALLBACK |

---

## Acceptance Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `npm run tsc -- --noEmit` passes | PASS |
| 2 | `cargo check` passes | PASS |
| 3 | Valid JSON → VALID | PASS (test + code) |
| 4 | Missing optional fields → REPAIRED with defaults | PASS (test + code) |
| 5 | Extra illegal fields stripped → REPAIRED | PASS (test + code) |
| 6 | Malformed JSON → FALLBACK with fallbackText | PASS (test + code) |
| 7 | Catastrophic error → FAILED | PASS (test + code) |
| 8 | llm-client accepts outputSchema and routes through parser | PASS (code + backward compatible) |
| 9 | All parser states non-crashing | PASS (never throws) |

## Blockers

None.
